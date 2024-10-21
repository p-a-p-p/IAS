// controllers/authController.js
const bcrypt = require("bcryptjs");
const db = require("../config/db");

// Register User
const register = async (req, res) => {
  const { name, email, password, department_id } = req.body;

  try {
    // Check if the user already exists
    const [existingUser] = await db.query(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user into the database
    await db.query(
      "INSERT INTO users (name, email, password, department_id) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, department_id]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Login User
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    let tableName, redirectUrl;

    // Determine the user type based on email domain
    if (email.endsWith("@admin.com")) {
      tableName = "admin";
      redirectUrl = "/html/admin/admin_dashboard.html";
    } else if (email.endsWith("@staff.com")) {
      tableName = "staff";
      redirectUrl = "/html/staff/staff_dashboard.html";
    } else if (email.endsWith("@user.com")) {
      tableName = "users";
      redirectUrl = "/html/user/user_events.html";
    } else {
      return res.status(400).json({ message: "Invalid email domain" });
    }

    // Query the appropriate table for user/admin/staff data
    const query = `SELECT * FROM ${tableName} WHERE email = ?`;
    const [user] = await db.query(query, [email]);

    if (user.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Get the department ID for staff/users, if applicable
    const department_id = user[0].department_id || null;

    console.log("Login successful:", {
      id: user[0].id,
      department_id,
    });

    // Determine which ID to include in the response
    let idKey;
    if (tableName === "admin") {
      idKey = "adminId";
    } else if (tableName === "staff") {
      idKey = "staffId";
    } else {
      idKey = "userId";
    }

    // Store the session data (staffId/userId and departmentId)
    const responseData = {
      message: "Login successful",
      redirectUrl,
      department_id, // Include department_id if applicable
      [idKey]: user[0].id, // Dynamically set the appropriate ID
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { register, login };
