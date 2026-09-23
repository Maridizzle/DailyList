const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

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

exports.saveReminder = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  var { reminderId, taskName, reminderDate, token } = req.body;
  if (!reminderId || !taskName || !reminderDate || !token) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    await db.collection("reminders").doc(reminderId).set({
      taskName: taskName,
      reminderDate: new Date(reminderDate),
      token: token,
      sent: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, id: reminderId });
  } catch (err) {
    console.error("Save reminder error:", err);
    res.status(500).json({ error: err.message });
  }
});

exports.deleteReminder = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  var { reminderId } = req.body;
  if (!reminderId) {
    res.status(400).json({ error: "Missing reminderId" });
    return;
  }

  try {
    await db.collection("reminders").doc(reminderId).delete();
    res.json({ success: true });
  } catch (err) {
    console.error("Delete reminder error:", err);
    res.status(500).json({ error: err.message });
  }
});

exports.checkReminders = onSchedule(
  {
    schedule: "* * * * *",
    timeZone: "America/Los_Angeles",
  },
  async () => {
    var now = new Date();

    try {
      var snapshot = await db
        .collection("reminders")
        .where("sent", "==", false)
        .where("reminderDate", "<=", now)
        .get();

      if (snapshot.empty) return;

      var batch = db.batch();
      var sendPromises = [];

      snapshot.forEach(function (doc) {
        var data = doc.data();

        var message = {
          token: data.token,
          notification: {
            title: "DailyList Reminder",
            body: data.taskName,
          },
          webpush: {
            notification: {
              icon: "/DailyList/icons/icon-192.png",
              actions: [{ action: "add-task", title: "Open App" }],
            },
          },
        };

        sendPromises.push(
          admin
            .messaging()
            .send(message)
            .then(function () {
              console.log("Reminder sent:", data.taskName);
            })
            .catch(function (err) {
              console.error("Reminder send failed:", data.taskName, err.message);
            })
        );

        batch.delete(doc.ref);
      });

      await Promise.all(sendPromises);
      await batch.commit();
      console.log("Processed", snapshot.size, "reminders");
    } catch (err) {
      console.error("Check reminders error:", err);
    }
  }
);
