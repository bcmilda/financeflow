import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut as fbSignOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, set, get, update, onValue, off } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const app = initializeApp({
  apiKey: "AIzaSyDtEdQw4WccmEzxXzMwPQlenqfnjoiVw4A",
  authDomain: "financeflow-a249c.firebaseapp.com",
  databaseURL: "https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "financeflow-a249c",
  storageBucket: "financeflow-a249c.firebasestorage.app",
  messagingSenderId: "399807761148",
  appId: "1:399807761148:web:a20b1d9ae78aec23e7a579"
});

const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// Wire up firebase functions to global wrappers
window._ref = (database, path) => ref(database, path);
window._set = (r, val) => set(r, val);
window._get = (r) => get(r).then(s => ({ exists: () => s.exists(), val: () => s.val() }));
window._update = (r, val) => update(r, val);
window._onValue = (r, cb) => {
  const wrapped = snap => cb({ exists: () => snap.exists(), val: () => snap.val() });
  onValue(r, wrapped);
  return wrapped;
};
window._off = (r, ev, cb) => off(r, 'value', cb);
window._db = db;
// Make _db, _ref etc available as direct globals for main script
_db = db;

window.signInGoogle = () => signInWithPopup(auth, provider).catch(e => alert('Přihlášení selhalo: ' + e.message));
window.signOut = () => { if(!confirm('Odhlásit se?')) return; fbSignOut(auth); };
window._signInGoogle = window.signInGoogle;
window._signOut = window.signOut;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    window._currentUser = user;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appShell').style.display = 'flex';
    document.getElementById('mainFab').style.display = 'flex';
    await window.onUserSignedIn(user);
    checkAdminNav();
  } else {
    window._currentUser = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appShell').style.display = 'none';
    document.getElementById('mainFab').style.display = 'none';
  }
});
