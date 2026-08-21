const mongoose = require('mongoose');

/**
 * Stores a CSV list of businesses assigned to a specific agent.
 * Each row is stored as a plain object. Admins upload these;
 * only the assigned agent (or admin) can read them.
 */
const csvListSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'List name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Agent is required'],
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rows: {
      type: [mongoose.Schema.Types.Mixed], // array of plain objects parsed from CSV
      default: [],
    },
    rowCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

csvListSchema.index({ assignedTo: 1, createdAt: -1 });

module.exports = mongoose.model('CsvList', csvListSchema);
