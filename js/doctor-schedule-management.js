// Constants and Global Variables
const BASE_URL = "http://localhost:8080/api/v1"
const DAYS_OF_WEEK = [
  { name: "Monday", value: "MONDAY" },
  { name: "Tuesday", value: "TUESDAY" },
  { name: "Wednesday", value: "WEDNESDAY" },
  { name: "Thursday", value: "THURSDAY" },
  { name: "Friday", value: "FRIDAY" },
  { name: "Saturday", value: "SATURDAY" },
  { name: "Sunday", value: "SUNDAY" },
]

let currentDoctorId = null
let currentDayOfWeek = null
let currentScheduleId = null
let currentDateOverrideId = null

// DOM Elements
const doctorProfile = {
  img: document.getElementById("doctorProfileImg"),
  name: document.getElementById("doctorName"),
  specialization: document.getElementById("doctorSpecialization"),
}

const weeklySchedule = {
  container: document.getElementById("weekly-schedule"),
  daysContainer: document.querySelector(".days-container"),
  timeSlotsContainer: document.getElementById("timeSlotsContainer"),
  selectedDayHeader: document.getElementById("selectedDayHeader"),
  dayAvailabilityToggle: document.getElementById("dayAvailabilityToggle"),
  timeSlotsList: document.getElementById("timeSlotsList"),
  startTime: document.getElementById("startTime"),
  endTime: document.getElementById("endTime"),
  addTimeSlotBtn: document.getElementById("addTimeSlotBtn"),
}

const dateOverrideElements = {
  container: document.getElementById("date-overrides"),
  dateInput: document.getElementById("overrideDate"),
  checkDateBtn: document.getElementById("checkDateBtn"),
  selectedDate: document.getElementById("selectedOverrideDate"),
  availabilityToggle: document.getElementById("overrideDayAvailabilityToggle"),
  timeSlotsList: document.getElementById("overrideTimeSlotsList"),
  startTime: document.getElementById("overrideStartTime"),
  endTime: document.getElementById("overrideEndTime"),
  addTimeSlotBtn: document.getElementById("addOverrideTimeSlotBtn"),
  saveBtn: document.getElementById("saveOverrideBtn"),
  deleteBtn: document.getElementById("deleteOverrideBtn"),
}

const holidayElements = {
  container: document.getElementById("holidays"),
  markTodayBtn: document.getElementById("markTodayHolidayBtn"),
  dateInput: document.getElementById("holidayDate"),
  reasonInput: document.getElementById("holidayReason"),
  markDateBtn: document.getElementById("markDateHolidayBtn"),
  list: document.getElementById("holidaysList"),
}

const settings = {
  container: document.getElementById("settings"),
  slotDuration: document.getElementById("slotDuration"),
  updateDurationBtn: document.getElementById("updateSlotDurationBtn"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  generateSlotsBtn: document.getElementById("generateSlotsBtn"),
}

const ui = {
  toast: document.getElementById("toast"),
  toastIcon: document.getElementById("toastIcon"),
  toastMessage: document.getElementById("toastMessage"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  logoutBtn: document.getElementById("logoutBtn"),
  sidebarNavItems: document.querySelectorAll(".sidebar-nav li"),
}

// Helper Functions
function showLoading() {
  ui.loadingOverlay.classList.add("show")
}

function hideLoading() {
  ui.loadingOverlay.classList.remove("show")
}

function showToast(message, success = true) {
  ui.toastIcon.className = success ? "fas fa-check-circle" : "fas fa-exclamation-circle"
  ui.toastMessage.textContent = message
  ui.toast.classList.toggle("error", !success)
  ui.toast.classList.add("show")

  setTimeout(() => {
    ui.toast.classList.remove("show")
  }, 3000)
}

function formatTime(timeString) {
  if (!timeString) return ""
  const [hours, minutes] = timeString.split(":")
  return `${hours}:${minutes}`
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function setDateInputMinimum() {
  const today = new Date().toISOString().split("T")[0]
  dateOverrideElements.dateInput.min = today
  holidayElements.dateInput.min = today
  settings.startDate.min = today
  settings.endDate.min = today
}

// API Calls
async function fetchWithAuth(url, options = {}) {
  try {
    showLoading()

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `API request failed with status ${response.status}`)
    }

    if (response.status === 204) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("API Error:", error)
    showToast(error.message || "An error occurred during the request", false)
    throw error
  } finally {
    hideLoading()
  }
}

// Doctor API Calls
async function fetchDoctorDetails(doctorId) {
  return fetchWithAuth(`${BASE_URL}/doctors/${doctorId}`)
}

async function updateSlotDuration(doctorId, durationMinutes) {
  return fetchWithAuth(`${BASE_URL}/doctors/${doctorId}/slot-duration?durationMinutes=${durationMinutes}`, {
    method: "PATCH",
  })
}

// Weekly Schedule API Calls
async function fetchWeeklySchedules(doctorId) {
  return fetchWithAuth(`${BASE_URL}/weekly-schedules/doctor/${doctorId}`)
}

async function fetchWeeklyScheduleByDay(doctorId, dayOfWeek) {
  try {
    return await fetchWithAuth(`${BASE_URL}/weekly-schedules/doctor/${doctorId}/day/${dayOfWeek}`)
  } catch (error) {
    return {
      doctorId,
      dayOfWeek,
      isAvailable: false,
      timeSlots: [],
    }
  }
}

async function createOrUpdateWeeklySchedule(doctorId, scheduleData) {
  return fetchWithAuth(`${BASE_URL}/weekly-schedules/doctor/${doctorId}`, {
    method: "POST",
    body: JSON.stringify(scheduleData),
  })
}

// Date Override API Calls
async function fetchDateOverride(doctorId, date) {
  try {
    return await fetchWithAuth(`${BASE_URL}/date-overrides/doctor/${doctorId}/date/${date}`)
  } catch (error) {
    if (error.message.includes("404")) {
      return null
    }
    throw error
  }
}

async function createOrUpdateDateOverride(doctorId, overrideData) {
  return fetchWithAuth(`${BASE_URL}/date-overrides/doctor/${doctorId}`, {
    method: "POST",
    body: JSON.stringify(overrideData),
  })
}

async function deleteDateOverride(overrideId) {
  return fetchWithAuth(`${BASE_URL}/date-overrides/${overrideId}`, {
    method: "DELETE",
  })
}

// Holiday API Calls
async function fetchDoctorHolidays(doctorId) {
  return fetchWithAuth(`${BASE_URL}/doctor-holidays/doctor/${doctorId}`)
}

async function markTodayAsHoliday(doctorId) {
  return fetchWithAuth(`${BASE_URL}/doctor-holidays/${doctorId}/today`, {
    method: "POST",
  })
}

async function addHoliday(doctorId, holidayData) {
  return fetchWithAuth(`${BASE_URL}/doctor-holidays/${doctorId}`, {
    method: "POST",
    body: JSON.stringify(holidayData),
  })
}

async function removeHoliday(holidayId) {
  return fetchWithAuth(`${BASE_URL}/doctor-holidays/${holidayId}`, {
    method: "DELETE",
  })
}

// Appointment Slot API Calls
async function generateAppointmentSlots(doctorId, startDate, endDate) {
  return fetchWithAuth(
    `${BASE_URL}/appointment-slots/generate/doctor/${doctorId}/range?startDate=${startDate}&endDate=${endDate}`,
    {
      method: "POST",
    },
  )
}

// UI Handlers
function populateDoctorProfile(doctor) {
  doctorProfile.img.src = doctor.profileImage || "https://via.placeholder.com/100x100"
  doctorProfile.name.textContent = doctor.fullName
  doctorProfile.specialization.textContent = doctor.specialization
}

function switchSection(sectionId) {
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active")
  })

  document.getElementById(sectionId).classList.add("active")

  ui.sidebarNavItems.forEach((item) => {
    if (item.dataset.target === sectionId) {
      item.classList.add("active")
    } else {
      item.classList.remove("active")
    }
  })
}

// Weekly Schedule Section
function renderWeeklyScheduleDays(schedules) {
  const daysContainer = weeklySchedule.daysContainer
  daysContainer.innerHTML = ""

  DAYS_OF_WEEK.forEach((day) => {
    const schedule = schedules.find((s) => s.dayOfWeek === day.value) || {
      isAvailable: false,
      timeSlots: [],
    }

    const slotCount = schedule.timeSlots ? schedule.timeSlots.length : 0
    const isAvailable = schedule.available === true || schedule.isAvailable === true

    const dayElement = document.createElement("div")
    dayElement.className = "day-item"
    dayElement.dataset.day = day.value
    dayElement.innerHTML = `
            <h3>${day.name}</h3>
            <p>
                <span class="status ${isAvailable ? "available" : "unavailable"}"></span>
                ${isAvailable ? "Available" : "Unavailable"}
            </p>
            <p>${isAvailable ? `${slotCount} time slot(s)` : "No slots"}</p>
        `

    dayElement.addEventListener("click", () => handleDaySelection(day.value))
    daysContainer.appendChild(dayElement)
  })
}

async function handleDaySelection(dayOfWeek) {
  document.querySelectorAll(".day-item").forEach((item) => {
    if (item.dataset.day === dayOfWeek) {
      item.classList.add("active")
    } else {
      item.classList.remove("active")
    }
  })

  currentDayOfWeek = dayOfWeek
  weeklySchedule.selectedDayHeader.textContent = `${DAYS_OF_WEEK.find((d) => d.value === dayOfWeek).name} Schedule`

  const schedule = await fetchWeeklyScheduleByDay(currentDoctorId, dayOfWeek)
  currentScheduleId = schedule.id

  weeklySchedule.dayAvailabilityToggle.checked = schedule.available === true || schedule.isAvailable === true

  renderTimeSlots(schedule.timeSlots || [])
}

function renderTimeSlots(timeSlots) {
  const timeSlotsList = weeklySchedule.timeSlotsList
  timeSlotsList.innerHTML = ""

  if (timeSlots.length === 0) {
    timeSlotsList.innerHTML = "<p>No time slots added yet.</p>"
    return
  }

  timeSlots.forEach((slot) => {
    const timeSlotElement = document.createElement("div")
    timeSlotElement.className = "time-slot-item"
    timeSlotElement.innerHTML = `
            <div class="time-slot-time">
                ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}
            </div>
            <div class="time-slot-actions">
                <button class="btn btn-danger delete-time-slot" data-id="${slot.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `

    timeSlotsList.appendChild(timeSlotElement)
  })

  document.querySelectorAll(".delete-time-slot").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation()
      handleDeleteTimeSlot(button.dataset.id)
    })
  })
}

async function handleDeleteTimeSlot(timeSlotId) {
  const schedule = await fetchWeeklyScheduleByDay(currentDoctorId, currentDayOfWeek)

  const updatedTimeSlots = schedule.timeSlots.filter((slot) => slot.id !== Number.parseInt(timeSlotId))

  const updatedSchedule = {
    ...schedule,
    timeSlots: updatedTimeSlots,
  }

  try {
    await createOrUpdateWeeklySchedule(currentDoctorId, updatedSchedule)
    showToast("Time slot deleted successfully")
    renderTimeSlots(updatedTimeSlots)
  } catch (error) {
    showToast("Failed to delete time slot", false)
  }
}

async function handleAddTimeSlot() {
  const startTime = weeklySchedule.startTime.value
  const endTime = weeklySchedule.endTime.value

  if (!startTime || !endTime) {
    showToast("Please select both start and end times", false)
    return
  }

  if (startTime >= endTime) {
    showToast("End time must be after start time", false)
    return
  }

  const schedule = await fetchWeeklyScheduleByDay(currentDoctorId, currentDayOfWeek)

  const newTimeSlot = {
    startTime,
    endTime,
  }

  const updatedSchedule = {
    ...schedule,
    timeSlots: [...schedule.timeSlots, newTimeSlot],
  }

  try {
    const result = await createOrUpdateWeeklySchedule(currentDoctorId, updatedSchedule)
    showToast("Time slot added successfully")
    renderTimeSlots(result.timeSlots)

    weeklySchedule.startTime.value = ""
    weeklySchedule.endTime.value = ""
  } catch (error) {
    showToast("Failed to add time slot", false)
  }
}

async function handleToggleDayAvailability() {
  const isAvailable = weeklySchedule.dayAvailabilityToggle.checked

  try {
    const scheduleData = {
      doctorId: currentDoctorId,
      dayOfWeek: currentDayOfWeek,
      available: isAvailable,
      timeSlots: [],
    }

    const updatedSchedule = await createOrUpdateWeeklySchedule(currentDoctorId, scheduleData)
    showToast(`Day ${isAvailable ? "enabled" : "disabled"} successfully`)

    const schedules = await fetchWeeklySchedules(currentDoctorId)
    renderWeeklyScheduleDays(schedules)

    renderTimeSlots(updatedSchedule.timeSlots || [])
  } catch (error) {
    console.error("Error toggling day availability:", error)
    showToast("Failed to update day availability", false)
    weeklySchedule.dayAvailabilityToggle.checked = !isAvailable
  }
}

// Date Override Section
async function handleCheckDateOverride() {
  const date = dateOverrideElements.dateInput.value

  if (!date) {
    showToast("Please select a date", false)
    return
  }

  try {
    const override = await fetchDateOverride(currentDoctorId, date)

    dateOverrideElements.selectedDate.textContent = formatDate(date)

    if (override) {
      currentDateOverrideId = override.id
      dateOverrideElements.availabilityToggle.checked = override.available === true || override.isAvailable === true
      renderOverrideTimeSlots(override.timeSlots || [])
    } else {
      const dayOfWeek = DAYS_OF_WEEK[new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1].value
      const regularSchedule = await fetchWeeklyScheduleByDay(currentDoctorId, dayOfWeek)

      currentDateOverrideId = null
      dateOverrideElements.availabilityToggle.checked =
        regularSchedule.available === true || regularSchedule.isAvailable === true
      renderOverrideTimeSlots(regularSchedule.timeSlots || [])
      showToast("No special schedule exists for this date. Showing regular schedule.")
    }
  } catch (error) {
    console.error("Error checking date override:", error)
    showToast("Failed to check date override", false)
  }
}

function renderOverrideTimeSlots(timeSlots) {
  const timeSlotsList = dateOverrideElements.timeSlotsList
  timeSlotsList.innerHTML = ""

  if (timeSlots.length === 0) {
    timeSlotsList.innerHTML = "<p>No time slots added yet.</p>"
    return
  }

  timeSlots.forEach((slot) => {
    const timeSlotElement = document.createElement("div")
    timeSlotElement.className = "time-slot-item"
    timeSlotElement.innerHTML = `
            <div class="time-slot-time">
                ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}
            </div>
            <div class="time-slot-actions">
                <button class="btn btn-danger delete-override-time-slot" data-id="${slot.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `

    timeSlotsList.appendChild(timeSlotElement)
  })

  document.querySelectorAll(".delete-override-time-slot").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation()
      const slotId = Number.parseInt(button.dataset.id)
      button.closest(".time-slot-item").remove()

      if (timeSlotsList.querySelectorAll(".time-slot-item").length === 0) {
        timeSlotsList.innerHTML = "<p>No time slots added yet.</p>"
      }
    })
  })
}

async function handleAddOverrideTimeSlot() {
  const startTime = dateOverrideElements.startTime.value
  const endTime = dateOverrideElements.endTime.value

  if (!startTime || !endTime) {
    showToast("Please select both start and end times", false)
    return
  }

  if (startTime >= endTime) {
    showToast("End time must be after start time", false)
    return
  }

  const timeSlotsList = dateOverrideElements.timeSlotsList

  if (timeSlotsList.querySelector("p")) {
    timeSlotsList.innerHTML = ""
  }

  const timeSlotElement = document.createElement("div")
  timeSlotElement.className = "time-slot-item"
  timeSlotElement.innerHTML = `
        <div class="time-slot-time">
            ${formatTime(startTime)} - ${formatTime(endTime)}
        </div>
        <div class="time-slot-actions">
            <button class="btn btn-danger delete-override-time-slot">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `

  timeSlotsList.appendChild(timeSlotElement)

  timeSlotElement.querySelector(".delete-override-time-slot").addEventListener("click", (e) => {
    e.stopPropagation()
    timeSlotElement.remove()

    if (timeSlotsList.querySelectorAll(".time-slot-item").length === 0) {
      timeSlotsList.innerHTML = "<p>No time slots added yet.</p>"
    }
  })

  dateOverrideElements.startTime.value = ""
  dateOverrideElements.endTime.value = ""
}

async function handleSaveOverride() {
  const date = dateOverrideElements.dateInput.value

  if (!date) {
    showToast("Please select a date", false)
    return
  }

  const timeSlotElements = dateOverrideElements.timeSlotsList.querySelectorAll(".time-slot-item")
  const timeSlots = []

  timeSlotElements.forEach((element) => {
    const timeText = element.querySelector(".time-slot-time").textContent.trim()
    const [startTime, endTime] = timeText.split(" - ")

    timeSlots.push({
      startTime,
      endTime,
    })
  })

  const overrideData = {
    id: currentDateOverrideId,
    doctorId: currentDoctorId,
    overrideDate: date,
    available: dateOverrideElements.availabilityToggle.checked,
    timeSlots,
  }

  try {
    const result = await createOrUpdateDateOverride(currentDoctorId, overrideData)
    currentDateOverrideId = result.id
    showToast("Special schedule saved successfully")
  } catch (error) {
    console.error("Error saving date override:", error)
    showToast("Failed to save special schedule", false)
  }
}

async function handleDeleteOverride() {
  if (!currentDateOverrideId) {
    showToast("No special schedule exists for this date", false)
    return
  }

  try {
    await deleteDateOverride(currentDateOverrideId)
    showToast("Special schedule deleted successfully")

    currentDateOverrideId = null
    dateOverrideElements.selectedDate.textContent = "Select a date"
    dateOverrideElements.availabilityToggle.checked = false
    dateOverrideElements.timeSlotsList.innerHTML = "<p>No time slots added yet.</p>"
  } catch (error) {
    showToast("Failed to delete special schedule", false)
  }
}

// Holiday Section
async function renderHolidays(holidaysList) {
  const holidaysContainer = holidayElements.list
  holidaysContainer.innerHTML = ""

  if (!holidaysList || holidaysList.length === 0) {
    holidaysContainer.innerHTML = "<p>No holidays scheduled.</p>"
    return
  }

  holidaysList.forEach((holiday) => {
    const holidayElement = document.createElement("div")
    holidayElement.className = "holiday-item"
    holidayElement.innerHTML = `
            <div class="holiday-details">
                <h4>${formatDate(holiday.holidayDate)}</h4>
                <p>${holiday.reason || "No reason specified"}</p>
            </div>
            <div class="holiday-actions">
                <button class="btn btn-danger delete-holiday" data-id="${holiday.id}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `

    holidaysContainer.appendChild(holidayElement)
  })

  document.querySelectorAll(".delete-holiday").forEach((button) => {
    button.addEventListener("click", () => handleRemoveHoliday(button.dataset.id))
  })
}

async function handleMarkTodayAsHoliday() {
  try {
    await markTodayAsHoliday(currentDoctorId)
    showToast("Today marked as holiday successfully")

    const holidays = await fetchDoctorHolidays(currentDoctorId)
    renderHolidays(holidays)
  } catch (error) {
    showToast("Failed to mark today as holiday", false)
  }
}

async function handleMarkDateAsHoliday() {
  const date = holidayElements.dateInput.value
  const reason = holidayElements.reasonInput.value

  if (!date) {
    showToast("Please select a date", false)
    return
  }

  const holidayData = {
    doctorId: currentDoctorId,
    holidayDate: date,
    reason,
  }

  try {
    await addHoliday(currentDoctorId, holidayData)
    showToast("Holiday added successfully")

    holidayElements.dateInput.value = ""
    holidayElements.reasonInput.value = ""

    const holidaysList = await fetchDoctorHolidays(currentDoctorId)
    renderHolidays(holidaysList)
  } catch (error) {
    console.error("Error adding holiday:", error)
    showToast("Failed to add holiday", false)
  }
}

async function handleRemoveHoliday(holidayId) {
  try {
    await removeHoliday(holidayId)
    showToast("Holiday removed successfully")

    const holidays = await fetchDoctorHolidays(currentDoctorId)
    renderHolidays(holidays)
  } catch (error) {
    showToast("Failed to remove holiday", false)
  }
}

// Settings Section
async function handleUpdateSlotDuration() {
  const duration = settings.slotDuration.value

  if (!duration || duration < 10) {
    showToast("Please enter a valid duration (minimum 10 minutes)", false)
    return
  }

  try {
    await updateSlotDuration(currentDoctorId, Number.parseInt(duration))
    showToast("Slot duration updated successfully")
  } catch (error) {
    showToast("Failed to update slot duration", false)
  }
}

async function handleGenerateSlots() {
  const startDate = settings.startDate.value
  const endDate = settings.endDate.value

  if (!startDate || !endDate) {
    showToast("Please select both start and end dates", false)
    return
  }

  if (new Date(startDate) > new Date(endDate)) {
    showToast("End date must be after start date", false)
    return
  }

  try {
    await generateAppointmentSlots(currentDoctorId, startDate, endDate)
    showToast("Appointment slots generated successfully")

    settings.startDate.value = ""
    settings.endDate.value = ""
  } catch (error) {
    showToast("Failed to generate appointment slots", false)
  }
}

// Event Listeners
function setupEventListeners() {
  ui.sidebarNavItems.forEach((item) => {
    item.addEventListener("click", () => switchSection(item.dataset.target))
  })

  ui.logoutBtn.addEventListener("click", () => {
    localStorage.clear()
    window.location.href = "login.html"
  })

  weeklySchedule.dayAvailabilityToggle.addEventListener("change", handleToggleDayAvailability)
  weeklySchedule.addTimeSlotBtn.addEventListener("click", handleAddTimeSlot)

  dateOverrideElements.checkDateBtn.addEventListener("click", handleCheckDateOverride)
  dateOverrideElements.addTimeSlotBtn.addEventListener("click", handleAddOverrideTimeSlot)
  dateOverrideElements.saveBtn.addEventListener("click", handleSaveOverride)
  dateOverrideElements.deleteBtn.addEventListener("click", handleDeleteOverride)

  holidayElements.markTodayBtn.addEventListener("click", handleMarkTodayAsHoliday)
  holidayElements.markDateBtn.addEventListener("click", handleMarkDateAsHoliday)

  settings.updateDurationBtn.addEventListener("click", handleUpdateSlotDuration)
  settings.generateSlotsBtn.addEventListener("click", handleGenerateSlots)
}

// Initialize Application
async function initialize() {
  try {
    setDateInputMinimum()
    setupEventListeners()

    // Get doctor data from localStorage
    const doctorData = JSON.parse(localStorage.getItem("doctorData"))

    if (!doctorData || !doctorData.doctorId) {
      // Use demo data if not found in localStorage
      currentDoctorId = localStorage.getItem("doctorId") || 1

      // Create demo doctor data for testing
      const demoDoctor = {
        doctorId: currentDoctorId,
        fullName: localStorage.getItem("userName") || "Dr. John Doe",
        specialization: localStorage.getItem("userSpecialization") || "General Medicine",
        profileImage: localStorage.getItem("userProfileImage") || "https://via.placeholder.com/100x100",
        slotDurationMinutes: 30,
      }

      populateDoctorProfile(demoDoctor)
      settings.slotDuration.value = demoDoctor.slotDurationMinutes
    } else {
      currentDoctorId = doctorData.doctorId
      const doctor = await fetchDoctorDetails(currentDoctorId)
      populateDoctorProfile(doctor)
      settings.slotDuration.value = doctor.slotDurationMinutes || 30
    }

    // Initialize sections
    const schedules = await fetchWeeklySchedules(currentDoctorId)
    renderWeeklyScheduleDays(schedules)

    await handleDaySelection("MONDAY")

    const today = new Date().toISOString().split("T")[0]
    dateOverrideElements.dateInput.value = today
    settings.startDate.value = today
    settings.endDate.value = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split("T")[0]

    const doctorHolidays = await fetchDoctorHolidays(currentDoctorId)
    renderHolidays(doctorHolidays)

    hideLoading()
  } catch (error) {
    console.error("Initialization error:", error)
    showToast("Failed to initialize the application", false)
    hideLoading()
  }
}

// Start the application
document.addEventListener("DOMContentLoaded", initialize)
