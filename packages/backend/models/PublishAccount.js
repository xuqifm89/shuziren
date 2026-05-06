const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const PublishAccount = sequelize.define('PublishAccount', {
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
  platform: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  accountName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  cookieValid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastCheckedAt: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active'
  }
}, {
  timestamps: true,
  tableName: 'publish_accounts'
});

module.exports = PublishAccount;
