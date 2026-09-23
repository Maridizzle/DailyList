importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC1S7g3Z-X9Y7vDEP0cTF01w5ZuP4caRyE",
  authDomain: "daily-list-2c6be.firebaseapp.com",
  projectId: "daily-list-2c6be",
  storageBucket: "daily-list-2c6be.firebasestorage.app",
  messagingSenderId: "32864317301",
  appId: "1:32864317301:web:1e0c8ba7767a58e8062d3c"
});

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  var title = 'DailyList';
  var body = 'A new day blooms. What will you tend to today?';

  if (payload.notification) {
    title = payload.notification.title || title;
    body = payload.notification.body || body;
  }

  return self.registration.showNotification(title, {
    body: body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    actions: [
      { action: 'add-task', title: 'Add Task' }
    ],
    data: {
      url: '/DailyList/?action=add-task'
    }
  });
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var url = '/DailyList/';
  if (event.action === 'add-task') {
    url = '/DailyList/?action=add-task';
  } else if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.indexOf('/DailyList') !== -1 && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
