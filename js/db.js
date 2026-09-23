(function () {
  'use strict';

  var db = new Dexie('DailyListDB');

  db.version(1).stores({
    tasks: '++id, categoryId, priority, dueDate, completed, recurring',
    categories: '++id, name'
  });

  window.DB = db;
})();
