# Day 1 Setup Guide — A Bitcoin Consult PWA

## What you're deploying

You have a working PWA (Progressive Web App) shell. It's a mobile-friendly site that:
- Can be "installed" on a phone's home screen like a real app
- Works offline (loads from cache even without internet)
- Has placeholder push notification support (we'll wire up Firebase on Day 2)

## Your project files

```
pwa/
├── index.html       ← Your main webpage
├── styles.css       ← The colors, fonts, layout
├── manifest.json    ← Tells phones "this is an installable app"
├── sw.js            ← Service worker (background helper for offline + notifications)
└── icons/
    ├── icon-192.png ← App icon (home screen)
    └── icon-512.png ← App icon (splash screen)
```

---

## Step 1: Create a GitHub account (if you don't have one)

**What is GitHub?** It's where your code lives online. Think of it like Google Drive, but for code. Cloudflare will pull your files from here whenever you want to update your site.

1. Go to https://github.com and sign up (free)
2. Create a new repository called `abitcoinconsult`
3. Set it to **Public** (Cloudflare Pages free tier requires this, or you can use Private with a paid plan)

## Step 2: Upload your files to GitHub

The simplest way (no command line needed):

1. Open your new repository on GitHub
2. Click **"uploading an existing file"** or the **"Add file"** → **"Upload files"** button
3. Drag the entire contents of the `pwa/` folder into the upload area
   - Make sure the files are at the ROOT level (index.html should NOT be inside a "pwa" subfolder on GitHub)
   - You should see: index.html, styles.css, manifest.json, sw.js, and the icons/ folder
4. Click **"Commit changes"**

## Step 3: Create a Cloudflare account

**What is Cloudflare?** It's a company that makes websites fast and secure. Their "Pages" product hosts your website for free and gives you HTTPS (the secure padlock in the browser). PWAs require HTTPS to work — that's why we need it.

1. Go to https://dash.cloudflare.com/sign-up and create an account (free)
2. When asked to add a site, enter `abitcoinconsult.com`
3. Select the **Free plan**
4. Cloudflare will give you two **nameservers** (they look like: `anna.ns.cloudflare.com`)
5. Go to wherever you registered your domain (GoDaddy, Namecheap, etc.) and change your nameservers to the ones Cloudflare gave you
6. This can take up to 24 hours to fully work, but usually happens within an hour

## Step 4: Deploy to Cloudflare Pages

1. In Cloudflare dashboard, go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Sign in with GitHub and select your `abitcoinconsult` repository
3. For build settings:
   - **Build command:** leave blank (we don't need a build step — our files are ready as-is)
   - **Build output directory:** `/` (just a forward slash — everything is at the root)
4. Click **Deploy**

Cloudflare will give you a URL like `abitcoinconsult.pages.dev` where your site is live immediately.

## Step 5: Connect your custom domain

1. In Cloudflare Pages, go to your project → **Custom domains**
2. Add `abitcoinconsult.com`
3. Cloudflare handles the DNS and SSL certificate automatically

## Step 6: Test it!

1. Open `abitcoinconsult.com` on your phone
2. **Android Chrome:** You should see an install prompt or a banner at the bottom. You can also tap the three-dot menu → "Install app" or "Add to Home Screen"
3. **iOS Safari:** Tap the share button (box with arrow) → "Add to Home Screen"
4. The app should appear on your home screen with the Bitcoin icon
5. Open it — it should load fullscreen without the browser bar

---

## Troubleshooting

**"Install" option doesn't appear:**
- Make sure you're on HTTPS (not http://)
- Make sure you're using Chrome on Android or Safari on iOS
- Try refreshing the page a couple times (the service worker needs to install first)
- Check that manifest.json is loading: open Chrome DevTools → Application → Manifest

**Site shows old content after updating:**
- The service worker caches files aggressively. After updating files, change `CACHE_NAME` in sw.js (e.g., from `abc-cache-v1` to `abc-cache-v2`) to force a refresh.

---

## What's next (Day 2)

Tomorrow we'll add Firebase Cloud Messaging so the push notifications actually work. You'll need to:
1. Create a Firebase account at https://console.firebase.google.com
2. Create a new project called "abitcoinconsult"
3. That's all the prep — I'll write the code.
