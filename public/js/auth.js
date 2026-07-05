let selectedRole = 'customer';

// Handle switching roles on the registration page
function setRegisterRole(role) {
  selectedRole = role;
  const toggleCust = document.getElementById('toggle-customer');
  const toggleVend = document.getElementById('toggle-vendor');
  const vendorFields = document.getElementById('vendor-fields');
  const storeNameInput = document.getElementById('storeName');

  if (role === 'vendor') {
    toggleVend.classList.add('active');
    toggleCust.classList.remove('active');
    vendorFields.style.display = 'block';
    storeNameInput.setAttribute('required', 'true');
  } else {
    toggleCust.classList.add('active');
    toggleVend.classList.remove('active');
    vendorFields.style.display = 'none';
    storeNameInput.removeAttribute('required');
  }
}

// Show alert banner on auth card
function showAuthAlert(message, type = 'error') {
  const alertEl = document.getElementById('auth-alert');
  if (!alertEl) return;

  alertEl.textContent = message;
  alertEl.style.display = 'block';

  if (type === 'success') {
    alertEl.style.background = 'rgba(16, 185, 129, 0.15)';
    alertEl.style.color = '#10b981';
    alertEl.style.border = '1px solid rgba(16, 185, 129, 0.3)';
  } else {
    alertEl.style.background = 'rgba(239, 68, 68, 0.15)';
    alertEl.style.color = '#ef4444';
    alertEl.style.border = '1px solid rgba(239, 68, 68, 0.3)';
  }
}

// DOM Setup
document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup Login Listener
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        // Store session tokens locally
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showAuthAlert(data.message || 'Success! Logging in...', 'success');
        
        // Redirect depending on user role
        setTimeout(() => {
          if (data.user.role === 'vendor') {
            window.location.href = '/dashboard';
          } else {
            window.location.href = '/';
          }
        }, 1000);

      } catch (err) {
        showAuthAlert(err.message || 'Login failed. Please verify credentials.');
      }
    });
  }

  // 2. Setup Register Listener
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      const payload = {
        name,
        email,
        password,
        role: selectedRole,
      };

      if (selectedRole === 'vendor') {
        payload.storeName = document.getElementById('storeName').value;
        payload.storeDescription = document.getElementById('storeDescription').value;
      }

      try {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        // Store session tokens locally
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showAuthAlert(data.message || 'Registration completed successfully!', 'success');

        setTimeout(() => {
          if (selectedRole === 'vendor') {
            window.location.href = '/dashboard';
          } else {
            window.location.href = '/';
          }
        }, 1000);

      } catch (err) {
        showAuthAlert(err.message || 'Registration failed. Check inputs.');
      }
    });
  }
});
