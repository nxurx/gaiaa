const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// For Vercel, use /tmp directory which is writable
const DATA_DIR = process.env.VERCEL 
  ? '/tmp/data' 
  : path.resolve(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class JsonDB {
  constructor(collectionName) {
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(content);
      }
      return [];
    } catch (error) {
      logger.error(`Error loading ${this.filePath}: ${error.message}`);
      return [];
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
      return true;
    } catch (error) {
      logger.error(`Error saving ${this.filePath}: ${error.message}`);
      return false;
    }
  }

  find(query = {}) {
    return this.data.filter(item => {
      return Object.keys(query).every(key => {
        if (query[key] === undefined) return true;
        if (typeof query[key] === 'object' && query[key].$regex) {
          return new RegExp(query[key].$regex, query[key].$options || 'i').test(item[key]);
        }
        return item[key] === query[key];
      });
    });
  }

  findOne(query) {
    return this.find(query)[0] || null;
  }

  findById(id) {
    return this.data.find(item => item._id === id) || null;
  }

  create(item) {
    const newItem = {
      _id: this.generateId(),
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.push(newItem);
    this.saveData();
    return newItem;
  }

  updateById(id, updates) {
    const index = this.data.findIndex(item => item._id === id);
    if (index === -1) return null;
    
    this.data[index] = {
      ...this.data[index],
      ...updates,
      _id: id, // Preserve ID
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.data[index];
  }

  deleteById(id) {
    const index = this.data.findIndex(item => item._id === id);
    if (index === -1) return false;
    
    this.data.splice(index, 1);
    this.saveData();
    return true;
  }

  count(query = {}) {
    return this.find(query).length;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

const collections = {
  users: new JsonDB('users'),
  leads: new JsonDB('leads'),
  calls: new JsonDB('calls'),
  settings: new JsonDB('settings'),
};

const connectDB = async () => {
  if (process.env.VERCEL) {
    logger.warn('⚠️  Vercel detected: JSON database uses /tmp (data will reset on redeploy)');
    logger.warn('⚠️  For production, use MongoDB Atlas or Vercel Postgres instead');
  } else {
    logger.info('JSON database initialized (file-based storage in backend/data/)');
  }
  return collections;
};

module.exports = { connectDB, collections, JsonDB };
