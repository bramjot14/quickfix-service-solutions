const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { optionalAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

const CATEGORIES = [
  { id: 'plumbing', name: 'Plumbing', icon: '🔧', description: 'Pipes, drains, water heaters & more' },
  { id: 'electrical', name: 'Electrical', icon: '⚡', description: 'Wiring, panels, outlets & EV chargers' },
  { id: 'hvac', name: 'HVAC', icon: '🌡️', description: 'Heating, cooling & ventilation' },
  { id: 'carpentry', name: 'Carpentry', icon: '🪚', description: 'Decks, cabinets & custom woodwork' },
  { id: 'painting', name: 'Painting', icon: '🎨', description: 'Interior & exterior painting' },
  { id: 'roofing', name: 'Roofing', icon: '🏠', description: 'Shingles, flat roofs & eavestroughs' },
  { id: 'landscaping', name: 'Landscaping', icon: '🌿', description: 'Lawn care, gardens & interlocking' },
  { id: 'cleaning', name: 'Cleaning', icon: '✨', description: 'Deep cleaning, move-in/out & more' },
  { id: 'moving', name: 'Moving', icon: '📦', description: 'Local & long distance moving' },
  { id: 'appliance-repair', name: 'Appliance Repair', icon: '🔨', description: 'Washers, dryers, fridges & more' },
  { id: 'flooring', name: 'Flooring', icon: '🪵', description: 'Hardwood, tile, laminate & vinyl' },
  { id: 'drywall', name: 'Drywall', icon: '🧱', description: 'Installation, repair & mudding' },
  { id: 'windows-doors', name: 'Windows & Doors', icon: '🚪', description: 'Installation & replacement' },
  { id: 'pest-control', name: 'Pest Control', icon: '🐛', description: 'Inspection & extermination' },
  { id: 'snow-removal', name: 'Snow Removal', icon: '❄️', description: 'Driveway & walkway clearing' },
];

// GET /public/categories
router.get('/categories', (req, res) => {
  res.json(CATEGORIES);
});

// GET /public/pros?category=&city=&available=&minRating=&sort=
router.get('/pros', async (req, res, next) => {
  try {
    const { category, city, available, minRating, sort, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      verificationStatus: 'APPROVED',
    };

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }
    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }
    if (available === 'true') {
      where.isAvailable = true;
    }
    if (minRating) {
      where.avgRating = { gte: parseFloat(minRating) };
    }

    let orderBy = {};
    switch (sort) {
      case 'rating': orderBy = { avgRating: 'desc' }; break;
      case 'reviews': orderBy = { reviewsCount: 'desc' }; break;
      case 'response': orderBy = { responseMinutes: 'asc' }; break;
      case 'recent': orderBy = { lastActiveAt: 'desc' }; break;
      default: orderBy = { avgRating: 'desc' };
    }

    const [profiles, total] = await Promise.all([
      prisma.workerProfile.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true }
          }
        }
      }),
      prisma.workerProfile.count({ where })
    ]);

    res.json({
      pros: profiles,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /public/pros/:id
router.get('/pros/:id', optionalAuth, async (req, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.params.id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, createdAt: true }
        },
        documents: {
          select: { docType: true, uploadedAt: true } // Don't expose URLs publicly
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Pro not found' });
    }

    // Get recent reviews
    const reviews = await prisma.review.findMany({
      where: { revieweeId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        reviewer: {
          select: { firstName: true, lastName: true, avatarUrl: true }
        },
        job: {
          select: { title: true, category: true }
        }
      }
    });

    // Badges
    const badges = [];
    if (profile.avgRating >= 4.8 && profile.reviewsCount >= 50) {
      badges.push({ id: 'top_rated', label: 'Top Rated', icon: '⭐' });
    }
    if (profile.responseMinutes <= 15) {
      badges.push({ id: 'fast_responder', label: 'Fast Responder', icon: '⚡' });
    }
    if (profile.jobsCompleted >= 100) {
      badges.push({ id: 'centurion', label: '100+ Jobs', icon: '🏆' });
    }
    if (profile.isAvailable) {
      badges.push({ id: 'available_now', label: 'Available Now', icon: '🟢' });
    }

    res.json({
      ...profile,
      reviews,
      badges,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
