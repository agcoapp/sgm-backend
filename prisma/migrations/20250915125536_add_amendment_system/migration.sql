-- CreateEnum
CREATE TYPE "public"."TypeAmendment" AS ENUM ('MINEUR', 'MAJEUR', 'FAMILIAL', 'PROFESSIONNEL');

-- CreateEnum
CREATE TYPE "public"."StatutAmendment" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE', 'ANNULE');

-- CreateTable
CREATE TABLE "public"."AmendmentProfil" (
    "id" SERIAL NOT NULL,
    "id_membre" INTEGER NOT NULL,
    "numero_reference" TEXT NOT NULL,
    "type_amendment" "public"."TypeAmendment" NOT NULL,
    "statut" "public"."StatutAmendment" NOT NULL DEFAULT 'EN_ATTENTE',
    "donnees_avant" JSONB NOT NULL,
    "donnees_demandees" JSONB NOT NULL,
    "champs_modifies" TEXT[],
    "raison_modification" TEXT NOT NULL,
    "documents_justificatifs" TEXT[],
    "commentaire_membre" TEXT,
    "traite_par" INTEGER,
    "traite_le" TIMESTAMP(3),
    "commentaire_secretaire" TEXT,
    "raison_rejet" TEXT,
    "soumis_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmendmentProfil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AmendmentProfil_numero_reference_key" ON "public"."AmendmentProfil"("numero_reference");

-- AddForeignKey
ALTER TABLE "public"."AmendmentProfil" ADD CONSTRAINT "AmendmentProfil_id_membre_fkey" FOREIGN KEY ("id_membre") REFERENCES "public"."Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AmendmentProfil" ADD CONSTRAINT "AmendmentProfil_traite_par_fkey" FOREIGN KEY ("traite_par") REFERENCES "public"."Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
