const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const Project = sequelize.define('Project', {
  id: {
    type: UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  videoUrl: {
    type: DataTypes.STRING(500)
  },
  thumbnailUrl: {
    type: DataTypes.STRING(500)
  },
  duration: {
    type: DataTypes.INTEGER
  },
  metadata: {
    type: DataTypes.JSON
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  tableName: 'projects'
});

module.exports = Project;
