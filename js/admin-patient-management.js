import { checkAuth, apiRequest, showNotification, API_ENDPOINTS, formatDate, calculateAge } from "./config.js"

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
    await loadPatients()
    setupEventListeners()
  } catch (error) {
    console.error("Error initializing page:", error)
    showNotification("Error loading page data", "error")
  }
}

async function loadPatients() {
  try {
    showLoading()

    const response = await apiRequest(API_ENDPOINTS.patients.base)
    displayPatients(response)
  } catch (error) {
    console.error("Error loading patients:", error)
    showNotification("Error loading patients", "error")
    hideLoading()
  }
}

function displayPatients(patients) {
  const tbody = document.getElementById("patientsTableBody")

  if (!patients || patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No patients found</td></tr>'
    hideLoading()
    return
  }

  tbody.innerHTML = patients
    .map(
      (patient) => `
        <tr>
            <td>${patient.patientId}</td>
            <td>${patient.fullName}</td>
            <td>${patient.emailAddress}</td>
            <td>${patient.phone}</td>
            <td>${patient.gender}</td>
            <td>${calculateAge(patient.dateOfBirth)}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewPatientAppointments(${patient.patientId})">
                    <i class="fas fa-calendar"></i> View
                </button>
            </td>
            <td>
                <div class="flex gap-1">
                    <button class="btn btn-sm btn-primary" onclick="viewPatientDetails(${patient.patientId})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editPatient(${patient.patientId})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deletePatient(${patient.patientId})">
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
  // Patient form submit
  document.getElementById("patientForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const patientData = {
      fullName: document.getElementById("fullName").value.trim(),
      emailAddress: document.getElementById("emailAddress").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      gender: document.getElementById("gender").value,
      dateOfBirth: document.getElementById("dateOfBirth").value,
      address: document.getElementById("address").value.trim(),
      role: document.getElementById("role").value,
    }

    // Validate required fields
    if (
      !patientData.fullName ||
      !patientData.emailAddress ||
      !patientData.phone ||
      !patientData.gender ||
      !patientData.dateOfBirth ||
      !patientData.address
    ) {
      showNotification("Please fill in all required fields", "error")
      return
    }

    try {
      const patientId = document.getElementById("patientId").value

      if (isEditMode && patientId) {
        // Update patient - Note: Backend might not have update endpoint
        showNotification("Patient update functionality not available in backend", "warning")
      } else {
        // Create patient
        await apiRequest(API_ENDPOINTS.patients.register, {
          method: "POST",
          body: JSON.stringify(patientData),
        })
        showNotification("Patient created successfully", "success")
      }

      closeCreatePatientModal()
      loadPatients()
    } catch (error) {
      console.error("Error saving patient:", error)
      showNotification("Error saving patient: " + error.message, "error")
    }
  })
}

window.searchPatients = () => {
  const searchName = document.getElementById("searchByName").value.trim()
  const searchId = document.getElementById("searchByPatientId").value.trim()

  currentFilters.searchName = searchName
  currentFilters.searchId = searchId
  currentPage = 0

  if (searchName || searchId) {
    searchPatientsWithFilters()
  } else {
    loadPatients()
  }
}

async function searchPatientsWithFilters() {
  try {
    showLoading()

    if (currentFilters.searchName) {
      const patients = await apiRequest(
        `${API_ENDPOINTS.patients.search}/by-name?name=${encodeURIComponent(currentFilters.searchName)}`,
      )
      displayPatients(patients)
    } else if (currentFilters.searchId) {
      // Filter by ID on frontend since backend doesn't have this endpoint
      const allPatients = await apiRequest(API_ENDPOINTS.patients.base)
      const filteredPatients = allPatients.filter((patient) =>
        patient.patientId.toString().includes(currentFilters.searchId),
      )
      displayPatients(filteredPatients)
    } else {
      loadPatients()
    }
  } catch (error) {
    console.error("Error searching patients:", error)
    showNotification("Error searching patients", "error")
    hideLoading()
  }
}

window.refreshPatients = () => {
  currentPage = 0
  currentFilters = {}

  // Clear search inputs
  document.getElementById("searchByName").value = ""
  document.getElementById("searchByPatientId").value = ""

  loadPatients()
  showNotification("Patients list refreshed", "success")
}

window.viewPatientDetails = async (patientId) => {
  try {
    const patient = await apiRequest(`${API_ENDPOINTS.patients.base}/${patientId}/complete-details`)

    const modalBody = document.getElementById("patientModalBody")
    modalBody.innerHTML = `
            <div class="patient-details">
                <div class="patient-info">
                    <div class="info-item">
                        <span class="info-label">Patient ID</span>
                        <span class="info-value">${patient.patientId}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Full Name</span>
                        <span class="info-value">${patient.fullName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Email</span>
                        <span class="info-value">${patient.emailAddress}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Phone</span>
                        <span class="info-value">${patient.phone}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Gender</span>
                        <span class="info-value">${patient.gender}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Age</span>
                        <span class="info-value">${calculateAge(patient.dateOfBirth)} years</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Date of Birth</span>
                        <span class="info-value">${formatDate(patient.dateOfBirth)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Address</span>
                        <span class="info-value">${patient.address}</span>
                    </div>
                </div>
                
                <div class="appointments-section">
                    <h3>Appointment History</h3>
                    <div id="patientAppointments">
                        ${
                          patient.appointments && patient.appointments.length > 0
                            ? patient.appointments
                                .map(
                                  (appointment) => `
                                <div class="appointment-card">
                                    <div class="appointment-header">
                                        <span class="appointment-doctor">Dr. ${appointment.doctorName}</span>
                                        <span class="appointment-date">${formatDate(appointment.appointmentDate)}</span>
                                    </div>
                                    <div class="appointment-details">
                                        <span>Specialization: ${appointment.doctorSpecialization}</span>
                                        <span>Status: <span class="status-badge status-${appointment.appointmentStatus.toLowerCase()}">${appointment.appointmentStatus}</span></span>
                                        <span>Payment: <span class="status-badge status-${appointment.paymentStatus.toLowerCase()}">${appointment.paymentStatus}</span></span>
                                    </div>
                                </div>
                            `,
                                )
                                .join("")
                            : "<p>No appointments found</p>"
                        }
                    </div>
                </div>
                
                <div class="history-section">
                    <h3>Medical Reports</h3>
                    <div id="patientReports">
                        ${
                          patient.medicalReports && patient.medicalReports.length > 0
                            ? patient.medicalReports
                                .map(
                                  (report) => `
                                <div class="appointment-card">
                                    <div class="appointment-header">
                                        <span class="appointment-doctor">${report.fileName}</span>
                                        <span class="appointment-date">${formatDate(report.uploadedAt)}</span>
                                    </div>
                                    <div class="appointment-details">
                                        <span>Type: ${report.fileType}</span>
                                        <span>Uploaded by: ${report.uploadedBy}</span>
                                        <span>
                                            <button class="btn btn-sm btn-primary" onclick="viewReport('${report.fileUrl}')">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                        </span>
                                    </div>
                                </div>
                            `,
                                )
                                .join("")
                            : "<p>No medical reports found</p>"
                        }
                    </div>
                </div>
                
                <div class="history-section">
                    <h3>Prescriptions</h3>
                    <div id="patientPrescriptions">
                        ${
                          patient.prescriptions && patient.prescriptions.length > 0
                            ? patient.prescriptions
                                .map(
                                  (prescription) => `
                                <div class="prescription-card">
                                    <div class="appointment-header">
                                        <span class="appointment-doctor">Prescription #${prescription.id}</span>
                                        <span class="appointment-date">${formatDate(prescription.createdAt)}</span>
                                    </div>
                                    <div class="appointment-details">
                                        <span><strong>Diagnosis:</strong> ${prescription.diagnosis || "N/A"}</span>
                                        <span><strong>Notes:</strong> ${prescription.notes || "N/A"}</span>
                                    </div>
                                    ${
                                      prescription.medicines && prescription.medicines.length > 0
                                        ? `
                                        <div class="medicines-section">
                                            <h4>Prescribed Medicines:</h4>
                                            <div class="medicines-list">
                                                ${prescription.medicines
                                                  .map(
                                                    (medicine) => `
                                                    <div class="medicine-item">
                                                        <div class="medicine-name"><strong>${medicine.medicineName}</strong></div>
                                                        <div class="medicine-details">
                                                            <span>Dosage: ${medicine.dosage}</span>
                                                            <span>Frequency: ${medicine.frequency}</span>
                                                            <span>Duration: ${medicine.durationDays} days</span>
                                                            ${medicine.instructions ? `<span>Instructions: ${medicine.instructions}</span>` : ""}
                                                        </div>
                                                    </div>
                                                `,
                                                  )
                                                  .join("")}
                                            </div>
                                        </div>
                                    `
                                        : "<p>No medicines prescribed</p>"
                                    }
                                </div>
                            `,
                                )
                                .join("")
                            : "<p>No prescriptions found</p>"
                        }
                    </div>
                </div>
            </div>
        `

    document.getElementById("patientModal").style.display = "block"
  } catch (error) {
    console.error("Error loading patient details:", error)
    showNotification("Error loading patient details", "error")
  }
}

window.viewReport = (reportUrl) => {
  window.open(reportUrl, "_blank")
}

window.viewPatientAppointments = async (patientId) => {
  try {
    const patient = await apiRequest(`${API_ENDPOINTS.patients.base}/${patientId}/complete-details`)
    const count = patient.appointments ? patient.appointments.length : 0
    showNotification(`This patient has ${count} total appointments`, "info")
  } catch (error) {
    console.error("Error loading patient appointments:", error)
    showNotification("Error loading appointment count", "error")
  }
}

window.openCreatePatientModal = () => {
  isEditMode = false
  document.getElementById("patientFormTitle").textContent = "Create Patient"
  document.getElementById("patientForm").reset()
  document.getElementById("patientId").value = ""
  document.getElementById("role").value = "PATIENT" // Set default role
  document.getElementById("createPatientModal").style.display = "block"
}

window.editPatient = async (patientId) => {
  try {
    const patient = await apiRequest(`${API_ENDPOINTS.patients.base}/${patientId}`)

    isEditMode = true
    document.getElementById("patientFormTitle").textContent = "Edit Patient"
    document.getElementById("patientId").value = patient.patientId
    document.getElementById("fullName").value = patient.fullName
    document.getElementById("emailAddress").value = patient.emailAddress
    document.getElementById("phone").value = patient.phone
    document.getElementById("gender").value = patient.gender
    document.getElementById("dateOfBirth").value = patient.dateOfBirth
    document.getElementById("address").value = patient.address
    document.getElementById("role").value = patient.role

    document.getElementById("createPatientModal").style.display = "block"
  } catch (error) {
    console.error("Error loading patient for edit:", error)
    showNotification("Error loading patient details", "error")
  }
}

window.deletePatient = async (patientId) => {
  if (!confirm("Are you sure you want to delete this patient? This action cannot be undone.")) {
    return
  }

  try {
    await apiRequest(`${API_ENDPOINTS.patients.base}/${patientId}`, {
      method: "DELETE",
    })

    showNotification("Patient deleted successfully", "success")
    loadPatients()
  } catch (error) {
    console.error("Error deleting patient:", error)
    showNotification("Error deleting patient: " + error.message, "error")
  }
}

window.closePatientModal = () => {
  document.getElementById("patientModal").style.display = "none"
}

window.closeCreatePatientModal = () => {
  document.getElementById("createPatientModal").style.display = "none"
}

function showLoading() {
  const tbody = document.getElementById("patientsTableBody")
  tbody.innerHTML =
    '<tr><td colspan="8" class="text-center"><div class="loading"><div class="spinner"></div></div></td></tr>'
}

function hideLoading() {
  // Loading will be replaced by actual content
}

// Close modals when clicking outside
window.addEventListener("click", (event) => {
  const patientModal = document.getElementById("patientModal")
  const createPatientModal = document.getElementById("createPatientModal")

  if (event.target === patientModal) {
    window.closePatientModal()
  }
  if (event.target === createPatientModal) {
    window.closeCreatePatientModal()
  }
})
