<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>A Bitcoin Consult</title>
  <meta name="description" content="Three curated Bitcoin insights per day, delivered to your phone.">
  <meta name="theme-color" content="#F7931A">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="manifest" href="/manifest.json">
  <link rel="stylesheet" href="/styles.css?v=3">
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">

  <!-- Firebase SDK (compat builds for simple script-tag usage) -->
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"></script>
</head>
<body>

  <canvas id="particle-canvas"></canvas>

  <div class="app">

    <!-- HEADER -->
    <header class="header">
      <div class="logo">A Bitcoin <span>Consult</span></div>
      <div class="network-status"><div class="pulse-dot"></div><span>Live</span></div>
    </header>

    <!-- STATUS BAR -->
    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">Block</span>
        <span class="status-value orange">#1</span>
      </div>
      <div class="status-item">
        <span class="status-label">Txns</span>
        <span class="status-value gold">0 / 21</span>
      </div>
      <div class="status-item">
        <div class="mining-progress"><div class="mining-fill" style="width: 0%;"></div></div>
      </div>
      <div class="status-item">
        <span class="status-label">Status</span>
        <span class="status-value green">Live</span>
      </div>
    </div>

    <!-- ===== FEED VIEW ===== -->
    <div class="view active" id="feed-view">
      <div class="feed-viewport" id="feed-viewport">
        <div class="feed-track" id="feed-track">

          <!-- "All caught up" end slide — always last (rightmost) -->
          <div class="post-slide caught-up-slide" data-read="true" id="caught-up-slide">
            <div class="post-card read caught-up-card">
              <div class="post-tx-bar">
                <span class="post-tx-id">tx <span class="hash">#000000</span></span>
                <span class="post-tx-status caught-up">Up to date</span>
              </div>
              <div class="caught-up-content">
                <div class="caught-up-icon">&#10003;</div>
                <h3 class="caught-up-title">You're all caught up</h3>
                <p class="caught-up-text">
                  Three curated Bitcoin insights per day, delivered to your phone. Each post is a transaction. Each week is a block. New posts will appear to the right.
                </p>
              </div>
              <div class="post-meta">
                <span>The signal — not the noise.</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Swipe hint -->
        <div class="swipe-hint" id="swipe-hint">
          <span class="swipe-arrow">←</span>
          <span>older</span>
          <span style="margin: 0 0.5rem; color: var(--text-faint);">|</span>
          <span>newer</span>
          <span class="swipe-arrow">→</span>
        </div>
      </div>

      <!-- Position dots -->
      <div class="feed-dots" id="feed-dots"></div>
    </div>

    <!-- ===== ARCHIVE VIEW (The Chain) ===== -->
    <div class="view" id="archive-view">
      <div class="archive-scroll">
        <div class="archive-header">
          <span class="archive-title">The Chain</span>
          <div class="archive-line"></div>
        </div>

        <!-- Current block: progress card -->
        <article class="current-block-card">
          <div class="current-block-inner">
            <div class="current-block-left">
              <div class="current-block-icon">#1</div>
              <div class="current-block-content">
                <div class="current-block-headline">This Week's News</div>
                <div class="current-block-meta">Week 1 · Apr 11 – 17</div>
              </div>
            </div>
            <div class="current-block-txcount" id="block-txcount">0 / 21</div>
          </div>
          <div class="block-week-days" id="block-week-days">
            <div class="block-day" data-day="0">S</div>
            <div class="block-day" data-day="1">M</div>
            <div class="block-day" data-day="2">T</div>
            <div class="block-day" data-day="3">W</div>
            <div class="block-day" data-day="4">T</div>
            <div class="block-day" data-day="5">F</div>
            <div class="block-day" data-day="6">S</div>
          </div>
          <div class="block-progress-bar">
            <div class="block-progress-fill" id="block-progress-fill" style="width: 0%;"></div>
          </div>
        </article>

        <!-- Daily transaction cards get inserted here dynamically -->
        <div id="chain-days"></div>

        <!-- Newsletter -->
        <div class="newsletter-card">
          <h3>The Weekly Digest</h3>
          <p>Every Sunday, the block is mined and broadcast to your inbox — all 21 transactions with themes and context.</p>
          <div class="newsletter-badge">Coming Soon</div>
        </div>
      </div>
    </div>

    <!-- ===== INSTALL VIEW ===== -->
    <div class="view" id="install-view">
      <div class="install-scroll">
        <div class="install-hero">
          <h2>The <strong>signal</strong>.<br>Not the noise.</h2>
          <p>Three curated Bitcoin insights per day, delivered to your phone. I scroll crypto Twitter so you don't have to.</p>
        </div>
        <div class="install-actions">
          <button class="btn-primary" id="install-btn">Install the App</button>
          <button class="btn-secondary" id="notify-btn">Enable Notifications</button>
        </div>
      </div>
    </div>

    <!-- ===== DAY VIEWER OVERLAY ===== -->
    <div id="day-viewer" class="day-viewer hidden">
      <button id="day-viewer-close" class="dv-floating-back">&larr; Back to Chain</button>
      <div class="day-viewer-header">
        <div class="day-viewer-title" id="day-viewer-title"></div>
        <div class="day-viewer-dots" id="day-viewer-dots"></div>
      </div>
      <div class="day-viewer-viewport" id="day-viewer-viewport">
        <div class="day-viewer-track" id="day-viewer-track">
          <!-- slides inserted dynamically -->
        </div>
      </div>
    </div>

    <!-- BOTTOM NAV -->
    <nav class="nav-bar">
      <button class="nav-item active" data-view="feed-view">
        <span class="nav-icon">◆</span><span>Feed</span>
      </button>
      <button class="nav-item" data-view="archive-view">
        <span class="nav-icon">☰</span><span>Chain</span>
      </button>
      <button class="nav-item" data-view="install-view">
        <span class="nav-icon">↓</span><span>Install</span>
      </button>
    </nav>

  </div>

  <script>
    // ============================================================
    // SERVICE WORKER REGISTRATION
    // ============================================================
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(function(reg) { console.log('SW registered, scope:', reg.scope); })
          .catch(function(err) { console.log('SW registration failed:', err); });
      }
    } catch(e) { console.log('SW error:', e); }

    // ============================================================
    // FIREBASE + PUSH NOTIFICATIONS
    // ============================================================
    try {
    (function() {
      if (typeof firebase === 'undefined') {
        console.log('Firebase SDK not loaded — skipping push setup');
        return;
      }
      var firebaseConfig = {
        apiKey: "AIzaSyBqI2Dt0gF-yYzNGt4jGSHE5zViMxF16Qc",
        authDomain: "abitcoinconsult.firebaseapp.com",
        projectId: "abitcoinconsult",
        storageBucket: "abitcoinconsult.firebasestorage.app",
        messagingSenderId: "215439248030",
        appId: "1:215439248030:web:9325c57f72f64ecc33898f",
        measurementId: "G-BFQD8QSRH5"
      };
      firebase.initializeApp(firebaseConfig);
      var messaging = firebase.messaging();

      var VAPID_KEY = 'BPWIcxJ_zXU6Tpz1lSN3ZJriX7H78g28XY4AHBFaNWUAyjF6nrR-_iHhItzO3bk5KJY2n4KpDAy_UVxyGUZp23E';

      function getAndSaveToken() {
        var nb = document.getElementById('notify-btn');
        if (nb) nb.textContent = 'Getting token...';
        // Must pass our SW registration — Firebase defaults to
        // /firebase-messaging-sw.js which doesn't exist.
        navigator.serviceWorker.ready.then(function(swReg) {
          console.log('Using SW registration:', swReg.scope);
          return messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
        }).then(function(token) {
            if (token) {
              console.log('FCM Token obtained:', token.substring(0, 20) + '...');
              try {
                var req = indexedDB.open('abc_feed', 2);
                req.onsuccess = function(e) {
                  var db = e.target.result;
                  var tx = db.transaction('state', 'readwrite');
                  tx.objectStore('state').put(token, 'fcm_token');
                };
              } catch(e) { console.log('IDB token save error:', e); }
              fetch('/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token })
              }).then(function(res) {
                if (res.ok) {
                  console.log('Token saved to server');
                  if (nb) nb.textContent = 'Notifications Enabled \u2713';
                } else {
                  console.log('Token save failed:', res.status);
                  if (nb) nb.textContent = 'Error saving token';
                }
              }).catch(function(err) {
                console.log('Token save error:', err);
                if (nb) nb.textContent = 'Token save failed';
              });
            } else {
              console.log('No FCM token returned');
              if (nb) nb.textContent = 'Token unavailable';
            }
          })
          .catch(function(err) {
            console.log('FCM token error:', err);
            if (nb) nb.textContent = 'Token error — retry';
            if (nb) nb.disabled = false;
          });
      }

      messaging.onMessage(function(payload) {
        console.log('Foreground message:', payload);
        var data = payload.notification || payload.data || {};
        var title = data.title || 'A Bitcoin Consult';
        var body = data.body || 'New transaction posted';
        if (Notification.permission === 'granted') {
          new Notification(title, { body: body, icon: '/icons/icon-192.png' });
        }
      });

      // Expose getAndSaveToken so the notification handler outside can call it
      window._abcGetToken = getAndSaveToken;
    })();
    } catch(e) { console.log('Firebase error:', e); }

    // ============================================================
    // NOTIFICATION BUTTON — separate from Firebase so it always works
    // ============================================================
    try {
    (function() {
      var notifyBtn = document.getElementById('notify-btn');
      if (!notifyBtn) return;

      function saveTokenWithFeedback() {
        if (!window._abcGetToken) {
          notifyBtn.textContent = 'Permission granted — token pending';
          console.log('Firebase not ready — _abcGetToken missing');
          // Retry after Firebase might have loaded
          setTimeout(function() {
            if (window._abcGetToken) {
              window._abcGetToken();
              notifyBtn.textContent = 'Notifications Enabled \u2713';
            } else {
              console.log('Firebase still not available for token');
            }
          }, 3000);
          return;
        }
        window._abcGetToken();
        notifyBtn.textContent = 'Notifications Enabled \u2713';
      }

      // Check if already granted
      if ('Notification' in window && Notification.permission === 'granted') {
        notifyBtn.textContent = 'Notifications Enabled \u2713';
        notifyBtn.disabled = true;
        saveTokenWithFeedback();
        return;
      }

      notifyBtn.addEventListener('click', function() {
        if (!('Notification' in window)) {
          alert('Notifications are not supported in this browser. If you are on iPhone, you need to install the app to your home screen first, then enable notifications.');
          return;
        }
        notifyBtn.textContent = 'Requesting...';
        Notification.requestPermission().then(function(perm) {
          if (perm === 'granted') {
            notifyBtn.disabled = true;
            saveTokenWithFeedback();
          } else if (perm === 'denied') {
            notifyBtn.textContent = 'Notifications Blocked';
            notifyBtn.disabled = true;
          } else {
            notifyBtn.textContent = 'Enable Notifications';
          }
        });
      });
    })();
    } catch(e) { console.log('Notify btn error:', e); }

    // ============================================================
    // INSTALL BUTTON — fallback instructions for iOS / unsupported
    // ============================================================
    try {
    (function() {
      var installBtn = document.getElementById('install-btn');
      if (!installBtn) return;

      // On iOS (no beforeinstallprompt), show manual instructions
      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      var isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;

      if (isStandalone) {
        installBtn.textContent = 'Installed \u2713';
        installBtn.disabled = true;
        return;
      }

      if (isIOS) {
        installBtn.textContent = 'Add to Home Screen';
        installBtn.addEventListener('click', function() {
          alert('To install:\n\n1. Tap the Share button (box with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
        });
        return;
      }

      // Chrome/Edge — use beforeinstallprompt if available
      var deferredPrompt = null;
      window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
      });

      installBtn.addEventListener('click', function() {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(function(result) {
            deferredPrompt = null;
            if (result.outcome === 'accepted') {
              installBtn.textContent = 'Installed \u2713';
              installBtn.disabled = true;
            }
          });
        } else {
          // Fallback if prompt wasn't captured
          alert('To install:\n\n1. Tap the menu (\u22ee) in Chrome\n2. Tap "Add to Home Screen" or "Install App"\n3. Confirm the install');
        }
      });
    })();
    } catch(e) { console.log('Install btn error:', e); }

    // ============================================================
    // POST LOADER — Fetches posts from /api/posts and renders them
    // ============================================================
    function escHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function cleanCaption(raw) {
      // The AI sometimes returns markdown sections — extract just
      // the in-app display text, or fall back to the full string
      // stripped of markdown bold markers.
      var display = raw;
      var marker = 'In-app display';
      var idx = raw.indexOf(marker);
      if (idx >= 0) {
        // Grab everything after the header line
        var afterMarker = raw.substring(idx);
        var nlIdx = afterMarker.indexOf('\n');
        if (nlIdx >= 0) {
          display = afterMarker.substring(nlIdx + 1).replace(/^\s+/, '');
        }
      } else {
        // No sections — try stripping "Push notification" block
        var pushMarker = 'Push notification';
        var pushIdx = raw.indexOf(pushMarker);
        if (pushIdx >= 0) {
          var afterPush = raw.substring(pushIdx);
          var breakIdx = afterPush.indexOf('\n\n');
          if (breakIdx >= 0) {
            display = afterPush.substring(breakIdx + 2).replace(/^\s+/, '');
          }
        }
      }
      // Strip any remaining markdown bold markers ** and *
      display = display.replace(/\*\*/g, '').replace(/\*/g, '');
      // Strip leading label lines like "In-app display (under 500 chars):"
      display = display.replace(/^[^\n]*\(under \d+ chars\)[:\s]*/i, '');
      return display.replace(/^\s+|\s+$/g, '');
    }

    function createPostSlide(post, txNum) {
      var slide = document.createElement('div');
      slide.className = 'post-slide';
      slide.setAttribute('data-read', 'false');

      var ts = new Date(post.timestamp);
      var timeStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                    ' \u00b7 ' + ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      var txId = post.id.replace('post_', '').substring(0, 6);

      // Convert /images/xxx URLs to /api/image?key=xxx
      var imgSrc = post.image || '';
      if (imgSrc.indexOf('/images/') === 0) {
        imgSrc = '/api/image?key=' + encodeURIComponent(imgSrc.replace('/images/', ''));
      }

      var imageHtml = imgSrc
        ? '<img src="' + imgSrc + '" alt="Tweet screenshot" loading="lazy">'
        : '<div class="post-image-placeholder">[ image unavailable ]</div>';

      var caption = cleanCaption(post.caption || '');

      slide.innerHTML =
        '<div class="post-card unread">' +
          '<div class="post-tx-bar">' +
            '<span class="post-tx-id">tx <span class="hash">#' + txId + '</span></span>' +
            '<span class="post-tx-status confirmed">Confirmed</span>' +
          '</div>' +
          '<div class="post-image">' + imageHtml + '</div>' +
          '<div class="caption-toggle">' +
            '<button class="caption-btn" onclick="this.parentNode.classList.toggle(\'open\')">' +
              '<span class="caption-btn-text">Read Analysis</span>' +
              '<span class="caption-arrow">&#9660;</span>' +
            '</button>' +
            '<div class="caption-body">' +
              '<p class="post-caption">' + escHtml(caption) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="post-meta">' +
            '<span>txn ' + txNum + ' of 21</span>' +
            '<span>' + timeStr + '</span>' +
          '</div>' +
        '</div>';

      return slide;
    }

    function updateStatusBar(count) {
      var MAX = 21;
      var n = Math.min(count, MAX);
      var pct = Math.round((n / MAX) * 100);
      var txEl = document.querySelector('.status-value.gold');
      var fillEl = document.querySelector('.mining-fill');
      var archiveFill = document.querySelector('.block-progress-fill');
      var archiveTx = document.querySelector('.current-block-txcount');
      if (txEl) txEl.textContent = n + ' / ' + MAX;
      if (fillEl) fillEl.style.width = pct + '%';
      if (archiveFill) archiveFill.style.width = pct + '%';
      if (archiveTx) archiveTx.textContent = n + ' / ' + MAX;
    }

    // Helper: get "YYYY-MM-DD" in local timezone from a date string
    function toLocalDateKey(isoStr) {
      var d = new Date(isoStr);
      return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    }

    // Helper: get today's date key
    function todayKey() {
      return toLocalDateKey(new Date().toISOString());
    }

    // Helper: friendly day label
    function dayLabel(dateKey) {
      var tk = todayKey();
      if (dateKey === tk) return "Today's News";
      var d = new Date(dateKey + 'T12:00:00');
      var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return days[d.getDay()] + "'s News · " + months[d.getMonth()] + ' ' + d.getDate();
    }

    // Group posts by local date — returns { "2026-04-13": [post, ...], ... }
    function groupByDay(posts) {
      var groups = {};
      var order = [];
      for (var i = 0; i < posts.length; i++) {
        var key = toLocalDateKey(posts[i].timestamp);
        if (!groups[key]) { groups[key] = []; order.push(key); }
        groups[key].push(posts[i]);
      }
      return { groups: groups, order: order };
    }

    // Build a compact day banner for the Chain tab
    function buildDayCard(dateKey, posts, allReadIds) {
      var hasUnread = false;
      for (var i = 0; i < posts.length; i++) {
        if (allReadIds.indexOf(posts[i].id) < 0) { hasUnread = true; break; }
      }

      var card = document.createElement('div');
      card.className = 'chain-day-card' + (hasUnread ? ' chain-unopened' : ' chain-read');
      card.setAttribute('data-datekey', dateKey);

      var label = dayLabel(dateKey);
      var txCount = posts.length + ' txn' + (posts.length !== 1 ? 's' : '');

      card.innerHTML =
        '<div class="chain-day-header">' +
          (hasUnread ? '<span class="chain-unopened-badge">Unopened</span>' : '<span class="chain-read-badge">Read</span>') +
          '<div class="chain-day-info">' +
            '<div class="chain-day-title">' + label + '</div>' +
            '<div class="chain-day-headline" id="headline-' + dateKey + '">Loading...</div>' +
          '</div>' +
          '<div class="chain-day-meta">' + txCount + ' &rsaquo;</div>' +
        '</div>';

      // Fetch AI headline for this day
      fetch('/api/daily-summary?date=' + dateKey)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var headlineEl = document.getElementById('headline-' + dateKey);
          if (headlineEl && data.summary) {
            headlineEl.textContent = data.summary;
          } else if (headlineEl) {
            headlineEl.textContent = txCount + ' confirmed';
          }
        })
        .catch(function() {
          var headlineEl = document.getElementById('headline-' + dateKey);
          if (headlineEl) headlineEl.textContent = txCount + ' confirmed';
        });

      // Tapping banner opens the full day viewer
      card.addEventListener('click', function() {
        openDayViewer(posts, dateKey, allReadIds, card);
      });

      return card;
    }

    // =============================================================
    // DAY VIEWER — full-screen swipeable overlay for Chain day posts
    // =============================================================
    var dayViewerActive = false;
    var dayViewerCleanup = null;

    function openDayViewer(posts, dateKey, allReadIds, bannerCard) {
      var viewer = document.getElementById('day-viewer');
      var track = document.getElementById('day-viewer-track');
      var viewport = document.getElementById('day-viewer-viewport');
      var dotsContainer = document.getElementById('day-viewer-dots');
      var titleEl = document.getElementById('day-viewer-title');
      var closeBtn = document.getElementById('day-viewer-close');

      // Clean up previous instance if any
      if (dayViewerCleanup) { dayViewerCleanup(); dayViewerCleanup = null; }

      titleEl.textContent = dayLabel(dateKey);
      track.innerHTML = '';
      dotsContainer.innerHTML = '';
      track.style.transform = 'translateX(0px)';

      // Build post slides
      for (var i = 0; i < posts.length; i++) {
        var p = posts[i];
        var slide = document.createElement('div');
        slide.className = 'dv-slide';

        var ts = new Date(p.timestamp);
        var timeStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                      ' \u00b7 ' + ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        var txId = p.id.replace('post_', '').substring(0, 6);

        var imgSrc = p.image || '';
        if (imgSrc.indexOf('/images/') === 0) {
          imgSrc = '/api/image?key=' + encodeURIComponent(imgSrc.replace('/images/', ''));
        }
        var imageHtml = imgSrc
          ? '<img src="' + imgSrc + '" alt="Tweet screenshot" loading="lazy">'
          : '<div class="post-image-placeholder">[ image unavailable ]</div>';

        var caption = cleanCaption(p.caption || '');

        slide.innerHTML =
          '<div class="post-card read">' +
            '<div class="post-tx-bar">' +
              '<span class="post-tx-id">tx <span class="hash">#' + txId + '</span></span>' +
              '<span class="post-tx-status confirmed">Confirmed</span>' +
            '</div>' +
            '<div class="post-image">' + imageHtml + '</div>' +
            '<div class="caption-toggle">' +
              '<button class="caption-btn" onclick="this.parentNode.classList.toggle(\'open\')">' +
                '<span class="caption-btn-text">Read Analysis</span>' +
                '<span class="caption-arrow">&#9660;</span>' +
              '</button>' +
              '<div class="caption-body">' +
                '<p class="post-caption">' + escHtml(caption) + '</p>' +
              '</div>' +
            '</div>' +
            '<div class="post-meta">' +
              '<span>txn ' + (i + 1) + ' of ' + posts.length + '</span>' +
              '<span>' + timeStr + '</span>' +
            '</div>' +
          '</div>';

        track.appendChild(slide);
      }

      // Final "Back to Chain" slide
      var backSlide = document.createElement('div');
      backSlide.className = 'dv-slide dv-back-slide';
      backSlide.innerHTML =
        '<div class="dv-back-card">' +
          '<div class="dv-back-icon">&#10003;</div>' +
          '<div class="dv-back-title">All caught up for this day</div>' +
          '<div class="dv-back-text">' + posts.length + ' transaction' + (posts.length !== 1 ? 's' : '') + ' reviewed</div>' +
          '<button class="dv-back-btn" id="dv-back-btn">Back to Chain</button>' +
        '</div>';
      track.appendChild(backSlide);

      // Show the overlay BEFORE measuring widths
      viewer.classList.remove('hidden');
      dayViewerActive = true;

      // Force layout so offsetWidth is available
      void viewport.offsetWidth;

      var allSlides = Array.prototype.slice.call(track.querySelectorAll('.dv-slide'));
      var total = allSlides.length;
      var currentIndex = 0;

      // Build dots
      for (var d = 0; d < total; d++) {
        var dot = document.createElement('div');
        dot.className = 'feed-dot' + (d === 0 ? ' active-dot' : ' unread-dot');
        dotsContainer.appendChild(dot);
      }

      function updateDots() {
        var dots = Array.prototype.slice.call(dotsContainer.querySelectorAll('.feed-dot'));
        for (var j = 0; j < dots.length; j++) {
          dots[j].className = 'feed-dot' + (j === currentIndex ? ' active-dot' : j < currentIndex ? ' read-dot' : ' unread-dot');
        }
      }

      function getSlideWidth() {
        // Use viewport width minus peek gap (55px), matching the CSS calc
        return viewport.offsetWidth - 55;
      }

      var prevTranslate = 0, currentTranslate = 0;

      function goTo(index) {
        if (index < 0) index = 0;
        if (index >= total) index = total - 1;
        currentIndex = index;
        var sw = getSlideWidth();
        currentTranslate = -index * sw;
        prevTranslate = currentTranslate;
        track.style.transform = 'translateX(' + currentTranslate + 'px)';
        updateDots();
        // Scroll each slide back to top when switching
        for (var s = 0; s < allSlides.length; s++) {
          if (s !== currentIndex) allSlides[s].scrollTop = 0;
        }
      }

      // --- Touch / swipe handling ---
      // We attach touchstart/end on the viewport, but touchmove on the
      // viewport with passive:false so we can preventDefault when swiping
      // horizontally (stops the browser from also scrolling vertically).
      var startX = 0, startY = 0, startTime = 0, isDragging = false;
      var isScrolling = false, directionLocked = false;

      function onTouchStart(e) {
        if (!e.touches || !e.touches.length) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        isDragging = true;
        isScrolling = false;
        directionLocked = false;
      }

      function onTouchMove(e) {
        if (!isDragging || !e.touches || !e.touches.length) return;
        var cx = e.touches[0].clientX;
        var cy = e.touches[0].clientY;

        if (!directionLocked) {
          var dx = Math.abs(cx - startX);
          var dy = Math.abs(cy - startY);
          // Need at least 10px movement to lock direction
          if (dx > 10 || dy > 10) {
            directionLocked = true;
            // Horizontal bias: if dx > dy * 0.7, treat as swipe
            isScrolling = dy > dx * 1.2;
            if (!isScrolling) track.classList.add('dragging');
          }
        }

        // Vertical scroll — let the slide's overflow-y handle it
        if (isScrolling) return;

        // Horizontal swipe — prevent vertical scroll and move track
        if (e.cancelable) e.preventDefault();
        currentTranslate = prevTranslate + (cx - startX);
        track.style.transform = 'translateX(' + currentTranslate + 'px)';
      }

      function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('dragging');
        if (isScrolling) return;

        var moved = currentTranslate - prevTranslate;
        var elapsed = Date.now() - startTime || 1;
        var vel = Math.abs(moved) / elapsed;

        if (moved < -40 || (moved < -15 && vel > 0.25)) goTo(currentIndex + 1);
        else if (moved > 40 || (moved > 15 && vel > 0.25)) goTo(currentIndex - 1);
        else goTo(currentIndex);
      }

      viewport.addEventListener('touchstart', onTouchStart, { passive: true });
      viewport.addEventListener('touchmove', onTouchMove, { passive: false });
      viewport.addEventListener('touchend', onTouchEnd, { passive: true });

      // --- Close / back handler ---
      function closeDayViewer() {
        viewer.classList.add('hidden');
        dayViewerActive = false;

        // Mark all posts as read
        for (var k = 0; k < posts.length; k++) {
          if (allReadIds.indexOf(posts[k].id) < 0) {
            allReadIds.push(posts[k].id);
          }
        }
        // Update the banner
        if (bannerCard) {
          bannerCard.classList.remove('chain-unopened');
          bannerCard.classList.add('chain-read');
          var badge = bannerCard.querySelector('.chain-unopened-badge');
          if (badge) { badge.textContent = 'Read'; badge.className = 'chain-read-badge'; }
        }
        // Persist to IndexedDB
        try {
          var rq = indexedDB.open('abc_feed', 2);
          rq.onsuccess = function(e) {
            var db = e.target.result;
            var tx = db.transaction('state', 'readwrite');
            tx.objectStore('state').put(allReadIds, 'chainRead');
          };
        } catch(e) {}

        // Clean up
        viewport.removeEventListener('touchstart', onTouchStart);
        viewport.removeEventListener('touchmove', onTouchMove);
        viewport.removeEventListener('touchend', onTouchEnd);
        closeBtn.removeEventListener('click', closeDayViewer);
        window.removeEventListener('resize', onResize);
        var bb = document.getElementById('dv-back-btn');
        if (bb) bb.removeEventListener('click', closeDayViewer);
        dayViewerCleanup = null;
      }

      closeBtn.addEventListener('click', closeDayViewer);
      var backBtnEl = document.getElementById('dv-back-btn');
      if (backBtnEl) backBtnEl.addEventListener('click', closeDayViewer);

      function onResize() { goTo(currentIndex); }
      window.addEventListener('resize', onResize);

      dayViewerCleanup = closeDayViewer;

      // Start at first slide
      goTo(0);
    }

    function loadPosts() {
      fetch('/api/posts')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var posts = data.posts || [];
          var track = document.getElementById('feed-track');
          var caughtUpSlide = document.getElementById('caught-up-slide');

          // API returns newest-first — reverse so oldest is first
          posts.reverse();

          var today = todayKey();
          var grouped = groupByDay(posts);

          // --- FEED: Only show today's posts ---
          var todayPosts = grouped.groups[today] || [];
          for (var i = 0; i < todayPosts.length; i++) {
            var slide = createPostSlide(todayPosts[i], i + 1);
            track.insertBefore(slide, caughtUpSlide);
          }

          // If no posts today, update caught-up text
          if (todayPosts.length === 0) {
            var cTitle = caughtUpSlide.querySelector('.caught-up-title');
            if (cTitle) cTitle.textContent = 'No new posts yet today';
            var cText = caughtUpSlide.querySelector('.caught-up-text');
            if (cText) cText.textContent = 'Check back soon — three curated Bitcoin insights are posted daily. Swipe left to see past posts in The Chain.';
          }

          updateStatusBar(posts.length);

          // --- CHAIN: Build daily transaction cards ---
          // Load chain read state from IDB, then build cards
          var chainReadIds = [];
          try {
            var rq = indexedDB.open('abc_feed', 2);
            rq.onsuccess = function(e) {
              var db = e.target.result;
              try {
                var tx = db.transaction('state', 'readonly');
                var req = tx.objectStore('state').get('chainRead');
                req.onsuccess = function() {
                  if (Array.isArray(req.result)) chainReadIds = req.result;
                  buildChain(grouped, posts.length, chainReadIds);
                };
                req.onerror = function() { buildChain(grouped, posts.length, chainReadIds); };
              } catch(e) { buildChain(grouped, posts.length, chainReadIds); }
            };
            rq.onerror = function() { buildChain(grouped, posts.length, chainReadIds); };
          } catch(e) { buildChain(grouped, posts.length, chainReadIds); }

          initFeed();
        })
        .catch(function(err) {
          console.log('Failed to load posts:', err);
          initFeed();
        });
    }

    function buildChain(grouped, totalPosts, chainReadIds) {
      var chainContainer = document.getElementById('chain-days');
      chainContainer.innerHTML = '';

      // Show days newest-first in the chain
      var sortedDays = grouped.order.slice().reverse();

      for (var i = 0; i < sortedDays.length; i++) {
        var dateKey = sortedDays[i];
        var dayPosts = grouped.groups[dateKey];
        var card = buildDayCard(dateKey, dayPosts, chainReadIds);
        chainContainer.appendChild(card);

        // Add connector between cards
        if (i < sortedDays.length - 1) {
          var conn = document.createElement('div');
          conn.className = 'sealed-connector';
          conn.innerHTML = '<div class="sealed-link"></div>';
          chainContainer.appendChild(conn);
        }
      }

      // Update block progress
      var MAX = 21;
      var pct = Math.round((Math.min(totalPosts, MAX) / MAX) * 100);
      var btx = document.getElementById('block-txcount');
      var bfill = document.getElementById('block-progress-fill');
      if (btx) btx.textContent = Math.min(totalPosts, MAX) + ' / ' + MAX;
      if (bfill) bfill.style.width = pct + '%';

      // Highlight weekday indicators for days that have posts
      var dayEls = document.querySelectorAll('.block-day');
      // Figure out which days of the week have posts
      var activeDays = {};
      for (var di = 0; di < grouped.order.length; di++) {
        var dk = grouped.order[di];
        var dd = new Date(dk + 'T12:00:00');
        activeDays[dd.getDay()] = true; // 0=Sun, 1=Mon, etc.
      }
      for (var dj = 0; dj < dayEls.length; dj++) {
        var dayNum = parseInt(dayEls[dj].getAttribute('data-day'), 10);
        if (activeDays[dayNum]) {
          dayEls[dj].classList.add('block-day-active');
        } else {
          dayEls[dj].classList.remove('block-day-active');
        }
        // Highlight today
        if (dayNum === new Date().getDay()) {
          dayEls[dj].classList.add('block-day-today');
        }
      }
    }

    // ============================================================
    // SWIPE FEED
    // ============================================================
    function initFeed() {
      var track = document.getElementById('feed-track');
      var viewport = document.getElementById('feed-viewport');
      var dotsContainer = document.getElementById('feed-dots');
      var slides = Array.prototype.slice.call(document.querySelectorAll('.post-slide'));
      var cards = Array.prototype.slice.call(document.querySelectorAll('.post-card'));
      var total = slides.length;
      var currentIndex = 0;
      var startX = 0, currentTranslate = 0, prevTranslate = 0;
      var isDragging = false, startTime = 0;

      var readState = [];
      for (var i = 0; i < total; i++) {
        readState.push(slides[i].getAttribute('data-read') === 'true');
      }

      function buildDots() {
        dotsContainer.innerHTML = '';
        for (var i = 0; i < total; i++) {
          var dot = document.createElement('div');
          dot.className = 'feed-dot';
          dotsContainer.appendChild(dot);
        }
        updateDots();
      }

      function updateDots() {
        var dots = Array.prototype.slice.call(dotsContainer.querySelectorAll('.feed-dot'));
        for (var i = 0; i < dots.length; i++) {
          dots[i].className = 'feed-dot';
          if (i === currentIndex) dots[i].classList.add('active-dot');
          else if (readState[i]) dots[i].classList.add('read-dot');
          else dots[i].classList.add('unread-dot');
        }
      }

      function updateCardStates() {
        for (var i = 0; i < cards.length; i++) {
          cards[i].classList.remove('active-card', 'read', 'unread');
          if (i === currentIndex) {
            cards[i].classList.add('active-card');
            // Mark as read on first view — border changes from orange to subtle
            if (!readState[i]) {
              readState[i] = true;
              slides[i].setAttribute('data-read', 'true');
            }
            // Active card always shows as "read" (no orange border)
            cards[i].classList.add('read');
          } else if (readState[i]) {
            cards[i].classList.add('read');
          } else {
            // Unseen cards keep the orange glow so the peek edge is visible
            cards[i].classList.add('unread');
          }
        }
      }

      var db = null;
      function openDB(cb) {
        var req = indexedDB.open('abc_feed', 2);
        req.onupgradeneeded = function(e) {
          var d = e.target.result;
          if (!d.objectStoreNames.contains('state')) d.createObjectStore('state');
        };
        req.onsuccess = function(e) { db = e.target.result; if (cb) cb(); };
        req.onerror = function() { if (cb) cb(); };
      }

      function saveState() {
        if (!db) return;
        var tx = db.transaction('state', 'readwrite');
        var store = tx.objectStore('state');
        store.put(currentIndex, 'idx');
        store.put(readState, 'read');
      }

      function loadState(cb) {
        if (!db) { cb(0); return; }
        var tx = db.transaction('state', 'readonly');
        var store = tx.objectStore('state');
        var rIdx = store.get('idx');
        var rRead = store.get('read');
        tx.oncomplete = function() {
          var idx = typeof rIdx.result === 'number' && rIdx.result < total ? rIdx.result : 0;
          // Only restore read state if length matches (dynamic posts may change count)
          if (Array.isArray(rRead.result) && rRead.result.length === total) {
            readState = rRead.result;
          }
          cb(idx);
        };
        tx.onerror = function() { cb(0); };
      }

      function getSlideWidth() {
        // Each slide is calc(100% - 40px) except the last which is 100%
        return slides[0] ? slides[0].offsetWidth : viewport.offsetWidth;
      }

      function goTo(index, save) {
        if (index < 0) index = 0;
        if (index >= total) index = total - 1;
        currentIndex = index;
        var sw = getSlideWidth();
        currentTranslate = -index * sw;
        prevTranslate = currentTranslate;
        track.style.transform = 'translateX(' + currentTranslate + 'px)';
        updateCardStates();
        updateDots();
        if (save !== false) saveState();
        var hint = document.getElementById('swipe-hint');
        if (hint && currentIndex > 0) hint.style.display = 'none';
      }

      function getX(e) { return e.type.indexOf('mouse') >= 0 ? e.pageX : e.touches[0].clientX; }
      function getY(e) { return e.type.indexOf('mouse') >= 0 ? e.pageY : e.touches[0].clientY; }

      var startY = 0;
      var isScrolling = false;  // true = vertical scroll, skip horizontal swipe
      var directionLocked = false;

      viewport.addEventListener('touchstart', function(e) {
        startX = getX(e);
        startY = getY(e);
        startTime = Date.now();
        isDragging = true;
        isScrolling = false;
        directionLocked = false;
      }, { passive: true });
      viewport.addEventListener('touchmove', function(e) {
        if (!isDragging) return;

        // Lock direction on first significant movement
        if (!directionLocked) {
          var dx = Math.abs(getX(e) - startX);
          var dy = Math.abs(getY(e) - startY);
          if (dx > 8 || dy > 8) {
            directionLocked = true;
            isScrolling = dy > dx;  // more vertical = scrolling
            if (!isScrolling) track.classList.add('dragging');
          }
        }

        // If user is scrolling vertically, let the browser handle it
        if (isScrolling) return;

        currentTranslate = prevTranslate + (getX(e) - startX);
        track.style.transform = 'translateX(' + currentTranslate + 'px)';
      }, { passive: true });
      viewport.addEventListener('touchend', function() {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('dragging');

        // If it was a vertical scroll, don't change slide
        if (isScrolling) return;

        var moved = currentTranslate - prevTranslate;
        var vel = Math.abs(moved) / (Date.now() - startTime);
        if (moved < -50 || (moved < -20 && vel > 0.3)) goTo(currentIndex + 1);
        else if (moved > 50 || (moved > 20 && vel > 0.3)) goTo(currentIndex - 1);
        else goTo(currentIndex);
      });

      viewport.addEventListener('mousedown', function(e) {
        startX = getX(e); startTime = Date.now(); isDragging = true;
        track.classList.add('dragging'); e.preventDefault();
      });
      document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        currentTranslate = prevTranslate + (getX(e) - startX);
        track.style.transform = 'translateX(' + currentTranslate + 'px)';
      });
      document.addEventListener('mouseup', function() {
        if (!isDragging) return;
        isDragging = false; track.classList.remove('dragging');
        var moved = currentTranslate - prevTranslate;
        if (moved < -50) goTo(currentIndex + 1);
        else if (moved > 50) goTo(currentIndex - 1);
        else goTo(currentIndex);
      });

      window.addEventListener('resize', function() { goTo(currentIndex, false); });

      function findFirstUnread() {
        // Find the first unread post (skip the caught-up slide at the end)
        for (var i = 0; i < total; i++) {
          if (!readState[i] && !slides[i].classList.contains('caught-up-slide')) {
            return i;
          }
        }
        // All read — go to the caught-up slide (last one)
        return total - 1;
      }

      buildDots();
      openDB(function() {
        loadState(function(savedIdx) {
          // If saved position is valid AND there are new posts beyond it, go to first unread
          var firstUnread = findFirstUnread();
          // Use saved position if it's still valid, otherwise jump to first unread
          var startIdx = (savedIdx >= 0 && savedIdx < total) ? savedIdx : 0;
          // If there are unread posts ahead of saved position, jump to first unread
          if (firstUnread < total - 1 && firstUnread > startIdx) {
            startIdx = firstUnread;
          }
          // If all posts read and saved is within range, keep saved
          goTo(startIdx, false);
        });
      });
    }

    // Kick off: load posts from server, then init feed
    try { loadPosts(); } catch(e) { console.log('loadPosts error:', e); initFeed(); }

    // ============================================================
    // BOTTOM NAV — use Array.prototype.slice for mobile compatibility
    // ============================================================
    try {
    (function() {
      var navItems = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));
      var views = Array.prototype.slice.call(document.querySelectorAll('.view'));
      for (var i = 0; i < navItems.length; i++) {
        (function(item) {
          item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var targetId = item.getAttribute('data-view');
            for (var j = 0; j < navItems.length; j++) { navItems[j].classList.remove('active'); }
            for (var k = 0; k < views.length; k++) { views[k].classList.remove('active'); }
            item.classList.add('active');
            var target = document.getElementById(targetId);
            if (target) target.classList.add('active');
          });
        })(navItems[i]);
      }
    })();
    } catch(e) { console.log('Nav error:', e); }

    // ============================================================
    // PARTICLE NETWORK
    // ============================================================
    try {
    (function() {
      var c = document.getElementById('particle-canvas');
      var ctx = c.getContext('2d');
      var ps = [], n = 45, d = 130;
      function resize() { c.width = innerWidth; c.height = innerHeight; }
      resize(); addEventListener('resize', resize);
      function P() {
        this.x = Math.random()*c.width; this.y = Math.random()*c.height;
        this.vx = (Math.random()-0.5)*0.2; this.vy = (Math.random()-0.5)*0.2;
        this.r = Math.random()*1.5+0.5; this.o = Math.random()*0.2+0.05;
      }
      for (var i = 0; i < n; i++) ps.push(new P());
      function draw() {
        ctx.clearRect(0,0,c.width,c.height);
        for (var i = 0; i < ps.length; i++) {
          var p = ps[i]; p.x += p.vx; p.y += p.vy;
          if (p.x<0) p.x=c.width; if (p.x>c.width) p.x=0;
          if (p.y<0) p.y=c.height; if (p.y>c.height) p.y=0;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          ctx.fillStyle='rgba(247,147,26,'+p.o+')'; ctx.fill();
          for (var j = i+1; j < ps.length; j++) {
            var q = ps[j], dx = p.x-q.x, dy = p.y-q.y, dist = Math.sqrt(dx*dx+dy*dy);
            if (dist < d) {
              ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
              ctx.strokeStyle='rgba(212,168,83,'+((1-dist/d)*0.05)+')';
              ctx.lineWidth=0.5; ctx.stroke();
            }
          }
        }
        requestAnimationFrame(draw);
      }
      draw();
    })();
    } catch(e) { console.log('Particle error:', e); }
  </script>

</body>
</html>
