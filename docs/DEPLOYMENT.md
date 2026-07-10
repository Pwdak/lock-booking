# Deploiement manuel (projet infra/terraform)

Ce document decrit le processus reellement suivi pour deployer l'infrastructure (voir `ARCHITECTURE.md`). Aucun CI/CD n'est utilise : chaque etape est executee manuellement, en local.

![Workflow de deploiement](./deployment-workflow.svg)

## Prerequis

- Compte AWS avec un utilisateur IAM dedie (cle d'acces + secret, pas le compte root).
- AWS CLI installe et configure (`aws configure`).
- Terraform >= 1.5 installe.
- Docker Desktop installe et lance (pour builder l'image backend).
- Node.js pour builder le frontend (`npm run build`).

## 1. Bootstrap du state Terraform distant

Le state ne peut pas se stocker lui-meme des le depart : un premier projet, separe et applique une seule fois, cree le bucket S3 et la table DynamoDB de verrouillage.

```bash
cd lock-booking-tfstate-bootstrap
terraform init
terraform apply -var="bucket_name=<nom-unique-du-bucket>"
```

Renseigner ensuite ce nom dans `infra/terraform/backend-config/prod.hcl` :

```hcl
bucket         = "<nom-unique-du-bucket>"
key            = "prod/terraform.tfstate"
region         = "eu-west-1"
dynamodb_table = "<nom-unique-du-bucket>-locks"
```

Puis initialiser le projet principal avec ce backend :

```bash
cd infra/terraform
terraform init -backend-config="backend-config/prod.hcl"
```

## 2. Variables sensibles

```bash
cp terraform.tfvars.example terraform.tfvars
```

Renseigner `db_password`, `app_secret`, `pro_password`.

**Contrainte a respecter** : `db_password` ne doit contenir ni `/`, `@`, `"`, ni espace (limite RDS), et idealement rester dans un jeu de caracteres simple (lettres/chiffres) pour eviter tout probleme de parsing d'URL de connexion cote application.

## 3. Deploiement de l'infrastructure, module par module

L'ordre suit les dependances reelles entre modules :

```bash
terraform plan -target="module.vpc"
terraform apply -target="module.vpc"

terraform plan -target="module.alb" -target="module.ecr"
terraform apply -target="module.alb" -target="module.ecr"

terraform plan -target="module.rds"
terraform apply -target="module.rds"

terraform plan -target="module.frontend"
terraform apply -target="module.frontend"
```

## 4. Build et publication de l'image backend

```bash
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <ecr_repository_url sans le tag>

docker build -t lock-booking-backend -f backend/Dockerfile .
docker tag lock-booking-backend:latest <ecr_repository_url>:latest
docker push <ecr_repository_url>:latest
```

`ecr_repository_url` est disponible via `terraform output ecr_repository_url`.

## 5. Deploiement du backend (ECS)

```bash
terraform plan -target="module.ecs"
terraform apply -target="module.ecs"
```

Verifier que la tache demarre correctement :

```bash
aws ecs list-tasks --cluster lock-booking-prod-cluster --region eu-west-1
aws logs tail /ecs/lock-booking-prod-backend --region eu-west-1 --since 5m
```

Tester la sante du backend :

```bash
curl https://<frontend_url>/api/health
# doit renvoyer {"ok":true,"database":"connected"}
```

**Si le secret `DATABASE_URL` change apres coup** (rotation de mot de passe, etc.), les taches ECS deja lancees ne relisent pas automatiquement le secret. Il faut forcer un nouveau deploiement :

```bash
aws ecs update-service --cluster lock-booking-prod-cluster --service lock-booking-prod-backend --force-new-deployment --region eu-west-1
```

## 6. Build et publication du frontend

```bash
npm run build
aws s3 sync ./dist s3://<frontend_bucket_name> --delete
aws cloudfront create-invalidation --distribution-id <distribution_id> --paths "/*"
```

`frontend_bucket_name` et `distribution_id` sont disponibles via les outputs Terraform du module `frontend`.

## Difficultes rencontrees et corrections

| Probleme | Cause | Correction |
|---|---|---|
| `Too many command line arguments` sur `-target`/`-backend-config` | Copier-coller alterant les guillemets/tirets dans le terminal Windows | Retaper la commande a la main, guillemets doubles |
| Erreur de verrouillage DynamoDB (`ResourceNotFoundException`) | Nom de bucket/table dans `backend-config` different du nom reellement cree | Verifier la coherence exacte des noms entre le bootstrap et `prod.hcl` |
| `Invalid security group description` | Accents et apostrophes dans les descriptions de security group | AWS n'autorise que l'ASCII restreint (`a-zA-Z0-9. _-:/()#,@[]+=&;{}!$*`) pour ces champs |
| `Cannot find version 16.4 for postgres` | Version mineure RDS obsolete/non proposee | Fixer uniquement la version majeure (`engine_version = "16"`) pour qu'AWS choisisse la derniere mineure disponible |
| `InvalidParameterValue: MasterUserPassword` | Mot de passe contenant `/`, `@`, `"` ou un espace | Regenerer un mot de passe sans ces caracteres |
| `TypeError: Invalid URL` cote backend (pg-connection-string) | Mot de passe contenant un caractere valide pour RDS mais invalide dans une URL (ex: `#`, `%`, `&`) | Encoder `username`/`password` avec `urlencode()` dans la construction de `database_url` cote Terraform |
| Tache ECS gardant l'ancien secret apres correction | Les secrets sont resolus une seule fois, au demarrage de la tache | `aws ecs update-service --force-new-deployment` apres toute modification de secret |

## Destruction (pour eviter les couts apres test)

Ordre inverse, en tenant compte de `deletion_protection` sur RDS :

```bash
terraform destroy -target="module.ecs"
terraform destroy -target="module.frontend"
# Desactiver deletion_protection dans modules/rds/main.tf avant de continuer
terraform destroy -target="module.rds"
terraform destroy -target="module.alb" -target="module.ecr"
terraform destroy -target="module.vpc"
```

Le bucket S3 du state (bootstrap) est protege par `prevent_destroy` : le retirer manuellement dans le code avant toute destruction volontaire.
