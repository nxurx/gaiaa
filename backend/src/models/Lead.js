const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      maxlength: [20, 'Phone cannot exceed 20 characters'],
    },
    serviceRequested: {
      type: String,
      required: [true, 'Service requested is required'],
      trim: true,
      maxlength: [200, 'Service cannot exceed 200 characters'],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [140, 'Company cannot exceed 140 characters'],
    },
    website: {
      type: String,
      trim: true,
      maxlength: [300, 'Website cannot exceed 300 characters'],
    },
    industry: {
      type: String,
      trim: true,
      maxlength: [120, 'Industry cannot exceed 120 characters'],
      index: true,
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    rating: {
      type: String,
      trim: true,
      default: '',
    },
    reviews: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    campaign: {
      type: String,
      trim: true,
      maxlength: [120, 'Campaign cannot exceed 120 characters'],
    },
    appointmentAt: {
      type: Date,
      default: null,
    },
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    enrichment: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    message: {
      type: String,
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    source: {
      type: String,
      enum: ['form', 'call', 'google_maps_scraper', 'csv_import', 'crm'],
      required: [true, 'Source is required'],
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'converted', 'lost'],
      default: 'new',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for analytics queries
leadSchema.index({ createdAt: -1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ assignedTo: 1, createdAt: -1 });
leadSchema.index({ phone: 1, website: 1, name: 1 });

module.exports = mongoose.model('Lead', leadSchema);
