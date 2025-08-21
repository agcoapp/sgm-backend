-- CreateEnum
CREATE TYPE "public"."TypeDocumentOfficiel" AS ENUM ('PV_REUNION', 'COMPTE_RENDU', 'DECISION', 'REGLEMENT_INTERIEUR');

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
    "telecharge_par" INTEGER NOT NULL,
    "telecharge_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TexteOfficiel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."TexteOfficiel" ADD CONSTRAINT "TexteOfficiel_telecharge_par_fkey" FOREIGN KEY ("telecharge_par") REFERENCES "public"."Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
