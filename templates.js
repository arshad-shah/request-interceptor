
/**
 * Object containing API mock templates.
 * The key of each template (e.g., 'basic') will be used as the button name in the template tab.
 * Each template should contain a routes array defining the scenario endpoints.
 * @typedef {Object} Templates
 * @property {Object} basic - Basic template with simple endpoints
 * @property {Array<Route>} basic.routes - Array of route configurations for the basic template
 * @typedef {Object} Route
 * @property {string} method - HTTP method (GET, POST, etc.)
 * @property {string} url - Endpoint URL
 * @property {number} status - HTTP status code
 * @property {number} delay - Response delay in milliseconds
 * @property {string} contentType - Response Content-Type header
 * @property {Object} response - Response body object
 */
const Templates = {
  // Basic template with simple endpoints
  basic: {
    routes: [
      {
        method: "GET",
        url: "/api/data",
        status: 200,
        delay: 200,
        contentType: "application/json",
        response: {
          success: true,
          data: [
            { id: 1, name: "Item 1" },
            { id: 2, name: "Item 2" },
            { id: 3, name: "Item 3" }
          ]
        }
      },
      {
        method: "GET",
        url: "/api/stats",
        status: 200,
        delay: 300,
        contentType: "application/json",
        response: {
          totalUsers: 1250,
          activeUsers: 834,
          conversionRate: "12.5%"
        }
      },
      {
        method: "GET",
        url: "/api/stats",
        status: 200,
        delay: 300,
        contentType: "application/json",
        response: {
          totalUsers: 1250,
          activeUsers: 834,
          conversionRate: "12.5%"
        }
      }
    ]
  }
};

// Export the templates
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Templates;
}