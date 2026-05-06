const DubbingLibrary = require('../models/DubbingLibrary');
const { Op } = require('sequelize');

class DubbingLibraryRepository {
  async findAll() {
    return await DubbingLibrary.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await DubbingLibrary.findByPk(id);
  }

  async findByUserId(userId) {
    return await DubbingLibrary.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findPublic() {
    return await DubbingLibrary.findAll({
      where: { isPublic: true },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdWithPublic(userId) {
    return await DubbingLibrary.findAll({
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
    return await DubbingLibrary.findOne({ where: { fileName } });
  }

  async create(data) {
    return await DubbingLibrary.create(data);
  }

  async update(id, data) {
    const dubbing = await DubbingLibrary.findByPk(id);
    if (dubbing) {
      return await dubbing.update(data);
    }
    return null;
  }

  async delete(id) {
    const dubbing = await DubbingLibrary.findByPk(id);
    if (dubbing) {
      return await dubbing.destroy();
    }
    return null;
  }

  async incrementUsageCount(id) {
    const dubbing = await DubbingLibrary.findByPk(id);
    if (dubbing) {
      return await dubbing.update({
        usageCount: dubbing.usageCount + 1
      });
    }
    return null;
  }

  async countByUserId(userId) {
    return await DubbingLibrary.count({ where: { userId } });
  }

  async searchByKeyword(keyword) {
    return await DubbingLibrary.findAll({
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

module.exports = new DubbingLibraryRepository();
