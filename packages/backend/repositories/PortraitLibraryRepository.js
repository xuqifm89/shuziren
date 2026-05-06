const PortraitLibrary = require('../models/PortraitLibrary');
const { Op } = require('sequelize');

class PortraitLibraryRepository {
  async findAll() {
    return await PortraitLibrary.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await PortraitLibrary.findByPk(id);
  }

  async findByUserId(userId) {
    return await PortraitLibrary.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByType(type) {
    return await PortraitLibrary.findAll({
      where: { type },
      order: [['createdAt', 'DESC']]
    });
  }

  async findPublic() {
    return await PortraitLibrary.findAll({
      where: { isPublic: true },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdWithPublic(userId) {
    return await PortraitLibrary.findAll({
      where: {
        [Op.or]: [
          { userId },
          { isPublic: true }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdAndType(userId, type) {
    return await PortraitLibrary.findAll({
      where: {
        [Op.or]: [
          { userId, type },
          { isPublic: true, type }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByFileName(fileName) {
    return await PortraitLibrary.findOne({ where: { fileName } });
  }

  async create(data) {
    return await PortraitLibrary.create(data);
  }

  async update(id, data) {
    const portrait = await PortraitLibrary.findByPk(id);
    if (portrait) {
      return await portrait.update(data);
    }
    return null;
  }

  async delete(id) {
    const portrait = await PortraitLibrary.findByPk(id);
    if (portrait) {
      return await portrait.destroy();
    }
    return null;
  }

  async incrementUsageCount(id) {
    const portrait = await PortraitLibrary.findByPk(id);
    if (portrait) {
      return await portrait.update({
        usageCount: portrait.usageCount + 1
      });
    }
    return null;
  }

  async countByUserId(userId) {
    return await PortraitLibrary.count({ where: { userId } });
  }

  async countByType(type) {
    return await PortraitLibrary.count({ where: { type } });
  }

  async searchByKeyword(keyword) {
    return await PortraitLibrary.findAll({
      where: {
        [Op.or]: [
          { fileName: { [Op.like]: `%${keyword}%` } },
          { description: { [Op.like]: `%${keyword}%` } }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }
}

module.exports = new PortraitLibraryRepository();