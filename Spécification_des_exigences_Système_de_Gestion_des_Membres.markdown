# Spécification des exigences du Système de Gestion des Membres 

## 1. Introduction

### 1.1 Objectif

Ce document décrit les exigences pour un Système de Gestion des Membres (SGM) basé sur le web, conçu pour l'organisation de la diaspora gabonaise au Congo. Le système vise à dématérialiser le processus d'inscription manuel existant, en remplaçant les formulaires papier par une solution numérique qui facilite la création de cartes de membre numériques. Ces cartes seront ensuite imprimées sur des feuilles plastiques par un fournisseur tiers pour servir de cartes de membre physiques. L'application rationalisera l'inscription, la validation, l'émission de cartes numériques et la gestion des codes uniques pour chaque formulaire, avec un contrôle d'accès basé sur les rôles (RBAC) utilisant Casbin et Prisma comme ORM pour les interactions avec la base de données.

### 1.2 Portée

Le SGM offrira :

- Une plateforme web, entièrement responsive et conçue en priorité pour les appareils mobiles, pour l'inscription des membres et la consultation de leurs cartes numériques.
- Un tableau de bord administratif pour les secrétaires et le président afin de gérer les inscriptions, les approbations et les codes de formulaires.
- Une carte de membre numérique standardisée avec un recto et un verso, incluant des informations personnelles, un code QR et la signature du président, destinée à être imprimée sur plastique.
- Une fonctionnalité pour télécharger la signature du président pour une utilisation sur les formulaires approuvés et les cartes de membres.
- Des notifications par e-mail et SMS pour les membres.
- Un RBAC sécurisé utilisant Casbin pour gérer les permissions des utilisateurs.
- Une plateforme évolutive, sécurisée et conviviale accessible via les navigateurs web, avec Prisma pour gérer les interactions avec la base de données.

### 1.3 Définitions, acronymes et abréviations

- **SGM** : Système de Gestion des Membres
- **RBAC** : Contrôle d'accès basé sur les rôles
- **Code QR** : Code à réponse rapide, un code scannable lié aux détails des membres
- **Casbin** : Bibliothèque open-source pour l'implémentation du RBAC
- **Prisma** : ORM (Object-Relational Mapping) pour les interactions avec la base de données
- **JWT** : JSON Web Token pour l'authentification
- **API** : Interface de programmation d'application
- **Code de formulaire** : Code unique au format `pays/nom_association/numéro_inscription`

### 1.4 Références

- Documentation Casbin : https://casbin.org/docs/fr/overview
- Documentation Prisma : https://www.prisma.io/docs/
- Documentation React : https://reactjs.org/
- Documentation Node.js : https://nodejs.org/
- Documentation PostgreSQL : https://www.postgresql.org/

## 2. Description générale

### 2.1 Objectifs du système

- Remplacer les formulaires d'inscription manuels par un formulaire numérique basé sur le web.
- Automatiser le processus de validation des adhésions avec des contrôles administratifs basés sur les rôles.
- Générer des cartes de membre numériques standardisées destinées à être imprimées sur des feuilles plastiques par un fournisseur tiers.
- Attribuer un code unique à chaque formulaire d'inscription (format : `pays/nom_association/numéro_inscription`) défini par le président ou le secrétaire.
- Implémenter une interface entièrement responsive, conçue en priorité pour les appareils mobiles.
- Permettre le téléchargement de la signature du président pour une utilisation sur les formulaires approuvés.
- Fournir des notifications par e-mail et SMS.
- Implémenter un RBAC sécurisé utilisant Casbin pour contrôler l'accès des différents rôles.
- Utiliser Prisma pour simplifier et sécuriser les interactions avec la base de données PostgreSQL.
- Fournir une plateforme évolutive, sécurisée et accessible pour la communauté de la diaspora gabonaise.

### 2.2 Rôles des utilisateurs

- **Membre** : Soumet des formulaires d'inscription, consulte sa carte numérique et accède à la vérification par code QR.
- **Secrétaire** : Examine les soumissions d'inscription, approuve ou rejette les adhésions, gère les données des membres et attribue des codes de formulaires.
- **Président** : Approuve ou rejette les inscriptions, attribue des codes de formulaires, gère les rôles des utilisateurs et télécharge sa signature.

### 2.3 Contraintes

- Le système doit être basé sur le web, entièrement responsive et conçu en priorité pour les appareils mobiles, accessible via des navigateurs modernes (Chrome, Firefox, Safari).
- Les cartes de membre doivent avoir un format standardisé pour le recto et le verso, adapté à l'impression sur plastique.
- Le RBAC doit être implémenté avec Casbin.
- Les interactions avec la base de données doivent utiliser Prisma comme ORM.
- Les données sensibles (par exemple, numéros d'identification, mots de passe, signature du président, photos d'identification) doivent être stockées et cryptées de manière sécurisée.
- Le système doit respecter les réglementations sur la protection des données (par exemple, principes du RGPD).
- Un fournisseur tiers sera responsable de l'impression physique des cartes sur plastique.

## 3. Exigences fonctionnelles

### 3.1 Inscription des utilisateurs

- EF1.1

   : Le système doit fournir un formulaire d'inscription en ligne collectant :

  - Nom complet (obligatoire)
  - Prénoms (s)
  - Date et lieu de naissance 
  - Adresse
  - Professions
  - Numéro de carte d'identité consulaire (obligatoire, unique) et date de délivrance
  - Ville de résidence
  - Date d'entrée au Congo
  - Employeur / Université / Ecole
  - Télephone
  - Nom et prénom du conjoint(e)
  - Nombre d'enfant
  - **Type de pièce d'identité (obligatoire)** :  Carte consulaire
  - **Photo de la pièce d'identité (recto) (obligatoire)** : Fichier image (JPEG, PNG)
  - **Photo de la pièce d'identité (verso) (obligatoire)** : Fichier image (JPEG, PNG)
  - **Photo d'identité (selfie) (obligatoire)** : Fichier image (JPEG, PNG) avec un éclairage approprié

- **EF1.2** : Les utilisateurs doivent recevoir une confirmation de soumission réussie par e-mail et SMS.

- **EF1.3** : Les formulaires soumis doivent être stockés avec le statut « en attente » jusqu'à leur approbation via Prisma.

- **EF1.4** : Le système doit attribuer un code unique à chaque formulaire au format `N°004/AGCO/P/08-2025` .

- **EF1.5** : Les photos téléchargées doivent être stockées de manière sécurisée et associées au dossier de l'utilisateur dans la base de données.

### 3.2 Validation des adhésions

- **EF2.1** : Le Secrétaire Général doit accéder à un tableau de bord pour consulter les inscriptions en attente, et avoir la possibilité capable de lancer une nouvelle inscription depuis son interface via Prisma.
- **EF2.2** : Le Secrétaire Général doit pouvoir approuver ou rejeter les inscriptions via le tableau de bord.
- **EF2.3** : Les membres approuvés doivent recevoir une carte numérique ; les membres rejetés doivent être notifiés par e-mail et SMS.
- **EF2.4** : Le système doit enregistrer toutes les actions d'approbation/rejet avec des horodatages et des détails sur l'utilisateur, stockés via Prisma.
- **EF2.5** : Le Secrétaire Général doit pouvoir utiliser la signature numérique du Président, téléchargée au préalable, pour marquer les formulaires approuvés.

### 3.3 Carte de membre numérique

- EF3.1: Le système doit générer une carte de membre numérique pour chaque membre approuvé avec un format standardisé, destiné à l'impression sur plastique :
  - Recto:
    - Entête comprenant: Le logo de l'organisation, le nom de l'association, la devise, les numéros de téléphone et le siège social
    - La nature du document (Carte de membre pour le cas échéant)
    - Nom complet du membre
    - Prénom(s) du membre
    - Fonction du membre 
    - Date de naissance du membre
    - Numéro de téléphone du membre
    - Numéro d'identification du membre
    - Lieu et date d'émission de la carte de membre
    - Une photo format identité du membre
  - Verso :
    - Code QR lié à une URL de vérification sécurisée, permettant la visualisation du formulaire d'adhésion
    - Signature numérique du président
    - Mention spéciale
- **EF3.2** : La carte doit être consultable dans le portail des membres et téléchargeable au format PDF pour transmission au fournisseur d'impression.
- **EF3.3** : Le code QR doit être lié à une URL sécurisée affichant le formulaire d'adhésion du membre concerné, récupérés via Prisma.
- **EF3.4** : Le format de la carte doit être identique pour tous les membres, à l'exception des informations personnelles, du code de formulaire et de la date d'émission.

### 3.4 Téléchargement de la signature

- **EF4.1** : Le système doit permettre au président de télécharger une image de sa signature (par exemple, PNG ou JPEG).
- **EF4.2** : La signature téléchargée doit être stockée de manière sécurisée via Prisma et accessible au secrétaire pour une utilisation sur les formulaires approuvés et les cartes numériques.
- **EF4.3** : La signature doit apparaître sur le verso de la carte numérique et sur les formulaires approuvés.

### 3.5 Contrôle d'accès basé sur les rôles (RBAC)

- EF5.1

   : Le système doit utiliser Casbin pour implémenter le RBAC avec les permissions suivantes :

  - **Membre** : Consulter son propre profil, sa carte numérique et son code de formulaire.
  - **Secrétaire Général** : Consulter toutes les inscriptions, approuver/rejeter les adhésions, modifier les détails des membres, utiliser la signature du Président.
  - **Président** : Approuver/rejeter les inscriptions, consulter toutes les données des membres, attribuer des codes de formulaires, gérer les rôles des utilisateurs et téléverser sa signature.

- **EF5.2** : Les politiques de contrôle d'accès doivent être définies dans un fichier de configuration Casbin.

- **EF5.3** : Le système doit appliquer le RBAC à tous les points d'accès API et composants de l'interface utilisateur, avec des données récupérées via Prisma.

### 3.6 Authentification

- **EF6.1** : Les utilisateurs doivent se connecter à l'aide de leur adresse e-mail et d'un mot de passe.
- **EF6.2** : Le système doit utiliser des JWT pour la gestion des sessions.
- **EF6.3** : Les mots de passe doivent être hachés à l'aide de bcrypt avant stockage via Prisma.

### 3.7 Portail des membres

- **EF7.1** : Les membres doivent accéder à un portail pour consulter leur profil, leur carte numérique et leur code de formulaire, récupérés via Prisma.
- **EF7.2** : Les membres ou le Sécrétaire Géneral doivent pouvoir télécharger leur carte au format PDF imprimable pour transmission au fournisseur.
- **EF7.3** : Le portail doit afficher le code QR pour la vérification.

### 3.8 Notifications

- EF8.1

   : Le système doit envoyer des notifications par e-mail et SMS pour :

  - La soumission réussie d'une inscription
  - L'approbation ou le rejet d'une adhésion
  - Les demandes de réinitialisation de mot de passe

### 3.9 Gestion des fichiers téléchargés

- **EF9.1** : Le système doit permettre le téléchargement de fichiers image pour la pièce d'identité (recto et verso) et la photo d'identité (selfie ou téléversement).
- **EF9.2** : Les fichiers téléchargés doivent être stockés de manière sécurisée, dans un service de stockage cloud comme Cloudinary ou Google Cloud Storage.
- **EF9.3** : Les chemins ou URL des fichiers doivent être stockés dans la base de données via Prisma, associés au dossier de l'utilisateur.
- **EF9.4** : Le système doit valider que les fichiers téléchargés sont des images (JPEG, PNG) et respectent une taille maximale (par exemple, 5 Mo par fichier).

## 4. Exigences non fonctionnelles

### 4.1 Performance

- **ENF1.1** : Le système doit supporter jusqu'à 1 000 utilisateurs simultanés sans dégradation des performances.
- **ENF1.2** : Les temps de chargement des pages ne doivent pas dépasser 2 secondes dans des conditions normales.

### 4.2 Sécurité

- **ENF2.1** : Toutes les transmissions de données doivent utiliser HTTPS.
- **ENF2.2** : Les données sensibles (par exemple, numéros d'identification, mots de passe, signature du président, photos d'identification) doivent être cryptées dans la base de données via Prisma.
- **ENF2.3** : Le système doit implémenter une validation des entrées pour prévenir les injections SQL et les attaques XSS.
- **ENF2.4** : Les URL de vérification des codes QR ne doivent afficher que des données non sensibles ou exiger une authentification.
- **ENF2.5** : Les fichiers téléchargés doivent être stockés de manière sécurisée et accessible uniquement aux utilisateurs autorisés.

### 4.3 Convivialité

- **ENF3.1** : L'interface utilisateur doit être entièrement responsive, conçue en priorité pour les appareils mobiles (mobile-first) et compatible avec les navigateurs de bureau.
- **ENF3.2** : Le système doit fournir des messages d'erreur clairs et des retours de validation des formulaires.
- **ENF3.3** : La carte de membre numérique doit être conçue pour une impression de haute qualité (300 DPI) sur plastique.

### 4.4 Évolutivité

- **ENF4.1** : Le système doit être déployable sur une plateforme cloud (par exemple, Vercel, Heroku) pour l'évolutivité.
- **ENF4.2** : La base de données, gérée via Prisma, doit supporter une croissance jusqu'à 10 000 membres sans reconfiguration.

### 4.5 Fiabilité

- **ENF5.1** : Le système doit avoir une disponibilité de 99,9 %.
- **ENF5.2** : Des sauvegardes de données doivent être effectuées quotidiennement.

## 5. Spécifications techniques

### 5.1 Frontend

- **Framework** : React avec Tailwind CSS pour une interface utilisateur responsive et mobile-first.
- **Dépendances** : Hébergées via `cdn.jsdelivr.net` pour React, React DOM, Axios et QRCode.js.
- Fonctionnalités :
  - Formulaire d'inscription avec validation côté client , incluant  le téléchargement de fichiers pour les photos d'identification et génération du code QR après validation.
  - Portail des membres pour consulter les profils, les cartes et les codes de formulaires.
  - Tableau de bord administratif pour gérer les inscriptions, les approbations et les codes.
  - Téléchargement de la signature du président.
  - Génération de PDF et images imprimables pour les cartes de membre à l'aide d'une bibliothèque comme `jsPDF`.

### 5.2 Backend

- **Framework** : Node.js avec Express pour le développement des API.
- **ORM** : Prisma pour les interactions avec la base de données PostgreSQL.
- **RBAC** : Casbin pour le contrôle d'accès basé sur les rôles.
- **Stockage des fichiers** : Service de stockage cloud (Cloudinary, Google Cloud Storage) pour les photos d'identification.
- Points d'accès API :
  - `POST /api/register` : Soumettre un formulaire d'inscription avec téléchargement de fichiers, stocké via Prisma.
  - `POST /api/login` : Authentifier un utilisateur et retourner un JWT.
  - `GET /api/members` : Lister les membres (administrateurs uniquement, via Prisma).
  - `PATCH /api/members/:id` : Approuver/rejeter un membre (secrétaire ou président, via Prisma).
  - `POST /api/form-code/:id` : Attribuer un code de formulaire (secrétaire ou président, via Prisma).
  - `POST /api/signature` : Télécharger la signature du président (président uniquement, via Prisma).
  - `GET /api/member/:id` : Point d'accès public pour la vérification des codes QR, récupérant les données via Prisma.
  - `GET /api/member/:id/photos` : Récupérer les photos d'identification (secrétaire ou président uniquement).

### 5.3 Base de données

- **Type** : PostgreSQL, géré via Prisma.

- Schéma Prisma :

  ```prisma
  generator client {
    provider = "prisma-client-js"
  }
  
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  
  model User {
    id                   Int       @id @default(autoincrement())
    clerkId              String?   @unique // ID Clerk pour sync
    name                 String
    id_number            String    @unique
    email                String    @unique
    phone                String?
    address              String?
    dob                  DateTime?
    status               Status    @default(PENDING)
    role                 Role      @default(MEMBER)
    form_code            String?   @unique
    qr_code_url          String?
    card_issued_at       DateTime?
    created_at           DateTime  @default(now())
    updated_at           DateTime  @updatedAt
    id_type              String    // Type de pièce d'identité
    id_front_photo_url   String    // URL de la photo recto
    id_back_photo_url    String    // URL de la photo verso
    selfie_photo_url     String    // URL de la photo d'identité
  
    // Relations
    signatures           Signature[]
    audit_logs           AuditLog[]
  
    @@map("users")
  }
  
  model Signature {
    id            Int       @id @default(autoincrement())
    president_id  Int
    signature_url String
    cloudinary_id String    // Pour supprimer de Cloudinary si besoin
    is_active     Boolean   @default(true)
    uploaded_at   DateTime  @default(now())
  
    user          User      @relation(fields: [president_id], references: [id])
  
    @@map("signatures")
  }
  
  model AuditLog {
    id          Int       @id @default(autoincrement())
    user_id     Int?
    action      String    // REGISTER, APPROVE, REJECT, ASSIGN_CODE, etc.
    details     Json?     // Détails supplémentaires
    ip_address  String?
    user_agent  String?
    created_at  DateTime  @default(now())
  
    user        User?     @relation(fields: [user_id], references: [id])
  
    @@map("audit_logs")
  }
  
  enum Status {
    PENDING
    APPROVED
    REJECTED
  }
  
  enum Role {
    MEMBER
    SECRETARY
    PRESIDENT
  }
  ```

- **Migrations** : Utiliser `prisma migrate dev` pour synchroniser le schéma avec la base de données.

### 5.4 Génération de codes QR

- **Bibliothèque** : `qrcode` (package npm).
- **Fonctionnalité** : Générer un code QR lié à `/api/member/:id` pour chaque membre approuvé, récupérant les données via Prisma.
- **Vérification** : L'URL liée doit afficher le nom, le numéro d'identification et le code de formulaire du membre.

### 5.5 Notifications

- **Bibliothèque** : Intégration avec un service SMS (par exemple, Twilio) et un service e-mail (par exemple, SendGrid).
- **Fonctionnalité** : Envoyer des notifications par e-mail et SMS pour les événements clés, déclenchés après des opérations Prisma (par exemple, création ou mise à jour d'un utilisateur).

### 5.6 Déploiement

- **Frontend** : Déployer sur Vercel pour une évolutivité automatique.
- **Backend** : Déployer sur Heroku ou AWS avec PostgreSQL et Prisma.
- **Domaine** : Utiliser un domaine personnalisé avec HTTPS activé.

## 6. Spécification du design de la carte de membre

### 6.1 Recto

- **Dimensions** : 85,6 mm x 54 mm (taille standard de carte d'identité, 300 DPI pour l'impression sur plastique).
- Éléments :
  - Entête comprenant: Le logo de l'organisation, le nom de l'association (ASSOCIATION DES GABONAIS DU CONGO), la devise de l'association (ENGAGEMENT - SOLIDARITE - ENTRAIDE), les numéros de téléphone ( +242 05 337 00 14 / +242 06 692 31 00 ) et l'adresse ( 5 rue Louis TRECHO, Immeuble OTTA Brazzaville).
  - La nature du document (CARTE DE MEMBRE)
  - Nom complet du membre
  - Prénom(s) du membre
  - Fonction du membre 
  - Date de naissance du membre
  - Numéro de téléphone du membre
  - Numéro d'identification du membre
  - Lieu et date d'émission de la carte de membre
  - Une photo format identité du membre avec un ombrage vert.

- **Fond** : Logo de l'association semi-opaque sur fond blanc.

### 6.2 Verso

- Éléments :
  - Code QR lié à une URL de vérification sécurisée, permettant la visualisation du formulaire d'adhésion
  - Signature numérique du président
  - Mention spéciale
- **Fond** : Fond bleu sur la mention spéciale et fond blanc sur le reste de la carte .
- **Imprimabilité** : Exportable en PDF avec ou en png pour une impression professionnelle sur plastique.

## 7. Hypothèses et dépendances

- Hypothèses:
  - Les utilisateurs ont accès à des navigateurs web modernes sur des appareils mobiles.
  - L'organisation dispose d'un logo et de coordonnées pour le design de la carte.
  - Une connexion Internet est disponible pour les membres et les administrateurs.
  - Un fournisseur tiers est disponible pour l'impression sur plastique.
- Dépendances :
  - Plateforme d'hébergement cloud (Vercel).
  - Service de base de données PostgreSQL avec Prisma.
  - Services d'e-mail (SendGrid) et SMS ( Twilio).
  - Service de stockage cloud pour les fichiers (Cloudinary, Google Cloud Storage).

## 8. Livrables

- Application SGM basée sur le web (frontend et backend, mobile-first).
- Base de données PostgreSQL avec schéma Prisma.
- Configuration RBAC Casbin.
- Modèle de carte de membre numérique (recto et verso) au format PDF.
- Fonctionnalité de téléchargement de la signature du président.
- Documentation pour le déploiement et la maintenance.
- Guide utilisateur pour les membres, secrétaires et présidents.

## 9. Critères d'acceptation

- Le formulaire d'inscription est accessible, valide correctement les entrées (y compris les fichiers téléchargés) et attribue un code de formulaire et un QR code unique après validation via Prisma.
- Le tableau de bord administratif permet au Secrétaire Géneral d'approuver/rejeter les inscriptions et de gérer les codes.
- Les cartes de membre numériques sont générées avec un format standardisé, un code QR fonctionnel et la signature du président.
- Les cartes sont téléchargeables en PDF imprimables et en png pour l'impression sur plastique.
- La signature du Président peut être téléchargée et utilisée sur les formulaires approuvés.
- Casbin applique correctement le RBAC pour tous les rôles.
- Les notifications par e-mail et SMS fonctionnent pour tous les événements clés, déclenchés après des opérations Prisma.
- Le système est sécurisé, évolutif et entièrement responsive, avec une priorité mobile-first.
- Les photos d'identification sont téléchargées, stockées de manière sécurisée et associées correctement aux utilisateurs.

## 10. Chronologie et jalons

- Phase 1 : Exigences et conception

   (3 jours)

  - Finaliser les exigences et le design de la carte de membre.

- Phase 2 : Développement

   (7 jours)

  - Construire le frontend (mobile-first), le backend et la base de données avec Prisma.
  - Implémenter le RBAC Casbin, la fonctionnalité des codes QR, le téléchargement de la signature et la gestion des fichiers téléchargés.

- Phase 3 : Tests et déploiement

   (2 jours)

  - Effectuer des tests unitaires, d'intégration et d'acceptation des utilisateurs.
  - Déployer sur une plateforme cloud avec Prisma configuré.

- Phase 4 : Formation et remise

   (2 jours)

  - Former les administrateurs et fournir la documentation, incluant les instructions pour Prisma.

## 11. Approbation

Cette spécification des exigences doit être examinée et approuvée par la direction de l'organisation de la diaspora gabonaise avant le début du développement.

------

**Préparé par** : Elvis Destin OLEMBE et Mondésir NTSOUMOU
**Date** : 4 août 2025