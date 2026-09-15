const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function migrate() {
  console.log('--- STARTING POSTGRESQL -> SQLITE MIGRATION ---');

  // 1. Source (PostgreSQL)
  const pgSeq = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
  });

  // 2. Destination (SQLite)
  const dataDir = path.resolve(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const sqlitePath = path.join(dataDir, 'database.sqlite');
  
  // If sqlite file exists, backup first
  if (fs.existsSync(sqlitePath)) {
    fs.copyFileSync(sqlitePath, sqlitePath + '.bak');
    fs.unlinkSync(sqlitePath);
  }

  const sqliteSeq = new Sequelize({
    dialect: 'sqlite',
    storage: sqlitePath,
    logging: false,
  });

  // Load models definition factory
  const models = require('./models');

  // Sync SQLite schema
  await sqliteSeq.sync({ force: true });
  console.log('SQLite schema created successfully at:', sqlitePath);

  // List of models to copy in order of foreign key dependency
  const modelNames = [
    'Category',
    'User',
    'Product',
    'ProductKey',
    'Purchase',
    'Log',
    'Setting',
    'GiftCode',
    'Coupon',
    'SlipTransaction',
    'PaymentOrder',
    'BannedIP',
    'BannedDevice',
    'WhitelistedIP',
    'SecurityThreatLog',
  ];

  for (const name of modelNames) {
    if (models[name]) {
      try {
        const rows = await models[name].findAll({ raw: true });
        if (rows && rows.length > 0) {
          // Re-create model on sqliteSeq
          const sqliteModel = models[name];
          // Bulk create with raw attributes
          await sqliteSeq.models[name].bulkCreate(rows, { validate: false });
          console.log(`[Migrated] ${name}: ${rows.length} rows`);
        } else {
          console.log(`[Migrated] ${name}: 0 rows (empty)`);
        }
      } catch (err) {
        console.error(`Error migrating ${name}:`, err.message);
      }
    }
  }

  console.log('--- MIGRATION TO SQLITE COMPLETED SUCCESSFULLY! ---');
  await pgSeq.close();
  await sqliteSeq.close();
  process.exit(0);
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
