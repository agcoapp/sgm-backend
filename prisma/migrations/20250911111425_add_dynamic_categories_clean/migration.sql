/*
  Warnings:

  - You are about to drop the column `type_document` on the `TexteOfficiel` table. All the data in the column will be lost.
  - Added the required column `id_categorie` to the `TexteOfficiel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."TexteOfficiel" DROP COLUMN "type_document",
ADD COLUMN     "id_categorie" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "public"."TypeDocumentOfficiel";

-- CreateTable
CREATE TABLE "public"."CategorieTexteOfficiel" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "cree_par" INTEGER NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CategorieTexteOfficiel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategorieTexteOfficiel_nom_key" ON "public"."CategorieTexteOfficiel"("nom");

-- AddForeignKey
ALTER TABLE "public"."TexteOfficiel" ADD CONSTRAINT "TexteOfficiel_id_categorie_fkey" FOREIGN KEY ("id_categorie") REFERENCES "public"."CategorieTexteOfficiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategorieTexteOfficiel" ADD CONSTRAINT "CategorieTexteOfficiel_cree_par_fkey" FOREIGN KEY ("cree_par") REFERENCES "public"."Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
