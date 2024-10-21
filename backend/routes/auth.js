// routes/auth.js
const express = require("express");
const { login, register } = require("../controllers/authController"); // Check this path
const router = express.Router();

// Define routes
router.post("/login", login);
router.post("/register", register);

module.exports = router;
