const Project = require('../models/Project');

class ProjectRepository {
  async findAll() {
    return await Project.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await Project.findByPk(id);
  }

  async findPublic() {
    return await Project.findAll({
      where: { isPublic: true },
      order: [['createdAt', 'DESC']]
    });
  }

  async create(data) {
    return await Project.create(data);
  }

  async update(id, data) {
    const project = await Project.findByPk(id);
    if (project) {
      return await project.update(data);
    }
    return null;
  }

  async delete(id) {
    const project = await Project.findByPk(id);
    if (project) {
      return await project.destroy();
    }
    return null;
  }

  async count() {
    return await Project.count();
  }
}

module.exports = new ProjectRepository();