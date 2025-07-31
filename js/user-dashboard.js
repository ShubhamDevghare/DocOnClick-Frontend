document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const userId = localStorage.getItem("userId")
  if (!userId) {
    window.location.href = "login.html"
    return
  }

  // Initialize user menu dropdown
  initUserMenu()

  // Load user data
  loadUserData()

  // Load appointment statistics
  loadAppointmentStats()

  // Load upcoming appointments
  loadUpcomingAppointments()

  // Load recent activity
  loadRecentActivity()

  // Setup logout functionality
  document.getElementById("logout-btn").addEventListener("click", (e) => {
    e.preventDefault()
    logout()
  })
})

function initUserMenu() {
  const userProfileToggle = document.getElementById("user-profile-toggle")
  const userDropdown = document.getElementById("user-dropdown")

  userProfileToggle.addEventListener("click", () => {
    userDropdown.classList.toggle("active")
  })

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!userProfileToggle.contains(e.target) && !userDropdown.contains(e.target)) {
      userDropdown.classList.remove("active")
    }
  })

  // Set user name and profile image
  const userName = localStorage.getItem("userName") || "User"
  const userProfileImage = localStorage.getItem("userProfileImage") || "/placeholder.svg?height=200&width=200"

  document.getElementById("user-name").textContent = userName
  document.getElementById("dashboard-user-name").textContent = userName

  const headerProfileImage = document.getElementById("header-profile-image")
  headerProfileImage.src = userProfileImage
  headerProfileImage.onerror = function () {
    this.src = "/placeholder.svg?height=200&width=200"
  }
}

function loadUserData() {
  const userId = localStorage.getItem("userId")

  fetch(`http://localhost:8080/api/v1/users/${userId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load user data")
      }
      return response.json()
    })
    .then((user) => {
      // Update localStorage with latest user data
      localStorage.setItem("userName", user.fullName)
      localStorage.setItem("userProfileImage", user.profileImage || "")

      // Update UI
      document.getElementById("user-name").textContent = user.fullName
      document.getElementById("dashboard-user-name").textContent = user.fullName

      const headerProfileImage = document.getElementById("header-profile-image")
      headerProfileImage.src = user.profileImage || "/placeholder.svg?height=200&width=200"
      headerProfileImage.onerror = function () {
        this.src = "/placeholder.svg?height=200&width=200"
      }

      // Set last login time (this would normally come from the server)
      const lastLoginTime = new Date().toLocaleString()
      document.getElementById("last-login-time").textContent = lastLoginTime
    })
    .catch((error) => {
      console.error("Error loading user data:", error)
    })
}

function loadAppointmentStats() {
  const userId = localStorage.getItem("userId")

  // Fetch appointment statistics
  Promise.all([
    fetch(`http://localhost:8080/api/v1/appointments/upcoming?userId=${userId}&size=1&page=0`),
    fetch(`http://localhost:8080/api/v1/appointments/filter?status=COMPLETED&userId=${userId}&size=1&page=0`),
    fetch(`http://localhost:8080/api/v1/appointments/filter?status=CANCELLED&userId=${userId}&size=1&page=0`),
    fetch(`http://localhost:8080/api/v1/appointments/filter?status=PENDING&userId=${userId}&size=1&page=0`),
  ])
    .then((responses) => Promise.all(responses.map((res) => res.json())))
    .then(([upcomingData, completedData, cancelledData, pendingData]) => {
      document.getElementById("upcoming-count").textContent = upcomingData.totalElements || 0
      document.getElementById("completed-count").textContent = completedData.totalElements || 0
      document.getElementById("cancelled-count").textContent = cancelledData.totalElements || 0
      document.getElementById("pending-count").textContent = pendingData.totalElements || 0
    })
    .catch((error) => {
      console.error("Error loading appointment statistics:", error)
      // Set default values in case of error
      document.getElementById("upcoming-count").textContent = "0"
      document.getElementById("completed-count").textContent = "0"
      document.getElementById("cancelled-count").textContent = "0"
      document.getElementById("pending-count").textContent = "0"
    })
}

function loadUpcomingAppointments() {
  const userId = localStorage.getItem("userId")
  const appointmentsContainer = document.getElementById("upcoming-appointments")

  fetch(`http://localhost:8080/api/v1/appointments/upcoming?userId=${userId}&size=5&page=0`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load appointments")
      }
      return response.json()
    })
    .then((data) => {
      appointmentsContainer.innerHTML = ""

      if (data.content && data.content.length > 0) {
        data.content.forEach((appointment) => {
          const appointmentDate = new Date(appointment.appointmentDate + "T" + appointment.appointmentTime)
          const formattedDate = appointmentDate.toLocaleDateString()
          const formattedTime = appointmentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

          const appointmentCard = document.createElement("div")
          appointmentCard.className = "appointment-card"
          appointmentCard.innerHTML = `
                        <div class="appointment-info">
                            <div class="appointment-doctor">Dr. ${appointment.doctorName}</div>
                            <div class="appointment-speciality">${appointment.doctorSpecialization}</div>
                            <div class="appointment-date">
                                <i class="far fa-calendar-alt"></i> ${formattedDate} at ${formattedTime}
                            </div>
                        </div>
                        <div class="appointment-status status-${appointment.appointmentStatus.toLowerCase()}">${appointment.appointmentStatus}</div>
                        <div class="appointment-actions">
                            <button class="action-btn" title="View Details" onclick="viewAppointmentDetails(${appointment.appointmentId})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    `

          appointmentsContainer.appendChild(appointmentCard)
        })
      } else {
        appointmentsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="far fa-calendar-times"></i>
                        <p>No upcoming appointments found</p>
                        <a href="user-appointments.html" class="btn btn-primary btn-sm">Book an Appointment</a>
                    </div>
                `
      }
    })
    .catch((error) => {
      console.error("Error loading upcoming appointments:", error)
      appointmentsContainer.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load appointments</p>
                    <button class="btn btn-primary btn-sm" onclick="loadUpcomingAppointments()">Try Again</button>
                </div>
            `
    })
}

function loadRecentActivity() {
  const userId = localStorage.getItem("userId")
  const activityContainer = document.getElementById("recent-activity")

  // This would typically be a separate API endpoint for activity logs
  // For now, we'll use the appointments API to simulate activity
  fetch(`http://localhost:8080/api/v1/appointments/all?userId=${userId}&size=5&page=0&sort=createdAt,desc`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load activity")
      }
      return response.json()
    })
    .then((data) => {
      activityContainer.innerHTML = ""

      if (data.content && data.content.length > 0) {
        data.content.forEach((appointment) => {
          const activityDate = new Date(appointment.appointmentDate + "T" + appointment.appointmentTime)
          const timeAgo = getTimeAgo(activityDate)

          let activityText = ""
          let iconClass = ""

          switch (appointment.appointmentStatus) {
            case "CONFIRMED":
              activityText = `Appointment confirmed with Dr. ${appointment.doctorName}`
              iconClass = "fa-check-circle"
              break
            case "COMPLETED":
              activityText = `Completed appointment with Dr. ${appointment.doctorName}`
              iconClass = "fa-check-double"
              break
            case "CANCELLED":
              activityText = `Cancelled appointment with Dr. ${appointment.doctorName}`
              iconClass = "fa-times-circle"
              break
            case "PENDING":
              activityText = `Booked appointment with Dr. ${appointment.doctorName}`
              iconClass = "fa-clock"
              break
          }

          const activityItem = document.createElement("div")
          activityItem.className = "activity-item"
          activityItem.innerHTML = `
                        <div class="activity-icon">
                            <i class="fas ${iconClass}"></i>
                        </div>
                        <div class="activity-details">
                            <div class="activity-text">${activityText}</div>
                            <div class="activity-time">${timeAgo}</div>
                        </div>
                    `

          activityContainer.appendChild(activityItem)
        })
      } else {
        activityContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="far fa-bell-slash"></i>
                        <p>No recent activity</p>
                    </div>
                `
      }
    })
    .catch((error) => {
      console.error("Error loading recent activity:", error)
      activityContainer.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load activity</p>
                    <button class="btn btn-primary btn-sm" onclick="loadRecentActivity()">Try Again</button>
                </div>
            `
    })
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000)

  let interval = Math.floor(seconds / 31536000)
  if (interval > 1) return interval + " years ago"
  if (interval === 1) return "1 year ago"

  interval = Math.floor(seconds / 2592000)
  if (interval > 1) return interval + " months ago"
  if (interval === 1) return "1 month ago"

  interval = Math.floor(seconds / 86400)
  if (interval > 1) return interval + " days ago"
  if (interval === 1) return "1 day ago"

  interval = Math.floor(seconds / 3600)
  if (interval > 1) return interval + " hours ago"
  if (interval === 1) return "1 hour ago"

  interval = Math.floor(seconds / 60)
  if (interval > 1) return interval + " minutes ago"
  if (interval === 1) return "1 minute ago"

  if (seconds < 10) return "just now"

  return Math.floor(seconds) + " seconds ago"
}

// Updated viewAppointmentDetails function to show modal instead of redirecting
function viewAppointmentDetails(appointmentId) {
  const modal = document.getElementById("appointment-details-modal")
  const modalContent = document.getElementById("appointment-details-content")
  const cancelBtn = document.getElementById("cancel-appointment-btn")

  // Show modal
  modal.style.display = "block"

  // Show loading state
  modalContent.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading appointment details...</p>
        </div>
    `

  // Hide cancel button initially
  cancelBtn.style.display = "none"

  // Fetch appointment details
  fetch(`http://localhost:8080/api/v1/appointments/user/${localStorage.getItem("userId")}?page=0&size=100`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load appointment details")
      }
      return response.json()
    })
    .then((data) => {
      // Find the specific appointment
      const appointment = data.content.find((apt) => apt.appointmentId === appointmentId)

      if (!appointment) {
        throw new Error("Appointment not found")
      }

      // Format date and time
      const appointmentDate = new Date(appointment.appointmentDate + "T" + appointment.appointmentTime)
      const formattedDate = appointmentDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      const formattedTime = appointmentDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })

      // Display appointment details
      modalContent.innerHTML = `
                <div class="appointment-detail-card">
                    <div class="appointment-detail-header">
                        <h3>Appointment #${appointment.appointmentId}</h3>
                        <div class="appointment-status status-${appointment.appointmentStatus.toLowerCase()}">
                            ${appointment.appointmentStatus}
                        </div>
                    </div>
                    <div class="appointment-detail-body">
                        <div class="doctor-info">
                            <div class="doctor-name">Dr. ${appointment.doctorName}</div>
                            <div class="doctor-specialization">${appointment.doctorSpecialization}</div>
                        </div>
                        
                        <div class="detail-row">
                            <div class="detail-label">
                                <i class="fas fa-calendar-alt"></i>
                                Date
                            </div>
                            <div class="detail-value">${formattedDate}</div>
                        </div>
                        
                        <div class="detail-row">
                            <div class="detail-label">
                                <i class="fas fa-clock"></i>
                                Time
                            </div>
                            <div class="detail-value">${formattedTime}</div>
                        </div>
                        
                        <div class="detail-row">
                            <div class="detail-label">
                                <i class="fas fa-user-md"></i>
                                Doctor
                            </div>
                            <div class="detail-value">Dr. ${appointment.doctorName}</div>
                        </div>
                        
                        <div class="detail-row">
                            <div class="detail-label">
                                <i class="fas fa-stethoscope"></i>
                                Specialization
                            </div>
                            <div class="detail-value">${appointment.doctorSpecialization}</div>
                        </div>
                        
                        <div class="detail-row">
                            <div class="detail-label">
                                <i class="fas fa-info-circle"></i>
                                Status
                            </div>
                            <div class="detail-value">
                                <span class="appointment-status status-${appointment.appointmentStatus.toLowerCase()}">
                                    ${appointment.appointmentStatus}
                                </span>
                            </div>
                        </div>
                        
                        <div class="detail-row">
                            <div class="detail-label">
                                <i class="fas fa-credit-card"></i>
                                Payment Status
                            </div>
                            <div class="detail-value">
                                <span class="appointment-status status-${appointment.paymentStatus.toLowerCase()}">
                                    ${appointment.paymentStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `

      // Show cancel button if appointment can be cancelled
      if (appointment.appointmentStatus === "PENDING" || appointment.appointmentStatus === "CONFIRMED") {
        cancelBtn.style.display = "inline-block"
        cancelBtn.setAttribute("data-appointment-id", appointmentId)
      }
    })
    .catch((error) => {
      console.error("Error loading appointment details:", error)
      modalContent.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load appointment details</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="viewAppointmentDetails(${appointmentId})">
                        Try Again
                    </button>
                </div>
            `
    })
}

function closeAppointmentModal() {
  const modal = document.getElementById("appointment-details-modal")
  modal.style.display = "none"
}

function cancelAppointment() {
  const cancelBtn = document.getElementById("cancel-appointment-btn")
  const appointmentId = cancelBtn.getAttribute("data-appointment-id")

  if (!appointmentId) {
    alert("No appointment selected")
    return
  }

  if (!confirm("Are you sure you want to cancel this appointment?")) {
    return
  }

  // Show loading state
  cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...'
  cancelBtn.disabled = true

  fetch(`http://localhost:8080/api/v1/appointments/${appointmentId}/cancel`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to cancel appointment")
      }
      return response.json()
    })
    .then((data) => {
      alert("Appointment cancelled successfully")
      closeAppointmentModal()
      // Reload the appointments to reflect the change
      loadUpcomingAppointments()
      loadAppointmentStats()
      loadRecentActivity()
    })
    .catch((error) => {
      console.error("Error cancelling appointment:", error)
      alert("Failed to cancel appointment: " + error.message)
    })
    .finally(() => {
      cancelBtn.innerHTML = "Cancel Appointment"
      cancelBtn.disabled = false
    })
}

// Close modal when clicking outside of it
window.onclick = (event) => {
  const modal = document.getElementById("appointment-details-modal")
  if (event.target === modal) {
    closeAppointmentModal()
  }
}

function logout() {
  // Clear local storage
  localStorage.removeItem("userId")
  localStorage.removeItem("userType")
  localStorage.removeItem("userName")
  localStorage.removeItem("userProfileImage")

  // Redirect to login page
  window.location.href = "login.html"
}
