class DoctorDashboard {
  constructor() {
    this.doctorId = localStorage.getItem("doctorId")
    this.baseURL = "http://localhost:8080/api/v1"
    this.doctorData = null
    this.bankingData = null
    this.isEditingProfile = false
    this.isEditingBanking = false

    this.init()
  }

  init() {
    if (!this.doctorId) {
      this.showToast("Please login first", "error")
      window.location.href = "login.html"
      return
    }

    this.setupEventListeners()
    this.loadDoctorData()
    this.loadBankingDetails()
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault()
        this.switchSection(link.dataset.section)
      })
    })

    // Profile section
    document.getElementById("editProfileBtn").addEventListener("click", () => this.toggleProfileEdit())
    document.getElementById("saveProfileBtn").addEventListener("click", () => this.saveProfile())
    document.getElementById("cancelProfileBtn").addEventListener("click", () => this.cancelProfileEdit())
    document
      .getElementById("changeImageBtn")
      .addEventListener("click", () => document.getElementById("imageInput").click())
    document.getElementById("imageInput").addEventListener("change", (e) => this.handleImageUpload(e))

    // Password section
    document.getElementById("passwordForm").addEventListener("submit", (e) => this.changePassword(e))

    // Banking section
    document.getElementById("addBankingBtn").addEventListener("click", () => this.toggleBankingEdit())
    document.getElementById("editBankingBtn").addEventListener("click", () => this.toggleBankingEdit())
    document.getElementById("saveBankingBtn").addEventListener("click", () => this.saveBankingDetails())
    document.getElementById("cancelBankingBtn").addEventListener("click", () => this.cancelBankingEdit())

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => this.logout())
  }

  switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll(".nav-link").forEach((link) => link.classList.remove("active"))
    document.querySelector(`[data-section="${sectionName}"]`).classList.add("active")

    // Update content
    document.querySelectorAll(".content-section").forEach((section) => section.classList.remove("active"))
    document.getElementById(sectionName).classList.add("active")
  }

  async loadDoctorData() {
    try {
      this.showLoading(true)
      const response = await fetch(`${this.baseURL}/doctors/${this.doctorId}`)

      if (!response.ok) {
        throw new Error("Failed to load doctor data")
      }

      this.doctorData = await response.json()
      this.populateProfileData()
    } catch (error) {
      console.error("Error loading doctor data:", error)
      this.showToast("Failed to load profile data", "error")
    } finally {
      this.showLoading(false)
    }
  }

  populateProfileData() {
    if (!this.doctorData) return

    document.getElementById("doctorName").textContent = `Dr. ${this.doctorData.fullName}`
    document.getElementById("profileImage").src =
      this.doctorData.profileImage || "/placeholder.svg?height=150&width=150"
    document.getElementById("fullNameDisplay").textContent = this.doctorData.fullName
    document.getElementById("emailDisplay").textContent = this.doctorData.email
    document.getElementById("phoneDisplay").textContent = this.doctorData.phone
    document.getElementById("addressDisplay").textContent = this.doctorData.address
    document.getElementById("genderDisplay").textContent = this.doctorData.gender
    document.getElementById("licenseDisplay").textContent = this.doctorData.medicalLicenseNumber
    document.getElementById("specializationDisplay").textContent = this.doctorData.specialization
    document.getElementById("experienceDisplay").textContent = `${this.doctorData.experienceYears} years`

    // Set input values
    document.getElementById("fullNameInput").value = this.doctorData.fullName
    document.getElementById("emailInput").value = this.doctorData.email
    document.getElementById("phoneInput").value = this.doctorData.phone
    document.getElementById("addressInput").value = this.doctorData.address
    document.getElementById("genderInput").value = this.doctorData.gender
  }

  toggleProfileEdit() {
    this.isEditingProfile = !this.isEditingProfile

    const editableFields = ["fullName", "email", "phone", "address", "gender"]

    editableFields.forEach((field) => {
      const display = document.getElementById(`${field}Display`)
      const input = document.getElementById(`${field}Input`)

      if (this.isEditingProfile) {
        display.style.display = "none"
        input.style.display = "block"
      } else {
        display.style.display = "block"
        input.style.display = "none"
      }
    })

    document.getElementById("editProfileBtn").style.display = this.isEditingProfile ? "none" : "block"
    document.getElementById("profileActions").style.display = this.isEditingProfile ? "flex" : "none"
    document.getElementById("imageOverlay").style.display = this.isEditingProfile ? "flex" : "none"
  }

  async saveProfile() {
    try {
      this.showLoading(true)

      const updateData = {
        fullName: document.getElementById("fullNameInput").value,
        email: document.getElementById("emailInput").value,
        phone: document.getElementById("phoneInput").value,
        address: document.getElementById("addressInput").value,
        gender: document.getElementById("genderInput").value,
        medicalLicenseNumber: this.doctorData.medicalLicenseNumber,
        specialization: this.doctorData.specialization,
        experienceYears: this.doctorData.experienceYears,
        dateOfBirth: this.doctorData.dateOfBirth,
        fees: this.doctorData.fees,
        slotDurationMinutes: this.doctorData.slotDurationMinutes,
        isHoliday: this.doctorData.isHoliday || false,
      }

      const formData = new FormData()
      formData.append("doctorData", new Blob([JSON.stringify(updateData)], { type: "application/json" }))

      const response = await fetch(`${this.baseURL}/doctors/${this.doctorId}`, {
        method: "PUT",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Server error:", errorText)
        throw new Error(`Failed to update profile: ${response.status}`)
      }

      this.doctorData = await response.json()
      this.populateProfileData()
      this.toggleProfileEdit()
      this.showToast("Profile updated successfully", "success")
    } catch (error) {
      console.error("Error updating profile:", error)
      this.showToast("Failed to update profile: " + error.message, "error")
    } finally {
      this.showLoading(false)
    }
  }

  cancelProfileEdit() {
    this.populateProfileData()
    this.toggleProfileEdit()
  }

  async handleImageUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith("image/")) {
      this.showToast("Please select an image file", "error")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      this.showToast("Image size should be less than 2MB", "error")
      return
    }

    try {
      this.showLoading(true)

      const updateData = {
        fullName: this.doctorData.fullName,
        email: this.doctorData.email,
        phone: this.doctorData.phone,
        address: this.doctorData.address,
        gender: this.doctorData.gender,
        medicalLicenseNumber: this.doctorData.medicalLicenseNumber,
        specialization: this.doctorData.specialization,
        experienceYears: this.doctorData.experienceYears,
        dateOfBirth: this.doctorData.dateOfBirth,
        fees: this.doctorData.fees,
        slotDurationMinutes: this.doctorData.slotDurationMinutes,
        isHoliday: this.doctorData.isHoliday || false,
      }

      const formData = new FormData()
      formData.append("doctorData", new Blob([JSON.stringify(updateData)], { type: "application/json" }))
      formData.append("profileImage", file)

      const response = await fetch(`${this.baseURL}/doctors/${this.doctorId}`, {
        method: "PUT",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Server error:", errorText)
        throw new Error(`Failed to update profile image: ${response.status}`)
      }

      this.doctorData = await response.json()
      document.getElementById("profileImage").src = this.doctorData.profileImage
      this.showToast("Profile image updated successfully", "success")
    } catch (error) {
      console.error("Error updating profile image:", error)
      this.showToast("Failed to update profile image: " + error.message, "error")
    } finally {
      this.showLoading(false)
    }
  }

  async changePassword(event) {
    event.preventDefault()

    const currentPassword = document.getElementById("currentPassword").value
    const newPassword = document.getElementById("newPassword").value
    const confirmPassword = document.getElementById("confirmPassword").value

    if (newPassword !== confirmPassword) {
      this.showToast("New passwords do not match", "error")
      return
    }

    if (newPassword.length < 6) {
      this.showToast("Password must be at least 6 characters long", "error")
      return
    }

    try {
      this.showLoading(true)

      // Note: This endpoint doesn't exist in the backend - needs to be implemented
      const response = await fetch(`${this.baseURL}/doctors/${this.doctorId}/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Failed to change password")
      }

      document.getElementById("passwordForm").reset()
      this.showToast("Password changed successfully", "success")
    } catch (error) {
      console.error("Error changing password:", error)
      this.showToast(error.message || "Failed to change password", "error")
    } finally {
      this.showLoading(false)
    }
  }

  async loadBankingDetails() {
    try {
      const response = await fetch(`${this.baseURL}/banking-details/doctor/${this.doctorId}`)

      if (response.ok) {
        this.bankingData = await response.json()
        this.populateBankingData()
        document.getElementById("editBankingBtn").style.display = "block"
        document.getElementById("noBankingDetails").style.display = "none"
      } else if (response.status === 404) {
        // No banking details found
        this.bankingData = null
        this.showNoBankingDetails()
      } else {
        throw new Error("Failed to load banking details")
      }
    } catch (error) {
      console.error("Error loading banking details:", error)
      this.showNoBankingDetails()
    }
  }

  populateBankingData() {
    if (!this.bankingData) return

    document.getElementById("bankNameDisplay").textContent = this.bankingData.bankName || "Not provided"
    document.getElementById("accountNumberDisplay").textContent = this.bankingData.accountNumber || "Not provided"
    document.getElementById("cifNumberDisplay").textContent = this.bankingData.cifNumber || "Not provided"
    document.getElementById("upiIdDisplay").textContent = this.bankingData.upiId || "Not provided"

    // Set input values
    document.getElementById("bankNameInput").value = this.bankingData.bankName || ""
    document.getElementById("accountNumberInput").value = this.bankingData.accountNumber || ""
    document.getElementById("cifNumberInput").value = this.bankingData.cifNumber || ""
    document.getElementById("upiIdInput").value = this.bankingData.upiId || ""
  }

  showNoBankingDetails() {
    document.getElementById("bankNameDisplay").textContent = "Not provided"
    document.getElementById("accountNumberDisplay").textContent = "Not provided"
    document.getElementById("cifNumberDisplay").textContent = "Not provided"
    document.getElementById("upiIdDisplay").textContent = "Not provided"

    document.getElementById("addBankingBtn").style.display = "block"
    document.getElementById("editBankingBtn").style.display = "none"
    document.getElementById("noBankingDetails").style.display = "block"
  }

  toggleBankingEdit() {
    this.isEditingBanking = !this.isEditingBanking

    const fields = ["bankName", "accountNumber", "cifNumber", "upiId"]

    fields.forEach((field) => {
      const display = document.getElementById(`${field}Display`)
      const input = document.getElementById(`${field}Input`)

      if (this.isEditingBanking) {
        display.style.display = "none"
        input.style.display = "block"
      } else {
        display.style.display = "block"
        input.style.display = "none"
      }
    })

    document.getElementById("addBankingBtn").style.display = this.isEditingBanking
      ? "none"
      : this.bankingData
        ? "none"
        : "block"
    document.getElementById("editBankingBtn").style.display = this.isEditingBanking
      ? "none"
      : this.bankingData
        ? "block"
        : "none"
    document.getElementById("bankingActions").style.display = this.isEditingBanking ? "flex" : "none"
    document.getElementById("noBankingDetails").style.display = this.isEditingBanking
      ? "none"
      : this.bankingData
        ? "none"
        : "block"
  }

  async saveBankingDetails() {
    const bankName = document.getElementById("bankNameInput").value.trim()
    const accountNumber = document.getElementById("accountNumberInput").value.trim()
    const cifNumber = document.getElementById("cifNumberInput").value.trim()
    const upiId = document.getElementById("upiIdInput").value.trim()

    if (!bankName || !accountNumber) {
      this.showToast("Bank name and account number are required", "error")
      return
    }

    // Validate account number
    if (!/^[0-9]{9,18}$/.test(accountNumber)) {
      this.showToast("Account number must be 9-18 digits", "error")
      return
    }

    // Validate UPI ID if provided
    if (upiId && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(upiId)) {
      this.showToast("Invalid UPI ID format", "error")
      return
    }

    try {
      this.showLoading(true)

      const bankingData = {
        doctorId: Number.parseInt(this.doctorId),
        bankName,
        accountNumber,
        cifNumber,
        upiId,
      }

      let response
      if (this.bankingData) {
        // Update existing
        response = await fetch(`${this.baseURL}/banking-details/doctor/${this.doctorId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bankingData),
        })
      } else {
        // Create new
        response = await fetch(`${this.baseURL}/banking-details`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bankingData),
        })
      }

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Failed to save banking details")
      }

      this.bankingData = await response.json()
      this.populateBankingData()
      this.toggleBankingEdit()
      this.showToast("Banking details saved successfully", "success")
    } catch (error) {
      console.error("Error saving banking details:", error)
      this.showToast(error.message || "Failed to save banking details", "error")
    } finally {
      this.showLoading(false)
    }
  }

  cancelBankingEdit() {
    this.populateBankingData()
    this.toggleBankingEdit()
  }

  logout() {
    localStorage.removeItem("doctorId")
    window.location.href = "login.html"
  }

  showLoading(show) {
    const overlay = document.getElementById("loadingOverlay")
    if (show) {
      overlay.classList.add("show")
    } else {
      overlay.classList.remove("show")
    }
  }

  showToast(message, type = "success") {
    const container = document.getElementById("toastContainer")
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.textContent = message

    container.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, 5000)
  }
}

// Initialize the dashboard when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new DoctorDashboard()
})
