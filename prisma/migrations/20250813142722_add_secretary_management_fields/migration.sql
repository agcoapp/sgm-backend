-- AlterTable
ALTER TABLE "public"."Utilisateur" ADD COLUMN     "desactive_le" TIMESTAMP(3),
ADD COLUMN     "desactive_par" INTEGER,
ADD COLUMN     "est_actif" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "raison_desactivation" TEXT,
ADD COLUMN     "raison_rejet" TEXT,
ADD COLUMN     "rejete_le" TIMESTAMP(3),
ADD COLUMN     "rejete_par" INTEGER;
