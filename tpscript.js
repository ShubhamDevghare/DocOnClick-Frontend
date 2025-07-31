// API Configuration
const API_BASE_URL = "http://localhost:8080/api/v1"

// Global State
let currentStep = 1
let selectedDoctor = null
let selectedDate = null
let selectedTimeSlot = null
let selectedPatient = null
let uploadedFiles = []
let appointmentData = {}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
})

function initializeApp() {
  loadDoctors()
  initializeCalendar()
  setupEventListeners()
  setupFileUpload()
}

function setupEventListeners() {
  // Search functionality
  const doctorSearch = document.getElementById("doctor-search")
  doctorSearch.addEventListener("input", debounce(handleDoctorSearch, 300))

  const patientSearch = document.getElementById("patient-search")
  patientSearch.addEventListener("input", debounce(handlePatientSearch, 300))

  // Patient form validation
  const patientForm = document.getElementById("patient-form")
  patientForm.addEventListener("input", validatePatientForm)

  // Calendar navigation
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("calendar-nav")) {
      handleCalendarNavigation(e)
    }
    if (e.target.classList.contains("calendar-day")) {
      handleDateSelection(e)
    }
    if (e.target.classList.contains("time-slot")) {
      handleTimeSlotSelection(e)
    }
    if (e.target.classList.contains("doctor-card")) {
      handleDoctorSelection(e)
    }
  })
}

// Step 1: Doctor Selection
async function loadDoctors(page = 0, filters = {}) {
  showLoading("doctors-grid")

  try {
    let url = `${API_BASE_URL}/doctors?page=${page}&size=9`

    // Add filters to URL
    if (filters.specialty) {
      url += `&speciality=${encodeURIComponent(filters.specialty)}`
    }
    if (filters.minRating) {
      url += `&minRating=${filters.minRating}`
    }
    if (filters.location) {
      url += `&location=${encodeURIComponent(filters.location)}`
    }
    if (filters.search) {
      url = `${API_BASE_URL}/doctors/search?speciality=${encodeURIComponent(filters.search)}&page=${page}&size=9`
    }

    const response = await fetch(url)
    const data = await response.json()

    displayDoctors(data.content || [])
    updateDoctorsPagination(data)

    // Load specialties for filter
    if (page === 0) {
      loadSpecialties()
    }
  } catch (error) {
    console.error("Error loading doctors:", error)
    showError("Failed to load doctors. Please try again.")
  }
}

function displayDoctors(doctors) {
  const grid = document.getElementById("doctors-grid")

  if (doctors.length === 0) {
    grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No doctors found</h3>
                <p>Try adjusting your search criteria</p>
            </div>
        `
    return
  }

  grid.innerHTML = doctors
    .map(
      (doctor) => `
        <div class="doctor-card" data-doctor-id="${doctor.doctorId}">
            <div class="doctor-header">
                <div class="doctor-avatar">
                    ${
                      doctor.profileImage
                        ? `<img src="${doctor.profileImage}" alt="${doctor.fullName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
                        : `<i class="fas fa-user-md"></i>`
                    }
                </div>
                <div class="doctor-info">
                    <h3>Dr. ${doctor.fullName}</h3>
                    <div class="doctor-specialty">${doctor.specialization}</div>
                    <div class="doctor-rating">
                        <div class="stars">
                            ${generateStars(4.5)} <!-- You can get actual rating from API -->
                        </div>
                        <span>4.5 (120 reviews)</span>
                    </div>
                </div>
            </div>
            <div class="doctor-details">
                <div class="detail-item">
                    <i class="fas fa-graduation-cap"></i>
                    <span>${doctor.experienceYears} years exp.</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${doctor.address ? doctor.address.split(",")[0] : "Location"}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${doctor.slotDurationMinutes} min slots</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-language"></i>
                    <span>English, Hindi</span>
                </div>
            </div>
            <div class="doctor-fee">
                Consultation Fee: ₹${doctor.fees}
            </div>
        </div>
    `,
    )
    .join("")
}

function generateStars(rating) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 !== 0
  let stars = ""

  for (let i = 0; i < fullStars; i++) {
    stars += '<i class="fas fa-star"></i>'
  }

  if (hasHalfStar) {
    stars += '<i class="fas fa-star-half-alt"></i>'
  }

  const emptyStars = 5 - Math.ceil(rating)
  for (let i = 0; i < emptyStars; i++) {
    stars += '<i class="far fa-star"></i>'
  }

  return stars
}

async function loadSpecialties() {
  try {
    const response = await fetch(`${API_BASE_URL}/doctors/specialities`)
    const specialties = await response.json()

    const select = document.getElementById("specialty-filter")
    select.innerHTML =
      '<option value="">All Specialties</option>' +
      specialties.map((specialty) => `<option value="${specialty}">${specialty}</option>`).join("")
  } catch (error) {
    console.error("Error loading specialties:", error)
  }
}

function handleDoctorSearch(e) {
  const query = e.target.value.trim()
  if (query.length >= 2) {
    loadDoctors(0, { search: query })
    showSearchSuggestions(query, "search-suggestions")
  } else if (query.length === 0) {
    loadDoctors()
    hideSearchSuggestions("search-suggestions")
  }
}

function handleDoctorSelection(e) {
  const card = e.currentTarget
  const doctorId = card.dataset.doctorId

  // Remove previous selection
  document.querySelectorAll(".doctor-card").forEach((c) => c.classList.remove("selected"))

  // Add selection to clicked card
  card.classList.add("selected")

  // Find doctor data
  selectedDoctor = {
    doctorId: doctorId,
    name: card.querySelector("h3").textContent,
    specialty: card.querySelector(".doctor-specialty").textContent,
    fee: card.querySelector(".doctor-fee").textContent.match(/₹(\d+)/)[1],
    experience: card.querySelector(".detail-item span").textContent,
    avatar: card.querySelector(".doctor-avatar").innerHTML,
  }

  // Enable next button
  enableNextButton("schedule-next")
}

function applyFilters() {
  const filters = {
    specialty: document.getElementById("specialty-filter").value,
    minRating: document.getElementById("rating-filter").value,
    location: document.getElementById("location-filter").value,
  }

  loadDoctors(0, filters)
}

function clearFilters() {
  document.getElementById("specialty-filter").value = ""
  document.getElementById("rating-filter").value = ""
  document.getElementById("location-filter").value = ""
  document.getElementById("doctor-search").value = ""
  loadDoctors()
}

// Step 2: Schedule Appointment
function initializeCalendar() {
  const today = new Date()
  displayCalendar(today.getFullYear(), today.getMonth())
}

function displayCalendar(year, month) {
  const calendar = document.getElementById("calendar")
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = new Date()

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

  let html = `
        <div class="calendar-header">
            <button class="calendar-nav" data-action="prev" data-year="${year}" data-month="${month}">
                <i class="fas fa-chevron-left"></i>
            </button>
            <h3>${monthNames[month]} ${year}</h3>
            <button class="calendar-nav" data-action="next" data-year="${year}" data-month="${month}">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="calendar-grid">
    `

  // Day headers
  dayNames.forEach((day) => {
    html += `<div class="calendar-day day-header">${day}</div>`
  })

  // Empty cells for days before month starts
  const startDay = firstDay.getDay()
  for (let i = 0; i < startDay; i++) {
    const prevDate = new Date(year, month, -startDay + i + 1)
    html += `<div class="calendar-day other-month">${prevDate.getDate()}</div>`
  }

  // Days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const isToday = date.toDateString() === today.toDateString()
    const isPast = date < today.setHours(0, 0, 0, 0)
    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()

    let classes = "calendar-day"
    if (isToday) classes += " today"
    if (isPast) classes += " disabled"
    if (isSelected) classes += " selected"

    html += `<div class="${classes}" data-date="${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}">${day}</div>`
  }

  // Empty cells for days after month ends
  const endDay = lastDay.getDay()
  for (let i = endDay + 1; i < 7; i++) {
    const nextDate = new Date(year, month + 1, i - endDay)
    html += `<div class="calendar-day other-month">${nextDate.getDate()}</div>`
  }

  html += "</div>"
  calendar.innerHTML = html
}

function handleCalendarNavigation(e) {
  const action = e.target.closest(".calendar-nav").dataset.action
  const year = Number.parseInt(e.target.closest(".calendar-nav").dataset.year)
  const month = Number.parseInt(e.target.closest(".calendar-nav").dataset.month)

  if (action === "prev") {
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    displayCalendar(prevYear, prevMonth)
  } else {
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    displayCalendar(nextYear, nextMonth)
  }
}

function handleDateSelection(e) {
  if (e.target.classList.contains("disabled") || e.target.classList.contains("other-month")) {
    return
  }

  // Remove previous selection
  document.querySelectorAll(".calendar-day").forEach((day) => day.classList.remove("selected"))

  // Add selection to clicked date
  e.target.classList.add("selected")

  selectedDate = new Date(e.target.dataset.date)

  // Update selected date display
  document.getElementById("selected-date").textContent = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Load time slots for selected date
  loadTimeSlots()
}

async function loadTimeSlots() {
  if (!selectedDoctor || !selectedDate) return

  const timeSlotsContainer = document.getElementById("time-slots")
  timeSlotsContainer.innerHTML =
    '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading time slots...</div>'

  try {
    const dateStr = selectedDate.toISOString().split("T")[0]
    const response = await fetch(`${API_BASE_URL}/appointment-slots/doctor/${selectedDoctor.doctorId}/date/${dateStr}`)
    const timeSlots = await response.json()

    if (timeSlots.length === 0) {
      timeSlotsContainer.innerHTML = '<p class="no-slots">No available time slots for this date</p>'
      return
    }

    timeSlotsContainer.innerHTML = timeSlots
      .map(
        (slot) => `
            <div class="time-slot ${slot.isBooked ? "booked" : ""}" 
                 data-slot-id="${slot.id}" 
                 data-start-time="${slot.startTime}" 
                 data-end-time="${slot.endTime}">
                ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}
            </div>
        `,
      )
      .join("")
  } catch (error) {
    console.error("Error loading time slots:", error)
    timeSlotsContainer.innerHTML = '<p class="no-slots">Error loading time slots</p>'
  }
}

function handleTimeSlotSelection(e) {
  if (e.target.classList.contains("booked")) return

  // Remove previous selection
  document.querySelectorAll(".time-slot").forEach((slot) => slot.classList.remove("selected"))

  // Add selection to clicked slot
  e.target.classList.add("selected")

  selectedTimeSlot = {
    id: e.target.dataset.slotId,
    startTime: e.target.dataset.startTime,
    endTime: e.target.dataset.endTime,
    display: e.target.textContent.trim(),
  }

  // Enable next button
  enableNextButton("schedule-next")
}

// Step 3: Patient Details
function switchPatientTab(tab) {
  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
  document.querySelector(`[onclick="switchPatientTab('${tab}')"]`).classList.add("active")

  // Update tab content
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"))
  document.getElementById(`${tab}-patient-tab`).classList.add("active")

  // Reset patient selection
  selectedPatient = null
  document.getElementById("selected-patient").style.display = "none"
  disableNextButton("patient-next")

  // Clear forms
  if (tab === "new") {
    document.getElementById("patient-form").reset()
  } else {
    document.getElementById("patient-search").value = ""
    hideSearchSuggestions("patient-suggestions")
  }
}

function handlePatientSearch(e) {
  const query = e.target.value.trim()
  if (query.length >= 2) {
    searchPatients(query)
  } else {
    hideSearchSuggestions("patient-suggestions")
    selectedPatient = null
    document.getElementById("selected-patient").style.display = "none"
    disableNextButton("patient-next")
  }
}

async function searchPatients(query) {
  try {
    // Search by name
    let response = await fetch(`${API_BASE_URL}/patients/search/by-name?name=${encodeURIComponent(query)}`)
    let patients = await response.json()

    // If no results by name, try phone search
    if (patients.length === 0 && /^\d+$/.test(query)) {
      response = await fetch(`${API_BASE_URL}/patients/search/by-partial-phone?phonePartial=${query}`)
      patients = await response.json()
    }

    showPatientSuggestions(patients)
  } catch (error) {
    console.error("Error searching patients:", error)
  }
}

function showPatientSuggestions(patients) {
  const suggestions = document.getElementById("patient-suggestions")

  if (patients.length === 0) {
    suggestions.style.display = "none"
    return
  }

  suggestions.innerHTML = patients
    .map(
      (patient) => `
        <div class="suggestion-item" onclick="selectPatient(${JSON.stringify(patient).replace(/"/g, "&quot;")})">
            <strong>${patient.fullName}</strong><br>
            <small>${patient.phone} • ${patient.emailAddress}</small>
        </div>
    `,
    )
    .join("")

  suggestions.style.display = "block"
}

function selectPatient(patient) {
  selectedPatient = patient

  // Hide suggestions
  hideSearchSuggestions("patient-suggestions")

  // Clear search box
  document.getElementById("patient-search").value = ""

  // Show selected patient
  const selectedPatientDiv = document.getElementById("selected-patient")
  selectedPatientDiv.innerHTML = `
        <h4>Selected Patient</h4>
        <div class="patient-info">
            <div class="patient-detail">
                <label>Name</label>
                <span>${patient.fullName}</span>
            </div>
            <div class="patient-detail">
                <label>Gender</label>
                <span>${patient.gender}</span>
            </div>
            <div class="patient-detail">
                <label>Date of Birth</label>
                <span>${formatDate(patient.dateOfBirth)}</span>
            </div>
            <div class="patient-detail">
                <label>Phone</label>
                <span>${patient.phone}</span>
            </div>
            <div class="patient-detail">
                <label>Email</label>
                <span>${patient.emailAddress}</span>
            </div>
            <div class="patient-detail">
                <label>Address</label>
                <span>${patient.address}</span>
            </div>
        </div>
        <button class="btn btn-secondary" onclick="clearPatientSelection()" style="margin-top: 1rem;">
            <i class="fas fa-times"></i> Change Patient
        </button>
    `
  selectedPatientDiv.style.display = "block"

  // Enable next button
  enableNextButton("patient-next")
}

function clearPatientSelection() {
  selectedPatient = null
  document.getElementById("selected-patient").style.display = "none"
  disableNextButton("patient-next")
}

function validatePatientForm() {
  const form = document.getElementById("patient-form")
  const formData = new FormData(form)

  let isValid = true
  const requiredFields = ["fullName", "gender", "dateOfBirth", "phone", "emailAddress", "address"]

  for (const field of requiredFields) {
    if (!formData.get(field)) {
      isValid = false
      break
    }
  }

  // Validate phone number
  const phone = formData.get("phone")
  if (phone && !/^\d{10}$/.test(phone)) {
    isValid = false
  }

  // Validate email
  const email = formData.get("emailAddress")
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    isValid = false
  }

  if (isValid) {
    // Create patient object from form
    selectedPatient = {
      fullName: formData.get("fullName"),
      gender: formData.get("gender"),
      dateOfBirth: formData.get("dateOfBirth"),
      phone: formData.get("phone"),
      emailAddress: formData.get("emailAddress"),
      address: formData.get("address"),
      role: "PATIENT",
    }
    enableNextButton("patient-next")
  } else {
    selectedPatient = null
    disableNextButton("patient-next")
  }
}

// Step 4: Upload Reports
function setupFileUpload() {
  const uploadArea = document.getElementById("upload-area")
  const fileInput = document.getElementById("file-input")

  // Drag and drop functionality
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault()
    uploadArea.classList.add("dragover")
  })

  uploadArea.addEventListener("dragleave", (e) => {
    e.preventDefault()
    uploadArea.classList.remove("dragover")
  })

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault()
    uploadArea.classList.remove("dragover")
    const files = Array.from(e.dataTransfer.files)
    handleFileSelection(files)
  })

  // File input change
  fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files)
    handleFileSelection(files)
  })
}

function handleFileSelection(files) {
  for (const file of files) {
    if (validateFile(file)) {
      uploadedFiles.push(file)
      displayUploadedFile(file)
    }
  }
}

function validateFile(file) {
  const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "text/plain"]
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (!allowedTypes.includes(file.type)) {
    showError(`File type not supported: ${file.name}`)
    return false
  }

  if (file.size > maxSize) {
    showError(`File too large: ${file.name} (Max 10MB)`)
    return false
  }

  return true
}

function displayUploadedFile(file) {
  const container = document.getElementById("uploaded-files")
  const fileId = Date.now() + Math.random()

  const fileItem = document.createElement("div")
  fileItem.className = "file-item"
  fileItem.dataset.fileId = fileId

  const fileIcon = getFileIcon(file.type)
  const fileSize = formatFileSize(file.size)

  fileItem.innerHTML = `
        <div class="file-info-left">
            <div class="file-icon">
                <i class="${fileIcon}"></i>
            </div>
            <div class="file-details">
                <h4>${file.name}</h4>
                <div class="file-size">${fileSize}</div>
            </div>
        </div>
        <button class="remove-file" onclick="removeFile('${fileId}')">
            <i class="fas fa-times"></i>
        </button>
    `

  container.appendChild(fileItem)
  file.id = fileId // Store ID for removal
}

function getFileIcon(fileType) {
  if (fileType === "application/pdf") return "fas fa-file-pdf"
  if (fileType.startsWith("image/")) return "fas fa-file-image"
  if (fileType === "text/plain") return "fas fa-file-alt"
  return "fas fa-file"
}

function removeFile(fileId) {
  // Remove from uploaded files array
  uploadedFiles = uploadedFiles.filter((file) => file.id !== fileId)

  // Remove from DOM
  const fileItem = document.querySelector(`[data-file-id="${fileId}"]`)
  if (fileItem) {
    fileItem.remove()
  }
}

// Step 5: Payment
async function processPayment() {
  if (!validateAppointmentData()) {
    showError("Please complete all required steps before payment")
    return
  }

  showLoadingOverlay("Creating payment order...")

  try {
    // First, create or register patient if new
    let patientId
    if (selectedPatient.patientId) {
      patientId = selectedPatient.patientId
    } else {
      const patientResponse = await fetch(`${API_BASE_URL}/patients/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedPatient),
      })

      if (!patientResponse.ok) {
        throw new Error("Failed to register patient")
      }

      const patientData = await patientResponse.json()
      patientId = patientData.patientId
    }

    // Create appointment
    const appointmentData = {
      userId: 1, // You might want to get this from user session
      doctorId: Number.parseInt(selectedDoctor.doctorId),
      patientId: patientId,
      timeSlotId: Number.parseInt(selectedTimeSlot.id),
      appointmentDate: selectedDate.toISOString().split("T")[0],
      appointmentTime: selectedTimeSlot.startTime,
      paymentStatus: "UNPAID",
    }

    const appointmentResponse = await fetch(`${API_BASE_URL}/appointments/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appointmentData),
    })

    if (!appointmentResponse.ok) {
      throw new Error("Failed to create appointment")
    }

    const appointment = await appointmentResponse.json()

    // Upload reports if any
    if (uploadedFiles.length > 0) {
      await uploadReports(appointment.appointmentId)
    }

    // Create Razorpay order
    const orderResponse = await fetch(`${API_BASE_URL}/payments/create-order/${appointment.appointmentId}`, {
      method: "POST",
    })

    if (!orderResponse.ok) {
      throw new Error("Failed to create payment order")
    }

    const order = await orderResponse.json()

    hideLoadingOverlay()

    // Initialize Razorpay payment
    const options = {
      key: "rzp_test_your_key_here", // Replace with your Razorpay key
      amount: order.amount * 100, // Amount in paise
      currency: order.currency,
      name: "DocOnClick",
      description: `Consultation with Dr. ${selectedDoctor.name}`,
      order_id: order.orderId,
      handler: (response) => {
        handlePaymentSuccess(response, appointment.appointmentId)
      },
      prefill: {
        name: selectedPatient.fullName,
        email: selectedPatient.emailAddress,
        contact: selectedPatient.phone,
      },
      theme: {
        color: "#2563eb",
      },
      modal: {
        ondismiss: () => {
          showError("Payment cancelled")
        },
      },
    }

    const rzp = new Razorpay(options)
    rzp.open()
  } catch (error) {
    hideLoadingOverlay()
    console.error("Payment error:", error)
    showError("Payment failed. Please try again.")
  }
}

async function handlePaymentSuccess(response, appointmentId) {
  showLoadingOverlay("Confirming payment...")

  try {
    const paymentData = {
      appointmentId: appointmentId,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpayOrderId: response.razorpay_order_id,
      razorpaySignature: response.razorpay_signature,
    }

    const paymentResponse = await fetch(`${API_BASE_URL}/payments/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    })

    if (!paymentResponse.ok) {
      throw new Error("Payment verification failed")
    }

    // Store appointment data for confirmation page
    appointmentData = {
      appointmentId: appointmentId,
      doctor: selectedDoctor,
      patient: selectedPatient,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      paymentId: response.razorpay_payment_id,
    }

    hideLoadingOverlay()
    nextStep() // Go to confirmation
  } catch (error) {
    hideLoadingOverlay()
    console.error("Payment verification error:", error)
    showError("Payment verification failed. Please contact support.")
  }
}

async function uploadReports(appointmentId) {
  const notes = document.getElementById("report-notes").value

  for (const file of uploadedFiles) {
    const formData = new FormData()
    formData.append("appointmentId", appointmentId)
    formData.append("file", file)
    if (notes) {
      formData.append("description", notes)
    }

    try {
      await fetch(`${API_BASE_URL}/patient-appointment-reports/upload`, {
        method: "POST",
        body: formData,
      })
    } catch (error) {
      console.error("Error uploading report:", error)
    }
  }
}

// Step 6: Confirmation
function displayConfirmation() {
  const detailsContainer = document.getElementById("final-appointment-details")

  detailsContainer.innerHTML = `
        <h3>Appointment Details</h3>
        <div class="summary-item">
            <span>Appointment ID:</span>
            <span>#${appointmentData.appointmentId}</span>
        </div>
        <div class="summary-item">
            <span>Doctor:</span>
            <span>Dr. ${appointmentData.doctor.name}</span>
        </div>
        <div class="summary-item">
            <span>Specialty:</span>
            <span>${appointmentData.doctor.specialty}</span>
        </div>
        <div class="summary-item">
            <span>Patient:</span>
            <span>${appointmentData.patient.fullName}</span>
        </div>
        <div class="summary-item">
            <span>Date:</span>
            <span>${formatDate(appointmentData.date)}</span>
        </div>
        <div class="summary-item">
            <span>Time:</span>
            <span>${appointmentData.timeSlot.display}</span>
        </div>
        <div class="summary-item">
            <span>Consultation Fee:</span>
            <span>₹${appointmentData.doctor.fee}</span>
        </div>
        <div class="summary-item">
            <span>Payment ID:</span>
            <span>${appointmentData.paymentId}</span>
        </div>
    `
}

// Navigation Functions
function nextStep() {
  if (currentStep < 6) {
    // Validate current step
    if (!validateCurrentStep()) {
      return
    }

    // Special handling for step transitions
    if (currentStep === 1) {
      displaySelectedDoctorInfo()
    } else if (currentStep === 4) {
      displayPaymentSummary()
    } else if (currentStep === 5) {
      displayConfirmation()
    }

    currentStep++
    updateStepDisplay()
  }
}

function previousStep() {
  if (currentStep > 1) {
    currentStep--
    updateStepDisplay()
  }
}

function updateStepDisplay() {
  // Update progress bar
  document.querySelectorAll(".step").forEach((step, index) => {
    const stepNumber = index + 1
    step.classList.remove("active", "completed")

    if (stepNumber < currentStep) {
      step.classList.add("completed")
    } else if (stepNumber === currentStep) {
      step.classList.add("active")
    }
  })

  // Update step content
  document.querySelectorAll(".step-content").forEach((content, index) => {
    content.classList.remove("active")
    if (index + 1 === currentStep) {
      content.classList.add("active")
    }
  })
}

function validateCurrentStep() {
  switch (currentStep) {
    case 1:
      return selectedDoctor !== null
    case 2:
      return selectedDate !== null && selectedTimeSlot !== null
    case 3:
      return selectedPatient !== null
    case 4:
      return true // Reports are optional
    case 5:
      return validateAppointmentData()
    default:
      return true
  }
}

function validateAppointmentData() {
  return selectedDoctor && selectedDate && selectedTimeSlot && selectedPatient
}

function displaySelectedDoctorInfo() {
  const container = document.getElementById("selected-doctor-info")
  container.innerHTML = `
        <div class="doctor-avatar">
            ${selectedDoctor.avatar}
        </div>
        <div>
            <h4>Dr. ${selectedDoctor.name}</h4>
            <p>${selectedDoctor.specialty}</p>
            <p><strong>Consultation Fee: ₹${selectedDoctor.fee}</strong></p>
        </div>
    `
}

function displayPaymentSummary() {
  const container = document.getElementById("appointment-summary")
  container.innerHTML = `
        <h3>Appointment Summary</h3>
        <div class="summary-item">
            <span>Doctor:</span>
            <span>Dr. ${selectedDoctor.name}</span>
        </div>
        <div class="summary-item">
            <span>Specialty:</span>
            <span>${selectedDoctor.specialty}</span>
        </div>
        <div class="summary-item">
            <span>Patient:</span>
            <span>${selectedPatient.fullName}</span>
        </div>
        <div class="summary-item">
            <span>Date:</span>
            <span>${formatDate(selectedDate)}</span>
        </div>
        <div class="summary-item">
            <span>Time:</span>
            <span>${selectedTimeSlot.display}</span>
        </div>
        <div class="summary-item">
            <span>Reports:</span>
            <span>${uploadedFiles.length} file(s) uploaded</span>
        </div>
        <div class="summary-item">
            <span><strong>Total Amount:</strong></span>
            <span><strong>₹${selectedDoctor.fee}</strong></span>
        </div>
    `
}

// Utility Functions
function enableNextButton(buttonId) {
  const button = document.getElementById(buttonId)
  if (button) {
    button.disabled = false
  }
}

function disableNextButton(buttonId) {
  const button = document.getElementById(buttonId)
  if (button) {
    button.disabled = true
  }
}

function showLoading(containerId) {
  const container = document.getElementById(containerId)
  container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading...</p>
        </div>
    `
}

function showLoadingOverlay(message = "Processing...") {
  const overlay = document.getElementById("loading-overlay")
  overlay.querySelector("p").textContent = message
  overlay.style.display = "flex"
}

function hideLoadingOverlay() {
  document.getElementById("loading-overlay").style.display = "none"
}

function showError(message) {
  // Create and show error notification
  const errorDiv = document.createElement("div")
  errorDiv.className = "error-notification"
  errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `

  // Add styles if not already present
  if (!document.querySelector(".error-notification-styles")) {
    const style = document.createElement("style")
    style.className = "error-notification-styles"
    style.textContent = `
            .error-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #fee2e2;
                color: #991b1b;
                padding: 1rem;
                border-radius: 8px;
                border: 1px solid #fecaca;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                z-index: 1001;
                max-width: 400px;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            }
            .error-notification button {
                background: none;
                border: none;
                color: #991b1b;
                cursor: pointer;
                margin-left: auto;
            }
        `
    document.head.appendChild(style)
  }

  document.body.appendChild(errorDiv)

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove()
    }
  }, 5000)
}

function showSearchSuggestions(query, containerId) {
  // This would typically make an API call for suggestions
  // For now, just show the container
  const container = document.getElementById(containerId)
  container.style.display = "block"
}

function hideSearchSuggestions(containerId) {
  const container = document.getElementById(containerId)
  container.style.display = "none"
}

function formatTime(timeString) {
  const time = new Date(`2000-01-01T${timeString}`)
  return time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

function updateDoctorsPagination(data) {
  const pagination = document.getElementById("doctors-pagination")
  const totalPages = data.totalPages || 0
  const currentPage = data.number || 0

  if (totalPages <= 1) {
    pagination.innerHTML = ""
    return
  }

  let html = ""

  // Previous button
  html += `
        <button onclick="loadDoctors(${currentPage - 1})" ${currentPage === 0 ? "disabled" : ""}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `

  // Page numbers
  for (let i = 0; i < totalPages; i++) {
    html += `
            <button onclick="loadDoctors(${i})" ${i === currentPage ? 'class="active"' : ""}>
                ${i + 1}
            </button>
        `
  }

  // Next button
  html += `
        <button onclick="loadDoctors(${currentPage + 1})" ${currentPage === totalPages - 1 ? "disabled" : ""}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `

  pagination.innerHTML = html
}

// Final actions
function goToDashboard() {
  // Redirect to user dashboard
  window.location.href = "/dashboard.html"
}

function bookAnother() {
  // Reset all data and start over
  currentStep = 1
  selectedDoctor = null
  selectedDate = null
  selectedTimeSlot = null
  selectedPatient = null
  uploadedFiles = []
  appointmentData = {}

  // Reset UI
  updateStepDisplay()
  loadDoctors()

  // Clear forms
  document.getElementById("patient-form").reset()
  document.getElementById("patient-search").value = ""
  document.getElementById("doctor-search").value = ""
  document.getElementById("uploaded-files").innerHTML = ""
  document.getElementById("report-notes").value = ""

  // Reset selections
  document.querySelectorAll(".doctor-card").forEach((card) => card.classList.remove("selected"))
  document.querySelectorAll(".calendar-day").forEach((day) => day.classList.remove("selected"))
  document.querySelectorAll(".time-slot").forEach((slot) => slot.classList.remove("selected"))

  // Switch to search patient tab
  switchPatientTab("search")
}

// Close suggestions when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-box")) {
    hideSearchSuggestions("search-suggestions")
    hideSearchSuggestions("patient-suggestions")
  }
})
