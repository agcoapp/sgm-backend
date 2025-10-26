-- CreateEnum
CREATE TYPE "public"."Statut" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('MEMBRE', 'SECRETAIRE_GENERALE', 'PRESIDENT');

-- CreateEnum
CREATE TYPE "public"."TypePiece" AS ENUM ('CARTE_CONSULAIRE', 'PASSEPORT');

-- CreateTable
CREATE TABLE "public"."Utilisateur" (
    "id" SERIAL NOT NULL,
    "numero_adhesion" TEXT,
    "prenoms" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "photo_profil_url" TEXT,
    "date_naissance" TIMESTAMP(3),
    "lieu_naissance" TEXT,
    "adresse" TEXT,
    "profession" TEXT,
    "ville_residence" TEXT,
    "date_entree_congo" TIMESTAMP(3),
    "employeur_ecole" TEXT,
    "telephone" TEXT NOT NULL,
    "type_piece_identite" "public"."TypePiece",
    "numero_piece_identite" TEXT,
    "date_emission_piece" TIMESTAMP(3),
    "prenom_conjoint" TEXT,
    "nom_conjoint" TEXT,
    "nombre_enfants" INTEGER,
    "email" TEXT,
    "statut" "public"."Statut" NOT NULL DEFAULT 'EN_ATTENTE',
    "role" "public"."Role" NOT NULL DEFAULT 'MEMBRE',
    "code_formulaire" TEXT,
    "url_qr_code" TEXT,
    "carte_emise_le" TIMESTAMP(3),
    "nom_utilisateur" TEXT,
    "mot_passe_hash" TEXT,
    "doit_changer_mot_passe" BOOLEAN NOT NULL DEFAULT false,
    "a_paye" BOOLEAN NOT NULL DEFAULT false,
    "a_soumis_formulaire" BOOLEAN NOT NULL DEFAULT false,
    "derniere_connexion" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Signature" (
    "id" SERIAL NOT NULL,
    "id_president" INTEGER NOT NULL,
    "url_signature" TEXT NOT NULL,
    "cloudinary_id" TEXT NOT NULL,
    "est_active" BOOLEAN NOT NULL DEFAULT true,
    "telecharge_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JournalAudit" (
    "id" SERIAL NOT NULL,
    "id_utilisateur" INTEGER,
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
    "id_utilisateur" INTEGER NOT NULL,
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
    "id_utilisateur" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expire_le" TIMESTAMP(3) NOT NULL,
    "utilise" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRecuperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_numero_adhesion_key" ON "public"."Utilisateur"("numero_adhesion");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_numero_piece_identite_key" ON "public"."Utilisateur"("numero_piece_identite");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "public"."Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_code_formulaire_key" ON "public"."Utilisateur"("code_formulaire");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_nom_utilisateur_key" ON "public"."Utilisateur"("nom_utilisateur");

-- CreateIndex
CREATE UNIQUE INDEX "FormulaireAdhesion_id_utilisateur_numero_version_key" ON "public"."FormulaireAdhesion"("id_utilisateur", "numero_version");

-- CreateIndex
CREATE UNIQUE INDEX "TokenRecuperation_token_key" ON "public"."TokenRecuperation"("token");

-- AddForeignKey
ALTER TABLE "public"."Signature" ADD CONSTRAINT "Signature_id_president_fkey" FOREIGN KEY ("id_president") REFERENCES "public"."Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JournalAudit" ADD CONSTRAINT "JournalAudit_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "public"."Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormulaireAdhesion" ADD CONSTRAINT "FormulaireAdhesion_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "public"."Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TokenRecuperation" ADD CONSTRAINT "TokenRecuperation_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "public"."Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
