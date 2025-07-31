import { API_ENDPOINTS, apiRequest, checkAuth, formatDateTime, showNotification } from "./config.js"

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
    await loadAppointments()
    await loadPatients()
    await loadDoctors()
    setupEventListeners()
  } catch (error) {
    console.error("Error initializing page:", error)
    showNotification("Error loading page data", "error")
  }
}

async function loadAppointments() {
  try {
    showLoading()

    const params = new URLSearchParams({
      page: currentPage,
      size: currentSize,
    })

    let response
    if (currentFilters.status) {
      response = await apiRequest(`${API_ENDPOINTS.appointments.byStatus}/${currentFilters.status}?${params}`)
    } else if (currentFilters.creator === "ADMIN") {
      response = await apiRequest(`${API_ENDPOINTS.appointments.byAdmin}?${params}`)
    } else {
      response = await apiRequest(`${API_ENDPOINTS.appointments.base}?${params}`)
    }

    displayAppointments(response)
  } catch (error) {
    console.error("Error loading appointments:", error)
    showNotification("Error loading appointments", "error")
    hideLoading()
  }
}

function displayAppointments(response) {
  const tbody = document.getElementById("appointmentsTableBody")

  if (!response.content || response.content.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No appointments found</td></tr>'
    hideLoading()
    return
  }

  tbody.innerHTML = response.content
    .map(
      (appointment) => `
        <tr>
            <td>${appointment.appointmentId}</td>
            <td>${appointment.patientName}</td>
            <td>Dr. ${appointment.doctorName}</td>
            <td>${formatDateTime(appointment.appointmentDate)}</td>
            <td><span class="status-badge status-${appointment.appointmentStatus.toLowerCase()}">${appointment.appointmentStatus}</span></td>
            <td><span class="status-badge status-${appointment.paymentStatus.toLowerCase()}">${appointment.paymentStatus}</span></td>
            <td><span class="status-badge ${appointment.createdByAdmin ? "status-verified" : "status-pending"}">${appointment.createdByAdmin ? "Admin" : "User"}</span></td>
            <td>
                <div class="flex gap-1">
                    <div class="dropdown">
                        <button class="btn btn-sm btn-primary dropdown-toggle" onclick="toggleDropdown(${appointment.appointmentId})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <div class="dropdown-menu" id="dropdown-${appointment.appointmentId}">
                            <a href="#" onclick="viewAppointmentDetails(${appointment.appointmentId})">Appointment Details</a>
                            <a href="#" onclick="viewUserInfo(${appointment.userId})">User Info</a>
                            <a href="#" onclick="viewPatientDetails(${appointment.patientId})">Patient Details</a>
                            <a href="#" onclick="viewDoctorDetails(${appointment.doctorId})">Doctor Details</a>
                            <a href="#" onclick="viewPatientHistory(${appointment.patientId})">Patient History</a>
                            <a href="#" onclick="viewPatientReports(${appointment.appointmentId})">Patient Reports</a>
                            <a href="#" onclick="viewMedicalReports(${appointment.appointmentId})">Medical Reports</a>
                            <a href="#" onclick="viewPrescription(${appointment.appointmentId})">Prescription</a>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-warning" onclick="editAppointment(${appointment.appointmentId})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="rescheduleAppointment(${appointment.appointmentId})">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAppointment(${appointment.appointmentId})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `,
    )
    .join("")

  updatePagination(response)
  hideLoading()
}

async function loadPatients() {
  try {
    const patients = await apiRequest(API_ENDPOINTS.patients.base)
    const select = document.getElementById("patientId")

    select.innerHTML = '<option value="">Select Patient</option>'
    patients.forEach((patient) => {
      const option = document.createElement("option")
      option.value = patient.patientId
      option.textContent = `${patient.fullName} (ID: ${patient.patientId})`
      select.appendChild(option)
    })
  } catch (error) {
    console.error("Error loading patients:", error)
  }
}

async function loadDoctors() {
  try {
    const doctors = await apiRequest(API_ENDPOINTS.doctors.base)
    const select = document.getElementById("doctorId")

    select.innerHTML = '<option value="">Select Doctor</option>'
    doctors.forEach((doctor) => {
      const option = document.createElement("option")
      option.value = doctor.doctorId
      option.textContent = `Dr. ${doctor.fullName} - ${doctor.specialization}`
      select.appendChild(option)
    })
  } catch (error) {
    console.error("Error loading doctors:", error)
  }
}

function setupEventListeners() {
  // Appointment form submit
  document.getElementById("appointmentForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    await saveAppointment()
  })

  // Reschedule form submit
  document.getElementById("rescheduleForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    await saveReschedule()
  })
}

window.searchAppointments = () => {
  const searchName = document.getElementById("searchByName").value.trim()
  const searchId = document.getElementById("searchByAppointmentId").value.trim()

  currentFilters.searchName = searchName
  currentFilters.searchId = searchId
  currentPage = 0

  if (searchName || searchId) {
    searchAppointmentsWithFilters()
  } else {
    loadAppointments()
  }
}

async function searchAppointmentsWithFilters() {
  try {
    showLoading()

    const endpoint = API_ENDPOINTS.appointments.search
    const params = new URLSearchParams({
      page: currentPage,
      size: currentSize,
    })

    if (currentFilters.searchName) {
      params.append("name", currentFilters.searchName)
    }
    if (currentFilters.searchId) {
      params.append("appointmentId", currentFilters.searchId)
    }

    const response = await apiRequest(`${endpoint}?${params}`)
    displayAppointments(response)
  } catch (error) {
    console.error("Error searching appointments:", error)
    showNotification("Error searching appointments", "error")
    hideLoading()
  }
}

window.filterAppointments = () => {
  const status = document.getElementById("filterByStatus").value
  const creator = document.getElementById("filterByCreator").value

  currentFilters.status = status
  currentFilters.creator = creator
  currentPage = 0

  loadAppointments()
}

window.refreshAppointments = () => {
  currentPage = 0
  currentFilters = {}

  // Clear search inputs
  document.getElementById("searchByName").value = ""
  document.getElementById("searchByAppointmentId").value = ""
  document.getElementById("filterByStatus").value = ""
  document.getElementById("filterByCreator").value = ""

  loadAppointments()
  showNotification("Appointments list refreshed", "success")
}

window.openCreateAppointmentModal = () => {
  isEditMode = false
  document.getElementById("appointmentFormTitle").textContent = "Create Appointment"
  document.getElementById("appointmentForm").reset()
  document.getElementById("appointmentId").value = ""
  document.getElementById("createAppointmentModal").style.display = "block"
}

window.editAppointment = async (appointmentId) => {
  try {
    const appointment = await apiRequest(`${API_ENDPOINTS.appointments.base}/${appointmentId}`)

    isEditMode = true
    document.getElementById("appointmentFormTitle").textContent = "Edit Appointment"
    document.getElementById("appointmentId").value = appointment.appointmentId
    document.getElementById("patientId").value = appointment.patientId
    document.getElementById("doctorId").value = appointment.doctorId
    document.getElementById("appointmentDate").value = appointment.appointmentDate.split("T")[0]
    document.getElementById("appointmentTime").value = appointment.appointmentDate.split("T")[1].substring(0, 5)
    document.getElementById("appointmentStatus").value = appointment.appointmentStatus
    document.getElementById("paymentStatus").value = appointment.paymentStatus
    document.getElementById("appointmentNotes").value = appointment.notes || ""

    document.getElementById("createAppointmentModal").style.display = "block"
  } catch (error) {
    console.error("Error loading appointment for edit:", error)
    showNotification("Error loading appointment details", "error")
  }
}

async function saveAppointment() {
  try {
    // Check if payment is done before creating appointment
    const paymentStatus = document.getElementById("paymentStatus").value
    if (!isEditMode && paymentStatus !== "PAID") {
      showNotification("Appointment can only be created after payment is completed", "error")
      return
    }

    const appointmentData = {
      patientId: Number.parseInt(document.getElementById("patientId").value),
      doctorId: Number.parseInt(document.getElementById("doctorId").value),
      appointmentDate: `${document.getElementById("appointmentDate").value}T${document.getElementById("appointmentTime").value}`,
      appointmentStatus: document.getElementById("appointmentStatus").value,
      paymentStatus: paymentStatus,
      notes: document.getElementById("appointmentNotes").value.trim(),
      createdByAdmin: true,
    }

    const appointmentId = document.getElementById("appointmentId").value

    if (isEditMode && appointmentId) {
      await apiRequest(`${API_ENDPOINTS.appointments.base}/${appointmentId}`, {
        method: "PUT",
        body: JSON.stringify(appointmentData),
      })
      showNotification("Appointment updated successfully", "success")
    } else {
      await apiRequest(API_ENDPOINTS.appointments.base, {
        method: "POST",
        body: JSON.stringify(appointmentData),
      })
      showNotification("Appointment created successfully", "success")
    }

    closeCreateAppointmentModal()
    loadAppointments()
  } catch (error) {
    console.error("Error saving appointment:", error)
    showNotification("Error saving appointment: " + error.message, "error")
  }
}

window.rescheduleAppointment = async (appointmentId) => {
  try {
    const appointment = await apiRequest(`${API_ENDPOINTS.appointments.base}/${appointmentId}`)

    document.getElementById("rescheduleAppointmentId").value = appointmentId
    document.getElementById("newAppointmentDate").value = appointment.appointmentDate.split("T")[0]
    document.getElementById("newAppointmentTime").value = appointment.appointmentDate.split("T")[1].substring(0, 5)
    document.getElementById("rescheduleReason").value = ""

    document.getElementById("rescheduleModal").style.display = "block"
  } catch (error) {
    console.error("Error loading appointment for reschedule:", error)
    showNotification("Error loading appointment details", "error")
  }
}

async function saveReschedule() {
  try {
    const appointmentId = document.getElementById("rescheduleAppointmentId").value
    const rescheduleData = {
      newAppointmentDate: `${document.getElementById("newAppointmentDate").value}T${document.getElementById("newAppointmentTime").value}`,
      reason: document.getElementById("rescheduleReason").value.trim(),
    }

    const endpoint = API_ENDPOINTS.appointments.reschedule.replace("{id}", appointmentId)
    await apiRequest(endpoint, {
      method: "PUT",
      body: JSON.stringify(rescheduleData),
    })

    showNotification("Appointment rescheduled successfully", "success")
    closeRescheduleModal()
    loadAppointments()
  } catch (error) {
    console.error("Error rescheduling appointment:", error)
    showNotification("Error rescheduling appointment: " + error.message, "error")
  }
}

window.deleteAppointment = async (appointmentId) => {
  if (!confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) {
    return
  }

  try {
    await apiRequest(`${API_ENDPOINTS.appointments.base}/${appointmentId}`, {
      method: "DELETE",
    })

    showNotification("Appointment deleted successfully", "success")
    loadAppointments()
  } catch (error) {
    console.error("Error deleting appointment:", error)
    showNotification("Error deleting appointment: " + error.message, "error")
  }
}

// View functions
window.viewAppointmentDetails = async (appointmentId) => {
  try {
    const appointment = await apiRequest(`${API_ENDPOINTS.appointments.base}/${appointmentId}`)

    const modalBody = document.getElementById("appointmentModalBody")
    modalBody.innerHTML = `
      <div class="appointment-details">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Appointment ID</span>
            <span class="info-value">${appointment.appointmentId}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Patient</span>
            <span class="info-value">${appointment.patientName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Doctor</span>
            <span class="info-value">Dr. ${appointment.doctorName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date & Time</span>
            <span class="info-value">${formatDateTime(appointment.appointmentDate)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Status</span>
            <span class="info-value">
              <span class="status-badge status-${appointment.appointmentStatus.toLowerCase()}">${appointment.appointmentStatus}</span>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Payment Status</span>
            <span class="info-value">
              <span class="status-badge status-${appointment.paymentStatus.toLowerCase()}">${appointment.paymentStatus}</span>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Created By</span>
            <span class="info-value">${appointment.createdByAdmin ? "Admin" : "User"}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Notes</span>
            <span class="info-value">${appointment.notes || "No notes"}</span>
          </div>
        </div>
      </div>
    `

    document.getElementById("appointmentModal").style.display = "block"
  } catch (error) {
    console.error("Error loading appointment details:", error)
    showNotification("Error loading appointment details", "error")
  }
}

window.viewUserInfo = async (userId) => {
  try {
    const user = await apiRequest(`${API_ENDPOINTS.users.base}/${userId}`)
    showNotification(`User: ${user.fullName} (${user.email})`, "info")
  } catch (error) {
    console.error("Error loading user info:", error)
    showNotification("Error loading user info", "error")
  }
}

window.viewPatientDetails = async (patientId) => {
  try {
    const patient = await apiRequest(`${API_ENDPOINTS.patients.base}/${patientId}`)
    showNotification(`Patient: ${patient.fullName} (Age: ${patient.age || "N/A"})`, "info")
  } catch (error) {
    console.error("Error loading patient details:", error)
    showNotification("Error loading patient details", "error")
  }
}

window.viewDoctorDetails = async (doctorId) => {
  try {
    const doctor = await apiRequest(`${API_ENDPOINTS.doctors.base}/${doctorId}`)
    showNotification(`Doctor: ${doctor.fullName} - ${doctor.specialization}`, "info")
  } catch (error) {
    console.error("Error loading doctor details:", error)
    showNotification("Error loading doctor details", "error")
  }
}

window.viewPatientHistory = async (patientId) => {
  try {
    const appointments = await apiRequest(`${API_ENDPOINTS.appointments.byPatient}/${patientId}`)
    showNotification(`Patient has ${appointments.length || 0} total appointments`, "info")
  } catch (error) {
    console.error("Error loading patient history:", error)
    showNotification("Error loading patient history", "error")
  }
}

window.viewPatientReports = async (appointmentId) => {
  try {
    const endpoint = API_ENDPOINTS.appointments.reports.replace("{id}", appointmentId)
    const reports = await apiRequest(`${endpoint}/patient`)
    showNotification(`Found ${reports.length || 0} patient reports`, "info")
  } catch (error) {
    console.error("Error loading patient reports:", error)
    showNotification("Error loading patient reports", "error")
  }
}

window.viewMedicalReports = async (appointmentId) => {
  try {
    const endpoint = API_ENDPOINTS.appointments.reports.replace("{id}", appointmentId)
    const reports = await apiRequest(`${endpoint}/medical`)
    showNotification(`Found ${reports.length || 0} medical reports`, "info")
  } catch (error) {
    console.error("Error loading medical reports:", error)
    showNotification("Error loading medical reports", "error")
  }
}

window.viewPrescription = async (appointmentId) => {
  try {
    const endpoint = API_ENDPOINTS.appointments.prescription.replace("{id}", appointmentId)
    const prescription = await apiRequest(endpoint)
    showNotification(`Prescription loaded with ${prescription.medicines?.length || 0} medicines`, "info")
  } catch (error) {
    console.error("Error loading prescription:", error)
    showNotification("Error loading prescription", "error")
  }
}

// Utility functions
window.toggleDropdown = (appointmentId) => {
  const dropdown = document.getElementById(`dropdown-${appointmentId}`)
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block"
}

window.closeAppointmentModal = () => {
  document.getElementById("appointmentModal").style.display = "none"
}

window.closeCreateAppointmentModal = () => {
  document.getElementById("createAppointmentModal").style.display = "none"
}

window.closeRescheduleModal = () => {
  document.getElementById("rescheduleModal").style.display = "none"
}

function updatePagination(response) {
  const pagination = document.getElementById("pagination")
  const totalPages = response.totalPages || 0

  if (totalPages <= 1) {
    pagination.innerHTML = ""
    return
  }

  let paginationHTML = ""

  // Previous button
  paginationHTML += `
    <button ${currentPage === 0 ? "disabled" : ""} onclick="changePage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i> Previous
    </button>
  `

  // Page numbers
  const startPage = Math.max(0, currentPage - 2)
  const endPage = Math.min(totalPages - 1, currentPage + 2)

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button class="${i === currentPage ? "active" : ""}" onclick="changePage(${i})">
          ${i + 1}
      </button>
    `
  }

  // Next button
  paginationHTML += `
    <button ${currentPage >= totalPages - 1 ? "disabled" : ""} onclick="changePage(${currentPage + 1})">
        Next <i class="fas fa-chevron-right"></i>
    </button>
  `

  pagination.innerHTML = paginationHTML
}

window.changePage = (page) => {
  currentPage = page
  loadAppointments()
}

function showLoading() {
  const tbody = document.getElementById("appointmentsTableBody")
  tbody.innerHTML =
    '<tr><td colspan="8" class="text-center"><div class="loading"><div class="spinner"></div></div></td></tr>'
}

function hideLoading() {
  // Loading will be replaced by actual content
}

// Close modals when clicking outside
window.addEventListener("click", (event) => {
  const appointmentModal = document.getElementById("appointmentModal")
  const createAppointmentModal = document.getElementById("createAppointmentModal")
  const rescheduleModal = document.getElementById("rescheduleModal")

  if (event.target === appointmentModal) {
    window.closeAppointmentModal()
  }
  if (event.target === createAppointmentModal) {
    window.closeCreateAppointmentModal()
  }
  if (event.target === rescheduleModal) {
    window.closeRescheduleModal()
  }
})
