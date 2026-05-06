const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const Avatar = sequelize.define('Avatar', {
  id: {
    type: UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  thumbnailUrl: {
    type: DataTypes.STRING(500)
  },
  metadata: {
    type: DataTypes.JSON
  },
  type: {
    type: DataTypes.STRING(50),
    defaultValue: 'image'
  }
}, {
  timestamps: true,
  tableName: 'avatars'
});

module.exports = Avatar;
