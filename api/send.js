import { google } from "googleapis";

export default async function handler(req, res) {
  // Set CORS headers - IMPORTANT: Set these FIRST, before any other logic
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { title, body, bidang } = req.body || {};

    if (!title && !body) {
      return res.status(400).json({ error: "At least title or body is required" });
    }

    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_PROJECT_ID) {
      console.error('Missing Firebase environment variables');
      return res.status(500).json({ error: "Server configuration error" });
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
            topic: "guests",
            data: {
              title: title || "New Update",
              body: body || "Check the app for details",
              bidang: bidang || "sekretariat",
            },
          },
        }),
      }
    );

    const fcmData = await fcmResponse.json();

    if (!fcmResponse.ok) {
      console.error('FCM Error:', fcmData);
      return res.status(500).json({
        error: "Failed to send notification",
        details: fcmData.error?.message || "Unknown FCM error"
      });
    }

    res.status(200).json({
      success: true,
      messageId: fcmData.name,
      message: "Notification sent successfully"
    });

  } catch (error) {
    console.error('Push notification error:', error);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === 'development' ? error.message : "Something went wrong"
    });
  }
}
