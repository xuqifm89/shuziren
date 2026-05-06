const User = require('../models/User');
const bcrypt = require('bcryptjs');

class UserRepository {
  async findAll() {
    return await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    return user;
  }

  async findByUsername(username) {
    return await User.findOne({ where: { username } });
  }

  async findByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async findByPhone(phone) {
    return await User.findOne({ where: { phone } });
  }

  async findByWechatOpenId(openId) {
    return await User.findOne({ where: { wechatOpenId: openId } });
  }

  async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    return await User.create({
      ...userData,
      password: hashedPassword
    });
  }

  async update(id, userData) {
    const user = await User.findByPk(id);
    if (user) {
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      return await user.update(userData);
    }
    return null;
  }

  async delete(id) {
    const user = await User.findByPk(id);
    if (user) {
      return await user.destroy();
    }
    return null;
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async updateLightParticles(id, amount) {
    const user = await User.findByPk(id);
    if (user) {
      return await user.update({
        lightParticles: user.lightParticles + amount
      });
    }
    return null;
  }

  async updateLastLogin(id) {
    const user = await User.findByPk(id);
    if (user) {
      return await user.update({
        lastLoginAt: new Date()
      });
    }
    return null;
  }

  async count() {
    return await User.count();
  }
}

module.exports = new UserRepository();