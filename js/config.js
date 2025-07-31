// API Configuration
export const API_BASE_URL = "http://localhost:8080/api/v1"

// API Endpoints
export const API_ENDPOINTS = {
  // Admin endpoints
  admin: {
    login: "/admins/login",
    profile: "/admins",
    base: "/admins",
    signup: "/admins/signup",
  },

  // Doctor endpoints
  doctors: {
    base: "/doctors",
    search: "/doctors/search",
    filter: "/doctors/filter",
    specialities: "/doctors/specialities",
    signupWithDocuments: "/doctors/signup-with-documents",
    stats: "/doctors/{id}/stats",
    weeklySchedules: "/doctors/{id}/weekly-schedules",
    appointmentSlots: "/doctors/{id}/appointment-slots",
    holidays: "/doctors/{id}/holidays",
    reviews: "/doctors/{id}/reviews",
    profile: "/doctors/{id}/profile",
  },

  // Documents verification endpoints
  documentsVerification: {
    base: "/documents-verification",
    byStatus: "/documents-verification/status",
    search: "/documents-verification/search",
    updateStatus: "/documents-verification/{id}/status",
    byDoctor: "/documents-verification/doctor",
  },

  // User endpoints
  users: {
    base: "/users",
    signup: "/users/signup",
    login: "/users/login",
  },

  // Patient endpoints
  patients: {
    base: "/patients",
    register: "/patients/register",
    search: "/patients/search",
    details: "/patients",
    reports: "/patients/{id}/reports",
  },

  // Appointment endpoints
  appointments: {
    base: "/appointments",
    search: "/appointments/search",
    byDoctor: "/appointments/doctor",
    byPatient: "/appointments/patient",
    byUser: "/appointments/user",
    byStatus: "/appointments/status",
    byAdmin: "/appointments/admin-created",
    reschedule: "/appointments/{id}/reschedule",
    reports: "/appointments/{id}/reports",
    prescription: "/appointments/{id}/prescription",
  },

  // Payment endpoints
  payments: {
    base: "/payments",
    search: "/payments/search",
    byStatus: "/payments/status",
    process: "/payments/{id}/process",
    pending: "/payments/pending",
  },

  // Reports endpoints
  reports: {
    patient: "/reports/patient",
    medical: "/reports/medical",
    appointment: "/reports/appointment",
  },

  // Prescription endpoints
  prescriptions: {
    base: "/prescriptions",
    medicines: "/prescriptions/{id}/medicines",
  },
}

// Admin roles and permissions
export const ADMIN_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  TEAM_ADMIN: "TEAM_ADMIN",
}

export const PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: ["doctor_management", "user_management", "patient_management", "admin_management"],
  [ADMIN_ROLES.TEAM_ADMIN]: ["doctor_management"],
}

// Status mappings
export const VERIFICATION_STATUS = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
}

export const USER_ROLES = {
  USER: "USER",
  PATIENT: "PATIENT",
  DOCTOR: "DOCTOR",
}

// Utility functions
export function getAuthToken() {
  return localStorage.getItem("adminToken")
}

export function setAuthToken(token) {
  localStorage.setItem("adminToken", token)
}

export function removeAuthToken() {
  localStorage.removeItem("adminToken")
}

export function getAdminInfo() {
  const adminInfo = localStorage.getItem("adminInfo")
  return adminInfo ? JSON.parse(adminInfo) : null
}

export function setAdminInfo(adminInfo) {
  localStorage.setItem("adminInfo", JSON.stringify(adminInfo))
}

export function removeAdminInfo() {
  localStorage.removeItem("adminInfo")
}

export function hasPermission(permission) {
  const adminInfo = getAdminInfo()
  if (!adminInfo) return false

  const userPermissions = PERMISSIONS[adminInfo.role] || []
  return userPermissions.includes(permission)
}

export function formatDate(dateString) {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString()
}

export function formatDateTime(dateString) {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleString()
}

export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "N/A"
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

export function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`
  notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `

  // Add styles if not already added
  if (!document.querySelector("#notification-styles")) {
    const styles = document.createElement("style")
    styles.id = "notification-styles"
    styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
                padding: 1rem;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                animation: slideIn 0.3s ease-out;
            }
            
            .notification-info {
                background: #3182ce;
                color: white;
            }
            
            .notification-success {
                background: #38a169;
                color: white;
            }
            
            .notification-error {
                background: #e53e3e;
                color: white;
            }
            
            .notification-warning {
                background: #dd6b20;
                color: white;
            }
            
            .notification-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: inherit;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `
    document.head.appendChild(styles)
  }

  // Add to document
  document.body.appendChild(notification)

  // Add close functionality
  const closeBtn = notification.querySelector(".notification-close")
  closeBtn.addEventListener("click", () => {
    notification.style.animation = "slideOut 0.3s ease-out"
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 300)
  })

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOut 0.3s ease-out"
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }
  }, 5000)
}

// Global logout function
window.logout = () => {
  removeAuthToken()
  removeAdminInfo()
  window.location.href = "admin-login.html"
}

// Check authentication on page load
export function checkAuth() {
  const token = getAuthToken()
  const adminInfo = getAdminInfo()

  if (!token || !adminInfo) {
    window.location.href = "admin-login.html"
    return false
  }

  // Update admin info in sidebar
  const adminNameElement = document.getElementById("adminName")
  const adminRoleElement = document.getElementById("adminRole")

  if (adminNameElement) {
    adminNameElement.textContent = adminInfo.fullName || "Admin User"
  }

  if (adminRoleElement) {
    adminRoleElement.textContent = adminInfo.role || "ADMIN"
  }

  return true
}

// API request helper
export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken()
  const url = `${API_BASE_URL}${endpoint}`

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  }

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, finalOptions)

    if (response.status === 401) {
      // Unauthorized - redirect to login
      removeAuthToken()
      removeAdminInfo()
      window.location.href = "admin-login.html"
      return null
    }

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || `HTTP error! status: ${response.status}`)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    } else {
      return await response.text()
    }
  } catch (error) {
    console.error("API request failed:", error)
    throw error
  }
}
