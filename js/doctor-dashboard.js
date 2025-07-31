// Doctor Dashboard JavaScript
class DoctorDashboard {
  constructor() {
    this.baseURL = "http://localhost:8080/api/v1"
    this.doctorId = this.getDoctorId()
    this.currentDate = new Date()

    this.init()
  }

  init() {
    this.setupEventListeners()
    this.loadDoctorProfile()
    this.loadDashboardData()
    this.generateCalendar()
    this.setupModals()
  }

  getDoctorId() {
    // Get doctor ID from localStorage or session
    return localStorage.getItem("doctorId") || 1 // Default for testing
  }

  setupEventListeners() {
    // Calendar navigation
    document.getElementById("prev-month")?.addEventListener("click", () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1)
      this.generateCalendar()
    })

    document.getElementById("next-month")?.addEventListener("click", () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1)
      this.generateCalendar()
    })

    // Logout
    document.getElementById("logout-btn")?.addEventListener("click", () => {
      this.logout()
    })

    // Modal close buttons
    document.querySelectorAll(".close-modal").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.closeModal(e.target.closest(".modal"))
      })
    })

    // Complete appointment
    document.getElementById("complete-appointment")?.addEventListener("click", () => {
      this.showPrescriptionModal()
    })

    // Save prescription
    document.getElementById("save-prescription")?.addEventListener("click", () => {
      this.savePrescription()
    })

    // Add medicine
    document.getElementById("add-medicine")?.addEventListener("click", () => {
      this.addMedicineField()
    })
  }

  async loadDoctorProfile() {
    try {
      const response = await fetch(`${this.baseURL}/doctors/${this.doctorId}`)
      if (response.ok) {
        const doctor = await response.json()
        this.updateDoctorProfile(doctor)
      }
    } catch (error) {
      console.error("Error loading doctor profile:", error)
    }
  }

  updateDoctorProfile(doctor) {
    document.getElementById("doctor-name").textContent = doctor.fullName
    document.getElementById("doctor-specialization").textContent = doctor.specialization
    document.getElementById("welcome-message").textContent = `Welcome back, ${doctor.fullName}`

    if (doctor.profileImage && doctor.profileImage !== "default-profile-image-url") {
      document.getElementById("doctor-avatar").src = doctor.profileImage
    }
  }

  async loadDashboardData() {
    try {
      // Load doctor stats
      await this.loadDoctorStats()

      // Load today's appointments (only confirmed and completed)
      await this.loadTodayAppointments()

      // Load recent patients (only from confirmed and completed appointments)
      await this.loadRecentPatients()

      // Load recent activity
      await this.loadRecentActivity()

      // Load doctor reviews for rating
      await this.loadDoctorRating()
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    }
  }

  async loadDoctorStats() {
    try {
      const response = await fetch(`${this.baseURL}/doctors/${this.doctorId}/stats`)
      if (response.ok) {
        const stats = await response.json()
        this.updateStatsCards(stats)
      }
    } catch (error) {
      console.error("Error loading doctor stats:", error)
    }
  }

  updateStatsCards(stats) {
    document.getElementById("today-appointments").textContent = stats.todaysAppointments || 0
    document.getElementById("average-rating").textContent = (stats.averageRating || 0).toFixed(1)
  }

  async loadTodayAppointments() {
    try {
      // Get today's date in the correct timezone
      const today = new Date()
      const todayString = today.toISOString().split("T")[0] // YYYY-MM-DD format

      const response = await fetch(`${this.baseURL}/appointments/doctor/${this.doctorId}/date/${todayString}?size=5`)
      if (response.ok) {
        const data = await response.json()
        // Filter only confirmed and completed appointments
        const filteredAppointments = data.content.filter(
          (apt) => apt.appointmentStatus === "CONFIRMED" || apt.appointmentStatus === "COMPLETED",
        )
        this.updateAppointmentsTable(filteredAppointments)
        this.updateNextAppointment(filteredAppointments)
      }
    } catch (error) {
      console.error("Error loading today appointments:", error)
      this.showEmptyAppointments()
    }
  }

  updateAppointmentsTable(appointments) {
    const tbody = document.querySelector("#appointments-table tbody")

    if (appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center">No appointments for today</td></tr>'
      return
    }

    tbody.innerHTML = appointments
      .map(
        (appointment) => `
            <tr onclick="window.doctorDashboard.showAppointmentDetails(${appointment.appointmentId})">
                <td>
                    <div class="patient-info">
                        <div class="patient-avatar">
                            ${this.getInitials(appointment.patientName)}
                        </div>
                        <div class="patient-details">
                            <h4>${appointment.patientName}</h4>
                            <p>ID: ${appointment.patientId}</p>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="appointment-time">${this.formatTime(appointment.appointmentTime)}</span>
                </td>
                <td>
                    <span class="status-badge status-${appointment.appointmentStatus.toLowerCase()}">
                        ${appointment.appointmentStatus}
                    </span>
                </td>
            </tr>
        `,
      )
      .join("")
  }

  updateNextAppointment(appointments) {
    const nextAppointmentElement = document.getElementById("next-appointment")

    if (appointments.length === 0) {
      nextAppointmentElement.textContent = "No appointments"
      return
    }

    // Find the next upcoming appointment
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const nextAppointment = appointments.find((apt) => {
      const [hours, minutes] = apt.appointmentTime.split(":").map(Number)
      const appointmentTime = hours * 60 + minutes
      return appointmentTime > currentTime && apt.appointmentStatus === "CONFIRMED"
    })

    if (nextAppointment) {
      nextAppointmentElement.textContent = `${this.formatTime(nextAppointment.appointmentTime)} - ${nextAppointment.patientName}`
    } else {
      nextAppointmentElement.textContent = "No more appointments today"
    }
  }

  async loadRecentPatients() {
    try {
      // Get recent appointments with confirmed/completed status
      const response = await fetch(`${this.baseURL}/appointments/doctor/${this.doctorId}/recent?size=5`)
      if (response.ok) {
        const data = await response.json()
        // Filter only confirmed and completed appointments
        const filteredAppointments = data.content.filter(
          (apt) => apt.appointmentStatus === "CONFIRMED" || apt.appointmentStatus === "COMPLETED",
        )
        this.updatePatientsTable(filteredAppointments)
      }
    } catch (error) {
      console.error("Error loading recent patients:", error)
      this.showEmptyPatients()
    }
  }

  updatePatientsTable(appointments) {
    const tbody = document.querySelector("#patients-table tbody")

    if (appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center">No recent patients</td></tr>'
      return
    }

    // Group by patient to avoid duplicates
    const uniquePatients = []
    const seenPatients = new Set()

    appointments.forEach((apt) => {
      if (!seenPatients.has(apt.patientId)) {
        seenPatients.add(apt.patientId)
        uniquePatients.push(apt)
      }
    })

    tbody.innerHTML = uniquePatients
      .slice(0, 5)
      .map(
        (appointment) => `
            <tr>
                <td>
                    <div class="patient-info">
                        <div class="patient-avatar">
                            ${this.getInitials(appointment.patientName)}
                        </div>
                        <div class="patient-details">
                            <h4>${appointment.patientName}</h4>
                            <p>ID: ${appointment.patientId}</p>
                        </div>
                    </div>
                </td>
                <td>${this.formatDate(appointment.appointmentDate)}</td>
                <td>
                    <span class="status-badge status-${appointment.appointmentStatus.toLowerCase()}">
                        ${appointment.appointmentStatus}
                    </span>
                </td>
            </tr>
        `,
      )
      .join("")
  }

  async loadRecentActivity() {
    try {
      const activityList = document.getElementById("activity-list")

      // Create mock activity based on recent appointments
      const response = await fetch(`${this.baseURL}/appointments/doctor/${this.doctorId}/recent?size=10`)
      if (response.ok) {
        const data = await response.json()
        const activities = this.generateActivityFromAppointments(data.content)
        this.updateActivityList(activities)
      }
    } catch (error) {
      console.error("Error loading recent activity:", error)
      this.showEmptyActivity()
    }
  }

  generateActivityFromAppointments(appointments) {
    const activities = []

    appointments.forEach((apt) => {
      if (apt.appointmentStatus === "COMPLETED") {
        activities.push({
          type: "appointment",
          icon: "fas fa-check-circle",
          text: `Completed appointment with ${apt.patientName}`,
          time: this.getRelativeTime(apt.updatedAt || apt.createdAt),
        })
      } else if (apt.appointmentStatus === "CONFIRMED") {
        activities.push({
          type: "appointment",
          icon: "fas fa-calendar-check",
          text: `Confirmed appointment with ${apt.patientName}`,
          time: this.getRelativeTime(apt.updatedAt || apt.createdAt),
        })
      }
    })

    return activities.slice(0, 5)
  }

  updateActivityList(activities) {
    const activityList = document.getElementById("activity-list")

    if (activities.length === 0) {
      activityList.innerHTML = '<li class="loading-item">No recent activity</li>'
      return
    }

    activityList.innerHTML = activities
      .map(
        (activity) => `
            <li class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.text}</p>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </li>
        `,
      )
      .join("")
  }

  async loadDoctorRating() {
    try {
      const response = await fetch(`${this.baseURL}/reviews/doctor/${this.doctorId}/rating`)
      if (response.ok) {
        const rating = await response.json()
        document.getElementById("average-rating").textContent = (rating || 0).toFixed(1)

        // Get review count
        const reviewsResponse = await fetch(`${this.baseURL}/reviews/doctor/${this.doctorId}?size=1`)
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json()
          document.getElementById("review-count").textContent = reviewsData.totalElements || 0
        }
      }
    } catch (error) {
      console.error("Error loading doctor rating:", error)
    }
  }

  generateCalendar() {
    const calendar = document.getElementById("doctor-calendar")
    const currentMonth = document.getElementById("current-month")

    const year = this.currentDate.getFullYear()
    const month = this.currentDate.getMonth()

    currentMonth.textContent = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(this.currentDate)

    // Create calendar header
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    let calendarHTML = `
            <div class="calendar-header">
                ${daysOfWeek.map((day) => `<div class="calendar-header-day">${day}</div>`).join("")}
            </div>
            <div class="calendar-body">
        `

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarHTML += '<div class="calendar-day other-month"></div>'
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const isToday = date.toDateString() === today.toDateString()
      const classes = ["calendar-day"]

      if (isToday) classes.push("today")

      // Format date as YYYY-MM-DD for proper comparison - fix timezone issue
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

      calendarHTML += `<div class="${classes.join(" ")}" data-date="${dateString}">${day}</div>`
    }

    calendarHTML += "</div>"
    calendar.innerHTML = calendarHTML

    // Load appointments for this month
    this.loadMonthAppointments(year, month)
  }

  async loadMonthAppointments(year, month) {
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, "0")}`

      const response = await fetch(
        `${this.baseURL}/appointments/doctor/${this.doctorId}/range?startDate=${startDate}&endDate=${endDate}&size=100`,
      )
      if (response.ok) {
        const data = await response.json()
        this.markCalendarAppointments(data.content)
      }
    } catch (error) {
      console.error("Error loading month appointments:", error)
    }
  }

  markCalendarAppointments(appointments) {
    // Group appointments by date
    const appointmentsByDate = {}
    appointments.forEach((apt) => {
      if (apt.appointmentStatus === "CONFIRMED" || apt.appointmentStatus === "COMPLETED") {
        const date = apt.appointmentDate
        if (!appointmentsByDate[date]) {
          appointmentsByDate[date] = []
        }
        appointmentsByDate[date].push(apt)
      }
    })

    // Mark calendar days with appointments
    Object.keys(appointmentsByDate).forEach((date) => {
      const dayElement = document.querySelector(`[data-date="${date}"]`)
      if (dayElement) {
        dayElement.classList.add("has-appointment")
        dayElement.title = `${appointmentsByDate[date].length} appointment(s)`
      }
    })
  }

  setupModals() {
    // Close modal when clicking outside
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeModal(modal)
        }
      })
    })
  }

  showAppointmentDetails(appointmentId) {
    // This would typically load appointment details from the API
    const modal = document.getElementById("appointment-modal")
    const detailsContainer = document.getElementById("appointment-details")

    // Mock appointment details - replace with actual API call
    detailsContainer.innerHTML = `
            <div class="appointment-detail-item">
                <strong>Appointment ID:</strong> ${appointmentId}
            </div>
            <div class="appointment-detail-item">
                <strong>Patient:</strong> Loading...
            </div>
            <div class="appointment-detail-item">
                <strong>Date & Time:</strong> Loading...
            </div>
            <div class="appointment-detail-item">
                <strong>Status:</strong> Loading...
            </div>
        `

    this.openModal(modal)

    // Load actual appointment details
    this.loadAppointmentDetails(appointmentId)
  }

  async loadAppointmentDetails(appointmentId) {
    try {
      // This endpoint would need to be implemented in the backend
      const response = await fetch(`${this.baseURL}/appointments/${appointmentId}`)
      if (response.ok) {
        const appointment = await response.json()
        this.updateAppointmentModal(appointment)
      }
    } catch (error) {
      console.error("Error loading appointment details:", error)
    }
  }

  updateAppointmentModal(appointment) {
    const detailsContainer = document.getElementById("appointment-details")
    detailsContainer.innerHTML = `
            <div class="appointment-detail-item">
                <strong>Appointment ID:</strong> ${appointment.appointmentId}
            </div>
            <div class="appointment-detail-item">
                <strong>Patient:</strong> ${appointment.patientName}
            </div>
            <div class="appointment-detail-item">
                <strong>Date & Time:</strong> ${this.formatDate(appointment.appointmentDate)} at ${this.formatTime(appointment.appointmentTime)}
            </div>
            <div class="appointment-detail-item">
                <strong>Status:</strong> 
                <span class="status-badge status-${appointment.appointmentStatus.toLowerCase()}">
                    ${appointment.appointmentStatus}
                </span>
            </div>
            <div class="appointment-detail-item">
                <strong>Consultation Fee:</strong> ₹${appointment.consultationFee || appointment.fees || 0}
            </div>
        `

    // Store appointment ID for prescription
    document.getElementById("appointment-id").value = appointment.appointmentId
  }

  showPrescriptionModal() {
    this.closeModal(document.getElementById("appointment-modal"))
    this.openModal(document.getElementById("prescription-modal"))
    this.resetPrescriptionForm()
  }

  resetPrescriptionForm() {
    document.getElementById("prescription-form").reset()
    document.getElementById("medicines-container").innerHTML = ""
    this.addMedicineField() // Add one medicine field by default
  }

  addMedicineField() {
    const container = document.getElementById("medicines-container")
    const medicineCount = container.children.length + 1

    const medicineHTML = `
            <div class="medicine-item">
                <div class="medicine-header">
                    <h4>Medicine ${medicineCount}</h4>
                    <button type="button" class="remove-medicine" onclick="this.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i> Remove
                    </button>
                </div>
                <div class="medicine-fields">
                    <div class="form-group">
                        <label>Medicine Name</label>
                        <input type="text" name="medicineName" required>
                    </div>
                    <div class="form-group">
                        <label>Dosage</label>
                        <input type="text" name="dosage" placeholder="e.g., 500mg" required>
                    </div>
                    <div class="form-group">
                        <label>Frequency</label>
                        <select name="frequency" required>
                            <option value="">Select frequency</option>
                            <option value="Once daily">Once daily</option>
                            <option value="Twice daily">Twice daily</option>
                            <option value="Three times daily">Three times daily</option>
                            <option value="Four times daily">Four times daily</option>
                            <option value="As needed">As needed</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Duration (days)</label>
                        <input type="number" name="durationDays" min="1" required>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Instructions</label>
                        <input type="text" name="instructions" placeholder="e.g., Take after meals">
                    </div>
                </div>
            </div>
        `

    container.insertAdjacentHTML("beforeend", medicineHTML)
  }

  async savePrescription() {
    const form = document.getElementById("prescription-form")
    const formData = new FormData(form)

    const appointmentId = formData.get("appointmentId")
    const diagnosis = formData.get("diagnosis")
    const notes = formData.get("notes")

    // Collect medicines
    const medicines = []
    const medicineItems = document.querySelectorAll(".medicine-item")

    medicineItems.forEach((item) => {
      const medicineName = item.querySelector('[name="medicineName"]').value
      const dosage = item.querySelector('[name="dosage"]').value
      const frequency = item.querySelector('[name="frequency"]').value
      const durationDays = item.querySelector('[name="durationDays"]').value
      const instructions = item.querySelector('[name="instructions"]').value

      if (medicineName && dosage && frequency && durationDays) {
        medicines.push({
          medicineName,
          dosage,
          frequency,
          durationDays: Number.parseInt(durationDays),
          instructions,
        })
      }
    })

    const prescriptionData = {
      appointmentId: Number.parseInt(appointmentId),
      diagnosis,
      notes,
      medicines,
    }

    try {
      const response = await fetch(`${this.baseURL}/prescriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prescriptionData),
      })

      if (response.ok) {
        this.showNotification("Prescription saved successfully!", "success")
        this.closeModal(document.getElementById("prescription-modal"))

        // Mark appointment as completed
        await this.completeAppointment(appointmentId)

        // Refresh dashboard data
        this.loadDashboardData()
      } else {
        throw new Error("Failed to save prescription")
      }
    } catch (error) {
      console.error("Error saving prescription:", error)
      this.showNotification("Error saving prescription. Please try again.", "error")
    }
  }

  async completeAppointment(appointmentId) {
    try {
      const response = await fetch(`${this.baseURL}/appointments/${appointmentId}/complete`, {
        method: "PUT",
      })

      if (response.ok) {
        this.showNotification("Appointment marked as completed!", "success")
      }
    } catch (error) {
      console.error("Error completing appointment:", error)
    }
  }

  openModal(modal) {
    modal.classList.add("active")
    document.body.style.overflow = "hidden"
  }

  closeModal(modal) {
    modal.classList.remove("active")
    document.body.style.overflow = ""
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `notification ${type} show`

    const iconMap = {
      success: "fas fa-check",
      error: "fas fa-times",
      warning: "fas fa-exclamation",
      info: "fas fa-info",
    }

    notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="${iconMap[type]}"></i>
                </div>
                <div class="notification-text">
                    <p>${message}</p>
                </div>
            </div>
        `

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.classList.remove("show")
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 3000)
  }

  showEmptyAppointments() {
    const tbody = document.querySelector("#appointments-table tbody")
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">No appointments for today</td></tr>'
  }

  showEmptyPatients() {
    const tbody = document.querySelector("#patients-table tbody")
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">No recent patients</td></tr>'
  }

  showEmptyActivity() {
    const activityList = document.getElementById("activity-list")
    activityList.innerHTML = '<li class="loading-item">No recent activity</li>'
  }

  logout() {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("doctorId")
      localStorage.removeItem("doctorToken")
      window.location.href = "login.html"
    }
  }

  // Utility functions
  getInitials(name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  formatTime(timeString) {
    if (!timeString) return ""
    const [hours, minutes] = timeString.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  formatDate(dateString) {
    if (!dateString) return ""
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
  }

  getRelativeTime(dateString) {
    if (!dateString) return ""
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.doctorDashboard = new DoctorDashboard()
})

// Handle responsive sidebar
window.addEventListener("resize", () => {
  const sidebar = document.querySelector(".sidebar")
  if (sidebar && window.innerWidth > 768) {
    sidebar.classList.remove("active")
  }
})
