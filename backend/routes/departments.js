// routes/departments.js

const express = require("express");
const router = express.Router();
const db = require("../config/db"); // Adjust the path to your database module

// Get all departments
router.get("/", async (req, res) => {
  try {
    const [departments] = await db.query(
      "SELECT * FROM departments ORDER BY name"
    );
    res.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
