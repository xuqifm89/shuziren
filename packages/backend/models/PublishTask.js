const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const PublishTask = sequelize.define('PublishTask', {
  id: {
    type: UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  userId: {
    type: UUID,
    allowNull: false,
    defaultValue: '00000000-0000-0000-0000-000000000000'
  },
  accountId: {
    type: UUID,
    allowNull: false
  },
  platform: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  videoPath: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  thumbnailPath: {
    type: DataTypes.STRING(500)
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  publishType: {
    type: DataTypes.STRING(20),
    defaultValue: 'immediate'
  },
  scheduleTime: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending'
  },
  result: {
    type: DataTypes.TEXT
  },
  processOutput: {
    type: DataTypes.TEXT
  }
}, {
  timestamps: true,
  tableName: 'publish_tasks'
});

module.exports = PublishTask;
