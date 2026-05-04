/*
  Warnings:

  - The values [PAID,COMMISSION_SENT] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `paidAt` on the `Job` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'PROFILE_PHOTO';

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'REQUESTED', 'CUSTOMER_PAID', 'RELEASED');
ALTER TABLE "Job" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "Job" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new" USING ("paymentStatus"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "Job" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "paidAt",
ADD COLUMN     "cancellationPenalty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancelledByCustomer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customerPaidAt" TIMESTAMP(3),
ADD COLUMN     "penaltyPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "releasedByAdminId" TEXT,
ADD COLUMN     "workerNoShow" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "JobBid" ADD COLUMN     "scheduledDate" TEXT,
ADD COLUMN     "scheduledTime" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "agreedToTerms" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkerProfile" ADD COLUMN     "profilePhotoPublicId" TEXT,
ADD COLUMN     "profilePhotoUploadedAt" TIMESTAMP(3),
ADD COLUMN     "profilePhotoUrl" TEXT;
