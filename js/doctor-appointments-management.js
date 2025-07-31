// Global variables
let currentPage = 0
const totalPages = 0
let currentAppointmentId = null
let currentPatientId = null
const doctorId = localStorage.getItem("doctorId") || "1"

// API Base URL
const API_BASE = "http://localhost:8080/api/v1"

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  loadAppointments()
  setupEventListeners()
})

function setupEventListeners() {
  // Search on Enter key
  document.getElementById("searchPatient").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      loadAppointments()
    }
  })

  // View options change listener
  document.getElementById("appointmentView").addEventListener("change", function () {
    const viewType = this.value
    const statusFilterGroup = document.getElementById("statusFilterGroup")
    const dateFilterGroup = document.getElementById("dateFilterGroup")

    if (viewType === "all") {
      statusFilterGroup.style.display = "block"
      dateFilterGroup.style.display = "block"
    } else {
      statusFilterGroup.style.display = "none"
      dateFilterGroup.style.display = "none"
    }

    loadAppointments()
  })

  // Date change listener
  document.getElementById("newDate").addEventListener("change", () => {
    loadAvailableTimeSlots()
  })

  // File upload drag and drop
  const fileUpload = document.querySelector(".file-upload")
  if (fileUpload) {
    fileUpload.addEventListener("dragover", function (e) {
      e.preventDefault()
      this.classList.add("dragover")
    })

    fileUpload.addEventListener("dragleave", function (e) {
      e.preventDefault()
      this.classList.remove("dragover")
    })

    fileUpload.addEventListener("drop", function (e) {
      e.preventDefault()
      this.classList.remove("dragover")
      const files = e.dataTransfer.files
      document.getElementById("fileInput").files = files
    })
  }
}

async function loadAppointments(page = 0) {
  showLoading(true)

  try {
    const searchTerm = document.getElementById("searchPatient").value
    const viewType = document.getElementById("appointmentView").value
    const statusFilter = document.getElementById("statusFilter").value
    const dateFilter = document.getElementById("dateFilter").value

    let url = API_BASE + "/appointments/doctor/" + doctorId

    if (viewType === "today") {
      url = API_BASE + "/appointments/doctor/" + doctorId + "/today"
    }

    const params = new URLSearchParams({
      page: page,
      size: 12,
      sort: "appointmentDate,desc",
    })

    if (statusFilter && viewType === "all") {
      params.append("status", statusFilter)
    }

    if (dateFilter && viewType === "all") {
      params.append("date", dateFilter)
    }

    const response = await fetch(url + "?" + params)

    if (!response.ok) {
      throw new Error("Failed to load appointments")
    }

    const data = await response.json()

    // Filter by search term if provided
    let appointments = data.content || []
    if (searchTerm) {
      appointments = appointments.filter(
        (apt) =>
          apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (apt.patientPhone && apt.patientPhone.includes(searchTerm)),
      )
    }

    displayAppointments(appointments)
    updatePagination(data.totalPages || 1, page)
    currentPage = page
  } catch (error) {
    console.error("Error loading appointments:", error)
    showError("Failed to load appointments. Please try again.")
  } finally {
    showLoading(false)
  }
}

function displayAppointments(appointments) {
  const grid = document.getElementById("appointmentsGrid")

  if (appointments.length === 0) {
    grid.innerHTML =
      '<div class="no-appointments" style="grid-column: 1 / -1;"><i class="fas fa-calendar-times"></i><h3>No appointments found</h3><p>No appointments match your current filters.</p></div>'
    return
  }

  let appointmentCards = ""
  appointments.forEach((appointment) => {
    appointmentCards += '<div class="appointment-card ' + appointment.appointmentStatus.toLowerCase() + '">'
    appointmentCards += '<div class="card-header">'
    appointmentCards += '<div class="patient-name">' + appointment.patientName + "</div>"
    appointmentCards +=
      '<div class="appointment-status status-' +
      appointment.appointmentStatus.toLowerCase() +
      '">' +
      appointment.appointmentStatus +
      "</div>"
    appointmentCards += "</div>"
    appointmentCards += '<div class="appointment-details">'
    appointmentCards +=
      '<div class="detail-row"><i class="fas fa-calendar"></i><span>' +
      formatDate(appointment.appointmentDate) +
      "</span></div>"
    appointmentCards +=
      '<div class="detail-row"><i class="fas fa-clock"></i><span>' +
      formatTime(appointment.appointmentTime) +
      "</span></div>"
    appointmentCards +=
      '<div class="detail-row"><i class="fas fa-stethoscope"></i><span>' +
      (appointment.doctorSpecialization || "General Medicine") +
      "</span></div>"
    appointmentCards +=
      '<div class="detail-row"><i class="fas fa-dollar-sign"></i><span>₹' +
      (appointment.fees || "500") +
      "</span></div>"
    appointmentCards += "</div>"

    appointmentCards += '<div class="card-actions">'
    appointmentCards +=
      '<button class="btn btn-info" onclick="viewPatientDetails(' +
      appointment.patientId +
      ')"><i class="fas fa-user"></i> Patient Details</button>'
    appointmentCards +=
      '<button class="btn btn-secondary" onclick="viewAppointmentHistory(' +
      appointment.patientId +
      ')"><i class="fas fa-history"></i> Patient History</button>'

    appointmentCards +=
      '<button class="btn btn-primary" onclick="viewReportsUploadedyByPatient(' +
      appointment.appointmentId +
      ')"><i class="fas fa-file-medical"></i> Reports Uploaded By Patient</button>'

    appointmentCards += getActionButtons(appointment)
    appointmentCards += "</div>"
    appointmentCards += "</div>"
  })

  grid.innerHTML = appointmentCards
}

function getActionButtons(appointment) {
  const status = appointment.appointmentStatus
  let buttons = ""

  if (status === "CONFIRMED") {
    buttons +=
      '<button class="btn btn-success" onclick="markCompleted(' +
      appointment.appointmentId +
      ')"><i class="fas fa-check"></i> Mark Completed</button>'
    buttons +=
      '<button class="btn btn-warning" onclick="rescheduleAppointment(' +
      appointment.appointmentId +
      ')"><i class="fas fa-calendar-alt"></i> Reschedule</button>'
  }

  if (status === "COMPLETED") {
    buttons +=
      '<button class="btn btn-info" onclick="uploadMedicalReportsForPatient(' +
      appointment.patientId +
      ", " +
      appointment.appointmentId +
      ')"><i class="fas fa-upload"></i> Upload Reports</button>'

    buttons +=
      '<button class="btn btn-primary" onclick="viewMedicalReports(' +
      appointment.patientId +
      ')"><i class="fas fa-file-medical"></i> view Reports </button>'

    buttons +=
      '<button class="btn btn-primary" onclick="viewPrescription(' +
      appointment.appointmentId +
      ')"><i class="fas fa-prescription"></i> View Prescription</button>'
    buttons +=
      '<button class="btn btn-success" onclick="downloadPrescription(' +
      appointment.appointmentId +
      ')"><i class="fas fa-download"></i> Download Prescription</button>'
  }

  return buttons
}

async function markCompleted(appointmentId) {
  if (!confirm("Are you sure you want to mark this appointment as completed?")) {
    return
  }

  try {
    const response = await fetch(API_BASE + "/appointments/" + appointmentId + "/complete", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      showSuccess("Appointment marked as completed successfully!")
      currentAppointmentId = appointmentId
      openModal("visitNotesModal")
      loadAppointments(currentPage)
    } else {
      throw new Error("Failed to mark appointment as completed")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to mark appointment as completed")
  }
}

async function rescheduleAppointment(appointmentId) {
  currentAppointmentId = appointmentId

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("newDate").min = today

  openModal("rescheduleModal")
}

async function loadAvailableTimeSlots() {
  const date = document.getElementById("newDate").value
  const timeSlotSelect = document.getElementById("newTimeSlot")

  if (!date) {
    timeSlotSelect.innerHTML = '<option value="">Select a date first</option>'
    return
  }

  try {
    const response = await fetch(API_BASE + "/appointment-slots/doctor/" + doctorId + "/date/" + date)

    if (response.ok) {
      const slots = await response.json()

      timeSlotSelect.innerHTML = '<option value="">Select a time slot</option>'

      slots.forEach((slot) => {
        const option = document.createElement("option")
        option.value = slot.id
        option.textContent = formatTime(slot.startTime) + " - " + formatTime(slot.endTime)
        timeSlotSelect.appendChild(option)
      })

      if (slots.length === 0) {
        timeSlotSelect.innerHTML = '<option value="">No available slots</option>'
      }
    } else {
      throw new Error("Failed to load time slots")
    }
  } catch (error) {
    console.error("Error loading time slots:", error)
    timeSlotSelect.innerHTML = '<option value="">Error loading slots</option>'
  }
}

async function confirmReschedule() {
  const newDate = document.getElementById("newDate").value
  const newTimeSlot = document.getElementById("newTimeSlot").value

  if (!newDate || !newTimeSlot) {
    showError("Please select both date and time slot")
    return
  }

  try {
    const response = await fetch(API_BASE + "/appointments/" + currentAppointmentId + "/reschedule", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        newDate: newDate,
        newTimeSlotId: Number.parseInt(newTimeSlot),
      }),
    })

    if (response.ok) {
      showSuccess("Appointment rescheduled successfully!")
      closeModal("rescheduleModal")
      loadAppointments(currentPage)

      // Clear form
      document.getElementById("newDate").value = ""
      document.getElementById("newTimeSlot").innerHTML = '<option value="">Select a time slot</option>'
    } else {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to reschedule appointment")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to reschedule appointment: " + error.message)
  }
}

async function viewPatientDetails(patientId) {
  if (!patientId) {
    showError("Patient ID is not available")
    return
  }

  currentPatientId = patientId

  try {
    const response = await fetch(API_BASE + "/patients/" + patientId + "/complete-details")

    if (response.ok) {
      const patient = await response.json()
      displayPatientDetails(patient)
      openModal("patientModal")
    } else {
      // Fallback to basic patient info
      const basicResponse = await fetch(API_BASE + "/patients/" + patientId)
      if (basicResponse.ok) {
        const patient = await basicResponse.json()
        displayBasicPatientDetails(patient)
        openModal("patientModal")
      } else {
        throw new Error("Failed to load patient details")
      }
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to load patient details")
  }
}

function displayPatientDetails(patient) {
  let detailsHtml = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">'
  detailsHtml += '<div><h4><i class="fas fa-user"></i> Personal Information</h4>'
  detailsHtml += '<div class="detail-row"><strong>Name:</strong> ' + patient.fullName + "</div>"
  detailsHtml += '<div class="detail-row"><strong>Gender:</strong> ' + patient.gender + "</div>"
  detailsHtml += '<div class="detail-row"><strong>Date of Birth:</strong> ' + formatDate(patient.dateOfBirth) + "</div>"
  detailsHtml += '<div class="detail-row"><strong>Phone:</strong> ' + patient.phone + "</div>"
  detailsHtml += '<div class="detail-row"><strong>Email:</strong> ' + patient.emailAddress + "</div>"
  detailsHtml += "</div>"
  detailsHtml += '<div><h4><i class="fas fa-map-marker-alt"></i> Contact Information</h4>'
  detailsHtml += '<div class="detail-row"><strong>Address:</strong> ' + patient.address + "</div>"
  detailsHtml += "</div></div>"
  detailsHtml += '<div style="margin-top: 20px;">'
  detailsHtml +=
    '<button class="btn btn-primary" onclick="viewAppointmentHistory(' +
    patient.patientId +
    ')"><i class="fas fa-history"></i> View Full History</button>'
  detailsHtml +=
    '<button class="btn btn-info" onclick="viewMedicalReports(' +
    patient.patientId +
    ')"><i class="fas fa-file-medical"></i> View Medical Reports</button>'
  detailsHtml += "</div>"

  document.getElementById("patientDetails").innerHTML = detailsHtml
}

function displayBasicPatientDetails(patient) {
  let detailsHtml = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">'
  detailsHtml += '<div><h4><i class="fas fa-user"></i> Personal Information</h4>'
  detailsHtml += '<div class="detail-row"><strong>Name:</strong> ' + patient.fullName + "</div>"
  detailsHtml += '<div class="detail-row"><strong>Gender:</strong> ' + patient.gender + "</div>"
  detailsHtml += '<div class="detail-row"><strong>Date of Birth:</strong> ' + formatDate(patient.dateOfBirth) + "</div>"
  detailsHtml += '<div class="detail-row"><strong>Phone:</strong> ' + patient.phone + "</div>"
  detailsHtml += '<div class="detail-row"><strong>Email:</strong> ' + patient.emailAddress + "</div>"
  detailsHtml += "</div>"
  detailsHtml += '<div><h4><i class="fas fa-map-marker-alt"></i> Contact Information</h4>'
  detailsHtml += '<div class="detail-row"><strong>Address:</strong> ' + patient.address + "</div>"
  detailsHtml += "</div></div>"

  document.getElementById("patientDetails").innerHTML = detailsHtml
}

// UPDATED FUNCTION: Now uses the new endpoint to get appointment history between patient and doctor
async function viewAppointmentHistory(patientId) {
  if (!patientId) {
    showError("Patient ID is not available")
    return
  }

  currentPatientId = patientId

  try {
    // Load appointments between this patient and current doctor
    const appointmentsResponse = await fetch(
      API_BASE + "/appointments/patient/" + patientId + "/doctor/" + doctorId + "/history?size=50",
    )

    // Load prescriptions (you might want to filter these by doctor too)
    const prescriptionsResponse = await fetch(API_BASE + "/prescriptions/patient/" + patientId + "/history")

    let appointments = []
    let prescriptions = []

    if (appointmentsResponse.ok) {
      const appointmentsData = await appointmentsResponse.json()
      appointments = appointmentsData.content || appointmentsData
    }

    if (prescriptionsResponse.ok) {
      prescriptions = await prescriptionsResponse.json()
    }

    displayAppointmentHistory(appointments, prescriptions)
    openModal("historyModal")
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to load appointment history")
  }
}

function displayAppointmentHistory(appointments, prescriptions) {
  let historyHtml = '<div style="margin-bottom: 30px;">'
  historyHtml += '<h4><i class="fas fa-calendar-check"></i> Appointment History with You</h4>'

  if (appointments.length === 0) {
    historyHtml +=
      '<div class="no-appointments"><p>No previous appointments found between you and this patient.</p></div>'
  } else {
    historyHtml += '<div class="timeline">'

    appointments.forEach((apt) => {
      historyHtml += '<div class="timeline-item">'
      historyHtml +=
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">'
      historyHtml +=
        "<strong>" + formatDate(apt.appointmentDate) + " at " + formatTime(apt.appointmentTime) + "</strong>"
      historyHtml +=
        '<span class="appointment-status status-' +
        apt.appointmentStatus.toLowerCase() +
        '">' +
        apt.appointmentStatus +
        "</span>"
      historyHtml += "</div>"
      historyHtml += "<div>Doctor: " + apt.doctorName + "</div>"
      historyHtml += "<div>Specialization: " + apt.doctorSpecialization + "</div>"
      if (apt.notes) {
        historyHtml += "<div>Notes: " + apt.notes + "</div>"
      }

      // Add action buttons for each appointment
      historyHtml += '<div style="margin-top: 15px; display: flex; gap: 8px; flex-wrap: wrap;">'

      // Patient Reports Button
      historyHtml +=
        '<button class="btn btn-sm btn-info" onclick="viewPatientReportsForAppointment(' +
        apt.appointmentId +
        ')" title="View reports uploaded by patient">' +
        '<i class="fas fa-file-upload"></i> Patient Reports</button>'

      // Medical Reports Button (Doctor uploaded)
      historyHtml +=
        '<button class="btn btn-sm btn-primary" onclick="viewMedicalReportsForAppointment(' +
        apt.appointmentId +
        ')" title="View medical reports uploaded by doctor">' +
        '<i class="fas fa-file-medical"></i> Medical Reports</button>'

      // Prescription Button
      historyHtml +=
        '<button class="btn btn-sm btn-success" onclick="viewPrescriptionForAppointment(' +
        apt.appointmentId +
        ')" title="View prescription">' +
        '<i class="fas fa-prescription"></i> Prescription</button>'

      // Prescription Medicines Button
      historyHtml +=
        '<button class="btn btn-sm btn-warning" onclick="viewPrescriptionMedicinesForAppointment(' +
        apt.appointmentId +
        ')" title="View prescribed medicines">' +
        '<i class="fas fa-pills"></i> Medicines</button>'

      historyHtml += "</div>"
      historyHtml += "</div>"
    })

    historyHtml += "</div>"
  }

  historyHtml += "</div>"
  historyHtml += '<div><h4><i class="fas fa-prescription"></i> Overall Prescription History</h4>'
  historyHtml += '<div class="timeline">'

  prescriptions.forEach((prescription) => {
    historyHtml += '<div class="timeline-item">'
    historyHtml +=
      '<div style="margin-bottom: 10px;"><strong>Date: ' + formatDate(prescription.createdAt) + "</strong></div>"
    if (prescription.diagnosis) {
      historyHtml += "<div><strong>Diagnosis:</strong> " + prescription.diagnosis + "</div>"
    }
    if (prescription.notes) {
      historyHtml += "<div><strong>Notes:</strong> " + prescription.notes + "</div>"
    }
    if (prescription.medicines && prescription.medicines.length > 0) {
      historyHtml += '<div style="margin-top: 10px;"><strong>Medicines:</strong><ul style="margin-left: 20px;">'
      prescription.medicines.forEach((med) => {
        historyHtml +=
          "<li>" +
          med.medicineName +
          " - " +
          med.dosage +
          " (" +
          med.frequency +
          ") for " +
          med.durationDays +
          " days</li>"
      })
      historyHtml += "</ul></div>"
    }
    historyHtml += '<div style="margin-top: 10px;">'
    historyHtml +=
      '<button class="btn btn-primary" onclick="downloadPrescription(' +
      prescription.appointmentId +
      ')"><i class="fas fa-download"></i> Download</button>'
    historyHtml +=
      '<button class="btn btn-info" onclick="viewPrescriptionDetails(' +
      prescription.id +
      ')"><i class="fas fa-eye"></i> View Details</button>'
    historyHtml += "</div></div>"
  })

  historyHtml += "</div></div>"

  document.getElementById("appointmentHistory").innerHTML = historyHtml
}

// Function to view patient reports for a specific appointment
async function viewPatientReportsForAppointment(appointmentId) {
  if (!appointmentId) {
    showError("Appointment ID is not available")
    return
  }

  try {
    const response = await fetch(API_BASE + "/patient-appointment-reports/appointment/" + appointmentId)

    if (response.ok) {
      const reports = await response.json()
      displayPatientReportsModal(reports, "Patient Reports for Appointment")
    } else {
      showInfo("No patient reports found for this appointment")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to load patient reports")
  }
}

// Function to view medical reports for a specific appointment
async function viewMedicalReportsForAppointment(appointmentId) {
  if (!appointmentId) {
    showError("Appointment ID is not available")
    return
  }

  try {
    // First, get all medical reports that have this appointment ID
    const response = await fetch(API_BASE + "/medical-reports/patient/" + currentPatientId)

    if (response.ok) {
      const allReports = await response.json()

      // Filter reports by appointment ID (if available) or by doctor and uploaded by doctor
      const appointmentReports = allReports.filter((report) => {
        // Check if report has appointmentId and matches
        if (report.appointmentId && report.appointmentId === appointmentId) {
          return report.uploadedBy === "DOCTOR"
        }
        // If no appointmentId, check if uploaded by current doctor
        return report.uploadedBy === "DOCTOR" && report.doctorId == doctorId
      })

      if (appointmentReports.length > 0) {
        displayMedicalReportsModal(appointmentReports, "Medical Reports for Appointment")
      } else {
        // If no specific appointment reports, show all doctor reports for this patient
        const doctorReports = allReports.filter(
          (report) => report.uploadedBy === "DOCTOR" && report.doctorId == doctorId,
        )

        if (doctorReports.length > 0) {
          displayMedicalReportsModal(doctorReports, "Medical Reports by Doctor")
        } else {
          showInfo("No medical reports found uploaded by doctor for this patient")
        }
      }
    } else {
      showInfo("No medical reports found for this appointment")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to load medical reports")
  }
}

// Function to view prescription for a specific appointment
async function viewPrescriptionForAppointment(appointmentId) {
  if (!appointmentId) {
    showError("Appointment ID is not available")
    return
  }

  try {
    const response = await fetch(API_BASE + "/prescriptions/appointment/" + appointmentId)

    if (response.ok) {
      const prescription = await response.json()
      displayPrescriptionDetails(prescription)
      openModal("prescriptionModal")
    } else {
      showInfo("No prescription found for this appointment")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to load prescription")
  }
}

// Function to view prescription medicines for a specific appointment
async function viewPrescriptionMedicinesForAppointment(appointmentId) {
  if (!appointmentId) {
    showError("Appointment ID is not available")
    return
  }

  try {
    const response = await fetch(API_BASE + "/prescriptions/appointment/" + appointmentId)

    if (response.ok) {
      const prescription = await response.json()
      displayPrescriptionMedicinesModal(prescription)
    } else {
      showInfo("No prescription medicines found for this appointment")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to load prescription medicines")
  }
}

// Function to display patient reports in modal
function displayPatientReportsModal(reports, title) {
  if (reports.length === 0) {
    document.getElementById("patientReports").innerHTML =
      '<div class="no-appointments"><i class="fas fa-file-medical"></i><h4>No reports found</h4><p>No patient reports available for this appointment.</p></div>'
  } else {
    let reportsHtml = '<div style="display: grid; gap: 15px;">'

    reports.forEach((report) => {
      reportsHtml += '<div class="report-item">'
      reportsHtml += '<div class="report-header">'
      reportsHtml += "<strong>" + report.fileName + "</strong>"
      reportsHtml += '<span style="font-size: 12px; color: #6c757d;">' + formatDate(report.uploadedAt) + "</span>"
      reportsHtml += "</div>"
      reportsHtml += '<div style="margin-bottom: 10px;">'
      reportsHtml += "<div><strong>Type:</strong> " + report.fileType + "</div>"
      reportsHtml += "<div><strong>Size:</strong> " + formatFileSize(report.fileSize) + "</div>"
      if (report.description) {
        reportsHtml += "<div><strong>Description:</strong> " + report.description + "</div>"
      }
      reportsHtml += "</div>"
      reportsHtml += '<div style="display: flex; gap: 10px;">'
      reportsHtml +=
        '<button class="btn btn-primary" onclick="downloadReportUploadedyByPatient(' +
        report.id +
        ')"><i class="fas fa-download"></i> Download</button>'
      reportsHtml +=
        '<button class="btn btn-info" onclick="viewReportUploadedyByPatient(' +
        report.id +
        ')"><i class="fas fa-eye"></i> View</button>'
      reportsHtml += "</div></div>"
    })

    reportsHtml += "</div>"
    document.getElementById("patientReports").innerHTML = reportsHtml
  }

  // Update modal title
  document.querySelector("#reportsModal .modal-header h2").innerHTML = '<i class="fas fa-file-medical"></i> ' + title
  openModal("reportsModal")
}

// Function to display medical reports in modal
function displayMedicalReportsModal(reports, title) {
  if (reports.length === 0) {
    document.getElementById("patientReports").innerHTML =
      '<div class="no-appointments"><i class="fas fa-file-medical"></i><h4>No medical reports found</h4><p>No medical reports available for this appointment.</p></div>'
  } else {
    let reportsHtml = '<div style="display: grid; gap: 15px;">'

    reports.forEach((report) => {
      reportsHtml += '<div class="report-item">'
      reportsHtml += '<div class="report-header">'
      reportsHtml += "<strong>" + report.fileName + "</strong>"
      reportsHtml += '<span style="font-size: 12px; color: #6c757d;">' + formatDate(report.uploadedAt) + "</span>"
      reportsHtml += "</div>"
      reportsHtml += '<div style="margin-bottom: 10px;">'
      reportsHtml += "<div><strong>Type:</strong> " + getReportTypeLabel(report.fileType) + "</div>"
      reportsHtml += "<div><strong>Size:</strong> " + formatFileSize(report.fileSize) + "</div>"
      reportsHtml += "<div><strong>Uploaded by:</strong> " + report.uploadedBy + "</div>"
      if (report.description) {
        reportsHtml += "<div><strong>Description:</strong> " + report.description + "</div>"
      }
      if (report.doctorName) {
        reportsHtml += "<div><strong>Doctor:</strong> " + report.doctorName + "</div>"
      }
      reportsHtml += "</div>"
      reportsHtml += '<div style="display: flex; gap: 10px;">'
      reportsHtml +=
        '<button class="btn btn-primary" onclick="downloadMedicalReport(' +
        report.id +
        ')"><i class="fas fa-download"></i> Download</button>'
      reportsHtml +=
        '<button class="btn btn-info" onclick="viewMedicalReport(' +
        report.id +
        ')"><i class="fas fa-eye"></i> View</button>'
      reportsHtml += "</div></div>"
    })

    reportsHtml += "</div>"
    document.getElementById("patientReports").innerHTML = reportsHtml
  }

  // Update modal title
  document.querySelector("#reportsModal .modal-header h2").innerHTML = '<i class="fas fa-file-medical"></i> ' + title
  openModal("reportsModal")
}

// Function to display prescription medicines in a modal
function displayPrescriptionMedicinesModal(prescription) {
  let medicinesHtml = '<div style="margin-bottom: 20px;">'
  medicinesHtml += '<h4><i class="fas fa-info-circle"></i> Appointment Details</h4>'
  medicinesHtml += '<div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">'
  medicinesHtml += "<div><strong>Date:</strong> " + formatDate(prescription.createdAt) + "</div>"
  if (prescription.diagnosis) {
    medicinesHtml += "<div><strong>Diagnosis:</strong> " + prescription.diagnosis + "</div>"
  }
  if (prescription.notes) {
    medicinesHtml += "<div><strong>Notes:</strong> " + prescription.notes + "</div>"
  }
  medicinesHtml += "</div></div>"

  if (prescription.medicines && prescription.medicines.length > 0) {
    medicinesHtml +=
      '<h4><i class="fas fa-pills"></i> Prescribed Medicines (' + prescription.medicines.length + ")</h4>"
    medicinesHtml += '<div style="display: grid; gap: 15px;">'

    prescription.medicines.forEach((medicine, index) => {
      medicinesHtml +=
        '<div class="medicine-item" style="border: 1px solid #e9ecef; padding: 15px; border-radius: 8px; background: white;">'
      medicinesHtml +=
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">'
      medicinesHtml +=
        '<h5 style="margin: 0; color: #495057;"><i class="fas fa-capsules"></i> ' + medicine.medicineName + "</h5>"
      medicinesHtml +=
        '<span style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">#' +
        (index + 1) +
        "</span>"
      medicinesHtml += "</div>"

      medicinesHtml +=
        '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 10px;">'
      medicinesHtml +=
        '<div><strong>Dosage:</strong><br><span style="color: #667eea; font-weight: 600;">' +
        medicine.dosage +
        "</span></div>"
      medicinesHtml +=
        '<div><strong>Frequency:</strong><br><span style="color: #28a745; font-weight: 600;">' +
        medicine.frequency +
        "</span></div>"
      medicinesHtml +=
        '<div><strong>Duration:</strong><br><span style="color: #ffc107; font-weight: 600;">' +
        medicine.durationDays +
        " days</span></div>"
      medicinesHtml += "</div>"

      if (medicine.instructions) {
        medicinesHtml +=
          '<div style="margin-top: 10px; padding: 10px; background: #f0f8ff; border-left: 3px solid #007bff; border-radius: 4px;">'
        medicinesHtml += "<strong>Instructions:</strong> " + medicine.instructions
        medicinesHtml += "</div>"
      }
      medicinesHtml += "</div>"
    })

    medicinesHtml += "</div>"
  } else {
    medicinesHtml +=
      '<div class="no-appointments"><i class="fas fa-pills"></i><h4>No medicines prescribed</h4><p>No medicines were prescribed for this appointment.</p></div>'
  }

  medicinesHtml +=
    '<div style="margin-top: 20px; text-align: center; display: flex; gap: 10px; justify-content: center;">'
  medicinesHtml +=
    '<button class="btn btn-success" onclick="downloadMedicinesList(' +
    prescription.appointmentId +
    ')"><i class="fas fa-download"></i> Download Medicines List</button>'
  medicinesHtml +=
    '<button class="btn btn-primary" onclick="downloadPrescription(' +
    prescription.appointmentId +
    ')"><i class="fas fa-download"></i> Download Full Prescription</button>'
  medicinesHtml +=
    '<button class="btn btn-info" onclick="printMedicinesList(' +
    prescription.appointmentId +
    ')"><i class="fas fa-print"></i> Print Medicines</button>'
  medicinesHtml += "</div>"

  document.getElementById("prescriptionDetails").innerHTML = medicinesHtml

  // Update modal title
  document.querySelector("#prescriptionModal .modal-header h2").innerHTML =
    '<i class="fas fa-pills"></i> Prescription Medicines'
  openModal("prescriptionModal")
}

// New function to download medicines list as a formatted document
async function downloadMedicinesList(appointmentId) {
  try {
    const response = await fetch(API_BASE + "/prescriptions/appointment/" + appointmentId)

    if (response.ok) {
      const prescription = await response.json()

      if (!prescription.medicines || prescription.medicines.length === 0) {
        showError("No medicines found to download")
        return
      }

      // Create a formatted text content for medicines
      let content = "PRESCRIBED MEDICINES\n"
      content += "===================\n\n"
      content += "Date: " + formatDate(prescription.createdAt) + "\n"
      if (prescription.diagnosis) {
        content += "Diagnosis: " + prescription.diagnosis + "\n"
      }
      content += "\n"

      prescription.medicines.forEach((medicine, index) => {
        content += index + 1 + ". " + medicine.medicineName + "\n"
        content += "   Dosage: " + medicine.dosage + "\n"
        content += "   Frequency: " + medicine.frequency + "\n"
        content += "   Duration: " + medicine.durationDays + " days\n"
        if (medicine.instructions) {
          content += "   Instructions: " + medicine.instructions + "\n"
        }
        content += "\n"
      })

      // Create and download the file
      const blob = new Blob([content], { type: "text/plain" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "medicines_list_" + appointmentId + ".txt"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showSuccess("Medicines list downloaded successfully!")
    } else {
      throw new Error("Failed to get prescription details")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to download medicines list")
  }
}

// New function to print medicines list
async function printMedicinesList(appointmentId) {
  try {
    const response = await fetch(API_BASE + "/prescriptions/appointment/" + appointmentId)

    if (response.ok) {
      const prescription = await response.json()

      if (!prescription.medicines || prescription.medicines.length === 0) {
        showError("No medicines found to print")
        return
      }

      // Create print content
      let printContent = "<html><head><title>Medicines List</title>"
      printContent += "<style>"
      printContent += "body { font-family: Arial, sans-serif; margin: 20px; }"
      printContent +=
        ".header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }"
      printContent += ".medicine-item { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }"
      printContent += ".medicine-name { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }"
      printContent += ".medicine-details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }"
      printContent += ".detail-item { padding: 5px; }"
      printContent +=
        ".instructions { margin-top: 10px; padding: 10px; background: #f0f8ff; border-left: 3px solid #007bff; }"
      printContent += "</style></head><body>"

      printContent += '<div class="header">'
      printContent += "<h1>PRESCRIBED MEDICINES</h1>"
      printContent += "<p>Date: " + formatDate(prescription.createdAt) + "</p>"
      if (prescription.diagnosis) {
        printContent += "<p>Diagnosis: " + prescription.diagnosis + "</p>"
      }
      printContent += "</div>"

      prescription.medicines.forEach((medicine, index) => {
        printContent += '<div class="medicine-item">'
        printContent += '<div class="medicine-name">' + (index + 1) + ". " + medicine.medicineName + "</div>"
        printContent += '<div class="medicine-details">'
        printContent += '<div class="detail-item"><strong>Dosage:</strong><br>' + medicine.dosage + "</div>"
        printContent += '<div class="detail-item"><strong>Frequency:</strong><br>' + medicine.frequency + "</div>"
        printContent +=
          '<div class="detail-item"><strong>Duration:</strong><br>' + medicine.durationDays + " days</div>"
        printContent += "</div>"
        if (medicine.instructions) {
          printContent += '<div class="instructions"><strong>Instructions:</strong> ' + medicine.instructions + "</div>"
        }
        printContent += "</div>"
      })

      printContent += "</body></html>"

      // Open print window
      const printWindow = window.open("", "_blank")
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    } else {
      throw new Error("Failed to get prescription details")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to print medicines list")
  }
}

async function viewReportsUploadedyByPatient(appointmentId) {
  if (!appointmentId) {
    showError("Appointment ID is not available")
    return
  }

  try {
    const response = await fetch(API_BASE + "/patient-appointment-reports/appointment/" + appointmentId)

    if (response.ok) {
      const reports = await response.json()
      displayReportsUploadedyByPatient(reports)
      openModal("reportsModal")
    } else {
      throw new Error("Failed to load reports")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to load patient reports")
  }
}

function displayReportsUploadedyByPatient(reports) {
  if (reports.length === 0) {
    document.getElementById("patientReports").innerHTML =
      '<div class="no-appointments"><i class="fas fa-file-medical"></i><h4>No reports found</h4><p>No medical reports available for this appointment.</p></div>'
    return
  }

  let reportsHtml = '<div style="display: grid; gap: 15px;">'

  reports.forEach((report) => {
    reportsHtml += '<div class="report-item">'
    reportsHtml += '<div class="report-header">'
    reportsHtml += "<strong>" + report.fileName + "</strong>"
    reportsHtml += '<span style="font-size: 12px; color: #6c757d;">' + formatDate(report.uploadedAt) + "</span>"
    reportsHtml += "</div>"
    reportsHtml += '<div style="margin-bottom: 10px;">'
    reportsHtml += "<div><strong>Type:</strong> " + report.fileType + "</div>"
    reportsHtml += "<div><strong>Size:</strong> " + formatFileSize(report.fileSize) + "</div>"
    if (report.description) {
      reportsHtml += "<div><strong>Description:</strong> " + report.description + "</div>"
    }
    reportsHtml += "</div>"
    reportsHtml += '<div style="display: flex; gap: 10px;">'
    reportsHtml +=
      '<button class="btn btn-primary" onclick="downloadReportUploadedyByPatient(' +
      report.id +
      ')"><i class="fas fa-download"></i> Download</button>'
    reportsHtml +=
      '<button class="btn btn-info" onclick="viewReportUploadedyByPatient(' +
      report.id +
      ')"><i class="fas fa-eye"></i> View</button>'
    reportsHtml += "</div></div>"
  })

  reportsHtml += "</div>"

  document.getElementById("patientReports").innerHTML = reportsHtml
}

async function downloadReportUploadedyByPatient(reportId) {
  try {
    const response = await fetch(
      API_BASE +
        "/patient-appointment-reports/" +
        reportId +
        "/download?requestingUserId=" +
        doctorId +
        "&userType=DOCTOR",
    )

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "report_" + reportId
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } else {
      throw new Error("Failed to download report")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to download report")
  }
}

async function viewReportUploadedyByPatient(reportId) {
  try {
    const response = await fetch(
      API_BASE + "/patient-appointment-reports/" + reportId + "?requestingUserId=" + doctorId + "&userType=DOCTOR",
    )

    if (response.ok) {
      const report = await response.json()
      // Open the file URL in a new tab
      window.open(report.fileUrl, "_blank")
    } else {
      throw new Error("Failed to view report")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to view report")
  }
}

// Updated function to view medical reports using MedicalReport API
async function viewMedicalReports(patientId) {
  if (!patientId) {
    showError("Patient ID is not available")
    return
  }

  try {
    const response = await fetch(API_BASE + "/medical-reports/patient/" + patientId)

    if (response.ok) {
      const reports = await response.json()
      displayMedicalReports(reports)
      openModal("reportsModal")
    } else {
      throw new Error("Failed to load medical reports")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to load patient medical reports")
  }
}

// Updated function to display medical reports
function displayMedicalReports(reports) {
  if (reports.length === 0) {
    document.getElementById("patientReports").innerHTML =
      '<div class="no-appointments"><i class="fas fa-file-medical"></i><h4>No medical reports found</h4><p>No medical reports available for this patient.</p></div>'
    return
  }

  let reportsHtml = '<div style="display: grid; gap: 15px;">'

  reports.forEach((report) => {
    reportsHtml += '<div class="report-item">'
    reportsHtml += '<div class="report-header">'
    reportsHtml += "<strong>" + report.fileName + "</strong>"
    reportsHtml += '<span style="font-size: 12px; color: #6c757d;">' + formatDate(report.uploadedAt) + "</span>"
    reportsHtml += "</div>"
    reportsHtml += '<div style="margin-bottom: 10px;">'
    reportsHtml += "<div><strong>Type:</strong> " + getReportTypeLabel(report.fileType) + "</div>"
    reportsHtml += "<div><strong>Size:</strong> " + formatFileSize(report.fileSize) + "</div>"
    reportsHtml += "<div><strong>Uploaded by:</strong> " + report.uploadedBy + "</div>"
    if (report.description) {
      reportsHtml += "<div><strong>Description:</strong> " + report.description + "</div>"
    }
    if (report.doctorName) {
      reportsHtml += "<div><strong>Doctor:</strong> " + report.doctorName + "</div>"
    }
    reportsHtml += "</div>"
    reportsHtml += '<div style="display: flex; gap: 10px;">'
    reportsHtml +=
      '<button class="btn btn-primary" onclick="downloadMedicalReport(' +
      report.id +
      ')"><i class="fas fa-download"></i> Download</button>'
    reportsHtml +=
      '<button class="btn btn-info" onclick="viewMedicalReport(' +
      report.id +
      ')"><i class="fas fa-eye"></i> View</button>'
    reportsHtml += "</div></div>"
  })

  reportsHtml += "</div>"

  document.getElementById("patientReports").innerHTML = reportsHtml
}

// Function to get readable report type labels
function getReportTypeLabel(fileType) {
  const typeLabels = {
    LAB_REPORT: "Lab Report",
    X_RAY: "X-Ray",
    MRI_SCAN: "MRI Scan",
    CT_SCAN: "CT Scan",
    ULTRASOUND: "Ultrasound",
    ECG: "ECG",
    BLOOD_TEST: "Blood Test",
    URINE_TEST: "Urine Test",
    PRESCRIPTION: "Prescription",
    DISCHARGE_SUMMARY: "Discharge Summary",
    OTHER: "Other",
  }
  return typeLabels[fileType] || fileType
}

async function saveVisitNotes() {
  const diagnosis = document.getElementById("diagnosis").value
  const notes = document.getElementById("visitNotes").value

  if (!diagnosis && !notes) {
    showError("Please enter diagnosis or visit notes")
    return
  }

  // Collect medicines
  const medicines = []
  const medicineRows = document.querySelectorAll(".medicine-row")

  medicineRows.forEach((row) => {
    const name = row.querySelector(".medicine-name").value
    const dosage = row.querySelector(".medicine-dosage").value
    const frequency = row.querySelector(".medicine-frequency").value
    const days = row.querySelector(".medicine-days").value

    if (name && dosage && frequency && days) {
      medicines.push({
        medicineName: name,
        dosage: dosage,
        frequency: frequency,
        durationDays: Number.parseInt(days),
        instructions: "",
      })
    }
  })

  try {
    const prescriptionData = {
      appointmentId: currentAppointmentId,
      diagnosis: diagnosis,
      notes: notes,
      medicines: medicines,
    }

    const response = await fetch(API_BASE + "/prescriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prescriptionData),
    })

    if (response.ok) {
      showSuccess("Visit notes and prescription saved successfully!")
      closeModal("visitNotesModal")
      // Clear form
      document.getElementById("diagnosis").value = ""
      document.getElementById("visitNotes").value = ""
      clearMedicineRows()
    } else {
      throw new Error("Failed to save visit notes")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to save visit notes")
  }
}

function addMedicineRow() {
  const container = document.getElementById("medicinesContainer")
  const newRow = document.createElement("div")
  newRow.className = "medicine-row"

  newRow.innerHTML =
    '<input type="text" placeholder="Medicine Name" class="medicine-name">' +
    '<input type="text" placeholder="Dosage" class="medicine-dosage">' +
    '<input type="text" placeholder="Frequency" class="medicine-frequency">' +
    '<input type="number" placeholder="Days" class="medicine-days">' +
    '<button type="button" class="btn btn-danger" onclick="removeMedicineRow(this)"><i class="fas fa-minus"></i></button>'

  container.appendChild(newRow)
}

function removeMedicineRow(button) {
  button.parentElement.remove()
}

function clearMedicineRows() {
  const container = document.getElementById("medicinesContainer")
  const rows = container.querySelectorAll(".medicine-row")

  // Keep the first row and clear its values
  if (rows.length > 0) {
    const firstRow = rows[0]
    firstRow.querySelectorAll("input").forEach((input) => (input.value = ""))

    // Remove all other rows
    for (let i = 1; i < rows.length; i++) {
      rows[i].remove()
    }
  }
}

// Updated function to upload medical reports for a patient
async function uploadMedicalReportsForPatient(patientId, appointmentId = null) {
  currentPatientId = patientId
  currentAppointmentId = appointmentId

  // Clear previous form data
  document.getElementById("reportType").value = ""
  document.getElementById("fileInput").value = ""
  document.getElementById("fileDescription").value = ""

  openModal("uploadModal")
}

// Updated function to upload medical reports using MedicalReport API
async function uploadMedicalReports() {
  const fileInput = document.getElementById("fileInput")
  const reportType = document.getElementById("reportType").value
  const description = document.getElementById("fileDescription").value

  if (!fileInput.files || fileInput.files.length === 0) {
    showError("Please select files to upload")
    return
  }

  if (!reportType) {
    showError("Please select a report type")
    return
  }

  try {
    for (const file of fileInput.files) {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("patientId", currentPatientId)
      formData.append("fileType", reportType)
      formData.append("description", description)
      formData.append("uploadedBy", "DOCTOR")

      // Add doctor and appointment IDs if available
      if (doctorId) {
        formData.append("doctorId", doctorId)
      }
      if (currentAppointmentId) {
        formData.append("appointmentId", currentAppointmentId)
      }

      const response = await fetch(API_BASE + "/medical-reports/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload " + file.name)
      }
    }

    showSuccess("Medical reports uploaded successfully!")
    closeModal("uploadModal")

    // Clear form
    fileInput.value = ""
    document.getElementById("reportType").value = ""
    document.getElementById("fileDescription").value = ""
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to upload medical reports")
  }
}

// Updated function to download medical report
async function downloadMedicalReport(reportId) {
  try {
    const response = await fetch(API_BASE + "/medical-reports/" + reportId + "/download")

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "medical_report_" + reportId
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } else {
      throw new Error("Failed to download medical report")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to download medical report")
  }
}

// Updated function to view medical report
async function viewMedicalReport(reportId) {
  try {
    const response = await fetch(API_BASE + "/medical-reports/" + reportId)

    if (response.ok) {
      const report = await response.json()
      // Open the file URL in a new tab
      window.open(report.fileUrl, "_blank")
    } else {
      throw new Error("Failed to view medical report")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to view medical report")
  }
}

async function viewPrescription(appointmentId) {
  try {
    const response = await fetch(API_BASE + "/prescriptions/appointment/" + appointmentId)

    if (response.ok) {
      const prescription = await response.json()
      displayPrescriptionDetails(prescription)
      openModal("prescriptionModal")
    } else {
      throw new Error("Prescription not found")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("No prescription found for this appointment")
  }
}

async function viewPrescriptionDetails(prescriptionId) {
  try {
    const response = await fetch(API_BASE + "/prescriptions/" + prescriptionId)

    if (response.ok) {
      const prescription = await response.json()
      displayPrescriptionDetails(prescription)
      openModal("prescriptionModal")
    } else {
      throw new Error("Prescription not found")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to load prescription details")
  }
}

function displayPrescriptionDetails(prescription) {
  let prescriptionHtml = '<div class="prescription-section">'
  prescriptionHtml += '<div style="margin-bottom: 20px;">'
  prescriptionHtml += '<h4><i class="fas fa-notes-medical"></i> Diagnosis</h4>'
  prescriptionHtml += "<p>" + (prescription.diagnosis || "No diagnosis provided") + "</p>"
  prescriptionHtml += "</div>"

  prescriptionHtml += '<div style="margin-bottom: 20px;">'
  prescriptionHtml += '<h4><i class="fas fa-clipboard"></i> Notes</h4>'
  prescriptionHtml += "<p>" + (prescription.notes || "No notes provided") + "</p>"
  prescriptionHtml += "</div>"

  if (prescription.medicines && prescription.medicines.length > 0) {
    prescriptionHtml += '<div style="margin-bottom: 20px;">'
    prescriptionHtml += '<h4><i class="fas fa-pills"></i> Prescribed Medicines</h4>'
    prescription.medicines.forEach((medicine) => {
      prescriptionHtml += '<div class="medicine-item">'
      prescriptionHtml +=
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">'
      prescriptionHtml += "<strong>" + medicine.medicineName + "</strong>"
      prescriptionHtml += '<span style="color: #667eea;">' + medicine.dosage + "</span>"
      prescriptionHtml += "</div>"
      prescriptionHtml += '<div style="font-size: 14px; color: #666;">'
      prescriptionHtml += "<div>Frequency: " + medicine.frequency + "</div>"
      prescriptionHtml += "<div>Duration: " + medicine.durationDays + " days</div>"
      if (medicine.instructions) {
        prescriptionHtml += "<div>Instructions: " + medicine.instructions + "</div>"
      }
      prescriptionHtml += "</div></div>"
    })
    prescriptionHtml += "</div>"
  } else {
    prescriptionHtml += "<p>No medicines prescribed</p>"
  }

  prescriptionHtml += '<div style="margin-top: 20px;">'
  prescriptionHtml +=
    '<button class="btn btn-primary" onclick="downloadPrescription(' +
    prescription.appointmentId +
    ')"><i class="fas fa-download"></i> Download Prescription</button>'
  prescriptionHtml +=
    '<button class="btn btn-info" onclick="printPrescription(' +
    prescription.id +
    ')"><i class="fas fa-print"></i> Print Prescription</button>'
  prescriptionHtml += "</div></div>"

  document.getElementById("prescriptionDetails").innerHTML = prescriptionHtml
}

async function downloadPrescription(appointmentId) {
  try {
    const response = await fetch(API_BASE + "/prescriptions/" + appointmentId + "/generate-pdf")

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "prescription_" + appointmentId + ".pdf"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } else {
      throw new Error("Failed to download prescription")
    }
  } catch (error) {
    console.error("Error:", error)
    showError("Failed to download prescription")
  }
}

function printPrescription(prescriptionId) {
  // Create a new window for printing
  const printWindow = window.open("", "_blank")
  const prescriptionContent = document.getElementById("prescriptionDetails").innerHTML

  const printContent =
    "<html><head><title>Prescription</title><style>body { font-family: Arial, sans-serif; margin: 20px; } .prescription-section { max-width: 800px; margin: 0 auto; } .medicine-item { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px; } h4 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; } button { display: none; }</style></head><body>" +
    prescriptionContent +
    "</body></html>"

  printWindow.document.write(printContent)
  printWindow.document.close()
  printWindow.print()
}

function updatePagination(totalPages, currentPage) {
  const pagination = document.getElementById("pagination")

  if (totalPages <= 1) {
    pagination.innerHTML = ""
    return
  }

  let paginationHtml = ""

  // Previous button
  paginationHtml +=
    '<button onclick="loadAppointments(' +
    (currentPage - 1) +
    ')"' +
    (currentPage === 0 ? " disabled" : "") +
    '><i class="fas fa-chevron-left"></i> Previous</button>'

  // Page numbers
  for (let i = 0; i < totalPages; i++) {
    if (i === currentPage) {
      paginationHtml += '<button class="active">' + (i + 1) + "</button>"
    } else {
      paginationHtml += '<button onclick="loadAppointments(' + i + ')">' + (i + 1) + "</button>"
    }
  }

  // Next button
  paginationHtml +=
    '<button onclick="loadAppointments(' +
    (currentPage + 1) +
    ')"' +
    (currentPage === totalPages - 1 ? " disabled" : "") +
    '>Next <i class="fas fa-chevron-right"></i></button>'

  pagination.innerHTML = paginationHtml
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return "N/A"
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatTime(timeString) {
  if (!timeString) return "N/A"
  const time = new Date("2000-01-01T" + timeString)
  return time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function openModal(modalId) {
  document.getElementById(modalId).style.display = "block"
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none"
}

function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none"
  document.getElementById("appointmentsContainer").style.display = show ? "none" : "block"
}

function showSuccess(message) {
  alert("✅ " + message)
}

function showError(message) {
  alert("❌ " + message)
}

function showInfo(message) {
  alert("ℹ️ " + message)
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
