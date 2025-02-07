// script.js

// Utility Functions
// -----------------

// Get Query Parameters from URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Extract Event ID from URL
function getEventIdFromUrl() {
  return getQueryParam("event_id");
}

/**
 * Convert a date string from a format like "30/Sep/2024 12:40" 
 * to MySQL datetime format "YYYY-MM-DD HH:mm:ss".
 */
function convertToMySQLDatetime(dateStr) {
  // Remove any extra quotes and whitespace
  dateStr = dateStr.replace(/['"]+/g, "").trim();

  // Split into date and time parts. Expected format: "30/Sep/2024 12:40"
  const parts = dateStr.split(" ");
  if (parts.length !== 2) return dateStr; // fallback if unexpected format

  const [datePart, timePart] = parts;
  const dateParts = datePart.split("/");
  if (dateParts.length !== 3) return dateStr; // fallback if unexpected format

  const [day, monthAbbr, year] = dateParts;
  // Map month abbreviations to numbers
  const monthMap = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const month = monthMap[monthAbbr];
  if (!month) return dateStr; // fallback if month abbreviation unrecognized

  // If the time is in "HH:mm" format, append seconds as ":00"
  let formattedTime = timePart;
  if (formattedTime.length === 5) {
    formattedTime += ":00";
  }
  return `${year}-${month}-${day} ${formattedTime}`;
}

// Render Sidebar Based on Role
function renderSidebar() {
  const role = sessionStorage.getItem("role");
  const sidebar = document.getElementById("sidebar");

  if (!sidebar) {
    console.warn("Sidebar element not found.");
    return;
  }

  let sidebarContent = "";

  if (role === "admin") {
    sidebarContent = `
      <div class="p-6">
        <h2 class="text-xl font-bold">Admin Dashboard</h2>
        <ul class="mt-8 space-y-4">
          <li>
            <a href="/html/admin/admin_dashboard.html" class="hover:text-blue-300">Dashboard</a>
          </li>
          <li>
            <a href="/html/admin/admin_event.html" class="hover:text-blue-300">Manage Events</a>
          </li>
          <li>
            <a href="/html/admin/admin_new_staff.html" class="hover:text-blue-300">Add New Staff</a>
          </li>
          <li>
            <a href="/html/admin/admin_new_user.html" class="hover:text-blue-300">Add New User</a>
          </li>
        </ul>
      </div>
      <div class="p-6">
        <button id="logout-btn" class="w-full bg-red-500 text-white py-2 rounded hover:bg-red-700">
          Logout
        </button>
      </div>`;
  } else if (role === "staff") {
    sidebarContent = `
      <div class="p-4">
        <h2 class="text-lg font-bold">Staff Dashboard</h2>
        <ul class="mt-4 space-y-3">
          <li><a href="/html/staff/staff_dashboard.html" class="hover:text-blue-300">Dashboard</a></li>
          <li><a href="/html/staff/staff_events.html" class="hover:text-blue-300">Events</a></li>
          <li><a href="/html/staff/staff_attendance.html" class="hover:text-blue-300">Attendance</a></li>
        </ul>
      </div>
      <div class="p-4">
        <button id="logout-btn" class="w-full bg-red-500 text-white py-1 rounded-lg hover:bg-red-700">
          Logout
        </button>
      </div>`;
  } else if (role === "user") {
    sidebarContent = `
      <div class="p-6">
        <h2 class="text-2xl font-bold">User Menu</h2>
        <ul class="mt-12 space-y-8">
          <li>
            <a href="/html/user/user_events.html" class="hover:text-green-300 text-xl">Events</a>
          </li>
          <li>
            <a href="/html/user/user_attendance.html" class="hover:text-green-300 text-xl">Attendance</a>
          </li>
        </ul>
      </div>
      <div class="p-6">
        <button id="logout-btn" class="w-full bg-red-500 text-white py-3 text-xl rounded hover:bg-red-700">
          Logout
        </button>
      </div>`;
  } else {
    console.error("Role not found in session storage.");
    alert("Session expired. Please log in again.");
    window.location.href = "/login.html";
    return;
  }

  sidebar.innerHTML = sidebarContent;

  // Add logout event listener
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
}

function fetchEventDetails(eventId) {
  fetch(`/events/${eventId}`)
    .then(response => response.json())
    .then(data => {
      if (data && data.name) {
        const eventNameElem = document.getElementById("display-event-name");
        if (eventNameElem) {
          eventNameElem.textContent = data.name;
        }
      } else {
        console.error("Event details not found or missing 'name' property.");
      }
    })
    .catch(err => {
      console.error("Error fetching event details:", err);
    });
}

// Logout Function
function logout() {
  sessionStorage.clear();
  window.location.href = "/login.html";
}

// Validate Student ID Format
function validateStudentId(studentId) {
  return /^(?:[0-9]{4}-[0-9]{4}-[0-9]|[0-9]{6})$/.test(studentId);
}

// Main Initialization Function
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderSidebar();
  initializePageBasedOnPath();
});

let lastScannedCode = "";    // Keep track of the last scanned value
let lastScanTime = 0;        // Track the time (in ms) of the last scan
const debounceTime = 3000;   // Wait 3s (adjust as needed) before allowing another scan

document.addEventListener('DOMContentLoaded', function() {
  const scanBtn = document.getElementById('scan-barcode-btn');
  const closeScannerBtn = document.getElementById('close-scanner-btn');
  const scannerContainer = document.getElementById('barcode-scanner');

  // When the "Scan Barcode" button is clicked, show the scanner and start QuaggaJS.
  if (scanBtn) {
    scanBtn.addEventListener('click', function() {
      // Show the barcode scanner section.
      scannerContainer.classList.remove('hidden');
      
      // Initialize QuaggaJS with configuration for the live stream.
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: document.querySelector('#barcode-video'),
          constraints: {
            facingMode: "environment",
            width: 640,
            height: 480
          }
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "ean_8_reader"]
        },
        locate: true
      }, function(err) {
        if (err) {
          console.error("Quagga initialization error:", err);
          alert("Error starting barcode scanner: " + err);
          return;
        }
        console.log("Quagga started successfully.");
        Quagga.start();
      });
    });
  }

  // When the "Close Scanner" button is clicked, stop QuaggaJS and hide the scanner section.
  if (closeScannerBtn) {
    closeScannerBtn.addEventListener('click', function() {
      Quagga.stop();
      scannerContainer.classList.add('hidden');
    });
  }

  // Listen for barcode detection events.
  Quagga.onDetected(function(result) {
    // Retrieve the detected barcode.
    const code = result.codeResult.code;
    const currentTime = Date.now();

    if (code !== lastScannedCode || (currentTime - lastScanTime) > debounceTime) {
        console.log("Barcode detected:", code);
        document.getElementById('student-id').value = code;

        lastScannedCode = code;
        lastScanTime = currentTime;
    }

    // Stop the scanner and hide the scanner section.
    Quagga.stop();
    scannerContainer.classList.add('hidden');
    
    // Optionally, trigger the "Add" button to process the scanned student ID.
    // document.getElementById('add-student-btn').click();
  });
});

// Initialize Page Based on Current Path
function initializePageBasedOnPath() {
  const currentPath = window.location.pathname;
  const eventId = getQueryParam("event_id");

  if (currentPath.includes("user_attendance")) {
    setupUserAttendancePage();
  } else if (currentPath.includes("staff_dashboard")) {
    fetchEvents(`/staff/events?staff_id=${sessionStorage.getItem("staffId")}`);
  } else if (currentPath.includes("staff_attendance")) {
    setupAttendancePage();
  } else if (currentPath.includes("staff_events")) {
    setupEventCreation();
    fetchEvents(`/staff/events?staff_id=${sessionStorage.getItem("staffId")}`);
  } else if (currentPath.includes("user_events")) {
    fetchEvents(`/user/events?user_id=${sessionStorage.getItem("userId")}`);
  } else if (currentPath.includes("event_name") && eventId) {
    fetchAndDisplayStudentIds(eventId);
    setupStudentInput(eventId);
  } else if (currentPath.includes("admin_dashboard")) {
    setupAdminDashboard();
  } else if (currentPath.includes("admin_new_staff")) {
    setupAdminNewStaffPage();
  } else if (currentPath.includes("admin_new_user")) {
    setupAdminNewUserPage();
  } else if (currentPath.includes("admin_edit_staff")) {
    setupAdminEditStaffPage();
  } else if (currentPath.includes("admin_edit_user")) {
    setupAdminEditUserPage();
  } else if (currentPath.includes("admin_event")) {
    setupAdminEventsPage();
  }
}

// Setup Functions
// ---------------

// Existing setup functions...

// Setup Admin Dashboard Page
function setupAdminDashboard() {
  loadStaffData();
  loadUserData();
}

// Setup Admin New Staff Page
function setupAdminNewStaffPage() {
  loadDepartments().then(() => {
    const staffForm = document.getElementById("staff-form");
    if (staffForm) {
      staffForm.addEventListener("submit", addStaff);
    }
  });
}

// Setup Admin New User Page
function setupAdminNewUserPage() {
  loadDepartments().then(() => {
    const userForm = document.getElementById("user-form");
    if (userForm) {
      userForm.addEventListener("submit", addUser);
    }
  });
}

// Setup Admin Edit Staff Page
function setupAdminEditStaffPage() {
  const staffId = getQueryParam("id");
  if (!staffId) {
    alert("Staff ID not found.");
    window.location.href = "admin_dashboard.html";
    return;
  }
  loadDepartments().then(() => {
    fetchStaffDetails(staffId);
  });
}

// Setup Admin Edit User Page
function setupAdminEditUserPage() {
  const userId = getQueryParam("id");
  if (!userId) {
    alert("User ID not found.");
    window.location.href = "admin_dashboard.html";
    return;
  }
  loadDepartments().then(() => {
    fetchUserDetails(userId);
  });
}

// Setup Admin Events Page
function setupAdminEventsPage() {
  loadDepartments().then(() => {
    loadEvents();
  });

  const eventForm = document.getElementById("event-form");
  if (eventForm) {
    eventForm.addEventListener("submit", addEvent);
  }

  const filterDepartment = document.getElementById("filter-department");
  if (filterDepartment) {
    filterDepartment.addEventListener("change", filterEvents);
  }
}

// Setup Event Creation Page (for staff)
function setupEventCreation() {
  const createEventBtn = document.getElementById("create-event-btn");

  if (!createEventBtn) {
    console.warn("Create Event button not found.");
    return;
  }

  createEventBtn.addEventListener("click", async () => {
    const name = document.getElementById("event-name").value.trim();
    const date = document.getElementById("event-date").value;
    const time = document.getElementById("event-time").value;
    const createdBy = sessionStorage.getItem("staffId");
    const departmentId = sessionStorage.getItem("departmentId");

    if (!name || !date || !time) {
      alert("Please fill out all fields (name, date, and time).");
      return;
    }

    if (!createdBy || !departmentId) {
      console.error("Missing staffId or departmentId in sessionStorage.");
      alert("Error: Missing staff or department information.");
      return;
    }

    const deadline = `${date} ${time}:00`; 
    
    try {
      const response = await fetch("/staff/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          date,
          deadline,
          created_by: createdBy,
          department_id: departmentId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Event created successfully!");
        location.reload();
      } else {
        console.error("Backend Error:", data);
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("An error occurred. Please try again.");
    }
  });
}

// Setup Attendance Page (for staff)
function setupAttendancePage() {
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  // Get the search type dropdown element (if present)
  const searchTypeSelect = document.getElementById("search-type");

  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      const searchTerm = searchInput.value.trim();

      if (!searchTerm) {
        alert("Please enter a search term.");
        return;
      }

      // Check if the search type is set to 'name'
      if (searchTypeSelect && searchTypeSelect.value === "name") {
        fetchStudentAttendanceByName(searchTerm);
      } else {
        fetchStudentAttendance(searchTerm);
      }
    });
  } else {
    console.warn("Search button or input not found on this page.");
  }
}

// Setup Student Input Handling
function setupStudentInput(eventId) {
  const addStudentBtn = document.getElementById("add-student-btn");
  const studentIdInput = document.getElementById("student-id");

  if (!addStudentBtn || !studentIdInput) {
    console.warn("Add Student button or input not found.");
    return;
  }

  addStudentBtn.addEventListener("click", async () => {
    const studentId = studentIdInput.value.trim();
    if (validateStudentId(studentId)) {
      const student = await addStudentToAttendance(studentId, eventId);
      if (student) displayStudentDetails(student);
      studentIdInput.value = "";
    } else {
      alert("Invalid Student ID format. Please use xxxx-xxxx-x or xxxxxx format.");
    }
  });

  studentIdInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addStudentBtn.click();
    }
  });
}

// Setup User Attendance Page (for logged-in users)
function setupUserAttendancePage() {
  const studentId = sessionStorage.getItem("studentId");

  // If a student is logged in, display their attendance by default (using their ID)
  if (studentId) {
    fetchStudentAttendance(studentId);
  }

  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  // Get the search type dropdown element
  const searchTypeSelect = document.getElementById("search-type");

  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      const searchTerm = searchInput.value.trim();

      if (!searchTerm) {
        alert("Please enter a search term.");
        return;
      }

      // If the search type is 'name', call the function to search by name.
      if (searchTypeSelect && searchTypeSelect.value === "name") {
        fetchStudentAttendanceByName(searchTerm);
      } else {
        // Otherwise, search by student ID.
        fetchStudentAttendance(searchTerm);
      }
    });
  } else {
    console.warn("Search button or input not found on this page.");
  }
}


// API Functions
// -------------

// Fetch Events and Render Them
async function fetchEvents(endpoint) {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load events.");
    }

    renderEvents(data);
  } catch (error) {
    console.error("Error fetching events:", error);
    alert(error.message);
  }
}

// Fetch Events for Admin
function loadEvents() {
  fetch("/admin/events")
    .then((response) => response.json())
    .then((events) => {
      renderEvents(events);
    })
    .catch((error) => {
      console.error("Error fetching events:", error);
    });
}

// Fetch Attendance Records and Render Them
async function fetchAttendance(eventId) {
  try {
    const response = await fetch(`/staff/attendance/${eventId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch attendance.");
    }

    renderAttendance(data);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    alert(error.message);
  }
}

// Fetch Attendance Records for a Student by their Name
async function fetchStudentAttendanceByName(studentName) {
  const departmentId = sessionStorage.getItem("departmentId");
  if (!departmentId) {
    alert("Department ID is missing. Please log in again.");
    window.location.href = "/login.html";
    return;
  }

  try {
    // Use encodeURIComponent to safely include names with spaces/special characters in the URL
    const response = await fetch(
      `/attendance/student/name/${encodeURIComponent(studentName)}?department_id=${departmentId}`
    );

    const data = await response.json();

    if (!response.ok) {
      alert(
        data.message || "No events found for this student in your department."
      );
      clearAttendanceTable();
      return;
    }

    renderAttendanceRecords(data);
  } catch (error) {
    console.error("Error fetching attendance records by name:", error);
    alert("An error occurred. Please try again.");
  }
}


// Fetch Attendance Records for a Student by their ID
async function fetchStudentAttendance(studentId) {
  const departmentId = sessionStorage.getItem("departmentId");
  if (!departmentId) {
    alert("Department ID is missing. Please log in again.");
    window.location.href = "/login.html";
    return;
  }

  try {
    const response = await fetch(
      `/attendance/student/${studentId}?department_id=${departmentId}`
    );

    const data = await response.json();

    if (!response.ok) {
      alert(
        data.message || "No events found for this student in your department."
      );
      clearAttendanceTable();
      return;
    }

    renderAttendanceRecords(data, studentId);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    alert("An error occurred. Please try again.");
  }
}

// Add Student to Attendance
async function addStudentToAttendance(studentId, eventId) {
  try {
    const response = await fetch("/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, event_id: eventId }),
    });
    if (!response.ok) {
      const data = await response.json();
      alert(data.message || "Attendance error.");
      return null;
    }
    return await response.json(); // student data
  } catch (err) {
    console.error("Error adding student to attendance:", err);
    alert("Server or network error.");
    return null;
  }
}

// Fetch and Display Student IDs for Event
async function fetchAndDisplayStudentIds(eventId) {
  try {
    const response = await fetch(`/attendance/${eventId}`);
    const students = await response.json();

    if (response.ok) {
      if (students.length === 0) {
        displayNoStudentsMessage();
      } else {
        students.forEach((student) => displayStudentDetails(student));
      }
    } else {
      console.error("Failed to fetch student IDs:", students.message);
      alert("Could not load student details.");
    }
  } catch (error) {
    console.error("Error fetching student details:", error);
    alert("An error occurred. Please try again.");
  }
}

/**
 * Send Data to Server (For CSV/Excel Upload)
 * 
 * Now converts each record's attendance_time to a MySQL datetime
 * format before sending.
 */
function sendDataToServer(records) {
  // Extract event ID from URL or wherever you store it
  const eventID = getQueryParam("event_id");

  if (!eventID) {
    console.error("Event ID is missing.");
    alert("Error: Event ID not found.");
    return;
  }

  // Build the payload to match your new backend expectations.
  // For each record, remove extra quotes from student_id and convert
  // attendance_time to MySQL datetime format if available.
  const payload = {
    event_id: eventID,
    records: records.map((item) => ({
      student_id: item.student_id.replace(/['"]+/g, ""),
      attendance_time: item.attendance_time
        ? convertToMySQLDatetime(item.attendance_time)
        : null,
    })),
  };

  console.log("Sending Payload:", payload);

  fetch("/attendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      const data = await response.json();
      if (response.ok) {
        console.log("Data imported successfully:", data);
        alert(data.message || "Bulk attendance records added successfully.");
        location.reload();
      } else {
        console.error("Backend responded with an error:", data);
        alert(`Error: ${data.message}`);
      }
    })
    .catch((error) => {
      console.error("Error importing data:", error);
      alert("An error occurred. Please try again.");
    });
}

// Load and Render Staff Data
function loadStaffData() {
  fetch("/admin/staff")
    .then((response) => response.json())
    .then((staff) => {
      renderStaffData(staff);
    })
    .catch((error) => {
      console.error("Error fetching staff:", error);
    });
}

function renderStaffData(staff) {
  const staffSection = document.getElementById("staff-section");
  if (!staffSection) {
    console.warn("Staff section not found.");
    return;
  }
  staffSection.innerHTML = "";

  const staffByDepartment = groupByDepartment(staff);

  for (const department in staffByDepartment) {
    const staffMembers = staffByDepartment[department];
    const departmentId = department.replace(/\s+/g, "-").toLowerCase();

    const departmentDiv = document.createElement("div");
    departmentDiv.classList.add("mt-6");

    departmentDiv.innerHTML = `
      <h3
        class="text-lg font-semibold cursor-pointer"
        onclick="toggleVisibility('${departmentId}-staff')"
      >
        ${department}
      </h3>
      <div id="${departmentId}-staff" class="mt-2">
        <table class="w-full border table-fixed">
          <thead class="bg-gray-200">
            <tr>
              <th class="border px-4 py-2">Name</th>
              <th class="border px-4 py-2">Email</th>
              <th class="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${staffMembers
              .map(
                (member) => `
              <tr>
                <td class="border px-4 py-2">${member.name}</td>
                <td class="border px-4 py-2">${member.email}</td>
                <td class="border px-4 py-2 text-center">
                  <button
                    class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-800 mr-2"
                    onclick="editStaff(${member.id})"
                  >
                    Edit
                  </button>
                  <button
                    class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-800"
                    onclick="removeStaff(${member.id})"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    staffSection.appendChild(departmentDiv);
  }
}

// Load and Render User Data
function loadUserData() {
  fetch("/admin/users")
    .then((response) => response.json())
    .then((users) => {
      renderUserData(users);
    })
    .catch((error) => {
      console.error("Error fetching users:", error);
    });
}

function renderUserData(users) {
  const usersSection = document.getElementById("users-section");
  if (!usersSection) {
    console.warn("Users section not found.");
    return;
  }
  usersSection.innerHTML = "";

  const usersByDepartment = groupByDepartment(users);

  for (const department in usersByDepartment) {
    const userList = usersByDepartment[department];
    const departmentId = department.replace(/\s+/g, "-").toLowerCase();

    const departmentDiv = document.createElement("div");
    departmentDiv.classList.add("mt-6");

    departmentDiv.innerHTML = `
      <h3
        class="text-lg font-semibold cursor-pointer"
        onclick="toggleVisibility('${departmentId}-users')"
      >
        ${department}
      </h3>
      <div id="${departmentId}-users" class="mt-2">
        <table class="w-full border table-fixed">
          <thead class="bg-gray-200">
            <tr>
              <th class="border px-4 py-2">Name</th>
              <th class="border px-4 py-2">Email</th>
              <th class="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${userList
              .map(
                (user) => `
              <tr>
                <td class="border px-4 py-2">${user.name}</td>
                <td class="border px-4 py-2">${user.email}</td>
                <td class="border px-4 py-2 text-center">
                  <button
                    class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-800 mr-2"
                    onclick="editUser(${user.id})"
                  >
                    Edit
                  </button>
                  <button
                    class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-800"
                    onclick="removeUser(${user.id})"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    usersSection.appendChild(departmentDiv);
  }
}

// Utility Function to Group Data by Department
function groupByDepartment(data) {
  return data.reduce((result, item) => {
    (result[item.department_name] = result[item.department_name] || []).push(item);
    return result;
  }, {});
}

// Toggle Visibility of Department Sections
function toggleVisibility(id) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.toggle("hidden");
  }
}

// Action Functions for Admin
function editStaff(id) {
  window.location.href = `admin_edit_staff.html?id=${id}`;
}

function removeStaff(id) {
  if (confirm("Are you sure you want to remove this staff member?")) {
    fetch(`/admin/staff/${id}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((result) => {
        alert(result.message);
        loadStaffData();
      })
      .catch((error) => console.error("Error deleting staff:", error));
  }
}

function editUser(id) {
  window.location.href = `admin_edit_user.html?id=${id}`;
}

function removeUser(id) {
  if (confirm("Are you sure you want to remove this user?")) {
    fetch(`/admin/users/${id}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((result) => {
        alert(result.message);
        loadUserData();
      })
      .catch((error) => console.error("Error deleting user:", error));
  }
}

// Load Departments for Dropdowns
function loadDepartments() {
  return fetch("/departments")
    .then((response) => response.json())
    .then((departments) => {
      const departmentSelects = document.querySelectorAll(
        "#department_id, #filter-department"
      );
      departmentSelects.forEach((select) => {
        if (select) {
          departments.forEach((dept) => {
            const option = document.createElement("option");
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
          });
        }
      });
    })
    .catch((error) => {
      console.error("Error fetching departments:", error);
    });
}

// Add New Staff
function addStaff(event) {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const department_id = document.getElementById("department_id").value;
  const password = document.getElementById("password").value;

  if (!password) {
    alert("Password is required.");
    return;
  }

  fetch("/admin/staff", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, department_id, password }),
  })
    .then((response) => response.json())
    .then((result) => {
      alert(result.message);
      window.location.href = "admin_dashboard.html";
    })
    .catch((error) => {
      console.error("Error adding staff:", error);
    });
}

// Add New User
function addUser(event) {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const department_id = document.getElementById("department_id").value;
  const password = document.getElementById("password").value;

  // Check for empty fields
  if (!name || !email || !password || !department_id) {
    alert("All fields are required.");
    return;
  }

  fetch("/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, department_id, password }),
  })
    .then((response) => {
      return response.json().then((result) => {
        return { response, result };
      });
    })
    .then(({ response, result }) => {
      if (response.ok) {
        alert(result.message);
        window.location.href = "admin_dashboard.html";
      } else {
        alert(`Error: ${result.message}`);
      }
    })
    .catch((error) => {
      console.error("Error adding user:", error);
    });
}

// Fetch and Populate Staff Details for Editing
function fetchStaffDetails(staffId) {
  fetch(`/admin/staff/${staffId}`)
    .then((response) => response.json())
    .then((staff) => {
      document.getElementById("name").value = staff.name;
      document.getElementById("email").value = staff.email;
      document.getElementById("department_id").value = staff.department_id;

      const staffForm = document.getElementById("staff-form");
      if (staffForm) {
        staffForm.addEventListener("submit", (event) =>
          updateStaff(event, staffId)
        );
      }
    })
    .catch((error) => {
      console.error("Error fetching staff details:", error);
    });
}

// Update Staff Details
function updateStaff(event, staffId) {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const department_id = document.getElementById("department_id").value;
  const password = document.getElementById("password").value;

  const payload = { name, email, department_id };
  if (password) {
    payload.password = password;
  }

  fetch(`/admin/staff/${staffId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((result) => {
      alert(result.message);
      window.location.href = "admin_dashboard.html";
    })
    .catch((error) => {
      console.error("Error updating staff:", error);
    });
}

// Fetch and Populate User Details for Editing
function fetchUserDetails(userId) {
  fetch(`/admin/users/${userId}`)
    .then((response) => response.json())
    .then((user) => {
      document.getElementById("name").value = user.name;
      document.getElementById("email").value = user.email;
      document.getElementById("department_id").value = user.department_id;

      const userForm = document.getElementById("user-form");
      if (userForm) {
        userForm.addEventListener("submit", (event) =>
          updateUser(event, userId)
        );
      }
    })
    .catch((error) => {
      console.error("Error fetching user details:", error);
    });
}

// Update User Details
function updateUser(event, userId) {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const department_id = document.getElementById("department_id").value;
  const password = document.getElementById("password").value;

  const payload = { name, email, department_id };
  if (password) {
    payload.password = password;
  }

  fetch(`/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((result) => {
      alert(result.message);
      window.location.href = "admin_dashboard.html";
    })
    .catch((error) => {
      console.error("Error updating user:", error);
    });
}

// Add New Event (Admin)
function addEvent(event) {
  event.preventDefault();
  const name = document.getElementById("event-name").value.trim();
  const date = document.getElementById("event-date").value;
  const department_id = document.getElementById("department_id").value;

  if (!name || !date || !department_id) {
    alert("All fields are required.");
    return;
  }

  fetch("/admin/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, date, department_id }),
  })
    .then((response) => {
      return response.json().then((result) => {
        return { response, result };
      });
    })
    .then(({ response, result }) => {
      if (response.ok) {
        alert(result.message);
        loadEvents();
        event.target.reset();
      } else {
        alert(`Error: ${result.message}`);
      }
    })
    .catch((error) => {
      console.error("Error adding event:", error);
    });
}

// Delete Event (Admin)
function deleteEvent(eventId) {
  if (!confirm("Are you sure you want to delete this event?")) {
    return;
  }

  fetch(`/admin/events/${eventId}`, {
    method: "DELETE",
  })
    .then((response) => response.json())
    .then((result) => {
      alert(result.message);
      loadEvents();
    })
    .catch((error) => {
      console.error("Error deleting event:", error);
    });
}

// Edit Event (Admin)
function editEvent(eventId) {
  window.location.href = `admin_edit_event.html?id=${eventId}`;
}

// Filter Events by Department (Admin)
function filterEvents() {
  const departmentId = document.getElementById("filter-department").value;

  fetch("/admin/events")
    .then((response) => response.json())
    .then((events) => {
      if (departmentId) {
        events = events.filter((event) => event.department_id == departmentId);
      }
      renderEvents(events);
    })
    .catch((error) => {
      console.error("Error filtering events:", error);
    });
}

// DOM Manipulation Functions
// --------------------------

// Render Events into the Table
function renderEvents(events) {
  const tableBody = document.querySelector("#events-table tbody");
  if (!tableBody) {
    console.warn("Events table not found.");
    return;
  }
  tableBody.innerHTML = "";

  const currentPath = window.location.pathname;
  const isStaffPage = currentPath.includes("staff_events");
  const isAdminPage = currentPath.includes("admin_event");

  if (events.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="${
      isStaffPage ? 4 : 3
    }" class="text-center p-4">No events available.</td></tr>`;
    return;
  }

  events.forEach((event) => {
    const row = document.createElement("tr");
    row.classList.add("border-b", "hover:bg-gray-100");

    let rowContent = `
      <td class="p-4">${event.id}</td>
      <td class="p-4">
        <a href="/event_name.html?event_id=${encodeURIComponent(
          event.id
        )}" class="text-blue-500 hover:underline">${event.name}</a>
      </td>
      <td class="p-4">${new Date(event.date).toLocaleDateString()}</td>
    `;

    if (isStaffPage || isAdminPage) {
      rowContent += `
        <td class="p-4 flex space-x-2 justify-center">
          <button class="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded"
            onclick="deleteEvent(${event.id})">
            Delete
          </button>
        </td>
      `;
    }

    row.innerHTML = rowContent;

    tableBody.appendChild(row);
  });
}

// Render Attendance Records
function renderAttendance(records) {
  const tableBody = document
    .getElementById("attendance-table")
    .getElementsByTagName("tbody")[0];

  if (!tableBody) {
    console.warn("Attendance table body not found.");
    return;
  }

  tableBody.innerHTML = "";

  if (records.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="2" class="text-center p-4">No attendance records found.</td></tr>`;
    return;
  }

  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border px-4 py-2">${record.user_name}</td>
      <td class="border px-4 py-2">${new Date(
        record.attended_on
      ).toLocaleDateString()}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Render Attendance Records into the Table
function renderAttendanceRecords(records, studentId) {
  const attendanceBody = document.getElementById("attendance-body");
  if (!attendanceBody) {
    console.warn("Attendance body not found.");
    return;
  }
  attendanceBody.innerHTML = "";

  if (records.length === 0) {
    attendanceBody.innerHTML = `<tr><td colspan="6" class="text-center p-4">No events found.</td></tr>`;
    return;
  }

  records.forEach((record) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="border px-4 py-2">${record.student_id || studentId}</td>
      <td class="border px-4 py-2">${record.student_name || "N/A"}</td>
      <td class="border px-4 py-2">${record.course || "N/A"}</td>
      <td class="border px-4 py-2">${record.year_level || "N/A"}</td>
      <td class="border px-4 py-2">${record.event_name || "N/A"}</td>
      <td class="border px-4 py-2">${
        record.event_date
          ? new Date(record.event_date).toLocaleDateString()
          : "N/A"
      }</td>
    `;

    attendanceBody.appendChild(row);
  });
}

// Clear Attendance Table
function clearAttendanceTable() {
  const attendanceBody = document.getElementById("attendance-body");
  if (attendanceBody) {
    attendanceBody.innerHTML = `<tr><td colspan="6" class="text-center p-4">No events found.</td></tr>`;
  }
}

// Display Student Details
function displayStudentDetails(student) {
  const studentList = document.getElementById("student-id-list");
  if (!studentList) {
    console.warn("Student list element not found.");
    return;
  }

  const listItem = document.createElement("li");
  listItem.classList.add("p-2", "border-b", "border-gray-300");

  listItem.innerHTML = `
    <strong>ID:</strong> ${student.student_id || "N/A"} <br />
    <strong>Name:</strong> ${student.name || "N/A"} <br />
    <strong>Course:</strong> ${student.course || "N/A"} <br />
    <strong>Year Level:</strong> ${student.year_level || "N/A"}
  `;

  studentList.appendChild(listItem);
}

// Display Message When No Students are Found
function displayNoStudentsMessage() {
  const studentList = document.getElementById("student-id-list");
  if (studentList) {
    studentList.innerHTML = `<li class="p-2 text-center">No students have attended this event yet.</li>`;
  }
}

// Event Listener for Reading Excel/CSV Files
const readExcelButton = document.getElementById("read-excel");

if (readExcelButton) {
  readExcelButton.addEventListener("click", function () {
    const fileInput = document.getElementById("excel-file");
    const file = fileInput.files[0];

    if (!file) {
      console.error("No file selected.");
      return;
    }

    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (fileExtension === "xlsx") {
      // Handle Excel file
      const reader = new FileReader();
      reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Build array of { student_id, attendance_time }
        const records = [];
        const range = XLSX.utils.decode_range(sheet["!ref"]);

        // Example: start from row 3 (row index 3 for 0-based index)
        for (let rowNum = 3; rowNum <= range.e.r; rowNum++) {
          // Column B -> student_id
          const studentIdCellAddr = XLSX.utils.encode_cell({ r: rowNum, c: 1 }); // B
          const studentIdCell = sheet[studentIdCellAddr];
          const studentIdVal = studentIdCell ? studentIdCell.v : undefined;

          // Column D -> attendance_time
          const timeCellAddr = XLSX.utils.encode_cell({ r: rowNum, c: 3 }); // D
          const timeCell = sheet[timeCellAddr];
          const timeVal = timeCell ? timeCell.v : undefined;

          if (studentIdVal !== undefined) {
            records.push({
              student_id: studentIdVal.toString().trim(),
              attendance_time: timeVal ? timeVal.toString().trim() : null,
            });
          }
        }

        console.log("Extracted Records (Excel):", records);
        sendDataToServer(records);
      };
      reader.readAsArrayBuffer(file);

    } else if (fileExtension === "csv") {
      // Handle CSV file
      const reader = new FileReader();
      reader.onload = function (event) {
        const csvData = event.target.result;
        const rows = csvData.split("\n");

        const records = [];
        // Start from row 3 (i.e. the 4th row in your CSV)
        for (let i = 3; i < rows.length; i++) {
          const columns = rows[i].split(",");
          // columns[1] => student_id (col B), columns[3] => attendance_time (col D)
          const studentIdVal = columns[1] ? columns[1].trim() : null;
          const timeVal = columns[3] ? columns[3].trim() : null;

          if (studentIdVal) {
            records.push({
              student_id: studentIdVal,
              attendance_time: timeVal || null,
            });
          }
        }

        console.log("Extracted Records (CSV):", records);
        sendDataToServer(records);
      };
      reader.readAsText(file);

    } else {
      console.error("Unsupported file format. Please upload an Excel or CSV file.");
    }
  });
}
