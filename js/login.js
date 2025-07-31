document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const accountTypeButtons = document.querySelectorAll('.account-type');
    const statusMessage = document.getElementById('status-message');
    
    // Toggle between patient and doctor login
    accountTypeButtons.forEach(button => {
        button.addEventListener('click', function() {
            accountTypeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get account type
        const accountType = document.querySelector('.account-type.active').getAttribute('data-type');
        
        // Get form data
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        try {
            // Disable submit button and show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';
            
            // Determine API endpoint based on account type
            const endpoint = accountType === 'DOCTOR' 
                ? 'http://localhost:8080/api/v1/doctors/login' 
                : 'http://localhost:8080/api/v1/users/login';
            
            // Send the request
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            // Parse the response
            const result = await response.json();
            
            // Handle the response
            if (response.ok) {
                showMessage('Login successful! Redirecting...', 'success');
                
                // Store user data in localStorage
                if (accountType === 'DOCTOR') {
                    localStorage.setItem('doctorId', result.doctorId);
                    localStorage.setItem('userType', 'DOCTOR');
                    localStorage.setItem('userName', result.fullName);
                    localStorage.setItem('userSpecialization', result.specialization);
                    localStorage.setItem('userProfileImage', result.profileImage || '');
                } else {
                    localStorage.setItem('userId', result.userId);
                    localStorage.setItem('userType', result.role);
                    localStorage.setItem('userName', result.fullName);
                    localStorage.setItem('userProfileImage', result.profileImage || '');
                }
                
                // Redirect based on user type
                setTimeout(() => {
                    if (accountType === 'DOCTOR') {
                        window.location.href = 'doctor-dashboard.html';
                    } else if (result.role === 'ADMIN') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        // window.location.href = 'patient-dashboard.html';
                        window.location.href = 'user-dashboard.html';
                    }
                }, 1000);
            } else {
                throw new Error(result.message || 'Invalid email or password');
            }
        } catch (error) {
            showMessage(error.message || 'Login failed', 'error');
        } finally {
            // Re-enable submit button
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    });
    
    // Helper function to show status messages
    function showMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message';
        statusMessage.classList.add(type);
        
        // Scroll to message
        statusMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});