const CopyLibrary = require('../models/CopyLibrary');
const { Op } = require('sequelize');

class CopyLibraryRepository {
  async findAll() {
    return await CopyLibrary.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await CopyLibrary.findByPk(id);
  }

  async findByUserId(userId) {
    return await CopyLibrary.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByCategory(category) {
    return await CopyLibrary.findAll({
      where: { category },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdWithPublic(userId) {
    return await CopyLibrary.findAll({
      where: {
        [Op.or]: [
          { userId },
          { isPublic: true }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdAndCategory(userId, category) {
    return await CopyLibrary.findAll({
      where: {
        [Op.or]: [
          { userId, category },
          { isPublic: true, category }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findPublic() {
    return await CopyLibrary.findAll({
      where: { isPublic: true },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByTag(tag) {
    return await CopyLibrary.findAll({
      where: {
        tags: {
          [Op.contains]: [tag]
        }
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdAndTag(userId, tag) {
    return await CopyLibrary.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { userId },
              { isPublic: true }
            ]
          },
          {
            tags: {
              [Op.contains]: [tag]
            }
          }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async getAllTags(userId) {
    const copies = await CopyLibrary.findAll({
      where: {
        [Op.or]: [
          { userId },
          { isPublic: true }
        ]
      }
    });
    
    const tagSet = new Set();
    copies.forEach(copy => {
      if (copy.tags && Array.isArray(copy.tags)) {
        copy.tags.forEach(tag => tagSet.add(tag));
      }
    });
    
    return Array.from(tagSet);
  }

  async getAllCategories(userId) {
    const categories = await CopyLibrary.findAll({
      where: {
        [Op.or]: [
          { userId },
          { isPublic: true }
        ]
      },
      attributes: ['category'],
      group: ['category']
    });
    
    return categories.map(c => c.category);
  }

  async searchByKeyword(keyword) {
    return await CopyLibrary.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${keyword}%` } },
          { content: { [Op.like]: `%${keyword}%` } }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async create(data) {
    return await CopyLibrary.create(data);
  }

  async update(id, data) {
    const copy = await CopyLibrary.findByPk(id);
    if (copy) {
      return await copy.update(data);
    }
    return null;
  }

  async delete(id) {
    const copy = await CopyLibrary.findByPk(id);
    if (copy) {
      return await copy.destroy();
    }
    return null;
  }

  async incrementUsageCount(id) {
    const copy = await CopyLibrary.findByPk(id);
    if (copy) {
      return await copy.update({
        usageCount: copy.usageCount + 1
      });
    }
    return null;
  }

  async countByUserId(userId) {
    return await CopyLibrary.count({ where: { userId } });
  }

  async countByCategory(category) {
    return await CopyLibrary.count({ where: { category } });
  }
}

module.exports = new CopyLibraryRepository();
