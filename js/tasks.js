(function () {
  'use strict';

  var PRIORITY_ORDER = { urgent: 0, later: 1, someday: 2 };

  var Tasks = {
    init: function () {
      this.processRecurring();
    },

    add: function (taskData) {
      taskData.completed = false;
      taskData.createdAt = new Date().toISOString();
      return DB.tasks.add(taskData).then(function () {
        Tasks.renderList();
      });
    },

    update: function (id, taskData) {
      return DB.tasks.update(id, taskData).then(function () {
        Tasks.renderList();
      });
    },

    remove: function (id) {
      return DB.tasks.delete(id).then(function () {
        Tasks.renderList();
      });
    },

    toggleComplete: function (id) {
      return DB.tasks.get(id).then(function (task) {
        if (!task) return;

        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;

        return DB.tasks.update(id, {
          completed: task.completed,
          completedAt: task.completedAt
        }).then(function () {
          if (task.completed && task.recurring) {
            return Tasks.spawnNextRecurrence(task);
          }
        }).then(function () {
          Tasks.renderList();
        });
      });
    },

    spawnNextRecurrence: function (task) {
      var nextDate = this.calculateNextDate(task.dueDate, task.recurring);
      if (!nextDate) return Promise.resolve();

      return DB.tasks.add({
        title: task.title,
        categoryId: task.categoryId,
        priority: task.priority,
        dueDate: nextDate,
        recurring: task.recurring,
        notes: task.notes,
        completed: false,
        createdAt: new Date().toISOString()
      });
    },

    calculateNextDate: function (dateStr, recurring) {
      if (!dateStr) return null;
      var d = new Date(dateStr + 'T00:00:00');

      switch (recurring) {
        case 'daily':    d.setDate(d.getDate() + 1); break;
        case 'weekly':   d.setDate(d.getDate() + 7); break;
        case 'biweekly': d.setDate(d.getDate() + 14); break;
        case 'monthly':  d.setMonth(d.getMonth() + 1); break;
        case 'yearly':   d.setFullYear(d.getFullYear() + 1); break;
        default: return null;
      }

      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    },

    processRecurring: function () {
      var self = this;
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var todayStr = today.toISOString().split('T')[0];

      return DB.tasks.toArray().then(function (tasks) {
        var updates = [];

        for (var i = 0; i < tasks.length; i++) {
          var task = tasks[i];
          if (!task.recurring || !task.dueDate || task.completed) continue;

          if (task.dueDate < todayStr) {
            var nextDate = task.dueDate;
            while (nextDate < todayStr) {
              var calculated = self.calculateNextDate(nextDate, task.recurring);
              if (!calculated) break;
              nextDate = calculated;
            }
            if (nextDate && nextDate !== task.dueDate) {
              updates.push({ id: task.id, dueDate: nextDate });
            }
          }
        }

        var chain = Promise.resolve();
        updates.forEach(function (u) {
          chain = chain.then(function () {
            return DB.tasks.update(u.id, { dueDate: u.dueDate });
          });
        });
        return chain;
      }).then(function () {
        self.renderList();
      });
    },

    getAll: function () {
      return DB.tasks.toArray().then(function (tasks) {
        tasks.sort(function (a, b) {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;

          var pa = PRIORITY_ORDER[a.priority] !== undefined ? PRIORITY_ORDER[a.priority] : 2;
          var pb = PRIORITY_ORDER[b.priority] !== undefined ? PRIORITY_ORDER[b.priority] : 2;
          if (pa !== pb) return pa - pb;

          if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;

          return 0;
        });

        return tasks;
      });
    },

    renderList: function () {
      return Promise.all([
        this.getAll(),
        DB.categories.toArray()
      ]).then(function (results) {
        var tasks = results[0];
        var categories = results[1];

        var catMap = {};
        categories.forEach(function (c) { catMap[c.id] = c; });

        var container = document.getElementById('task-list');
        var empty = document.getElementById('empty-tasks');

        if (tasks.length === 0) {
          container.innerHTML = '';
          empty.style.display = '';
          return;
        }

        empty.style.display = 'none';
        var html = '';
        for (var i = 0; i < tasks.length; i++) {
          html += UI.renderTaskCard(tasks[i], catMap[tasks[i].categoryId] || null);
        }
        container.innerHTML = html;
        Tasks.bindCardEvents();
      });
    },

    bindCardEvents: function () {
      var self = this;

      document.querySelectorAll('.task-checkbox').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          self.toggleComplete(Number(btn.dataset.id));
        });
      });

      document.querySelectorAll('.task-card').forEach(function (card) {
        card.addEventListener('click', function () {
          self.openEditModal(Number(card.dataset.id));
        });
      });
    },

    openEditModal: function (id) {
      return DB.tasks.get(id).then(function (task) {
        if (!task) return;
        UI.openTaskModal(task);
        return Categories.populateDropdown('task-category', task.categoryId).then(function () {
          Tasks.bindFormSubmit(id);
        });
      });
    },

    openAddModal: function () {
      UI.openTaskModal();
      return Categories.populateDropdown('task-category').then(function () {
        Tasks.bindFormSubmit(null);
      });
    },

    bindFormSubmit: function (editId) {
      var self = this;
      var form = document.getElementById('task-form');
      if (!form) return;

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var selected = document.querySelector('.priority-option.selected');
        var catVal = document.getElementById('task-category').value;
        var taskData = {
          title: document.getElementById('task-name').value.trim(),
          categoryId: catVal ? Number(catVal) : null,
          priority: selected ? selected.dataset.priority : 'later',
          dueDate: document.getElementById('task-due').value || null,
          recurring: document.getElementById('task-recurring').value || '',
          notes: document.getElementById('task-notes').value.trim()
        };

        if (!taskData.title) return;

        if (editId) {
          self.update(editId, taskData);
        } else {
          self.add(taskData);
        }
        UI.closeModal();
      });

      var deleteBtn = document.getElementById('delete-task');
      if (deleteBtn && editId) {
        deleteBtn.addEventListener('click', function () {
          if (confirm('Delete this task?')) {
            self.remove(editId);
            UI.closeModal();
          }
        });
      }
    }
  };

  window.Tasks = Tasks;
})();
