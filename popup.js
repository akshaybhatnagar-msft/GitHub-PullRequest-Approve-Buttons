// GitHub PR Quick Actions - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const patInput = document.getElementById('pat');
  const saveButton = document.getElementById('save');
  const clearButton = document.getElementById('clear');
  const statusDiv = document.getElementById('status');
  const statusText = document.getElementById('status-text');
  const messageDiv = document.getElementById('message');

  // Show message
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message message--${type}`;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      messageDiv.className = 'message';
    }, 3000);
  }

  // Update status display
  function updateStatus(hasToken) {
    if (hasToken) {
      statusDiv.className = 'status status--configured';
      statusText.innerHTML = '<span class="status-icon">&#10003;</span> PAT configured';
    } else {
      statusDiv.className = 'status status--not-configured';
      statusText.innerHTML = '<span class="status-icon">!</span> PAT not configured';
    }
  }

  // Load current status
  async function loadStatus() {
    try {
      const result = await chrome.storage.sync.get(['githubPAT']);
      updateStatus(!!result.githubPAT);

      if (result.githubPAT) {
        patInput.placeholder = 'Token saved (enter new token to replace)';
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  }

  // Save token
  saveButton.addEventListener('click', async () => {
    const token = patInput.value.trim();

    if (!token) {
      showMessage('Please enter a token', 'error');
      return;
    }

    // Basic validation - GitHub PATs start with ghp_, github_pat_, or gho_
    if (!token.match(/^(ghp_|github_pat_|gho_)/)) {
      showMessage('Invalid token format. GitHub tokens start with ghp_, github_pat_, or gho_', 'error');
      return;
    }

    try {
      saveButton.disabled = true;
      saveButton.textContent = 'Saving...';

      // Verify the token by making a test API call
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('Invalid token or insufficient permissions');
      }

      const user = await response.json();

      // Save the token
      await chrome.storage.sync.set({ githubPAT: token });

      patInput.value = '';
      patInput.placeholder = 'Token saved (enter new token to replace)';
      updateStatus(true);
      showMessage(`Token saved! Authenticated as ${user.login}`, 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save Token';
    }
  });

  // Clear token
  clearButton.addEventListener('click', async () => {
    try {
      await chrome.storage.sync.remove(['githubPAT']);
      patInput.value = '';
      patInput.placeholder = 'ghp_xxxxxxxxxxxx';
      updateStatus(false);
      showMessage('Token cleared', 'success');
    } catch (error) {
      showMessage('Failed to clear token', 'error');
    }
  });

  // Allow pressing Enter to save
  patInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveButton.click();
    }
  });

  // Load initial status
  await loadStatus();
});
