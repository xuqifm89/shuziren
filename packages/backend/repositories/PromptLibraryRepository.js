const PromptLibrary = require('../models/PromptLibrary');
const { Op } = require('sequelize');

class PromptLibraryRepository {
  async findAll() {
    return await PromptLibrary.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await PromptLibrary.findByPk(id);
  }

  async findByUserId(userId) {
    return await PromptLibrary.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByCategory(category) {
    return await PromptLibrary.findAll({
      where: { category },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByModelType(modelType) {
    return await PromptLibrary.findAll({
      where: { modelType },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdWithPublic(userId) {
    return await PromptLibrary.findAll({
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
    return await PromptLibrary.findAll({
      where: {
        [Op.or]: [
          { userId, category },
          { isPublic: true, category }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdAndModelType(userId, modelType) {
    return await PromptLibrary.findAll({
      where: {
        [Op.or]: [
          { userId, modelType },
          { isPublic: true, modelType }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findPublic() {
    return await PromptLibrary.findAll({
      where: { isPublic: true },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByTag(tag) {
    return await PromptLibrary.findAll({
      where: {
        tags: {
          [Op.contains]: [tag]
        }
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserIdAndTag(userId, tag) {
    return await PromptLibrary.findAll({
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
    const prompts = await PromptLibrary.findAll({
      where: {
        [Op.or]: [
          { userId },
          { isPublic: true }
        ]
      }
    });
    
    const tagSet = new Set();
    prompts.forEach(prompt => {
      if (prompt.tags && Array.isArray(prompt.tags)) {
        prompt.tags.forEach(tag => tagSet.add(tag));
      }
    });
    
    return Array.from(tagSet);
  }

  async getAllCategories(userId) {
    const categories = await PromptLibrary.findAll({
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

  async getAllModelTypes(userId) {
    const types = await PromptLibrary.findAll({
      where: {
        [Op.or]: [
          { userId },
          { isPublic: true }
        ]
      },
      attributes: ['modelType'],
      group: ['modelType']
    });
    
    return types.map(t => t.modelType);
  }

  async searchByKeyword(keyword) {
    return await PromptLibrary.findAll({
      where: {
        content: { [Op.like]: `%${keyword}%` }
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async create(data) {
    return await PromptLibrary.create(data);
  }

  async update(id, data) {
    const prompt = await PromptLibrary.findByPk(id);
    if (prompt) {
      return await prompt.update(data);
    }
    return null;
  }

  async delete(id) {
    const prompt = await PromptLibrary.findByPk(id);
    if (prompt) {
      return await prompt.destroy();
    }
    return null;
  }

  async incrementUsageCount(id) {
    const prompt = await PromptLibrary.findByPk(id);
    if (prompt) {
      return await prompt.update({
        usageCount: prompt.usageCount + 1
      });
    }
    return null;
  }

  async countByUserId(userId) {
    return await PromptLibrary.count({ where: { userId } });
  }

  async countByCategory(category) {
    return await PromptLibrary.count({ where: category });
  }

  async countByModelType(modelType) {
    return await PromptLibrary.count({ where: modelType });
  }
}

module.exports = new PromptLibraryRepository();
