const Voice = require('../models/Voice');
const { Op } = require('sequelize');

class VoiceRepository {
  async findAll() {
    return await Voice.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await Voice.findByPk(id);
  }

  async findByVoiceType(voiceType) {
    return await Voice.findAll({
      where: { voiceType },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUserOrPublic(userId) {
    const where = {
      [Op.or]: [
        { isPublic: true },
        { userId: userId }
      ]
    };
    return await Voice.findAll({
      where,
      order: [
        ['isPublic', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });
  }

  async create(data) {
    return await Voice.create(data);
  }

  async update(id, data) {
    const voice = await Voice.findByPk(id);
    if (voice) {
      return await voice.update(data);
    }
    return null;
  }

  async delete(id) {
    const voice = await Voice.findByPk(id);
    if (voice) {
      return await voice.destroy();
    }
    return null;
  }

  async count() {
    return await Voice.count();
  }
}

module.exports = new VoiceRepository();