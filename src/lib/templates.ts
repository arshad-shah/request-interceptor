// Enhanced templates with headers examples

import { Template } from "@/types";

const templates: Record<string, Template> = {
  "Basic API": {
    routes: [
      {
        method: "GET",
        url: "/api/data",
        status: 200,
        delay: 200,
        name: "Success Response",
        contentType: "application/json",
        response: {
          success: true,
          data: [
            { id: 1, name: "Item 1" },
            { id: 2, name: "Item 2" },
            { id: 3, name: "Item 3" }
          ]
        },
        responseHeaders: {
          "Cache-Control": "max-age=3600",
          "X-API-Version": "1.0"
        }
      },
      {
        method: "GET",
        url: "/api/stats",
        status: 200,
        delay: 300,
        name: "Stats Data",
        contentType: "application/json",
        response: {
          totalUsers: 1250,
          activeUsers: 834,
          conversionRate: "12.5%"
        },
        responseHeaders: {
          "Cache-Control": "no-cache",
          "X-Real-Time": "true"
        }
      }
    ]
  },
  "CRUD API": {
    routes: [
      {
        method: "GET",
        url: "/api/users",
        status: 200,
        delay: 300,
        name: "Get All Users",
        contentType: "application/json",
        response: {
          users: [
            { id: 1, name: "John Doe", email: "john@example.com" },
            { id: 2, name: "Jane Smith", email: "jane@example.com" }
          ],
          total: 2
        },
        responseHeaders: {
          "X-Total-Count": "2",
          "Access-Control-Allow-Origin": "*"
        }
      },
      {
        method: "POST",
        url: "/api/users",
        status: 201,
        delay: 500,
        name: "Create User",
        contentType: "application/json",
        response: {
          id: 3,
          name: "New User",
          email: "new@example.com",
          created: true
        },
        responseHeaders: {
          "Location": "/api/users/3",
          "X-Created-At": new Date().toISOString()
        },
        requestHeaders: {
          "X-Request-ID": "req-12345"
        }
      },
      {
        method: "PUT",
        url: "/api/users/*",
        status: 200,
        delay: 400,
        name: "Update User",
        contentType: "application/json",
        response: {
          id: 1,
          name: "Updated User",
          email: "updated@example.com",
          updated: true
        },
        responseHeaders: {
          "X-Updated-At": new Date().toISOString(),
          "ETag": '"33a64df551"'
        }
      },
      {
        method: "DELETE",
        url: "/api/users/*",
        status: 204,
        delay: 300,
        name: "Delete User",
        contentType: "application/json",
        response: { deleted: true },
        responseHeaders: {
          "X-Deleted-At": new Date().toISOString()
        }
      }
    ]
  },
  "Authentication API": {
    routes: [
      {
        method: "POST",
        url: "/api/auth/login",
        status: 200,
        delay: 800,
        name: "Login Success",
        contentType: "application/json",
        response: {
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          user: {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            role: "user"
          },
          expiresIn: 3600
        },
        responseHeaders: {
          "Set-Cookie": "sessionId=abc123; HttpOnly; Secure; SameSite=Strict",
          "X-Auth-Token": "bearer-token-123",
          "Cache-Control": "no-store"
        },
        removeRequestHeaders: ["Authorization"]
      },
      {
        method: "POST",
        url: "/api/auth/register",
        status: 201,
        delay: 1000,
        name: "Register Success",
        contentType: "application/json",
        response: {
          message: "User created successfully",
          user: {
            id: 2,
            name: "New User",
            email: "new@example.com"
          }
        },
        responseHeaders: {
          "Location": "/api/users/2",
          "X-Welcome-Email": "sent"
        }
      },
      {
        method: "POST",
        url: "/api/auth/logout",
        status: 200,
        delay: 200,
        name: "Logout",
        contentType: "application/json",
        response: { message: "Logged out successfully" },
        responseHeaders: {
          "Set-Cookie": "sessionId=; expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly",
          "Clear-Site-Data": '"cache", "cookies", "storage"'
        }
      }
    ]
  },
  "E-commerce API": {
    routes: [
      {
        method: "GET",
        url: "/api/products",
        status: 200,
        delay: 400,
        name: "Get Products",
        contentType: "application/json",
        response: {
          products: [
            {
              id: 1,
              name: "Laptop",
              price: 999.99,
              category: "Electronics",
              inStock: true
            },
            {
              id: 2,
              name: "Phone",
              price: 599.99,
              category: "Electronics",
              inStock: false
            }
          ],
          total: 2,
          page: 1,
          limit: 10
        },
        responseHeaders: {
          "X-Total-Count": "2",
          "X-Page": "1",
          "X-Page-Size": "10",
          "Cache-Control": "public, max-age=300"
        }
      },
      {
        method: "POST",
        url: "/api/cart/add",
        status: 200,
        delay: 300,
        name: "Add to Cart",
        contentType: "application/json",
        response: {
          message: "Item added to cart",
          cartItems: 3,
          total: 1599.98
        },
        responseHeaders: {
          "X-Cart-Items": "3",
          "X-Cart-Total": "1599.98"
        },
        requestHeaders: {
          "X-User-Session": "session-123",
          "X-Cart-ID": "cart-456"
        }
      },
      {
        method: "POST",
        url: "/api/orders",
        status: 201,
        delay: 800,
        name: "Create Order",
        contentType: "application/json",
        response: {
          orderId: "ORD-12345",
          status: "confirmed",
          total: 1599.98,
          estimatedDelivery: "2024-01-15"
        },
        responseHeaders: {
          "Location": "/api/orders/ORD-12345",
          "X-Order-ID": "ORD-12345",
          "X-Processing-Time": "750ms"
        }
      }
    ]
  },
  "CORS Testing": {
    routes: [
      {
        method: "OPTIONS",
        url: "/api/*",
        status: 204,
        delay: 50,
        name: "CORS Preflight",
        contentType: "text/plain",
        response: "",
        responseHeaders: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "86400"
        }
      },
      {
        method: "GET",
        url: "/api/cors-test",
        status: 200,
        delay: 200,
        name: "CORS Test Endpoint",
        contentType: "application/json",
        response: {
          message: "CORS test successful",
          origin: "https://example.com"
        },
        responseHeaders: {
          "Access-Control-Allow-Origin": "https://trusted-domain.com",
          "Access-Control-Allow-Credentials": "true",
          "Vary": "Origin"
        }
      }
    ]
  },
  "Error Simulation": {
    routes: [
      {
        method: "GET",
        url: "/api/slow-endpoint",
        status: 200,
        delay: 5000,
        name: "Slow Response",
        contentType: "application/json",
        response: {
          message: "This took a while to load",
          processingTime: "5000ms"
        },
        responseHeaders: {
          "X-Response-Time": "5000ms",
          "Server-Timing": "total;dur=5000"
        }
      },
      {
        method: "GET",
        url: "/api/rate-limited",
        status: 429,
        delay: 100,
        name: "Rate Limited",
        contentType: "application/json",
        response: {
          error: "Too Many Requests",
          retryAfter: 60
        },
        responseHeaders: {
          "Retry-After": "60",
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": "1640995200"
        }
      },
      {
        method: "POST",
        url: "/api/server-error",
        status: 500,
        delay: 200,
        name: "Server Error",
        contentType: "application/json",
        response: {
          error: "Internal Server Error",
          message: "Something went wrong on our end"
        },
        responseHeaders: {
          "X-Error-ID": "ERR-12345",
          "Retry-After": "30"
        }
      }
    ]
  },
  "Security Testing": {
    routes: [
      {
        method: "GET",
        url: "/api/secure-data",
        status: 401,
        delay: 200,
        name: "Unauthorized Access",
        contentType: "application/json",
        response: {
          error: "Unauthorized",
          message: "Valid authentication required"
        },
        responseHeaders: {
          "WWW-Authenticate": 'Bearer realm="API"',
          "X-Auth-Required": "true"
        },
        removeRequestHeaders: ["Authorization", "Cookie"]
      },
      {
        method: "GET",
        url: "/api/admin/*",
        status: 403,
        delay: 150,
        name: "Forbidden Access",
        contentType: "application/json",
        response: {
          error: "Forbidden",
          message: "Insufficient permissions"
        },
        responseHeaders: {
          "X-Permission-Required": "admin",
          "X-Access-Denied": "true"
        }
      },
      {
        method: "GET",
        url: "/api/with-auth",
        status: 200,
        delay: 300,
        name: "Authenticated Request",
        contentType: "application/json",
        response: {
          message: "Access granted",
          user: "authenticated-user"
        },
        requestHeaders: {
          "Authorization": "Bearer fake-token-12345"
        },
        responseHeaders: {
          "X-User-Role": "user",
          "X-Token-Valid": "true"
        }
      }
    ]
  }
};

export default templates;