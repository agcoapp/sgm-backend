/*
  Warnings:

  - You are about to drop the column `numero_piece_identite` on the `Utilisateur` table. All the data in the column will be lost.
  - You are about to drop the column `type_piece_identite` on the `Utilisateur` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[numero_carte_consulaire]` on the table `Utilisateur` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Utilisateur_numero_piece_identite_key";

-- AlterTable
ALTER TABLE "public"."Utilisateur" DROP COLUMN "numero_piece_identite",
DROP COLUMN "type_piece_identite",
ADD COLUMN     "commentaire" TEXT,
ADD COLUMN     "numero_carte_consulaire" TEXT,
ADD COLUMN     "selfie_photo_url" TEXT,
ADD COLUMN     "signature_url" TEXT;

-- DropEnum
DROP TYPE "public"."TypePiece";

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_numero_carte_consulaire_key" ON "public"."Utilisateur"("numero_carte_consulaire");
