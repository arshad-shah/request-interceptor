// templates.js - Create this file in your extension folder

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
      }
    ]
  },
  
  // CRUD API template
  crud: {
    routes: [
      {
        method: "GET",
        url: "/api/users",
        status: 200,
        delay: 300,
        contentType: "application/json",
        response: {
          users: [
            { id: 1, name: "John Doe", email: "john@example.com" },
            { id: 2, name: "Jane Smith", email: "jane@example.com" },
            { id: 3, name: "Bob Johnson", email: "bob@example.com" }
          ],
          pagination: {
            total: 3,
            page: 1,
            limit: 10
          }
        }
      },
      {
        method: "GET",
        url: "/api/users/1",
        status: 200,
        delay: 150,
        contentType: "application/json",
        response: {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          role: "admin",
          created_at: "2023-01-15T08:30:00Z"
        }
      },
      {
        method: "POST",
        url: "/api/users",
        status: 201,
        delay: 350,
        contentType: "application/json",
        response: {
          id: 4,
          name: "New User",
          email: "newuser@example.com",
          success: true,
          message: "User created successfully"
        }
      },
      {
        method: "PUT",
        url: "/api/users/1",
        status: 200,
        delay: 300,
        contentType: "application/json",
        response: {
          id: 1,
          success: true,
          message: "User updated successfully"
        }
      },
      {
        method: "DELETE",
        url: "/api/users/2",
        status: 200,
        delay: 250,
        contentType: "application/json",
        response: {
          success: true,
          message: "User deleted successfully"
        }
      }
    ]
  },
  
  // Authentication API template
  auth: {
    routes: [
      {
        method: "POST",
        url: "/api/auth/login",
        status: 200,
        delay: 400,
        contentType: "application/json",
        response: {
          success: true,
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImlhdCI6MTYxNjc2MzM3NH0.HksDQ",
          user: {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            role: "admin"
          }
        }
      },
      {
        method: "POST",
        url: "/api/auth/register",
        status: 201,
        delay: 500,
        contentType: "application/json",
        response: {
          success: true,
          message: "User registered successfully",
          user: {
            id: 5,
            name: "New User",
            email: "newuser@example.com"
          }
        }
      },
      {
        method: "POST",
        url: "/api/auth/logout",
        status: 200,
        delay: 200,
        contentType: "application/json",
        response: {
          success: true,
          message: "Logged out successfully"
        }
      },
      {
        method: "GET",
        url: "/api/auth/me",
        status: 200,
        delay: 250,
        contentType: "application/json",
        response: {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          role: "admin",
          preferences: {
            theme: "light",
            notifications: true
          }
        }
      },
      {
        method: "POST",
        url: "/api/auth/refresh",
        status: 200,
        delay: 300,
        contentType: "application/json",
        response: {
          success: true,
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImlhdCI6MTYxNjc2MzM3NH0.REFRESHED",
        }
      }
    ]
  },
  
  // E-commerce API template
  ecommerce: {
    routes: [
      {
        method: "GET",
        url: "/api/products",
        status: 200,
        delay: 400,
        contentType: "application/json",
        response: {
          products: [
            { 
              id: 1, 
              name: "Smartphone X",
              price: 699.99,
              category: "Electronics",
              rating: 4.5,
              in_stock: true
            },
            { 
              id: 2, 
              name: "Wireless Headphones",
              price: 149.99,
              category: "Electronics",
              rating: 4.2,
              in_stock: true
            },
            { 
              id: 3, 
              name: "Fitness Tracker",
              price: 89.99,
              category: "Electronics",
              rating: 3.9,
              in_stock: false
            }
          ],
          pagination: {
            total: 45,
            page: 1,
            limit: 10
          }
        }
      },
      {
        method: "GET",
        url: "/api/products/1",
        status: 200,
        delay: 300,
        contentType: "application/json",
        response: {
          id: 1,
          name: "Smartphone X",
          description: "Latest smartphone with incredible features and performance.",
          price: 699.99,
          category: "Electronics",
          rating: 4.5,
          in_stock: true,
          images: [
            "https://example.com/smartphone_x_1.jpg",
            "https://example.com/smartphone_x_2.jpg"
          ],
          specifications: {
            screen: "6.5 inch AMOLED",
            processor: "Octa-core 2.8GHz",
            camera: "48MP + 12MP + 8MP",
            battery: "4500mAh"
          }
        }
      },
      {
        method: "POST",
        url: "/api/cart/add",
        status: 200,
        delay: 350,
        contentType: "application/json",
        response: {
          success: true,
          message: "Product added to cart",
          cart: {
            items: [
              {
                product_id: 1,
                name: "Smartphone X",
                price: 699.99,
                quantity: 1,
                total: 699.99
              }
            ],
            subtotal: 699.99,
            tax: 70.00,
            total: 769.99
          }
        }
      },
      {
        method: "GET",
        url: "/api/cart",
        status: 200,
        delay: 250,
        contentType: "application/json",
        response: {
          items: [
            {
              product_id: 1,
              name: "Smartphone X",
              price: 699.99,
              quantity: 1,
              total: 699.99
            },
            {
              product_id: 2,
              name: "Wireless Headphones",
              price: 149.99,
              quantity: 1,
              total: 149.99
            }
          ],
          subtotal: 849.98,
          tax: 85.00,
          shipping: 15.00,
          total: 949.98
        }
      },
      {
        method: "POST",
        url: "/api/orders",
        status: 201,
        delay: 550,
        contentType: "application/json",
        response: {
          success: true,
          order_id: "ORD-12345",
          message: "Order placed successfully",
          order: {
            id: "ORD-12345",
            date: "2023-04-15T14:32:21Z",
            status: "Processing",
            items: [
              {
                product_id: 1,
                name: "Smartphone X",
                price: 699.99,
                quantity: 1,
                total: 699.99
              },
              {
                product_id: 2,
                name: "Wireless Headphones",
                price: 149.99,
                quantity: 1,
                total: 149.99
              }
            ],
            subtotal: 849.98,
            tax: 85.00,
            shipping: 15.00,
            total: 949.98,
            shipping_address: {
              name: "John Doe",
              street: "123 Main St",
              city: "Anytown",
              zip: "12345",
              country: "USA"
            },
            payment_method: "Credit Card"
          }
        }
      }
    ]
  }
};

// Export the templates
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Templates;
}