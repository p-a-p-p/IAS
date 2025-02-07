const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Helper function to format datetime strings
function formatDatetime(input) {
  // Converts an input like "2/7/2025 12:28" to "2025-02-07 12:28:00"
  if (!input) return input;
  const [datePart, timePart] = input.split(" ");
  if (!datePart || !timePart) return input;
  const parts = datePart.split("/");
  if (parts.length !== 3) return input;
  let [month, day, year] = parts;
  // Pad month and day with leading zeros if needed
  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;
  let formattedTime = timePart;
  // If no seconds are provided, append ":00"
  if (timePart.split(":").length === 2) {
    formattedTime += ":00";
  }
  return `${year}-${month}-${day} ${formattedTime}`;
}

router.post("/", async (req, res) => {
  // De-structure the necessary fields
  const { event_id, records, student_id } = req.body; 

  try {
    // 1. Validate event_id
    if (!event_id) {
      return res.status(400).json({ message: "Event ID is required." });
    }

    // 2. Retrieve the event's deadline
    const [[eventRow]] = await db.query(
      "SELECT deadline FROM events WHERE id = ?",
      [event_id]
    );
    if (!eventRow) {
      return res.status(400).json({ message: "Event not found." });
    }

    // Get the event's deadline and the current time
    const deadline = new Date(eventRow.deadline);
    const now = new Date();

    // For single student insertion, check if the current time exceeds the deadline.
    // (For bulk uploads, we check each record individually below.)
    if ((!records || records.length === 0) && now > deadline) {
      return res
        .status(400)
        .json({ message: "Deadline passed. Attendance not allowed." });
    }

    // 4. Handle Bulk Insertion from CSV or Excel
    if (records && Array.isArray(records) && records.length > 0) {
      console.log("Bulk insert for event:", event_id, "Records:", records);

      // Filter records based on attendance_time relative to the event deadline.
      // Convert each record's attendance_time to a valid datetime before comparing.
      const validRecords = records.filter(({ attendance_time }) => {
        const recordTime = new Date(formatDatetime(attendance_time));
        return recordTime <= deadline;
      });

      if (validRecords.length === 0) {
        return res
          .status(400)
          .json({ message: "No records have attendance time within the deadline." });
      }

      // Get unique student IDs from validRecords
      const studentIdsBulk = validRecords.map(r => r.student_id);
      const uniqueStudentIdsBulk = [...new Set(studentIdsBulk)];

      // Query existing attendance records for this event among those student IDs.
      const [existingRows] = await db.query(
        "SELECT student_id FROM attendance WHERE event_id = ? AND student_id IN (?)",
        [event_id, uniqueStudentIdsBulk]
      );

      // Create a Set of existing student_ids.
      const existingStudentIds = new Set(existingRows.map(row => row.student_id));

      // Filter out duplicates:
      // - Skip records where the student_id already exists in the database.
      // - Also, skip duplicate entries within the bulk upload (keep only one record per student).
      const seen = new Set();
      const newRecords = [];
      for (const record of validRecords) {
        if (existingStudentIds.has(record.student_id)) continue;
        if (seen.has(record.student_id)) continue;
        seen.add(record.student_id);
        newRecords.push(record);
      }

      // Insert only the new (non-duplicate) records.
      if (newRecords.length > 0) {
        const insertPromises = newRecords.map(({ student_id, attendance_time }) =>
          db.query(
            "INSERT INTO attendance (student_id, event_id, attended_on) VALUES (?, ?, ?)",
            [student_id, event_id, formatDatetime(attendance_time)]
          )
        );
        await Promise.all(insertPromises);
      }

      // Return a success message without any duplicate messages.
      return res
        .status(201)
        .json({ message: "Bulk attendance records added successfully." });
    }

    // 5. Handle Single Student Insertion
    // (Check for duplicates and do not add if duplicate exists)
    if (student_id) {
      console.log("Single insert for student:", student_id, "Event:", event_id);

      // Check if an attendance record already exists for this student and event.
      const [existing] = await db.query(
        "SELECT * FROM attendance WHERE student_id = ? AND event_id = ?",
        [student_id, event_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: "Student already marked for this event." });
      }

      await db.query(
        "INSERT INTO attendance (student_id, event_id, attended_on) VALUES (?, ?, NOW())",
        [student_id, event_id]
      );

      // Optionally fetch student details from 'student_list'
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

    // If neither records nor student_id are provided
    return res.status(400).json({ message: "Invalid request data." });
  } catch (error) {
    console.error("Error recording attendance:", error);

    // For single insertions, send a duplicate error message if applicable.
    if (!records && error.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ message: "Student already marked for this event." });
    }

    // For bulk insertion, duplicates are filtered out so no duplicate message is sent.
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

//search by student id
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

//search by student name
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
