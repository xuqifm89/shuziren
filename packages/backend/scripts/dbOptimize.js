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
      ).catch(() => [{ cnt: 0 }]);
      const count = auditCount[0]?.cnt || 0;
      console.log(`  📊 AuditLogs count: ${count}`);

      if (count > 100) {
        await sequelize.query(
          "DELETE FROM AuditLogs WHERE id NOT IN (SELECT id FROM AuditLogs ORDER BY createdAt DESC LIMIT 50)",
          { type: QueryTypes.RAW }
        ).catch(() => {});
        console.log(`  ✅ Cleaned old audit logs (kept 50 most recent)`);
      }

      const apiLogCount = await sequelize.query(
        "SELECT COUNT(*) as cnt FROM api_logs",
        { type: QueryTypes.SELECT }
      ).catch(() => [{ cnt: 0 }]);
      const apiCount = apiLogCount[0]?.cnt || 0;
      console.log(`  📊 api_logs count: ${apiCount}`);

      if (apiCount > 100) {
        await sequelize.query(
          "DELETE FROM api_logs WHERE id NOT IN (SELECT id FROM api_logs ORDER BY createdAt DESC LIMIT 50)",
          { type: QueryTypes.RAW }
        ).catch(() => {});
        console.log(`  ✅ Cleaned old API logs (kept 50 most recent)`);
      }

      const taskCount = await sequelize.query(
        "SELECT COUNT(*) as cnt FROM tasks WHERE status IN ('completed', 'failed', 'cancelled')",
        { type: QueryTypes.SELECT }
      ).catch(() => [{ cnt: 0 }]);
      const oldTaskCount = taskCount[0]?.cnt || 0;
      if (oldTaskCount > 50) {
        await sequelize.query(
          "DELETE FROM tasks WHERE status IN ('completed', 'failed', 'cancelled') AND id NOT IN (SELECT id FROM tasks WHERE status IN ('completed', 'failed', 'cancelled') ORDER BY createdAt DESC LIMIT 20)",
          { type: QueryTypes.RAW }
        ).catch(() => {});
        console.log(`  ✅ Cleaned old completed/failed tasks (kept 20 most recent)`);
      }

      const publishTaskCount = await sequelize.query(
        "SELECT COUNT(*) as cnt FROM publish_tasks WHERE status IN ('success', 'failed')",
        { type: QueryTypes.SELECT }
      ).catch(() => [{ cnt: 0 }]);
      const oldPubCount = publishTaskCount[0]?.cnt || 0;
      if (oldPubCount > 50) {
        await sequelize.query(
          "DELETE FROM publish_tasks WHERE status IN ('success', 'failed') AND id NOT IN (SELECT id FROM publish_tasks WHERE status IN ('success', 'failed') ORDER BY createdAt DESC LIMIT 20)",
          { type: QueryTypes.RAW }
        ).catch(() => {});
        console.log(`  ✅ Cleaned old publish tasks (kept 20 most recent)`);
      }

      try {
        await sequelize.query('VACUUM', { type: QueryTypes.RAW });
        console.log('  ✅ SQLite VACUUM completed - database compacted');
      } catch (vacuumErr) {
        console.warn('  ⚠️ VACUUM failed:', vacuumErr.message);
      }
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

      if (parseFloat(sizeMB) > 10) {
        console.log('  ⚠️  Database is large, running cleanup...');
        await cleanupOldData();
      }
    }

    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) {
      const walSize = fs.statSync(walPath).size;
      const walMB = (walSize / 1024 / 1024).toFixed(2);
      console.log(`  📄 WAL file size: ${walMB} MB`);
      if (walSize > 5 * 1024 * 1024) {
        console.log('  ⚠️  WAL file is large, compacting...');
        try {
          await sequelize.query('PRAGMA wal_checkpoint(TRUNCATE)', { type: QueryTypes.RAW });
          console.log('  ✅ WAL checkpoint completed');
        } catch (e) {
          console.warn('  ⚠️ WAL checkpoint failed:', e.message);
        }
      }
    }

    try {
      const { execSync } = require('child_process');
      const dfOutput = execSync('df -h /app/data 2>/dev/null || df -h / 2>/dev/null', { encoding: 'utf-8' }).trim();
      const lines = dfOutput.split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        const usePercent = parseInt(parts[4] || '0');
        console.log(`  💿 Disk usage: ${usePercent}%`);
        if (usePercent > 80) {
          console.log('  ⚠️  Disk usage high, running aggressive cleanup...');
          await cleanupOldData();
        }
      }
    } catch (e) {}
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
