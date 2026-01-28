import { openDB } from 'idb';

export const initDB = async () => {
  return openDB('cancunmueve-db', 1, {
    upgrade(db) {
      db.createObjectStore('routes');
      db.createObjectStore('user-reports');
    },
  });
};
