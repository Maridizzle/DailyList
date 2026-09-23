(function () {
  'use strict';

  var Notifications = {
    messaging: null,

    init: function () {
      if (this.hasDecided()) {
        if (Notification.permission === 'granted') {
          this.initFirebase();
          this.getToken();
        }
        return;
      }

      var self = this;
      setTimeout(function () {
        self.showOnboarding();
      }, 2000);
    },

    hasDecided: function () {
      try {
        return localStorage.getItem('dailylist-notif-decided') === 'true';
      } catch (e) {
        return false;
      }
    },

    setDecided: function () {
      try {
        localStorage.setItem('dailylist-notif-decided', 'true');
      } catch (e) {}
    },

    showOnboarding: function () {
      var overlay = document.getElementById('onboarding-overlay');
      if (!overlay) return;
      overlay.hidden = false;

      var self = this;

      document.getElementById('enable-notifications').addEventListener('click', function () {
        overlay.hidden = true;
        self.setDecided();
        self.requestPermission();
      });

      document.getElementById('skip-notifications').addEventListener('click', function () {
        overlay.hidden = true;
        self.setDecided();
      });
    },

    initFirebase: function () {
      if (this.messaging) return this.messaging;

      if (typeof firebase === 'undefined' || !firebase.messaging) {
        console.warn('Firebase SDK not loaded');
        return null;
      }

      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      this.messaging = firebase.messaging();
      return this.messaging;
    },

    requestPermission: function () {
      var self = this;

      if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return;
      }

      Notification.requestPermission().then(function (permission) {
        if (permission === 'granted') {
          self.initFirebase();
          self.getToken();
        }
      });
    },

    getToken: function () {
      var messaging = this.messaging || this.initFirebase();
      if (!messaging) return;

      navigator.serviceWorker.ready.then(function (registration) {
        messaging.getToken({
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        }).then(function (token) {
          if (token) {
            console.log('FCM Token (use this for your 6am cron):');
            console.log(token);
            try {
              localStorage.setItem('dailylist-fcm-token', token);
            } catch (e) {}
          }
        }).catch(function (err) {
          console.warn('FCM token error:', err);
        });
      });

      messaging.onMessage(function (payload) {
        var title = 'DailyList';
        var body = 'Time to plan your day';

        if (payload.notification) {
          title = payload.notification.title || title;
          body = payload.notification.body || body;
        }

        if (Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(function (reg) {
            reg.showNotification(title, {
              body: body,
              icon: 'icons/icon-192.png',
              actions: [{ action: 'add-task', title: 'Add Task' }]
            });
          });
        }
      });
    }
  };

  window.Notifications = Notifications;
})();
