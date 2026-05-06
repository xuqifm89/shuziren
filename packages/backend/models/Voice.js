const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const Voice = sequelize.define('Voice', {
  id: {
    type: UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  audioUrl: {
    type: DataTypes.STRING(500)
  },
  voiceType: {
    type: DataTypes.STRING(50),
    defaultValue: 'text_to_speech'
  },
  metadata: {
    type: DataTypes.JSON
  },
  userId: {
    type: UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'voices'
});

module.exports = Voice;
