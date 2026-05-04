const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const CATEGORIES = [
  'Plumbing', 'Electrical', 'HVAC', 'Carpentry', 'Painting',
  'Roofing', 'Landscaping', 'Cleaning', 'Moving', 'Appliance Repair',
  'Flooring', 'Drywall', 'Windows & Doors', 'Pest Control', 'Snow Removal'
];

const CITIES = ['Toronto', 'Mississauga', 'Brampton', 'Scarborough', 'North York',
  'Etobicoke', 'Richmond Hill', 'Markham', 'Vaughan', 'Oakville'];

const PRICING_BENCHMARKS = [
  { city: 'Toronto', category: 'Plumbing', minPrice: 150, maxPrice: 450, medianPrice: 280 },
  { city: 'Toronto', category: 'Electrical', minPrice: 200, maxPrice: 600, medianPrice: 350 },
  { city: 'Toronto', category: 'HVAC', minPrice: 300, maxPrice: 1200, medianPrice: 650 },
  { city: 'Toronto', category: 'Carpentry', minPrice: 200, maxPrice: 800, medianPrice: 450 },
  { city: 'Toronto', category: 'Painting', minPrice: 400, maxPrice: 2000, medianPrice: 900 },
  { city: 'Toronto', category: 'Roofing', minPrice: 500, maxPrice: 5000, medianPrice: 2000 },
  { city: 'Toronto', category: 'Landscaping', minPrice: 200, maxPrice: 1500, medianPrice: 600 },
  { city: 'Toronto', category: 'Cleaning', minPrice: 100, maxPrice: 400, medianPrice: 200 },
  { city: 'Toronto', category: 'Moving', minPrice: 300, maxPrice: 1500, medianPrice: 700 },
  { city: 'Toronto', category: 'Appliance Repair', minPrice: 100, maxPrice: 350, medianPrice: 180 },
  { city: 'Mississauga', category: 'Plumbing', minPrice: 130, maxPrice: 420, medianPrice: 260 },
  { city: 'Mississauga', category: 'Electrical', minPrice: 180, maxPrice: 550, medianPrice: 320 },
  { city: 'Mississauga', category: 'HVAC', minPrice: 280, maxPrice: 1100, medianPrice: 600 },
  { city: 'Mississauga', category: 'Cleaning', minPrice: 90, maxPrice: 380, medianPrice: 190 },
  { city: 'Mississauga', category: 'Painting', minPrice: 380, maxPrice: 1800, medianPrice: 850 },
  { city: 'Brampton', category: 'Plumbing', minPrice: 120, maxPrice: 400, medianPrice: 240 },
  { city: 'Brampton', category: 'Electrical', minPrice: 170, maxPrice: 520, medianPrice: 300 },
  { city: 'Scarborough', category: 'Plumbing', minPrice: 140, maxPrice: 430, medianPrice: 270 },
  { city: 'Scarborough', category: 'Electrical', minPrice: 190, maxPrice: 570, medianPrice: 330 },
  { city: 'North York', category: 'HVAC', minPrice: 290, maxPrice: 1150, medianPrice: 620 },
];

const WORKER_PROFILES = [
  {
    firstName: 'Marcus', lastName: 'Chen', email: 'marcus.chen@quickfix.dev',
    category: 'Plumbing', city: 'Toronto', skills: ['Pipe repair', 'Drain cleaning', 'Water heater installation', 'Emergency leaks'],
    bio: 'Licensed master plumber with 15 years experience. Available 24/7 for emergencies.',
    businessName: 'Chen Plumbing Solutions', avgRating: 4.9, reviewsCount: 87, isAvailable: true, responseMinutes: 15,
    hourlyRateMin: 85, hourlyRateMax: 120
  },
  {
    firstName: 'Aisha', lastName: 'Thompson', email: 'aisha.t@quickfix.dev',
    category: 'Electrical', city: 'Toronto', skills: ['Panel upgrades', 'EV charger installation', 'Pot lights', 'Smart home wiring'],
    bio: 'Certified electrician specializing in residential upgrades and EV infrastructure.',
    businessName: 'Thompson Electric', avgRating: 4.8, reviewsCount: 64, isAvailable: true, responseMinutes: 30,
    hourlyRateMin: 95, hourlyRateMax: 140
  },
  {
    firstName: 'Roberto', lastName: 'Vasquez', email: 'roberto.v@quickfix.dev',
    category: 'HVAC', city: 'Mississauga', skills: ['AC installation', 'Furnace repair', 'Duct cleaning', 'Heat pump'],
    bio: 'HVAC specialist with certifications in all major brands. Fast diagnosis guaranteed.',
    businessName: 'Vasquez Climate Control', avgRating: 4.7, reviewsCount: 112, isAvailable: false, responseMinutes: 45,
    hourlyRateMin: 100, hourlyRateMax: 150
  },
  {
    firstName: 'Sarah', lastName: 'O\'Brien', email: 'sarah.ob@quickfix.dev',
    category: 'Painting', city: 'Toronto', skills: ['Interior painting', 'Exterior painting', 'Cabinet refinishing', 'Wallpaper removal'],
    bio: '10 years of transforming spaces. Meticulous prep work for a flawless finish.',
    businessName: 'OBrien Painting Co.', avgRating: 4.9, reviewsCount: 156, isAvailable: true, responseMinutes: 60,
    hourlyRateMin: 60, hourlyRateMax: 90
  },
  {
    firstName: 'James', lastName: 'Okafor', email: 'james.ok@quickfix.dev',
    category: 'Carpentry', city: 'North York', skills: ['Deck building', 'Custom furniture', 'Cabinet installation', 'Trim work'],
    bio: 'Master carpenter crafting beautiful, durable woodwork since 2008.',
    businessName: 'Okafor Custom Wood', avgRating: 4.8, reviewsCount: 73, isAvailable: true, responseMinutes: 30,
    hourlyRateMin: 75, hourlyRateMax: 110
  },
  {
    firstName: 'Priya', lastName: 'Sharma', email: 'priya.s@quickfix.dev',
    category: 'Cleaning', city: 'Scarborough', skills: ['Deep cleaning', 'Move-in/out', 'Post-construction', 'Eco-friendly products'],
    bio: 'Professional cleaning with non-toxic products. Satisfaction guaranteed.',
    businessName: 'Sharma Spotless', avgRating: 4.6, reviewsCount: 201, isAvailable: true, responseMinutes: 15,
    hourlyRateMin: 40, hourlyRateMax: 65
  },
  {
    firstName: 'David', lastName: 'Kim', email: 'david.k@quickfix.dev',
    category: 'Roofing', city: 'Brampton', skills: ['Shingle replacement', 'Flat roof repair', 'Skylights', 'Eavestroughs'],
    bio: 'COR-certified roofer handling residential and commercial projects.',
    businessName: 'Kim Roofing & Exteriors', avgRating: 4.7, reviewsCount: 45, isAvailable: false, responseMinutes: 120,
    hourlyRateMin: 80, hourlyRateMax: 120
  },
  {
    firstName: 'Carlos', lastName: 'Mendez', email: 'carlos.m@quickfix.dev',
    category: 'Landscaping', city: 'Vaughan', skills: ['Lawn care', 'Garden design', 'Interlocking', 'Tree trimming', 'Snow removal'],
    bio: 'Full-service landscaping. Seasonal packages available.',
    businessName: 'Mendez Green Space', avgRating: 4.5, reviewsCount: 89, isAvailable: true, responseMinutes: 45,
    hourlyRateMin: 50, hourlyRateMax: 80
  },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.analyticsEvent.deleteMany();
  await prisma.review.deleteMany();
  await prisma.message.deleteMany();
  await prisma.jobBid.deleteMany();
  await prisma.job.deleteMany();
  await prisma.workerDocument.deleteMany();
  await prisma.workerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pricingBenchmark.deleteMany();

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // Create ADMIN
  const admin = await prisma.user.create({
    data: {
      email: 'admin@quickfix.ca',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'QuickFix',
      role: 'ADMIN',
    }
  });
  console.log('✅ Admin created:', admin.email);

  // Create sample CUSTOMER
  const customer = await prisma.user.create({
    data: {
      email: 'customer@quickfix.ca',
      password: hashedPassword,
      firstName: 'Alex',
      lastName: 'Johnson',
      role: 'CUSTOMER',
    }
  });
  console.log('✅ Customer created:', customer.email);

  // Create WORKERS
  for (const wp of WORKER_PROFILES) {
    const user = await prisma.user.create({
      data: {
        email: wp.email,
        password: hashedPassword,
        firstName: wp.firstName,
        lastName: wp.lastName,
        role: 'WORKER',
      }
    });

    await prisma.workerProfile.create({
      data: {
        userId: user.id,
        businessName: wp.businessName,
        bio: wp.bio,
        category: wp.category,
        skills: wp.skills,
        city: wp.city,
        province: 'ON',
        verificationStatus: 'APPROVED',
        verifiedById: admin.id,
        verifiedAt: new Date(),
        verificationNotes: 'Documents verified - ID + Certificate confirmed',
        isAvailable: wp.isAvailable,
        responseMinutes: wp.responseMinutes,
        avgRating: wp.avgRating,
        reviewsCount: wp.reviewsCount,
        jobsCompleted: Math.floor(wp.reviewsCount * 1.1),
        completionRate: 0.95,
        lastActiveAt: new Date(Date.now() - Math.random() * 3600000),
        hourlyRateMin: wp.hourlyRateMin,
        hourlyRateMax: wp.hourlyRateMax,
      }
    });

    console.log(`✅ Worker created: ${wp.firstName} ${wp.lastName} (${wp.category})`);
  }

  // Create sample job with bids
  const sampleJob = await prisma.job.create({
    data: {
      customerId: customer.id,
      title: 'Kitchen sink drain unclogging',
      description: 'My kitchen sink is completely blocked. Water is not draining at all. Tried drain cleaner but no success.',
      category: 'Plumbing',
      locationCity: 'Toronto',
      locationAddress: '123 Main St, Toronto, ON',
      budgetMin: 100,
      budgetMax: 300,
      status: 'OPEN',
    }
  });

  // Seed pricing benchmarks
  for (const bench of PRICING_BENCHMARKS) {
    await prisma.pricingBenchmark.create({
      data: {
        city: bench.city,
        category: bench.category,
        minPrice: bench.minPrice,
        maxPrice: bench.maxPrice,
        medianPrice: bench.medianPrice,
        sampleSize: Math.floor(Math.random() * 200) + 50,
      }
    });
  }
  console.log(`✅ ${PRICING_BENCHMARKS.length} pricing benchmarks seeded`);

  // Sample reviews for workers
  const workerUsers = await prisma.user.findMany({ where: { role: 'WORKER' } });
  const reviewComments = [
    'Excellent work, very professional and punctual!',
    'Fixed the issue quickly and at a fair price.',
    'Highly recommend! Will use again.',
    'Great communication throughout the job.',
    'Thorough work, left everything clean.',
  ];

  for (const worker of workerUsers.slice(0, 3)) {
    const completedJob = await prisma.job.create({
      data: {
        customerId: customer.id,
        title: 'Sample completed job',
        description: 'Sample completed job for review seeding',
        category: 'Plumbing',
        locationCity: 'Toronto',
        status: 'COMPLETED',
        assignedWorkerId: worker.id,
        completedAt: new Date(Date.now() - 7 * 24 * 3600000),
      }
    });

    await prisma.review.create({
      data: {
        jobId: completedJob.id,
        reviewerId: customer.id,
        revieweeId: worker.id,
        rating: Math.floor(Math.random() * 2) + 4,
        comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
        isVerifiedJob: true,
      }
    });
  }
  console.log('✅ Sample reviews seeded');

  console.log('\n🎉 Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Admin:    admin@quickfix.ca / Password123!');
  console.log('🏠 Customer: customer@quickfix.ca / Password123!');
  console.log('🔧 Workers:  [email]@quickfix.dev / Password123!');
  console.log(`📊 Categories: ${CATEGORIES.length}`);
  console.log(`💰 Benchmarks: ${PRICING_BENCHMARKS.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
