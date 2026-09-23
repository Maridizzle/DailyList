const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.subscribe = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  var token = req.body.token;
  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }

  try {
    await admin.messaging().subscribeToTopic(token, "morning-reminder");
    res.json({ success: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: err.message });
  }
});

var morningMessages = [
  "A new day blooms. What will you tend to today?",
  "The morning is quiet. A good time to set your intentions.",
  "Cherry blossoms remind us: beauty lives in small, daily things.",
  "What gentle progress will today bring?",
  "One task at a time. You have everything you need.",
  "Breathe in. The day is yours to shape.",
  "Even the longest journey starts with a single step. What is yours today?"
];

exports.morningReminder = onSchedule(
  {
    schedule: "0 6 * * *",
    timeZone: "America/Los_Angeles",
  },
  async () => {
    var body =
      morningMessages[Math.floor(Math.random() * morningMessages.length)];

    try {
      await admin.messaging().send({
        topic: "morning-reminder",
        notification: {
          title: "DailyList",
          body: body,
        },
        webpush: {
          notification: {
            icon: "/DailyList/icons/icon-192.png",
            actions: [{ action: "add-task", title: "Add Task" }],
          },
        },
      });
      console.log("Morning reminder sent:", body);
    } catch (err) {
      console.error("Send error:", err);
    }
  }
);
