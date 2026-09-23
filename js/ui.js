(function () {
  'use strict';

  var UI = {
    openModal: function (title, contentHTML) {
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-body').innerHTML = contentHTML;
      document.getElementById('modal-overlay').classList.add('active');
      document.body.style.overflow = 'hidden';
    },

    closeModal: function () {
      document.getElementById('modal-overlay').classList.remove('active');
      document.body.style.overflow = '';
    },

    openTaskModal: function (task) {
      var isEdit = !!task;
      var title = isEdit ? 'Edit Task' : 'Add Task';

      var html =
        '<form id="task-form">' +
          '<div class="form-group">' +
            '<label class="form-label" for="task-name">Task name</label>' +
            '<input class="form-input" type="text" id="task-name" placeholder="What needs doing?" required value="' + (isEdit ? this.escapeHTML(task.title) : '') + '">' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label" for="task-category">Category</label>' +
            '<select class="form-select" id="task-category">' +
              '<option value="">None</option>' +
            '</select>' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label">Priority</label>' +
            '<div class="priority-selector">' +
              '<button type="button" class="priority-option' + (isEdit && task.priority === 'urgent' ? ' selected' : '') + '" data-priority="urgent">' +
                '<span class="priority-kanji">急</span>' +
                '<span class="priority-label">Urgent</span>' +
              '</button>' +
              '<button type="button" class="priority-option' + ((!isEdit || isEdit && task.priority === 'later') ? ' selected' : '') + '" data-priority="later">' +
                '<span class="priority-kanji">後で</span>' +
                '<span class="priority-label">Later</span>' +
              '</button>' +
              '<button type="button" class="priority-option' + (isEdit && task.priority === 'someday' ? ' selected' : '') + '" data-priority="someday">' +
                '<span class="priority-kanji">いつか</span>' +
                '<span class="priority-label">Someday</span>' +
              '</button>' +
            '</div>' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label" for="task-due">Due date</label>' +
            '<input class="form-input" type="text" id="task-due" placeholder="Pick a date" readonly>' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label" for="task-recurring">Recurring</label>' +
            '<select class="form-select" id="task-recurring">' +
              '<option value="">None</option>' +
              '<option value="daily">Daily</option>' +
              '<option value="weekly">Weekly</option>' +
              '<option value="biweekly">Biweekly</option>' +
              '<option value="monthly">Monthly</option>' +
              '<option value="yearly">Yearly</option>' +
            '</select>' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label" for="task-notes">Notes</label>' +
            '<textarea class="form-textarea" id="task-notes" placeholder="Optional notes...">' + (isEdit ? this.escapeHTML(task.notes || '') : '') + '</textarea>' +
          '</div>' +

          '<button type="submit" class="btn btn-primary" style="width:100%">' + (isEdit ? 'Update Task' : 'Save Task') + '</button>' +
          (isEdit ? '<button type="button" class="btn btn-danger" id="delete-task" style="width:100%">Delete Task</button>' : '') +
        '</form>';

      this.openModal(title, html);
      this.bindPrioritySelector();
      this.initDatePicker('task-due', isEdit ? task.dueDate : null);

      if (isEdit) {
        var recurringEl = document.getElementById('task-recurring');
        if (recurringEl) recurringEl.value = task.recurring || '';
      }
    },

    openCategoryModal: function (category) {
      var isEdit = !!category;
      var title = isEdit ? 'Edit Category' : 'New Category';

      var html =
        '<form id="category-form">' +
          '<div class="form-group">' +
            '<label class="form-label" for="cat-name">Category name</label>' +
            '<input class="form-input" type="text" id="cat-name" placeholder="e.g. Work, Health, Home" required value="' + (isEdit ? this.escapeHTML(category.name) : '') + '">' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label" for="cat-color">Color</label>' +
            '<input class="form-color" type="color" id="cat-color" value="' + (isEdit ? category.color : '#F48FB1') + '">' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label">Emoji</label>' +
            '<button type="button" class="btn btn-secondary" id="emoji-trigger" style="font-size:1.5rem">' + (isEdit ? category.emoji : '🌸') + '</button>' +
          '</div>' +

          '<button type="submit" class="btn btn-primary" style="width:100%">' + (isEdit ? 'Update' : 'Create Category') + '</button>' +
          (isEdit ? '<button type="button" class="btn btn-danger" id="delete-category" style="width:100%">Delete Category</button>' : '') +
        '</form>';

      this.openModal(title, html);
    },

    bindPrioritySelector: function () {
      var options = document.querySelectorAll('.priority-option');
      options.forEach(function (opt) {
        opt.addEventListener('click', function () {
          options.forEach(function (o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
        });
      });
    },

    initDatePicker: function (inputId, existingDate) {
      var input = document.getElementById(inputId);
      if (!input || typeof Pikaday === 'undefined') return;

      var picker = new Pikaday({
        field: input,
        format: 'YYYY-MM-DD',
        minDate: new Date(),
        toString: function (date) {
          var y = date.getFullYear();
          var m = String(date.getMonth() + 1).padStart(2, '0');
          var d = String(date.getDate()).padStart(2, '0');
          return y + '-' + m + '-' + d;
        }
      });

      if (existingDate) {
        picker.setDate(new Date(existingDate));
      }
    },

    formatDueDate: function (dateStr) {
      var due = new Date(dateStr + 'T00:00:00');
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var diff = Math.round((due - today) / 86400000);

      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      if (diff === -1) return 'Yesterday';
      if (diff > 1 && diff <= 6) {
        return due.toLocaleDateString('en-US', { weekday: 'long' });
      }
      return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    renderTaskCard: function (task, category) {
      var priorityMap = {
        urgent:  { kanji: '急',             label: 'Urgent',  cls: 'priority-urgent' },
        later:   { kanji: '後で',       label: 'Later',   cls: 'priority-later' },
        someday: { kanji: 'いつか',  label: 'Someday', cls: 'priority-someday' }
      };

      var p = priorityMap[task.priority] || priorityMap.someday;

      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var isOverdue = task.dueDate && new Date(task.dueDate + 'T00:00:00') < today && !task.completed;

      var categoryTag = '';
      if (category) {
        categoryTag = '<span class="task-category-tag" style="background:' + category.color + '20;color:' + category.color + '">' + category.emoji + ' ' + this.escapeHTML(category.name) + '</span>';
      }

      var dueTag = '';
      if (task.dueDate) {
        var label = this.formatDueDate(task.dueDate);
        dueTag = '<span class="task-due' + (isOverdue ? ' overdue' : '') + '">' + label + '</span>';
      }

      var recurTag = '';
      if (task.recurring) {
        var recurLabels = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly', yearly: 'Yearly' };
        recurTag = '<span class="task-recurring-tag">↻ ' + (recurLabels[task.recurring] || task.recurring) + '</span>';
      }

      return (
        '<div class="task-card' + (task.completed ? ' completed-card' : '') + '" data-id="' + task.id + '">' +
          '<div class="task-header">' +
            '<button class="task-checkbox' + (task.completed ? ' checked' : '') + '" data-id="' + task.id + '" aria-label="Toggle complete"></button>' +
            '<span class="task-title' + (task.completed ? ' completed' : '') + '">' + this.escapeHTML(task.title) + '</span>' +
          '</div>' +
          '<div class="task-meta">' +
            '<span class="task-priority ' + p.cls + '">' + p.kanji + ' ' + p.label + '</span>' +
            categoryTag +
            dueTag +
            recurTag +
          '</div>' +
        '</div>'
      );
    },

    renderCategoryCard: function (category) {
      return (
        '<div class="category-card" data-id="' + category.id + '">' +
          '<div class="category-emoji" style="background:' + category.color + '20">' + category.emoji + '</div>' +
          '<span class="category-name">' + this.escapeHTML(category.name) + '</span>' +
          '<div class="category-actions">' +
            '<button class="btn-icon edit-category" data-id="' + category.id + '" aria-label="Edit">✏️</button>' +
          '</div>' +
        '</div>'
      );
    },

    escapeHTML: function (str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  };

  window.UI = UI;
})();
