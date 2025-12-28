
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['CHECKIN', 'FEEDBACK', 'RISK', 'STATUS_CHANGE'],
    required: true,
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  // Optional fields for enriched weekly check-ins
  progressSummary: { type: String },
  blockers: { type: String },
  confidenceLevel: { type: Number, min: 1, max: 5 },
  completionPercent: { type: Number, min: 0, max: 100 },
  // Client feedback fields
  satisfactionRating: { type: Number, min: 1, max: 5 },
  clarityRating: { type: Number, min: 1, max: 5 },
  flagIssue: { type: Boolean },
  comments: { type: String },
  // Risk-specific optional fields
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
  mitigation: { type: String },
  riskStatus: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
  timestamp: { type: Date, default: Date.now },
});

export const Event = mongoose.model('Event', eventSchema);
