const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Get events based on staff ID or department ID
router.get("/events", async (req, res) => {
  const { staff_id, department_id } = req.query;

  try {
    let events;

    // If staff_id is provided, get the staff's department ID and fetch department events
    if (staff_id) {
      const [staff] = await db.query(
        "SELECT department_id FROM staff WHERE id = ?",
        [staff_id]
      );

      const departmentId = staff[0]?.department_id;

      if (!departmentId) {
        return res
          .status(400)
          .json({ message: "Invalid staff ID or department" });
      }

      [events] = await db.query(
        "SELECT * FROM events WHERE department_id = ? ORDER BY date",
        [departmentId]
      );
    }
    // If department_id is provided, directly fetch events for that department
    else if (department_id) {
      [events] = await db.query(
        "SELECT * FROM events WHERE department_id = ? ORDER BY date",
        [department_id]
      );
    } else {
      return res
        .status(400)
        .json({ message: "Either staff_id or department_id is required" });
    }

    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new event
router.post("/events", async (req, res) => {
  const { name, date, deadline, created_by, department_id } = req.body;
  
  try {
    // If your table has 'deadline DATETIME'
    await db.query(
      "INSERT INTO events (name, date, deadline, created_by, department_id) VALUES (?, ?, ?, ?, ?)",
      [name, date, deadline, created_by, department_id]
    );

    res.status(201).json({ message: "Event created successfully" });
  } catch (error) {
    console.error("SQL Error:", error.sqlMessage);
    res.status(500).json({ message: "Server error", error: error.sqlMessage });
  }
});

// GET: Fetch attendance records with student details and event date
router.get("/:event_id", async (req, res) => {
  const { event_id } = req.params;

  try {
    const query = `
          SELECT 
              student_list.student_id, 
              student_list.name, 
              student_list.course, 
              student_list.year_level, 
              events.date AS event_date
          FROM attendance
          JOIN student_list ON attendance.student_id = student_list.student_id
          JOIN events ON attendance.event_id = events.id
          WHERE attendance.event_id = ?
          ORDER BY student_list.name;
      `;

    const [rows] = await db.query(query, [event_id]);
    res.status(200).json(rows); // Send the response
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete an event by ID
router.delete("/events/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the event exists
    const [event] = await db.query("SELECT * FROM events WHERE id = ?", [id]);

    if (event.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    await db.query("DELETE FROM events WHERE id = ?", [id]);
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
