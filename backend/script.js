// Utility: Get Query Parameters from URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Utility: Extract Event ID from URL
function getEventIdFromUrl() {
  return getQueryParam("event_id");
}

// Utility: Logout Function
function logout() {
  sessionStorage.clear();
  localStorage.clear();
  window.location.href = "/login.html";
}

// Utility: Render Sidebar Based on Role

function renderSidebar() {
  const role = sessionStorage.getItem("role"); // Get role from session storage
  const sidebar = document.getElementById("sidebar");

  let sidebarContent = "";

  if (role === "admin") {
    sidebarContent = `
      <div class="p-4">
        <h2 class="text-lg font-bold">Admin Dashboard</h2>
        <ul class="mt-4 space-y-3">
          <li><a href="/html/admin/admin_dashboard.html" class="hover:text-blue-300">Dashboard</a></li>
          <li><a href="/html/admin/admin_event.html" class="hover:text-blue-300">Manage Events</a></li>
          <li><a href="/html/admin/admin_new_staff.html" class="hover:text-blue-300">Add New Staff</a></li>
          <li><a href="/html/admin/admin_new_user.html" class="hover:text-blue-300">Add New User</a></li>
        </ul>
      </div>
      <div class="p-4">
        <button onclick="logout()" class="w-full bg-red-500 text-white py-1 rounded-lg hover:bg-red-700">
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
        <button onclick="logout()" class="w-full bg-red-500 text-white py-1 rounded-lg hover:bg-red-700">
          Logout
        </button>
      </div>`;
  } else if (role === "user") {
    sidebarContent = `
      <div class="p-4">
        <h2 class="text-lg font-bold">User Dashboard</h2>
        <ul class="mt-4 space-y-3">
          <li><a href="/html/user/user_events.html" class="hover:text-blue-300">Events</a></li>
        </ul>
      </div>
      <div class="p-4">
        <button onclick="logout()" class="w-full bg-red-500 text-white py-1 rounded-lg hover:bg-red-700">
          Logout
        </button>
      </div>`;
  } else {
    console.error("Role not found in session storage.");
    alert("Session expired. Please log in again.");
    window.location.href = "/login.html";
  }

  sidebar.innerHTML = sidebarContent;
}

// Utility: Logout Function
function logout() {
  sessionStorage.clear();
  window.location.href = "/login.html";
}

// Utility: Logout Function
function logout() {
  sessionStorage.clear();
  window.location.href = "/login.html";
}

// Initialize Sidebar Rendering
document.addEventListener("DOMContentLoaded", () => {
  renderSidebar();
});

// Event: Initialize Event Details Page
function initEventDetailsPage() {
  const eventId = getEventIdFromUrl();
  if (eventId) {
    fetchEventDetails(eventId);
  } else {
    console.error("No event ID provided.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const staffId = sessionStorage.getItem("staffId");
  if (staffId) {
    fetchEvents(`/staff/events?staff_id=${staffId}`);
  }
});

// Fetch and Render Event Details
async function fetchEventDetails(eventId) {
  try {
    const response = await fetch(`/events/${eventId}`);
    if (response.ok) {
      const event = await response.json();
      document.getElementById("event-name").textContent = event.name;
      document.getElementById("event-date").textContent = new Date(
        event.date
      ).toLocaleDateString();
      document.getElementById("event-description").textContent =
        event.description || "No description available.";
    } else {
      console.error("Failed to fetch event details.");
    }
  } catch (error) {
    console.error("Error fetching event details:", error);
  }
}

// Render Events into the Table
function renderEvents(events) {
  const tableBody = document.getElementById("events-table");
  tableBody.innerHTML = "";

  if (events.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4">No events available.</td></tr>`;
    return;
  }

  events.forEach((event) => {
    const row = document.createElement("tr");
    row.classList.add("border-b", "hover:bg-gray-100");

    row.innerHTML = `
      <td class="p-4">${event.id}</td>
      <td class="p-4">
        <a href="/event_name.html?event_id=${
          event.id
        }" class="text-blue-500 hover:underline">${event.name}</a>
      </td>
      <td class="p-4">${new Date(event.date).toLocaleDateString()}</td>
      <td class="p-4">
        <button class="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded"
          data-event-id="${event.id}">
          Delete
        </button>
      </td>
    `;

    // Add event listener for the delete button
    const deleteButton = row.querySelector("button[data-event-id]");
    deleteButton.addEventListener("click", () =>
      deleteEvent(deleteButton.getAttribute("data-event-id"))
    );

    tableBody.appendChild(row);
  });
}

// Fetch Events for Staff or Users
async function fetchEvents(endpoint) {
  console.log("Fetching events from:", endpoint); // Debugging log

  try {
    const response = await fetch(endpoint);
    if (response.ok) {
      const events = await response.json();
      console.log("Fetched Events:", events); // Debugging log
      renderEvents(events); // Render events in the table
    } else {
      console.error("Failed to fetch events.");
      alert("Could not load events.");
    }
  } catch (error) {
    console.error("Error fetching events:", error);
  }
}

// Fetch Attendance Records and Render
async function fetchAttendance(eventId) {
  try {
    const response = await fetch(`/staff/attendance/${eventId}`);
    const attendance = await response.json();
    renderAttendance(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
  }
}

// Render Attendance Records in the Table
function renderAttendance(attendance) {
  const tableBody = document
    .getElementById("attendance-table")
    .getElementsByTagName("tbody")[0];
  tableBody.innerHTML = "";

  if (attendance.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center">No attendance records found.</td></tr>`;
    return;
  }

  attendance.forEach((record) => {
    const row = `
      <tr>
        <td>${record.user_name}</td>
        <td>${new Date(record.attended_on).toLocaleDateString()}</td>
      </tr>`;
    tableBody.innerHTML += row;
  });
}

// Setup Event Creation Form
function setupEventCreation() {
  const form = document.getElementById("event-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const eventName = document.getElementById("event-name").value;
    const eventDate = document.getElementById("event-date").value;
    await createEvent(eventName, eventDate);
  });
}

// Create a New Event
async function createEvent(eventName, eventDate) {
  const staffId = sessionStorage.getItem("staffId");
  const departmentId = sessionStorage.getItem("departmentId");

  if (!departmentId) {
    console.error("Department ID is undefined!");
    alert("Error: Department ID is missing. Please log in again.");
    window.location.href = "/login.html"; // Redirect to login
    return;
  }

  try {
    const response = await fetch("/staff/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: eventName,
        date: eventDate,
        created_by: staffId,
        department_id: departmentId,
      }),
    });

    if (response.ok) {
      alert("Event created successfully!");
      fetchEvents(`/staff/events?staff_id=${staffId}`);
    } else {
      const errorData = await response.json();
      console.error("Failed to create event:", errorData);
      alert("Failed to create event.");
    }
  } catch (error) {
    console.error("Error creating event:", error);
  }
}

// Check if departmentId is available in sessionStorage
console.log("Department ID:", sessionStorage.getItem("departmentId"));

// Delete an Event
async function deleteEvent(eventId) {
  if (!confirm("Are you sure you want to delete this event?")) return;

  try {
    const response = await fetch(`/staff/events/${eventId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      alert("Event deleted successfully!");
      const staffId = sessionStorage.getItem("staffId");
      fetchEvents(`/staff/events?staff_id=${staffId}`); // Refresh events after deletion
    } else {
      const errorData = await response.json();
      console.error("Failed to delete event:", errorData.message);
      alert("Failed to delete event: " + errorData.message);
    }
  } catch (error) {
    console.error("Error deleting event:", error);
    alert("An error occurred while deleting the event.");
  }
}

function setupStudentInput(eventId) {
  const addStudentBtn = document.getElementById("add-student-btn");
  const studentIdInput = document.getElementById("student-id");

  addStudentBtn.addEventListener("click", async () => {
    const studentId = studentIdInput.value.trim();

    if (validateStudentId(studentId)) {
      await addStudentToAttendance(studentId, eventId);
      displayStudentId(studentId);
      studentIdInput.value = ""; // Clear input field
    } else {
      alert("Invalid Student ID format. Please use xxxx-xxxx-x format.");
    }
  });
}

// Validate the Student ID Format
function validateStudentId(studentId) {
  const regex = /^[0-9]{4}-[0-9]{4}-[0-9]$/;
  return regex.test(studentId);
}

// Send Attendance Data to Backend
async function addStudentToAttendance(studentId, eventId) {
  try {
    const response = await fetch("/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, event_id: eventId }),
    });

    if (response.ok) {
    } else {
      const errorData = await response.json();
      console.error("Backend Error:", errorData);
      alert(`Failed to add student: ${errorData.message}`);
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    alert("An error occurred. Please try again.");
  }
}

// Display the Added Student ID in the List
function displayStudentId(studentId) {
  const studentList = document.getElementById("student-id-list");
  const listItem = document.createElement("li");
  listItem.textContent = studentId;
  studentList.appendChild(listItem);
}

// Add Event Listeners for the "Add" Button
document.addEventListener("DOMContentLoaded", () => {
  const addStudentBtn = document.getElementById("add-student-btn");
  const studentIdInput = document.getElementById("student-id");
  const studentList = document.getElementById("student-id-list");

  // Fetch the event ID from the URL
  const eventId = getQueryParam("event_id");

  addStudentBtn.addEventListener("click", async () => {
    const studentId = studentIdInput.value.trim();

    if (validateStudentId(studentId)) {
      await addStudentToAttendance(studentId, eventId);
      displayStudentId(studentId);
      studentIdInput.value = ""; // Clear input field
    } else {
      alert("Invalid Student ID format. Please use xxxx-xxxx-x format.");
    }
  });
});

// Display a Single Student ID in the List
function displayStudentId(studentId) {
  const studentList = document.getElementById("student-id-list");
  const listItem = document.createElement("li");
  listItem.textContent = studentId;
  studentList.appendChild(listItem);
}

document.addEventListener("DOMContentLoaded", async () => {
  renderSidebar(); // Render the sidebar
  const eventId = getQueryParam("event_id"); // Get event ID from the URL

  if (eventId) {
    await fetchAndDisplayStudentIds(eventId); // Fetch and display student IDs for this event
  }

  const addStudentBtn = document.getElementById("add-student-btn");
  const studentIdInput = document.getElementById("student-id");

  // Listen for click on "Add" button
  addStudentBtn.addEventListener("click", () =>
    handleAddStudent(studentIdInput, eventId)
  );

  // Listen for "Enter" key press in the input field
  studentIdInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission (if inside a form)
      handleAddStudent(studentIdInput, eventId);
    }
  });
});

// Handle adding the student ID
function handleAddStudent(studentIdInput, eventId) {
  const studentId = studentIdInput.value.trim(); // Get and trim the input value

  if (validateStudentId(studentId)) {
    addStudentToAttendance(studentId, eventId); // Call the backend
    displayStudentId(studentId); // Display the student ID
    studentIdInput.value = ""; // Clear the input field
  } else {
    alert("Invalid Student ID format. Please use xxxx-xxxx-x format.");
  }
}

// Validate the Student ID Format
function validateStudentId(studentId) {
  const regex = /^[0-9]{4}-[0-9]{4}-[0-9]$/;
  return regex.test(studentId);
}

// Send Attendance Data to Backend
async function addStudentToAttendance(studentId, eventId) {
  try {
    const response = await fetch("/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, event_id: eventId }),
    });

    if (response.ok) {
    } else {
      const errorData = await response.json();
      console.error("Backend Error:", errorData);
      alert(`Failed to add student: ${errorData.message}`);
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    alert("An error occurred. Please try again.");
  }
}

// Display the Added Student ID in the List
function displayStudentId(studentId) {
  const studentList = document.getElementById("student-id-list");
  const listItem = document.createElement("li");
  listItem.textContent = studentId;
  studentList.appendChild(listItem);
}

// Fetch Student IDs for the Event from Backend
async function fetchAndDisplayStudentIds(eventId) {
  try {
    const response = await fetch(`/attendance/${eventId}`);
    const students = await response.json();

    if (response.ok) {
      if (students.length === 0) {
        displayNoStudentsMessage();
      } else {
        students.forEach((student) => displayStudentId(student.student_id));
      }
    } else {
      console.error("Failed to fetch student IDs:", students.message);
      alert("Could not load student IDs.");
    }
  } catch (error) {
    console.error("Error fetching student IDs:", error);
    alert("An error occurred. Please try again.");
  }
}

// Display No Students Message
function displayNoStudentsMessage() {
  const studentList = document.getElementById("student-id-list");
  const listItem = document.createElement("li");
  listItem.textContent = "No students have attended this event.";
  studentList.appendChild(listItem);
}

// Initialize Pages Based on the Current Path
document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;

  if (currentPath.includes("staff_dashboard")) {
    fetchEvents("/staff/events?staff_id=" + sessionStorage.getItem("staffId"));
  } else if (currentPath.includes("staff_attendance")) {
    fetchAttendance(getEventIdFromUrl());
  } else if (currentPath.includes("staff_events")) {
    setupEventCreation();
    fetchEvents("/staff/events?staff_id=" + sessionStorage.getItem("staffId"));
  } else if (currentPath.includes("user_events")) {
    fetchEvents("/user/events?user_id=" + sessionStorage.getItem("userId"));
  } else if (currentPath.includes("user_attendance")) {
    fetchAttendance(sessionStorage.getItem("userId"));
  } else if (currentPath.includes("event_name")) {
    renderSidebar();
    initEventDetailsPage();
  }
});
