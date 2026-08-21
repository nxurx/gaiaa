const { collections } = require('../config/json-db');

class LeadModel {
  static async findOne(query) {
    const lead = collections.leads.findOne(query);
    if (!lead) return null;
    
    return new LeadInstance(lead);
  }

  static async create(data) {
    const lead = collections.leads.create({
      ...data,
      status: data.status || 'new',
      priority: data.priority || 'normal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    return this.findOne({ _id: lead._id });
  }

  static async findById(id) {
    return this.findOne({ _id: id });
  }

  static async find(query = {}) {
    const leads = collections.leads.find(query);
    return leads.map(lead => new LeadInstance(lead));
  }

  static async countDocuments(query = {}) {
    return collections.leads.count(query);
  }

  static async deleteMany(query = {}) {
    const leads = collections.leads.find(query);
    leads.forEach(lead => {
      collections.leads.deleteById(lead._id);
    });
    return { deletedCount: leads.length };
  }

  static async find(query) {
    const leads = collections.leads.find(query);
    return leads.map(lead => new LeadInstance(lead));
  }

  static async populate(field) {
    // Simple populate for assignedTo field
    return this;
  }
}

class LeadInstance {
  constructor(data) {
    this._doc = { ...data };
    this._id = data._id;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.serviceRequested = data.serviceRequested;
    this.company = data.company;
    this.website = data.website;
    this.industry = data.industry;
    this.address = data.address;
    this.rating = data.rating;
    this.reviews = data.reviews;
    this.tags = data.tags || [];
    this.priority = data.priority;
    this.campaign = data.campaign;
    this.appointmentAt = data.appointmentAt;
    this.customFields = data.customFields || {};
    this.enrichment = data.enrichment || {};
    this.message = data.message;
    this.source = data.source;
    this.assignedTo = data.assignedTo;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return { ...this._doc };
  }

  async save() {
    const updated = collections.leads.updateById(this._id, this._doc);
    return new LeadInstance(updated);
  }
}

module.exports = LeadModel;
