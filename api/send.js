import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, body } = req.body;

  try {
    // Parse the service account JSON from Vercel env
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

    // Create JWT client with Firebase messaging scope
    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      ["https://www.googleapis.com/auth/firebase.messaging"]
    );

    // Authorize and get access token
    const tokens = await jwtClient.authorize();
    const accessToken = tokens.access_token;

    // Firebase Project ID (from service account JSON)
    const projectId = serviceAccount.project_id;

    // Send message using HTTP v1
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            topic: "news", // all devices subscribed to topic "news"
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
    console.error("Error sending FCM:", error);
    res.status(500).json({ error: error.message });
  }
}
