import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './models/User.js';
import { Project } from './models/Project.js';
import { Event } from './models/Event.js';
import { verifyToken } from './middleware/auth.js';

dotenv.config();
const app = express();
app.use(express.json() as any);
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(' ERROR: MONGODB_URI is not defined in server/.env');
} else {
  mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 5,
    socketTimeoutMS: 45000,
  })
    .then(() => console.log('Successfully connected to MongoDB Atlas (ProjectPluse Cluster)'))
    .catch(err => console.error('MongoDB Connection Error:', err));
}

/** 
 * HELPER: Calculate Health (Server Side)
 * Uses latest feedback and check-ins to determine Project Status
 */
async function updateProjectHealth(projectId: string) {
  const project = await Project.findById(projectId);
  if (!project) return;

  const events = await Event.find({ projectId });
  const latestCheckin = events
    .filter(e => e.type === 'CHECKIN')
    .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
  const latestFeedback = events
    .filter(e => e.type === 'FEEDBACK')
    .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
  const openRisks = events.filter(e => e.type === 'RISK' && e.riskStatus !== 'RESOLVED');
  const flaggedIssues = events.filter(e => e.type === 'FEEDBACK' && e.flagIssue);

  // 1) Client satisfaction (0-100)
  const clientSatisfaction = latestFeedback?.satisfactionRating ? (latestFeedback.satisfactionRating / 5) * 100 : 70;

  // 2) Employee confidence (0-100)
  const employeeConfidence = latestCheckin?.confidenceLevel ? (latestCheckin.confidenceLevel / 5) * 100 : 70;

  // 3) Schedule performance: expected progress vs actual
  const now = new Date();
  const totalMs = new Date(project.endDate).getTime() - new Date(project.startDate).getTime();
  const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - new Date(project.startDate).getTime()));
  const expectedProgress = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0;
  const scheduleLag = Math.max(0, expectedProgress - (project.progress || 0)); // how far behind
  const scheduleScore = Math.max(0, 100 - scheduleLag); // penalize lag

  // 4) Risk/flag penalty
  const riskPenalty = (openRisks.length * 10) + (flaggedIssues.length * 5);

  // Weighted combination
  const baseScore = (clientSatisfaction * 0.4) + (employeeConfidence * 0.3) + (scheduleScore * 0.3);
  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore - riskPenalty)));

  project.healthScore = finalScore;
  project.status = finalScore >= 80 ? 'ON_TRACK' : finalScore >= 60 ? 'AT_RISK' : 'CRITICAL';
  await project.save();
}

/**
 * ROUTES
 */

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: 'User created' });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Failed to register' }); 
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email, password });
    
    const user = await User.findOne({ email });
    console.log('User found:', user ? { email: user.email, hasPassword: !!user.password } : 'No user found');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials - User not found' });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', passwordMatch);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials - Wrong password' });
    }
    
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/users', verifyToken, async (req: any, res) => {
  const users = await User.find({}, '-password');
  res.json(users);
});

app.delete('/api/users/:id', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

app.get('/api/projects', verifyToken, async (req: any, res) => {
  let query = {};
  if (req.user.role === 'EMPLOYEE') query = { employeeIds: req.user.id };
  else if (req.user.role === 'CLIENT') query = { clientId: req.user.id };
  const projects = await Project.find(query).populate('clientId', 'name');
  res.json(projects);
});

app.get('/api/projects/:id', verifyToken, async (req: any, res) => {
  const project = await Project.findById(req.params.id).populate('clientId', 'name').populate('employeeIds', 'name email');
  if (!project) return res.status(404).json({ message: 'Project not found' });

  // Backfill progress from latest check-in if stored value is missing or zero
  if (!project.progress || Number.isNaN(project.progress)) {
    const latestCheckin = await Event.findOne({ projectId: project._id, type: 'CHECKIN', completionPercent: { $exists: true } })
      .sort({ timestamp: -1 });
    if (latestCheckin && typeof latestCheckin.completionPercent === 'number' && !Number.isNaN(latestCheckin.completionPercent)) {
      project.progress = latestCheckin.completionPercent;
      await project.save();
    }
  }

  res.json(project);
});

app.post('/api/projects', verifyToken, async (req: any, res) => {
  const project = new Project(req.body);
  await project.save();
  // Log project initialization to activity feed
  try {
    await new Event({
      projectId: project._id,
      userId: req.user.id,
      type: 'STATUS_CHANGE',
      title: 'Project Initialized',
      description: 'Project created and team assigned.',
    }).save();
  } catch (e) {
    console.error('Failed to log project initialization event:', e);
  }
  res.status(201).json(project);
});

// Update a project (admin only)
app.put('/api/projects/:id', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const updatable = ['name', 'description', 'clientId', 'employeeIds', 'startDate', 'endDate', 'progress', 'status'];
  updatable.forEach((field) => {
    if (req.body[field] !== undefined) {
      (project as any)[field] = req.body[field];
    }
  });

  await project.save();
  res.json(project);
});

app.delete('/api/projects/:id', verifyToken, async (req: any, res) => {
  await Project.findByIdAndDelete(req.params.id);
  await Event.deleteMany({ projectId: req.params.id });
  res.json({ message: 'Project deleted' });
});

app.get('/api/projects/:id/events', verifyToken, async (req: any, res) => {
  const events = await Event.find({ projectId: req.params.id }).populate('userId', 'name').sort({ timestamp: -1 });
  res.json(events);
});

app.post('/api/projects/:id/events', verifyToken, async (req: any, res) => {
  const timestamp = new Date().toISOString();
  console.error(`\n\n==== [${timestamp}] EVENT_CREATE STARTED ====`);
  console.error('[EVENT_CREATE] Entire req.body:', JSON.stringify(req.body, null, 2));
  console.error(`[EVENT_CREATE] Type field: ${req.body.type}`);
  
  const { type } = req.body;
  const projectId = req.params.id;
  const userId = req.user.id;
  const role = req.user.role;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isAssignedEmployee = project.employeeIds.map((id: any) => id.toString()).includes(userId);
  const isClient = project.clientId.toString() === userId;

  // Role-based permissions
  if (type === 'FEEDBACK') {
    if (!isClient) return res.status(403).json({ message: 'Only the assigned client can submit feedback.' });
  } else if (type === 'CHECKIN' || type === 'RISK') {
    if (!isAssignedEmployee) return res.status(403).json({ message: 'Only assigned employees can submit check-ins or risks.' });
  } else if (type === 'STATUS_CHANGE') {
    if (role !== 'ADMIN') return res.status(403).json({ message: 'Only admins can post status changes.' });
  }

  // Enforce one CHECKIN per week per user per project
  if (type === 'CHECKIN') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentCheckin = await Event.findOne({
      projectId,
      userId,
      type: 'CHECKIN',
      timestamp: { $gte: oneWeekAgo },
    });
    if (recentCheckin) {
      return res.status(409).json({ message: 'Weekly check-in already submitted for this project.' });
    }
  }

  // Build enriched event payload
  const payload: any = {
    projectId,
    userId,
    type,
    title: req.body.title,
    description: req.body.description,
  };

  console.log('[BACKEND] Raw req.body received:', req.body);
  console.log('[BACKEND] Type:', type);

  if (type === 'CHECKIN') {
    const incomingAttachment =
      typeof req.body.attachmentLink === 'string'
        ? req.body.attachmentLink
        : typeof req.body.attachmentUrl === 'string'
          ? req.body.attachmentUrl
          : typeof req.body.attachment === 'string'
            ? req.body.attachment
            : '';
    const normalizedAttachment = incomingAttachment.trim();
    
    console.error(`\n[CHECKIN] Processing check-in - Received attachment:`, {
      raw: req.body.attachmentLink || req.body.attachmentUrl || req.body.attachment,
      normalized: normalizedAttachment,
      isEmpty: !normalizedAttachment
    });
    
    payload.progressSummary = req.body.progressSummary;
    payload.blockers = req.body.blockers;
    payload.confidenceLevel = Number(req.body.confidenceLevel);
    payload.completionPercent = Number(req.body.completionPercent);
    
    if (normalizedAttachment) {
      payload.attachmentLink = normalizedAttachment;
      payload.attachmentUrl = normalizedAttachment;
      console.error(`[CHECKIN] ✓ Attachment set: ${normalizedAttachment}`);
    } else {
      console.error(`[CHECKIN] ✗ NO attachment found in request`);
    }
    
    console.log('[CHECKIN] Payload being saved:', {
      attachmentLink: payload.attachmentLink,
      attachmentUrl: payload.attachmentUrl
    });
  }

  if (type === 'FEEDBACK') {
    payload.satisfactionRating = Number(req.body.satisfactionRating);
    payload.clarityRating = Number(req.body.clarityRating);
    payload.flagIssue = Boolean(req.body.flagIssue);
    payload.comments = req.body.comments;
  }

  if (type === 'RISK') {
    payload.severity = req.body.severity;
    payload.mitigation = req.body.mitigation;
    payload.riskStatus = req.body.riskStatus || 'OPEN';
  }

  const event = new Event(payload);
  console.log('[BACKEND] Event being saved to DB:', {
    type: event.type,
    attachmentLink: event.attachmentLink,
    attachmentUrl: event.attachmentUrl,
    fullDocument: event.toObject?.() || event
  });
  
  await event.save();
  
  console.log('[BACKEND] Event saved successfully:', {
    id: event._id,
    attachmentLink: event.attachmentLink,
    attachmentUrl: event.attachmentUrl
  });

  // Auto-create a risk when client flags an issue in feedback so employees can resolve it
  if (type === 'FEEDBACK' && payload.flagIssue) {
    const riskPayload: any = {
      projectId,
      userId,
      type: 'RISK',
      title: payload.title || 'Flagged Issue',
      description: payload.description || 'Client flagged an issue requiring attention.',
      severity: 'MEDIUM',
      mitigation: 'Pending owner review',
      riskStatus: 'OPEN',
    };
    try {
      await new Event(riskPayload).save();
    } catch (e) {
      console.error('Failed to create flagged risk from feedback:', e);
    }
  }

  // Keep project progress in sync with the latest check-in completion
  if (type === 'CHECKIN' && !Number.isNaN(payload.completionPercent)) {
    project.progress = payload.completionPercent;
    await project.save();
  }

  await updateProjectHealth(projectId);
  
  const savedEvent = event.toObject?.() || event;
  console.error(`\n==== [RESPONSE] Sending event back ====`);
  console.error('[RESPONSE] Event ID:', savedEvent._id);
  console.error('[RESPONSE] Event Type:', savedEvent.type);
  console.error('[RESPONSE] attachmentLink:', savedEvent.attachmentLink);
  console.error('[RESPONSE] attachmentUrl:', savedEvent.attachmentUrl);
  console.error(`==== END RESPONSE ====\n`);
  
  res.status(201).json(savedEvent);
});

// Resolve a risk
app.patch('/api/projects/:projectId/events/:eventId/resolve', verifyToken, async (req: any, res) => {
  const { projectId, eventId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isAssignedEmployee = project.employeeIds.map((id: any) => id.toString()).includes(userId);
  if (!(isAssignedEmployee || role === 'ADMIN')) {
    return res.status(403).json({ message: 'Only assigned employees or admins can resolve risks.' });
  }

  const event = await Event.findById(eventId);
  if (!event || event.projectId.toString() !== projectId) {
    return res.status(404).json({ message: 'Risk not found for this project.' });
  }

  if (event.type !== 'RISK') {
    return res.status(400).json({ message: 'Only risk events can be resolved.' });
  }

  event.riskStatus = 'RESOLVED';
  if (typeof req.body?.mitigation === 'string') {
    event.mitigation = req.body.mitigation;
  }
  if (typeof req.body?.description === 'string') {
    event.description = req.body.description;
  }

  await event.save();

  // Create activity log entry for resolution
  try {
    await new Event({
      projectId,
      userId,
      type: 'STATUS_CHANGE',
      title: `Risk Resolved: ${event.title}`,
      description: `Risk "${event.title}" has been marked as resolved. ${req.body?.mitigation ? 'Resolution: ' + req.body.mitigation : ''}`,
    }).save();
  } catch (e) {
    console.error('Failed to log risk resolution:', e);
  }

  await updateProjectHealth(projectId);
  res.json(event);
});

app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`ProjectPulse Backend running on port ${PORT}`);
  console.log(`API Base: http://localhost:${PORT}/api`);
});

// Graceful shutdown & error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing gracefully...');
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
});