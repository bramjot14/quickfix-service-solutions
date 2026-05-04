-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'WORKER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('GOVERNMENT_ID', 'CERTIFICATE', 'INSURANCE', 'BACKGROUND_CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'REQUESTED', 'PAID', 'COMMISSION_SENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "bio" TEXT,
    "category" TEXT NOT NULL,
    "skills" TEXT[],
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL DEFAULT 'ON',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "serviceRadius" INTEGER NOT NULL DEFAULT 25,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "requestedAt" TIMESTAMP(3),
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "responseMinutes" INTEGER NOT NULL DEFAULT 60,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "hourlyRateMin" DOUBLE PRECISION,
    "hourlyRateMax" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerDocument" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "docType" "DocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "locationCity" TEXT NOT NULL,
    "locationAddress" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "emergencyMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "preferredWorkerId" TEXT,
    "assignedWorkerId" TEXT,
    "mediaUrls" TEXT[],
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "agreedPrice" DOUBLE PRECISION,
    "paymentRequestedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobBid" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "etaMins" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "availableNow" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "photoUrls" TEXT[],
    "isVerifiedJob" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingBenchmark" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "medianPrice" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerProfile_userId_key" ON "WorkerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JobBid_jobId_workerId_key" ON "JobBid"("jobId", "workerId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_jobId_reviewerId_key" ON "Review"("jobId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingBenchmark_city_category_key" ON "PricingBenchmark"("city", "category");

-- AddForeignKey
ALTER TABLE "WorkerProfile" ADD CONSTRAINT "WorkerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerProfile" ADD CONSTRAINT "WorkerProfile_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDocument" ADD CONSTRAINT "WorkerDocument_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobBid" ADD CONSTRAINT "JobBid_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobBid" ADD CONSTRAINT "JobBid_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
