const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid media type'));
  }
});

const uploadMedia = (buffer, options) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
    if (err) reject(err); else resolve(result);
  });
  stream.end(buffer);
});

// POST /jobs
router.post('/', authenticate, authorize('CUSTOMER'), upload.array('media', 5), [
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('description').trim().notEmpty().isLength({ max: 2000 }),
  body('category').trim().notEmpty(),
  body('locationCity').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { title, description, category, locationCity, locationAddress,
            budgetMin, budgetMax, isEmergency, preferredWorkerId, lat, lng } = req.body;

    const mediaUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isVideo = file.mimetype.startsWith('video/');
        const result = await uploadMedia(file.buffer, {
          folder: `quickfix/jobs/${req.user.id}`,
          resource_type: isVideo ? 'video' : 'image',
        });
        mediaUrls.push(result.secure_url);
      }
    }

    const job = await prisma.job.create({
      data: {
        customerId: req.user.id,
        title, description, category, locationCity,
        locationAddress: locationAddress || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        budgetMin: budgetMin ? parseFloat(budgetMin) : null,
        budgetMax: budgetMax ? parseFloat(budgetMax) : null,
        isEmergency: isEmergency === 'true' || isEmergency === true,
        emergencyMultiplier: (isEmergency === 'true' || isEmergency === true) ? 1.5 : 1.0,
        preferredWorkerId: preferredWorkerId || null,
        mediaUrls,
      },
      include: { customer: { select: { firstName: true, lastName: true } } }
    });

    const topWorkers = await getTopWorkers(category, locationCity, 3);

    await prisma.analyticsEvent.create({
      data: { userId: req.user.id, event: 'job_post_submitted', metadata: { jobId: job.id, category, city: locationCity } }
    }).catch(() => {});

    res.status(201).json({ job, topWorkers });
  } catch (err) { next(err); }
});

// GET /jobs/mine
router.get('/mine', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { customerId: req.user.id };
    if (status) where.status = status;

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedWorker: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { bids: true, messages: true } }
      }
    });
    res.json(jobs);
  } catch (err) { next(err); }
});

// GET /jobs/open — verified workers only
router.get('/open', authenticate, authorize('WORKER'), async (req, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile || profile.verificationStatus !== 'APPROVED') {
      return res.status(403).json({ message: 'Only verified workers can browse jobs' });
    }

    const { category, city, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { status: 'OPEN' };
    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (city) where.locationCity = { equals: city, mode: 'insensitive' };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [{ isEmergency: 'desc' }, { createdAt: 'desc' }],
        include: {
          customer: { select: { firstName: true, lastName: true, avatarUrl: true } },
          _count: { select: { bids: true } }
        }
      }),
      prisma.job.count({ where })
    ]);

    res.json({ jobs, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

// GET /jobs/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignedWorker: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        bids: {
          include: {
            worker: {
              select: {
                id: true, firstName: true, lastName: true, avatarUrl: true,
                workerProfile: {
                  select: { avgRating: true, reviewsCount: true, verificationStatus: true,
                            responseMinutes: true, isAvailable: true, category: true, city: true,
                            profilePhotoUrl: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        reviews: { include: { reviewer: { select: { firstName: true, lastName: true } } } },
        _count: { select: { messages: true } }
      }
    });

    if (!job) return res.status(404).json({ message: 'Job not found' });

    const isCustomer = job.customerId === req.user.id;
    const isAssignedWorker = job.assignedWorkerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    const isBidder = job.bids.some(b => b.workerId === req.user.id);

    if (!isCustomer && !isAssignedWorker && !isAdmin && !isBidder && req.user.role !== 'WORKER') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Workers only see their own bid unless assigned
    if (req.user.role === 'WORKER' && !isAssignedWorker && !isAdmin) {
      job.bids = job.bids.filter(b => b.workerId === req.user.id);
    }

    res.json(job);
  } catch (err) { next(err); }
});

// PATCH /jobs/:id — customer edits open job
router.patch('/:id', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.customerId !== req.user.id) return res.status(403).json({ message: 'Not your job' });
    if (!['OPEN'].includes(job.status)) return res.status(400).json({ message: 'Can only edit open jobs' });

    const { title, description, budgetMin, budgetMax, locationAddress } = req.body;
    const data = {};
    if (title) data.title = title;
    if (description) data.description = description;
    if (budgetMin !== undefined) data.budgetMin = parseFloat(budgetMin);
    if (budgetMax !== undefined) data.budgetMax = parseFloat(budgetMax);
    if (locationAddress !== undefined) data.locationAddress = locationAddress;

    const updated = await prisma.job.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /jobs/:id — customer cancels job
// Free if OPEN, $100 penalty if ASSIGNED/IN_PROGRESS (unless worker no-show)
router.delete('/:id', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const { workerNoShow } = req.body;
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.customerId !== req.user.id) return res.status(403).json({ message: 'Not your job' });
    if (job.status === 'COMPLETED') return res.status(400).json({ message: 'Cannot cancel a completed job' });
    if (job.status === 'CANCELLED') return res.status(400).json({ message: 'Job already cancelled' });

    const needsPenalty = ['ASSIGNED', 'IN_PROGRESS'].includes(job.status) && !workerNoShow;

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        cancelledByCustomer: true,
        workerNoShow: Boolean(workerNoShow),
        cancellationPenalty: needsPenalty,
        penaltyPaid: false,
      }
    });

    res.json({
      message: needsPenalty
        ? 'Job cancelled. A $100 cancellation fee applies because a worker was already assigned.'
        : 'Job cancelled successfully.',
      penaltyRequired: needsPenalty,
      penaltyAmount: needsPenalty ? 100 : 0,
      job: updated
    });
  } catch (err) { next(err); }
});

// POST /jobs/:id/bid — worker bids with scheduled date/time
router.post('/:id/bid', authenticate, authorize('WORKER'), [
  body('price').isFloat({ min: 1 }),
  body('etaMins').isInt({ min: 5 }),
  body('message').trim().notEmpty().isLength({ max: 500 }),
  body('scheduledDate').notEmpty().withMessage('Please select a scheduled date'),
  body('scheduledTime').notEmpty().withMessage('Please select a scheduled time'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile || profile.verificationStatus !== 'APPROVED') {
      return res.status(403).json({ message: 'Only verified workers can bid' });
    }

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.status !== 'OPEN') return res.status(400).json({ message: 'Job is not open for bids' });

    const { price, etaMins, message, availableNow, scheduledDate, scheduledTime } = req.body;

    const bid = await prisma.jobBid.upsert({
      where: { jobId_workerId: { jobId: req.params.id, workerId: req.user.id } },
      update: {
        price: parseFloat(price), etaMins: parseInt(etaMins), message,
        availableNow: Boolean(availableNow), scheduledDate, scheduledTime
      },
      create: {
        jobId: req.params.id, workerId: req.user.id,
        price: parseFloat(price), etaMins: parseInt(etaMins), message,
        availableNow: Boolean(availableNow), scheduledDate, scheduledTime
      },
      include: {
        worker: {
          select: {
            id: true, firstName: true, lastName: true, avatarUrl: true,
            workerProfile: {
              select: { avgRating: true, reviewsCount: true, verificationStatus: true,
                        responseMinutes: true, isAvailable: true, businessName: true,
                        profilePhotoUrl: true }
            }
          }
        }
      }
    });

    await prisma.workerProfile.update({
      where: { userId: req.user.id },
      data: { lastActiveAt: new Date() }
    });

    req.app.get('io')?.to(`job_${req.params.id}`).emit('new_bid', bid);
    res.status(201).json(bid);
  } catch (err) { next(err); }
});

// GET /jobs/:id/bids
router.get('/:id/bids', authenticate, async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const isCustomer = job.customerId === req.user.id;
    const isAssigned = job.assignedWorkerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isCustomer && !isAssigned && !isAdmin) return res.status(403).json({ message: 'Access denied' });

    const bids = await prisma.jobBid.findMany({
      where: { jobId: req.params.id },
      include: {
        worker: {
          select: {
            id: true, firstName: true, lastName: true, avatarUrl: true,
            workerProfile: {
              select: { avgRating: true, reviewsCount: true, verificationStatus: true,
                        responseMinutes: true, isAvailable: true, businessName: true,
                        city: true, profilePhotoUrl: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(bids);
  } catch (err) { next(err); }
});

// POST /jobs/:id/assign/:workerId
router.post('/:id/assign/:workerId', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id }, include: { bids: true } });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.customerId !== req.user.id) return res.status(403).json({ message: 'Not your job' });
    if (job.status !== 'OPEN') return res.status(400).json({ message: 'Job already assigned' });

    const workerProfile = await prisma.workerProfile.findUnique({ where: { userId: req.params.workerId } });
    if (!workerProfile || workerProfile.verificationStatus !== 'APPROVED') {
      return res.status(400).json({ message: 'Worker must be verified to be assigned' });
    }

    const bid = job.bids.find(b => b.workerId === req.params.workerId);
    const agreedPrice = bid?.price || null;

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: 'ASSIGNED', assignedWorkerId: req.params.workerId, assignedAt: new Date(), agreedPrice },
      include: {
        assignedWorker: { select: { firstName: true, lastName: true, email: true } },
        customer: { select: { firstName: true, lastName: true } }
      }
    });

    await prisma.jobBid.updateMany({ where: { jobId: req.params.id, workerId: req.params.workerId }, data: { status: 'ACCEPTED' } });
    await prisma.jobBid.updateMany({ where: { jobId: req.params.id, workerId: { not: req.params.workerId } }, data: { status: 'REJECTED' } });

    req.app.get('io')?.to(`job_${req.params.id}`).emit('job_assigned', { jobId: req.params.id, workerId: req.params.workerId });

    res.json(updated);
  } catch (err) { next(err); }
});

// PATCH /jobs/:id/status
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const isCustomer = job.customerId === req.user.id;
    const isAssigned = job.assignedWorkerId === req.user.id;

    // WORKER: ASSIGNED→IN_PROGRESS (Start Job), IN_PROGRESS→COMPLETED (Job Done)
    // CUSTOMER: ASSIGNED/IN_PROGRESS→CANCELLED
    const allowed = {
      WORKER:   { ASSIGNED: ['IN_PROGRESS'], IN_PROGRESS: ['COMPLETED'] },
      CUSTOMER: { ASSIGNED: ['CANCELLED'], IN_PROGRESS: ['CANCELLED'] },
    };

    const roleAllowed = allowed[req.user.role]?.[job.status];
    if (!roleAllowed?.includes(status)) {
      return res.status(400).json({ message: `Cannot transition from ${job.status} to ${status}` });
    }
    if (!isCustomer && !isAssigned) return res.status(403).json({ message: 'Not authorized' });

    const data = { status };
    if (status === 'COMPLETED') data.completedAt = new Date();

    const updated = await prisma.job.update({ where: { id: req.params.id }, data });
    req.app.get('io')?.to(`job_${req.params.id}`).emit('job_status_updated', { jobId: req.params.id, status });

    res.json(updated);
  } catch (err) { next(err); }
});

// POST /jobs/:id/review
router.post('/:id/review', authenticate, authorize('CUSTOMER'), [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').trim().notEmpty().isLength({ max: 1000 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.customerId !== req.user.id) return res.status(403).json({ message: 'Not your job' });
    if (job.status !== 'COMPLETED') return res.status(400).json({ message: 'Can only review completed jobs' });
    if (!job.assignedWorkerId) return res.status(400).json({ message: 'No worker assigned' });

    const existing = await prisma.review.findFirst({ where: { jobId: req.params.id, reviewerId: req.user.id } });
    if (existing) return res.status(409).json({ message: 'Already reviewed' });

    const { rating, comment, photoUrls } = req.body;

    const review = await prisma.review.create({
      data: {
        jobId: req.params.id, reviewerId: req.user.id, revieweeId: job.assignedWorkerId,
        rating: parseInt(rating), comment, photoUrls: photoUrls || [], isVerifiedJob: true
      }
    });

    const agg = await prisma.review.aggregate({
      where: { revieweeId: job.assignedWorkerId },
      _avg: { rating: true }, _count: { rating: true }
    });

    await prisma.workerProfile.updateMany({
      where: { userId: job.assignedWorkerId },
      data: { avgRating: Math.round((agg._avg.rating || 0) * 10) / 10, reviewsCount: agg._count.rating }
    });

    res.status(201).json(review);
  } catch (err) { next(err); }
});

// POST /jobs/:id/request-payment — Worker requests payment from Admin
router.post('/:id/request-payment', authenticate, authorize('WORKER'), async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.assignedWorkerId !== req.user.id) return res.status(403).json({ message: 'Not your job' });
    if (job.status !== 'COMPLETED') return res.status(400).json({ message: 'Job must be completed first' });
    if (job.paymentStatus !== 'PENDING') return res.status(400).json({ message: 'Payment already requested or processed' });

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: { paymentStatus: 'REQUESTED', paymentRequestedAt: new Date() }
    });

    req.app.get('io')?.to(`job_${req.params.id}`).emit('payment_requested', { jobId: req.params.id, amount: job.agreedPrice });
    req.app.get('io')?.to('admin_room').emit('new_payment_request', { jobId: req.params.id });

    res.json({ message: 'Payment request sent to admin', job: updated });
  } catch (err) { next(err); }
});

// POST /jobs/:id/customer-pay — Customer pays Admin (dummy)
router.post('/:id/customer-pay', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.customerId !== req.user.id) return res.status(403).json({ message: 'Not your job' });
    if (job.status !== 'COMPLETED') return res.status(400).json({ message: 'Job must be completed' });
    if (job.paymentStatus !== 'REQUESTED') return res.status(400).json({ message: 'No payment request from worker yet' });

    const { dummyCardLast4, dummyCardName } = req.body;

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: { paymentStatus: 'CUSTOMER_PAID', customerPaidAt: new Date() }
    });

    req.app.get('io')?.to('admin_room').emit('customer_payment_received', {
      jobId: req.params.id,
      amount: job.agreedPrice,
      cardLast4: dummyCardLast4
    });

    res.json({ message: 'Payment sent to QuickFix admin. Worker will be paid once admin releases funds.', job: updated });
  } catch (err) { next(err); }
});

// POST /jobs/:id/messages
router.post('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Message text required' });

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const isCustomer = job.customerId === req.user.id;
    const isAssigned = job.assignedWorkerId === req.user.id;

    if (!isCustomer && !isAssigned) return res.status(403).json({ message: 'Not authorized' });
    if (!['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(job.status)) {
      return res.status(400).json({ message: 'Chat only available after job assignment' });
    }

    const message = await prisma.message.create({
      data: { jobId: req.params.id, senderId: req.user.id, text: text.trim() },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } }
    });

    req.app.get('io')?.to(`job_${req.params.id}`).emit('new_message', message);
    res.status(201).json(message);
  } catch (err) { next(err); }
});

// GET /jobs/:id/messages
router.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const isCustomer = job.customerId === req.user.id;
    const isAssigned = job.assignedWorkerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isCustomer && !isAssigned && !isAdmin) return res.status(403).json({ message: 'Access denied' });

    const messages = await prisma.message.findMany({
      where: { jobId: req.params.id },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (err) { next(err); }
});

async function getTopWorkers(category, city, limit = 3) {
  const workers = await prisma.workerProfile.findMany({
    where: { verificationStatus: 'APPROVED' },
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    take: 100,
  });

  const now = Date.now();
  const scored = workers.map(w => {
    let score = 0;
    if (w.category?.toLowerCase() === category?.toLowerCase()) score += 40;
    if (w.city?.toLowerCase() === city?.toLowerCase()) score += 15;
    if (w.isAvailable) score += 25;
    if (w.responseMinutes <= 15) score += 15;
    else if (w.responseMinutes <= 30) score += 10;
    else if (w.responseMinutes <= 60) score += 5;
    score += (w.avgRating / 5) * 15;
    const minsAgo = (now - new Date(w.lastActiveAt).getTime()) / 60000;
    if (minsAgo <= 10) score += 10;
    else if (minsAgo <= 30) score += 7;
    else if (minsAgo <= 60) score += 4;
    return { ...w, matchScore: Math.round(score) };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}

module.exports = router;
