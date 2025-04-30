# Request Interceptor Chrome Extension

## Overview

Request Interceptor is a powerful Chrome extension designed for developers to intercept HTTP/HTTPS requests and mock API responses. It allows frontend developers to simulate backend API responses for testing UI components, developing against unfinished APIs, or simulating different response scenarios without requiring backend changes.

## Installation

1. **For Developers (Loading Unpacked)**:
   - Clone or download the repository
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the extension directory
   - The extension icon should appear in your Chrome toolbar

2. **For End Users (Chrome Web Store)**:
   - Navigate to the Chrome Web Store (link will be provided once published)
   - Click "Add to Chrome"
   - Confirm the installation when prompted

## Features

- Intercept and mock responses for any HTTP/HTTPS request (fetch and XMLHttpRequest)
- Support for all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Customizable response body, status code, and content type
- Response delay simulation to test loading states
- URL pattern matching with wildcard support
- Persistent configuration saved between browser sessions
- Easy toggle on/off functionality
- Side panel interface for managing routes

## Usage Guide

### Basic Workflow

1. **Enable the Interceptor**:
   - Click the extension icon in your Chrome toolbar
   - Toggle the switch to enable the interceptor

2. **Configure Routes**:
   - Click "Configure Routes" to open the side panel
   - Add routes that define which requests to intercept and how to respond to them

3. **Test Your Application**:
   - With the interceptor enabled, navigate to your application
   - Requests matching your configured routes will be intercepted and mocked

### Adding Routes

1. Click "Add Route" in the side panel
2. Configure the route:
   - **URL to Intercept**: Enter the URL pattern to match (e.g., `/api/users` or `https://example.com/api/data/*`)
   - **HTTP Method**: Select the HTTP method (GET, POST, PUT, DELETE, PATCH)
   - **Status Code**: Set the desired response status code (e.g., 200, 404, 500)
   - **Response Delay**: Optionally add a delay in milliseconds to simulate network latency
   - **Content Type**: Select the response content type (application/json, text/plain, etc.)
   - **Response Body**: Enter the mock response content (typically JSON for API responses)
3. Click "Add Interception" to save the route

### URL Pattern Matching

The extension supports several ways to match URLs:

- **Exact match**: `/api/users` will match exactly that path
- **Wildcards**: `/api/users/*` will match any URL that starts with `/api/users/`
- **Full URLs**: `https://api.example.com/data` will match that specific URL
- **Query Parameters**: URLs with query parameters will match if all parameters in the pattern are present in the request

### Managing Routes

- **Edit**: Click the edit button on a route to modify its configuration
- **Remove**: Click the delete button to remove a route
- **Clear All**: Use the "Clear All" button to remove all configured routes
- **Search**: Filter routes using the search box
- **Filter by Method**: Use the dropdown to show only routes for a specific HTTP method

## Developer Information

### Architecture

The extension consists of several key components:

1. **Background Script** (`background.js`): Manages the extension state and communicates with content scripts

2. **Content Script** (`content.js`): Injected into web pages to relay messages between the page and the background script

3. **Interceptor Script** (`interceptor.js`): Injected directly into the page to override fetch and XMLHttpRequest methods for request interception

4. **Popup Interface** (`popup.html/js`): The small popup interface when clicking the extension icon

5. **Side Panel** (`sidepanel.html/js`): Full interface for managing routes and configurations

### Communication Flow

1. User configures routes in the popup or side panel
2. Configuration is stored in the extension's local storage
3. When a page loads, the content script injects the interceptor script
4. The interceptor script receives configurations and intercepts matching requests
5. When a route is matched, the interceptor returns the configured mock response

### Technical Note on Request Interception

The extension intercepts requests by overriding the native `fetch` and `XMLHttpRequest` methods directly in the page context. This allows it to work with any JavaScript frameworks or libraries without requiring specific integration.

## Use Cases

### Frontend Development without Backend Dependencies

- Develop UI components with mock data while the backend API is under development
- Test various response scenarios (success, error, empty results) without changing backend code

### Testing and Debugging

- Test error handling in your application by simulating API failures
- Debug loading states by adding response delays
- Validate UI behavior with different response formats or data structures

### Demo and Presentation

- Create stable demos that don't rely on external API services
- Showcase different application states for presentations or reviews

## Troubleshooting

### Extension Not Working

1. Ensure the extension is enabled (toggle is on)
2. Check that your URL patterns match correctly
3. Verify the extension has permission for the site you're testing
4. Try reloading the page after enabling the extension
5. Check the browser console for any error messages

### Routes Not Being Intercepted

1. Check that your URL pattern matches the actual request URL
2. Ensure the HTTP method matches (GET, POST, etc.)
3. For relative URLs, make sure you're using the correct format (e.g., starting with `/`)

### Content Not Displaying Correctly

1. Verify your response body is properly formatted (valid JSON for JSON responses)
2. Ensure the content type matches your response body format

## Limitations

- The extension can only intercept requests made through JavaScript (fetch, XMLHttpRequest)
- It cannot intercept requests made from non-JavaScript contexts (e.g., image tags, CSS backgrounds)
- Some secure sites may block content scripts, preventing the extension from working
- WebSockets and other non-HTTP protocols are not supported

## Privacy and Security

- The extension only operates on tabs where it has been explicitly enabled
- All configuration data is stored locally in your browser
- No data is sent to external servers
- Request interception happens entirely within your browser

## Contributing

We welcome contributions to improve the Request Interceptor extension:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Icon designs from [FontAwesome](https://fontawesome.com/)
- UI components inspired by modern design systems

---

We hope this extension helps streamline your development workflow! If you encounter any issues or have suggestions for improvements, please submit them through the issue tracker.