// Background service worker for AuthToken Copier extension

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('AuthToken Copier extension installed/updated');
  
  // No default setup - users must configure manually
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      allowedWebsites: [],
      storageKey: ''
    });
  }
  
  // Create context menu
  createContextMenu();
});

// Create context menu for copying authToken
async function createContextMenu() {
  // Remove existing context menu items
  chrome.contextMenus.removeAll();
  
  // Create the context menu item
  chrome.contextMenus.create({
    id: 'copy-storage-value',
    title: 'Copy Storage Value',
    contexts: ['page', 'selection', 'link'],
    documentUrlPatterns: ['*://*/*'] // We'll check allowed websites in the click handler
  });
}

// Handle tab updates to check if we're on an allowed website
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkTabPermissions(tab);
    updateContextMenu(tab);
  }
});

// Handle tab activation (when user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updateContextMenu(tab);
});

// Update context menu visibility based on current tab
async function updateContextMenu(tab) {
  try {
    if (!tab.url) return;
    
    const result = await chrome.storage.sync.get(['allowedWebsites']);
    const websites = result.allowedWebsites || [];
    
    const currentUrl = new URL(tab.url);
    const isAllowed = websites.some(pattern => {
      if (pattern.startsWith('*.')) {
        const domain = pattern.substring(2);
        const escapedDomain = domain.replace(/\./g, '\\.');
        const regex = new RegExp(`^.*\\.${escapedDomain}$`);
        return regex.test(currentUrl.hostname);
      } else if (pattern.includes('*')) {
        const regex = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
        return new RegExp(`^${regex}$`).test(currentUrl.hostname);
      } else {
        return pattern === currentUrl.hostname;
      }
    });
    
    // Update context menu item visibility
    chrome.contextMenus.update('copy-storage-value', {
      visible: isAllowed
    });
  } catch (error) {
    console.error('Error updating context menu:', error);
  }
}

// Check if current tab is on an allowed website
async function checkTabPermissions(tab) {
  try {
    const result = await chrome.storage.sync.get(['allowedWebsites']);
    const websites = result.allowedWebsites || [];
    
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
    
    // Update extension icon based on whether site is allowed
    if (isAllowed) {
      chrome.action.setIcon({
        path: {
          "16": "icon16.png",
          "48": "icon48.png",
          "128": "icon128.png"
        },
        tabId: tab.id
      });
      chrome.action.setTitle({
        title: "Quick Copy LocalStorage Item (Available)",
        tabId: tab.id
      });
    } else {
      // Use a grayed out version or different icon for non-allowed sites
      chrome.action.setTitle({
        title: "Quick Copy LocalStorage Item (Not available on this site)",
        tabId: tab.id
      });
    }
  } catch (error) {
    console.error('Error checking tab permissions:', error);
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'copy-storage-value') {
    await copyStorageValueFromContextMenu(tab);
  }
});

// Copy storage value from context menu
async function copyStorageValueFromContextMenu(tab) {
  try {
    // Check if current tab matches allowed websites and get storage key
    const result = await chrome.storage.sync.get(['allowedWebsites', 'storageKey']);
    const websites = result.allowedWebsites || [];
    const storageKey = result.storageKey || '';
    
    // Check if extension is configured
    if (!storageKey || !storageKey.trim()) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Quick Copy LocalStorage Item',
        message: 'Please configure a localStorage key first'
      });
      return;
    }
    
    if (websites.length === 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Quick Copy LocalStorage Item',
        message: 'Please add websites to the allowed list first'
      });
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
      // Show notification that site is not allowed
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Quick Copy LocalStorage Item',
        message: `This extension only works on allowed websites: ${websites.join(', ')}`
      });
      return;
    }
    
    // Execute content script to get storage value
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getValueFromLocalStorageForContextMenu,
      args: [storageKey]
    });
    
    if (results && results[0] && results[0].result !== undefined) {
      const storageValue = results[0].result;
      
      if (storageValue) {
        // Use the offscreen API or content script to copy to clipboard
        // Since we can't access clipboard directly from background script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: copyToClipboard,
          args: [storageValue]
        });
        
        // Show success notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Quick Copy LocalStorage Item',
          message: `${storageKey} copied to clipboard!`
        });
      } else {
        // Show error notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Quick Copy LocalStorage Item',
          message: `${storageKey} not found in localStorage`
        });
      }
    } else {
      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Quick Copy LocalStorage Item',
        message: 'Failed to access localStorage'
      });
    }
  } catch (error) {
    console.error('Error copying storage value from context menu:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'Quick Copy LocalStorage Item',
      message: 'Error copying storage value'
    });
  }
}

// Function to get value from localStorage (injected into page)
function getValueFromLocalStorageForContextMenu(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
}

// Function to copy text to clipboard (injected into page)
function copyToClipboard(text) {
  try {
    navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Error copying to clipboard:', error);
  }
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updatePermissions') {
    // Handle permission updates if needed
    console.log('Permissions update requested');
  }
  
  return true;
});

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command);
  if (command === 'copy-storage-item') {
    console.log('Copy storage item command triggered');
    // Get the current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      console.log('Active tab found:', tabs[0].url);
      await copyStorageValueFromKeyboardShortcut(tabs[0]);
    } else {
      console.log('No active tab found');
    }
  }
});

// Copy storage value from keyboard shortcut
async function copyStorageValueFromKeyboardShortcut(tab) {
  try {
    // Check if current tab matches allowed websites and get storage key
    const result = await chrome.storage.sync.get(['allowedWebsites', 'storageKey']);
    const websites = result.allowedWebsites || [];
    const storageKey = result.storageKey || '';
    
    // Check if extension is configured
    if (!storageKey || !storageKey.trim()) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Quick Copy LocalStorage Item',
        message: 'Please configure a localStorage key first (Ctrl+Shift+L shortcut)'
      });
      return;
    }
    
    if (websites.length === 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Quick Copy LocalStorage Item',
        message: 'Please add websites to the allowed list first (Ctrl+Shift+L shortcut)'
      });
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
      // Show notification that site is not allowed
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Quick Copy LocalStorage Item',
        message: `Shortcut (Ctrl+Shift+L) only works on allowed websites: ${websites.join(', ')}`
      });
      return;
    }
    
    // Execute content script to get storage value
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getValueFromLocalStorageForContextMenu,
      args: [storageKey]
    });
    
    if (results && results[0] && results[0].result !== undefined) {
      const storageValue = results[0].result;
      
      if (storageValue) {
        // Use the offscreen API or content script to copy to clipboard
        // Since we can't access clipboard directly from background script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: copyToClipboard,
          args: [storageValue]
        });
        
        // Show success notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Quick Copy LocalStorage Item',
          message: `${storageKey} copied to clipboard! (Ctrl+Shift+L)`
        });
      } else {
        // Show error notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Quick Copy LocalStorage Item',
          message: `${storageKey} not found in localStorage (Ctrl+Shift+L)`
        });
      }
    } else {
      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Quick Copy LocalStorage Item',
        message: 'Failed to access localStorage (Ctrl+Shift+L)'
      });
    }
  } catch (error) {
    console.error('Error copying storage value from keyboard shortcut:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'Quick Copy LocalStorage Item',
      message: 'Error copying storage value (Ctrl+Shift+L)'
    });
  }
} 