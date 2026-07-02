# Backend rendez-vous locks

API Express connectee a PostgreSQL pour gerer les prestations, les clientes et les rendez-vous. Les routes de l'espace pro sont protegees par un jeton signe cote backend.

## Demarrage

1. Creer la base PostgreSQL, par exemple `locks_rdv`.
2. Copier `.env.example` vers `.env` et ajuster `DATABASE_URL`, `PRO_PASSWORD` et `APP_SECRET`.
3. Executer le schema : `psql "$DATABASE_URL" -f backend/schema.sql`.
4. Lancer l'API : `node backend/server.js`.
5. Lancer le frontend Vite : `npm run dev`.

## Routes principales

- `GET /api/health` verifie la connexion PostgreSQL.
- `POST /api/auth/login` connecte l'espace pro et renvoie un jeton.
- `GET /api/auth/me` verifie la session courante.
- `GET /api/services` liste les prestations actives.
- `GET /api/appointments` liste les rendez-vous, avec filtres optionnels `from`, `to`, `status`.
- `POST /api/appointments` cree un rendez-vous et une cliente si necessaire.
- `PATCH /api/appointments/:id/status` met a jour le statut.
- `GET /api/dashboard/summary` renvoie les compteurs du tableau de bord.

## Authentification

Configurer les variables suivantes :

```env
PRO_USERNAME=pro
PRO_PASSWORD=mot-de-passe-solide
APP_SECRET=long-secret-aleatoire
AUTH_TOKEN_TTL_HOURS=12
```

Appeler `POST /api/auth/login` avec :

```json
{
  "username": "pro",
  "password": "mot-de-passe-solide"
}
```

Puis envoyer le jeton sur les routes protegees :

```txt
Authorization: Bearer <token>
```

## Deploiement

Le backend possede un `Dockerfile`. En production, mettre `RUN_MIGRATIONS=true` pour appliquer `backend/schema.sql` au demarrage du conteneur.

Voir le guide complet dans `README.md` et l'infrastructure dans `infra/terraform`.