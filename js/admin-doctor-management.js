import { API_ENDPOINTS, apiRequest, checkAuth, formatDate, formatDateTime, showNotification } from "./config.js"

let currentPage = 0
const currentSize = 10
let currentFilters = {}
let allSpecialities = []
let currentDoctorId = null
let currentSubmodule = "schedules"

// Check authentication on page load
document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return

  initializePage()
})

async function initializePage() {
  try {
    await loadSpecialities()
    await loadDoctors()
    setupEventListeners()

    // Check if there's a specific verification to view from URL params
    const urlParams = new URLSearchParams(window.location.search)
    const verificationId = urlParams.get("verification")
    if (verificationId) {
      window.viewDoctorVerification(verificationId)
    }
  } catch (error) {
    console.error("Error initializing page:", error)
    showNotification("Error loading page data", "error")
  }
}

async function loadSpecialities() {
  try {
    const specialities = await apiRequest(API_ENDPOINTS.doctors.specialities)
    allSpecialities = specialities || []

    const select = document.getElementById("filterBySpeciality")
    select.innerHTML = '<option value="">All Specialities</option>'

    allSpecialities.forEach((speciality) => {
      const option = document.createElement("option")
      option.value = speciality
      option.textContent = speciality
      select.appendChild(option)
    })
  } catch (error) {
    console.error("Error loading specialities:", error)
  }
}

async function loadDoctors() {
  try {
    showLoading()

    // Build query parameters
    const params = new URLSearchParams({
      page: currentPage,
      size: currentSize,
    })

    let response

    // Add filters
    if (currentFilters.status) {
      const endpoint = `${API_ENDPOINTS.documentsVerification.byStatus}/${currentFilters.status}`
      response = await apiRequest(`${endpoint}?${params}`)
    } else {
      response = await apiRequest(`${API_ENDPOINTS.documentsVerification.base}?${params}`)
    }

    // Get doctor details for each verification
    if (response.content && response.content.length > 0) {
      const enrichedContent = await Promise.all(
        response.content.map(async (verification) => {
          try {
            const doctor = await apiRequest(`${API_ENDPOINTS.doctors.base}/${verification.doctorId}`)
            return {
              ...verification,
              doctor: doctor,
            }
          } catch (error) {
            console.error(`Error loading doctor ${verification.doctorId}:`, error)
            return verification
          }
        }),
      )
      response.content = enrichedContent
    }

    displayDoctors(response)
  } catch (error) {
    console.error("Error loading doctors:", error)
    showNotification("Error loading doctors", "error")
    hideLoading()
  }
}

function displayDoctors(response) {
  const tbody = document.getElementById("doctorsTableBody")

  if (!response.content || response.content.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">No doctors found</td></tr>'
    hideLoading()
    return
  }

  tbody.innerHTML = response.content
    .map((verification) => {
      const doctor = verification.doctor || {}
      return `
            <tr>
                <td>${verification.doctorId || "N/A"}</td>
                <td>${verification.doctorName || doctor.fullName || "N/A"}</td>
                <td>${doctor.email || "N/A"}</td>
                <td>${doctor.specialization || "N/A"}</td>
                <td>${doctor.experienceYears || 0} years</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="viewPatientCount(${verification.doctorId})" id="patientBtn-${verification.doctorId}">
                        <i class="fas fa-users"></i> Loading...
                    </button>
                </td>
                <td>
                    <span class="status-badge status-${verification.verificationStatus.toLowerCase()}">
                        ${verification.verificationStatus}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewDocuments(${verification.documentsVerificationId})">
                        <i class="fas fa-file-alt"></i> View
                    </button>
                </td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-sm btn-primary" onclick="window.viewDoctorDetails(${verification.doctorId})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="openDoctorSubmodules(${verification.doctorId}, '${verification.doctorName || doctor.fullName}')">
                            <i class="fas fa-cogs"></i>
                        </button>
                        <button class="btn btn-sm btn-success" onclick="updateVerificationStatus(${verification.documentsVerificationId}, 'VERIFIED')" 
                                ${verification.verificationStatus !== "PENDING" ? "disabled" : ""}>
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="updateVerificationStatus(${verification.documentsVerificationId}, 'REJECTED')" 
                                ${verification.verificationStatus !== "PENDING" ? "disabled" : ""}>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `
    })
    .join("")

  // Load patient counts for each doctor
  response.content.forEach((verification) => {
    if (verification.doctorId) {
      loadPatientCountForDoctor(verification.doctorId)
    }
  })

  updatePagination(response)
  hideLoading()
}

// Fix the loadPatientCountForDoctor function
async function loadPatientCountForDoctor(doctorId) {
  try {
    // Try multiple endpoints to get patient count
    let patientCount = 0

    try {
      const appointments = await apiRequest(`${API_ENDPOINTS.appointments.byDoctor}/${doctorId}`)
      patientCount = appointments.totalElements || appointments.length || 0
    } catch (error) {
      console.error(`Error loading appointments for doctor ${doctorId}:`, error)
      // Try alternative endpoint
      try {
        const stats = await apiRequest(`${API_ENDPOINTS.doctors.base}/${doctorId}/stats`)
        patientCount = stats.totalPatientsCurrentMonth || stats.totalPatients || 0
      } catch (statsError) {
        console.error(`Error loading stats for doctor ${doctorId}:`, statsError)
        patientCount = 0
      }
    }

    const button = document.getElementById(`patientBtn-${doctorId}`)
    if (button) {
      button.innerHTML = `<i class="fas fa-users"></i> ${patientCount}`
    }
  } catch (error) {
    console.error(`Error loading patient count for doctor ${doctorId}:`, error)
    const button = document.getElementById(`patientBtn-${doctorId}`)
    if (button) {
      button.innerHTML = `<i class="fas fa-users"></i> 0`
    }
  }
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

function setupEventListeners() {
  // Verification status change listener
  document.getElementById("verificationStatus").addEventListener("change", function () {
    const rejectionGroup = document.getElementById("rejectionReasonGroup")
    if (this.value === "REJECTED") {
      rejectionGroup.style.display = "block"
    } else {
      rejectionGroup.style.display = "none"
    }
  })

  // Verification form submit
  document.getElementById("verificationForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const doctorId = document.getElementById("doctorIdForVerification").value
    const status = document.getElementById("verificationStatus").value
    const reason = document.getElementById("rejectionReason").value

    try {
      const updateData = {
        verificationStatus: status,
      }

      if (status === "REJECTED" && reason) {
        updateData.rejectionReason = reason
      }

      await apiRequest(`${API_ENDPOINTS.documentsVerification.base}/doctor/${doctorId}/status`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      })

      showNotification(`Doctor verification status updated to ${status}`, "success")
      window.closeVerificationModal()
      loadDoctors()
    } catch (error) {
      console.error("Error updating verification status:", error)
      showNotification("Error updating verification status", "error")
    }
  })

  // Create doctor form submit
  document.getElementById("createDoctorForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    await createDoctorWithDocuments()
  })
}

// Create Doctor Functions
window.openCreateDoctorModal = () => {
  document.getElementById("createDoctorForm").reset()
  document.getElementById("createDoctorModal").style.display = "block"
}

window.closeCreateDoctorModal = () => {
  document.getElementById("createDoctorModal").style.display = "none"
}

async function createDoctorWithDocuments() {
  try {
    const formData = new FormData()

    // Doctor data
    const doctorData = {
      fullName: document.getElementById("doctorFullName").value.trim(),
      email: document.getElementById("doctorEmail").value.trim(),
      phone: document.getElementById("doctorPhone").value.trim(),
      specialization: document.getElementById("doctorSpecialization").value.trim(),
      experienceYears: Number.parseInt(document.getElementById("doctorExperience").value),
      medicalLicenseNumber: document.getElementById("doctorLicense").value.trim(),
      fees: Number.parseFloat(document.getElementById("doctorFees").value),
      password: document.getElementById("doctorPassword").value,
      address: document.getElementById("doctorAddress").value.trim(),
    }

    // Validate required fields
    if (
      !doctorData.fullName ||
      !doctorData.email ||
      !doctorData.phone ||
      !doctorData.specialization ||
      !doctorData.medicalLicenseNumber ||
      !doctorData.password ||
      !doctorData.address
    ) {
      showNotification("Please fill in all required fields", "error")
      return
    }

    // Append doctor data
    formData.append("doctorData", new Blob([JSON.stringify(doctorData)], { type: "application/json" }))

    // Append documents
    const requiredDocs = ["governmentIdProof", "medicalRegistrationCertificate", "educationalCertificate"]
    const optionalDocs = ["experienceCertificate", "specializationCertificate"]

    for (const docId of requiredDocs) {
      const file = document.getElementById(docId).files[0]
      if (!file) {
        showNotification(`Please upload ${docId.replace(/([A-Z])/g, " $1").toLowerCase()}`, "error")
        return
      }
      formData.append(docId, file)
    }

    for (const docId of optionalDocs) {
      const file = document.getElementById(docId).files[0]
      if (file) {
        formData.append(docId, file)
      }
    }

    // Create doctor with documents using correct endpoint
    const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080"
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.doctors.signupWithDocuments}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || "Failed to create doctor")
    }

    showNotification("Doctor created successfully with verification documents", "success")
    window.closeCreateDoctorModal()
    loadDoctors()
  } catch (error) {
    console.error("Error creating doctor:", error)
    showNotification("Error creating doctor: " + error.message, "error")
  }
}

// Doctor Submodules Functions
window.openDoctorSubmodules = (doctorId, doctorName) => {
  currentDoctorId = doctorId
  document.getElementById("submoduleTitle").textContent = `Manage Dr. ${doctorName}`
  document.getElementById("doctorSubmodulesModal").style.display = "block"
  window.showSubmodule("schedules")
}

window.closeDoctorSubmodulesModal = () => {
  document.getElementById("doctorSubmodulesModal").style.display = "none"
  currentDoctorId = null
}

window.showSubmodule = (submodule) => {
  currentSubmodule = submodule

  // Update active tab
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
  event.target.classList.add("active")

  // Load submodule content
  switch (submodule) {
    case "schedules":
      loadWeeklySchedules()
      break
    case "slots":
      loadAppointmentSlots()
      break
    case "holidays":
      loadDoctorHolidays()
      break
    case "reviews":
      loadDoctorReviews()
      break
  }
}

// Weekly Schedules Management
async function loadWeeklySchedules() {
  const content = document.getElementById("submoduleContent")
  content.innerHTML = `
    <div class="submodule-header">
      <h3>Weekly Schedules</h3>
      <button class="btn btn-primary" onclick="openCreateScheduleModal()">
        <i class="fas fa-plus"></i> Add Schedule
      </button>
    </div>
    <div id="schedulesTable">Loading...</div>
    
    <!-- Create/Edit Schedule Modal -->
    <div id="scheduleModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="scheduleModalTitle">Add Weekly Schedule</h3>
          <span class="close" onclick="closeScheduleModal()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="scheduleForm">
            <input type="hidden" id="scheduleId">
            <div class="form-group">
              <label>Day of Week *</label>
              <select id="dayOfWeek" required>
                <option value="">Select Day</option>
                <option value="MONDAY">Monday</option>
                <option value="TUESDAY">Tuesday</option>
                <option value="WEDNESDAY">Wednesday</option>
                <option value="THURSDAY">Thursday</option>
                <option value="FRIDAY">Friday</option>
                <option value="SATURDAY">Saturday</option>
                <option value="SUNDAY">Sunday</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Start Time *</label>
                <input type="time" id="startTime" required>
              </div>
              <div class="form-group">
                <label>End Time *</label>
                <input type="time" id="endTime" required>
              </div>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="isAvailable"> Available
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="closeScheduleModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Schedule</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `

  try {
    // Fix the endpoint URL
    const endpoint = API_ENDPOINTS.doctors.weeklySchedules.replace("{id}", currentDoctorId)
    const schedules = await apiRequest(endpoint)
    displayWeeklySchedules(schedules)
  } catch (error) {
    console.error("Error loading weekly schedules:", error)
    document.getElementById("schedulesTable").innerHTML =
      "<p>No weekly schedules found. Click 'Add Schedule' to create one.</p>"
  }

  // Setup schedule form
  document.getElementById("scheduleForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    await saveWeeklySchedule()
  })
}

function displayWeeklySchedules(schedules) {
  const container = document.getElementById("schedulesTable")

  if (!schedules || schedules.length === 0) {
    container.innerHTML = "<p>No weekly schedules found</p>"
    return
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Day</th>
          <th>Start Time</th>
          <th>End Time</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${schedules
          .map(
            (schedule) => `
          <tr>
            <td>${schedule.dayOfWeek}</td>
            <td>${schedule.startTime}</td>
            <td>${schedule.endTime}</td>
            <td>
              <span class="status-badge ${schedule.isAvailable ? "status-verified" : "status-rejected"}">
                ${schedule.isAvailable ? "Available" : "Unavailable"}
              </span>
            </td>
            <td>
              <div class="flex gap-1">
                <button class="btn btn-sm btn-warning" onclick="editWeeklySchedule(${schedule.id})">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteWeeklySchedule(${schedule.id})">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `
}

window.openCreateScheduleModal = () => {
  document.getElementById("scheduleModalTitle").textContent = "Add Weekly Schedule"
  document.getElementById("scheduleForm").reset()
  document.getElementById("scheduleId").value = ""
  document.getElementById("scheduleModal").style.display = "block"
}

window.closeScheduleModal = () => {
  document.getElementById("scheduleModal").style.display = "none"
}

window.editWeeklySchedule = async (scheduleId) => {
  try {
    const schedule = await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/weekly-schedules/${scheduleId}`)

    document.getElementById("scheduleModalTitle").textContent = "Edit Weekly Schedule"
    document.getElementById("scheduleId").value = schedule.id
    document.getElementById("dayOfWeek").value = schedule.dayOfWeek
    document.getElementById("startTime").value = schedule.startTime
    document.getElementById("endTime").value = schedule.endTime
    document.getElementById("isAvailable").checked = schedule.isAvailable

    document.getElementById("scheduleModal").style.display = "block"
  } catch (error) {
    console.error("Error loading schedule:", error)
    showNotification("Error loading schedule details", "error")
  }
}

window.deleteWeeklySchedule = async (scheduleId) => {
  if (!confirm("Are you sure you want to delete this schedule?")) return

  try {
    await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/weekly-schedules/${scheduleId}`, {
      method: "DELETE",
    })
    showNotification("Schedule deleted successfully", "success")
    loadWeeklySchedules()
  } catch (error) {
    console.error("Error deleting schedule:", error)
    showNotification("Error deleting schedule", "error")
  }
}

async function saveWeeklySchedule() {
  try {
    const scheduleData = {
      dayOfWeek: document.getElementById("dayOfWeek").value,
      startTime: document.getElementById("startTime").value,
      endTime: document.getElementById("endTime").value,
      isAvailable: document.getElementById("isAvailable").checked,
    }

    const scheduleId = document.getElementById("scheduleId").value

    if (scheduleId) {
      // Update
      await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/weekly-schedules/${scheduleId}`, {
        method: "PUT",
        body: JSON.stringify(scheduleData),
      })
      showNotification("Schedule updated successfully", "success")
    } else {
      // Create
      await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/weekly-schedules`, {
        method: "POST",
        body: JSON.stringify(scheduleData),
      })
      showNotification("Schedule created successfully", "success")
    }

    window.closeScheduleModal()
    loadWeeklySchedules()
  } catch (error) {
    console.error("Error saving schedule:", error)
    showNotification("Error saving schedule", "error")
  }
}

// Appointment Slots Management
async function loadAppointmentSlots() {
  const content = document.getElementById("submoduleContent")
  content.innerHTML = `
    <div class="submodule-header">
      <h3>Appointment Slots</h3>
      <div class="flex gap-2">
        <input type="date" id="slotDate" onchange="loadSlotsForDate()">
        <button class="btn btn-primary" onclick="openCreateSlotModal()">
          <i class="fas fa-plus"></i> Add Slot
        </button>
      </div>
    </div>
    <div id="slotsTable">Select a date to view slots</div>
    
    <!-- Create/Edit Slot Modal -->
    <div id="slotModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="slotModalTitle">Add Appointment Slot</h3>
          <span class="close" onclick="closeSlotModal()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="slotForm">
            <input type="hidden" id="slotId">
            <div class="form-group">
              <label>Date *</label>
              <input type="date" id="slotDateInput" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Start Time *</label>
                <input type="time" id="slotStartTime" required>
              </div>
              <div class="form-group">
                <label>End Time *</label>
                <input type="time" id="slotEndTime" required>
              </div>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="slotIsAvailable" checked> Available
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="closeSlotModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Slot</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `

  // Set today's date as default
  document.getElementById("slotDate").value = new Date().toISOString().split("T")[0]

  // Setup slot form
  document.getElementById("slotForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    await saveAppointmentSlot()
  })
}

// Fix the loadAppointmentSlots function
window.loadSlotsForDate = async () => {
  const selectedDate = document.getElementById("slotDate").value
  if (!selectedDate) return

  try {
    const endpoint = API_ENDPOINTS.doctors.appointmentSlots.replace("{id}", currentDoctorId)
    const slots = await apiRequest(`${endpoint}?date=${selectedDate}`)
    displayAppointmentSlots(slots)
  } catch (error) {
    console.error("Error loading appointment slots:", error)
    document.getElementById("slotsTable").innerHTML =
      "<p>No appointment slots found for selected date. Click 'Add Slot' to create one.</p>"
  }
}

function displayAppointmentSlots(slots) {
  const container = document.getElementById("slotsTable")

  if (!slots || slots.length === 0) {
    container.innerHTML = "<p>No appointment slots found for selected date</p>"
    return
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Start Time</th>
          <th>End Time</th>
          <th>Status</th>
          <th>Booked</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${slots
          .map(
            (slot) => `
          <tr>
            <td>${formatDate(slot.date)}</td>
            <td>${slot.startTime}</td>
            <td>${slot.endTime}</td>
            <td>
              <span class="status-badge ${slot.isAvailable ? "status-verified" : "status-rejected"}">
                ${slot.isAvailable ? "Available" : "Unavailable"}
              </span>
            </td>
            <td>
              <span class="status-badge ${slot.isBooked ? "status-pending" : "status-verified"}">
                ${slot.isBooked ? "Booked" : "Free"}
              </span>
            </td>
            <td>
              <div class="flex gap-1">
                <button class="btn btn-sm btn-warning" onclick="editAppointmentSlot(${slot.id})" ${slot.isBooked ? "disabled" : ""}>
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteAppointmentSlot(${slot.id})" ${slot.isBooked ? "disabled" : ""}>
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `
}

window.openCreateSlotModal = () => {
  document.getElementById("slotModalTitle").textContent = "Add Appointment Slot"
  document.getElementById("slotForm").reset()
  document.getElementById("slotId").value = ""
  document.getElementById("slotModal").style.display = "block"
}

window.closeSlotModal = () => {
  document.getElementById("slotModal").style.display = "none"
}

window.editAppointmentSlot = async (slotId) => {
  try {
    const slot = await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/appointment-slots/${slotId}`)

    document.getElementById("slotModalTitle").textContent = "Edit Appointment Slot"
    document.getElementById("slotId").value = slot.id
    document.getElementById("slotDateInput").value = slot.date
    document.getElementById("slotStartTime").value = slot.startTime
    document.getElementById("slotEndTime").value = slot.endTime
    document.getElementById("slotIsAvailable").checked = slot.isAvailable

    document.getElementById("slotModal").style.display = "block"
  } catch (error) {
    console.error("Error loading slot:", error)
    showNotification("Error loading slot details", "error")
  }
}

window.deleteAppointmentSlot = async (slotId) => {
  if (!confirm("Are you sure you want to delete this appointment slot?")) return

  try {
    await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/appointment-slots/${slotId}`, {
      method: "DELETE",
    })
    showNotification("Appointment slot deleted successfully", "success")
    window.loadSlotsForDate()
  } catch (error) {
    console.error("Error deleting slot:", error)
    showNotification("Error deleting appointment slot", "error")
  }
}

async function saveAppointmentSlot() {
  try {
    const slotData = {
      date: document.getElementById("slotDateInput").value,
      startTime: document.getElementById("slotStartTime").value,
      endTime: document.getElementById("slotEndTime").value,
      isAvailable: document.getElementById("slotIsAvailable").checked,
    }

    const slotId = document.getElementById("slotId").value

    if (slotId) {
      // Update
      await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/appointment-slots/${slotId}`, {
        method: "PUT",
        body: JSON.stringify(slotData),
      })
      showNotification("Appointment slot updated successfully", "success")
    } else {
      // Create
      await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/appointment-slots`, {
        method: "POST",
        body: JSON.stringify(slotData),
      })
      showNotification("Appointment slot created successfully", "success")
    }

    window.closeSlotModal()
    window.loadSlotsForDate()
  } catch (error) {
    console.error("Error saving appointment slot:", error)
    showNotification("Error saving appointment slot", "error")
  }
}

// Doctor Holidays Management
async function loadDoctorHolidays() {
  const content = document.getElementById("submoduleContent")
  content.innerHTML = `
    <div class="submodule-header">
      <h3>Doctor Holidays</h3>
      <button class="btn btn-primary" onclick="openCreateHolidayModal()">
        <i class="fas fa-plus"></i> Add Holiday
      </button>
    </div>
    <div id="holidaysTable">Loading...</div>
    
    <!-- Create/Edit Holiday Modal -->
    <div id="holidayModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="holidayModalTitle">Add Holiday</h3>
          <span class="close" onclick="closeHolidayModal()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="holidayForm">
            <input type="hidden" id="holidayId">
            <div class="form-row">
              <div class="form-group">
                <label>Start Date *</label>
                <input type="date" id="holidayStartDate" required>
              </div>
              <div class="form-group">
                <label>End Date *</label>
                <input type="date" id="holidayEndDate" required>
              </div>
            </div>
            <div class="form-group">
              <label>Reason *</label>
              <textarea id="holidayReason" required placeholder="Enter reason for holiday"></textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="closeHolidayModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Holiday</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `

  try {
    const endpoint = API_ENDPOINTS.doctors.holidays.replace("{id}", currentDoctorId)
    const holidays = await apiRequest(endpoint)
    displayDoctorHolidays(holidays)
  } catch (error) {
    console.error("Error loading doctor holidays:", error)
    document.getElementById("holidaysTable").innerHTML = "<p>No holidays found. Click 'Add Holiday' to create one.</p>"
  }

  // Setup holiday form
  document.getElementById("holidayForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    await saveDoctorHoliday()
  })
}

function displayDoctorHolidays(holidays) {
  const container = document.getElementById("holidaysTable")

  if (!holidays || holidays.length === 0) {
    container.innerHTML = "<p>No holidays found</p>"
    return
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Duration</th>
          <th>Reason</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${holidays
          .map((holiday) => {
            const startDate = new Date(holiday.startDate)
            const endDate = new Date(holiday.endDate)
            const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1

            return `
            <tr>
              <td>${formatDate(holiday.startDate)}</td>
              <td>${formatDate(holiday.endDate)}</td>
              <td>${duration} day${duration > 1 ? "s" : ""}</td>
              <td>${holiday.reason}</td>
              <td>
                <div class="flex gap-1">
                  <button class="btn btn-sm btn-warning" onclick="editDoctorHoliday(${holiday.id})">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="deleteDoctorHoliday(${holiday.id})">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `
          })
          .join("")}
      </tbody>
    </table>
  `
}

window.openCreateHolidayModal = () => {
  document.getElementById("holidayModalTitle").textContent = "Add Holiday"
  document.getElementById("holidayForm").reset()
  document.getElementById("holidayId").value = ""
  document.getElementById("holidayModal").style.display = "block"
}

window.closeHolidayModal = () => {
  document.getElementById("holidayModal").style.display = "none"
}

window.editDoctorHoliday = async (holidayId) => {
  try {
    const holiday = await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/holidays/${holidayId}`)

    document.getElementById("holidayModalTitle").textContent = "Edit Holiday"
    document.getElementById("holidayId").value = holiday.id
    document.getElementById("holidayStartDate").value = holiday.startDate
    document.getElementById("holidayEndDate").value = holiday.endDate

    document.getElementById("holidayReason").value = holiday.reason

    document.getElementById("holidayModal").style.display = "block"
  } catch (error) {
    console.error("Error loading holiday:", error)
    showNotification("Error loading holiday details", "error")
  }
}

window.deleteDoctorHoliday = async (holidayId) => {
  if (!confirm("Are you sure you want to delete this holiday?")) return

  try {
    await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/holidays/${holidayId}`, {
      method: "DELETE",
    })
    showNotification("Holiday deleted successfully", "success")
    loadDoctorHolidays()
  } catch (error) {
    console.error("Error deleting holiday:", error)
    showNotification("Error deleting holiday", "error")
  }
}

async function saveDoctorHoliday() {
  try {
    const holidayData = {
      startDate: document.getElementById("holidayStartDate").value,
      endDate: document.getElementById("holidayEndDate").value,
      reason: document.getElementById("holidayReason").value.trim(),
    }

    // Validate dates
    if (new Date(holidayData.endDate) < new Date(holidayData.startDate)) {
      showNotification("End date cannot be before start date", "error")
      return
    }

    const holidayId = document.getElementById("holidayId").value

    if (holidayId) {
      // Update
      await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/holidays/${holidayId}`, {
        method: "PUT",
        body: JSON.stringify(holidayData),
      })
      showNotification("Holiday updated successfully", "success")
    } else {
      // Create
      await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/holidays`, {
        method: "POST",
        body: JSON.stringify(holidayData),
      })
      showNotification("Holiday created successfully", "success")
    }

    window.closeHolidayModal()
    loadDoctorHolidays()
  } catch (error) {
    console.error("Error saving holiday:", error)
    showNotification("Error saving holiday", "error")
  }
}

// Doctor Reviews Management
async function loadDoctorReviews() {
  const content = document.getElementById("submoduleContent")
  content.innerHTML = `
    <div class="submodule-header">
      <h3>Doctor Reviews</h3>
      <button class="btn btn-primary" onclick="openCreateReviewModal()">
        <i class="fas fa-plus"></i> Add Review
      </button>
    </div>
    <div id="reviewsTable">Loading...</div>
    
    <!-- Create/Edit Review Modal -->
    <div id="reviewModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="reviewModalTitle">Add Review</h3>
          <span class="close" onclick="closeReviewModal()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="reviewForm">
            <input type="hidden" id="reviewId">
            <div class="form-group">
              <label>Patient ID *</label>
              <input type="number" id="reviewPatientId" required placeholder="Enter patient ID">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Rating *</label>
                <select id="reviewRating" required>
                  <option value="">Select Rating</option>
                  <option value="1">1 Star</option>
                  <option value="2">2 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="5">5 Stars</option>
                </select>
              </div>
              <div class="form-group">
                <label>Review Date *</label>
                <input type="date" id="reviewDate" required>
              </div>
            </div>
            <div class="form-group">
              <label>Review Text *</label>
              <textarea id="reviewText" required placeholder="Enter review text"></textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="closeReviewModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Review</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `

  try {
    const endpoint = API_ENDPOINTS.doctors.reviews.replace("{id}", currentDoctorId)
    const reviews = await apiRequest(endpoint)
    displayDoctorReviews(reviews)
  } catch (error) {
    console.error("Error loading doctor reviews:", error)
    document.getElementById("reviewsTable").innerHTML = "<p>No reviews found. Click 'Add Review' to create one.</p>"
  }

  // Setup review form
  document.getElementById("reviewForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    await saveDoctorReview()
  })

  // Set today's date as default
  document.getElementById("reviewDate").value = new Date().toISOString().split("T")[0]
}

function displayDoctorReviews(reviews) {
  const container = document.getElementById("reviewsTable")

  if (!reviews || reviews.length === 0) {
    container.innerHTML = "<p>No reviews found</p>"
    return
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Patient</th>
          <th>Rating</th>
          <th>Review Date</th>
          <th>Review Text</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${reviews
          .map(
            (review) => `
          <tr>
            <td>${review.patientName || `Patient #${review.patientId}`}</td>
            <td>
              <div class="rating-stars">
                ${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}
                <span class="rating-number">(${review.rating}/5)</span>
              </div>
            </td>
            <td>${formatDate(review.reviewDate)}</td>
            <td class="review-text">${review.reviewText}</td>
            <td>
              <div class="flex gap-1">
                <button class="btn btn-sm btn-warning" onclick="editDoctorReview(${review.id})">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteDoctorReview(${review.id})">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `
}

window.openCreateReviewModal = () => {
  document.getElementById("reviewModalTitle").textContent = "Add Review"
  document.getElementById("reviewForm").reset()
  document.getElementById("reviewId").value = ""
  document.getElementById("reviewDate").value = new Date().toISOString().split("T")[0]
  document.getElementById("reviewModal").style.display = "block"
}

window.closeReviewModal = () => {
  document.getElementById("reviewModal").style.display = "none"
}

window.editDoctorReview = async (reviewId) => {
  try {
    const review = await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/reviews/${reviewId}`)

    document.getElementById("reviewModalTitle").textContent = "Edit Review"
    document.getElementById("reviewId").value = review.id
    document.getElementById("reviewPatientId").value = review.patientId
    document.getElementById("reviewRating").value = review.rating
    document.getElementById("reviewDate").value = review.reviewDate
    document.getElementById("reviewText").value = review.reviewText

    document.getElementById("reviewModal").style.display = "block"
  } catch (error) {
    console.error("Error loading review:", error)
    showNotification("Error loading review details", "error")
  }
}

window.deleteDoctorReview = async (reviewId) => {
  if (!confirm("Are you sure you want to delete this review?")) return

  try {
    await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/reviews/${reviewId}`, {
      method: "DELETE",
    })
    showNotification("Review deleted successfully", "success")
    loadDoctorReviews()
  } catch (error) {
    console.error("Error deleting review:", error)
    showNotification("Error deleting review", "error")
  }
}

async function saveDoctorReview() {
  try {
    const reviewData = {
      patientId: Number.parseInt(document.getElementById("reviewPatientId").value),
      rating: Number.parseInt(document.getElementById("reviewRating").value),
      reviewDate: document.getElementById("reviewDate").value,
      reviewText: document.getElementById("reviewText").value.trim(),
    }

    const reviewId = document.getElementById("reviewId").value

    if (reviewId) {
      // Update
      await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/reviews/${reviewId}`, {
        method: "PUT",
        body: JSON.stringify(reviewData),
      })
      showNotification("Review updated successfully", "success")
    } else {
      // Create
      await apiRequest(`${API_ENDPOINTS.doctors.base}/${currentDoctorId}/reviews`, {
        method: "POST",
        body: JSON.stringify(reviewData),
      })
      showNotification("Review created successfully", "success")
    }

    window.closeReviewModal()
    loadDoctorReviews()
  } catch (error) {
    console.error("Error saving review:", error)
    showNotification("Error saving review", "error")
  }
}

// Existing functions remain the same...
window.searchDoctors = () => {
  const searchName = document.getElementById("searchByName").value.trim()
  const searchId = document.getElementById("searchByDoctorId").value.trim()

  currentFilters.searchName = searchName
  currentFilters.searchId = searchId
  currentPage = 0

  if (searchName) {
    searchDoctorsByName(searchName)
  } else if (searchId) {
    searchDoctorById(searchId)
  } else {
    loadDoctors()
  }
}

async function searchDoctorsByName(name) {
  try {
    showLoading()
    const params = new URLSearchParams({
      doctorName: name,
      page: currentPage,
      size: currentSize,
    })

    const response = await apiRequest(`${API_ENDPOINTS.documentsVerification.search}?${params}`)

    // Enrich with doctor details
    if (response.content && response.content.length > 0) {
      const enrichedContent = await Promise.all(
        response.content.map(async (verification) => {
          try {
            const doctor = await apiRequest(`${API_ENDPOINTS.doctors.base}/${verification.doctorId}`)
            return {
              ...verification,
              doctor: doctor,
            }
          } catch (error) {
            console.error(`Error loading doctor ${verification.doctorId}:`, error)
            return verification
          }
        }),
      )
      response.content = enrichedContent
    }

    displayDoctors(response)
  } catch (error) {
    console.error("Error searching doctors by name:", error)
    showNotification("Error searching doctors", "error")
    hideLoading()
  }
}

async function searchDoctorById(doctorId) {
  try {
    showLoading()
    const verification = await apiRequest(`${API_ENDPOINTS.documentsVerification.base}/doctor/${doctorId}`)
    const doctor = await apiRequest(`${API_ENDPOINTS.doctors.base}/${doctorId}`)

    const mockResponse = {
      content: [
        {
          ...verification,
          doctor: doctor,
        },
      ],
      totalPages: 1,
      totalElements: 1,
    }

    displayDoctors(mockResponse)
  } catch (error) {
    console.error("Error searching doctor by ID:", error)
    showNotification("Doctor not found", "error")
    hideLoading()
  }
}

window.filterDoctors = () => {
  const status = document.getElementById("filterByStatus").value
  const speciality = document.getElementById("filterBySpeciality").value

  currentFilters.status = status
  currentFilters.speciality = speciality
  currentPage = 0

  loadDoctors()
}

window.changePage = (page) => {
  currentPage = page
  loadDoctors()
}

window.refreshDoctors = () => {
  currentPage = 0
  currentFilters = {}

  // Clear search inputs
  document.getElementById("searchByName").value = ""
  document.getElementById("searchByDoctorId").value = ""
  document.getElementById("filterByStatus").value = ""
  document.getElementById("filterBySpeciality").value = ""

  loadDoctors()
  showNotification("Doctors list refreshed", "success")
}

// Fix viewDoctorDetails to show profile image properly
window.viewDoctorDetails = async (doctorId) => {
  try {
    const doctor = await apiRequest(`${API_ENDPOINTS.doctors.base}/${doctorId}`)
    const verification = await apiRequest(`${API_ENDPOINTS.documentsVerification.byDoctor}/${doctorId}`)

    const modalBody = document.getElementById("doctorModalBody")
    modalBody.innerHTML = `
            <div class="patient-details">
                <div class="doctor-profile-section">
                    <div class="doctor-profile-image">
                        <img src="${doctor.profileImageUrl || doctor.profileImage || "/placeholder.svg?height=120&width=120"}" 
                             alt="Doctor Profile" 
                             class="profile-img"
                             onerror="this.src='/placeholder.svg?height=120&width=120'">
                    </div>
                    <div class="doctor-basic-info">
                        <h3>${doctor.fullName}</h3>
                        <p class="doctor-specialization">${doctor.specialization}</p>
                        <p class="doctor-experience">${doctor.experienceYears} years experience</p>
                        <span class="status-badge status-${verification.verificationStatus.toLowerCase()}">
                            ${verification.verificationStatus}
                        </span>
                    </div>
                </div>
                
                <div class="patient-info">
                    <div class="info-item">
                        <span class="info-label">Doctor ID</span>
                        <span class="info-value">${doctor.doctorId}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Full Name</span>
                        <span class="info-value">${doctor.fullName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Email</span>
                        <span class="info-value">${doctor.email}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Phone</span>
                        <span class="info-value">${doctor.phone}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Specialization</span>
                        <span class="info-value">${doctor.specialization}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Experience</span>
                        <span class="info-value">${doctor.experienceYears} years</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">License Number</span>
                        <span class="info-value">${doctor.medicalLicenseNumber}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Fees</span>
                        <span class="info-value">₹${doctor.fees}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Address</span>
                        <span class="info-value">${doctor.address || "Not provided"}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Registered</span>
                        <span class="info-value">${formatDateTime(doctor.createdAt)}</span>
                    </div>
                </div>
                
                <div class="appointments-section">
                    <h3>Recent Statistics</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon patients">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-info">
                                <h4 id="doctorPatientCount">Loading...</h4>
                                <p>Total Patients</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon appointments">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <div class="stat-info">
                                <h4 id="doctorAppointmentCount">Loading...</h4>
                                <p>Today's Appointments</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon rating">
                                <i class="fas fa-star"></i>
                            </div>
                            <div class="stat-info">
                                <h4 id="doctorRating">Loading...</h4>
                                <p>Average Rating</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `

    document.getElementById("doctorModal").style.display = "block"

    // Load additional stats
    loadDoctorStats(doctorId)
  } catch (error) {
    console.error("Error loading doctor details:", error)
    showNotification("Error loading doctor details", "error")
  }
}

// Fix the loadDoctorStats function
async function loadDoctorStats(doctorId) {
  try {
    const stats = await apiRequest(`${API_ENDPOINTS.doctors.base}/${doctorId}/stats`)

    document.getElementById("doctorPatientCount").textContent =
      stats.totalPatientsCurrentMonth || stats.totalPatients || 0
    document.getElementById("doctorAppointmentCount").textContent =
      stats.todaysAppointments || stats.totalAppointments || 0
    document.getElementById("doctorRating").textContent = stats.averageRating
      ? `${stats.averageRating.toFixed(1)}/5`
      : "No ratings yet"
  } catch (error) {
    console.error("Error loading doctor stats:", error)
    document.getElementById("doctorPatientCount").textContent = "0"
    document.getElementById("doctorAppointmentCount").textContent = "0"
    document.getElementById("doctorRating").textContent = "No ratings yet"
  }
}

window.viewDocuments = async (verificationId) => {
  try {
    const verification = await apiRequest(`${API_ENDPOINTS.documentsVerification.base}/${verificationId}`)

    const modalBody = document.getElementById("documentModalBody")
    modalBody.innerHTML = `
            <div class="document-viewer">
                <h3>Doctor Documents</h3>
                <div class="documents-grid" style="display: grid; gap: 1rem; margin-top: 1rem;">
                    ${
                      verification.governmentIdProof
                        ? `
                        <div class="document-item">
                            <h4>Government ID Proof</h4>
                            <button class="btn btn-primary" onclick="viewDocument('${verification.governmentIdProof}')">
                                <i class="fas fa-eye"></i> View Document
                            </button>
                        </div>
                    `
                        : ""
                    }
                    
                    ${
                      verification.medicalRegistrationCertificate
                        ? `
                        <div class="document-item">
                            <h4>Medical Registration Certificate</h4>
                            <button class="btn btn-primary" onclick="viewDocument('${verification.medicalRegistrationCertificate}')">
                                <i class="fas fa-eye"></i> View Document
                            </button>
                        </div>
                    `
                        : ""
                    }
                    
                    ${
                      verification.educationalCertificate
                        ? `
                        <div class="document-item">
                            <h4>Educational Certificate</h4>
                            <button class="btn btn-primary" onclick="viewDocument('${verification.educationalCertificate}')">
                                <i class="fas fa-eye"></i> View Document
                            </button>
                        </div>
                    `
                        : ""
                    }
                    
                    ${
                      verification.experienceCertificate
                        ? `
                        <div class="document-item">
                            <h4>Experience Certificate</h4>
                            <button class="btn btn-primary" onclick="viewDocument('${verification.experienceCertificate}')">
                                <i class="fas fa-eye"></i> View Document
                            </button>
                        </div>
                    `
                        : ""
                    }
                    
                    ${
                      verification.specializationCertificate
                        ? `
                        <div class="document-item">
                            <h4>Specialization Certificate</h4>
                            <button class="btn btn-primary" onclick="viewDocument('${verification.specializationCertificate}')">
                                <i class="fas fa-eye"></i> View Document
                            </button>
                        </div>
                    `
                        : ""
                    }
                </div>
                
                <div class="form-actions mt-3">
                    <button class="btn btn-success" onclick="window.openVerificationModal(${verification.doctorId})">
                        <i class="fas fa-check"></i> Update Verification Status
                    </button>
                </div>
            </div>
        `

    document.getElementById("documentModal").style.display = "block"
  } catch (error) {
    console.error("Error loading documents:", error)
    showNotification("Error loading documents", "error")
  }
}

window.viewDocument = (documentUrl) => {
  window.open(documentUrl, "_blank")
}

window.openVerificationModal = (doctorId) => {
  document.getElementById("doctorIdForVerification").value = doctorId
  document.getElementById("verificationStatus").value = ""
  document.getElementById("rejectionReason").value = ""
  document.getElementById("rejectionReasonGroup").style.display = "none"

  window.closeDocumentModal()
  document.getElementById("verificationModal").style.display = "block"
}

window.updateVerificationStatus = async (verificationId, status) => {
  if (status === "REJECTED") {
    // For rejection, open modal to get reason
    const verification = await apiRequest(`${API_ENDPOINTS.documentsVerification.base}/${verificationId}`)
    window.openVerificationModal(verification.doctorId)
    document.getElementById("verificationStatus").value = "REJECTED"
    document.getElementById("rejectionReasonGroup").style.display = "block"
    return
  }

  try {
    const updateData = {
      verificationStatus: status,
    }

    await apiRequest(`${API_ENDPOINTS.documentsVerification.base}/${verificationId}/status`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    })

    showNotification(`Doctor verification status updated to ${status}`, "success")
    loadDoctors()
  } catch (error) {
    console.error("Error updating verification status:", error)
    showNotification("Error updating verification status", "error")
  }
}

window.viewPatientCount = async (doctorId) => {
  try {
    const stats = await apiRequest(`${API_ENDPOINTS.doctors.base}/${doctorId}/stats`)
    showNotification(`This doctor has ${stats.totalPatientsCurrentMonth || 0} patients this month`, "info")
  } catch (error) {
    console.error("Error loading patient count:", error)
    showNotification("Error loading patient count", "error")
  }
}

window.closeDoctorModal = () => {
  document.getElementById("doctorModal").style.display = "none"
}

window.closeDocumentModal = () => {
  document.getElementById("documentModal").style.display = "none"
}

window.closeVerificationModal = () => {
  document.getElementById("verificationModal").style.display = "none"
}

window.viewDoctorVerification = async (verificationId) => {
  try {
    const verification = await apiRequest(`${API_ENDPOINTS.documentsVerification.base}/${verificationId}`)
    window.viewDoctorDetails(verification.doctorId)
  } catch (error) {
    console.error("Error loading verification:", error)
    showNotification("Error loading verification details", "error")
  }
}

function showLoading() {
  const tbody = document.getElementById("doctorsTableBody")
  tbody.innerHTML =
    '<tr><td colspan="9" class="text-center"><div class="loading"><div class="spinner"></div></div></td></tr>'
}

function hideLoading() {
  // Loading will be replaced by actual content
}

// Close modals when clicking outside
window.addEventListener("click", (event) => {
  const doctorModal = document.getElementById("doctorModal")
  const documentModal = document.getElementById("documentModal")
  const verificationModal = document.getElementById("verificationModal")
  const createDoctorModal = document.getElementById("createDoctorModal")
  const doctorSubmodulesModal = document.getElementById("doctorSubmodulesModal")

  if (event.target === doctorModal) {
    window.closeDoctorModal()
  }
  if (event.target === documentModal) {
    window.closeDocumentModal()
  }
  if (event.target === verificationModal) {
    window.closeVerificationModal()
  }
  if (event.target === createDoctorModal) {
    window.closeCreateDoctorModal()
  }
  if (event.target === doctorSubmodulesModal) {
    window.closeDoctorSubmodulesModal()
  }
})
