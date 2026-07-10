# Loc'Tresses Rendez-vous

![Loc'Tresses - Rendez-vous Management](./architecture-aws.svg)

Application web pour gerer les rendez-vous d'une professionnelle qui propose des services de tresseuse de locks.

## Fonctionnalites

- Espace pro protege par identifiant et mot de passe.
- Tableau de bord des rendez-vous par date et statut.
- Creation de rendez-vous avec cliente, prestation, heure et notes.
- Mise a jour des statuts : a confirmer, confirme, termine, annule.
- Backend Express connecte a PostgreSQL.
- Mode demo frontend si le backend n'est pas encore disponible.
- Infrastructure AWS fournie avec Terraform (deploiement manuel, voir `docs/DEPLOYMENT.md`).

## Structure

- `src/App.tsx` : interface React de l'espace pro.
- `backend/server.js` : API Express.
- `backend/auth.js` : authentification simple par jeton signe HMAC.
- `backend/schema.sql` : schema PostgreSQL et donnees initiales.
- `backend/Dockerfile` : image Docker du backend.
- `infra/terraform` : infrastructure AWS modulaire (VPC dedie, S3, CloudFront, ECR, ECS Fargate, ALB, RDS PostgreSQL) — voir `docs/ARCHITECTURE.md`.
- `docs/DEPLOYMENT.md` : processus de deploiement manuel suivi, etape par etape.

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

## Deploiement AWS

L'infrastructure (`infra/terraform`) est deployee manuellement, module par module, sans CI/CD. Documentation complete :

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) : schemas et description des services et du reseau (VPC dedie, CloudFront, ALB, ECS Fargate, RDS, Secrets Manager).
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) : processus etape par etape reellement suivi, avec les problemes rencontres et leurs corrections.

Attention : AWS peut generer des couts, notamment RDS, ALB, ECS Fargate, NAT Gateway et CloudFront selon l'usage. Verifiez le free tier de votre compte et detruisez l'infra apres test si besoin (procedure dans `docs/DEPLOYMENT.md`).

## Ameliorations Recommandees

- Ajouter HTTPS sur l'ALB avec ACM et un domaine custom.
- Remplacer le mot de passe simple par des utilisateurs PostgreSQL ou Cognito.
- Ajouter des emails/SMS de confirmation de rendez-vous.
- Ajouter une page publique de reservation cliente separee de l'espace pro.