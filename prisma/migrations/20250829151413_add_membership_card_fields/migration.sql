-- AlterTable
ALTER TABLE "public"."Utilisateur" ADD COLUMN     "carte_generee_le" TIMESTAMP(3),
ADD COLUMN     "carte_generee_par" INTEGER,
ADD COLUMN     "carte_recto_url" TEXT,
ADD COLUMN     "carte_verso_url" TEXT;
