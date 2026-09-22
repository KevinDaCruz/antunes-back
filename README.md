# Antunes — Back-end

API REST du projet Antunes (marketplace tech d'occasion), en Node.js/Express/MongoDB. Séparée du front (`antunes-front`), qui la consomme via HTTP.

## Stack technique

- [Express 4](https://expressjs.com/) pour l'API REST
- [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/) pour la persistance
- [Zod](https://zod.dev/) pour la validation des entrées
- JWT (`jsonwebtoken`) + `bcryptjs` pour l'authentification
- Sécurité : `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `hpp`
- [Vitest](https://vitest.dev/) + [Supertest](https://github.com/ladjs/supertest) + `mongodb-memory-server` pour les tests (base isolée, pas besoin de Docker pour tester)

## Prérequis

- Node.js 24+
- Docker (pour MongoDB en local)

## Installation

```bash
npm install
cp .env.example .env   # puis ajuste les valeurs si besoin
```

## Lancer MongoDB (Docker)

```bash
docker compose up -d
```

MongoDB est exposé sur `localhost:27018` (et non 27017, pour éviter tout conflit avec un MongoDB déjà installé en local sur la machine).

## Initialiser des données de démo

```bash
npm run seed
```

Crée un vendeur de démo et les 4 produits qui correspondent aux données mock du front.

## Développement

```bash
npm run dev
```

L'API est alors disponible sur `http://localhost:4000`.

## Scripts disponibles

| Commande              | Description                                       |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`           | Lance le serveur avec rechargement automatique     |
| `npm start`             | Lance le serveur en mode production                |
| `npm run lint`          | Vérifie le code avec ESLint                        |
| `npm run test`          | Lance les tests (MongoDB en mémoire, isolé)        |
| `npm run test:watch`    | Tests en mode interactif                           |
| `npm run test:coverage` | Tests + rapport de couverture                      |
| `npm run seed`          | Réinitialise la base avec des données de démo      |

## Structure du projet

```
src/
├── config/       # Connexion MongoDB
├── models/       # Schémas Mongoose (User, Product...)
├── controllers/  # Logique métier des routes
├── routes/       # Définition des endpoints Express
├── middlewares/  # Auth JWT, validation, gestion d'erreurs
├── validators/   # Schémas de validation Zod
├── utils/        # Utilitaires (erreurs, tokens, seed...)
└── test/         # Configuration des tests (MongoDB en mémoire)
```

## Endpoints actuels

| Méthode | Route              | Protégée | Description                        |
| ------- | ------------------- | -------- | ----------------------------------- |
| POST    | `/api/auth/signup`  | Non      | Création de compte                  |
| POST    | `/api/auth/login`   | Non      | Connexion, renvoie un token JWT     |
| GET     | `/api/auth/me`      | Oui      | Profil de l'utilisateur connecté    |
| GET     | `/api/products`     | Non      | Liste des annonces (filtres/tri)    |
| GET     | `/api/products/:id` | Non      | Détail d'une annonce                |
| POST    | `/api/products`     | Oui      | Créer une annonce                   |
| GET     | `/api/health`        | Non      | Vérification que l'API répond       |

`GET /api/products` accepte les paramètres de requête `category`, `condition`, `search` et `sort` (`recent` | `priceAsc` | `priceDesc`).

## Reste à faire

- Favoris, messagerie (conversations)
- Paiement Stripe (C23)
- Branchement du front sur cette API (actuellement le front fonctionne encore en autonomie avec `localStorage`)
