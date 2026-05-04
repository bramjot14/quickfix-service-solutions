const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const prisma = new PrismaClient();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer memory storage (files go to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, PDF allowed.'));
    }
  }
});

const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(buffer);
  });
};

// PATCH /workers/me/profile
router.patch('/me/profile', authenticate, authorize('WORKER'), [
  body('bio').optional().isLength({ max: 1000 }),
  body('city').optional().trim().notEmpty(),
  body('category').optional().trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { bio, businessName, category, city, province, skills,
            hourlyRateMin, hourlyRateMax, lat, lng, serviceRadius } = req.body;

    const existing = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id }
    });

    const data = {};
    if (bio !== undefined) data.bio = bio;
    if (businessName !== undefined) data.businessName = businessName;
    if (category !== undefined) data.category = category;
    if (city !== undefined) data.city = city;
    if (province !== undefined) data.province = province;
    if (skills !== undefined) data.skills = Array.isArray(skills) ? skills : [skills];
    if (hourlyRateMin !== undefined) data.hourlyRateMin = parseFloat(hourlyRateMin);
    if (hourlyRateMax !== undefined) data.hourlyRateMax = parseFloat(hourlyRateMax);
    if (lat !== undefined) data.lat = parseFloat(lat);
    if (lng !== undefined) data.lng = parseFloat(lng);
    if (serviceRadius !== undefined) data.serviceRadius = parseInt(serviceRadius);
    data.lastActiveAt = new Date();

    let profile;
    if (existing) {
      profile = await prisma.workerProfile.update({
        where: { userId: req.user.id },
        data,
        include: { documents: true }
      });
    } else {
      profile = await prisma.workerProfile.create({
        data: {
          userId: req.user.id,
          category: category || 'General',
          city: city || 'Toronto',
          skills: skills || [],
          ...data
        },
        include: { documents: true }
      });
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// POST /workers/me/verification/request
router.post('/me/verification/request', authenticate, authorize('WORKER'), async (req, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id },
      include: { documents: true }
    });

    if (!profile) {
      return res.status(400).json({ message: 'Please create your profile first' });
    }

    const hasId = profile.documents.some(d => d.docType === 'GOVERNMENT_ID');
    const hasCert = profile.documents.some(d => d.docType === 'CERTIFICATE');

    if (!hasId || !hasCert) {
      return res.status(400).json({
        message: 'You must upload both a Government ID and Certificate before requesting verification',
        missingDocuments: {
          id: !hasId,
          certificate: !hasCert
        }
      });
    }

    if (profile.verificationStatus === 'APPROVED') {
      return res.status(400).json({ message: 'Already verified' });
    }

    const updated = await prisma.workerProfile.update({
      where: { userId: req.user.id },
      data: {
        verificationStatus: 'PENDING',
        requestedAt: new Date(),
        verificationNotes: null,
      }
    });

    res.json({ message: 'Verification request submitted', status: updated.verificationStatus });
  } catch (err) {
    next(err);
  }
});

// GET /workers/me/verification
router.get('/me/verification', authenticate, authorize('WORKER'), async (req, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        documents: true,
        verifiedBy: { select: { firstName: true, lastName: true } }
      }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const hasId = profile.documents.some(d => d.docType === 'GOVERNMENT_ID');
    const hasCert = profile.documents.some(d => d.docType === 'CERTIFICATE');

    res.json({
      status: profile.verificationStatus,
      documents: profile.documents,
      hasRequiredDocs: hasId && hasCert,
      missingDocs: { id: !hasId, certificate: !hasCert },
      verifiedAt: profile.verifiedAt,
      verifiedBy: profile.verifiedBy,
      notes: profile.verificationNotes,
      requestedAt: profile.requestedAt,
    });
  } catch (err) {
    next(err);
  }
});

// POST /documents/upload (via workers router for simplicity)
router.post('/documents/upload', authenticate, authorize('WORKER'),
  upload.single('document'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { docType } = req.body;
      const validDocTypes = ['PROFILE_PHOTO', 'GOVERNMENT_ID', 'CERTIFICATE', 'INSURANCE', 'BACKGROUND_CHECK', 'OTHER'];
      if (!docType || !validDocTypes.includes(docType)) {
        return res.status(400).json({ message: 'Invalid document type' });
      }

      let profile = await prisma.workerProfile.findUnique({
        where: { userId: req.user.id }
      });

      if (!profile) {
        return res.status(400).json({ message: 'Create your profile before uploading documents' });
      }

      const isPdf = req.file.mimetype === 'application/pdf';
      const resourceType = isPdf ? 'raw' : 'image';

      // Upload to Cloudinary — stored in private folder, URL is non-guessable
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: `quickfix/documents/${req.user.id}`,
        resource_type: resourceType,
        tags: ['verification', docType.toLowerCase()],
        // No access_mode:'authenticated' — use folder obscurity instead.
        // Signed delivery URLs are generated on-demand in the admin route.
      });

      // Delete existing doc of same type
      const existing = await prisma.workerDocument.findFirst({
        where: { workerId: profile.id, docType }
      });
      if (existing) {
        const existingResourceType = existing.mimeType === 'application/pdf' ? 'raw' : 'image';
        await cloudinary.uploader.destroy(existing.publicId, { resource_type: existingResourceType }).catch(() => {});
        await prisma.workerDocument.delete({ where: { id: existing.id } });
      }

      const doc = await prisma.workerDocument.create({
        data: {
          workerId: profile.id,
          docType,
          url: result.secure_url,
          publicId: result.public_id,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
        }
      });

      // Reset verification if currently APPROVED or re-uploading
      if (profile.verificationStatus === 'APPROVED') {
        await prisma.workerProfile.update({
          where: { id: profile.id },
          data: { verificationStatus: 'UNVERIFIED', verifiedAt: null, verifiedById: null }
        });
      }

      res.status(201).json({ message: 'Document uploaded', document: doc });
    } catch (err) {
      next(err);
    }
  }
);

// GET /documents/me
router.get('/documents/me', authenticate, authorize('WORKER'), async (req, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id }
    });
    if (!profile) return res.json([]);

    const documents = await prisma.workerDocument.findMany({
      where: { workerId: profile.id },
      orderBy: { uploadedAt: 'desc' }
    });
    res.json(documents);
  } catch (err) {
    next(err);
  }
});

// PATCH /workers/me/availability
router.patch('/me/availability', authenticate, authorize('WORKER'), async (req, res, next) => {
  try {
    const { isAvailable, responseMinutes } = req.body;

    const data = { lastActiveAt: new Date() };
    if (isAvailable !== undefined) data.isAvailable = Boolean(isAvailable);
    if (responseMinutes !== undefined) data.responseMinutes = parseInt(responseMinutes);

    const profile = await prisma.workerProfile.update({
      where: { userId: req.user.id },
      data,
      select: { isAvailable: true, responseMinutes: true, lastActiveAt: true }
    });

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// GET /workers/me/availability
router.get('/me/availability', authenticate, authorize('WORKER'), async (req, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id },
      select: { isAvailable: true, responseMinutes: true, lastActiveAt: true, verificationStatus: true }
    });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// GET /workers/me/dashboard
router.get('/me/dashboard', authenticate, authorize('WORKER'), async (req, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id }
    });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const [activeBids, assignedJobs, completedJobs, pendingPayments] = await Promise.all([
      prisma.jobBid.count({ where: { workerId: req.user.id, status: 'PENDING' } }),
      prisma.job.count({ where: { assignedWorkerId: req.user.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } }),
      prisma.job.count({ where: { assignedWorkerId: req.user.id, status: 'COMPLETED' } }),
      prisma.job.count({ where: { assignedWorkerId: req.user.id, status: 'COMPLETED', paymentStatus: 'REQUESTED' } }),
    ]);

    res.json({
      profile,
      stats: { activeBids, assignedJobs, completedJobs, pendingPayments }
    });
  } catch (err) {
    next(err);
  }
});

// POST /workers/me/profile-photo — upload recent profile photo
router.post('/me/profile-photo', authenticate, authorize('WORKER'),
  upload.single('photo'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No photo uploaded' });

      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Only JPEG, PNG, or WebP images allowed for profile photo' });
      }

      const { confirmedRecent } = req.body;
      if (!confirmedRecent || confirmedRecent !== 'true') {
        return res.status(400).json({ message: 'You must confirm this photo was taken within the last 6 months' });
      }

      let profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
      if (!profile) return res.status(400).json({ message: 'Create your profile first' });

      // Delete old photo from Cloudinary if exists
      if (profile.profilePhotoPublicId) {
        await cloudinary.uploader.destroy(profile.profilePhotoPublicId).catch(() => {});
      }

      const result = await uploadToCloudinary(req.file.buffer, {
        folder: `quickfix/profile-photos/${req.user.id}`,
        resource_type: 'image',
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        tags: ['profile_photo'],
      });

      // Update profile AND user avatar
      await Promise.all([
        prisma.workerProfile.update({
          where: { userId: req.user.id },
          data: {
            profilePhotoUrl: result.secure_url,
            profilePhotoPublicId: result.public_id,
            profilePhotoUploadedAt: new Date(),
          }
        }),
        prisma.user.update({
          where: { id: req.user.id },
          data: { avatarUrl: result.secure_url }
        })
      ]);

      // Store as a document record too for admin visibility
      const existingDoc = await prisma.workerDocument.findFirst({
        where: { workerId: profile.id, docType: 'PROFILE_PHOTO' }
      });
      if (existingDoc) {
        await prisma.workerDocument.delete({ where: { id: existingDoc.id } });
      }
      await prisma.workerDocument.create({
        data: {
          workerId: profile.id,
          docType: 'PROFILE_PHOTO',
          url: result.secure_url,
          publicId: result.public_id,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
        }
      });

      res.json({ message: 'Profile photo uploaded', url: result.secure_url });
    } catch (err) { next(err); }
  }
);

module.exports = router;
