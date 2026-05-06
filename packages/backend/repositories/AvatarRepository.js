const Avatar = require('../models/Avatar');

class AvatarRepository {
  async findAll() {
    return await Avatar.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await Avatar.findByPk(id);
  }

  async findByType(type) {
    return await Avatar.findAll({
      where: { type },
      order: [['createdAt', 'DESC']]
    });
  }

  async create(data) {
    return await Avatar.create(data);
  }

  async update(id, data) {
    const avatar = await Avatar.findByPk(id);
    if (avatar) {
      return await avatar.update(data);
    }
    return null;
  }

  async delete(id) {
    const avatar = await Avatar.findByPk(id);
    if (avatar) {
      return await avatar.destroy();
    }
    return null;
  }

  async count() {
    return await Avatar.count();
  }
}

module.exports = new AvatarRepository();