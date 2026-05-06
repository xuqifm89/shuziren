const Task = require('../models/Task');

class TaskRepository {
  async findAll() {
    return await Task.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await Task.findByPk(id);
  }

  async findByStatus(status) {
    return await Task.findAll({
      where: { status },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByTaskType(taskType) {
    return await Task.findAll({
      where: { taskType },
      order: [['createdAt', 'DESC']]
    });
  }

  async create(data) {
    return await Task.create(data);
  }

  async update(id, data) {
    const task = await Task.findByPk(id);
    if (task) {
      return await task.update(data);
    }
    return null;
  }

  async delete(id) {
    const task = await Task.findByPk(id);
    if (task) {
      return await task.destroy();
    }
    return null;
  }

  async count() {
    return await Task.count();
  }

  async countByStatus(status) {
    return await Task.count({ where: { status } });
  }
}

module.exports = new TaskRepository();