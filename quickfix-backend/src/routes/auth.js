const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// POST /auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/(?=.*[0-9])(?=.*[a-zA-Z])/),
  body('firstName').trim().notEmpty().isLength({ max: 50 }),
  body('lastName').trim().notEmpty().isLength({ max: 50 }),
  body('role').isIn(['CUSTOMER', 'WORKER']),
  body('agreedToTerms').equals('true').withMessage('You must agree to the Terms and Conditions'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, role, phone, agreedToTerms: true },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true }
    });

    // If worker, create empty profile
    if (role === 'WORKER') {
      const { category, city } = req.body;
      if (category && city) {
        await prisma.workerProfile.create({
          data: {
            userId: user.id,
            category: category || 'General',
            city: city || 'Toronto',
            skills: [],
          }
        });
      }
    }

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid credentials format' });
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last active for workers
    if (user.role === 'WORKER') {
      await prisma.workerProfile.updateMany({
        where: { userId: user.id },
        data: { lastActiveAt: new Date() }
      });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, phone: true, avatarUrl: true, createdAt: true,
        workerProfile: {
          include: { documents: true }
        }
      }
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
