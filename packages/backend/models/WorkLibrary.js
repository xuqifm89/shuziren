const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const WorkLibrary = sequelize.define('WorkLibrary', {
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
  description: {
    type: DataTypes.TEXT
  },
  content: {
    type: DataTypes.TEXT
  },
  audioPath: {
    type: DataTypes.STRING(500)
  },
  videoPath: {
    type: DataTypes.STRING(500)
  },
  coverPath: {
    type: DataTypes.STRING(500)
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'draft'
  },
  duration: {
    type: DataTypes.FLOAT
  },
  size: {
    type: DataTypes.BIGINT
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
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  shareCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  wordCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  sourceType: {
    type: DataTypes.STRING(20),
    defaultValue: 'generated'
  },
  voiceId: {
    type: UUID
  },
  portraitId: {
    type: UUID
  }
}, {
  timestamps: true,
  tableName: 'work_library'
});

WorkLibrary.beforeCreate((work) => {
  if (work.content) {
    work.wordCount = work.content.replace(/\s/g, '').length;
  }
});

WorkLibrary.beforeUpdate((work) => {
  if (work.content) {
    work.wordCount = work.content.replace(/\s/g, '').length;
  }
});

module.exports = WorkLibrary;
