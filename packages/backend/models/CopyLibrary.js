const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const CopyLibrary = sequelize.define('CopyLibrary', {
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
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'default'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  wordCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  tableName: 'copy_library'
});

CopyLibrary.beforeCreate((copy) => {
  if (copy.content) {
    copy.wordCount = copy.content.replace(/\s/g, '').length;
  }
});

CopyLibrary.beforeUpdate((copy) => {
  if (copy.content) {
    copy.wordCount = copy.content.replace(/\s/g, '').length;
  }
});

module.exports = CopyLibrary;
