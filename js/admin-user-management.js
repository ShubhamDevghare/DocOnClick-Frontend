import { checkAuth, apiRequest, showNotification, API_ENDPOINTS, formatDate, formatDateTime } from "./config.js"

let currentPage = 0
const currentSize = 10
let currentFilters = {}
let isEditMode = false

// Check authentication on page load
document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return

  initializePage()
})

async function initializePage() {
  try {
    await loadUsers()
    setupEventListeners()
  } catch (error) {
    console.error("Error initializing page:", error)
    showNotification("Error loading page data", "error")
  }
}

async function loadUsers() {
  try {
    showLoading()

    const users = await apiRequest(API_ENDPOINTS.users.base)
    displayUsers(users)
  } catch (error) {
    console.error("Error loading users:", error)
    showNotification("Error loading users", "error")
    hideLoading()
  }
}

function displayUsers(users) {
  const tbody = document.getElementById("usersTableBody")

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No users found</td></tr>'
    hideLoading()
    return
  }

  tbody.innerHTML = users
    .map(
      (user) => `
        <tr>
            <td>${user.userId}</td>
            <td>${user.fullName}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td><span class="status-badge status-${user.role.toLowerCase()}">${user.role}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewUserAppointments(${user.userId})">
                    <i class="fas fa-calendar"></i> View
                </button>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="flex gap-1">
                    <button class="btn btn-sm btn-primary" onclick="viewUserDetails(${user.userId})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editUser(${user.userId})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.userId})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `,
    )
    .join("")

  hideLoading()
}

function setupEventListeners() {
  // User form submit
  document.getElementById("userForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    try {
      const formData = new FormData()

      // Create user data object
      const userData = {
        fullName: document.getElementById("fullName").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        address: document.getElementById("address").value.trim(),
        role: document.getElementById("role").value,
        password: document.getElementById("password").value,
      }

      // Add optional fields
      const gender = document.getElementById("gender").value
      const dateOfBirth = document.getElementById("dateOfBirth").value

      if (gender) userData.gender = gender
      if (dateOfBirth) userData.dateOfBirth = dateOfBirth

      // Validate required fields
      if (
        !userData.fullName ||
        !userData.email ||
        !userData.phone ||
        !userData.address ||
        !userData.role ||
        !userData.password
      ) {
        showNotification("Please fill in all required fields", "error")
        return
      }

      // Append user data as JSON blob
      formData.append(
        "userData",
        new Blob([JSON.stringify(userData)], {
          type: "application/json",
        }),
      )

      // Append profile image if selected
      const profileImageFile = document.getElementById("profileImage").files[0]
      if (profileImageFile) {
        formData.append("profileImage", profileImageFile)
      }

      const userId = document.getElementById("userId").value

      if (isEditMode && userId) {
        // Update user
        const response = await fetch(`http://127.0.0.1:8080/api/v1/users/${userId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(errorData || "Failed to update user")
        }

        showNotification("User updated successfully", "success")
      } else {
        // Create user
        const response = await fetch("http://127.0.0.1:8080/api/v1/users/signup", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(errorData || "Failed to create user")
        }

        showNotification("User created successfully", "success")
      }

      closeCreateUserModal()
      loadUsers()
    } catch (error) {
      console.error("Error saving user:", error)
      showNotification("Error saving user: " + error.message, "error")
    }
  })
}

window.searchUsers = () => {
  const searchName = document.getElementById("searchByName").value.trim()
  const searchId = document.getElementById("searchByUserId").value.trim()

  currentFilters.searchName = searchName
  currentFilters.searchId = searchId
  currentPage = 0

  if (searchName || searchId) {
    searchUsersWithFilters()
  } else {
    loadUsers()
  }
}

async function searchUsersWithFilters() {
  try {
    showLoading()

    // For now, we'll filter on the frontend since the backend doesn't have search endpoints
    const allUsers = await apiRequest(API_ENDPOINTS.users.base)
    let filteredUsers = allUsers

    if (currentFilters.searchName) {
      filteredUsers = filteredUsers.filter((user) =>
        user.fullName.toLowerCase().includes(currentFilters.searchName.toLowerCase()),
      )
    }

    if (currentFilters.searchId) {
      filteredUsers = filteredUsers.filter((user) => user.userId.toString().includes(currentFilters.searchId))
    }

    if (currentFilters.role) {
      filteredUsers = filteredUsers.filter((user) => user.role === currentFilters.role)
    }

    displayUsers(filteredUsers)
  } catch (error) {
    console.error("Error searching users:", error)
    showNotification("Error searching users", "error")
    hideLoading()
  }
}

window.filterUsers = () => {
  const role = document.getElementById("filterByRole").value
  const status = document.getElementById("filterByStatus").value

  currentFilters.role = role
  currentFilters.status = status
  currentPage = 0

  searchUsersWithFilters()
}

window.refreshUsers = () => {
  currentPage = 0
  currentFilters = {}

  // Clear search inputs
  document.getElementById("searchByName").value = ""
  document.getElementById("searchByUserId").value = ""
  document.getElementById("filterByRole").value = ""
  document.getElementById("filterByStatus").value = ""

  loadUsers()
  showNotification("Users list refreshed", "success")
}

window.viewUserDetails = async (userId) => {
  try {
    const user = await apiRequest(`${API_ENDPOINTS.users.base}/${userId}`)

    const modalBody = document.getElementById("userModalBody")
    modalBody.innerHTML = `
            <div class="patient-details">
                <div class="patient-info">
                    <div class="info-item">
                        <span class="info-label">User ID</span>
                        <span class="info-value">${user.userId}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Full Name</span>
                        <span class="info-value">${user.fullName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Email</span>
                        <span class="info-value">${user.email}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Phone</span>
                        <span class="info-value">${user.phone}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Role</span>
                        <span class="info-value">
                            <span class="status-badge status-${user.role.toLowerCase()}">${user.role}</span>
                        </span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Gender</span>
                        <span class="info-value">${user.gender || "Not specified"}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Date of Birth</span>
                        <span class="info-value">${user.dateOfBirth ? formatDate(user.dateOfBirth) : "Not specified"}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Address</span>
                        <span class="info-value">${user.address}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Registered</span>
                        <span class="info-value">${formatDateTime(user.createdAt)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Last Updated</span>
                        <span class="info-value">${formatDateTime(user.updatedAt)}</span>
                    </div>
                </div>
                
                <div class="appointments-section">
                    <h3>Appointment History</h3>
                    <div id="userAppointments">Loading...</div>
                </div>
            </div>
        `

    document.getElementById("userModal").style.display = "block"

    // Load user appointments
    loadUserAppointments(userId)
  } catch (error) {
    console.error("Error loading user details:", error)
    showNotification("Error loading user details", "error")
  }
}

async function loadUserAppointments(userId) {
  try {
    const appointments = await apiRequest(`${API_ENDPOINTS.appointments.base}/user/${userId}?size=5`)
    const appointmentsContainer = document.getElementById("userAppointments")

    if (!appointments.content || appointments.content.length === 0) {
      appointmentsContainer.innerHTML = "<p>No appointments found</p>"
      return
    }

    appointmentsContainer.innerHTML = appointments.content
      .map(
        (appointment) => `
            <div class="appointment-card">
                <div class="appointment-header">
                    <span class="appointment-doctor">Dr. ${appointment.doctorName}</span>
                    <span class="appointment-date">${formatDate(appointment.appointmentDate)}</span>
                </div>
                <div class="appointment-details">
                    <span>Patient: ${appointment.patientName}</span>
                    <span>Status: <span class="status-badge status-${appointment.appointmentStatus.toLowerCase()}">${appointment.appointmentStatus}</span></span>
                    <span>Payment: <span class="status-badge status-${appointment.paymentStatus.toLowerCase()}">${appointment.paymentStatus}</span></span>
                </div>
            </div>
        `,
      )
      .join("")
  } catch (error) {
    console.error("Error loading user appointments:", error)
    document.getElementById("userAppointments").innerHTML = "<p>Error loading appointments</p>"
  }
}

window.viewUserAppointments = async (userId) => {
  try {
    const appointments = await apiRequest(`${API_ENDPOINTS.appointments.base}/user/${userId}`)
    const count = appointments.totalElements || appointments.length || 0
    showNotification(`This user has ${count} total appointments`, "info")
  } catch (error) {
    console.error("Error loading user appointments:", error)
    showNotification("Error loading appointment count", "error")
  }
}

window.openCreateUserModal = () => {
  isEditMode = false
  document.getElementById("userFormTitle").textContent = "Create User"
  document.getElementById("userForm").reset()
  document.getElementById("userId").value = ""
  document.getElementById("createUserModal").style.display = "block"
}

window.editUser = async (userId) => {
  try {
    const user = await apiRequest(`${API_ENDPOINTS.users.base}/${userId}`)

    isEditMode = true
    document.getElementById("userFormTitle").textContent = "Edit User"
    document.getElementById("userId").value = user.userId
    document.getElementById("fullName").value = user.fullName
    document.getElementById("email").value = user.email
    document.getElementById("phone").value = user.phone
    document.getElementById("address").value = user.address
    document.getElementById("role").value = user.role
    document.getElementById("gender").value = user.gender || ""
    document.getElementById("dateOfBirth").value = user.dateOfBirth || ""
    document.getElementById("password").value = "" // Don't populate password for security

    document.getElementById("createUserModal").style.display = "block"
  } catch (error) {
    console.error("Error loading user for edit:", error)
    showNotification("Error loading user details", "error")
  }
}

window.deleteUser = async (userId) => {
  if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
    return
  }

  try {
    await apiRequest(`${API_ENDPOINTS.users.base}/${userId}`, {
      method: "DELETE",
    })

    showNotification("User deleted successfully", "success")
    loadUsers()
  } catch (error) {
    console.error("Error deleting user:", error)
    showNotification("Error deleting user: " + error.message, "error")
  }
}

window.closeUserModal = () => {
  document.getElementById("userModal").style.display = "none"
}

window.closeCreateUserModal = () => {
  document.getElementById("createUserModal").style.display = "none"
}

function showLoading() {
  const tbody = document.getElementById("usersTableBody")
  tbody.innerHTML =
    '<tr><td colspan="8" class="text-center"><div class="loading"><div class="spinner"></div></div></td></tr>'
}

function hideLoading() {
  // Loading will be replaced by actual content
}

// Close modals when clicking outside
window.addEventListener("click", (event) => {
  const userModal = document.getElementById("userModal")
  const createUserModal = document.getElementById("createUserModal")

  if (event.target === userModal) {
    window.closeUserModal()
  }
  if (event.target === createUserModal) {
    window.closeCreateUserModal()
  }
})
