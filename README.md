# A ChromeExtension to Quickly copy a LocalStorage Item
Chrome Extension that copies the value of the specified key from LocalStorage and adds it to your Clipboard

### What is this?
- A chrome extension that lets you copy a specified item from the local storage with one click.

### Why did I make this?
- My development workflow requires a lot of copying of authentication tokens from browser's local storage, and pasting it to curl/postman/any other HTTP Client.
- This becomes tedious as soon as I have to do this for multiple environments.
- Every time I need to open Chrome Developer Tools > Go to Local Storage > Find the required item > Select the value > Press Ctrl + C C C C C

### Usage

1. **Navigate to an allowed website**
2. Right-click
3. Click "Copy Storage Value"
4. The configured item from localStorage will be copied to your clipboard

### Adding New Websites

1. Click the extension icon
2. In the "Allowed Websites" section, enter a website pattern
3. Click "Add" to include it in the allowed list
4. Website patterns support wildcards (e.g., `*.example.com`)

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


### Extension icon grayed out?

This indicates you're on a website that's not in your allowed list. Add the website to your allowed list or navigate to an allowed website.

## Privacy

This extension:
- Does not collect any personal data
- Does not transmit data to external servers
- Only accesses localStorage on explicitly allowed websites
- Stores configuration locally in Chrome sync storage

## License

This project is open source. Feel free to modify and distribute as needed. 
