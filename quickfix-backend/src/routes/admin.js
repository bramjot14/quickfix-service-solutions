const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /admin/verifications
router.get('/verifications', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (status) where.verificationStatus = status;

    const [profiles, total] = await Promise.all([
      prisma.workerProfile.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { requestedAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, createdAt: true } },
          documents: { select: { id: true, docType: true, fileName: true, uploadedAt: true } },
          verifiedBy: { select: { firstName: true, lastName: true } }
        }
      }),
      prisma.workerProfile.count({ where })
    ]);

    const [pending, approved, rejected, unverified] = await Promise.all([
      prisma.workerProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.workerProfile.count({ where: { verificationStatus: 'APPROVED' } }),
      prisma.workerProfile.count({ where: { verificationStatus: 'REJECTED' } }),
      prisma.workerProfile.count({ where: { verificationStatus: 'UNVERIFIED' } }),
    ]);

    res.json({
      profiles,
      stats: { pending, approved, rejected, unverified, total: pending + approved + rejected + unverified },
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) { next(err); }
});

// GET /admin/documents/worker/:userId
router.get('/documents/worker/:userId', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.params.userId },
      include: {
        documents: true,
        user: { select: { email: true, firstName: true, lastName: true } }
      }
    });

    if (!profile) return res.status(404).json({ message: 'Worker not found' });

    const docsWithUrls = profile.documents.map(doc => {
      const isPdf = doc.mimeType === 'application/pdf';
      let viewUrl = doc.url;
      if (isPdf && doc.publicId) {
        viewUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${doc.publicId}`;
      }
      return { ...doc, signedUrl: viewUrl };
    });

    res.json({ ...profile, documents: docsWithUrls });
  } catch (err) { next(err); }
});

// PATCH /admin/workers/:userId/verification
router.patch('/workers/:userId/verification', authenticate, authorize('ADMIN'), [
  body('status').isIn(['APPROVED', 'REJECTED']),
  body('notes').optional().isLength({ max: 500 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { status, notes } = req.body;

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.params.userId } });
    if (!profile) return res.status(404).json({ message: 'Worker not found' });

    const updated = await prisma.workerProfile.update({
      where: { userId: req.params.userId },
      data: {
        verificationStatus: status,
        verifiedById: req.user.id,
        verifiedAt: status === 'APPROVED' ? new Date() : null,
        verificationNotes: notes || null,
      },
      include: { user: { select: { email: true, firstName: true, lastName: true } } }
    });

    await prisma.analyticsEvent.create({
      data: { userId: req.user.id, event: 'admin_verification_action', metadata: { targetUserId: req.params.userId, action: status, notes } }
    }).catch(() => {});

    res.json({ message: `Worker ${status.toLowerCase()} successfully`, profile: updated });
  } catch (err) { next(err); }
});

// ─── PAYMENTS ─────────────────────────────────────────────

// GET /admin/payments — all payment requests
router.get('/payments', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status === 'REQUESTED') where.paymentStatus = 'REQUESTED';
    else if (status === 'CUSTOMER_PAID') where.paymentStatus = 'CUSTOMER_PAID';
    else if (status === 'RELEASED') where.paymentStatus = 'RELEASED';
    else {
      // All payment-related jobs
      where.paymentStatus = { in: ['REQUESTED', 'CUSTOMER_PAID', 'RELEASED'] };
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { paymentRequestedAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignedWorker: { select: { id: true, firstName: true, lastName: true, email: true } },
          reviews: { select: { rating: true, comment: true }, take: 1 }
        }
      }),
      prisma.job.count({ where })
    ]);

    const [requested, customerPaid, released] = await Promise.all([
      prisma.job.count({ where: { paymentStatus: 'REQUESTED' } }),
      prisma.job.count({ where: { paymentStatus: 'CUSTOMER_PAID' } }),
      prisma.job.count({ where: { paymentStatus: 'RELEASED' } }),
    ]);

    res.json({
      jobs,
      stats: { requested, customerPaid, released },
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) { next(err); }
});

// POST /admin/payments/:jobId/release — Admin releases payment to worker
router.post('/payments/:jobId/release', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.paymentStatus !== 'CUSTOMER_PAID') {
      return res.status(400).json({ message: 'Customer has not paid yet' });
    }

    const commissionRate = parseFloat(process.env.COMMISSION_RATE || '0.10');
    const totalAmount = job.agreedPrice || 0;
    const commissionAmount = totalAmount * commissionRate;
    const workerAmount = totalAmount - commissionAmount;

    const updated = await prisma.job.update({
      where: { id: req.params.jobId },
      data: {
        paymentStatus: 'RELEASED',
        releasedAt: new Date(),
        releasedByAdminId: req.user.id,
      }
    });

    req.app.get('io')?.to(`job_${req.params.jobId}`).emit('payment_released', {
      jobId: req.params.jobId,
      workerAmount,
      commissionAmount
    });

    await prisma.analyticsEvent.create({
      data: {
        userId: req.user.id,
        event: 'admin_payment_released',
        metadata: { jobId: req.params.jobId, totalAmount, workerAmount, commissionAmount }
      }
    }).catch(() => {});

    res.json({
      message: `Payment released to worker. Worker receives $${workerAmount.toFixed(2)}, QuickFix keeps $${commissionAmount.toFixed(2)} commission.`,
      totalAmount, workerAmount, commissionAmount, job: updated
    });
  } catch (err) { next(err); }
});

// GET /admin/jobs
router.get('/jobs', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = status ? { status } : {};

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          assignedWorker: { select: { firstName: true, lastName: true, email: true } },
          _count: { select: { bids: true, messages: true } }
        }
      }),
      prisma.job.count({ where })
    ]);

    res.json({ jobs, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

module.exports = router;
