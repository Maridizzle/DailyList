(function () {
  'use strict';

  var BACKUP_KEY = 'dailylist-last-backup';
  var WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  var Backup = {
    init: function () {
      this.bindButtons();
      this.checkWeeklyReminder();
    },

    bindButtons: function () {
      var self = this;
      var exportBtn = document.getElementById('backup-export');
      var importBtn = document.getElementById('backup-import');
      var fileInput = document.getElementById('backup-file');

      if (exportBtn) {
        exportBtn.addEventListener('click', function () {
          self.exportData();
        });
      }

      if (importBtn) {
        importBtn.addEventListener('click', function () {
          fileInput.click();
        });
      }

      if (fileInput) {
        fileInput.addEventListener('change', function (e) {
          var file = e.target.files[0];
          if (file) {
            self.importData(file);
          }
          fileInput.value = '';
        });
      }
    },

    exportData: function () {
      var self = this;

      Promise.all([
        DB.tasks.toArray(),
        DB.categories.toArray()
      ]).then(function (results) {
        var data = {
          version: 1,
          exportedAt: new Date().toISOString(),
          tasks: results[0],
          categories: results[1]
        };

        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');

        var date = new Date();
        var dateStr = date.getFullYear() + '-' +
          String(date.getMonth() + 1).padStart(2, '0') + '-' +
          String(date.getDate()).padStart(2, '0');

        a.href = url;
        a.download = 'dailylist-backup-' + dateStr + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        self.setLastBackup();
        self.hideReminder();
        self.showStatus('Backup saved!');
      }).catch(function (err) {
        console.error('Export error:', err);
        self.showStatus('Export failed. Please try again.');
      });
    },

    importData: function (file) {
      var self = this;
      var reader = new FileReader();

      reader.onload = function (e) {
        try {
          var data = JSON.parse(e.target.result);
        } catch (err) {
          self.showStatus('Invalid file. Please select a DailyList backup.');
          return;
        }

        if (!data.tasks || !data.categories || !Array.isArray(data.tasks) || !Array.isArray(data.categories)) {
          self.showStatus('Invalid backup format.');
          return;
        }

        var taskCount = data.tasks.length;
        var catCount = data.categories.length;
        var msg = 'This will replace all current data with:\n' +
          taskCount + ' task' + (taskCount !== 1 ? 's' : '') + '\n' +
          catCount + ' categor' + (catCount !== 1 ? 'ies' : 'y') + '\n\n' +
          'Continue?';

        if (!confirm(msg)) return;

        Promise.all([
          DB.tasks.clear(),
          DB.categories.clear()
        ]).then(function () {
          var cleanTasks = data.tasks.map(function (t) {
            var clean = Object.assign({}, t);
            delete clean.id;
            return clean;
          });
          var cleanCats = data.categories.map(function (c) {
            var clean = Object.assign({}, c);
            delete clean.id;
            return clean;
          });

          return Promise.all([
            DB.tasks.bulkAdd(cleanTasks),
            DB.categories.bulkAdd(cleanCats)
          ]);
        }).then(function () {
          self.showStatus('Restore complete!');
          Tasks.init();
          Categories.init();
        }).catch(function (err) {
          console.error('Import error:', err);
          self.showStatus('Restore failed. Please try again.');
        });
      };

      reader.readAsText(file);
    },

    getLastBackup: function () {
      try {
        var ts = localStorage.getItem(BACKUP_KEY);
        return ts ? parseInt(ts, 10) : 0;
      } catch (e) {
        return 0;
      }
    },

    setLastBackup: function () {
      try {
        localStorage.setItem(BACKUP_KEY, Date.now().toString());
      } catch (e) {}
    },

    checkWeeklyReminder: function () {
      var last = this.getLastBackup();
      var now = Date.now();

      if (last === 0 || (now - last) >= WEEK_MS) {
        var self = this;
        setTimeout(function () {
          self.showReminder();
        }, 3000);
      }
    },

    showReminder: function () {
      var overlay = document.getElementById('backup-reminder-overlay');
      if (!overlay) return;
      overlay.hidden = false;

      var self = this;

      document.getElementById('backup-now-btn').addEventListener('click', function () {
        overlay.hidden = true;
        self.exportData();
      });

      document.getElementById('backup-later-btn').addEventListener('click', function () {
        overlay.hidden = true;
      });
    },

    hideReminder: function () {
      var overlay = document.getElementById('backup-reminder-overlay');
      if (overlay) overlay.hidden = true;
    },

    showStatus: function (msg) {
      var el = document.getElementById('backup-status');
      if (!el) return;
      el.textContent = msg;
      el.hidden = false;
      setTimeout(function () {
        el.hidden = true;
      }, 3000);
    }
  };

  window.Backup = Backup;
})();
