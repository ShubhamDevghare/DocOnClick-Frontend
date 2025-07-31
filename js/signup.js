document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form")
  const accountTypeButtons = document.querySelectorAll(".account-type")
  const doctorFields = document.getElementById("doctor-fields")
  const statusMessage = document.getElementById("status-message")

  // Toggle between patient and doctor signup
  accountTypeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      accountTypeButtons.forEach((btn) => btn.classList.remove("active"))
      this.classList.add("active")

      if (this.getAttribute("data-type") === "DOCTOR") {
        doctorFields.style.display = "block"
        // Make doctor-specific fields required
        document.getElementById("medicalLicenseNumber").setAttribute("required", "")
        document.getElementById("specialization").setAttribute("required", "")
        document.getElementById("experienceYears").setAttribute("required", "")
        document.getElementById("fees").setAttribute("required", "")
      } else {
        doctorFields.style.display = "none"
        // Remove required attribute from doctor-specific fields
        document.getElementById("medicalLicenseNumber").removeAttribute("required")
        document.getElementById("specialization").removeAttribute("required")
        document.getElementById("experienceYears").removeAttribute("required")
        document.getElementById("fees").removeAttribute("required")
      }
    })
  })

  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    // Validate passwords match
    const password = document.getElementById("password").value
    const confirmPassword = document.getElementById("confirmPassword").value

    if (password !== confirmPassword) {
      showMessage("Passwords do not match", "error")
      return
    }

    // Get account type
    const accountType = document.querySelector(".account-type.active").getAttribute("data-type")

    try {
      // Create FormData object
      const formData = new FormData()

      // Add common fields
      const userData = {
        fullName: document.getElementById("fullName").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value,
        password: password,
        gender: document.getElementById("gender").value,
        dateOfBirth: document.getElementById("dateOfBirth").value,
        role: accountType,
      }

      // Add doctor-specific fields if doctor signup
      if (accountType === "DOCTOR") {
        userData.medicalLicenseNumber = document.getElementById("medicalLicenseNumber").value
        userData.specialization = document.getElementById("specialization").value
        userData.experienceYears = document.getElementById("experienceYears").value
        userData.fees = document.getElementById("fees").value
        userData.slotDurationMinutes = document.getElementById("slotDurationMinutes").value
      }

      // Create a blob from the userData object
      const userDataBlob = new Blob([JSON.stringify(userData)], {
        type: "application/json",
      })

      // Append the userData blob to the FormData
      formData.append("userData", userDataBlob)

      // Add profile image if selected
      const profileImage = document.getElementById("profileImage").files[0]
      if (profileImage) {
        formData.append("profileImage", profileImage)
      }

      // Disable submit button and show loading state
      const submitButton = form.querySelector('button[type="submit"]')
      submitButton.disabled = true
      submitButton.textContent = "Creating Account..."

      // Determine API endpoint based on account type
      const endpoint =
        accountType === "DOCTOR"
          ? "http://localhost:8080/api/v1/doctors/signup"
          : "http://localhost:8080/api/v1/users/signup"

      // Send the request
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      // Parse the response
      const result = await response.json()

      // Handle the response
      if (response.ok) {
        if (accountType === "DOCTOR") {
          // Store doctor ID for document upload
          localStorage.setItem("doctorId", result.doctorId)

          showMessage("Account created successfully! Redirecting to document upload...", "success")

          // Reset form
          form.reset()

          // Redirect to document upload page
          setTimeout(() => {
            window.location.href = `doctor-document-upload.html?doctorId=${result.doctorId}`
          }, 2000)
        } else {
          showMessage("Account created successfully! Redirecting to login...", "success")

          // Reset form
          form.reset()

          // Redirect to login page after a delay
          setTimeout(() => {
            window.location.href = "login.html"
          }, 2000)
        }
      } else {
        throw new Error(result.message || "Failed to create account")
      }
    } catch (error) {
      showMessage(error.message || "An error occurred", "error")
    } finally {
      // Re-enable submit button
      const submitButton = form.querySelector('button[type="submit"]')
      submitButton.disabled = false
      submitButton.textContent = "Create Account"
    }
  })

  // Helper function to show status messages
  function showMessage(message, type) {
    statusMessage.textContent = message
    statusMessage.className = "status-message"
    statusMessage.classList.add(type)

    // Scroll to message
    statusMessage.scrollIntoView({ behavior: "smooth", block: "center" })
  }
})
