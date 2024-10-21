const express = require("express");
const path = require("path");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const staffRoutes = require("./routes/staff"); // Import staff routes
const attendanceRoutes = require("./routes/attendance");
const dotenv = require("dotenv");
dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and serve static files
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/staff", staffRoutes);
app.use("/attendance", attendanceRoutes);
// Serve login page at the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Serve script.js from the root directory
app.use("/script.js", express.static(path.join(__dirname, "script.js")));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
