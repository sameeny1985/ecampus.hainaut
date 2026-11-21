# CampusConnect — Analyse et Architecture

**Version :** 1.0  
**Date :** 21 novembre 2026  
**Équipe :** Groupe de consultants CampusConnect

---

## 1. Contexte et objectifs

CampusConnect est un réseau social interne destiné à un établissement d’enseignement supérieur. Il répond aux problèmes de dispersion de l’information, d’absence de modération et de surcharge notificationnelle des outils grand public.

### Objectifs du produit
- Centralisation de l’information utile
- Adoption d’au moins 60 % des étudiants du groupe pilote
- 100 % des comptes liés à une identité institutionnelle
- Traitement des signalements sous 24 h
- Trois mécanismes de régulation (mode calme, plages horaires, rappels de pause)

### Objectifs du projet
- Version 1.0 livrable en fin de Sprint 8
- MVP utilisable en fin de Sprint 6
- Respect de la Definition of Done pour 100 % des User Stories acceptées

---

## 2. Choix méthodologique

Scrum a été retenu pour les raisons suivantes :
- Cadence régulière (sprints de 2 semaines)
- Feedback fréquent
- Adaptation au changement
- Rôles clairement définis (PO, SM, équipe de développement)

---

## 3. Architecture technique

### Stack retenu

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Backend | Django 5 + Django REST Framework | Sécurité, ORM mature, Admin, RGPD, écosystème riche |
| Temps réel | Django Channels + Redis | Messagerie privée et de groupe en temps réel |
| Frontend | React 18 + Vite + Tailwind CSS | Interface moderne, accessible, responsive |
| Base de données | PostgreSQL | Robustesse, conformité RGPD, support Render |
| Authentification | JWT (SimpleJWT) + validation domaine institutionnel | Sécurité et simplicité de déploiement |
| Documentation API | drf-spectacular (OpenAPI 3) | Documentation interactive |

### Décision sur le protocole ouvert / décentralisé

**Analyse réalisée (Sprint 1) :**

| Protocole | Avantages | Inconvénients | Score |
|-----------|-----------|---------------|-------|
| ActivityPub | Standard W3C, large adoption (Mastodon) | Complexité d’implémentation, modération fédérée difficile | 6/10 |
| Matrix | Excellent temps réel, E2EE | Courbe d’apprentissage élevée, overhead | 5/10 |
| AT Protocol (Bluesky) | Moderne | Trop jeune, écosystème limité | 4/10 |

**Décision :**  
La fédération complète n’est pas réaliste dans le délai du projet.  
L’architecture est conçue pour permettre l’ajout ultérieur d’ActivityPub (modèles Actor, Inbox/Outbox préparés mais non activés).  
Version 1.0 = réseau interne uniquement. Cette limitation est explicitement documentée.

---

## 4. Modèle de données (principales entités)

- **User** (compte institutionnel + rôles)
- **Profile** (photo, bachelier, cours, visibilité)
- **Community** + **Membership** (rôles membre / animateur / enseignant)
- **Post** + **Comment** + **Reaction** + **PostAttachment**
- **Conversation** + **Message** + **MessageAttachment**
- **Notification**
- **Report** + **ModerationAction**
- **BlockedUser**
- **WellbeingSettings** (mode calme, plages, rappels)
- **AdminLog**

---

## 5. Sécurité et RGPD

- Mots de passe hashés (Django PBKDF2)
- JWT avec rotation et blacklist
- Validation stricte des domaines e-mail institutionnels
- Contrôle d’accès côté serveur pour toutes les actions sensibles
- Droit à l’effacement (US-08)
- Consentement cookies (US-09)
- Journalisation des actions de modération
- Protection CSRF, XSS, injection SQL (Django + DRF)
- Limite de taille des fichiers (30 Mo)

---

## 6. Accessibilité (E9)

L’accessibilité est intégrée dès le début (pas seulement en Sprint 7) :
- Contrastes conformes WCAG 2.1 AA
- Navigation clavier complète
- Labels de formulaires
- Textes alternatifs
- Design responsive
- Langue française inclusive

---

*Document produit dans le cadre du dossier de gestion de projet Agile – CampusConnect*
