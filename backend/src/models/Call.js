const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Agent is required'],
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    duration: {
      type: Number, // in seconds
      required: [true, 'Duration is required'],
      min: [0, 'Duration cannot be negative'],
    },
    status: {
      type: String,
      enum: ['answered', 'missed', 'no_answer'],
      required: [true, 'Call status is required'],
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for analytics
callSchema.index({ agent: 1, createdAt: -1 });
callSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Call', callSchema);
