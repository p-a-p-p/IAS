// routes/admin.js
const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const db = require("../config/db"); // Adjust the path to your database module

// Get all staff grouped by department
router.get("/staff", async (req, res) => {
  try {
    const query = `
      SELECT 
        staff.id,
        staff.name,
        staff.email,
        staff.department_id,
        departments.name AS department_name
      FROM staff
      JOIN departments ON staff.department_id = departments.id
      ORDER BY departments.name, staff.name;
    `;
    const [staffRows] = await db.query(query);
    res.json(staffRows);
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users grouped by department
router.get("/users", async (req, res) => {
  try {
    const query = `
      SELECT 
        users.id,
        users.name,
        users.email,
        users.department_id,
        departments.name AS department_name
      FROM users
      JOIN departments ON users.department_id = departments.id
      ORDER BY departments.name, users.name;
    `;
    const [userRows] = await db.query(query);
    res.json(userRows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get specific staff member by ID
router.get("/staff/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const query =
      "SELECT id, name, email, department_id FROM staff WHERE id = ?";
    const [rows] = await db.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching staff member:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get specific user by ID
router.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const query =
      "SELECT id, name, email, department_id FROM users WHERE id = ?";
    const [rows] = await db.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new staff member
router.post("/staff", async (req, res) => {
  const { name, email, department_id, password } = req.body;
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const query =
      "INSERT INTO staff (name, email, password, department_id) VALUES (?, ?, ?, ?)";
    const [result] = await db.query(query, [
      name,
      email,
      hashedPassword,
      department_id,
    ]);
    res
      .status(201)
      .json({ message: "Staff member created", id: result.insertId });
  } catch (error) {
    console.error("Error creating staff member:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new user
router.post("/users", async (req, res) => {
  const { name, email, department_id, password } = req.body;
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const query =
      "INSERT INTO users (name, email, password, department_id) VALUES (?, ?, ?, ?)";
    const [result] = await db.query(query, [
      name,
      email,
      hashedPassword,
      department_id,
    ]);
    res.status(201).json({ message: "User created", id: result.insertId });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update staff member
router.put("/staff/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, department_id, password } = req.body;
  try {
    let query, params;
    if (password) {
      // If password is provided, hash it and update
      const hashedPassword = await bcrypt.hash(password, 10);
      query =
        "UPDATE staff SET name = ?, email = ?, department_id = ?, password = ? WHERE id = ?";
      params = [name, email, department_id, hashedPassword, id];
    } else {
      // If no password provided, update other fields only
      query =
        "UPDATE staff SET name = ?, email = ?, department_id = ? WHERE id = ?";
      params = [name, email, department_id, id];
    }
    await db.query(query, params);
    res.json({ message: "Staff member updated" });
  } catch (error) {
    console.error("Error updating staff member:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user
router.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, department_id, password } = req.body;
  try {
    let query, params;
    if (password) {
      // If password is provided, hash it and update
      const hashedPassword = await bcrypt.hash(password, 10);
      query =
        "UPDATE users SET name = ?, email = ?, department_id = ?, password = ? WHERE id = ?";
      params = [name, email, department_id, hashedPassword, id];
    } else {
      // If no password provided, update other fields only
      query =
        "UPDATE users SET name = ?, email = ?, department_id = ? WHERE id = ?";
      params = [name, email, department_id, id];
    }
    await db.query(query, params);
    res.json({ message: "User updated" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete staff member
router.delete("/staff/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const query = "DELETE FROM staff WHERE id = ?";
    await db.query(query, [id]);
    res.json({ message: "Staff member deleted" });
  } catch (error) {
    console.error("Error deleting staff member:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const query = "DELETE FROM users WHERE id = ?";
    await db.query(query, [id]);
    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all events
router.get("/events", async (req, res) => {
  try {
    const query = `
      SELECT events.*, departments.name AS department_name
      FROM events
      LEFT JOIN departments ON events.department_id = departments.id
      ORDER BY events.date DESC
    `;
    const [events] = await db.query(query);
    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new event
router.post("/events", async (req, res) => {
  const { name, date, department_id } = req.body;
  try {
    const query =
      "INSERT INTO events (name, date, department_id) VALUES (?, ?, ?)";
    await db.query(query, [name, date, department_id]);
    res.status(201).json({ message: "Event created successfully" });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete an event
router.delete("/events/:id", async (req, res) => {
  const eventId = req.params.id;
  try {
    const query = "DELETE FROM events WHERE id = ?";
    await db.query(query, [eventId]);
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Export the router
module.exports = router;
