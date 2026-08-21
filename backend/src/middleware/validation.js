const Joi = require('joi');
const ApiError = require('../utils/ApiError');

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Joi schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      throw new ApiError(400, 'Validation failed', errors);
    }

    req.body = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // User validation
  createUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'agent').default('agent'),
  }),

  // Lead validation
  createLead: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().allow(''),
    phone: Joi.string().pattern(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/).allow(''),
    serviceRequested: Joi.string().max(200).allow(''),
    message: Joi.string().max(1000).allow(''),
    source: Joi.string().max(50).default('form'),
  }),

  updateLead: Joi.object({
    status: Joi.string().valid('new', 'contacted', 'converted', 'lost'),
    assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    notes: Joi.string().max(2000).allow(''),
  }),

  // Call validation
  createCall: Joi.object({
    leadId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    duration: Joi.number().min(0).max(3600).default(0),
    status: Joi.string().valid('answered', 'missed', 'no_answer').required(),
    notes: Joi.string().max(2000).allow(''),
  }),

  // Settings validation
  updateSettings: Joi.object({
    discord: Joi.object({
      webhookUrl: Joi.string().uri().allow(''),
      enabled: Joi.boolean(),
    }),
    calendly: Joi.object({
      url: Joi.string().uri().allow(''),
      enabled: Joi.boolean(),
    }),
    callQueue: Joi.object({
      defaultStatus: Joi.string().valid('new', 'contacted'),
      autoAssign: Joi.boolean(),
      roundRobinAssignment: Joi.boolean(),
    }),
    notifications: Joi.object({
      onLeadCreate: Joi.boolean(),
      onLeadUpdate: Joi.boolean(),
      onAppointmentBook: Joi.boolean(),
      onCallComplete: Joi.boolean(),
      onLeadConvert: Joi.boolean(),
    }),
  }),

  // Scraper validation
  startScraping: Joi.object({
    keyword: Joi.string().max(100).allow(''),
    industry: Joi.string().max(100).allow(''),
    city: Joi.string().max(100).allow(''),
    state: Joi.string().max(50).allow(''),
    country: Joi.string().max(50).default('USA'),
    maxResults: Joi.number().min(1).max(200).default(50),
  }),
};

module.exports = {
  validate,
  schemas,
};
