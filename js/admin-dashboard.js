import { checkAuth, apiRequest, showNotification, API_ENDPOINTS } from "./config.js"

// Check authentication on page load
document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return

  loadDashboardData()
})

async function loadDashboardData() {
  try {
    // Load stats
    await Promise.all([loadDoctorStats(), loadUserStats(), loadPatientStats(), loadRecentVerifications()])
  } catch (error) {
    console.error("Error loading dashboard data:", error)
    showNotification("Error loading dashboard data", "error")
  }
}

async function loadDoctorStats() {
  try {
    // Load pending doctors
    const pendingDoctors = await apiRequest(`${API_ENDPOINTS.documentsVerification.byStatus}/PENDING?size=1`)
    document.getElementById("pendingDoctors").textContent = pendingDoctors.totalElements || 0

    // Load verified doctors
    const verifiedDoctors = await apiRequest(`${API_ENDPOINTS.documentsVerification.byStatus}/VERIFIED?size=1`)
    document.getElementById("verifiedDoctors").textContent = verifiedDoctors.totalElements || 0
  } catch (error) {
    console.error("Error loading doctor stats:", error)
    document.getElementById("pendingDoctors").textContent = "0"
    document.getElementById("verifiedDoctors").textContent = "0"
  }
}

async function loadUserStats() {
  try {
    const users = await apiRequest(`${API_ENDPOINTS.users.base}?size=1`)
    document.getElementById("totalUsers").textContent = users.length || 0
  } catch (error) {
    console.error("Error loading user stats:", error)
    document.getElementById("totalUsers").textContent = "0"
  }
}

async function loadPatientStats() {
  try {
    const patients = await apiRequest(`${API_ENDPOINTS.patients.base}?size=1`)
    document.getElementById("totalPatients").textContent = patients.length || 0
  } catch (error) {
    console.error("Error loading patient stats:", error)
    document.getElementById("totalPatients").textContent = "0"
  }
}

async function loadRecentVerifications() {
  try {
    const verifications = await apiRequest(`${API_ENDPOINTS.documentsVerification.byStatus}/PENDING?size=5`)
    const tbody = document.getElementById("recentVerifications")

    if (!verifications.content || verifications.content.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No pending verifications</td></tr>'
      return
    }

    // Enrich verification data with doctor details
    const enrichedVerifications = await Promise.all(
      verifications.content.map(async (verification) => {
        try {
          const doctor = await apiRequest(`${API_ENDPOINTS.doctors.base}/${verification.doctorId}`)
          return {
            ...verification,
            doctorSpecialization: doctor.specialization || verification.doctorSpecialization,
            doctorEmail: doctor.email || verification.doctorEmail,
          }
        } catch (error) {
          console.error(`Error loading doctor ${verification.doctorId}:`, error)
          return verification
        }
      }),
    )

    tbody.innerHTML = enrichedVerifications
      .map(
        (verification) => `
            <tr>
                <td>${verification.doctorName}</td>
                <td>${verification.doctorSpecialization || "N/A"}</td>
                <td>${verification.doctorEmail || "N/A"}</td>
                <td><span class="status-badge status-pending">${verification.verificationStatus}</span></td>
                <td>${new Date(verification.uploadedAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewVerification(${verification.documentsVerificationId})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `,
      )
      .join("")
  } catch (error) {
    console.error("Error loading recent verifications:", error)
    document.getElementById("recentVerifications").innerHTML =
      '<tr><td colspan="6" class="text-center">Error loading data</td></tr>'
  }
}

window.viewVerification = (verificationId) => {
  window.location.href = `admin-doctor-management.html?verification=${verificationId}`
}

window.refreshData = () => {
  loadDashboardData()
  showNotification("Dashboard data refreshed", "success")
}
