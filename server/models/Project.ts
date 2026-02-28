
import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  progress: { type: Number, default: 0 },
  healthScore: { type: Number, default: 100 },
  status: { 
    type: String, 
    enum: ['ON_TRACK', 'AT_RISK', 'CRITICAL', 'COMPLETED'], 
    default: 'ON_TRACK' 
  }
}, { timestamps: true });

export const Project = mongoose.model('Project', projectSchema);