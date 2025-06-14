// Content script for AuthToken Copier extension
// This script runs on allowed websites and provides access to localStorage

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAuthToken') {
    try {
      const authToken = localStorage.getItem('authToken');
      sendResponse({ success: true, authToken: authToken });
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

 