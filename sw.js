// ============================================================
// SERVICE WORKER for A Bitcoin Consult
// ============================================================
//
// This service worker handles:
// 1. Caching files for offline use
// 2. Firebase Cloud Messaging (push notifications)
// 3. Notification click handling
//
// ============================================================

// Import Firebase Messaging SDK for background push handling
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyBqI2Dt0gF-yYzNGt4jGSHE5zViMxF16Qc",
  authDomain: "abitcoinconsult.firebaseapp.com",
  projectId: "abitcoinconsult",
  storageBucket: "abitcoinconsult.firebasestorage.app",
  messagingSenderId: "215439248030",
  appId: "1:215439248030:web:9325c57f72f64ecc33898f",
  measurementId: "G-BFQD8QSRH5"
});

// Firebase messaging handles background push notifications
// automatically when it detects a "notification" payload.
// For custom "data-only" payloads, we handle them in the
// push event listener below.
var messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[Service Worker] Background message:', payload);
  // If Firebase sends a data-only message (no "notification" key),
  // we build the notification ourselves here.
  var data = payload.data || {};
  var title = data.title || 'A Bitcoin Consult';
  var options = {
    body: data.body || 'New transaction posted',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' }
  };
  return self.registration.showNotification(title, options);
});

// CACHE_NAME is like a label on a storage box. When we update
// the site, we change this version number, which tells the
// browser "throw out the old box, here's a new one."
var CACHE_NAME = 'abc-cache-v2';

// These are the files we want to save for offline use.
// When someone visits your site for the first time, the service
// worker downloads these files and stores them locally on the
// phone. Next time they open the app — even without internet —
// these files load instantly from the local copy.
var FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// -------------------------------------------------------
// INSTALL EVENT
// -------------------------------------------------------
// This fires the very first time the service worker is
// registered (or when the version changes). It's our chance
// to pre-download and cache the essential files.
//
// self.skipWaiting() tells the browser: "Don't wait for the
// user to close all tabs — activate this new version NOW."
// -------------------------------------------------------
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// -------------------------------------------------------
// ACTIVATE EVENT
// -------------------------------------------------------
// This fires when a new service worker takes over. It's a
// good time to clean up old caches (the old "storage boxes"
// from previous versions).
//
// self.clients.claim() makes the new service worker take
// control of all open tabs immediately.
// -------------------------------------------------------
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Delete any cache that isn't our current version
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// -------------------------------------------------------
// FETCH EVENT
// -------------------------------------------------------
// Every time the app tries to load a file (a page, an image,
// a CSS file, etc.), this event fires. We use a "cache first"
// strategy: check the local cache first, and only go to the
// network if we don't have a cached copy.
//
// This is what makes the app feel fast — most things load
// from the phone's storage instead of the internet.
// -------------------------------------------------------
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          // Found it in cache — return the local copy
          return cachedResponse;
        }
        // Not in cache — fetch from the network
        return fetch(event.request);
      })
  );
});

// -------------------------------------------------------
// PUSH EVENT
// -------------------------------------------------------
// This is the big one for your use case. When Firebase Cloud
// Messaging sends a push notification, this event fires —
// even if the user isn't looking at your app.
//
// Right now this is a basic handler. On Day 2, we'll connect
// it to Firebase so it receives real notification data
// (the tweet screenshot, your caption, etc.).
// -------------------------------------------------------
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received');

  var data = {};
  if (event.data) {
    data = event.data.json();
  }

  var title = data.title || 'A Bitcoin Consult';
  var options = {
    body: data.body || 'New post from A Bitcoin Consult',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // This data gets passed to the "notificationclick" handler below
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// -------------------------------------------------------
// NOTIFICATION CLICK EVENT
// -------------------------------------------------------
// When the user taps the notification on their phone, this
// fires. We close the notification and open the app to the
// right page (which will show the tweet screenshot + caption).
// -------------------------------------------------------
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();

  var targetUrl = event.notification.data.url || '/';

  event.waitUntil(
    // Check if the app is already open in a tab
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // If it's already open, focus that tab
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // If not open, open a new window
        return clients.openWindow(targetUrl);
      })
  );
});
