const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const PromptLibrary = sequelize.define('PromptLibrary', {
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
  },
  modelType: {
    type: DataTypes.STRING(50),
    defaultValue: 'general'
  }
}, {
  timestamps: true,
  tableName: 'prompt_library'
});

PromptLibrary.beforeCreate((prompt) => {
  if (prompt.content) {
    prompt.wordCount = prompt.content.replace(/\s/g, '').length;
  }
});

PromptLibrary.beforeUpdate((prompt) => {
  if (prompt.content) {
    prompt.wordCount = prompt.content.replace(/\s/g, '').length;
  }
});

module.exports = PromptLibrary;
