// Configuration
const API_BASE_URL = "http://localhost:8080/api/v1"

// Global variables
let currentPage = 0
let totalPages = 0
let currentFilters = {}
let appointments = []
let searchTimeout = null
let allDoctors = [] // Store all doctors for client-side search

// Booking flow variables
let currentStep = 1
let selectedDoctor = null
let selectedDate = null
let selectedTimeSlot = null
let selectedPatient = null
let uploadedReports = []
const currentMonth = new Date()
let appointment = null

// Mock data for demonstration
const mockAppointments = [
  {
    appointmentId: 1,
    patientName: "John Doe",
    patientId: 1,
    doctorName: "Dr. Smith",
    doctorId: 1,
    doctorSpecialization: "Cardiology",
    appointmentDate: "2024-01-15",
    appointmentTime: "10:00",
    appointmentStatus: "CONFIRMED",
    paymentStatus: "PAID",
    consultationFee: 500,
    createdAt: "2024-01-10T09:00:00",
  },
  {
    appointmentId: 2,
    patientName: "Jane Smith",
    patientId: 2,
    doctorName: "Dr. Johnson",
    doctorId: 2,
    doctorSpecialization: "Dermatology",
    appointmentDate: "2024-01-16",
    appointmentTime: "14:30",
    appointmentStatus: "PENDING",
    paymentStatus: "UNPAID",
    consultationFee: 600,
    createdAt: "2024-01-11T11:30:00",
  },
]

const mockDoctors = [
  {
    doctorId: 1,
    fullName: "Dr. Smith",
    specialization: "Cardiology",
    experienceYears: 10,
    fees: 500,
    address: "New York",
    email: "dr.smith@example.com",
    phone: "1234567890",
  },
  {
    doctorId: 2,
    fullName: "Dr. Johnson",
    specialization: "Dermatology",
    experienceYears: 8,
    fees: 600,
    address: "Los Angeles",
    email: "dr.johnson@example.com",
    phone: "0987654321",
  },
  {
    doctorId: 3,
    fullName: "Dr. Williams",
    specialization: "Neurology",
    experienceYears: 15,
    fees: 800,
    address: "Chicago",
    email: "dr.williams@example.com",
    phone: "1122334455",
  },
]

const mockPatients = [
  {
    patientId: 1,
    fullName: "John Doe",
    gender: "MALE",
    dateOfBirth: "1990-05-15",
    phone: "1234567890",
    emailAddress: "john.doe@example.com",
    address: "123 Main St, New York",
  },
  {
    patientId: 2,
    fullName: "Jane Smith",
    gender: "FEMALE",
    dateOfBirth: "1985-08-22",
    phone: "0987654321",
    emailAddress: "jane.smith@example.com",
    address: "456 Oak Ave, Los Angeles",
  },
]

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  loadAppointments()
  setupEventListeners()
  allDoctors = [...mockDoctors] // Initialize with mock data
})

// Setup event listeners
function setupEventListeners() {
  // File upload
  const fileInput = document.getElementById("fileInput")
  const uploadArea = document.querySelector(".file-upload-area")

  if (fileInput) {
    fileInput.addEventListener("change", handleFileSelect)
  }

  if (uploadArea) {
    // Drag and drop
    uploadArea.addEventListener("dragover", handleDragOver)
    uploadArea.addEventListener("drop", handleFileDrop)
    uploadArea.addEventListener("dragleave", handleDragLeave)
  }
}

// Load appointments with fallback to mock data
async function loadAppointments(page = 0) {
  try {
    showLoading()

    // Try to load from API first
    let url = `${API_BASE_URL}/appointments/filter?page=${page}&size=10`

    // Add filters
    if (currentFilters.date) {
      url += `&date=${currentFilters.date}`
    }
    if (currentFilters.status) {
      url += `&status=${currentFilters.status}`
    }

    try {
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        appointments = data.content || []
        totalPages = data.totalPages || 0
        currentPage = page
      } else {
        throw new Error("API not available")
      }
    } catch (apiError) {
      console.log("API not available, using mock data")
      // Use mock data as fallback
      appointments = filterMockAppointments(mockAppointments)
      totalPages = 1
      currentPage = 0
    }

    displayAppointments(appointments)
    updatePagination()
  } catch (error) {
    console.error("Error loading appointments:", error)
    showError("Failed to load appointments")
  }
}

// Filter mock appointments based on current filters
function filterMockAppointments(appointmentsList) {
  let filtered = [...appointmentsList]

  if (currentFilters.date) {
    filtered = filtered.filter((apt) => apt.appointmentDate === currentFilters.date)
  }

  if (currentFilters.status) {
    filtered = filtered.filter((apt) => apt.appointmentStatus === currentFilters.status)
  }

  return filtered
}

// FIXED: Doctor search function with client-side filtering
function performSearch() {
  const query = document.getElementById("doctorSearch").value.toLowerCase().trim()

  if (query.length === 0) {
    displayDoctors(allDoctors)
    return
  }

  // Filter doctors based on search query
  const filteredDoctors = allDoctors.filter((doctor) => {
    const nameMatch = doctor.fullName.toLowerCase().includes(query)
    const specializationMatch = doctor.specialization.toLowerCase().includes(query)
    const addressMatch = doctor.address.toLowerCase().includes(query)

    return nameMatch || specializationMatch || addressMatch
  })

  displayDoctors(filteredDoctors)
}

// Search appointments
async function searchAppointments(query, type) {
  try {
    showLoading()

    if (type === "id") {
      // Search by appointment ID - filter locally
      const filtered = appointments.filter((apt) => apt.appointmentId.toString().includes(query))
      displayAppointments(filtered)
    } else if (type === "patient") {
      // Search by patient name - filter locally for mock data
      const filtered = appointments.filter(
        (apt) => apt.patientName && apt.patientName.toLowerCase().includes(query.toLowerCase()),
      )
      displayAppointments(filtered)
    }
  } catch (error) {
    console.error("Error searching appointments:", error)
    showError("Failed to search appointments")
  }
}

// Handle search input
function handleSearch() {
  const appointmentId = document.getElementById("searchAppointmentId").value.trim()
  const patientName = document.getElementById("searchPatientName").value.trim()

  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (appointmentId) {
      searchAppointments(appointmentId, "id")
    } else if (patientName) {
      searchAppointments(patientName, "patient")
    } else {
      loadAppointments()
    }
  }, 500)
}

// Handle filters
function handleFilter() {
  const date = document.getElementById("filterDate").value
  const status = document.getElementById("filterStatus").value

  currentFilters = {
    date: date || null,
    status: status || null,
  }

  loadAppointments(0)
}

// Clear filters
function clearFilters() {
  document.getElementById("searchAppointmentId").value = ""
  document.getElementById("searchPatientName").value = ""
  document.getElementById("filterDate").value = ""
  document.getElementById("filterStatus").value = ""

  currentFilters = {}
  loadAppointments(0)
}

// Display appointments in table
function displayAppointments(appointmentsList) {
  const tbody = document.getElementById("appointmentsTableBody")

  if (!appointmentsList || appointmentsList.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #6b7280;">
                    No appointments found
                </td>
            </tr>
        `
    return
  }

  tbody.innerHTML = appointmentsList
    .map(
      (appointment) => `
        <tr>
            <td>#${appointment.appointmentId}</td>
            <td>${appointment.patientName || "N/A"}</td>
            <td>Dr. ${appointment.doctorName || "N/A"}</td>
            <td>
                ${formatDate(appointment.appointmentDate)}<br>
                <small>${appointment.appointmentTime || "N/A"}</small>
            </td>
            <td>
                <span class="status-badge status-${appointment.appointmentStatus?.toLowerCase()}">
                    ${appointment.appointmentStatus || "N/A"}
                </span>
            </td>
            <td>
                <span class="status-badge payment-${appointment.paymentStatus?.toLowerCase()}">
                    ${appointment.paymentStatus || "N/A"}
                </span>
            </td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-primary" onclick="viewAppointmentDetails(${appointment.appointmentId})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="openRescheduleModal(${appointment.appointmentId})">
                        <i class="fas fa-calendar-alt"></i> Reschedule
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="cancelAppointment(${appointment.appointmentId})">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </td>
        </tr>
    `,
    )
    .join("")
}

// FIXED: View appointment details with working action buttons
async function viewAppointmentDetails(appointmentId) {
  try {
    console.log("Loading appointment details for ID:", appointmentId)

    // Find the appointment in the current loaded appointments or mock data
    let appointment = appointments.find((apt) => apt.appointmentId == appointmentId)

    if (!appointment) {
      // Fallback to mock data
      appointment = mockAppointments.find((apt) => apt.appointmentId == appointmentId)
    }

    if (!appointment) {
      throw new Error("Appointment not found")
    }

    console.log("Appointment data:", appointment)
    displayAppointmentDetails(appointment)

    // Load additional details for tabs
    if (appointment.patientId) {
      loadPatientDetailsForModal(appointment.patientId)
    }
    if (appointment.doctorId) {
      loadDoctorDetailsForModal(appointment.doctorId)
    }

    openModal("appointmentDetailsModal")
  } catch (error) {
    console.error("Error loading appointment details:", error)
    showError(`Failed to load appointment details: ${error.message}`)
  }
}

// FIXED: Load patient details with fallback to mock data
async function loadPatientDetailsForModal(patientId) {
  try {
    let patient = null

    try {
      const response = await fetch(`${API_BASE_URL}/patients/${patientId}`)
      if (response.ok) {
        patient = await response.json()
      } else {
        throw new Error("API not available")
      }
    } catch (apiError) {
      // Fallback to mock data
      patient = mockPatients.find((p) => p.patientId == patientId)
    }

    if (patient) {
      const patientDiv = document.getElementById("patientDetails")
      patientDiv.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Name</div>
                        <div class="detail-value">${patient.fullName || "N/A"}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Gender</div>
                        <div class="detail-value">${patient.gender || "N/A"}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Date of Birth</div>
                        <div class="detail-value">${formatDate(patient.dateOfBirth)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Phone</div>
                        <div class="detail-value">${patient.phone || "N/A"}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">${patient.emailAddress || patient.email || "N/A"}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Address</div>
                        <div class="detail-value">${patient.address || "N/A"}</div>
                    </div>
                </div>
            `
    }
  } catch (error) {
    console.error("Error loading patient details for modal:", error)
    document.getElementById("patientDetails").innerHTML = "<p>Error loading patient details</p>"
  }
}

// FIXED: Load doctor details with fallback to mock data
async function loadDoctorDetailsForModal(doctorId) {
  try {
    let doctor = null

    try {
      const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}`)
      if (response.ok) {
        doctor = await response.json()
      } else {
        throw new Error("API not available")
      }
    } catch (apiError) {
      // Fallback to mock data
      doctor = mockDoctors.find((d) => d.doctorId == doctorId)
    }

    if (doctor) {
      const doctorDiv = document.getElementById("doctorDetails")
      doctorDiv.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Name</div>
                        <div class="detail-value">Dr. ${doctor.fullName || "N/A"}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Specialization</div>
                        <div class="detail-value">${doctor.specialization || "N/A"}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Experience</div>
                        <div class="detail-value">${doctor.experienceYears || "N/A"} years</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">${doctor.email || "N/A"}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Phone</div>
                        <div class="detail-value">${doctor.phone || "N/A"}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Fees</div>
                        <div class="detail-value">₹${doctor.fees || "N/A"}</div>
                    </div>
                </div>
            `
    }
  } catch (error) {
    console.error("Error loading doctor details for modal:", error)
    document.getElementById("doctorDetails").innerHTML = "<p>Error loading doctor details</p>"
  }
}

// FIXED: Display appointment details with working action buttons
function displayAppointmentDetails(appointment) {
  const detailsDiv = document.getElementById("appointmentDetails")

  detailsDiv.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Appointment ID</div>
                <div class="detail-value">#${appointment.appointmentId || "N/A"}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Patient Name</div>
                <div class="detail-value">${appointment.patientName || "N/A"}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Doctor Name</div>
                <div class="detail-value">Dr. ${appointment.doctorName || "N/A"}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Specialization</div>
                <div class="detail-value">${appointment.doctorSpecialization || "N/A"}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Date</div>
                <div class="detail-value">${formatDate(appointment.appointmentDate)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Time</div>
                <div class="detail-value">${appointment.appointmentTime || "N/A"}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                    <span class="status-badge status-${(appointment.appointmentStatus || "pending").toLowerCase()}">
                        ${appointment.appointmentStatus || "PENDING"}
                    </span>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Payment Status</div>
                <div class="detail-value">
                    <span class="status-badge payment-${(appointment.paymentStatus || "unpaid").toLowerCase()}">
                        ${appointment.paymentStatus || "UNPAID"}
                    </span>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Consultation Fee</div>
                <div class="detail-value">₹${appointment.consultationFee || "N/A"}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Created At</div>
                <div class="detail-value">${formatDateTime(appointment.createdAt)}</div>
            </div>
        </div>
        
        <div style="margin-top: 2rem;">
            <h3 style="margin-bottom: 1rem;">Actions</h3>
            <div class="actions">
                <button class="btn btn-info" onclick="viewPatientDetails(${appointment.patientId})">
                    <i class="fas fa-user-injured"></i> View Patient Details
                </button>
                <button class="btn btn-info" onclick="viewDoctorDetails(${appointment.doctorId})">
                    <i class="fas fa-user-md"></i> View Doctor Details
                </button>
                <button class="btn btn-info" onclick="viewPatientHistory(${appointment.patientId})">
                    <i class="fas fa-history"></i> Patient History
                </button>
                <button class="btn btn-info" onclick="viewPatientReports(${appointment.appointmentId})">
                    <i class="fas fa-file-medical"></i> Patient Reports
                </button>
                <button class="btn btn-info" onclick="viewMedicalReports(${appointment.appointmentId})">
                    <i class="fas fa-file-alt"></i> Medical Reports
                </button>
                <button class="btn btn-info" onclick="viewPrescription(${appointment.appointmentId})">
                    <i class="fas fa-prescription"></i> Prescription
                </button>
            </div>
        </div>
    `
}

// FIXED: Working action button functions
async function viewPatientDetails(patientId) {
  try {
    await loadPatientDetailsForModal(patientId)
    switchTab("patient")
  } catch (error) {
    console.error("Error loading patient details:", error)
    showError("Failed to load patient details")
  }
}

async function viewDoctorDetails(doctorId) {
  try {
    await loadDoctorDetailsForModal(doctorId)
    switchTab("doctor")
  } catch (error) {
    console.error("Error loading doctor details:", error)
    showError("Failed to load doctor details")
  }
}

async function viewPatientHistory(patientId) {
  try {
    // Mock patient history data
    const mockHistory = mockAppointments.filter((apt) => apt.patientId == patientId)

    const historyHTML =
      mockHistory.length > 0
        ? `
            <h4>Patient History (${mockHistory.length} appointments)</h4>
            <div class="history-list">
                ${mockHistory
                  .map(
                    (appointment) => `
                    <div class="appointment-card" style="border: 1px solid #e2e8f0; padding: 1rem; margin: 0.5rem 0; border-radius: 8px;">
                        <div class="appointment-header">
                            <div><strong>Appointment #${appointment.appointmentId}</strong></div>
                            <div class="appointment-date">${formatDate(appointment.appointmentDate)}</div>
                        </div>
                        <div class="appointment-details">
                            <span><strong>Doctor:</strong> Dr. ${appointment.doctorName || "N/A"}</span>
                            <span><strong>Status:</strong> <span class="status-badge status-${(appointment.appointmentStatus || "pending").toLowerCase()}">${appointment.appointmentStatus || "PENDING"}</span></span>
                            <span><strong>Time:</strong> ${appointment.appointmentTime || "N/A"}</span>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `
        : "<p>No appointment history found for this patient.</p>"

    const patientDiv = document.getElementById("patientDetails")
    patientDiv.innerHTML = `
            <div class="patient-history-section">
                ${historyHTML}
            </div>
        `

    switchTab("patient")
  } catch (error) {
    console.error("Error loading patient history:", error)
    showError("Failed to load patient history: " + error.message)
  }
}

async function viewPatientReports(appointmentId) {
  try {
    // Mock patient reports data
    const mockReports = [
      {
        id: 1,
        fileName: "blood_test_report.pdf",
        fileType: "application/pdf",
        fileSize: 1024000,
        uploadedAt: "2024-01-10T08:00:00",
        description: "Blood test results",
        fileUrl: "#",
      },
    ]

    const reportsDiv = document.getElementById("appointmentReports")
    if (mockReports.length === 0) {
      reportsDiv.innerHTML = "<p>No patient reports found for this appointment.</p>"
    } else {
      reportsDiv.innerHTML = `
                <h4>Patient Uploaded Reports (${mockReports.length})</h4>
                <div class="reports-list">
                    ${mockReports
                      .map(
                        (report) => `
                        <div class="report-item" style="border: 1px solid #e2e8f0; padding: 1rem; margin: 0.5rem 0; border-radius: 8px;">
                            <div><strong>File:</strong> ${report.fileName}</div>
                            <div><strong>Type:</strong> ${report.fileType}</div>
                            <div><strong>Size:</strong> ${formatFileSize(report.fileSize)}</div>
                            <div><strong>Uploaded:</strong> ${formatDateTime(report.uploadedAt)}</div>
                            ${report.description ? `<div><strong>Description:</strong> ${report.description}</div>` : ""}
                            <div style="margin-top: 0.5rem;">
                                <button class="btn btn-sm btn-primary" onclick="downloadReport('${report.fileUrl}')">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            `
    }

    switchTab("reports")
  } catch (error) {
    console.error("Error loading patient reports:", error)
    showError("Failed to load patient reports")
  }
}

async function viewMedicalReports(appointmentId) {
  try {
    // Mock medical reports data
    const mockReports = [
      {
        id: 1,
        fileName: "xray_chest.jpg",
        fileType: "image/jpeg",
        uploadedBy: "DOCTOR",
        uploadedAt: "2024-01-12T14:00:00",
        description: "Chest X-ray",
        fileUrl: "#",
      },
    ]

    const reportsDiv = document.getElementById("appointmentReports")
    if (mockReports.length === 0) {
      reportsDiv.innerHTML = "<p>No medical reports found for this appointment.</p>"
    } else {
      reportsDiv.innerHTML = `
                <h4>Medical Reports (${mockReports.length})</h4>
                <div class="reports-list">
                    ${mockReports
                      .map(
                        (report) => `
                        <div class="report-item" style="border: 1px solid #e2e8f0; padding: 1rem; margin: 0.5rem 0; border-radius: 8px;">
                            <div><strong>File:</strong> ${report.fileName}</div>
                            <div><strong>Type:</strong> ${report.fileType}</div>
                            <div><strong>Uploaded By:</strong> ${report.uploadedBy}</div>
                            <div><strong>Uploaded:</strong> ${formatDateTime(report.uploadedAt)}</div>
                            ${report.description ? `<div><strong>Description:</strong> ${report.description}</div>` : ""}
                            <div style="margin-top: 0.5rem;">
                                <button class="btn btn-sm btn-primary" onclick="downloadReport('${report.fileUrl}')">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            `
    }

    switchTab("reports")
  } catch (error) {
    console.error("Error loading medical reports:", error)
    showError("Failed to load medical reports")
  }
}

async function viewPrescription(appointmentId) {
  try {
    // Mock prescription data
    const mockPrescription = {
      id: 1,
      diagnosis: "Hypertension",
      notes: "Patient should monitor blood pressure regularly",
      createdAt: "2024-01-15T16:00:00",
      medicines: [
        {
          id: 1,
          medicineName: "Amlodipine",
          dosage: "5mg",
          frequency: "Once daily",
          durationDays: 30,
          instructions: "Take with food",
        },
      ],
    }

    const prescriptionDiv = document.getElementById("appointmentPrescription")
    if (!mockPrescription) {
      prescriptionDiv.innerHTML = "<p>No prescription found for this appointment.</p>"
    } else {
      prescriptionDiv.innerHTML = `
                <div class="prescription-details">
                    <h4>Prescription Details</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Diagnosis</div>
                            <div class="detail-value">${mockPrescription.diagnosis || "N/A"}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Notes</div>
                            <div class="detail-value">${mockPrescription.notes || "N/A"}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Created</div>
                            <div class="detail-value">${formatDateTime(mockPrescription.createdAt)}</div>
                        </div>
                    </div>
                    
                    ${
                      mockPrescription.medicines && mockPrescription.medicines.length > 0
                        ? `
                        <h5 style="margin-top: 2rem; margin-bottom: 1rem;">Prescribed Medicines</h5>
                        <div class="medicines-list">
                            ${mockPrescription.medicines
                              .map(
                                (medicine) => `
                                <div class="medicine-item" style="border: 1px solid #e2e8f0; padding: 1rem; margin: 0.5rem 0; border-radius: 8px;">
                                    <div><strong>Medicine:</strong> ${medicine.medicineName}</div>
                                    <div><strong>Dosage:</strong> ${medicine.dosage}</div>
                                    <div><strong>Frequency:</strong> ${medicine.frequency}</div>
                                    <div><strong>Duration:</strong> ${medicine.durationDays} days</div>
                                    ${medicine.instructions ? `<div><strong>Instructions:</strong> ${medicine.instructions}</div>` : ""}
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    `
                        : "<p>No medicines prescribed.</p>"
                    }
                </div>
            `
    }

    switchTab("prescription")
  } catch (error) {
    console.error("Error loading prescription:", error)
    showError("Failed to load prescription")
  }
}

// Helper function for downloading reports
function downloadReport(fileUrl) {
  if (fileUrl === "#") {
    showError("Download functionality not available in demo mode")
    return
  }
  window.open(fileUrl, "_blank")
}

// Booking Flow Functions
function startBookingFlow() {
  currentStep = 1
  selectedDoctor = null
  selectedDate = null
  selectedTimeSlot = null
  selectedPatient = null
  uploadedReports = []

  resetSteps()
  loadDoctorsForBooking()
  loadSpecialties()
  openModal("bookAppointmentModal")
}

function resetSteps() {
  // Reset step indicators
  for (let i = 1; i <= 6; i++) {
    const step = document.getElementById(`step${i}`)
    step.classList.remove("active", "completed")

    const content = document.getElementById(`stepContent${i}`)
    content.classList.remove("active")
  }

  // Set first step as active
  document.getElementById("step1").classList.add("active")
  document.getElementById("stepContent1").classList.add("active")

  // Reset navigation buttons
  document.getElementById("prevBtn").style.display = "none"
  document.getElementById("nextBtn").style.display = "block"
  document.getElementById("nextBtn").innerHTML = 'Next <i class="fas fa-chevron-right"></i>'
}

function nextStep() {
  if (!validateCurrentStep()) {
    return
  }

  // Mark current step as completed
  document.getElementById(`step${currentStep}`).classList.add("completed")
  document.getElementById(`step${currentStep}`).classList.remove("active")

  currentStep++

  if (currentStep <= 6) {
    showStep(currentStep)
    updateStepContent()
  }
}

function previousStep() {
  if (currentStep > 1) {
    // Remove active from current step
    document.getElementById(`step${currentStep}`).classList.remove("active")
    document.getElementById(`stepContent${currentStep}`).classList.remove("active")

    currentStep--

    // Remove completed from previous step and make it active
    document.getElementById(`step${currentStep}`).classList.remove("completed")
    document.getElementById(`step${currentStep}`).classList.add("active")
    document.getElementById(`stepContent${currentStep}`).classList.add("active")

    updateNavigationButtons()
  }
}

function showStep(step) {
  // Hide all step contents
  for (let i = 1; i <= 6; i++) {
    document.getElementById(`stepContent${i}`).classList.remove("active")
  }

  // Show current step content
  document.getElementById(`stepContent${step}`).classList.add("active")
  document.getElementById(`step${step}`).classList.add("active")

  updateNavigationButtons()
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById("prevBtn")
  const nextBtn = document.getElementById("nextBtn")

  // Show/hide previous button
  prevBtn.style.display = currentStep > 1 ? "block" : "none"

  // Update next button text
  if (currentStep === 6) {
    nextBtn.style.display = "none"
  } else if (currentStep === 5) {
    nextBtn.innerHTML = '<i class="fas fa-credit-card"></i> Process Payment'
  } else {
    nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>'
  }
}

function updateStepContent() {
  switch (currentStep) {
    case 2:
      generateCalendar()
      break
    case 5:
      updatePaymentSummary()
      break
    case 6:
      showConfirmation()
      break
  }
}

function validateCurrentStep() {
  switch (currentStep) {
    case 1:
      if (!selectedDoctor) {
        showError("Please select a doctor")
        return false
      }
      break
    case 2:
      if (!selectedDate || !selectedTimeSlot) {
        showError("Please select a date and time slot")
        return false
      }
      break
    case 3:
      if (!selectedPatient && !validatePatientForm()) {
        return false
      }
      if (!selectedPatient) {
        createPatientFromForm()
      }
      break
    case 5:
      // Payment validation will be handled in processPayment
      break
  }
  return true
}

// Step 1: Doctor Selection
async function loadDoctorsForBooking() {
  try {
    // Try API first, fallback to mock data
    try {
      const response = await fetch(`${API_BASE_URL}/doctors?size=100`)
      if (response.ok) {
        const data = await response.json()
        allDoctors = data.content || []
      } else {
        throw new Error("API not available")
      }
    } catch (apiError) {
      console.log("API not available, using mock data")
      allDoctors = [...mockDoctors]
    }

    displayDoctors(allDoctors)
  } catch (error) {
    console.error("Error loading doctors:", error)
    showError("Failed to load doctors")
  }
}

function displayDoctors(doctors) {
  const grid = document.getElementById("doctorsGrid")

  if (!doctors || doctors.length === 0) {
    grid.innerHTML = "<p>No doctors found</p>"
    return
  }

  grid.innerHTML = doctors
    .map(
      (doctor) => `
        <div class="doctor-card" onclick="selectDoctor(${doctor.doctorId})">
            <div class="doctor-header">
                <div class="doctor-avatar">
                    ${doctor.fullName.charAt(0)}
                </div>
                <div class="doctor-info">
                    <h3>Dr. ${doctor.fullName}</h3>
                    <p>${doctor.specialization}</p>
                </div>
            </div>
            <div class="doctor-details">
                <span>Experience: ${doctor.experienceYears} years</span>
                <span>Fees: ₹${doctor.fees}</span>
                <span>Location: ${doctor.address}</span>
                <div class="doctor-rating">
                    <i class="fas fa-star"></i>
                    <span>4.5</span>
                </div>
            </div>
        </div>
    `,
    )
    .join("")
}

function selectDoctor(doctorId) {
  // Remove previous selection
  document.querySelectorAll(".doctor-card").forEach((card) => {
    card.classList.remove("selected")
  })

  // Add selection to clicked card
  event.currentTarget.classList.add("selected")

  // Find and store selected doctor
  selectedDoctor = allDoctors.find((doctor) => doctor.doctorId == doctorId)
}

async function loadSpecialties() {
  try {
    // Extract unique specialties from allDoctors
    const specialties = [...new Set(allDoctors.map((doctor) => doctor.specialization))]

    const specialtySelect = document.getElementById("specialtyFilter")
    specialtySelect.innerHTML = '<option value="">All Specialties</option>'

    specialties.forEach((specialty) => {
      specialtySelect.innerHTML += `<option value="${specialty}">${specialty}</option>`
    })

    // Extract unique locations
    const locations = [...new Set(allDoctors.map((doctor) => doctor.address).filter(Boolean))]

    const locationSelect = document.getElementById("locationFilter")
    locationSelect.innerHTML = '<option value="">All Locations</option>'

    locations.forEach((location) => {
      locationSelect.innerHTML += `<option value="${location}">${location}</option>`
    })
  } catch (error) {
    console.error("Error loading filters:", error)
  }
}

function filterDoctors() {
  const specialty = document.getElementById("specialtyFilter").value
  const rating = document.getElementById("ratingFilter").value
  const location = document.getElementById("locationFilter").value

  let filteredDoctors = [...allDoctors]

  if (specialty) {
    filteredDoctors = filteredDoctors.filter((doctor) =>
      doctor.specialization.toLowerCase().includes(specialty.toLowerCase()),
    )
  }

  if (location) {
    filteredDoctors = filteredDoctors.filter(
      (doctor) => doctor.address && doctor.address.toLowerCase().includes(location.toLowerCase()),
    )
  }

  if (rating) {
    const minRating = Number.parseFloat(rating)
    filteredDoctors = filteredDoctors.filter((doctor) => {
      // Mock rating based on experience
      const mockRating = Math.min(5, 3 + (doctor.experienceYears || 0) * 0.1)
      return mockRating >= minRating
    })
  }

  displayDoctors(filteredDoctors)
}

// Step 2: Calendar and Time Slots
function generateCalendar() {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  document.getElementById("currentMonth").textContent =
    `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`

  const grid = document.getElementById("calendarGrid")
  grid.innerHTML = ""

  // Add day headers
  dayNames.forEach((day) => {
    const dayHeader = document.createElement("div")
    dayHeader.className = "calendar-day-header"
    dayHeader.textContent = day
    grid.appendChild(dayHeader)
  })

  // Get first day of month and number of days
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const today = new Date()

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay.getDay(); i++) {
    const emptyDay = document.createElement("div")
    emptyDay.className = "calendar-day other-month"
    grid.appendChild(emptyDay)
  }

  // Add days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayElement = document.createElement("div")
    dayElement.className = "calendar-day"
    dayElement.textContent = day

    const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)

    // Disable past dates
    if (currentDate < today) {
      dayElement.classList.add("disabled")
    } else {
      dayElement.onclick = () => selectDate(currentDate)
    }

    grid.appendChild(dayElement)
  }
}

function selectDate(date) {
  // Remove previous selection
  document.querySelectorAll(".calendar-day").forEach((day) => {
    day.classList.remove("selected")
  })

  // Add selection to clicked day
  event.target.classList.add("selected")

  selectedDate = date
  loadTimeSlots(date)
}

async function loadTimeSlots(date) {
  if (!selectedDoctor) return

  // Mock time slots
  const mockTimeSlots = [
    { id: 1, startTime: "09:00", endTime: "09:30", isBooked: false },
    { id: 2, startTime: "09:30", endTime: "10:00", isBooked: false },
    { id: 3, startTime: "10:00", endTime: "10:30", isBooked: true },
    { id: 4, startTime: "10:30", endTime: "11:00", isBooked: false },
    { id: 5, startTime: "11:00", endTime: "11:30", isBooked: false },
    { id: 6, startTime: "14:00", endTime: "14:30", isBooked: false },
    { id: 7, startTime: "14:30", endTime: "15:00", isBooked: false },
    { id: 8, startTime: "15:00", endTime: "15:30", isBooked: true },
  ]

  displayTimeSlots(mockTimeSlots)
}

function displayTimeSlots(timeSlots) {
  const container = document.getElementById("timeSlots")

  if (!timeSlots || timeSlots.length === 0) {
    container.innerHTML = "<p>No available time slots for this date</p>"
    return
  }

  container.innerHTML = timeSlots
    .map(
      (slot) => `
        <div class="time-slot ${slot.isBooked ? "disabled" : ""}" 
             onclick="${slot.isBooked ? "" : `selectTimeSlot(${slot.id}, '${slot.startTime}', '${slot.endTime}')`}">
            <span>${slot.startTime} - ${slot.endTime}</span>
            <span>${slot.isBooked ? "Booked" : "Available"}</span>
        </div>
    `,
    )
    .join("")
}

function selectTimeSlot(slotId, startTime, endTime) {
  // Remove previous selection
  document.querySelectorAll(".time-slot").forEach((slot) => {
    slot.classList.remove("selected")
  })

  // Add selection to clicked slot
  event.currentTarget.classList.add("selected")

  selectedTimeSlot = {
    id: slotId,
    startTime: startTime,
    endTime: endTime,
  }
}

function previousMonth() {
  currentMonth.setMonth(currentMonth.getMonth() - 1)
  generateCalendar()
}

function nextMonth() {
  currentMonth.setMonth(currentMonth.getMonth() + 1)
  generateCalendar()
}

// Step 3: Patient Details
async function searchPatients() {
  const query = document.getElementById("patientSearchInput").value.trim()

  if (query.length < 2) {
    document.getElementById("patientSuggestions").style.display = "none"
    return
  }

  try {
    // Filter mock patients
    const filteredPatients = mockPatients.filter(
      (patient) => patient.fullName.toLowerCase().includes(query.toLowerCase()) || patient.phone.includes(query),
    )

    displayPatientSuggestions(filteredPatients)
  } catch (error) {
    console.error("Error searching patients:", error)
  }
}

function displayPatientSuggestions(patients) {
  const container = document.getElementById("patientSuggestions")

  if (!patients || patients.length === 0) {
    container.style.display = "none"
    return
  }

  container.innerHTML = patients
    .map(
      (patient) => `
        <div class="patient-suggestion" onclick="selectExistingPatient(${patient.patientId})">
            <strong>${patient.fullName}</strong><br>
            <small>${patient.phone} | ${patient.emailAddress}</small>
        </div>
    `,
    )
    .join("")

  container.style.display = "block"
}

function selectExistingPatient(patientId) {
  const patient = mockPatients.find((p) => p.patientId == patientId)

  if (patient) {
    selectedPatient = patient

    // Fill form with patient data
    document.getElementById("patientName").value = patient.fullName
    document.getElementById("patientGender").value = patient.gender
    document.getElementById("patientDOB").value = patient.dateOfBirth
    document.getElementById("patientPhone").value = patient.phone
    document.getElementById("patientEmail").value = patient.emailAddress
    document.getElementById("patientAddress").value = patient.address

    // Hide suggestions
    document.getElementById("patientSuggestions").style.display = "none"
    document.getElementById("patientSearchInput").value = patient.fullName
  }
}

function validatePatientForm() {
  const name = document.getElementById("patientName").value.trim()
  const gender = document.getElementById("patientGender").value
  const dob = document.getElementById("patientDOB").value
  const phone = document.getElementById("patientPhone").value.trim()
  const email = document.getElementById("patientEmail").value.trim()
  const address = document.getElementById("patientAddress").value.trim()

  if (!name || !gender || !dob || !phone || !email || !address) {
    showError("Please fill in all required patient details")
    return false
  }

  // Validate phone number
  if (!/^\d{10}$/.test(phone)) {
    showError("Please enter a valid 10-digit phone number")
    return false
  }

  // Validate email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("Please enter a valid email address")
    return false
  }

  return true
}

function createPatientFromForm() {
  selectedPatient = {
    fullName: document.getElementById("patientName").value.trim(),
    gender: document.getElementById("patientGender").value,
    dateOfBirth: document.getElementById("patientDOB").value,
    phone: document.getElementById("patientPhone").value.trim(),
    emailAddress: document.getElementById("patientEmail").value.trim(),
    address: document.getElementById("patientAddress").value.trim(),
    role: "PATIENT",
  }
}

// Step 4: Upload Reports
function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  processFiles(files)
}

function handleDragOver(event) {
  event.preventDefault()
  event.currentTarget.classList.add("dragover")
}

function handleFileDrop(event) {
  event.preventDefault()
  event.currentTarget.classList.remove("dragover")

  const files = Array.from(event.dataTransfer.files)
  processFiles(files)
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove("dragover")
}

function processFiles(files) {
  files.forEach((file) => {
    // Validate file
    if (!validateFile(file)) return

    // Add to uploaded files
    uploadedReports.push(file)

    // Display file
    displayUploadedFile(file)
  })
}

function validateFile(file) {
  const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "text/plain"]
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (!allowedTypes.includes(file.type)) {
    showError(`File type ${file.type} is not allowed`)
    return false
  }

  if (file.size > maxSize) {
    showError(`File ${file.name} exceeds 10MB limit`)
    return false
  }

  return true
}

function displayUploadedFile(file) {
  const container = document.getElementById("uploadedFiles")

  const fileElement = document.createElement("div")
  fileElement.className = "uploaded-file"
  fileElement.innerHTML = `
        <div class="file-info">
            <div class="file-icon">
                <i class="fas fa-file"></i>
            </div>
            <div>
                <strong>${file.name}</strong><br>
                <small>${formatFileSize(file.size)}</small>
            </div>
        </div>
        <button class="btn btn-sm btn-danger" onclick="removeFile('${file.name}')">
            <i class="fas fa-times"></i>
        </button>
    `

  container.appendChild(fileElement)
}

function removeFile(fileName) {
  uploadedReports = uploadedReports.filter((file) => file.name !== fileName)

  // Remove from display
  const fileElements = document.querySelectorAll(".uploaded-file")
  fileElements.forEach((element) => {
    if (element.textContent.includes(fileName)) {
      element.remove()
    }
  })
}

// Step 5: Payment
function updatePaymentSummary() {
  const summaryDiv = document.getElementById("appointmentSummary")
  const feeSpan = document.getElementById("consultationFee")
  const totalSpan = document.getElementById("totalAmount")

  if (selectedDoctor && selectedDate && selectedTimeSlot && selectedPatient) {
    summaryDiv.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Doctor</div>
                    <div class="detail-value">Dr. ${selectedDoctor.fullName}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Patient</div>
                    <div class="detail-value">${selectedPatient.fullName}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Date</div>
                    <div class="detail-value">${formatDate(selectedDate)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Time</div>
                    <div class="detail-value">${selectedTimeSlot.startTime} - ${selectedTimeSlot.endTime}</div>
                </div>
            </div>
        `

    const fee = selectedDoctor.fees || 0
    feeSpan.textContent = `₹${fee}`
    totalSpan.textContent = `₹${fee}`
  }
}

async function processPayment() {
  try {
    // Mock payment processing
    showSuccess("Payment processed successfully!")

    // Create mock appointment
    appointment = {
      appointmentId: Date.now(),
      patientName: selectedPatient.fullName,
      doctorName: selectedDoctor.fullName,
      appointmentDate: selectedDate.toISOString().split("T")[0],
      appointmentTime: selectedTimeSlot.startTime,
      appointmentStatus: "CONFIRMED",
      paymentStatus: "PAID",
    }

    nextStep() // Move to confirmation step
  } catch (error) {
    console.error("Error processing payment:", error)
    showError("Payment processing failed")
  }
}

// Step 6: Confirmation
function showConfirmation() {
  const detailsDiv = document.getElementById("confirmationDetails")

  detailsDiv.innerHTML = `
        <div class="detail-item">
            <div class="detail-label">Appointment ID</div>
            <div class="detail-value">#${appointment.appointmentId}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Doctor</div>
            <div class="detail-value">Dr. ${selectedDoctor.fullName}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Patient</div>
            <div class="detail-value">${selectedPatient.fullName}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Date & Time</div>
            <div class="detail-value">${formatDate(selectedDate)} at ${selectedTimeSlot.startTime}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Status</div>
            <div class="detail-value">
                <span class="status-badge status-confirmed">CONFIRMED</span>
            </div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Payment</div>
            <div class="detail-value">
                <span class="status-badge payment-paid">PAID</span>
            </div>
        </div>
    `
}

function returnToDashboard() {
  closeBookingModal()
  loadAppointments()
}

function closeBookingModal() {
  closeModal("bookAppointmentModal")
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
  if (!confirm("Are you sure you want to cancel this appointment?")) return

  try {
    // Mock cancellation
    showSuccess("Appointment cancelled successfully")
    loadAppointments()
  } catch (error) {
    console.error("Error cancelling appointment:", error)
    showError("Failed to cancel appointment")
  }
}

// Reschedule functions
function openRescheduleModal(appointmentId) {
  document.getElementById("rescheduleAppointmentId").value = appointmentId
  openModal("rescheduleModal")
}

// Modal functions
function openModal(modalId) {
  document.getElementById(modalId).style.display = "block"
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none"
}

// Tab switching
function switchTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active")
  })

  // Remove active class from all tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active")
  })

  // Show selected tab content
  document.getElementById(tabName + "Tab").classList.add("active")

  // Add active class to selected tab
  event.target.classList.add("active")
}

// Pagination
function updatePagination() {
  const paginationDiv = document.getElementById("pagination")

  if (totalPages <= 1) {
    paginationDiv.innerHTML = ""
    return
  }

  let paginationHTML = ""

  // Previous button
  paginationHTML += `
        <button onclick="loadAppointments(${currentPage - 1})" ${currentPage === 0 ? "disabled" : ""}>
            <i class="fas fa-chevron-left"></i> Previous
        </button>
    `

  // Page numbers
  for (let i = 0; i < totalPages; i++) {
    if (i === currentPage) {
      paginationHTML += `<button class="active">${i + 1}</button>`
    } else {
      paginationHTML += `<button onclick="loadAppointments(${i})">${i + 1}</button>`
    }
  }

  // Next button
  paginationHTML += `
        <button onclick="loadAppointments(${currentPage + 1})" ${currentPage === totalPages - 1 ? "disabled" : ""}>
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `

  paginationDiv.innerHTML = paginationHTML
}

// Utility functions
function showLoading() {
  document.getElementById("appointmentsTableBody").innerHTML = `
        <tr>
            <td colspan="7" class="loading">
                <div class="spinner"></div>
                Loading appointments...
            </td>
        </tr>
    `
}

function showSuccess(message) {
  const alert = document.createElement("div")
  alert.className = "alert alert-success"
  alert.textContent = message
  alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `
  document.body.appendChild(alert)

  setTimeout(() => {
    alert.remove()
  }, 5000)
}

function showError(message) {
  const alert = document.createElement("div")
  alert.className = "alert alert-error"
  alert.textContent = message
  alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `
  document.body.appendChild(alert)

  setTimeout(() => {
    alert.remove()
  }, 5000)
}

function formatDate(dateString) {
  if (!dateString) return "N/A"
  if (dateString instanceof Date) {
    return dateString.toLocaleDateString()
  }
  return new Date(dateString).toLocaleDateString()
}

function formatDateTime(dateString) {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleString()
}

function formatFileSize(bytes) {
  if (!bytes) return "N/A"
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
}

function refreshAppointments() {
  loadAppointments(currentPage)
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    // Clear any stored session data
    localStorage.clear()
    sessionStorage.clear()

    // Redirect to login page
    window.location.href = "login.html"
  }
}

// Close modals when clicking outside
window.onclick = (event) => {
  const modals = document.querySelectorAll(".modal")
  modals.forEach((modal) => {
    if (event.target === modal) {
      modal.style.display = "none"
    }
  })
}
