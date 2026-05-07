require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

const dbDialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dbDialect === 'sqlite') {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.sqlite');
  const fs = require('fs');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';
  if (fs.existsSync(walPath)) {
    const walSize = fs.statSync(walPath).size;
    if (walSize > 10 * 1024 * 1024) {
      console.log(`⚠️ WAL file is large (${(walSize / 1024 / 1024).toFixed(2)} MB), will compact on startup`);
    }
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV !== 'production' ? (msg) => {
      if (msg.includes('CREATE') || msg.includes('ALTER') || msg.includes('INDEX')) {
        console.log('[DB]', msg);
      }
    } : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      mode: require('sqlite3').OPEN_READWRITE | require('sqlite3').OPEN_CREATE
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    },
    query: {
      raw: false
    }
  });

  sequelize.afterConnect(async (connection) => {
    try {
      await new Promise((resolve, reject) => {
        connection.run('PRAGMA journal_mode=DELETE', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (e) {
      console.warn('⚠️ Failed to set journal_mode=DELETE:', e.message);
    }
    try {
      await new Promise((resolve, reject) => {
        connection.run('PRAGMA synchronous=NORMAL', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (e) {}
    try {
      await new Promise((resolve, reject) => {
        connection.run('PRAGMA temp_store=MEMORY', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (e) {}
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'digital_human',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres',
      port: process.env.DB_PORT || 5432,
      logging: process.env.NODE_ENV !== 'production' ? (msg) => {
        if (msg.includes('CREATE') || msg.includes('ALTER') || msg.includes('INDEX')) {
          console.log('[DB]', msg);
        }
      } : false,
      pool: {
        max: 20,
        min: 5,
        acquire: 60000,
        idle: 10000
      },
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : false,
        statement_timeout: 30000,
        idle_in_transaction_session_timeout: 60000
      },
      define: {
        timestamps: true,
        underscored: false,
        freezeTableName: true
      },
      query: {
        raw: false
      }
    }
  );
}

module.exports = sequelize;
