const WorkLibrary = require('../models/WorkLibrary');
const { Op } = require('sequelize');

class WorkLibraryRepository {
  async findAll() {
    return await WorkLibrary.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await WorkLibrary.findByPk(id);
  }

  async findByUserId(userId) {
    return await WorkLibrary.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByStatus(status) {
    return await WorkLibrary.findAll({
      where: { status },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByCategory(category) {
    return await WorkLibrary.findAll({
      where: { category },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdWithPublic(userId) {
    return await WorkLibrary.findAll({
      where: {
        [Op.or]: [
          { userId },
          { isPublic: true }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdAndStatus(userId, status) {
    return await WorkLibrary.findAll({
      where: {
        [Op.or]: [
          { userId, status },
          { isPublic: true, status }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdAndCategory(userId, category) {
    return await WorkLibrary.findAll({
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
    return await WorkLibrary.findAll({
      where: { isPublic: true },
      order: [['createdAt', 'DESC']]
    });
  }

  async findPublished() {
    return await WorkLibrary.findAll({
      where: { status: 'published', isPublic: true },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByTag(tag) {
    return await WorkLibrary.findAll({
      where: {
        tags: {
          [Op.contains]: [tag]
        }
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdAndTag(userId, tag) {
    return await WorkLibrary.findAll({
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
    const works = await WorkLibrary.findAll({
      where: {
        [Op.or]: [
          { userId },
          { isPublic: true }
        ]
      }
    });
    
    const tagSet = new Set();
    works.forEach(work => {
      if (work.tags && Array.isArray(work.tags)) {
        work.tags.forEach(tag => tagSet.add(tag));
      }
    });
    
    return Array.from(tagSet);
  }

  async getAllCategories(userId) {
    const categories = await WorkLibrary.findAll({
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
    return await WorkLibrary.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${keyword}%` } },
          { description: { [Op.like]: `%${keyword}%` } },
          { content: { [Op.like]: `%${keyword}%` } }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async create(data) {
    return await WorkLibrary.create(data);
  }

  async update(id, data) {
    const work = await WorkLibrary.findByPk(id);
    if (work) {
      return await work.update(data);
    }
    return null;
  }

  async delete(id) {
    const work = await WorkLibrary.findByPk(id);
    if (work) {
      return await work.destroy();
    }
    return null;
  }

  async incrementViewCount(id) {
    const work = await WorkLibrary.findByPk(id);
    if (work) {
      return await work.update({
        viewCount: work.viewCount + 1
      });
    }
    return null;
  }

  async incrementLikeCount(id) {
    const work = await WorkLibrary.findByPk(id);
    if (work) {
      return await work.update({
        likeCount: work.likeCount + 1
      });
    }
    return null;
  }

  async incrementShareCount(id) {
    const work = await WorkLibrary.findByPk(id);
    if (work) {
      return await work.update({
        shareCount: work.shareCount + 1
      });
    }
    return null;
  }

  async publish(id) {
    const work = await WorkLibrary.findByPk(id);
    if (work) {
      return await work.update({
        status: 'published',
        isPublic: true
      });
    }
    return null;
  }

  async countByUserId(userId) {
    return await WorkLibrary.count({ where: { userId } });
  }

  async countByStatus(status) {
    return await WorkLibrary.count({ where: { status } });
  }

  async countByCategory(category) {
    return await WorkLibrary.count({ where: { category } });
  }

  async getStats(userId) {
    const total = await WorkLibrary.count({ where: { userId } });
    const published = await WorkLibrary.count({ where: { userId, status: 'published' } });
    const drafts = await WorkLibrary.count({ where: { userId, status: 'draft' } });
    const processing = await WorkLibrary.count({ where: { userId, status: 'processing' } });
    
    return { total, published, drafts, processing };
  }
}

module.exports = new WorkLibraryRepository();
