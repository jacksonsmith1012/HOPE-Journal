// ============================================================
//  our little journal — app.js
//  Firebase Firestore + Storage backend
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  orderBy, query, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ============================================================
//  🔧 PASTE YOUR FIREBASE CONFIG HERE
//  1. Go to console.firebase.google.com
//  2. Create a project → Add web app → copy the config below
// ============================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ── Init ──────────────────────────────────────────────────
const fbApp   = initializeApp(firebaseConfig);
const db      = getFirestore(fbApp);
const storage = getStorage(fbApp);

// ── DOM refs ──────────────────────────────────────────────
const onboardingOverlay = document.getElementById("onboardingOverlay");
const writeOverlay      = document.getElementById("writeOverlay");
const entriesFeed       = document.getElementById("entriesFeed");
const loadingState      = document.getElementById("loadingState");
const emptyState        = document.getElementById("emptyState");

const onboardName       = document.getElementById("onboardName");
const photoInput        = document.getElementById("photoInput");
const photoPreview      = document.getElementById("photoPreview");
const photoPlaceholder  = document.getElementById("photoPlaceholder");
const photoUploadArea   = document.getElementById("photoUploadArea");
const onboardSubmit     = document.getElementById("onboardSubmit");

const openWriteBtn      = document.getElementById("openWriteBtn");
const closeWriteBtn     = document.getElementById("closeWriteBtn");
const submitEntryBtn    = document.getElementById("submitEntryBtn");
const entryText         = document.getElementById("entryText");
const charCount         = document.getElementById("charCount");

const userChip          = document.getElementById("userChip");
const userChipImg       = document.getElementById("userChipImg");
const userChipName      = document.getElementById("userChipName");
const switchUserBtn     = document.getElementById("switchUserBtn");

const writeUserImg      = document.getElementById("writeUserImg");
const writeUserName     = document.getElementById("writeUserName");
const todayDate         = document.getElementById("todayDate");

// ── State ─────────────────────────────────────────────────
let currentUser = null;   // { name, photoURL }
let selectedFile = null;
let unsubscribeEntries = null;

// ── On load ───────────────────────────────────────────────
(function init() {
  setTodayDate();
  loadUser();
  listenForEntries();
})();

function setTodayDate() {
  const now = new Date();
  todayDate.textContent = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });
}

// ── User persistence (localStorage) ───────────────────────
function loadUser() {
  const stored = localStorage.getItem("journalUser");
  if (stored) {
    currentUser = JSON.parse(stored);
    applyUserToUI();
    onboardingOverlay.classList.add("hidden");
  } else {
    onboardingOverlay.classList.remove("hidden");
  }
}

function applyUserToUI() {
  userChipImg.src   = currentUser.photoURL;
  userChipName.textContent = currentUser.name;
  userChip.classList.remove("hidden");

  writeUserImg.src  = currentUser.photoURL;
  writeUserName.textContent = currentUser.name;
}

// ── Photo upload preview ───────────────────────────────────
photoUploadArea.addEventListener("click", () => photoInput.click());
photoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedFile = file;
  const url = URL.createObjectURL(file);
  photoPreview.src = url;
  photoPreview.classList.remove("hidden");
  photoPlaceholder.classList.add("hidden");
});

// ── Onboarding submit ──────────────────────────────────────
onboardSubmit.addEventListener("click", async () => {
  const name = onboardName.value.trim();
  if (!name) { shake(onboardName); return; }
  if (!selectedFile) { shake(photoUploadArea); return; }

  onboardSubmit.disabled = true;
  onboardSubmit.textContent = "uploading...";

  try {
    // Upload profile photo to Firebase Storage
    const ext  = selectedFile.name.split(".").pop();
    const path = `profiles/${Date.now()}_${name}.${ext}`;
    const sRef = storageRef(storage, path);
    await uploadBytes(sRef, selectedFile);
    const photoURL = await getDownloadURL(sRef);

    currentUser = { name, photoURL };
    localStorage.setItem("journalUser", JSON.stringify(currentUser));
    applyUserToUI();

    onboardingOverlay.classList.add("hidden");
    showToast(`welcome, ${name}! ✦`);
  } catch (err) {
    console.error(err);
    showToast("something went wrong — try again :(");
  } finally {
    onboardSubmit.disabled = false;
    onboardSubmit.textContent = "join the journal →";
  }
});

// ── Switch user ────────────────────────────────────────────
switchUserBtn.addEventListener("click", () => {
  if (!confirm("Switch to a different person? You'll need to re-enter your name and photo.")) return;
  localStorage.removeItem("journalUser");
  currentUser = null;
  selectedFile = null;
  photoPreview.classList.add("hidden");
  photoPlaceholder.classList.remove("hidden");
  onboardName.value = "";
  photoInput.value = "";
  userChip.classList.add("hidden");
  onboardingOverlay.classList.remove("hidden");
});

// ── Write modal ────────────────────────────────────────────
openWriteBtn.addEventListener("click", () => {
  if (!currentUser) { onboardingOverlay.classList.remove("hidden"); return; }
  writeOverlay.classList.remove("hidden");
  entryText.focus();
});
closeWriteBtn.addEventListener("click", () => {
  writeOverlay.classList.add("hidden");
});
writeOverlay.addEventListener("click", (e) => {
  if (e.target === writeOverlay) writeOverlay.classList.add("hidden");
});

entryText.addEventListener("input", () => {
  charCount.textContent = entryText.value.length;
});

// ── Submit entry ───────────────────────────────────────────
submitEntryBtn.addEventListener("click", async () => {
  const text = entryText.value.trim();
  if (!text) { shake(entryText); return; }

  submitEntryBtn.disabled = true;
  submitEntryBtn.textContent = "posting...";

  try {
    await addDoc(collection(db, "entries"), {
      name:      currentUser.name,
      photoURL:  currentUser.photoURL,
      text,
      createdAt: serverTimestamp()
    });

    entryText.value = "";
    charCount.textContent = "0";
    writeOverlay.classList.add("hidden");
    showToast("entry posted ✦");
  } catch (err) {
    console.error(err);
    showToast("couldn't post — check your connection :(");
  } finally {
    submitEntryBtn.disabled = false;
    submitEntryBtn.textContent = "post to journal ✦";
  }
});

// ── Real-time entries listener ─────────────────────────────
function listenForEntries() {
  const q = query(collection(db, "entries"), orderBy("createdAt", "desc"));
  unsubscribeEntries = onSnapshot(q, (snapshot) => {
    loadingState.classList.add("hidden");

    // Remove old rendered entries (not the loading/empty states)
    document.querySelectorAll(".entry-item").forEach(el => el.remove());

    if (snapshot.empty) {
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    snapshot.docs.forEach((doc, i) => {
      const data = doc.data();
      const el = buildEntryEl(data, i);
      entriesFeed.appendChild(el);
    });
  }, (err) => {
    console.error("Firestore error:", err);
    loadingState.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.querySelector(".empty-text").textContent =
      "couldn't load entries — check the Firebase setup :(";
  });
}

// ── Build entry DOM element ────────────────────────────────
const ROTATIONS = [-3, 2, -1.5, 3, -2, 1, -2.5, 2.5];

function buildEntryEl(data, index) {
  const wrap = document.createElement("div");
  wrap.className = "entry-item";
  wrap.style.animationDelay = `${index * 0.08}s`;

  const rotate = ROTATIONS[index % ROTATIONS.length];
  const time = data.createdAt
    ? new Date(data.createdAt.seconds * 1000).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit"
      })
    : "just now";

  wrap.innerHTML = `
    <div class="polaroid-wrap">
      <div class="polaroid" style="--rotate:${rotate}deg">
        <img src="${escHtml(data.photoURL)}" alt="${escHtml(data.name)}" />
        <span class="polaroid-name">${escHtml(data.name)}</span>
      </div>
    </div>
    <div class="entry-body">
      <p class="entry-text">${escHtml(data.text)}</p>
      <p class="entry-meta">${escHtml(time)}</p>
    </div>
  `;
  return wrap;
}

// ── Helpers ────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shake(el) {
  el.style.animation = "none";
  el.offsetHeight; // reflow
  el.style.animation = "shake 0.4s ease";
  el.addEventListener("animationend", () => { el.style.animation = ""; }, { once: true });
}

// Toast
let toastEl = null;
function showToast(msg) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => toastEl.classList.remove("show"), 3000);
}

// Shake keyframes injected once
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-6px)}
    40%{transform:translateX(6px)}
    60%{transform:translateX(-4px)}
    80%{transform:translateX(4px)}
  }
`;
document.head.appendChild(shakeStyle);
