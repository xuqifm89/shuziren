const sequelize = require('../config/database');

async function migrateStorageFields() {
  try {
    await sequelize.authenticate();
    console.log('[Migration] 数据库连接成功');
    
    console.log('\n[Migration] 开始迁移存储字段...\n');
    
    const migrations = [
      {
        table: 'work_library',
        columns: [
          {
            name: 'audioFileKey',
            type: "VARCHAR(500)",
            comment: '音频文件标识，如 output/audio_xxx.wav'
          },
          {
            name: 'videoFileKey',
            type: "VARCHAR(500)",
            comment: '视频文件标识，如 works/video_xxx.mp4'
          },
          {
            name: 'coverFileKey',
            type: "VARCHAR(500)",
            comment: '封面标识，如 output/covers/cover_xxx.png'
          },
          {
            name: 'storageLocation',
            type: "ENUM('local', 'cloud', 'desktop')",
            defaultValue: "'local'",
            comment: '存储位置'
          }
        ]
      },
      {
        table: 'voice_library',
        columns: [
          { name: 'fileKey', type: "VARCHAR(500)", comment: '文件标识' },
          { name: 'storageLocation', type: "ENUM('local', 'cloud', 'desktop')", defaultValue: "'local'" }
        ]
      },
      {
        table: 'dubbing_library',
        columns: [
          { name: 'fileKey', type: "VARCHAR(500)", comment: '文件标识' },
          { name: 'storageLocation', type: "ENUM('local', 'cloud', 'desktop')", defaultValue: "'local'" }
        ]
      },
      {
        table: 'music_library',
        columns: [
          { name: 'fileKey', type: "VARCHAR(500)", comment: '文件标识' },
          { name: 'storageLocation', type: "ENUM('local', 'cloud', 'desktop')", defaultValue: "'local'" }
        ]
      },
      {
        table: 'portrait_library',
        columns: [
          { name: 'fileKey', type: "VARCHAR(500)", comment: '文件标识' },
          { name: 'storageLocation', type: "ENUM('local', 'cloud', 'desktop')", defaultValue: "'local'" }
        ]
      }
    ];
    
    for (const migration of migrations) {
      const { table, columns } = migration;
      
      console.log(`[Migration] 处理表: ${table}`);
      
      const tableExists = await sequelize.getQueryInterface().showAllTables({
        logging: false
      }).then(tables => tables.some(t => t.tableName === table));
      
      if (!tableExists) {
        console.log(`  ⏭️  表 ${table} 不存在，跳过\n`);
        continue;
      }
      
      const tableInfo = await sequelize.getQueryInterface().describeTable(table, { logging: false });
      
      for (const column of columns) {
        if (tableInfo[column.name]) {
          console.log(`  ✅ 字段 ${column.name} 已存在，跳过`);
          continue;
        }
        
        try {
          await sequelize.getQueryInterface().addColumn(
            table,
            column.name,
            {
              type: Sequelize[column.type.includes('ENUM') ? 'STRING' : column.type.split('(')[0]],
              defaultValue: column.defaultValue || null,
              comment: column.comment
            },
            { logging: false }
          );
          
          console.log(`  ✅ 添加字段: ${column.name} (${column.type})`);
          
          if (column.type.includes('ENUM')) {
            await sequelize.query(
              `ALTER TABLE "${table}" MODIFY COLUMN "${column.name}" ${column.type} DEFAULT ${column.defaultValue}`,
              { logging: false }
            );
          }
        } catch (error) {
          console.error(`  ❌ 添加字段失败: ${column.name}`, error.message);
        }
      }
      
      console.log('');
    }

    if (process.argv.includes('--migrate-data')) {
      console.log('[Migration] 开始迁移旧数据...\n');
      
      const dataMigrations = [
        {
          table: 'work_library',
          oldField: 'audioPath',
          newField: 'audioFileKey'
        },
        {
          table: 'work_library',
          oldField: 'videoPath',
          newField: 'videoFileKey'
        },
        {
          table: 'work_library',
          oldField: 'coverPath',
          newField: 'coverFileKey'
        },
        {
          table: 'voice_library',
          oldField: 'fileUrl',
          newField: 'fileKey'
        },
        {
          table: 'dubbing_library',
          oldField: 'fileUrl',
          newField: 'fileKey'
        },
        {
          table: 'music_library',
          oldField: 'fileUrl',
          newField: 'fileKey'
        },
        {
          table: 'portrait_library',
          oldField: 'fileUrl',
          newField: 'fileKey'
        }
      ];
      
      let migratedCount = 0;
      
      for (const dm of dataMigrations) {
        try {
          const result = await sequelize.query(
            `UPDATE "${dm.table}" SET "${dm.newField}" = REPLACE("${dm.oldField}", './', ''), ` +
            `"storageLocation" = 'local' WHERE "${dm.newField}" IS NULL AND "${dm.oldField}" IS NOT NULL`,
            { logging: false, type: Sequelize.QueryTypes.UPDATE }
          );
          
          if (result[1] > 0) {
            console.log(`  ✅ ${dm.table}: 迁移了 ${result[1]} 条记录 (${dm.oldField} → ${dm.newField})`);
            migratedCount += result[1];
          }
        } catch (error) {
          console.log(`  ⚠️ ${dm.table}: 数据迁移跳过 - ${error.message}`);
        }
      }
      
      console.log(`\n[Migration] 数据迁移完成! 共处理 ${migratedCount} 条记录\n`);
    }

    console.log('[Migration] ✅ 所有迁移完成!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('[Migration] ❌ 迁移失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateStorageFields();
}

module.exports = { migrateStorageFields };
