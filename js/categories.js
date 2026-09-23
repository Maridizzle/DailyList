(function () {
  'use strict';

  var Categories = {
    init: function () {
      this.renderList();
    },

    add: function (catData) {
      return DB.categories.add(catData).then(function () {
        Categories.renderList();
      });
    },

    update: function (id, catData) {
      return DB.categories.update(id, catData).then(function () {
        Categories.renderList();
        Tasks.renderList();
      });
    },

    remove: function (id) {
      return DB.tasks.where('categoryId').equals(id).modify({ categoryId: null }).then(function () {
        return DB.categories.delete(id);
      }).then(function () {
        Categories.renderList();
        Tasks.renderList();
      });
    },

    getAll: function () {
      return DB.categories.toArray();
    },

    populateDropdown: function (selectId, selectedId) {
      var select = document.getElementById(selectId);
      if (!select) return Promise.resolve();

      return this.getAll().then(function (categories) {
        var html = '<option value="">None</option>';
        categories.forEach(function (c) {
          var sel = selectedId && c.id === selectedId ? ' selected' : '';
          html += '<option value="' + c.id + '"' + sel + '>' + c.emoji + ' ' + UI.escapeHTML(c.name) + '</option>';
        });
        select.innerHTML = html;
      });
    },

    renderList: function () {
      return this.getAll().then(function (categories) {
        var container = document.getElementById('category-list');
        var empty = document.getElementById('empty-categories');

        if (categories.length === 0) {
          container.innerHTML = '';
          empty.style.display = '';
          return;
        }

        empty.style.display = 'none';
        var html = '';
        for (var i = 0; i < categories.length; i++) {
          html += UI.renderCategoryCard(categories[i]);
        }
        container.innerHTML = html;
        Categories.bindCardEvents();
      });
    },

    bindCardEvents: function () {
      document.querySelectorAll('.category-card').forEach(function (card) {
        card.addEventListener('click', function () {
          Categories.openEditModal(Number(card.dataset.id));
        });
      });
    },

    openEditModal: function (id) {
      return DB.categories.get(id).then(function (category) {
        if (!category) return;
        UI.openCategoryModal(category);
        Categories.bindFormSubmit(id, category.emoji);
        Categories.bindEmojiPicker(category.emoji);
      });
    },

    openAddModal: function () {
      UI.openCategoryModal();
      this.bindFormSubmit(null, '🌸');
      this.bindEmojiPicker('🌸');
    },

    bindFormSubmit: function (editId, currentEmoji) {
      var form = document.getElementById('category-form');
      if (!form) return;

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var emojiBtn = document.getElementById('emoji-trigger');
        var catData = {
          name: document.getElementById('cat-name').value.trim(),
          color: document.getElementById('cat-color').value,
          emoji: emojiBtn ? emojiBtn.textContent.trim() : currentEmoji
        };

        if (!catData.name) return;

        if (editId) {
          Categories.update(editId, catData);
        } else {
          Categories.add(catData);
        }
        UI.closeModal();
      });

      var deleteBtn = document.getElementById('delete-category');
      if (deleteBtn && editId) {
        deleteBtn.addEventListener('click', function () {
          if (confirm('Delete this category? Tasks using it will become uncategorized.')) {
            Categories.remove(editId);
            UI.closeModal();
          }
        });
      }
    },

    bindEmojiPicker: function (fallback) {
      var trigger = document.getElementById('emoji-trigger');
      if (!trigger) return;

      trigger.addEventListener('click', function () {
        if (!customElements.get('emoji-picker')) {
          import('https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js').then(function () {
            Categories.showEmojiPicker(trigger, fallback);
          }).catch(function () {
            var emoji = prompt('Enter an emoji:', fallback);
            if (emoji) trigger.textContent = emoji;
          });
        } else {
          Categories.showEmojiPicker(trigger, fallback);
        }
      });
    },

    showEmojiPicker: function (trigger, fallback) {
      var existing = document.querySelector('emoji-picker');
      if (existing) {
        existing.remove();
        return;
      }

      var picker = document.createElement('emoji-picker');
      picker.style.position = 'absolute';
      picker.style.zIndex = '999';
      picker.style.left = '0';
      picker.style.top = '100%';

      trigger.parentElement.style.position = 'relative';
      trigger.parentElement.appendChild(picker);

      picker.addEventListener('emoji-click', function (e) {
        trigger.textContent = e.detail.unicode;
        picker.remove();
      });
    }
  };

  window.Categories = Categories;
})();
