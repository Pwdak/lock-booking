# Aissata Locks Rendez-vous

Application web pour gerer les rendez-vous d'une professionnelle qui propose des services de tresseuse de locks.

## Fonctionnalites

- Espace pro protege par identifiant et mot de passe.
- Tableau de bord des rendez-vous par date et statut.
- Creation de rendez-vous avec cliente, prestation, heure et notes.
- Mise a jour des statuts : a confirmer, confirme, termine, annule.
- Backend Express connecte a PostgreSQL.
- Mode demo frontend si le backend n'est pas encore disponible.
- Infrastructure AWS fournie avec Terraform et workflow GitHub Actions.

## Structure

- `src/App.tsx` : interface React de l'espace pro.
- `backend/server.js` : API Express.
- `backend/auth.js` : authentification simple par jeton signe HMAC.
- `backend/schema.sql` : schema PostgreSQL et donnees initiales.
- `backend/Dockerfile` : image Docker du backend.
- `infra/terraform` : infrastructure AWS S3, CloudFront, ECR, ECS Fargate, ALB et RDS PostgreSQL.
- `.github/workflows/deploy-aws.yml` : deploiement AWS depuis GitHub Actions.

## Demarrage local

1. Copier les variables d'environnement.

```bash
cp .env.example .env
```

2. Modifier `.env` avec un vrai mot de passe pro et un secret long.

```env
PRO_USERNAME=pro
PRO_PASSWORD=un-mot-de-passe-solide
APP_SECRET=une-cle-longue-aleatoire
```

3. Creer la base PostgreSQL.

```bash
createdb locks_rdv
psql "$DATABASE_URL" -f backend/schema.sql
```

4. Lancer le backend.

```bash
node backend/server.js
```

5. Lancer le frontend dans un autre terminal.

```bash
npm run dev
```

6. Ouvrir `http://localhost:5173` et se connecter avec `PRO_USERNAME` / `PRO_PASSWORD`.

## Variables d'environnement

Frontend :

```env
VITE_API_URL=http://localhost:4000
```

Backend :

```env
PORT=4000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://postgres:postgres@localhost:5432/locks_rdv
PGSSL=false
PRO_USERNAME=pro
PRO_PASSWORD=change-this-password
APP_SECRET=change-this-long-random-secret
AUTH_TOKEN_TTL_HOURS=12
RUN_MIGRATIONS=false
```

## Authentification

L'API expose `POST /api/auth/login`. Si les identifiants correspondent a `PRO_USERNAME` et `PRO_PASSWORD`, le backend renvoie un jeton signe avec `APP_SECRET`.

Les routes de gestion sont protegees par `Authorization: Bearer <token>` :

- `GET /api/appointments`
- `POST /api/appointments`
- `PATCH /api/appointments/:id/status`
- `GET /api/dashboard/summary`

Cette authentification est volontairement simple. Pour une application commerciale, il faudra ajouter au minimum un hash de mot de passe, une rotation de secret, une limitation de tentatives et HTTPS de bout en bout.

## Deploiement AWS Avec Terraform Et GitHub

Architecture de deploiement :

- Frontend React : S3 prive + CloudFront.
- Backend Express : image Docker dans ECR + ECS Fargate + Application Load Balancer.
- API publique : CloudFront transfere `/api/*` vers l'ALB pour eviter le contenu mixte HTTP/HTTPS.
- Base de donnees : RDS PostgreSQL prive dans le VPC par defaut.
- CI/CD : GitHub Actions.

Attention : AWS peut generer des couts, notamment RDS, ALB, ECS Fargate et CloudFront selon l'usage. Verifiez le free tier de votre compte et detruisez l'infra apres test si besoin.

### 1. Preparer AWS

1. Creer un compte AWS.
2. Choisir une region, par exemple `eu-west-3`.
3. Verifier que le compte possede un VPC par defaut dans cette region.
4. Creer un utilisateur IAM ou un role de deploiement avec acces a Terraform, S3, CloudFront, ECR, ECS, EC2, IAM, CloudWatch Logs, Elastic Load Balancing et RDS.

### 2. Creer Le Stockage Terraform State

Terraform doit conserver son etat entre deux deploiements GitHub Actions. Creer un bucket S3 et une table DynamoDB pour le verrouillage :

```bash
export AWS_REGION=eu-west-3
export TF_STATE_BUCKET=locks-rdv-tfstate-$(aws sts get-caller-identity --query Account --output text)
export TF_LOCK_TABLE=locks-rdv-terraform-locks

aws s3api create-bucket \
  --bucket "$TF_STATE_BUCKET" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"

aws s3api put-bucket-versioning \
  --bucket "$TF_STATE_BUCKET" \
  --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name "$TF_LOCK_TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION"
```

### 3. Preparer GitHub

Dans le repository GitHub, aller dans `Settings > Secrets and variables > Actions` et ajouter :

```txt
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
TF_STATE_BUCKET
TF_LOCK_TABLE
DB_PASSWORD
PRO_USERNAME
PRO_PASSWORD
APP_SECRET
```

Valeurs conseillees :

- `DB_PASSWORD` : mot de passe PostgreSQL long, sans caracteres URL complexes pour simplifier `DATABASE_URL`.
- `PRO_USERNAME` : par exemple `pro`.
- `PRO_PASSWORD` : mot de passe de connexion a l'espace pro.
- `APP_SECRET` : chaine aleatoire longue, par exemple generee avec `openssl rand -hex 32`.
- `TF_STATE_BUCKET` : bucket S3 cree a l'etape precedente.
- `TF_LOCK_TABLE` : table DynamoDB creee a l'etape precedente.

### 4. Adapter La Region

Le workflow utilise `eu-west-3` par defaut. Pour changer :

1. Modifier `AWS_REGION` dans `.github/workflows/deploy-aws.yml`.
2. Modifier `aws_region` dans `infra/terraform/terraform.tfvars.example` si vous l'utilisez en local.

### 5. Lancer Le Deploiement Depuis GitHub

1. Pousser le projet sur GitHub.
2. Aller dans l'onglet `Actions`.
3. Selectionner `Deploy AWS`.
4. Cliquer sur `Run workflow`.

Le workflow fait automatiquement :

- installation des dependances,
- creation du repository ECR,
- build et push de l'image Docker backend,
- creation de l'infrastructure Terraform,
- build du frontend avec `VITE_API_URL` pointe vers l'ALB,
- upload du build dans S3,
- invalidation CloudFront.

### 6. Recuperer Les URLs

A la fin du workflow, GitHub affiche :

```txt
Frontend: https://xxxxx.cloudfront.net
Backend:  https://xxxxx.cloudfront.net
```

Ouvrir l'URL frontend, puis se connecter avec `PRO_USERNAME` et `PRO_PASSWORD`. Le frontend appelle l'API sur la meme URL CloudFront via `/api/*`.

### 7. Deploiement Local Avec Terraform Optionnel

Si vous voulez lancer Terraform depuis votre machine :

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init \
  -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="key=locks-rdv/terraform.tfstate" \
  -backend-config="region=eu-west-3" \
  -backend-config="dynamodb_table=$TF_LOCK_TABLE" \
  -backend-config="encrypt=true"
terraform apply -target=aws_ecr_repository.backend
```

Ensuite construire et pousser le backend :

```bash
ECR_REPOSITORY_URL=$(terraform output -raw ecr_repository_url)
aws ecr get-login-password --region eu-west-3 | docker login --username AWS --password-stdin "$ECR_REPOSITORY_URL"
docker build -f ../../backend/Dockerfile -t "$ECR_REPOSITORY_URL:latest" ../..
docker push "$ECR_REPOSITORY_URL:latest"
```

Appliquer l'infrastructure complete :

```bash
terraform apply -var="backend_image=$ECR_REPOSITORY_URL:latest"
```

Construire puis uploader le frontend :

```bash
cd ../..
BACKEND_URL=$(terraform -chdir=infra/terraform output -raw backend_url)
echo "VITE_API_URL=$BACKEND_URL" > .env.production
npm run build
aws s3 sync dist/ "s3://$(terraform -chdir=infra/terraform output -raw frontend_bucket_name)" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(terraform -chdir=infra/terraform output -raw cloudfront_distribution_id)" \
  --paths "/*"
```

### 8. Detruire L'infrastructure

Pour eviter les couts apres un test :

```bash
cd infra/terraform
terraform destroy
```

## Ameliorations Recommandees

- Ajouter HTTPS sur l'ALB avec ACM et un domaine custom.
- Stocker `PRO_PASSWORD`, `APP_SECRET` et `DATABASE_URL` dans AWS Secrets Manager.
- Remplacer le mot de passe simple par des utilisateurs PostgreSQL ou Cognito.
- Ajouter des emails/SMS de confirmation de rendez-vous.
- Ajouter une page publique de reservation cliente separee de l'espace pro.