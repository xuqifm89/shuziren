const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const PortraitLibrary = sequelize.define('PortraitLibrary', {
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
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fileUrl: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  fileSize: {
    type: DataTypes.BIGINT
  },
  duration: {
    type: DataTypes.FLOAT
  },
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'image'
  },
  width: {
    type: DataTypes.INTEGER
  },
  height: {
    type: DataTypes.INTEGER
  },
  description: {
    type: DataTypes.TEXT
  },
  tags: {
    type: DataTypes.JSON
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  tableName: 'portrait_library'
});

module.exports = PortraitLibrary;
