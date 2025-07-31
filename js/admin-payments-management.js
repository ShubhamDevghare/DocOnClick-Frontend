// API Configuration
const API_BASE_URL = "http://localhost:8080/api/v1"
const RAZORPAY_KEY = "rzp_test_THhTRc6X4f92p4"

// Global variables
let currentPage = 0
let totalPages = 0
let allPayments = []
let filteredPayments = []
let currentPaymentForProcessing = null

// Razorpay library declaration
const Razorpay = window.Razorpay

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  loadPayments()
})

// Load all payments
async function loadPayments(page = 0, size = 10) {
  try {
    showLoading()
    const response = await fetch(`${API_BASE_URL}/payments/all?page=${page}&size=${size}`)

    if (!response.ok) {
      throw new Error("Failed to fetch payments")
    }

    const data = await response.json()
    allPayments = data.content
    filteredPayments = [...allPayments]
    currentPage = data.number
    totalPages = data.totalPages

    displayPayments(filteredPayments)
    updatePagination()
    hideLoading()
  } catch (error) {
    console.error("Error loading payments:", error)
    showError("Failed to load payments")
    hideLoading()
  }
}

// Display payments in table
function displayPayments(payments) {
  const tbody = document.getElementById("paymentsTableBody")

  if (payments.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">No payments found</td>
            </tr>
        `
    return
  }

  tbody.innerHTML = payments
    .map(
      (payment) => `
        <tr>
            <td>${payment.id}</td>
            <td>${payment.receiptNumber || "N/A"}</td>
            <td>${payment.patientName || "N/A"}</td>
            <td>${payment.doctorName || "N/A"}</td>
            <td>₹${payment.amount}</td>
            <td>
                <span class="status-badge status-${payment.status.toLowerCase()}">
                    ${payment.status}
                </span>
            </td>
            <td>${formatDate(payment.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    ${
                      payment.status === "UNPAID"
                        ? `
                        <button class="btn btn-sm btn-success" onclick="processPayment(${payment.appointmentId})" title="Process Payment">
                            <i class="fas fa-credit-card"></i> Pay
                        </button>
                    `
                        : `<span class="text-muted">No actions available</span>`
                    }
                </div>
            </td>
        </tr>
    `,
    )
    .join("")
}

// Search payments by receipt number
async function searchPaymentsByReceipt(receiptNumber) {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/search/receipt?receiptNumber=${receiptNumber}`)
    if (!response.ok) throw new Error("Failed to search payments")
    return await response.json()
  } catch (error) {
    console.error("Error searching payments:", error)
    return []
  }
}

// Search payments by appointment ID
async function searchPaymentsByAppointment(appointmentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/search/appointment/${appointmentId}`)
    if (!response.ok) throw new Error("Failed to search payments")
    return [await response.json()] // Return as array for consistency
  } catch (error) {
    console.error("Error searching payments:", error)
    return []
  }
}

// Search payments
async function searchPayments() {
  const receiptSearch = document.getElementById("searchByReceipt").value.trim()
  const appointmentSearch = document.getElementById("searchByAppointment").value.trim()

  if (!receiptSearch && !appointmentSearch) {
    filteredPayments = [...allPayments]
    displayPayments(filteredPayments)
    return
  }

  try {
    showLoading()
    let searchResults = []

    if (receiptSearch) {
      const receiptResults = await searchPaymentsByReceipt(receiptSearch)
      searchResults = [...searchResults, ...receiptResults]
    }

    if (appointmentSearch) {
      const appointmentResults = await searchPaymentsByAppointment(appointmentSearch)
      searchResults = [...searchResults, ...appointmentResults]
    }

    // Remove duplicates based on payment ID
    const uniqueResults = searchResults.filter(
      (payment, index, self) => index === self.findIndex((p) => p.id === payment.id),
    )

    filteredPayments = uniqueResults
    displayPayments(filteredPayments)
    hideLoading()
  } catch (error) {
    console.error("Error searching payments:", error)
    showError("Failed to search payments")
    hideLoading()
  }
}

// Filter payments
async function filterPayments() {
  const statusFilter = document.getElementById("filterByStatus").value
  const startDate = document.getElementById("startDate").value
  const endDate = document.getElementById("endDate").value

  try {
    showLoading()
    let url = `${API_BASE_URL}/payments/all?page=0&size=1000` // Get all for filtering

    // Build filter URL based on selected filters
    if (statusFilter && startDate && endDate) {
      url = `${API_BASE_URL}/payments/filter/status-date?status=${statusFilter}&startDate=${startDate}&endDate=${endDate}&page=0&size=1000`
    } else if (statusFilter) {
      url = `${API_BASE_URL}/payments/filter/status/${statusFilter}?page=0&size=1000`
    } else if (startDate && endDate) {
      url = `${API_BASE_URL}/payments/filter/date-range?startDate=${startDate}&endDate=${endDate}&page=0&size=1000`
    }

    const response = await fetch(url)
    if (!response.ok) throw new Error("Failed to filter payments")

    const data = await response.json()
    filteredPayments = data.content || data
    displayPayments(filteredPayments)
    hideLoading()
  } catch (error) {
    console.error("Error filtering payments:", error)
    showError("Failed to filter payments")
    hideLoading()
  }
}

// Process payment
async function processPayment(appointmentId) {
  try {
    showLoading()

    // Create Razorpay order
    const orderResponse = await fetch(`${API_BASE_URL}/payments/create-order/${appointmentId}`, {
      method: "POST",
    })

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text()
      throw new Error(`Failed to create payment order: ${errorText}`)
    }

    const orderData = await orderResponse.json()
    currentPaymentForProcessing = { appointmentId, orderData }

    // Display payment details
    displayPaymentProcessModal(orderData)
    hideLoading()
  } catch (error) {
    console.error("Error creating payment order:", error)
    showError("Failed to create payment order: " + error.message)
    hideLoading()
  }
}

// Display payment process modal
function displayPaymentProcessModal(orderData) {
  const paymentDetails = document.getElementById("paymentDetails")
  paymentDetails.innerHTML = `
        <div class="payment-info">
            <h3>Payment Details</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Order ID:</label>
                    <span>${orderData.orderId}</span>
                </div>
                <div class="detail-item">
                    <label>Amount:</label>
                    <span>₹${orderData.amount}</span>
                </div>
                <div class="detail-item">
                    <label>Currency:</label>
                    <span>${orderData.currency}</span>
                </div>
                <div class="detail-item">
                    <label>Receipt:</label>
                    <span>${orderData.receipt}</span>
                </div>
            </div>
        </div>
    `

  document.getElementById("paymentProcessModal").style.display = "block"
}

// Initiate Razorpay payment
function initiatePayment() {
  if (!currentPaymentForProcessing) {
    showError("No payment data available")
    return
  }

  const { orderData } = currentPaymentForProcessing

  const options = {
    key: RAZORPAY_KEY,
    amount: orderData.amount * 100, // Amount in paise
    currency: orderData.currency,
    name: "DocOnClick",
    description: "Medical Consultation Payment",
    order_id: orderData.orderId,
    handler: (response) => {
      handlePaymentSuccess(response)
    },
    prefill: {
      name: "Patient",
      email: "patient@example.com",
      contact: "9999999999",
    },
    theme: {
      color: "#3399cc",
    },
    modal: {
      ondismiss: () => {
        console.log("Payment modal closed")
      },
    },
  }

  const rzp = new Razorpay(options)
  rzp.open()
}

// Handle payment success
async function handlePaymentSuccess(response) {
  try {
    showLoading()

    const paymentData = {
      appointmentId: currentPaymentForProcessing.appointmentId,
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature,
    }

    const processResponse = await fetch(`${API_BASE_URL}/payments/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    })

    if (!processResponse.ok) {
      const errorText = await processResponse.text()
      throw new Error(`Failed to process payment: ${errorText}`)
    }

    showSuccess("Payment processed successfully!")
    closePaymentProcessModal()
    loadPayments() // Refresh the payments list
    hideLoading()
  } catch (error) {
    console.error("Error processing payment:", error)
    showError("Failed to process payment: " + error.message)
    hideLoading()
  }
}

// Refresh payments
function refreshPayments() {
  // Clear search and filter inputs
  document.getElementById("searchByReceipt").value = ""
  document.getElementById("searchByAppointment").value = ""
  document.getElementById("filterByStatus").value = ""
  document.getElementById("startDate").value = ""
  document.getElementById("endDate").value = ""

  loadPayments()
}

// Modal functions
function closePaymentProcessModal() {
  document.getElementById("paymentProcessModal").style.display = "none"
  currentPaymentForProcessing = null
}

// Pagination
function updatePagination() {
  const pagination = document.getElementById("pagination")

  if (totalPages <= 1) {
    pagination.innerHTML = ""
    return
  }

  let paginationHTML = ""

  // Previous button
  if (currentPage > 0) {
    paginationHTML += `<button class="btn btn-sm btn-secondary" onclick="loadPayments(${currentPage - 1})">Previous</button>`
  }

  // Page numbers
  for (let i = 0; i < totalPages; i++) {
    if (i === currentPage) {
      paginationHTML += `<button class="btn btn-sm btn-primary">${i + 1}</button>`
    } else {
      paginationHTML += `<button class="btn btn-sm btn-secondary" onclick="loadPayments(${i})">${i + 1}</button>`
    }
  }

  // Next button
  if (currentPage < totalPages - 1) {
    paginationHTML += `<button class="btn btn-sm btn-secondary" onclick="loadPayments(${currentPage + 1})">Next</button>`
  }

  pagination.innerHTML = paginationHTML
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return "N/A"
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "N/A"

    return (
      date.toLocaleDateString("en-IN") +
      " " +
      date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    )
  } catch (error) {
    console.error("Error formatting date:", error)
    return "N/A"
  }
}

function showLoading() {
  // Create loading overlay if it doesn't exist
  let loadingOverlay = document.getElementById("loadingOverlay")
  if (!loadingOverlay) {
    loadingOverlay = document.createElement("div")
    loadingOverlay.id = "loadingOverlay"
    loadingOverlay.className = "loading-overlay"
    loadingOverlay.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading...</p>
      </div>
    `
    document.body.appendChild(loadingOverlay)
  }
  loadingOverlay.style.display = "flex"
}

function hideLoading() {
  const loadingOverlay = document.getElementById("loadingOverlay")
  if (loadingOverlay) {
    loadingOverlay.style.display = "none"
  }
}

function showSuccess(message) {
  showNotification(message, "success")
}

function showError(message) {
  showNotification(message, "error")
}

function showNotification(message, type) {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(".notification")
  existingNotifications.forEach((notification) => notification.remove())

  // Create new notification
  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.textContent = message

  document.body.appendChild(notification)

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification)
    }
  }, 5000)
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.clear()
    window.location.href = "login.html"
  }
}

// Close modals when clicking outside
window.onclick = (event) => {
  const paymentModal = document.getElementById("paymentProcessModal")

  if (event.target === paymentModal) {
    closePaymentProcessModal()
  }
}
