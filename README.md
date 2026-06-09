# our little journal ✦
A pastel scrapbook-style group journal. Posts in handwriting, Polaroid photos, spiral notebook vibes.

---

## Setup (takes ~10 minutes)

### 1. Create a Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → continue
3. Once created, click the **</>** (web) icon to add a web app
4. Register it (any nickname) — you'll get a config object like:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc"
};
```

5. **Paste this into `app.js`** — replace the placeholder config at the top of the file.

---

### 2. Enable Firestore
1. In the Firebase console, go to **Build → Firestore Database**
2. Click **Create database** → choose **Start in test mode** → pick a region → Done

---

### 3. Enable Storage
1. Go to **Build → Storage**
2. Click **Get started** → **Start in test mode** → Done

---

### 4. Deploy to GitHub Pages
1. Create a GitHub repo (e.g. `our-journal`)
2. Push all three files: `index.html`, `style.css`, `app.js`
3. Go to repo **Settings → Pages → Source → Deploy from branch → main / root**
4. Your site will be live at `https://yourusername.github.io/our-journal`

---

### 5. (Optional but recommended) Lock down Firebase rules
Once you've tested, replace the default "allow all" rules:

**Firestore rules** (Build → Firestore → Rules):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /entries/{entry} {
      allow read: if true;
      allow create: if request.resource.data.text.size() <= 600;
    }
  }
}
```

**Storage rules** (Build → Storage → Rules):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profiles/{file} {
      allow read: if true;
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## How it works
- **First visit:** enter your name + photo → stored in `localStorage` on your device
- **"Switch"** button in the header lets another person log in on the same device
- **Entries** are stored in Firestore and load in real-time for everyone
- **Profile photos** are uploaded to Firebase Storage
- Posts display in **Caveat** handwriting font on ruled notebook paper
- Each entry has a Polaroid-style filtered photo with a slight rotation
