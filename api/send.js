export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const serverKey = process.env.FCM_SERVER_KEY; // stored safely in Vercel
  const { title, body } = req.body;

  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "key=" + serverKey,
      },
      body: JSON.stringify({
        to: "/topics/news", // send to all users subscribed to "news"
        notification: {
          title: title || "New Update",
          body: body || "Check the app for details",
        },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      }),
    });

    const data = await response.json();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
