// server/run_migration.js
const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');

async function run() {
  console.log('--- Step 1: Connecting to PostgreSQL to read existing data ---');
  process.env.DB_DIALECT = 'postgres';
  const pgModels = require('./models');
  
  await pgModels.sequelize.authenticate();
  console.log('Successfully connected to PostgreSQL!');

  console.log('--- Step 2: Initializing SQLite database ---');
  const dataDir = path.resolve(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const sqlitePath = path.join(dataDir, 'database.sqlite');
  if (fs.existsSync(sqlitePath)) {
    fs.copyFileSync(sqlitePath, sqlitePath + '.bak');
  }

  // Create SQLite Sequelize instance
  const sqlite = new Sequelize({
    dialect: 'sqlite',
    storage: sqlitePath,
    logging: false,
  });

  // Temporarily reset require cache to load models into SQLite instance
  delete require.cache[require.resolve('./models')];
  process.env.DB_DIALECT = 'sqlite';
  process.env.SQLITE_PATH = sqlitePath;
  const sqliteModels = require('./models');

  // Sync SQLite schema
  await sqliteModels.sequelize.sync({ force: true });
  console.log('SQLite tables initialized successfully!');

  // Copy tables in order
  const modelKeys = [
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

  for (const key of modelKeys) {
    if (pgModels[key] && sqliteModels[key]) {
      try {
        const rows = await pgModels[key].findAll({ raw: true });
        if (rows && rows.length > 0) {
          await sqliteModels[key].bulkCreate(rows, { validate: false });
          console.log(`[OK] Copied ${rows.length} rows for ${key}`);
        } else {
          console.log(`[-] 0 rows for ${key}`);
        }
      } catch (err) {
        console.error(`[Error] Failed copying ${key}:`, err.message);
      }
    }
  }

  console.log('--- Step 3: Verifying SQLite data ---');
  const userCount = await sqliteModels.User.count();
  const productCount = await sqliteModels.Product.count();
  const categoryCount = await sqliteModels.Category.count();
  const settingCount = await sqliteModels.Setting.count();
  console.log(`SQLite verified: ${userCount} Users, ${productCount} Products, ${categoryCount} Categories, ${settingCount} Settings`);

  await pgModels.sequelize.close();
  await sqliteModels.sequelize.close();
  console.log('--- ALL DATA MIGRATED TO SQLITE SUCCESSFULLY! ---');
}

run().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
