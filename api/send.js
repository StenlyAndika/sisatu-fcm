import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed v1" });
  }

  const { title, body } = req.body;

  try {
    // Auth with Google service account
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
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
