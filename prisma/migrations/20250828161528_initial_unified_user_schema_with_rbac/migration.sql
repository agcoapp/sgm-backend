-- CreateEnum
CREATE TYPE "public"."Statut" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."TypeDocumentOfficiel" AS ENUM ('PV_REUNION', 'COMPTE_RENDU', 'DECISION', 'REGLEMENT_INTERIEUR');

-- CreateTable
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numero_adhesion" TEXT,
    "prenoms" TEXT,
    "nom" TEXT,
    "photo_profil_url" TEXT,
    "date_naissance" TIMESTAMP(3),
    "lieu_naissance" TEXT,
    "adresse" TEXT,
    "profession" TEXT,
    "ville_residence" TEXT,
    "date_entree_congo" TIMESTAMP(3),
    "employeur_ecole" TEXT,
    "telephone" TEXT,
    "numero_carte_consulaire" TEXT,
    "date_emission_piece" TIMESTAMP(3),
    "selfie_photo_url" TEXT,
    "signature_url" TEXT,
    "commentaire" TEXT,
    "prenom_conjoint" TEXT,
    "nom_conjoint" TEXT,
    "nombre_enfants" INTEGER,
    "signature_membre_url" TEXT,
    "statut" "public"."Statut" NOT NULL DEFAULT 'EN_ATTENTE',
    "role" "public"."Role" NOT NULL DEFAULT 'MEMBER',
    "code_formulaire" TEXT,
    "url_qr_code" TEXT,
    "carte_emise_le" TIMESTAMP(3),
    "raison_rejet" TEXT,
    "rejete_le" TIMESTAMP(3),
    "rejete_par" TEXT,
    "nom_utilisateur" TEXT,
    "mot_passe_temporaire" TEXT,
    "doit_changer_mot_passe" BOOLEAN NOT NULL DEFAULT false,
    "a_change_mot_passe_temporaire" BOOLEAN NOT NULL DEFAULT false,
    "a_paye" BOOLEAN NOT NULL DEFAULT false,
    "a_soumis_formulaire" BOOLEAN NOT NULL DEFAULT false,
    "derniere_connexion" TIMESTAMP(3),
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "desactive_le" TIMESTAMP(3),
    "desactive_par" TEXT,
    "raison_desactivation" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Signature" (
    "id" SERIAL NOT NULL,
    "id_president" TEXT NOT NULL,
    "url_signature" TEXT NOT NULL,
    "cloudinary_id" TEXT NOT NULL,
    "est_active" BOOLEAN NOT NULL DEFAULT true,
    "telecharge_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JournalAudit" (
    "id" SERIAL NOT NULL,
    "id_utilisateur" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "adresse_ip" TEXT,
    "agent_utilisateur" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FormulaireAdhesion" (
    "id" SERIAL NOT NULL,
    "id_utilisateur" TEXT NOT NULL,
    "numero_version" INTEGER NOT NULL,
    "url_image_formulaire" TEXT NOT NULL,
    "donnees_snapshot" JSONB NOT NULL,
    "est_version_active" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormulaireAdhesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TokenRecuperation" (
    "id" SERIAL NOT NULL,
    "id_utilisateur" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expire_le" TIMESTAMP(3) NOT NULL,
    "utilise" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRecuperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TexteOfficiel" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type_document" "public"."TypeDocumentOfficiel" NOT NULL,
    "url_cloudinary" TEXT NOT NULL,
    "cloudinary_id" TEXT NOT NULL,
    "taille_fichier" INTEGER,
    "nom_fichier_original" TEXT NOT NULL,
    "telecharge_par" TEXT NOT NULL,
    "telecharge_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TexteOfficiel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'MEMBER',
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_numero_adhesion_key" ON "public"."user"("numero_adhesion");

-- CreateIndex
CREATE UNIQUE INDEX "user_numero_carte_consulaire_key" ON "public"."user"("numero_carte_consulaire");

-- CreateIndex
CREATE UNIQUE INDEX "user_code_formulaire_key" ON "public"."user"("code_formulaire");

-- CreateIndex
CREATE UNIQUE INDEX "user_nom_utilisateur_key" ON "public"."user"("nom_utilisateur");

-- CreateIndex
CREATE UNIQUE INDEX "FormulaireAdhesion_id_utilisateur_numero_version_key" ON "public"."FormulaireAdhesion"("id_utilisateur", "numero_version");

-- CreateIndex
CREATE UNIQUE INDEX "TokenRecuperation_token_key" ON "public"."TokenRecuperation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_providerAccountId_key" ON "public"."account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "public"."session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_email_key" ON "public"."invitation"("email");

-- AddForeignKey
ALTER TABLE "public"."Signature" ADD CONSTRAINT "Signature_id_president_fkey" FOREIGN KEY ("id_president") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JournalAudit" ADD CONSTRAINT "JournalAudit_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormulaireAdhesion" ADD CONSTRAINT "FormulaireAdhesion_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TokenRecuperation" ADD CONSTRAINT "TokenRecuperation_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TexteOfficiel" ADD CONSTRAINT "TexteOfficiel_telecharge_par_fkey" FOREIGN KEY ("telecharge_par") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitation" ADD CONSTRAINT "invitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
