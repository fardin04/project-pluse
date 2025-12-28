
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Store as hashed bcrypt string
  role: { 
    type: String, 
    enum: ['ADMIN', 'EMPLOYEE', 'CLIENT'], 
    default: 'EMPLOYEE' 
  }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
