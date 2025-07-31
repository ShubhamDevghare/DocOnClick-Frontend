// Global variables
let currentPage = 0
const pageSize = 10
let totalPages = 0
let totalElements = 0
let currentAdmins = []
let isEditing = false

// API Base URL
const API_BASE_URL = "http://localhost:8080/api/v1"

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  loadAdmins()
  setupEventListeners()
})

// Setup event listeners
function setupEventListeners() {
  // Form submission
  document.getElementById("adminForm").addEventListener("submit", handleFormSubmit)

  // Search on Enter key
  document.getElementById("searchAdminId").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchByAdminId()
    }
  })

  document.getElementById("searchAdminName").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchByAdminName()
    }
  })

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    const adminModal = document.getElementById("adminModal")
    const createAdminModal = document.getElementById("createAdminModal")

    if (event.target === adminModal) {
      closeAdminModal()
    }
    if (event.target === createAdminModal) {
      closeCreateAdminModal()
    }
  })
}

// Load admins with pagination
async function loadAdmins(page = 0) {
  try {
    showLoading()
    const response = await fetch(`${API_BASE_URL}/admins?page=${page}&size=${pageSize}&sort=fullName,asc`)

    if (!response.ok) {
      throw new Error("Failed to load admins")
    }

    const data = await response.json()
    currentAdmins = data.content
    totalPages = data.totalPages
    totalElements = data.totalElements
    currentPage = data.number

    displayAdmins(currentAdmins)
    updatePagination()
  } catch (error) {
    console.error("Error loading admins:", error)
    showError("Failed to load admins. Please try again.")
  } finally {
    hideLoading()
  }
}

// Display admins in table
function displayAdmins(admins) {
  const tbody = document.getElementById("adminsTableBody")
  tbody.innerHTML = ""

  if (admins.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">No admins found</td>
            </tr>
        `
    return
  }

  admins.forEach((admin) => {
    const row = createAdminRow(admin)
    tbody.appendChild(row)
  })
}

// Create admin table row
function createAdminRow(admin) {
  const row = document.createElement("tr")

  const statusBadge = admin.active
    ? '<span class="status-badge active">Active</span>'
    : '<span class="status-badge inactive">Inactive</span>'

  const createdDate = new Date(admin.createdAt).toLocaleDateString()

  row.innerHTML = `
        <td>${admin.adminId}</td>
        <td>
            <div class="admin-info">
                <img src="${admin.profileImage || "default-avatar.png"}" alt="Profile" class="admin-avatar">
                <span>${admin.fullName}</span>
            </div>
        </td>
        <td>${admin.email}</td>
        <td>${admin.mobileNumber}</td>
        <td><span class="role-badge ${admin.role.toLowerCase()}">${admin.role}</span></td>
        <td>${statusBadge}</td>
        <td>${createdDate}</td>
        <td>
            <div class="action-buttons">
                <button class="btn btn-sm btn-info" onclick="viewAdminDetails(${admin.adminId})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="openEditAdminModal(${admin.adminId})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm ${admin.active ? "btn-danger" : "btn-success"}" 
                        onclick="toggleAdminStatus(${admin.adminId}, ${admin.active})" 
                        title="${admin.active ? "Deactivate" : "Activate"}">
                    <i class="fas ${admin.active ? "fa-ban" : "fa-check"}"></i>
                </button>
            </div>
        </td>
    `

  return row
}

// Search by Admin ID
async function searchByAdminId() {
  const adminId = document.getElementById("searchAdminId").value.trim()

  if (!adminId) {
    showError("Please enter an Admin ID")
    return
  }

  try {
    showLoading()
    const response = await fetch(`${API_BASE_URL}/admins/${adminId}`)

    if (!response.ok) {
      if (response.status === 404) {
        showError("Admin not found")
        displayAdmins([])
        return
      }
      throw new Error("Failed to search admin")
    }

    const admin = await response.json()
    displayAdmins([admin])
    updatePaginationForSearch(1)
  } catch (error) {
    console.error("Error searching admin:", error)
    showError("Failed to search admin. Please try again.")
  } finally {
    hideLoading()
  }
}

// Search by Admin Name
async function searchByAdminName() {
  const adminName = document.getElementById("searchAdminName").value.trim()

  if (!adminName) {
    showError("Please enter an admin name")
    return
  }

  try {
    showLoading()
    // Filter current admins by name (client-side filtering)
    // In a real application, you might want to implement server-side search
    const filteredAdmins = currentAdmins.filter((admin) =>
      admin.fullName.toLowerCase().includes(adminName.toLowerCase()),
    )

    displayAdmins(filteredAdmins)
    updatePaginationForSearch(filteredAdmins.length)
  } catch (error) {
    console.error("Error searching admin:", error)
    showError("Failed to search admin. Please try again.")
  } finally {
    hideLoading()
  }
}

// Clear search
function clearSearch() {
  document.getElementById("searchAdminId").value = ""
  document.getElementById("searchAdminName").value = ""
  loadAdmins(0)
}

// View admin details
async function viewAdminDetails(adminId) {
  try {
    showLoading()
    const response = await fetch(`${API_BASE_URL}/admins/${adminId}`)

    if (!response.ok) {
      throw new Error("Failed to load admin details")
    }

    const admin = await response.json()
    showAdminDetailsModal(admin)
  } catch (error) {
    console.error("Error loading admin details:", error)
    showError("Failed to load admin details. Please try again.")
  } finally {
    hideLoading()
  }
}

// Show admin details modal
function showAdminDetailsModal(admin) {
  const modalBody = document.getElementById("adminModalBody")
  const createdDate = new Date(admin.createdAt).toLocaleDateString()
  const updatedDate = new Date(admin.updatedAt).toLocaleDateString()

  modalBody.innerHTML = `
        <div class="admin-details">
            <div class="detail-section">
                <div class="detail-header">
                    <img src="${admin.profileImage || "default-avatar.png"}" alt="Profile" class="detail-avatar">
                    <div class="detail-info">
                        <h3>${admin.fullName}</h3>
                        <span class="role-badge ${admin.role.toLowerCase()}">${admin.role}</span>
                        <span class="status-badge ${admin.active ? "active" : "inactive"}">
                            ${admin.active ? "Active" : "Inactive"}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Admin ID:</label>
                    <span>${admin.adminId}</span>
                </div>
                <div class="detail-item">
                    <label>Email:</label>
                    <span>${admin.email}</span>
                </div>
                <div class="detail-item">
                    <label>Mobile Number:</label>
                    <span>${admin.mobileNumber}</span>
                </div>
                <div class="detail-item">
                    <label>Role:</label>
                    <span>${admin.role}</span>
                </div>
                <div class="detail-item">
                    <label>Status:</label>
                    <span>${admin.active ? "Active" : "Inactive"}</span>
                </div>
                <div class="detail-item">
                    <label>Created:</label>
                    <span>${createdDate}</span>
                </div>
                <div class="detail-item">
                    <label>Last Updated:</label>
                    <span>${updatedDate}</span>
                </div>
            </div>
        </div>
    `

  document.getElementById("adminModal").style.display = "block"
}

// Open create admin modal
function openCreateAdminModal() {
  isEditing = false
  document.getElementById("adminFormTitle").textContent = "Create Admin"
  document.getElementById("adminForm").reset()
  document.getElementById("adminId").value = ""
  document.getElementById("active").checked = true
  document.getElementById("createAdminModal").style.display = "block"
}

// Open edit admin modal
async function openEditAdminModal(adminId) {
  try {
    showLoading()
    const response = await fetch(`${API_BASE_URL}/admins/${adminId}`)

    if (!response.ok) {
      throw new Error("Failed to load admin details")
    }

    const admin = await response.json()

    isEditing = true
    document.getElementById("adminFormTitle").textContent = "Edit Admin"
    document.getElementById("adminId").value = admin.adminId
    document.getElementById("fullName").value = admin.fullName
    document.getElementById("email").value = admin.email
    document.getElementById("mobileNumber").value = admin.mobileNumber
    document.getElementById("role").value = admin.role
    document.getElementById("password").value = ""
    document.getElementById("password").required = false
    document.getElementById("active").checked = admin.active

    document.getElementById("createAdminModal").style.display = "block"
  } catch (error) {
    console.error("Error loading admin details:", error)
    showError("Failed to load admin details. Please try again.")
  } finally {
    hideLoading()
  }
}

// Handle form submission
async function handleFormSubmit(event) {
  event.preventDefault()

  const formData = new FormData()
  const adminData = {
    fullName: document.getElementById("fullName").value,
    email: document.getElementById("email").value,
    mobileNumber: document.getElementById("mobileNumber").value,
    role: document.getElementById("role").value,
  }

  const password = document.getElementById("password").value
  if (password) {
    adminData.password = password
  }

  // Only include active status for updates, not for new admin creation
  if (isEditing) {
    adminData.active = document.getElementById("active").checked
  }

  // Add admin data as JSON
  formData.append(
    "adminData",
    new Blob([JSON.stringify(adminData)], {
      type: "application/json",
    }),
  )

  // Add profile image if selected
  const profileImageFile = document.getElementById("profileImage").files[0]
  if (profileImageFile) {
    formData.append("profileImage", profileImageFile)
  }

  try {
    showLoading()

    let url, method
    if (isEditing) {
      const adminId = document.getElementById("adminId").value
      url = `${API_BASE_URL}/admins/${adminId}`
      method = "PUT"
    } else {
      url = `${API_BASE_URL}/admins/signup`
      method = "POST"
    }

    const response = await fetch(url, {
      method: method,
      body: formData,
    })

    if (!response.ok) {
      let errorMessage = "Failed to save admin"
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch (e) {
        const errorText = await response.text()
        errorMessage = errorText || errorMessage
      }
      throw new Error(errorMessage)
    }

    showSuccess(isEditing ? "Admin updated successfully!" : "Admin created successfully!")
    closeCreateAdminModal()
    loadAdmins(currentPage)
  } catch (error) {
    console.error("Error saving admin:", error)
    showError(error.message || "Failed to save admin. Please try again.")
  } finally {
    hideLoading()
  }
}

// Toggle admin status
async function toggleAdminStatus(adminId, currentStatus) {
  const action = currentStatus ? "deactivate" : "activate"

  if (!confirm(`Are you sure you want to ${action} this admin?`)) {
    return
  }

  try {
    showLoading()

    // Use the dedicated activate/deactivate endpoints
    const endpoint = currentStatus ? "deactivate" : "activate"
    const response = await fetch(`${API_BASE_URL}/admins/${adminId}/${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Failed to ${action} admin`)
    }

    showSuccess(`Admin ${action}d successfully!`)
    loadAdmins(currentPage)
  } catch (error) {
    console.error("Error toggling admin status:", error)
    showError(`Failed to ${action} admin. Please try again.`)
  } finally {
    hideLoading()
  }
}

// Close modals
function closeAdminModal() {
  document.getElementById("adminModal").style.display = "none"
}

function closeCreateAdminModal() {
  document.getElementById("createAdminModal").style.display = "none"
  document.getElementById("adminForm").reset()
  document.getElementById("password").required = true
}

// Refresh admins
function refreshAdmins() {
  clearSearch()
  loadAdmins(currentPage)
}

// Pagination functions
function updatePagination() {
  const paginationInfo = document.getElementById("paginationInfo")
  const pageNumbers = document.getElementById("pageNumbers")
  const prevBtn = document.getElementById("prevBtn")
  const nextBtn = document.getElementById("nextBtn")

  // Update pagination info
  const startItem = currentPage * pageSize + 1
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements)
  paginationInfo.textContent = `Showing ${startItem} to ${endItem} of ${totalElements} entries`

  // Update navigation buttons
  prevBtn.disabled = currentPage === 0
  nextBtn.disabled = currentPage >= totalPages - 1

  // Update page numbers
  pageNumbers.innerHTML = ""
  const maxVisiblePages = 5
  let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2))
  const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1)

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(0, endPage - maxVisiblePages + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement("button")
    pageBtn.className = `btn btn-pagination ${i === currentPage ? "active" : ""}`
    pageBtn.textContent = i + 1
    pageBtn.onclick = () => loadAdmins(i)
    pageNumbers.appendChild(pageBtn)
  }
}

function updatePaginationForSearch(resultCount) {
  const paginationInfo = document.getElementById("paginationInfo")
  paginationInfo.textContent = `Showing ${resultCount} search results`

  document.getElementById("prevBtn").disabled = true
  document.getElementById("nextBtn").disabled = true
  document.getElementById("pageNumbers").innerHTML = ""
}

function previousPage() {
  if (currentPage > 0) {
    loadAdmins(currentPage - 1)
  }
}

function nextPage() {
  if (currentPage < totalPages - 1) {
    loadAdmins(currentPage + 1)
  }
}

// Utility functions
function showLoading() {
  // You can implement a loading spinner here
  console.log("Loading...")
}

function hideLoading() {
  // Hide loading spinner
  console.log("Loading complete")
}

function showSuccess(message) {
  alert(message) // Replace with a better notification system
}

function showError(message) {
  alert("Error: " + message) // Replace with a better notification system
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("adminToken")
    window.location.href = "admin-login.html"
  }
}
