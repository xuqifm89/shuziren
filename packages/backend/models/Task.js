const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const Task = sequelize.define('Task', {
  id: {
    type: UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  taskType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending'
  },
  inputData: {
    type: DataTypes.JSON
  },
  outputUrl: {
    type: DataTypes.STRING(500)
  },
  errorMessage: {
    type: DataTypes.TEXT
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  runningHubTaskId: {
    type: DataTypes.STRING(100)
  }
}, {
  timestamps: true,
  tableName: 'tasks'
});

module.exports = Task;
