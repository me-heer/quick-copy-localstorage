// Get DOM elements
const copyBtn = document.getElementById('copyBtn');
const status = document.getElementById('status');
const websiteList = document.getElementById('websiteList');
const newWebsite = document.getElementById('newWebsite');
const addBtn = document.getElementById('addBtn');
const storageKey = document.getElementById('storageKey');
const saveKeyBtn = document.getElementById('saveKeyBtn');

// No default websites - users must configure manually
const defaultWebsites = [];

// No default storage key - users must configure manually
const defaultStorageKey = '';

// Show status message
function showStatus(message, type = 'info') {
  status.textContent = message;
  status.className = `status ${type}`;
  status.classList.remove('hidden');
  
  setTimeout(() => {
    status.classList.add('hidden');
  }, 3000);
}

// Load and display storage key
async function loadStorageKey() {
  try {
    const result = await chrome.storage.sync.get(['storageKey']);
    const key = result.storageKey || defaultStorageKey;
    storageKey.value = key;
    updateCopyButtonText(key);
  } catch (error) {
    console.error('Error loading storage key:', error);
    storageKey.value = defaultStorageKey;
    updateCopyButtonText(defaultStorageKey);
  }
}

// Update copy button text
function updateCopyButtonText(key) {
  if (key && key.trim()) {
    copyBtn.textContent = `Copy ${key}`;
  } else {
    copyBtn.textContent = 'Copy Value';
  }
}

// Save storage key
async function saveStorageKey() {
  const key = storageKey.value.trim();
  if (!key) {
    showStatus('Please enter a storage key', 'error');
    return;
  }
  
  try {
    await chrome.storage.sync.set({ storageKey: key });
    updateCopyButtonText(key);
    showStatus('Storage key saved successfully', 'success');
  } catch (error) {
    console.error('Error saving storage key:', error);
    showStatus('Error saving storage key', 'error');
  }
}

// Load and display allowed websites
async function loadWebsites() {
  try {
    const result = await chrome.storage.sync.get(['allowedWebsites']);
    const websites = result.allowedWebsites || defaultWebsites;
    
    websiteList.innerHTML = '';
    websites.forEach(website => {
      const item = document.createElement('div');
      item.className = 'website-item';
      item.innerHTML = `
        <span>${website}</span>
        <button class="remove-btn" data-website="${website}">Remove</button>
      `;
      websiteList.appendChild(item);
    });
    
    // Add event listeners to remove buttons
    websiteList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', removeWebsite);
    });
  } catch (error) {
    console.error('Error loading websites:', error);
    showStatus('Error loading websites', 'error');
  }
}

// Parse and clean website URL
function parseWebsiteUrl(input) {
  let cleanUrl = input.trim();
  
  // Remove protocol (http://, https://)
  cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
  
  // Remove everything after the domain (path, query, hash)
  cleanUrl = cleanUrl.split('/')[0];
  cleanUrl = cleanUrl.split('?')[0];
  cleanUrl = cleanUrl.split('#')[0];
  
  // If it starts with www., convert to wildcard pattern
  if (cleanUrl.startsWith('www.')) {
    cleanUrl = '*.' + cleanUrl.substring(4);
  }
  // If it has a subdomain and no wildcard, add wildcard
  else if (cleanUrl.includes('.') && !cleanUrl.startsWith('*.')) {
    const parts = cleanUrl.split('.');
    if (parts.length > 2) {
      // Has subdomain, convert to wildcard pattern
      cleanUrl = '*.' + parts.slice(1).join('.');
    }
  }
  
  return cleanUrl;
}

// Add new website
async function addWebsite() {
  const website = newWebsite.value.trim();
  if (!website) {
    showStatus('Please enter a website pattern', 'error');
    return;
  }
  
  // Parse and clean the website URL
  const cleanWebsite = parseWebsiteUrl(website);
  
  // Basic validation
  if (!cleanWebsite.includes('.')) {
    showStatus('Please enter a valid website pattern (e.g., *.example.com)', 'error');
    return;
  }
  
  try {
    const result = await chrome.storage.sync.get(['allowedWebsites']);
    const websites = result.allowedWebsites || defaultWebsites;
    
    if (websites.includes(cleanWebsite)) {
      showStatus('Website already exists', 'error');
      return;
    }
    
    websites.push(cleanWebsite);
    await chrome.storage.sync.set({ allowedWebsites: websites });
    
    newWebsite.value = '';
    loadWebsites();
    showStatus('Website added successfully', 'success');
    
    // Update manifest permissions
    updateManifestPermissions(websites);
  } catch (error) {
    console.error('Error adding website:', error);
    showStatus('Error adding website', 'error');
  }
}

// Remove website
async function removeWebsite(event) {
  const website = event.target.dataset.website;
  
  try {
    const result = await chrome.storage.sync.get(['allowedWebsites']);
    let websites = result.allowedWebsites || defaultWebsites;
    
    websites = websites.filter(w => w !== website);
    await chrome.storage.sync.set({ allowedWebsites: websites });
    
    loadWebsites();
    showStatus('Website removed successfully', 'success');
    
    // Update manifest permissions
    updateManifestPermissions(websites);
  } catch (error) {
    console.error('Error removing website:', error);
    showStatus('Error removing website', 'error');
  }
}

// Update manifest permissions (note: this requires extension reload)
function updateManifestPermissions(websites) {
  // Note: Chrome extensions can't dynamically update manifest permissions
  // The user will need to reload the extension for new permissions to take effect
  const hostPermissions = websites.map(website => {
    if (website.startsWith('*.')) {
      return `*://${website}/*`;
    } else if (website.startsWith('http://') || website.startsWith('https://')) {
      return `${website}/*`;
    } else {
      return `*://${website}/*`;
    }
  });
  
  // Store the updated permissions for the background script
  chrome.storage.local.set({ hostPermissions });
}

// Copy value from localStorage
async function copyAuthToken() {
  try {
    copyBtn.disabled = true;
    copyBtn.textContent = 'Copying...';
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }
    
    // Get storage key and allowed websites
    const result = await chrome.storage.sync.get(['allowedWebsites', 'storageKey']);
    const websites = result.allowedWebsites || defaultWebsites;
    const keyToSearch = result.storageKey || defaultStorageKey;
    
    // Check if storage key is configured
    if (!keyToSearch || !keyToSearch.trim()) {
      showStatus('Please set a localStorage key first', 'error');
      return;
    }
    
    // Check if websites are configured
    if (websites.length === 0) {
      showStatus('Please add at least one website first', 'error');
      return;
    }
    
    const currentUrl = new URL(tab.url);
    const isAllowed = websites.some(pattern => {
      // Convert wildcard pattern to regex
      // Handle different pattern formats
      if (pattern.startsWith('*.')) {
        // For patterns like *.senpiper.com, match any subdomain
        const domain = pattern.substring(2); // Remove *.
        const escapedDomain = domain.replace(/\./g, '\\.');
        const regex = new RegExp(`^.*\\.${escapedDomain}$`);
        return regex.test(currentUrl.hostname);
      } else if (pattern.includes('*')) {
        // For other wildcard patterns
        const regex = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
        return new RegExp(`^${regex}$`).test(currentUrl.hostname);
      } else {
        // Exact match
        return pattern === currentUrl.hostname;
      }
    });
    
    if (!isAllowed) {
      showStatus(`This extension only works on: ${websites.join(', ')}. Current site: ${currentUrl.hostname}`, 'error');
      return;
    }
    
    // Execute content script to get value from localStorage
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getValueFromLocalStorage,
      args: [keyToSearch]
    });
    
    if (results && results[0]) {
      if (results[0].result !== undefined) {
        const storageValue = results[0].result;
        
        if (storageValue) {
          // Copy to clipboard using the Clipboard API
          await navigator.clipboard.writeText(storageValue);
          showStatus(`${keyToSearch} copied to clipboard!`, 'success');
        } else {
          showStatus(`${keyToSearch} not found in localStorage`, 'error');
        }
              } else {
          showStatus('Script execution failed', 'error');
        }
      } else {
        showStatus('Failed to execute script on page', 'error');
      }
  } catch (error) {
    console.error('Error copying authToken:', error);
    if (error.message.includes('Cannot access')) {
      showStatus('Cannot access this page. Extension only works on allowed websites.', 'error');
    } else {
      showStatus('Error copying authToken', 'error');
    }
      } finally {
      copyBtn.disabled = false;
      const result = await chrome.storage.sync.get(['storageKey']);
      const currentKey = result.storageKey || defaultStorageKey;
      updateCopyButtonText(currentKey);
    }
}

// Function to be injected into the page to get value from localStorage
function getValueFromLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
}



// Event listeners
copyBtn.addEventListener('click', copyAuthToken);
addBtn.addEventListener('click', addWebsite);
saveKeyBtn.addEventListener('click', saveStorageKey);
newWebsite.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addWebsite();
  }
});
storageKey.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveStorageKey();
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadStorageKey();
  loadWebsites();
}); 