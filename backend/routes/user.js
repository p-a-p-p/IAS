// routes/user.js
const express = require("express");
const db = require("../config/db");
const router = express.Router();

// Get all events for the user's department
// routes/user.js
router.get("/events", async (req, res) => {
  const { user_id } = req.query;

  console.log("Received User ID:", user_id); // Debugging log

  try {
    // Fetch the user's department ID
    const [user] = await db.query(
      "SELECT department_id FROM users WHERE id = ?",
      [user_id]
    );

    console.log("User Department:", user); // Debugging log

    const departmentId = user[0]?.department_id;

    if (!departmentId) {
      return res.status(400).json({ message: "Invalid user ID or department" });
    }

    // Fetch events for this department
    const [events] = await db.query(
      "SELECT * FROM events WHERE department_id = ? ORDER BY date",
      [departmentId]
    );

    console.log("Fetched Events:", events); // Debugging log

    res.status(200).json(events); // Send events to the frontend
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
