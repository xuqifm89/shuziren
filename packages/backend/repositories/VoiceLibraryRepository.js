const VoiceLibrary = require('../models/VoiceLibrary');
const { Op } = require('sequelize');

class VoiceLibraryRepository {
  async findAll() {
    return await VoiceLibrary.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await VoiceLibrary.findByPk(id);
  }

  async findByUserId(userId) {
    return await VoiceLibrary.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findPublic() {
    return await VoiceLibrary.findAll({
      where: { isPublic: true },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdWithPublic(userId) {
    return await VoiceLibrary.findAll({
      where: {
        [Op.or]: [
          { userId },
          { isPublic: true }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByFileName(fileName) {
    return await VoiceLibrary.findOne({ where: { fileName } });
  }

  async create(data) {
    return await VoiceLibrary.create(data);
  }

  async update(id, data) {
    const voice = await VoiceLibrary.findByPk(id);
    if (voice) {
      return await voice.update(data);
    }
    return null;
  }

  async delete(id) {
    const voice = await VoiceLibrary.findByPk(id);
    if (voice) {
      return await voice.destroy();
    }
    return null;
  }

  async incrementUsageCount(id) {
    const voice = await VoiceLibrary.findByPk(id);
    if (voice) {
      return await voice.update({
        usageCount: voice.usageCount + 1
      });
    }
    return null;
  }

  async countByUserId(userId) {
    return await VoiceLibrary.count({ where: { userId } });
  }

  async searchByKeyword(keyword) {
    return await VoiceLibrary.findAll({
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

module.exports = new VoiceLibraryRepository();