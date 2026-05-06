const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const User = sequelize.define('User', {
  id: {
    type: UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    unique: true
  },
  nickname: {
    type: DataTypes.STRING(100)
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true
  },
  role: {
    type: DataTypes.STRING(20),
    defaultValue: 'user',
    validate: {
      isIn: [['superadmin', 'admin', 'user']]
    }
  },
  lightParticles: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  avatar: {
    type: DataTypes.STRING(500)
  },
  bio: {
    type: DataTypes.STRING(500)
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active'
  },
  lastLoginAt: {
    type: DataTypes.DATE
  },
  wechatOpenId: {
    type: DataTypes.STRING(100)
  }
}, {
  timestamps: true,
  tableName: 'users',
  indexes: [
    {
      name: 'idx_users_wechat_openid',
      unique: true,
      fields: ['wechatOpenId']
    }
  ]
});

module.exports = User;
