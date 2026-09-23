(function () {
  'use strict';

  var App = {
    currentView: 'tasks',

    init: function () {
      this.bindNav();
      this.bindFAB();
      this.bindModal();
      this.initPetals();
      this.showView('tasks');
      Tasks.init();
      Categories.init();
      this.registerServiceWorker();
      Notifications.init();
      Backup.init();
      this.checkLaunchAction();
    },

    bindNav: function () {
      var self = this;
      document.querySelectorAll('.nav-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          self.showView(btn.dataset.view);
        });
      });
    },

    showView: function (viewName) {
      this.currentView = viewName;

      document.querySelectorAll('.nav-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.view === viewName);
      });

      document.querySelectorAll('.view').forEach(function (view) {
        view.classList.toggle('active', view.id === 'view-' + viewName);
      });
    },

    bindFAB: function () {
      var self = this;
      document.getElementById('fab-add').addEventListener('click', function () {
        if (self.currentView === 'tasks') {
          Tasks.openAddModal();
        } else if (self.currentView === 'categories') {
          Categories.openAddModal();
        }
      });
    },

    bindModal: function () {
      var overlay = document.getElementById('modal-overlay');
      var closeBtn = document.getElementById('modal-close');

      closeBtn.addEventListener('click', function () {
        UI.closeModal();
      });

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          UI.closeModal();
        }
      });
    },

    initPetals: function () {
      var container = document.getElementById('petals-container');
      var count = 8;

      for (var i = 0; i < count; i++) {
        var petal = document.createElement('div');
        petal.classList.add('petal');
        petal.classList.add(i % 2 === 0 ? 'drift-a' : 'drift-b');
        petal.style.left = (5 + Math.random() * 90) + '%';
        petal.style.animationDuration = (12 + Math.random() * 18) + 's';
        petal.style.animationDelay = (Math.random() * 15) + 's';
        var size = (6 + Math.random() * 10) + 'px';
        petal.style.width = size;
        petal.style.height = size;
        container.appendChild(petal);
      }
    },

    checkLaunchAction: function () {
      var params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'add-task') {
        Tasks.openAddModal();
        window.history.replaceState({}, '', window.location.pathname);
      }
    },

    registerServiceWorker: function () {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
          .then(function (reg) {
            console.log('SW registered:', reg.scope);
          })
          .catch(function (err) {
            console.warn('SW registration failed:', err);
          });
      }
    }
  };

  window.App = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });
})();
