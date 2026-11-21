# CampusConnect

**Réseau social interne d’établissement d’enseignement supérieur**

Version 1.0 — Projet Agile universitaire

---

## Description

CampusConnect regroupe les informations utiles, les communautés de cours et les échanges dans un cadre sûr, modéré et respectueux du bien-être numérique des étudiants.

## Stack technique

- **Backend :** Django 5 + Django REST Framework + Django Channels
- **Frontend :** React 18 + Vite + Tailwind CSS
- **Base de données :** PostgreSQL
- **Authentification :** JWT + validation d’adresse institutionnelle
- **Temps réel :** WebSockets (Channels + Redis)

## Prérequis

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (ou SQLite pour le développement local)
- Redis (optionnel en développement)

## Installation rapide (développement)

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate   # Windows : venv\Scripts\activate
pip install -r ../requirements.txt
export USE_SQLITE=True
export USE_INMEMORY_CHANNELS=True
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

```bash
# Frontend
cd frontend
npm install
npm run dev
```

## Variables d’environnement

Voir `.env.example`.

## Documentation

- `docs/01_Analyse_et_Architecture.md`
- `docs/02_Matrice_Tracabilite_User_Stories.md`
- API interactive : `/api/docs/` une fois le serveur lancé

## Déploiement Render

1. Créer un service Web (Django)
2. Ajouter une base PostgreSQL
3. (Optionnel) Ajouter Redis
4. Configurer les variables d’environnement
5. Build command : `pip install -r requirements.txt && python backend/manage.py collectstatic --noinput && python backend/manage.py migrate`
6. Start command : `cd backend && daphne -b 0.0.0.0 -p $PORT config.asgi:application`

## Auteurs

Équipe CampusConnect — Simulation de projet Agile

## Licence

Projet universitaire — usage pédagogique uniquement.
