# quick-copy-localstorage
Chrome Extension that copies the value of the specified key from LocalStorage and adds it to your Clipboard


A Chrome extension that copies the `authToken` value from localStorage on specified websites with a single click.

## Features

- 🔒 **Secure**: Only works on allowed websites
- 📋 **One-click copy**: Click the extension icon to copy authToken to clipboard
- ⚙️ **Configurable**: Add/remove allowed websites through the popup interface
- 🎯 **Targeted**: Only activates on specified domains
- 🔧 **Easy to use**: Pin the extension and click to copy

## Default Configuration

The extension comes pre-configured to work on:
- `*.senpiper.com`

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension will appear in your extensions list
6. Pin the extension for easy access

### Usage

1. **Navigate to an allowed website** (e.g., any senpiper.com subdomain)
2. **Click the extension icon** in your Chrome toolbar
3. **Click "Copy AuthToken"** in the popup
4. The authToken from localStorage will be copied to your clipboard

### Adding New Websites

1. Click the extension icon
2. In the "Allowed Websites" section, enter a website pattern
3. Click "Add" to include it in the allowed list
4. Website patterns support wildcards (e.g., `*.example.com`)

### Removing Websites

1. Click the extension icon
2. Find the website in the "Allowed Websites" list
3. Click "Remove" next to the website you want to remove

## Technical Details

### Files Structure

- `manifest.json` - Extension configuration and permissions
- `popup.html` - Extension popup interface
- `popup.js` - Popup logic and clipboard operations
- `content.js` - Content script for accessing localStorage
- `background.js` - Background service worker
- `README.md` - This documentation

### Permissions

- `activeTab` - Access to current active tab
- `storage` - Store allowed websites list
- `clipboardWrite` - Write to clipboard
- `host_permissions` - Access to specified websites

### Security

- Only works on explicitly allowed websites
- No data is transmitted externally
- localStorage access is limited to allowed domains
- All data stays local to your browser

## Troubleshooting

### Extension not working on a website?

1. Check if the website is in your allowed list
2. Make sure the website pattern matches (use `*.domain.com` for subdomains)
3. Reload the page after adding new websites

### AuthToken not found?

1. Verify that the website stores the token as `authToken` in localStorage
2. Check browser developer tools (F12) → Application → Local Storage
3. Look for the `authToken` key

### Extension icon grayed out?

This indicates you're on a website that's not in your allowed list. Add the website to your allowed list or navigate to an allowed website.

## Development

To modify the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Privacy

This extension:
- Does not collect any personal data
- Does not transmit data to external servers
- Only accesses localStorage on explicitly allowed websites
- Stores configuration locally in Chrome sync storage

## License

This project is open source. Feel free to modify and distribute as needed. 
