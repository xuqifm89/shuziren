const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const isSQLite = sequelize.getDialect() === 'sqlite';

const UUID = isSQLite ? DataTypes.STRING(36) : DataTypes.UUID;
const UUIDV4 = isSQLite ? () => require('crypto').randomUUID() : DataTypes.UUIDV4;

module.exports = { UUID, UUIDV4 };
