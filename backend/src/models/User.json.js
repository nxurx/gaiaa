const bcrypt = require('bcryptjs');
const { collections } = require('../config/json-db');

class UserModel {
  static async findOne(query) {
    const user = collections.users.findOne(query);
    if (!user) return null;
    
    return new UserInstance(user);
  }

  static async create(data) {
    const { password, ...rest } = data;
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = collections.users.create({
      ...rest,
      password: hashedPassword,
      isActive: true,
      role: data.role || 'agent',
    });
    
    return this.findOne({ _id: user._id });
  }

  static async findById(id) {
    return this.findOne({ _id: id });
  }

  static async find(query = {}) {
    const users = collections.users.find(query);
    return users.map(user => new UserInstance(user));
  }
}

class UserInstance {
  constructor(data) {
    this._doc = { ...data };
    this._id = data._id;
    this.username = data.username;
    this.password = data.password;
    this.role = data.role;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    const obj = { ...this._doc };
    delete obj.password;
    return obj;
  }

  select(fields) {
    if (fields.includes('+password')) {
      return this;
    }
    return this.toJSON();
  }
}

module.exports = UserModel;
