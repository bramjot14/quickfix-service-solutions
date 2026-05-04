const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const authenticateSocket = async (socket) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) throw new Error('No token');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, firstName: true, lastName: true }
  });
  if (!user) throw new Error('User not found');
  return user;
};

module.exports = (io) => {
  // Auth middleware for all socket connections
  io.use(async (socket, next) => {
    try {
      socket.user = await authenticateSocket(socket);
      next();
    } catch (err) {
      // Allow unauthenticated connections for public job room viewing
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.user?.email || 'anonymous'} (${socket.id})`);

    // Admin joins admin room for commission notifications
    if (socket.user?.role === 'ADMIN') {
      socket.join('admin_room');
    }

    // Join a job room (for bids and chat)
    socket.on('join_job', async ({ jobId }) => {
      try {
        if (!jobId) return;

        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job) return socket.emit('error', { message: 'Job not found' });

        const user = socket.user;

        // Determine if user is allowed in room
        let allowed = false;
        if (!user) {
          // Anonymous can watch open jobs (for demo)
          allowed = job.status === 'OPEN';
        } else if (user.role === 'ADMIN') {
          allowed = true;
        } else if (job.customerId === user.id) {
          allowed = true;
        } else if (job.assignedWorkerId === user.id) {
          allowed = true;
        } else if (user.role === 'WORKER') {
          // Workers can join open jobs to receive bid updates
          if (job.status === 'OPEN') {
            const profile = await prisma.workerProfile.findUnique({ where: { userId: user.id } });
            allowed = profile?.verificationStatus === 'APPROVED';
          }
          // Also allow if they have placed a bid
          const bid = await prisma.jobBid.findFirst({
            where: { jobId, workerId: user.id }
          });
          if (bid) allowed = true;
        }

        if (!allowed) {
          return socket.emit('error', { message: 'Not authorized to join this job room' });
        }

        socket.join(`job_${jobId}`);
        socket.emit('joined_job', { jobId, status: job.status });

        // Send current bids to newly joined customer
        if (user && job.customerId === user.id) {
          const bids = await prisma.jobBid.findMany({
            where: { jobId },
            include: {
              worker: {
                select: {
                  id: true, firstName: true, lastName: true, avatarUrl: true,
                  workerProfile: { select: { avgRating: true, reviewsCount: true, verificationStatus: true } }
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          });
          socket.emit('current_bids', bids);
        }

        // Send recent messages if chat is open
        if (user && ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(job.status)) {
          const isParticipant = job.customerId === user.id || job.assignedWorkerId === user.id;
          if (isParticipant) {
            const messages = await prisma.message.findMany({
              where: { jobId },
              include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
              orderBy: { createdAt: 'asc' },
              take: 50
            });
            socket.emit('message_history', messages);
          }
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to join job room' });
      }
    });

    // Leave a job room
    socket.on('leave_job', ({ jobId }) => {
      socket.leave(`job_${jobId}`);
    });

    // Worker sends bid via socket (alternative to REST)
    socket.on('send_bid', async ({ jobId, price, etaMins, message, availableNow }) => {
      try {
        if (!socket.user || socket.user.role !== 'WORKER') {
          return socket.emit('error', { message: 'Must be a verified worker to bid' });
        }

        const profile = await prisma.workerProfile.findUnique({ where: { userId: socket.user.id } });
        if (!profile || profile.verificationStatus !== 'APPROVED') {
          return socket.emit('error', { message: 'Only verified workers can bid' });
        }

        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job || job.status !== 'OPEN') {
          return socket.emit('error', { message: 'Job not open for bidding' });
        }

        const bid = await prisma.jobBid.upsert({
          where: { jobId_workerId: { jobId, workerId: socket.user.id } },
          update: { price: parseFloat(price), etaMins: parseInt(etaMins), message, availableNow: Boolean(availableNow) },
          create: {
            jobId, workerId: socket.user.id,
            price: parseFloat(price), etaMins: parseInt(etaMins), message,
            availableNow: Boolean(availableNow)
          },
          include: {
            worker: {
              select: {
                id: true, firstName: true, lastName: true, avatarUrl: true,
                workerProfile: { select: { avgRating: true, reviewsCount: true, verificationStatus: true, responseMinutes: true, businessName: true } }
              }
            }
          }
        });

        await prisma.workerProfile.update({
          where: { userId: socket.user.id },
          data: { lastActiveAt: new Date() }
        });

        // Broadcast to job room
        io.to(`job_${jobId}`).emit('new_bid', bid);
        socket.emit('bid_sent', bid);
      } catch (err) {
        socket.emit('error', { message: 'Failed to send bid' });
      }
    });

    // Send chat message via socket
    socket.on('send_message', async ({ jobId, text }) => {
      try {
        if (!socket.user) return socket.emit('error', { message: 'Authentication required' });
        if (!text?.trim()) return;

        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job) return socket.emit('error', { message: 'Job not found' });

        const isCustomer = job.customerId === socket.user.id;
        const isAssigned = job.assignedWorkerId === socket.user.id;

        if (!isCustomer && !isAssigned) {
          return socket.emit('error', { message: 'Not authorized to chat in this job' });
        }

        if (!['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(job.status)) {
          return socket.emit('error', { message: 'Chat is only available after job assignment' });
        }

        const message = await prisma.message.create({
          data: { jobId, senderId: socket.user.id, text: text.trim() },
          include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } }
        });

        io.to(`job_${jobId}`).emit('new_message', message);
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', ({ jobId }) => {
      if (!socket.user) return;
      socket.to(`job_${jobId}`).emit('user_typing', {
        userId: socket.user.id,
        name: socket.user.firstName
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.user?.email || 'anonymous'}`);
    });
  });
};
