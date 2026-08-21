const Joi = require('joi');

const loginSchema = {
  body: Joi.object({
    username: Joi.string().min(3).max(30).lowercase().required(),
    password: Joi.string().min(8).required(),
  }),
};

const createUserSchema = {
  body: Joi.object({
    username: Joi.string().min(3).max(30).lowercase().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('admin', 'agent').default('agent'),
  }),
};

const createLeadSchema = {
  body: Joi.object({
    name: Joi.string().max(100).required(),
    email: Joi.string().email().lowercase().required(),
    phone: Joi.string().max(20).required(),
    serviceRequested: Joi.string().max(200).required(),
    company: Joi.string().max(140).optional().allow(''),
    website: Joi.string().max(300).optional().allow(''),
    industry: Joi.string().max(120).optional().allow(''),
    address: Joi.string().max(500).optional().allow(''),
    rating: Joi.string().optional().allow(''),
    reviews: Joi.string().optional().allow(''),
    tags: Joi.array().items(Joi.string()).optional(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    campaign: Joi.string().max(120).optional().allow(''),
    appointmentAt: Joi.date().optional().allow(null),
    customFields: Joi.object().unknown(true).optional(),
    enrichment: Joi.object().unknown(true).optional(),
    message: Joi.string().max(2000).optional().allow(''),
    source: Joi.string().valid('form', 'call', 'google_maps_scraper', 'csv_import', 'crm').required(),
  }),
};

const assignLeadSchema = {
  body: Joi.object({
    assignedTo: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({ 'string.pattern.base': 'assignedTo must be a valid MongoDB ObjectId' }),
  }),
};

const updateLeadStatusSchema = {
  body: Joi.object({
    status: Joi.string().valid('new', 'contacted', 'converted', 'lost').required(),
  }),
};

const createCallSchema = {
  body: Joi.object({
    lead: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .allow(null),
    duration: Joi.number().integer().min(0).required(),
    status: Joi.string().valid('answered', 'missed', 'no_answer').required(),
    notes: Joi.string().max(1000).optional().allow(''),
  }),
};

const listQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    from: Joi.string().isoDate().optional(),
    to: Joi.string().isoDate().optional(),
    agent: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional(),
    status: Joi.string().valid('new', 'contacted', 'converted', 'lost').optional(),
    source: Joi.string().valid('form', 'call', 'google_maps_scraper', 'csv_import', 'crm').optional(),
  }),
};

const uploadCsvListSchema = {
  body: Joi.object({
    name: Joi.string().max(120).optional().allow(''),
    rows: Joi.array()
      .items(Joi.object().unknown(true))
      .min(1)
      .max(10000)
      .required(),
  }),
};

module.exports = {
  loginSchema,
  createUserSchema,
  createLeadSchema,
  assignLeadSchema,
  updateLeadStatusSchema,
  createCallSchema,
  listQuerySchema,
  uploadCsvListSchema,
};
