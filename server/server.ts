import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';  
import { User } from './models/User.js';
import { Project } from './models/Project.js';
import { Event } from './models/Event.js';
import { verifyToken } from './middleware/auth.js';

dotenv.config();
const app = express();

// --- 1. TIMEOUT CONFIGURATION ---
// Increased to 2 minutes to handle Render's slow disk I/O and cold starts
const TIMEOUT = 120000; 
app.use((req, res, next) => {
  req.setTimeout(TIMEOUT);
  res.setTimeout(TIMEOUT);
  next();
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- 2. STORAGE CONFIGURATION ---
const uploadsPath = process.env.UPLOADS_DIR
  ? process.env.UPLOADS_DIR
  : (process.env.RENDER || process.env.NODE_ENV === 'production')
    ? '/tmp/uploads'
    : path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use('/uploads', express.static(uploadsPath));

// --- 3. BODY PARSING & PAYLOAD LIMITS ---
// Important: Increased limit for URL-encoded data (which FormData uses)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- 4. CORS CONFIGURATION ---
const corsOptions = {
  origin: [
    'https://projectpluse.onrender.com',
    'https://project-pluse.onrender.com',
    'http://localhost:3000',
    /\.onrender\.com$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // Added 'Content-Length' and 'Accept' to help with large file uploads
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// --- 5. MULTER CONFIGURATION ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Increased to 10MB just in case
  }
});

// --- 6. DATABASE CONNECTION ---
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI missing');
} else {
  mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    socketTimeoutMS: 60000, // 60s
    connectTimeoutMS: 60000
  })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Connection Error:', err));
}

// --- 7. HELPER FUNCTIONS ---
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

  const clientSatisfaction = latestFeedback?.satisfactionRating ? (latestFeedback.satisfactionRating / 5) * 100 : 70;
  const employeeConfidence = latestCheckin?.confidenceLevel ? (latestCheckin.confidenceLevel / 5) * 100 : 70;

  const now = new Date();
  const totalMs = new Date(project.endDate).getTime() - new Date(project.startDate).getTime();
  const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - new Date(project.startDate).getTime()));
  const expectedProgress = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0;
  const scheduleLag = Math.max(0, expectedProgress - (project.progress || 0));
  const scheduleScore = Math.max(0, 100 - scheduleLag);

  const riskPenalty = (openRisks.length * 10) + (flaggedIssues.length * 5);
  const baseScore = (clientSatisfaction * 0.4) + (employeeConfidence * 0.3) + (scheduleScore * 0.3);
  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore - riskPenalty)));

  project.healthScore = finalScore;
  project.status = finalScore >= 80 ? 'ON_TRACK' : finalScore >= 60 ? 'AT_RISK' : 'CRITICAL';
  await project.save();
}

// --- 8. ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Events POST (Main point of failure)
app.post('/api/projects/:id/events', verifyToken, upload.single('attachment'), async (req: any, res: any) => {
  try {
    const { type } = req.body;
    const projectId = req.params.id;
    const userId = req.user.id;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Build the payload
    const payload: any = {
      projectId,
      userId,
      type,
      title: req.body.title,
      description: req.body.description,
      attachmentUrl: req.file ? `/uploads/${req.file.filename}` : null,
      timestamp: new Date()
    };

    // Capture dynamic fields from your form
    if (type === 'CHECKIN') {
      payload.progressSummary = req.body.progressSummary;
      payload.blockers = req.body.blockers;
      payload.confidenceLevel = Number(req.body.confidenceLevel) || 0;
      payload.completionPercent = Number(req.body.completionPercent) || 0;
    }

    if (type === 'FEEDBACK') {
      payload.satisfactionRating = Number(req.body.satisfactionRating) || 0;
      payload.clarityRating = Number(req.body.clarityRating) || 0;
      payload.flagIssue = req.body.flagIssue === 'true' || req.body.flagIssue === true;
      payload.comments = req.body.comments;
    }

    if (type === 'RISK') {
      payload.severity = req.body.severity;
      payload.mitigation = req.body.mitigation;
      payload.riskStatus = req.body.riskStatus || 'OPEN';
    }

    const event = new Event(payload);
    await event.save();

    // Update project progress if it's a check-in
    if (type === 'CHECKIN' && payload.completionPercent) {
      project.progress = payload.completionPercent;
      await project.save();
    }

    // Trigger health update in background
    setImmediate(() => updateProjectHealth(projectId).catch(console.error));

    res.status(201).json(event);
  } catch (error) {
    console.error('Event Creation Error:', error);
    res.status(500).json({ message: 'Internal Server Error', error });
  }
});

// Rest of your routes (simplified for brevity, keep your existing logic for others)
app.post('/api/auth/login', async (req, res) => { /* ... your existing login logic ... */ });
app.get('/api/projects', verifyToken, async (req: any, res) => { /* ... your existing projects logic ... */ });
app.get('/api/projects/:id/events', verifyToken, async (req: any, res) => {
  const events = await Event.find({ projectId: req.params.id }).populate('userId', 'name').sort({ timestamp: -1 });
  res.json(events);
});

// --- 9. SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});