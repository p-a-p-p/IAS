const express = require("express");
const router = express.Router();
const db = require("../config/db");

// POST: Add Student to Attendance (Common Route for Staff and Users)
router.post("/", async (req, res) => {
  const { student_id, event_id } = req.body;

  // Validate input
  if (!student_id || !event_id) {
    return res
      .status(400)
      .json({ message: "Student ID and Event ID are required" });
  }

  try {
    const query = `
            INSERT INTO attendance (student_id, event_id)
            VALUES (?, ?)
        `;
    await db.query(query, [student_id, event_id]);

    res.status(201).json({ message: "Attendance recorded successfully" });
  } catch (error) {
    console.error("Error recording attendance:", error);
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .json({ message: "Student already marked for this event" });
    } else {
      res.status(500).json({ message: "Server error" });
    }
  }
});

// GET: Fetch all student IDs for a specific event
router.get("/:event_id", async (req, res) => {
  const { event_id } = req.params;

  try {
    const query = `
            SELECT student_id FROM attendance WHERE event_id = ?
        `;
    const [rows] = await db.query(query, [event_id]);

    res.status(200).json(rows); // Send back all student IDs
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
