const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/", async (req, res) => {
  const { student_id, event_id, student_ids } = req.body;

  try {
    // Validate input: Ensure event_id is provided
    if (!event_id) {
      return res.status(400).json({ message: "Event ID is required." });
    }

    // Handle Bulk Insertion from CSV or Excel
    if (student_ids && Array.isArray(student_ids) && student_ids.length > 0) {
      console.log("Bulk insert for event:", event_id, "Students:", student_ids);

      const insertPromises = student_ids.map((id) =>
        db.query(
          "INSERT INTO attendance (student_id, event_id) VALUES (?, ?)",
          [id, event_id]
        )
      );

      await Promise.all(insertPromises); // Execute all insertions concurrently

      return res
        .status(201)
        .json({ message: "Bulk attendance records added successfully." });
    }

    // Handle Single Student Insertion
    if (student_id) {
      console.log("Single insert for student:", student_id, "Event:", event_id);

      const query = `INSERT INTO attendance (student_id, event_id) VALUES (?, ?)`;
      await db.query(query, [student_id, event_id]);

      const [student] = await db.query(
        "SELECT student_id, name, course, year_level FROM student_list WHERE student_id = ?",
        [student_id]
      );

      const studentData = student[0] || {
        student_id,
        name: null,
        course: null,
        year_level: null,
      };

      return res.status(201).json(studentData);
    }

    // If neither student_ids nor student_id are provided
    return res.status(400).json({ message: "Invalid request data." });
  } catch (error) {
    console.error("Error recording attendance:", error);

    // Handle duplicate entries
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ message: "Some students are already marked for this event." });
    }

    // Handle other server errors
    return res
      .status(500)
      .json({ message: "Server error.", error: error.message });
  }
});

// GET: Fetch all student details for a specific event
router.get("/:event_id", async (req, res) => {
  const { event_id } = req.params;

  try {
    const query = `
      SELECT 
        attendance.student_id, 
        student_list.name, 
        student_list.course, 
        student_list.year_level 
      FROM attendance
      LEFT JOIN student_list 
        ON attendance.student_id = student_list.student_id
      WHERE attendance.event_id = ?
      ORDER BY attendance.student_id;
    `;

    const [rows] = await db.query(query, [event_id]);

    res.status(200).json(rows); // Send the student records as response
  } catch (error) {
    console.error("Error fetching student details:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Backend Route: routes/attendance.js or similar
router.get("/student/:student_id", async (req, res) => {
  const { student_id } = req.params;
  const { department_id } = req.query; // Get department_id from query parameters

  if (!department_id) {
    return res
      .status(400)
      .json({ message: "Missing department_id in query parameters" });
  }

  try {
    const query = `
      SELECT 
        student_list.student_id,
        student_list.name AS student_name,
        student_list.course,
        student_list.year_level,
        events.name AS event_name,
        events.date AS event_date
      FROM attendance
      JOIN student_list ON attendance.student_id = student_list.student_id
      JOIN events ON attendance.event_id = events.id
      WHERE attendance.student_id = ? AND events.department_id = ?
      ORDER BY events.date;
    `;

    const [rows] = await db.query(query, [student_id, department_id]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({
          message: "No events found for this student in your department.",
        });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching events for student:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/student/name/:student_name', async (req, res) => {
  const { student_name } = req.params;
  const { department_id } = req.query;

  if (!department_id) {
    return res.status(400).json({ message: "Missing department_id in query parameters" });
  }

  try {
    // Use wildcard for partial matching
    const searchName = `%${student_name}%`;
    const query = `
      SELECT 
        student_list.student_id,
        student_list.name AS student_name,
        student_list.course,
        student_list.year_level,
        events.name AS event_name,
        events.date AS event_date
      FROM attendance
      JOIN student_list ON attendance.student_id = student_list.student_id
      JOIN events ON attendance.event_id = events.id
      WHERE student_list.name LIKE ? AND events.department_id = ?
      ORDER BY events.date;
    `;

    const [rows] = await db.query(query, [searchName, department_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No events found for this student in your department." });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching events for student by name:", error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
