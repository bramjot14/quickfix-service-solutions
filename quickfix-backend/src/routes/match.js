const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /match/top-workers?category=&city=&jobId=
router.get('/top-workers', async (req, res, next) => {
  try {
    const { category, city, jobId, limit = 3 } = req.query;

    const workers = await prisma.workerProfile.findMany({
      where: { verificationStatus: 'APPROVED' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }
      },
      take: 200,
    });

    const now = Date.now();

    const scored = workers.map(w => {
      let score = 0;
      const catMatch = w.category?.toLowerCase() === category?.toLowerCase();
      const cityMatch = w.city?.toLowerCase() === city?.toLowerCase();

      if (catMatch) score += 40;
      if (cityMatch) score += 15;
      if (w.isAvailable) score += 25;

      // Response time scoring (max 15)
      if (w.responseMinutes <= 15) score += 15;
      else if (w.responseMinutes <= 30) score += 10;
      else if (w.responseMinutes <= 60) score += 5;
      else score += 2;

      // Rating (max 15)
      score += (w.avgRating / 5) * 15;

      // Recency (max 10)
      const minsAgo = (now - new Date(w.lastActiveAt).getTime()) / 60000;
      if (minsAgo <= 10) score += 10;
      else if (minsAgo <= 30) score += 7;
      else if (minsAgo <= 60) score += 4;
      else if (minsAgo <= 180) score += 2;

      // Reviews count bonus (max 5)
      if (w.reviewsCount >= 100) score += 5;
      else if (w.reviewsCount >= 50) score += 3;
      else if (w.reviewsCount >= 10) score += 1;

      return {
        id: w.userId,
        workerId: w.id,
        firstName: w.user.firstName,
        lastName: w.user.lastName,
        avatarUrl: w.user.avatarUrl,
        businessName: w.businessName,
        category: w.category,
        city: w.city,
        avgRating: w.avgRating,
        reviewsCount: w.reviewsCount,
        isAvailable: w.isAvailable,
        responseMinutes: w.responseMinutes,
        hourlyRateMin: w.hourlyRateMin,
        hourlyRateMax: w.hourlyRateMax,
        verificationStatus: w.verificationStatus,
        matchScore: Math.round(score),
        matchReasons: [
          catMatch && '✓ Category match',
          cityMatch && '✓ City match',
          w.isAvailable && '✓ Available now',
          w.responseMinutes <= 30 && `✓ Responds in ${w.responseMinutes} min`,
          w.avgRating >= 4.5 && `✓ ${w.avgRating}★ rating`,
        ].filter(Boolean),
      };
    });

    const sorted = scored
      .filter(w => w.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, parseInt(limit));

    res.json({ workers: sorted, total: sorted.length });
  } catch (err) {
    next(err);
  }
});

// GET /pricing/benchmark?category=&city=
router.get('/benchmark', async (req, res, next) => {
  try {
    const { category, city } = req.query;
    if (!category || !city) {
      return res.status(400).json({ message: 'category and city are required' });
    }

    const benchmark = await prisma.pricingBenchmark.findFirst({
      where: {
        category: { equals: category, mode: 'insensitive' },
        city: { equals: city, mode: 'insensitive' }
      }
    });

    if (!benchmark) {
      // Try to find any benchmark for the category
      const fallback = await prisma.pricingBenchmark.findFirst({
        where: { category: { equals: category, mode: 'insensitive' } },
        orderBy: { sampleSize: 'desc' }
      });

      if (fallback) {
        return res.json({
          ...fallback,
          city,
          isEstimate: true,
          message: `Based on ${fallback.city} data (no local data yet)`
        });
      }

      return res.status(404).json({ message: 'No pricing data available for this category/city' });
    }

    res.json({ ...benchmark, isEstimate: false });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
