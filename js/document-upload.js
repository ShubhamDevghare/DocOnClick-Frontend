document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("document-upload-form")
  const statusMessage = document.getElementById("status-message")
  const submitBtn = document.getElementById("submit-btn")
  const progressFill = document.getElementById("progress-fill")
  const uploadedCount = document.getElementById("uploaded-count")
  const doctorInfoSection = document.getElementById("doctor-info-section")
  const doctorInfoContent = document.getElementById("doctor-info-content")

  let uploadedFiles = 0
  const totalFiles = 5
  let doctorId = null

  // Get doctor ID from URL parameters or localStorage
  function getDoctorId() {
    const urlParams = new URLSearchParams(window.location.search)
    const urlDoctorId = urlParams.get("doctorId")
    const storedDoctorId = localStorage.getItem("doctorId")

    return urlDoctorId || storedDoctorId
  }

  // Initialize page
  function initializePage() {
    doctorId = getDoctorId()

    if (!doctorId) {
      showMessage("Doctor ID not found. Please complete registration first.", "error")
      setTimeout(() => {
        window.location.href = "signup.html"
      }, 3000)
      return
    }

    document.getElementById("doctorId").value = doctorId
    loadDoctorInfo()
    setupFileUploads()
    checkExistingDocuments()
  }

  // Load doctor information
  async function loadDoctorInfo() {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/doctors/${doctorId}`)

      if (response.ok) {
        const doctor = await response.json()
        displayDoctorInfo(doctor)
      } else {
        throw new Error("Failed to load doctor information")
      }
    } catch (error) {
      console.error("Error loading doctor info:", error)
      showMessage("Error loading doctor information", "error")
    }
  }

  // Display doctor information
  function displayDoctorInfo(doctor) {
    doctorInfoContent.innerHTML = `
            <div class="doctor-details">
                <p><strong>Name:</strong> Dr. ${doctor.fullName}</p>
                <p><strong>Specialization:</strong> ${doctor.specialization}</p>
                <p><strong>Email:</strong> ${doctor.email}</p>
                <p><strong>Experience:</strong> ${doctor.experienceYears} years</p>
                <p><strong>License Number:</strong> ${doctor.medicalLicenseNumber}</p>
            </div>
        `
    doctorInfoSection.style.display = "block"
  }

  // Check for existing documents
  async function checkExistingDocuments() {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/documents-verification/doctor/${doctorId}`)

      if (response.ok) {
        const verification = await response.json()
        markExistingDocuments(verification)
      }
    } catch (error) {
      // No existing documents found, which is expected for new registrations
      console.log("No existing documents found")
    }
  }

  // Mark existing documents as uploaded
  function markExistingDocuments(verification) {
    const documentFields = [
      "governmentIdProof",
      "medicalRegistrationCertificate",
      "educationalCertificate",
      "experienceCertificate",
      "specializationCertificate",
    ]

    documentFields.forEach((field) => {
      if (verification[field]) {
        markDocumentAsUploaded(field, "Previously uploaded")
      }
    })

    if (verification.verificationStatus === "VERIFIED") {
      showUploadComplete()
    }
  }

  // Setup file upload handlers
  function setupFileUploads() {
    const fileInputs = document.querySelectorAll('input[type="file"]')

    fileInputs.forEach((input) => {
      const wrapper = input.closest(".file-upload-wrapper")
      const uploadArea = wrapper.querySelector(".file-upload-area")

      // File selection handler
      input.addEventListener("change", (e) => {
        handleFileSelection(e.target)
      })

      // Drag and drop handlers
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

        const files = e.dataTransfer.files
        if (files.length > 0) {
          input.files = files
          handleFileSelection(input)
        }
      })

      // Click to upload
      uploadArea.addEventListener("click", () => {
        input.click()
      })
    })
  }

  // Handle file selection
  function handleFileSelection(input) {
    const file = input.files[0]
    const wrapper = input.closest(".file-upload-wrapper")
    const fileInfo = wrapper.querySelector(".file-info")
    const fieldName = input.name

    if (!file) return

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      showFileError(wrapper, validation.message)
      input.value = ""
      return
    }

    // Show file info
    showFileInfo(fileInfo, file)
    wrapper.classList.add("uploaded")

    // Update progress if this is a new upload
    if (!wrapper.dataset.wasUploaded) {
      uploadedFiles++
      updateProgress()
      wrapper.dataset.wasUploaded = "true"
    }
  }

  // Validate file
  function validateFile(file) {
    if (file.type !== "application/pdf") {
      return { valid: false, message: "Only PDF files are allowed" }
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      return { valid: false, message: "File size must be less than 5MB" }
    }

    return { valid: true }
  }

  // Show file information
  function showFileInfo(fileInfo, file) {
    const fileSize = (file.size / 1024 / 1024).toFixed(2)
    fileInfo.innerHTML = `
            <div class="file-details">
                <div class="file-name"><i class="fas fa-file-pdf"></i> ${file.name}</div>
                <div class="file-size">Size: ${fileSize} MB</div>
            </div>
        `
    fileInfo.classList.add("show")
  }

  // Show file error
  function showFileError(wrapper, message) {
    const status = wrapper.querySelector(".upload-status")
    status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`
    status.className = "upload-status error show"
  }

  // Mark document as uploaded
  function markDocumentAsUploaded(fieldName, message = "Uploaded successfully") {
    const wrapper = document.querySelector(`#${fieldName}`).closest(".file-upload-wrapper")
    const status = wrapper.querySelector(".upload-status")
    const group = wrapper.closest(".document-upload-group")

    wrapper.classList.add("uploaded")
    group.classList.add("uploaded")

    status.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`
    status.className = "upload-status success show"

    if (!wrapper.dataset.wasUploaded) {
      uploadedFiles++
      updateProgress()
      wrapper.dataset.wasUploaded = "true"
    }
  }

  // Update progress
  function updateProgress() {
    const percentage = (uploadedFiles / totalFiles) * 100
    progressFill.style.width = `${percentage}%`
    uploadedCount.textContent = uploadedFiles

    if (uploadedFiles === totalFiles) {
      submitBtn.disabled = false
    }
  }

  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    if (uploadedFiles < totalFiles) {
      showMessage("Please upload all required documents before submitting", "error")
      return
    }

    try {
      // Disable submit button and show loading
      submitBtn.disabled = true
      submitBtn.innerHTML = '<div class="loading-spinner"></div> Uploading Documents...'
      submitBtn.classList.add("uploading")

      // Create FormData
      const formData = new FormData()

      // Add files to FormData
      const fileInputs = document.querySelectorAll('input[type="file"]')
      fileInputs.forEach((input) => {
        if (input.files[0]) {
          formData.append(input.name, input.files[0])
        }
      })

      // Upload documents
      const response = await fetch(`http://localhost:8080/api/v1/documents-verification/upload/${doctorId}`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        showUploadComplete()
      } else {
        throw new Error(result.message || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      showMessage(error.message || "Upload failed. Please try again.", "error")
    } finally {
      // Reset submit button
      submitBtn.disabled = false
      submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Documents'
      submitBtn.classList.remove("uploading")
    }
  })

  // Show upload complete
  function showUploadComplete() {
    const container = document.querySelector(".auth-card")
    container.innerHTML = `
            <div class="upload-complete">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2>Documents Uploaded Successfully!</h2>
                <p>Your documents have been submitted for verification. You will receive an email notification once your account is approved by our admin team.</p>
                
                <div class="next-steps">
                    <h3>What happens next?</h3>
                    <div class="steps-list">
                        <div class="step">
                            <i class="fas fa-search"></i>
                            <span>Our team will review your documents</span>
                        </div>
                        <div class="step">
                            <i class="fas fa-clock"></i>
                            <span>Verification typically takes 24-48 hours</span>
                        </div>
                        <div class="step">
                            <i class="fas fa-envelope"></i>
                            <span>You'll receive an email notification</span>
                        </div>
                        <div class="step">
                            <i class="fas fa-user-check"></i>
                            <span>Once approved, you can start accepting appointments</span>
                        </div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <a href="login.html" class="btn btn-primary">Go to Login</a>
                    <a href="index.html" class="btn btn-outline">Back to Home</a>
                </div>
            </div>
        `
  }

  // Helper function to show status messages
  function showMessage(message, type) {
    statusMessage.textContent = message
    statusMessage.className = "status-message"
    statusMessage.classList.add(type)

    // Scroll to message
    statusMessage.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  // Initialize the page
  initializePage()
})
