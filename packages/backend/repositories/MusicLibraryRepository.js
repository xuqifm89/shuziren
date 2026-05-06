const MusicLibrary = require('../models/MusicLibrary');
const { Op } = require('sequelize');

class MusicLibraryRepository {
  async findAll() {
    return await MusicLibrary.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await MusicLibrary.findByPk(id);
  }

  async findByUserId(userId) {
    return await MusicLibrary.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findPublic() {
    return await MusicLibrary.findAll({
      where: { isPublic: true },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdWithPublic(userId) {
    return await MusicLibrary.findAll({
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
    return await MusicLibrary.findOne({ where: { fileName } });
  }

  async create(data) {
    return await MusicLibrary.create(data);
  }

  async update(id, data) {
    const music = await MusicLibrary.findByPk(id);
    if (music) {
      return await music.update(data);
    }
    return null;
  }

  async delete(id) {
    const music = await MusicLibrary.findByPk(id);
    if (music) {
      return await music.destroy();
    }
    return null;
  }

  async incrementUsageCount(id) {
    const music = await MusicLibrary.findByPk(id);
    if (music) {
      return await music.update({
        usageCount: music.usageCount + 1
      });
    }
    return null;
  }

  async countByUserId(userId) {
    return await MusicLibrary.count({ where: { userId } });
  }

  async searchByKeyword(keyword) {
    return await MusicLibrary.findAll({
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

module.exports = new MusicLibraryRepository();
