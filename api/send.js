import { google } from "googleapis";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://sisatu-fcm.vercel.app/api/send');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Input validation
  const { title, body } = req.body;
  if (!title && !body) {
    return res.status(400).json({ error: "Title or body is required" });
  }

  try {
    // Auth with Google service account
    const jwtClient = new google.auth.JWT(
      process.env.FIREBASE_CLIENT_EMAIL,
      null,
      process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/firebase.messaging"],
      null
    );

    await jwtClient.authorize();
    const token = await jwtClient.getAccessToken();

    // Send message via FCM v1 API
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            topic: "news",
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

    const data = await response.json();

    // Check if FCM request was successful
    if (!response.ok) {
      console.error('FCM Error:', data);
      return res.status(500).json({ error: "Failed to send notification" });
    }

    res.status(200).json({ success: true, messageId: data.name });
  } catch (error) {
    console.error('Push notification error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}
