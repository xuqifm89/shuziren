const PublishAccount = require('../models/PublishAccount');
const PublishTask = require('../models/PublishTask');
const { Op } = require('sequelize');

class PublishRepository {
  async findAllAccounts(userId) {
    return await PublishAccount.findAll({
      where: { userId, status: 'active' },
      order: [['platform', 'ASC'], ['createdAt', 'DESC']]
    });
  }

  async findAccountById(id) {
    return await PublishAccount.findByPk(id);
  }

  async findAccountsByPlatform(userId, platform) {
    return await PublishAccount.findAll({
      where: { userId, platform, status: 'active' },
      order: [['createdAt', 'DESC']]
    });
  }

  async createAccount(data) {
    return await PublishAccount.create(data);
  }

  async updateAccount(id, data) {
    const account = await PublishAccount.findByPk(id);
    if (account) {
      return await account.update(data);
    }
    return null;
  }

  async deleteAccount(id) {
    const account = await PublishAccount.findByPk(id);
    if (account) {
      return await account.update({ status: 'deleted' });
    }
    return null;
  }

  async findAllTasks(userId) {
    return await PublishTask.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findTaskById(id) {
    return await PublishTask.findByPk(id);
  }

  async findTasksByStatus(userId, status) {
    return await PublishTask.findAll({
      where: { userId, status },
      order: [['createdAt', 'DESC']]
    });
  }

  async createTask(data) {
    return await PublishTask.create(data);
  }

  async updateTask(id, data) {
    const task = await PublishTask.findByPk(id);
    if (task) {
      return await task.update(data);
    }
    return null;
  }

  async getTaskStats(userId) {
    const total = await PublishTask.count({ where: { userId } });
    const pending = await PublishTask.count({ where: { userId, status: 'pending' } });
    const running = await PublishTask.count({ where: { userId, status: 'running' } });
    const success = await PublishTask.count({ where: { userId, status: 'success' } });
    const failed = await PublishTask.count({ where: { userId, status: 'failed' } });
    return { total, pending, running, success, failed };
  }
}

module.exports = new PublishRepository();
