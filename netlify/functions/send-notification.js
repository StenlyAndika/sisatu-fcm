import { google } from "googleapis";

export async function handler(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed. Use POST." })
    };
  }

  try {
    const { title, body, bidang } = JSON.parse(event.body || '{}');

    if (!title && !body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "At least title or body is required" })
      };
    }

    if (!process.env.FIREBASE_CLIENT_EMAIL ||
        !process.env.FIREBASE_PRIVATE_KEY ||
        !process.env.FIREBASE_PROJECT_ID) {
      console.error('Missing Firebase environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server configuration error" })
      };
    }

    const jwtClient = new google.auth.JWT(
      process.env.FIREBASE_CLIENT_EMAIL,
      null,
      process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/firebase.messaging"],
      null
    );

    await jwtClient.authorize();
    const token = await jwtClient.getAccessToken();

    // Send message via FCM v1 API
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            topic: bidang,
            notification: {
              title: title || "New Update",
              body: body || "Check the app for details",
            },
            data: {
              click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
          },
        }),
      }
    );

    const fcmData = await fcmResponse.json();

    if (!fcmResponse.ok) {
      console.error('FCM Error:', fcmData);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to send notification",
          details: fcmData.error?.message || "Unknown FCM error"
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messageId: fcmData.name,
        message: "Notification sent successfully from fcm"
      })
    };

  } catch (error) {
    console.error('Push notification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message
      })
    };
  }
}
