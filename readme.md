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
- Advanced URL pattern matching with wildcard and regex support
- Template library for quick setup of common API scenarios
- Import/export functionality for sharing configurations
- Enable/disable individual routes without removing them
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
- **Regex patterns**: Use forward slashes to define regex patterns like `/^\/api\/users\/\d+$/` to match numeric IDs only

#### Regex Pattern Examples

Regex patterns must be enclosed in forward slashes with optional flags at the end:

1. Match numeric IDs only:
   ```
   /^\/api\/users\/\d+$/
   ```

2. Match specific file extensions:
   ```
   /\.(?:jpg|png|gif)$/i
   ```

3. Match API versions:
   ```
   /\/api\/v[1-3]\//
   ```

4. Match specific path with query parameters:
   ```
   /\/search\?.*q=javascript.*/i
   ```

### Using Templates

The extension includes several pre-built templates for common API scenarios:

1. Navigate to the "Templates" tab in the side panel
2. Choose a template category:
   - **Basic API**: Simple data endpoints
   - **CRUD API**: Complete set of Create, Read, Update, Delete operations
   - **Authentication API**: Login, register, and token handling
   - **E-commerce API**: Products, cart, and order endpoints
3. Preview the routes that will be created
4. Click "Import Routes" to add all routes from the template

### Import/Export Routes

#### Exporting Routes

1. Navigate to the "Routes" tab
2. Click the "Export Routes" button
3. Your routes will be:
   - Downloaded as a JSON file
   - Copied to your clipboard
   - Loaded into the Templates tab for review or modification

#### Importing Routes

1. Navigate to the "Templates" tab
2. Either:
   - Paste exported JSON into the editor
   - Click "Import from File" to upload a previously exported JSON file
3. Click "Parse Schema" to validate and preview the routes
4. Click "Import Routes" to add all routes to your configuration

### Enabling/Disabling Routes

Individual routes can be enabled or disabled without removing them:

1. In the "Routes" tab, each route has a toggle switch
2. Turn the toggle on/off to enable/disable the route
3. Disabled routes will remain in your configuration but won't intercept requests
4. Disabled routes are visually indicated with reduced opacity and strikethrough text

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

6. **Templates Manager** (`templates-manager.js`): Handles template operations and importing/exporting routes

### Communication Flow

1. User configures routes in the popup or side panel
2. Configuration is stored in the extension's local storage
3. When a page loads, the content script injects the interceptor script
4. The interceptor script receives configurations and intercepts matching requests
5. When a route is matched, the interceptor returns the configured mock response

### Technical Note on Request Interception

The extension intercepts requests by overriding the native `fetch` and `XMLHttpRequest` methods directly in the page context. This allows it to work with any JavaScript frameworks or libraries without requiring specific integration.

### URL Matching Implementation

The URL matching system uses a multi-tiered approach:

1. First, it checks for direct matches with the exact URL
2. Next, it looks for regex patterns (enclosed in `/pattern/flags` format)
3. Then, it attempts to match using URL parsing and normalization
4. Finally, it processes wildcard patterns by converting asterisks to regex patterns

## Use Cases

### Frontend Development without Backend Dependencies

- Develop UI components with mock data while the backend API is under development
- Test various response scenarios (success, error, empty results) without changing backend code

### Testing and Debugging

- Test error handling in your application by simulating API failures
- Debug loading states by adding response delays
- Validate UI behavior with different response formats or data structures

### API Pattern Development and Testing

- Prototype API designs before implementation
- Test complex URL pattern matching with regex for dynamic segments
- Create realistic response simulations for various endpoint patterns

### Demo and Presentation

- Create stable demos that don't rely on external API services
- Showcase different application states for presentations or reviews
- Use templates to quickly set up common scenarios

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
4. Verify that the specific route is enabled (toggle is on)
5. For regex patterns, test your pattern separately to ensure it's valid

### Content Not Displaying Correctly

1. Verify your response body is properly formatted (valid JSON for JSON responses)
2. Ensure the content type matches your response body format
3. Use the "Format JSON" button to validate and format your JSON responses

### Debugging Tips

1. **Console Logging**: The interceptor logs messages to the console when:
   - It is initialized
   - Routes are updated
   - A request is intercepted
   - A route is matched

2. **Browser Network Tab**: Even intercepted requests appear in the network tab, but will have:
   - Status code matching your configuration
   - Response body from your mock
   - A custom header `X-Request-Intercepted: true`

## Advanced Usage

### Working with Complex APIs

For complex APIs with many related endpoints, consider:

1. **Using regex patterns** for dynamic segments like IDs and pagination
2. **Creating route hierarchies** with wildcards for resource collections
3. **Using templates** as a starting point and customizing for your needs
4. **Enabling/disabling groups** of related routes to test different scenarios

### Performance Considerations

1. **Response Delays**: Use with caution as they block the JavaScript thread
2. **Complex Regex Patterns**: Very complex patterns may impact performance
3. **Large Response Bodies**: Consider the size of your mock responses
4. **Route Count**: Large numbers of routes require more pattern matching

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
- Code syntax highlighting by [Prism.js](https://prismjs.com/)
- Code editor powered by [Ace Editor](https://ace.c9.io/)

---

We hope this extension helps streamline your development workflow! If you encounter any issues or have suggestions for improvements, please submit them through the issue tracker.