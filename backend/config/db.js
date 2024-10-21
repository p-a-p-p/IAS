// config/db.js
const mysql = require("mysql2");
require("dotenv").config(); // Ensure .env is loaded

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
});

// Export the pool for use in other modules
module.exports = pool.promise();
