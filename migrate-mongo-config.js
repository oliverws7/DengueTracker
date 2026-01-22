require('dotenv').config(); // <-- ESTA LINHA É A CORREÇÃO

const config = {
  mongodb: {
    url: process.env.MONGODB_URI, // Agora o valor virá do seu .env
    databaseName: process.env.MONGODB_DB_NAME || "denguetracker",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js",
  useFileHash: false
};

module.exports = config;