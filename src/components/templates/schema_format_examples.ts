const complete_template = {
  "routes": [
    {
      "routeType": "http",
      "method": "GET",
      "url": "/api/users",
      "name": "Get Users",
      "status": 200,
      "delay": 300,
      "contentType": "application/json",
      "enabled": true,
      "headersOnly": false,
      "response": {
        "users": [
          {"id": 1, "name": "John Doe"},
          {"id": 2, "name": "Jane Smith"}
        ]
      },
      "responseHeaders": {
        "Access-Control-Allow-Origin": "*",
        "X-API-Version": "1.0"
      },
      "requestHeaders": {
        "Authorization": "Bearer test-token"
      },
      "removeRequestHeaders": ["Cookie"]
    },
    {
      "routeType": "websocket",
      "url": "wss://api.example.com/chat",
      "name": "Chat Filter",
      "delay": 100,
      "enabled": true,
      "incomingRules": [
        {
          "id": "replace-username",
          "enabled": true,
          "type": "replace",
          "matchType": "regex",
          "match": '\\"username\\":\\"([^"]+)\\"',
          "replacement": '\\"username\\":\\"TestUser\\"',
          "flags": "g",
          "description": "Replace usernames with TestUser"
        }
      ],
      "outgoingRules": [
        {
          "id": "block-spam",
          "enabled": true,
          "type": "block",
          "matchType": "contains",
          "match": "SPAM",
          "description": "Block spam messages"
        }
      ]
    }
  ]
};

export {
  complete_template
}