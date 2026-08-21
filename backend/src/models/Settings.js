const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // Global settings (admin-controlled, apply to all users by default)
    discord: {
      webhookUrl: {
        type: String,
        default: '',
        trim: true,
      },
      enabled: {
        type: Boolean,
        default: true,
      },
    },
    calendly: {
      url: {
        type: String,
        default: 'https://calendly.com/greenmedialabs/30min',
        trim: true,
      },
      enabled: {
        type: Boolean,
        default: true,
      },
    },
    callQueue: {
      defaultStatus: {
        type: String,
        enum: ['new', 'contacted'],
        default: 'new',
      },
      autoAssign: {
        type: Boolean,
        default: false,
      },
      roundRobinAssignment: {
        type: Boolean,
        default: false,
      },
    },
    leadRouting: {
      rules: {
        type: [{
          condition: {
            type: String,
            enum: ['industry', 'source', 'location', 'custom'],
          },
          value: String,
          assignTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        }],
        default: [],
      },
    },
    notifications: {
      onLeadCreate: {
        type: Boolean,
        default: true,
      },
      onLeadUpdate: {
        type: Boolean,
        default: true,
      },
      onAppointmentBook: {
        type: Boolean,
        default: true,
      },
      onCallComplete: {
        type: Boolean,
        default: true,
      },
      onLeadConvert: {
        type: Boolean,
        default: true,
      },
    },
    automation: {
      autoFollowUp: {
        type: Boolean,
        default: false,
      },
      followUpDelay: {
        type: Number,
        default: 24, // hours
      },
      autoAssignNewLeads: {
        type: Boolean,
        default: false,
      },
    },
    crm: {
      enabled: {
        type: Boolean,
        default: false,
      },
      provider: {
        type: String,
        enum: ['hubspot', 'salesforce', 'pipedrive', 'none'],
        default: 'none',
      },
      apiKey: {
        type: String,
        default: '',
        trim: true,
      },
    },
    // User-specific overrides (optional, per-user customization)
    userOverrides: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one global settings document exists
settingsSchema.statics.getGlobal = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Get effective settings for a user (global + user overrides)
settingsSchema.methods.getForUser = function (userId) {
  const overrides = this.userOverrides.get(userId.toString()) || {};
  return {
    discord: { ...this.discord, ...overrides.discord },
    calendly: { ...this.calendly, ...overrides.calendly },
    callQueue: { ...this.callQueue, ...overrides.callQueue },
    leadRouting: { ...this.leadRouting, ...overrides.leadRouting },
    notifications: { ...this.notifications, ...overrides.notifications },
    automation: { ...this.automation, ...overrides.automation },
    crm: { ...this.crm, ...overrides.crm },
    scope: {
      globalUpdatedAt: this.updatedAt,
      hasUserOverride: Boolean(this.userOverrides.get(userId.toString())),
    },
  };
};

// Set user override
settingsSchema.methods.setUserOverride = function (userId, path, value) {
  const overrides = this.userOverrides.get(userId.toString()) || {};
  const keys = path.split('.');
  let current = overrides;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
  this.userOverrides.set(userId.toString(), overrides);
  return this.save();
};

// Clear user override
settingsSchema.methods.clearUserOverride = function (userId, path) {
  const overrides = this.userOverrides.get(userId.toString());
  if (!overrides) return this;
  
  const keys = path.split('.');
  let current = overrides;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) return this;
    current = current[keys[i]];
  }
  delete current[keys[keys.length - 1]];
  
  // Clean up empty objects
  const cleanEmpty = (obj) => {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        cleanEmpty(obj[key]);
        if (Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }
    });
  };
  cleanEmpty(overrides);
  
  if (Object.keys(overrides).length === 0) {
    this.userOverrides.delete(userId.toString());
  } else {
    this.userOverrides.set(userId.toString(), overrides);
  }
  return this.save();
};

module.exports = mongoose.model('Settings', settingsSchema);
