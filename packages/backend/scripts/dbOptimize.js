const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

async function createIndexes() {
  const dialect = sequelize.getDialect();

  const indexes = [
    { table: 'users', name: 'idx_users_username', column: 'username' },
    { table: 'users', name: 'idx_users_role', column: 'role' },
    { table: 'tasks', name: 'idx_tasks_status', column: 'status' },
    { table: 'tasks', name: 'idx_tasks_created_at', column: 'createdAt' },
    { table: 'voice_library', name: 'idx_voice_library_user', column: 'userId' },
    { table: 'portrait_library', name: 'idx_portrait_library_user', column: 'userId' },
    { table: 'dubbing_library', name: 'idx_dubbing_library_user', column: 'userId' },
    { table: 'work_library', name: 'idx_work_library_user', column: 'userId' },
    { table: 'music_library', name: 'idx_music_library_user', column: 'userId' },
    { table: 'copy_library', name: 'idx_copy_library_user', column: 'userId' },
    { table: 'prompt_library', name: 'idx_prompt_library_user', column: 'userId' },
    { table: 'api_logs', name: 'idx_api_logs_user', column: 'userId' },
    { table: 'api_logs', name: 'idx_api_logs_created', column: 'createdAt' },
    { table: 'publish_tasks', name: 'idx_publish_tasks_status', column: 'status' },
    { table: 'publish_tasks', name: 'idx_publish_tasks_user', column: 'userId' },
    { table: 'cloud_configs', name: 'idx_cloud_configs_category', column: 'category' },
    { table: 'cloud_configs', name: 'idx_cloud_configs_key', column: 'configKey' },
    { table: 'AuditLogs', name: 'idx_audit_logs_user', column: 'userId' },
    { table: 'AuditLogs', name: 'idx_audit_logs_action', column: 'action' },
    { table: 'AuditLogs', name: 'idx_audit_logs_created', column: 'createdAt' }
  ];

  for (const idx of indexes) {
    try {
      if (dialect === 'sqlite') {
        await sequelize.query(
          `CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table} (${idx.column})`,
          { type: QueryTypes.RAW }
        );
      } else {
        await sequelize.query(
          `CREATE INDEX IF NOT EXISTS ${idx.name} ON "${idx.table}" ("${idx.column}")`,
          { type: QueryTypes.RAW }
        );
      }
      console.log(`  ✅ Index ${idx.name} created on ${idx.table}(${idx.column})`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`  ⏭️  Index ${idx.name} already exists`);
      } else {
        console.log(`  ⚠️  Index ${idx.name} failed: ${err.message}`);
      }
    }
  }
}

async function analyzeTables() {
  const dialect = sequelize.getDialect();
  try {
    if (dialect === 'sqlite') {
      const tables = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        { type: QueryTypes.SELECT }
      );
      for (const t of tables) {
        await sequelize.query(`ANALYZE "${t.name}"`, { type: QueryTypes.RAW });
      }
      await sequelize.query('ANALYZE', { type: QueryTypes.RAW });
      console.log('  ✅ SQLite tables analyzed');
    } else if (dialect === 'postgres') {
      await sequelize.query('ANALYZE', { type: QueryTypes.RAW });
      console.log('  ✅ PostgreSQL tables analyzed');
    }
  } catch (err) {
    console.log('  ⚠️  Analyze failed:', err.message);
  }
}

async function cleanupOldData() {
  const dialect = sequelize.getDialect();
  console.log('  🧹 Cleaning up old data...');

  try {
    if (dialect === 'sqlite') {
      const auditCount = await sequelize.query(
        "SELECT COUNT(*) as cnt FROM AuditLogs",
        { type: QueryTypes.SELECT }
      );
      const count = auditCount[0]?.cnt || 0;
      console.log(`  📊 AuditLogs count: ${count}`);

      if (count > 1000) {
        await sequelize.query(
          "DELETE FROM AuditLogs WHERE id NOT IN (SELECT id FROM AuditLogs ORDER BY createdAt DESC LIMIT 500)",
          { type: QueryTypes.RAW }
        );
        console.log(`  ✅ Cleaned ${count - 500} old audit logs (kept 500 most recent)`);
      }

      const apiLogCount = await sequelize.query(
        "SELECT COUNT(*) as cnt FROM api_logs",
        { type: QueryTypes.SELECT }
      ).catch(() => [{ cnt: 0 }]);
      const apiCount = apiLogCount[0]?.cnt || 0;
      console.log(`  📊 api_logs count: ${apiCount}`);

      if (apiCount > 1000) {
        await sequelize.query(
          "DELETE FROM api_logs WHERE id NOT IN (SELECT id FROM api_logs ORDER BY createdAt DESC LIMIT 500)",
          { type: QueryTypes.RAW }
        ).catch(() => {});
        console.log(`  ✅ Cleaned ${apiCount - 500} old API logs (kept 500 most recent)`);
      }

      const taskCount = await sequelize.query(
        "SELECT COUNT(*) as cnt FROM tasks WHERE status IN ('completed', 'failed', 'cancelled')",
        { type: QueryTypes.SELECT }
      ).catch(() => [{ cnt: 0 }]);
      const oldTaskCount = taskCount[0]?.cnt || 0;
      if (oldTaskCount > 100) {
        await sequelize.query(
          "DELETE FROM tasks WHERE status IN ('completed', 'failed', 'cancelled') AND id NOT IN (SELECT id FROM tasks WHERE status IN ('completed', 'failed', 'cancelled') ORDER BY createdAt DESC LIMIT 50)",
          { type: QueryTypes.RAW }
        ).catch(() => {});
        console.log(`  ✅ Cleaned old completed/failed tasks (kept 50 most recent)`);
      }

      await sequelize.query('VACUUM', { type: QueryTypes.RAW });
      console.log('  ✅ SQLite VACUUM completed - database compacted');
    }
  } catch (err) {
    console.log('  ⚠️  Cleanup failed:', err.message);
  }
}

async function checkDiskSpace() {
  try {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.sqlite');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`  💾 Database size: ${sizeMB} MB`);

      if (parseFloat(sizeMB) > 100) {
        console.log('  ⚠️  Database is large, running cleanup...');
        await cleanupOldData();
      }
    }
  } catch (err) {
    console.log('  ⚠️  Disk check failed:', err.message);
  }
}

async function runOptimizations() {
  console.log('');
  console.log('🔧 Database Optimization');
  console.log('========================');

  try {
    await sequelize.authenticate();
    console.log('  ✅ Database connected');

    await checkDiskSpace();
    await cleanupOldData();
    await createIndexes();
    await analyzeTables();

    console.log('');
    console.log('  ✅ Database optimization complete!');
  } catch (err) {
    console.error('  ❌ Database optimization failed:', err.message);
  }
}

if (require.main === module) {
  runOptimizations().then(() => process.exit(0));
}

module.exports = { createIndexes, analyzeTables, cleanupOldData, checkDiskSpace, runOptimizations };
