// Fixed user-profile.js with proper request formatting

document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const userId = localStorage.getItem("userId")
  if (!userId) {
    window.location.href = "login.html"
    return
  }

  // Initialize user menu dropdown
  initUserMenu()

  // Load user profile data
  loadUserProfile()

  // Setup edit profile functionality
  document.getElementById("edit-profile-btn").addEventListener("click", () => {
    document.getElementById("profile-view").style.display = "none"
    document.getElementById("profile-edit").style.display = "block"
  })

  document.getElementById("cancel-edit-btn").addEventListener("click", () => {
    document.getElementById("profile-edit").style.display = "none"
    document.getElementById("profile-view").style.display = "block"
  })

  // Setup profile form submission
  document.getElementById("profile-edit").addEventListener("submit", (e) => {
    e.preventDefault()
    updateProfile()
  })

  // Setup password form submission
  document.getElementById("password-form").addEventListener("submit", (e) => {
    e.preventDefault()
    updatePassword()
  })

  // Setup profile image upload
  document.getElementById("profile-image-upload").addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadProfileImage(e.target.files[0])
    }
  })

  // Setup logout functionality
  document.getElementById("logout-btn").addEventListener("click", (e) => {
    e.preventDefault()
    logout()
  })
})

function initUserMenu() {
  const userProfileToggle = document.getElementById("user-profile-toggle")
  const userDropdown = document.getElementById("user-dropdown")

  userProfileToggle.addEventListener("click", () => {
    userDropdown.classList.toggle("active")
  })

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!userProfileToggle.contains(e.target) && !userDropdown.contains(e.target)) {
      userDropdown.classList.remove("active")
    }
  })

  // Set user name and profile image
  const userName = localStorage.getItem("userName") || "User"
  const userProfileImage = localStorage.getItem("userProfileImage") || "/placeholder.svg?height=200&width=200"

  document.getElementById("user-name").textContent = userName

  const headerProfileImage = document.getElementById("header-profile-image")
  headerProfileImage.src = userProfileImage
  headerProfileImage.onerror = function () {
    this.src = "/placeholder.svg?height=200&width=200"
  }
}

function loadUserProfile() {
  const userId = localStorage.getItem("userId")

  fetch(`http://localhost:8080/api/v1/users/${userId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load user data")
      }
      return response.json()
    })
    .then((user) => {
      // Update localStorage with latest user data
      localStorage.setItem("userName", user.fullName)
      localStorage.setItem("userProfileImage", user.profileImage || "")

      // Update header user info
      document.getElementById("user-name").textContent = user.fullName

      const headerProfileImage = document.getElementById("header-profile-image")
      headerProfileImage.src = user.profileImage || "/placeholder.svg?height=200&width=200"
      headerProfileImage.onerror = function () {
        this.src = "/placeholder.svg?height=200&width=200"
      }

      // Update sidebar user info
      document.getElementById("sidebar-user-name").textContent = user.fullName
      document.getElementById("sidebar-user-email").textContent = user.email

      const profileImage = document.getElementById("profile-image")
      profileImage.src = user.profileImage || "/placeholder.svg?height=200&width=200"
      profileImage.onerror = function () {
        this.src = "/placeholder.svg?height=200&width=200"
      }

      // Update profile view
      document.getElementById("view-fullName").textContent = user.fullName
      document.getElementById("view-email").textContent = user.email
      document.getElementById("view-phone").textContent = user.phone
      document.getElementById("view-gender").textContent = user.gender
      document.getElementById("view-dateOfBirth").textContent = formatDate(user.dateOfBirth)
      document.getElementById("view-address").textContent = user.address

      // Update profile edit form
      document.getElementById("fullName").value = user.fullName
      document.getElementById("email").value = user.email
      document.getElementById("phone").value = user.phone
      document.getElementById("gender").value = user.gender
      document.getElementById("dateOfBirth").value = user.dateOfBirth
      document.getElementById("address").value = user.address
    })
    .catch((error) => {
      console.error("Error loading user profile:", error)
      showMessage("Failed to load user profile. Please try again later.", "error", "status-message")
    })
}

// FIXED: Updated to send FormData instead of JSON
function updateProfile() {
  const userId = localStorage.getItem("userId")
  const submitButton = document.querySelector('#profile-edit button[type="submit"]')

  // Disable submit button and show loading state
  submitButton.disabled = true
  submitButton.textContent = "Saving..."

  // Create FormData object for multipart/form-data
  const formData = new FormData()

  // Create user data object
  const userData = {
    fullName: document.getElementById("fullName").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    gender: document.getElementById("gender").value,
    dateOfBirth: document.getElementById("dateOfBirth").value,
    address: document.getElementById("address").value,
    role: localStorage.getItem("userType") || "USER",
  }

  // Create a blob from the userData object
  const userDataBlob = new Blob([JSON.stringify(userData)], {
    type: "application/json",
  })

  // Append the userData blob to the FormData
  formData.append("userData", userDataBlob)

  // FIXED: Send FormData instead of JSON
  fetch(`http://localhost:8080/api/v1/users/${userId}`, {
    method: "PUT",
    body: formData, // No Content-Type header - browser will set it automatically for FormData
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to update profile")
      }
      return response.json()
    })
    .then((updatedUser) => {
      // Update localStorage with updated user data
      localStorage.setItem("userName", updatedUser.fullName)

      // Show success message
      showMessage("Profile updated successfully!", "success", "status-message")

      // Reload user profile data
      loadUserProfile()

      // Switch back to view mode
      document.getElementById("profile-edit").style.display = "none"
      document.getElementById("profile-view").style.display = "block"
    })
    .catch((error) => {
      console.error("Error updating profile:", error)
      showMessage("Failed to update profile. Please try again.", "error", "status-message")
    })
    .finally(() => {
      // Re-enable submit button
      submitButton.disabled = false
      submitButton.textContent = "Save Changes"
    })
}

// FIXED: Updated to use correct endpoint and send JSON
function updatePassword() {
  const userId = localStorage.getItem("userId")
  const submitButton = document.querySelector('#password-form button[type="submit"]')

  const currentPassword = document.getElementById("currentPassword").value
  const newPassword = document.getElementById("newPassword").value
  const confirmPassword = document.getElementById("confirmPassword").value

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    showMessage("New passwords do not match", "error", "password-status-message")
    return
  }

  // Disable submit button and show loading state
  submitButton.disabled = true
  submitButton.textContent = "Updating..."

  // FIXED: Use correct endpoint and send JSON data
  fetch(`http://localhost:8080/api/v1/users/${userId}/change-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      currentPassword: currentPassword,
      newPassword: newPassword,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to update password")
      }
      // Password change endpoint returns void, so don't try to parse JSON
      return response.text()
    })
    .then(() => {
      // Show success message
      showMessage("Password updated successfully!", "success", "password-status-message")

      // Reset form
      document.getElementById("password-form").reset()
    })
    .catch((error) => {
      console.error("Error updating password:", error)
      showMessage(
        "Failed to update password. Please check your current password and try again.",
        "error",
        "password-status-message",
      )
    })
    .finally(() => {
      // Re-enable submit button
      submitButton.disabled = false
      submitButton.textContent = "Update Password"
    })
}

function uploadProfileImage(file) {
  const userId = localStorage.getItem("userId")

  // Validate file size and type
  if (file.size > 2 * 1024 * 1024) {
    showMessage("Image size should not exceed 2MB", "error", "status-message")
    return
  }

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    showMessage("Only JPEG and PNG images are allowed", "error", "status-message")
    return
  }

  // Create FormData object
  const formData = new FormData()

  // Add user data (required by the API)
  const userData = {
    fullName: document.getElementById("fullName").value || document.getElementById("view-fullName").textContent,
    email: document.getElementById("email").value || document.getElementById("view-email").textContent,
    phone: document.getElementById("phone").value || document.getElementById("view-phone").textContent,
    address: document.getElementById("address").value || document.getElementById("view-address").textContent,
    role: localStorage.getItem("userType") || "USER",
  }

  // Create a blob from the userData object
  const userDataBlob = new Blob([JSON.stringify(userData)], {
    type: "application/json",
  })

  // Append the userData blob and profile image to the FormData
  formData.append("userData", userDataBlob)
  formData.append("profileImage", file)

  // Show loading state
  const profileImage = document.getElementById("profile-image")
  profileImage.style.opacity = "0.5"

  fetch(`http://localhost:8080/api/v1/users/${userId}`, {
    method: "PUT",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to upload profile image")
      }
      return response.json()
    })
    .then((updatedUser) => {
      // Update localStorage with updated user data
      localStorage.setItem("userProfileImage", updatedUser.profileImage)

      // Show success message
      showMessage("Profile image updated successfully!", "success", "status-message")

      // Update profile image
      profileImage.src = updatedUser.profileImage
      document.getElementById("header-profile-image").src = updatedUser.profileImage
    })
    .catch((error) => {
      console.error("Error uploading profile image:", error)
      showMessage("Failed to upload profile image. Please try again.", "error", "status-message")
    })
    .finally(() => {
      // Reset loading state
      profileImage.style.opacity = "1"
    })
}

function formatDate(dateString) {
  if (!dateString) return "-"

  const date = new Date(dateString)
  return date.toLocaleDateString()
}

function showMessage(message, type, elementId) {
  const statusMessage = document.getElementById(elementId)
  statusMessage.textContent = message
  statusMessage.className = "status-message"
  statusMessage.classList.add(type)

  // Scroll to message
  statusMessage.scrollIntoView({ behavior: "smooth", block: "center" })

  // Clear message after 5 seconds
  setTimeout(() => {
    statusMessage.textContent = ""
    statusMessage.className = "status-message"
  }, 5000)
}

function logout() {
  // Clear local storage
  localStorage.removeItem("userId")
  localStorage.removeItem("userType")
  localStorage.removeItem("userName")
  localStorage.removeItem("userProfileImage")

  // Redirect to login page
  window.location.href = "login.html"
}
