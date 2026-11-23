# Antunes — Back-end

API REST d'Antunes, marketplace d'électronique d'occasion et reconditionnée, développée en Node.js / Express / MongoDB. Elle est consommée par le front React (`antunes-front`).

- Production : https://antunes-back.onrender.com/api/health
- Front : https://antunes-front.vercel.app

## Stack technique

- [Express 4](https://expressjs.com/) pour l'API REST
- [MongoDB](https://www.mongodb.com/) + [Mongoose 8](https://mongoosejs.com/) pour la persistance (MongoDB Atlas en production)
- [Zod](https://zod.dev/) pour la validation des entrées
- JWT (`jsonwebtoken`) + `bcryptjs` (12 tours) pour l'authentification
- [Stripe Checkout](https://stripe.com/docs/payments/checkout) + webhook signé pour le paiement (mode test)
- [Resend](https://resend.com/) pour les e-mails transactionnels
- Sécurité : `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `hpp`
- [Vitest](https://vitest.dev/) + [Supertest](https://github.com/ladjs/supertest) + `mongodb-memory-server` pour les tests (base isolée en mémoire)

## Prérequis

- Node.js 24+
- Docker (uniquement pour MongoDB en local)

## Installation

```bash
npm install
cp .env.example .env   # puis renseigne les valeurs
docker compose up -d   # MongoDB sur localhost:27018
npm run seed           # vendeur de démo + 4 annonces
npm run dev            # API sur http://localhost:4000
```

MongoDB est exposé sur le port `27018` (et non 27017) pour éviter tout conflit avec une installation locale existante.

Pour tester le paiement en local, le webhook Stripe doit être relayé avec la CLI Stripe :

```bash
stripe listen --forward-to localhost:4000/api/payments/webhook
```

## Scripts disponibles

| Commande                | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Serveur avec rechargement automatique          |
| `npm start`             | Serveur en mode production                     |
| `npm run lint`          | Analyse statique avec ESLint                   |
| `npm test`              | Tests (MongoDB en mémoire, isolé)              |
| `npm run test:watch`    | Tests en mode interactif                       |
| `npm run test:coverage` | Tests + rapport de couverture                  |
| `npm run seed`          | Réinitialise les annonces avec des données de démo |

## Structure du projet

```
src/
├── app.js        # Configuration Express (sécurité, routes, erreurs)
├── server.js     # Connexion MongoDB puis démarrage du serveur
├── config/       # MongoDB, Stripe, Resend
├── models/       # Schémas Mongoose (User, Product, Order, Conversation, PrivacyRequest)
├── controllers/  # Logique métier des routes
├── routes/       # Déclaration des endpoints
├── middlewares/  # Authentification JWT, validation, gestion d'erreurs
├── validators/   # Schémas Zod (dont la politique de mot de passe)
├── services/     # Traitements partagés entre contrôleurs
├── utils/        # Erreurs, tokens, e-mails, journalisation, tarification
└── test/         # Configuration et helpers de test
```

## Endpoints

| Méthode | Route                              | Accès              | Description                                     |
| ------- | ---------------------------------- | ------------------ | ----------------------------------------------- |
| GET     | `/api/health`                      | Public             | Sonde de supervision (état de l'API et de la base) |
| POST    | `/api/auth/signup`                 | Public             | Inscription + envoi du lien de confirmation     |
| POST    | `/api/auth/login`                  | Public             | Connexion, renvoie un JWT                       |
| GET     | `/api/auth/me`                     | Connecté           | Profil de l'utilisateur connecté                |
| POST    | `/api/auth/verify-email`           | Public             | Confirme l'adresse e-mail (double opt-in)       |
| POST    | `/api/auth/resend-verification`    | Connecté           | Renvoie le lien de confirmation                 |
| POST    | `/api/auth/forgot-password`        | Public             | Envoie un lien de réinitialisation              |
| POST    | `/api/auth/reset-password`         | Public             | Définit un nouveau mot de passe                 |
| GET     | `/api/products`                    | Public             | Annonces en vente (filtres, recherche, tri)     |
| GET     | `/api/products/mine`               | Connecté           | Mes annonces, y compris vendues                 |
| GET     | `/api/products/:id`                | Public             | Détail d'une annonce                            |
| POST    | `/api/products`                    | E-mail confirmé    | Publier une annonce                             |
| GET     | `/api/favorites`                   | Connecté           | Mes favoris                                     |
| POST    | `/api/favorites/:productId`        | Connecté           | Ajouter un favori                               |
| DELETE  | `/api/favorites/:productId`        | Connecté           | Retirer un favori                               |
| GET     | `/api/conversations`               | Connecté           | Mes conversations                               |
| POST    | `/api/conversations`               | Connecté           | Contacter un vendeur                            |
| GET     | `/api/conversations/:id`           | Participant        | Détail d'une conversation                       |
| POST    | `/api/conversations/:id/messages`  | Participant        | Envoyer un message                              |
| PATCH   | `/api/users/me`                    | Connecté           | Modifier son profil                             |
| PATCH   | `/api/users/me/password`           | Connecté           | Changer son mot de passe                        |
| GET     | `/api/users/me/export`             | Connecté           | Export JSON de ses données (RGPD)               |
| DELETE  | `/api/users/me`                    | Connecté           | Supprimer son compte (RGPD)                     |
| POST    | `/api/privacy-requests`            | Public             | Demande d'exercice de droits RGPD               |
| POST    | `/api/payments/checkout-session`   | Connecté           | Crée une session Stripe Checkout                |
| GET     | `/api/payments/orders`             | Connecté           | Mes achats                                      |
| GET     | `/api/payments/orders/:sessionId`  | Acheteur           | Détail d'une commande                           |
| POST    | `/api/payments/webhook`            | Signature Stripe   | Confirmation ou expiration des paiements        |

`GET /api/products` accepte les paramètres `category`, `condition`, `search` et `sort` (`recent` | `priceAsc` | `priceDesc`).

## Règles métier principales

- **Mot de passe** : 12 caractères minimum avec majuscule, minuscule, chiffre et caractère spécial (recommandation CNIL 2022).
- **Double opt-in** : un compte peut naviguer, acheter et discuter dès l'inscription, mais doit confirmer son adresse e-mail pour publier une annonce. Le lien expire au bout de 24 h.
- **Monétisation** : la publication est gratuite ; l'acheteur paie des frais de service de 5 % du prix + 0,70 € (`src/utils/pricing.js`).
- **Cycle de vie d'une annonce** : `available` → `sold` lorsque Stripe confirme le paiement. Une session abandonnée passe la commande en `failed` au bout de 24 h.
- **Suppression de compte** : le profil, les annonces en vente et les conversations sont supprimés ; les commandes sont conservées (obligation comptable de 10 ans).

## Sécurité

- En-têtes HTTP de sécurité (`helmet`), CORS limité à l'origine du front
- Limitation de débit : 300 requêtes / 15 min sur l'API, 20 sur `/api/auth`, 5 / heure sur le formulaire RGPD
- Validation de toutes les entrées (Zod), nettoyage des opérateurs MongoDB (`express-mongo-sanitize`), protection contre la pollution de paramètres (`hpp`)
- Mots de passe hachés avec bcrypt, tokens envoyés par e-mail stockés sous forme d'empreinte SHA-256
- Réponses identiques que le compte existe ou non (connexion, mot de passe oublié)
- Montants de paiement calculés côté serveur, webhook Stripe vérifié par signature
- Journalisation JSON des événements de sécurité (`src/utils/logger.js`), sans données personnelles en clair

## Déploiement

Le service est décrit dans `render.yaml` (Render, offre gratuite) et redéployé automatiquement à chaque push sur `main`. La CI GitHub Actions exécute le lint, les tests avec couverture et `npm audit` à chaque push et pull request.

En production, le webhook Stripe doit écouter les événements `checkout.session.completed` et `checkout.session.expired`.
