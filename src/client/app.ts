var API_BASE = "";
var currentEventId: string | null = null;
var currentUsername: string | null = null;
var eventStep = 1;
var detailStep = 1;
var detailStep1 = "", detailStep2 = "", detailStep3 = "", detailStep4 = "";
var homeCardIdx = 0;
var cachedHomeEvents: any[] = [];
var cachedHomeIsMod = false;
var homeShareUrl = "";
var homeLoadSeq = 0;
var detailLoading = false;
var descPageIdx: Record<string, number> = {};
var descPageTotal: Record<string, number> = {};
var attPageIdx: Record<string, number> = {};
var attListStore: Record<string, any[]> = {};
var descFullText: Record<string, string> = {};
var modCardIdx: Record<string, number> = {};
var modItems: Record<string, any[]> = {};
var modDescPageIdx: Record<string, number> = {};
var modDescTotal: Record<string, number> = {};
var modDescFullText: Record<string, string> = {};
var myPitchIdx = 0, myEventIdx = 0;
var myPitches: any[] = [], myEvents: any[] = [];
// My Stuff description pagination
var myStuffDescPageIdx: Record<string, number> = {};
var myStuffDescPageTotal: Record<string, number> = {};
var myStuffDescFullText: Record<string, string> = {};

// Cache TTL constants
var CACHE_TTL_HOME = 30000;      // 30 seconds
var CACHE_TTL_DETAIL = 30000;    // 30 seconds
var CACHE_TTL_ATTENDEES = 30000; // 30 seconds
var CACHE_TTL_MOD = 60000;       // 60 seconds

// UI Constants
var MAX_DEBUG_ENTRIES = 50;
var TOAST_DURATION = 3000;
var COPY_TOAST_DURATION = 1500;
var DEBOUNCE_DELAY = 300;
var RENDER_DELAY = 200;
var DESC_PREVIEW_LENGTH = 120;
var ATTENDEES_PER_PAGE = 5;
var DESC_SHORT_LENGTH = 100;

// Category map for badges
var CAT_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  social: { label: "Social", emoji: "🎉", color: "#ff69b4" },
  tech: { label: "Tech", emoji: "💻", color: "#6366f1" },
  sports: { label: "Sports", emoji: "🏃", color: "#22c55e" },
  food: { label: "Food", emoji: "🍕", color: "#f97316" },
  arts: { label: "Arts", emoji: "🎨", color: "#a855f7" },
  outdoors: { label: "Outdoors", emoji: "🌿", color: "#10b981" },
  gaming: { label: "Gaming", emoji: "🎮", color: "#3b82f6" },
  music: { label: "Music", emoji: "🎵", color: "#ec4899" },
  wellness: { label: "Wellness", emoji: "🧘", color: "#14b8a6" },
  education: { label: "Education", emoji: "📚", color: "#f59e0b" },
  networking: { label: "Networking", emoji: "🤝", color: "#8b5cf6" },
  other: { label: "Other", emoji: "⭐", color: "#6b7280" },
};
function catBadge(cat: string | undefined): string {
  var id = cat || "other";
  var c = CAT_MAP[id];
  if (!c) c = CAT_MAP["other"]!;
  return '<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:2px 8px;border:3px solid #1c1c0f;background:' + c.color + ';color:#fff;">' + c.emoji + ' ' + escapeHtml(c.label) + '</span>';
}
var AUTO_PAGINATE_DELAY = 100;

// Timezone and relative date helpers
var appTimezone = "+05:30"; // default, updated from /api/init
function setAppTimezone(tz: string) { appTimezone = tz || "+05:30"; log("timezone set to " + appTimezone); }
function relativeDate(dateStr: string): string {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var d = new Date(dateStr + "T00:00:00Z"); d.setHours(0, 0, 0, 0);
  var diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return "In " + diff + " days";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function formatTimeWithTz(time: string, tz: string): string {
  return escapeHtml(time) + (tz ? " <span style='font-size:10px;color:var(--muted);'>" + escapeHtml(tz) + "</span>" : "");
}

// Fetch debounce / caches
var homeFetchTimeout: ReturnType<typeof setTimeout> | null = null;
var homeFetchInProgress = false;
var modFetching: Record<string, boolean> = {};
var detailCache: Record<string, { data: any; timestamp: number }> = {};
var attendeeCache: Record<string, { data: any[]; timestamp: number }> = {};
var modTabCache: Record<string, { data: any; timestamp: number }> = {};

// Unified debug log: client + server interleaved
var unifiedLogs: { ts: number; source: "client" | "server"; level: string; msg: string }[] = [];

function log(msg: string) {
  console.log("[MEETIT] " + msg);
  var ts = Date.now();
  unifiedLogs.push({ ts: ts, source: "client", level: "info", msg: msg });
  if (unifiedLogs.length > MAX_DEBUG_ENTRIES) unifiedLogs.shift();
  var logsContainer = document.querySelector("#debug-panel .debug-logs");
  renderUnifiedLogs(logsContainer);
}

function renderUnifiedLogs(container: Element | null) {
  if (!container) return;
  container.innerHTML = "";
  if (unifiedLogs.length === 0) {
    var empty = document.createElement("div");
    empty.className = "log-entry";
    empty.style.color = "#888";
    empty.textContent = "No logs yet. Interact with the app to generate logs.";
    container.appendChild(empty);
    return;
  }
  // Show newest first
  for (var i = unifiedLogs.length - 1; i >= 0; i--) {
    var item = unifiedLogs[i];
    if (!item) continue;
    var entry = document.createElement("div");
    entry.className = "log-entry";
    var ts = new Date(item.ts || 0).toISOString().substring(11, 23);
    var sourceColor = item.source === "server" ? "#00ccff" : "#00ff88";
    var levelColor = item.level === "error" ? "#ff4444" : sourceColor;
    entry.innerHTML = '<span style="color:' + levelColor + ';font-weight:700;">[' + item.source.toUpperCase() + ']</span> ' + ts + " " + escapeHtml(item.msg || "");
    container.appendChild(entry);
  }
}

// Fetch server logs and merge into unified view
async function fetchServerLogs() {
  log("fetching server logs...");
  try {
    var res = await fetch(API_BASE + "/api/server-logs");
    log("server logs response status=" + res.status);
    var data = await res.json();
    log("server logs response type=" + data.type + " count=" + (data.logs || []).length);
    if (data.type === "server-logs") {
      var logs = data.logs || [];
      // Merge server logs into unifiedLogs (avoid duplicates by ts+msg)
      var existingKeys = new Set(unifiedLogs.map(function(l) { return l.ts + "|" + l.msg; }));
      for (var i = 0; i < logs.length; i++) {
        var s = logs[i];
        if (!s) continue;
        var key = (s.ts || 0) + "|" + (s.msg || "");
        if (!existingKeys.has(key)) {
          unifiedLogs.push({ ts: s.ts || Date.now(), source: "server", level: s.level || "info", msg: s.msg || "" });
        }
      }
      // Sort by timestamp ascending, then trim
      unifiedLogs.sort(function(a, b) { return a.ts - b.ts; });
      if (unifiedLogs.length > MAX_DEBUG_ENTRIES) {
        unifiedLogs = unifiedLogs.slice(unifiedLogs.length - MAX_DEBUG_ENTRIES);
      }
      log("server logs merged: " + logs.length + " entries, total=" + unifiedLogs.length);
      var logsContainer = document.querySelector("#debug-panel .debug-logs");
      renderUnifiedLogs(logsContainer);
    } else {
      log("server logs unexpected type: " + data.type);
    }
  } catch (e) { log("server logs fetch failed: " + e); }
}

function copyAllLogs() {
  if (unifiedLogs.length === 0) { showToast("No logs to copy", "error"); return; }
  var text = unifiedLogs.map(function(l) {
    var ts = new Date(l.ts || 0).toISOString().substring(11, 23);
    return "[" + l.source.toUpperCase() + "] " + ts + " " + (l.msg || "");
  }).join("\n");
  text = "--- Meetit Unified Log " + new Date().toISOString() + " ---\n" + text;
  try {
    if ((navigator as any).clipboard && (navigator as any).clipboard.writeText) {
      (navigator as any).clipboard.writeText(text).then(function () { showToast("All logs copied! 📋", "success"); }).catch(function () { fallbackCopyLogs(text); });
    } else { fallbackCopyLogs(text); }
  } catch (e) { fallbackCopyLogs(text); }
}

function fallbackCopyLogs(text: string) {
  var ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px"; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); showToast("Logs copied! 📋", "success"); }
  catch (e) { showToast("Copy failed", "error"); }
  document.body.removeChild(ta);
}

function showToast(msg: string, type: "success" | "error") {
  var t = document.createElement("div");
  t.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:" + (type === "success" ? "#00ff88" : "#ff4444") + ";color:#1c1c0f;padding:14px 24px;font-weight:700;z-index:2000;font-family:'Space Grotesk',sans-serif;border:4px solid #1c1c0f;box-shadow:6px 6px 0 #1c1c0f;";
  t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, TOAST_DURATION);
}
function showCopyToast() { var t = document.createElement("div"); t.className = "toast-copied"; t.textContent = "📍 Copied!"; document.body.appendChild(t); setTimeout(function () { t.remove(); }, COPY_TOAST_DURATION); }
function escapeHtml(s: string | undefined | null) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
function escapeAttr(s: string | undefined | null): string { return (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function pulseDot(id: string) {
  var el = document.getElementById(id);
  if (!el) return;
  var dot = el;
  dot.classList.remove("just-pulsed");
  void dot.offsetWidth;
  dot.classList.add("just-pulsed");
  setTimeout(function () { dot.classList.remove("just-pulsed"); }, 320);
}

// ======= UNIFIED CARD SHELL =======
function buildCardShell(opts: { color?: string; headerHtml: string; bodyHtml: string; actionsHtml?: string; footerHtml?: string; className?: string; noFade?: boolean }): string {
  log("buildCardShell" + (opts.className ? " class=" + opts.className : "") + (opts.noFade ? " noFade" : ""));
  var cls = "card-shell";
  if (!opts.noFade) cls += " fade-in";
  if (opts.className) cls += " " + opts.className;
  return '<div class="' + cls + '"' + (opts.color ? ' style="background:' + opts.color + ';"' : '') + '>' +
    '<div class="card-shell-header">' + opts.headerHtml + '</div>' +
    '<div class="card-shell-body">' + opts.bodyHtml + '</div>' +
    (opts.actionsHtml ? '<div class="card-shell-actions">' + opts.actionsHtml + '</div>' : '') +
    (opts.footerHtml ? '<div class="card-shell-footer">' + opts.footerHtml + '</div>' : '') +
    '</div>';
}
function updateCardDots(prefix: string, current: number, total: number) {
  log("updateCardDots prefix=" + prefix + " current=" + current + " total=" + total);
  var dots = document.querySelector(".card-progress." + prefix + "-dots") as HTMLElement | null;
  if (!dots) { dots = document.getElementById(prefix + "-dots") as HTMLElement | null; }
  if (!dots) { log("updateCardDots dots not found prefix=" + prefix); return; }
  if (total <= 1) { dots.style.display = "none"; return; }
  dots.style.display = "flex";
  var html = "";
  for (var i = 0; i < total; i++) {
    html += '<div class="card-progress-dot' + (i === current ? ' done' : '') + '"></div>';
  }
  dots.innerHTML = html;
}
function updateCardNav(prefix: string, current: number, total: number) {
  log("updateCardNav prefix=" + prefix + " current=" + current + " total=" + total);
  var prevBtn = document.getElementById(prefix + "-prev-btn");
  var nextBtn = document.getElementById(prefix + "-next-btn");
  if (!prevBtn || !nextBtn) { log("updateCardNav buttons not found prefix=" + prefix); return; }
  if (total <= 1) {
    prevBtn.classList.add("hidden");
    nextBtn.classList.add("hidden");
    return;
  }
  prevBtn.classList.toggle("hidden", current === 0);
  nextBtn.classList.toggle("hidden", current >= total - 1);
}

// ======= HOME - Single card navigation =======
async function loadHome() {
  // Skip if already fetching
  if (homeFetchInProgress) { log("loadHome skipped: fetch already in progress"); return; }
  // Show loading bar immediately
  var bar = document.getElementById("loading-bar"), msg = document.getElementById("loading-msg");
  if (bar) bar.style.width = "30%"; if (msg) msg.textContent = "Fetching events...";

  // Debounce: clear any pending fetch, schedule new one after 300ms
  if (homeFetchTimeout) clearTimeout(homeFetchTimeout);
  homeFetchTimeout = setTimeout(async function () {
    if (homeFetchInProgress) { log("loadHome debounced: fetch still in progress"); return; }
    homeFetchInProgress = true;
    var loadSeq = ++homeLoadSeq;
    try {
      var res = await fetch(API_BASE + "/api/home");
      if (loadSeq !== homeLoadSeq) return;
      if (bar) bar.style.width = "70%"; if (msg) msg.textContent = "Almost there...";
      var data = await res.json();
      if (loadSeq !== homeLoadSeq) return;
      if (bar) bar.style.width = "100%"; if (msg) msg.textContent = "Ready!";
      if (data.type === "home") {
        var allEvents = flattenHomeEvents(data.data.eventsByDate);
        var currentEvent = cachedHomeEvents[homeCardIdx];
        var currentId = currentEvent && currentEvent.id;
        cachedHomeEvents = allEvents;
        cachedHomeIsMod = data.data.isMod;
        homeShareUrl = data.data.shareUrl || "";
        if (currentId) {
          var updatedIndex = allEvents.findIndex(function (event) { return event.id === currentId; });
          if (updatedIndex >= 0) homeCardIdx = updatedIndex;
          else if (homeCardIdx >= allEvents.length) homeCardIdx = Math.max(0, allEvents.length - 1);
        } else if (homeCardIdx >= allEvents.length) {
          homeCardIdx = Math.max(0, allEvents.length - 1);
        }
        setTimeout(function () {
          if (loadSeq === homeLoadSeq) renderHomeCard(data.data);
        }, RENDER_DELAY);
      }
    } catch (e) { log("error: loadHome " + e); if (msg) msg.textContent = "Could not load."; }
    finally { homeFetchInProgress = false; }
  }, DEBOUNCE_DELAY);
}

function flattenHomeEvents(eventsByDate: Record<string, any[]>): any[] {
  var all: any[] = [];
  var dates = Object.keys(eventsByDate).sort();
  for (var i = 0; i < dates.length; i++) {
    var evts = eventsByDate[dates[i] || ""] || [];
    for (var j = 0; j < evts.length; j++) all.push({ ...evts[j], _date: dates[i] });
  }
  return all;
}

function renderHomeCard(state: { eventsByDate: Record<string, any[]>; isMod: boolean; settings: any }, opts: { noFade?: boolean } = {}) {
  var dates = Object.keys(state.eventsByDate).sort();
  var c = document.getElementById("events-container")!;

  if (dates.length === 0) {
    log("renderHomeCard empty state");
    c.innerHTML = '<div class="empty-state" style="height:100%;"><span class="emoji">🐱</span><h2>Wow, so empty!</h2><p>No events yet — be the first to create one!</p><div style="display:flex;gap:8px;justify-content:center;margin-top:12px;"><button class="btn btn-pink btn-empty" data-action="create-pitch">💡 Pitch Idea</button><button class="btn btn-white btn-empty" data-action="create-event">📋 Submit Event</button></div></div>';
  } else {
    // Flatten all events
    var all = flattenHomeEvents(state.eventsByDate);
    cachedHomeEvents = all;
    cachedHomeIsMod = state.isMod;
    if (homeCardIdx >= all.length) homeCardIdx = 0;
    var event = all[homeCardIdx];
    if (!event) return;
    var count = all.length;
    var relDate = relativeDate(event._date || "");
    var dateStr = event._date ? new Date(event._date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";
    log("renderHomeCard index=" + homeCardIdx + " total=" + count + " id=" + event.id);
    log("renderHomeCard layout=full-viewport-flex shell=card-shell");

    var headerHtml =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">' +
      '<div style="display:flex;align-items:center;gap:6px;min-width:0;">' +
      (event.emoji ? '<div style="width:40px;height:40px;background:var(--primary);border:var(--border);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:var(--shadow-sm);flex-shrink:0;">' + event.emoji + '</div>' : '<div style="width:40px;height:40px;background:var(--surface);border:var(--border);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;box-shadow:var(--shadow-sm);flex-shrink:0;">📅</div>') +
      '<div style="min-width:0;">' +
      '<h3 style="font-size:18px;font-weight:700;margin:0;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;">' + escapeHtml(event.title) + '</h3>' +
      '<div style="font-size:12px;color:var(--muted);font-weight:600;margin-top:2px;">by ' + escapeHtml(event.organizer || "Anonymous") + '</div>' +
      '</div></div>' +
      '<span style="font-size:11px;font-weight:700;color:var(--muted);text-align:right;flex-shrink:0;">' + escapeHtml(relDate) + (relDate === "Today" || relDate === "Tomorrow" ? "<br>" + dateStr : "") + '</span>' +
      '</div>' +
      '<div class="event-meta" style="margin-bottom:8px;">' +
      '<span class="event-tag" style="font-size:12px;padding:3px 8px;">⏰ ' + formatTimeWithTz(event.time, appTimezone) + '</span>' +
      '<span class="event-tag" style="font-size:12px;padding:3px 8px;background:var(--primary);">👥 ' + (event.rsvpCount || 0) + '</span>' +
      (event.category ? catBadge(event.category) : '') +
      '</div>';

    // Body: description scrolls, with progress dots pinned to the bottom of the body
    // (above the actions). The dots are at a fixed visual position regardless of
    // title height or description length.
    var bodyHtml =
      '<div style="flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 2px;">' +
      '<div style="font-size:15px;color:var(--on-surface);line-height:1.55;word-break:break-word;">' + escapeHtml((event.description || "").substring(0, DESC_PREVIEW_LENGTH)) + ((event.description || "").length > DESC_PREVIEW_LENGTH ? "..." : "") + '</div>' +
      '</div>' +
      '<div class="card-progress" id="home-dots" style="flex-shrink:0;margin-top:6px;"></div>';

    var actionsHtml =
      '<div style="display:flex;gap:6px;align-items:center;">' +
      '<button class="btn btn-white btn-action btn-view-details" data-id="' + event.id + '" data-action="view-details">Details →</button>' +
      (event.hasRsvped
        ? '<button class="btn btn-green btn-action btn-rsvp-card" data-id="' + event.id + '" data-action="rsvp-card">✅ Going</button>'
        : '<button class="btn btn-pink btn-action btn-rsvp-card" data-id="' + event.id + '" data-action="rsvp-card">🎟️ RSVP</button>') +
      (homeShareUrl ? '<button class="btn btn-white btn-icon btn-share-event" data-action="share-event" title="Copy share link" aria-label="Copy share link">📤</button>' : '') +
      '</div>';

    var footerHtml = count > 1
      ? '<button class="footer-btn footer-btn-prev" id="home-prev-btn" data-action="home-prev">← Prev</button>' +
        '<span style="font-size:12px;font-weight:700;">' + (homeCardIdx + 1) + '/' + count + '</span>' +
        '<button class="footer-btn footer-btn-next" id="home-next-btn" data-action="home-next">Next →</button>'
      : '';

    c.innerHTML = buildCardShell({ headerHtml: headerHtml, bodyHtml: bodyHtml, actionsHtml: actionsHtml, footerHtml: footerHtml, noFade: opts.noFade });
    updateCardDots("home", homeCardIdx, count);
    updateCardNav("home", homeCardIdx, count);
  }
  document.getElementById("mod-btn")!.classList.toggle("hidden", !state.isMod);
}
function homePrev() { var events = searchFilteredEvents || cachedHomeEvents; log("homePrev idx=" + homeCardIdx + " total=" + events.length); if (events.length > 1) { homeCardIdx = (homeCardIdx - 1 + events.length) % events.length; log("homePrev newIdx=" + homeCardIdx); renderHomeCard({ eventsByDate: groupByDate(events), isMod: cachedHomeIsMod, settings: {} }, { noFade: true }); } }
function homeNext() { var events = searchFilteredEvents || cachedHomeEvents; log("homeNext idx=" + homeCardIdx + " total=" + events.length); if (events.length > 1) { homeCardIdx = (homeCardIdx + 1) % events.length; log("homeNext newIdx=" + homeCardIdx); renderHomeCard({ eventsByDate: groupByDate(events), isMod: cachedHomeIsMod, settings: {} }, { noFade: true }); } }
function groupByDate(events: any[]): Record<string, any[]> { var g: Record<string, any[]> = {}; for (var i = 0; i < events.length; i++) { var event = events[i]; if (!event) continue; var d = event._date || ""; if (!g[d]) g[d] = []; g[d]!.push(event); } return g; }

// Search/filter events client-side
var searchFilteredEvents: any[] | null = null;
function filterHomeEvents(query: string) {
  log("filterHomeEvents query=" + query);
  if (!query || !query.trim()) {
    log("filterHomeEvents cleared");
    searchFilteredEvents = null;
    homeCardIdx = 0;
    renderHomeCard({ eventsByDate: groupByDate(cachedHomeEvents), isMod: cachedHomeIsMod, settings: {} });
    return;
  }
  var q = query.toLowerCase().trim();
  var filtered = cachedHomeEvents.filter(function(event) {
    return (event.title || "").toLowerCase().includes(q) ||
           (event.location || "").toLowerCase().includes(q) ||
           (event.date || "").includes(q) ||
           (event.time || "").includes(q);
  });
  searchFilteredEvents = filtered;
  homeCardIdx = 0;
  if (filtered.length === 0) {
    var c = document.getElementById("events-container")!;
    c.innerHTML = '<div class="empty-state"><span class="emoji">🔍</span><h2>No events found</h2><p>No events match "' + escapeHtml(query) + '"</p></div>';
  } else {
    renderHomeCard({ eventsByDate: groupByDate(filtered), isMod: cachedHomeIsMod, settings: {} });
  }
}

function shareEvent() {
  log("shareEvent url=" + homeShareUrl);
  if (!homeShareUrl) { log("shareEvent abort: no url"); showToast("Share link unavailable", "error"); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(homeShareUrl).then(function() {
      log("shareEvent clipboard success");
      showToast("Link copied! 📋", "success");
    }).catch(function(e) {
      log("shareEvent clipboard failed: " + e);
      fallbackCopy(homeShareUrl);
    });
  } else {
    log("shareEvent clipboard unavailable, using fallback");
    fallbackCopy(homeShareUrl);
  }
}
function fallbackCopy(text: string) {
  log("fallbackCopy text=" + text.substring(0, 60));
  var textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    log("fallbackCopy success");
    showToast("Link copied! 📋", "success");
  } catch (e) {
    log("fallbackCopy failed: " + e);
    showToast("Could not copy link", "error");
  }
  document.body.removeChild(textarea);
}

// ======= MY STUFF (tabbed layout) =======
var myStuffLoading = false;
var myStuffLoadSeq = 0;
var myStuffTab = "rsvps";
var myRsvps: any[] = [], myRsvpIdx = 0;
function openMyStuff() { log("openMyStuff"); myStuffTab = "rsvps"; switchMyStuffTab("rsvps", true); loadMySubmissions(); openOverlay("my-stuff-overlay"); }
var myStuffTransitioning = false;
function switchMyStuffTab(tab: string, skipLoad = false) {
  if ((tab === myStuffTab && !skipLoad) || myStuffTransitioning) return;
  myStuffTransitioning = true;
  myStuffTab = tab;
  document.querySelectorAll("#my-stuff-tabs .my-stuff-tab").forEach(function (t) { t.classList.toggle("active", (t as HTMLElement).dataset.mtab === tab); });
  if (skipLoad) { myStuffTransitioning = false; return; }
  var container = document.getElementById("my-stuff-container");
  if (!container) { myStuffTransitioning = false; return; }
  container.classList.add("tab-fade", "out");
  setTimeout(function () {
    renderMyStuffTab(tab);
    container!.classList.remove("out");
    container!.classList.add("in");
    setTimeout(function () { container!.classList.remove("tab-fade", "in"); myStuffTransitioning = false; }, 200);
  }, 180);
}
function renderMyStuffTab(tab: string) {
  if (tab === "rsvps") renderMyRsvpCard();
  else if (tab === "events") renderMyEventCard();
  else if (tab === "pitches") renderMyPitchCard();
}
async function loadMySubmissions() {
  log("loadMySubmissions");
  var loadSeq = ++myStuffLoadSeq;
  var capturedTab = myStuffTab;
  var container = document.getElementById("my-stuff-container")!;
  container.innerHTML = '<div class="empty-state"><span class="emoji">⏳</span><h2>Loading...</h2></div>';
  try {
    var res = await fetch(API_BASE + "/api/my-submissions");
    var data = await res.json();
    if (loadSeq !== myStuffLoadSeq) { log("loadMySubmissions stale response, seq=" + loadSeq + " current=" + myStuffLoadSeq); return; }
    if (data.type === "my-submissions") {
      myRsvps = data.rsvps || [];
      myPitches = data.pitches || [];
      myEvents = data.events || [];
      myRsvpIdx = 0; myPitchIdx = 0; myEventIdx = 0;
      if (capturedTab === myStuffTab) renderMyStuffTab(myStuffTab);
    }
  } catch (e) {
    log("error: loadMySubmissions " + e);
    container.innerHTML = '<div class="empty-state"><span class="emoji">❌</span><h2>Could not load</h2></div>';
  }
  myStuffLoading = false;
}
function renderMyRsvpCard(opts: { noFade?: boolean } = {}) {
  log("renderMyRsvpCard idx=" + myRsvpIdx + " total=" + myRsvps.length);
  var el = document.getElementById("my-stuff-container")!;
  updateMyStuffFooter("rsvps");
  updateCardDots("my-stuff", myRsvpIdx, myRsvps.length);
  if (myRsvps.length === 0) { el.innerHTML = '<div class="empty-state compact"><span class="emoji">🎟️</span><h2>No RSVPs yet</h2><p>Go to the Home tab to find events!</p><button class="btn btn-white btn-empty" data-action="close-overlay">← Back to Home</button></div>'; return; }
  if (myRsvpIdx >= myRsvps.length) myRsvpIdx = 0;
  var e = myRsvps[myRsvpIdx];
  var key = "rsvp-" + e.id;
  var desc = e.description || "";
  myStuffDescFullText[key] = desc;
  if (!myStuffDescPageTotal[key]) myStuffDescPageTotal[key] = desc.length > DESC_SHORT_LENGTH ? 99 : 1;
  myStuffDescPageIdx[key] = 0;

  var headerHtml = '<h3 style="font-size:17px;font-weight:700;margin:0 0 4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + escapeHtml(e.title) + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);font-weight:600;">📅 ' + escapeHtml(e.date) + ' at ' + escapeHtml(e.time) + '</div>' +
    '<div style="font-size:12px;color:var(--muted);">📍 ' + escapeHtml(e.location || "") + '</div>' +
    (e.category ? '<div style="margin:4px 0;">' + catBadge(e.category) + '</div>' : '');

  var bodyHtml = '<div id="my-stuff-desc-box-' + key + '" style="flex:1;min-height:0;overflow:hidden;background:#fff;border:var(--border);position:relative;">' +
      '<div id="my-stuff-desc-track-' + key + '" style="display:flex;width:100%;height:100%;position:absolute;top:0;left:0;transition:transform 0.25s;">' +
        '<div style="min-width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px;font-size:14px;line-height:1.45;word-break:break-word;">' + escapeHtml(desc.substring(0, DESC_SHORT_LENGTH)) + (desc.length > DESC_SHORT_LENGTH ? '...' : '') + '</div>' +
      '</div></div>' +
    '<div id="my-stuff-desc-nav-' + key + '" style="flex-shrink:0;margin-top:10px;display:flex;justify-content:center;align-items:center;gap:6px;"></div>';

  var actionsHtml = '<div style="display:flex;gap:8px;">' +
      '<button class="btn btn-white btn-action" data-id="' + e.id + '" data-action="update-rsvp">✏️ Update</button>' +
      '<button class="btn btn-white btn-action" data-id="' + e.id + '" data-action="leave-event">❌ Leave</button>' +
    '</div>';

  el.innerHTML = buildCardShell({ headerHtml: headerHtml, bodyHtml: bodyHtml, actionsHtml: actionsHtml, noFade: opts.noFade });
  if (desc.length > DESC_SHORT_LENGTH) {
    setTimeout(function () {
      var box = document.getElementById("my-stuff-desc-box-" + key);
      if (!box) return;
      var pages = splitTextToPages(myStuffDescFullText[key] || "", box.clientWidth, box.clientHeight);
      myStuffDescPageTotal[key] = pages.length;
      myStuffDescPageIdx[key] = 0;
      document.getElementById("my-stuff-desc-track-" + key)!.outerHTML = buildMyStuffDescPagesHTML(key, pages);
      document.getElementById("my-stuff-desc-nav-" + key)!.innerHTML = buildMyStuffDescNavHTML(key);
    }, AUTO_PAGINATE_DELAY);
  }
}
function renderMyPitchCard(opts: { noFade?: boolean } = {}) {
  log("renderMyPitchCard idx=" + myPitchIdx + " total=" + myPitches.length);
  var el = document.getElementById("my-stuff-container")!;
  updateMyStuffFooter("pitches");
  updateCardDots("my-stuff", myPitchIdx, myPitches.length);
  if (myPitches.length === 0) { el.innerHTML = '<div class="empty-state compact"><span class="emoji">💡</span><h2>No pitches yet</h2><p>Pitch an idea from the Create menu!</p><button class="btn btn-pink btn-empty" data-action="create-pitch">💡 Pitch an Idea</button></div>'; return; }
  if (myPitchIdx >= myPitches.length) myPitchIdx = 0;
  var p = myPitches[myPitchIdx];
  var key = "pitch-" + p.id;
  var desc = p.description || "";
  myStuffDescFullText[key] = desc;
  if (!myStuffDescPageTotal[key]) myStuffDescPageTotal[key] = desc.length > DESC_SHORT_LENGTH ? 99 : 1;
  myStuffDescPageIdx[key] = 0;

  var headerHtml = '<h3 style="font-size:17px;font-weight:700;margin:0 0 4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + escapeHtml(p.title) + '</h3>';

  var bodyHtml = '<div id="my-stuff-desc-box-' + key + '" style="flex:1;min-height:0;overflow:hidden;background:#fff;border:var(--border);position:relative;">' +
      '<div id="my-stuff-desc-track-' + key + '" style="display:flex;width:100%;height:100%;position:absolute;top:0;left:0;transition:transform 0.25s;">' +
        '<div style="min-width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px;font-size:14px;line-height:1.45;word-break:break-word;">' + escapeHtml(desc.substring(0, DESC_SHORT_LENGTH)) + (desc.length > DESC_SHORT_LENGTH ? '...' : '') + '</div>' +
      '</div></div>' +
    '<div id="my-stuff-desc-nav-' + key + '" style="flex-shrink:0;margin-top:10px;display:flex;justify-content:center;align-items:center;gap:6px;"></div>';

  var actionsHtml = '<button class="btn btn-white btn-action-full" data-id="' + p.id + '" data-action="delete-pitch">🗑️ Delete</button>';

  el.innerHTML = buildCardShell({ headerHtml: headerHtml, bodyHtml: bodyHtml, actionsHtml: actionsHtml, noFade: opts.noFade });
  if (desc.length > DESC_SHORT_LENGTH) {
    setTimeout(function () {
      var box = document.getElementById("my-stuff-desc-box-" + key);
      if (!box) return;
      var pages = splitTextToPages(myStuffDescFullText[key] || "", box.clientWidth, box.clientHeight);
      myStuffDescPageTotal[key] = pages.length;
      myStuffDescPageIdx[key] = 0;
      document.getElementById("my-stuff-desc-track-" + key)!.outerHTML = buildMyStuffDescPagesHTML(key, pages);
      document.getElementById("my-stuff-desc-nav-" + key)!.innerHTML = buildMyStuffDescNavHTML(key);
    }, AUTO_PAGINATE_DELAY);
  }
}
function renderMyEventCard(opts: { noFade?: boolean } = {}) {
  log("renderMyEventCard idx=" + myEventIdx + " total=" + myEvents.length);
  var el = document.getElementById("my-stuff-container")!;
  updateMyStuffFooter("events");
  updateCardDots("my-stuff", myEventIdx, myEvents.length);
  if (myEvents.length === 0) { el.innerHTML = '<div class="empty-state compact"><span class="emoji">📋</span><h2>No events yet</h2><p>Submit an event from the Create menu!</p><button class="btn btn-white btn-empty" data-action="create-event">📋 Submit Event</button></div>'; return; }
  if (myEventIdx >= myEvents.length) myEventIdx = 0;
  var e = myEvents[myEventIdx];
  var status = e.status === "published" ? "✅ Published" : "⏳ Pending";
  var key = "event-" + e.id;
  var desc = e.description || "";
  myStuffDescFullText[key] = desc;
  if (!myStuffDescPageTotal[key]) myStuffDescPageTotal[key] = desc.length > DESC_SHORT_LENGTH ? 99 : 1;
  myStuffDescPageIdx[key] = 0;

  var headerHtml = '<h3 style="font-size:17px;font-weight:700;margin:0 0 4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + escapeHtml(e.title) + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);font-weight:600;">📅 ' + escapeHtml(e.date) + ' at ' + escapeHtml(e.time) + '</div>' +
    '<div style="font-size:12px;font-weight:600;">' + status + '</div>' +
    (e.category ? '<div style="margin:4px 0;">' + catBadge(e.category) + '</div>' : '');

  var bodyHtml = '<div id="my-stuff-desc-box-' + key + '" style="flex:1;min-height:0;overflow:hidden;background:#fff;border:var(--border);position:relative;">' +
      '<div id="my-stuff-desc-track-' + key + '" style="display:flex;width:100%;height:100%;position:absolute;top:0;left:0;transition:transform 0.25s;">' +
        '<div style="min-width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px;font-size:14px;line-height:1.45;word-break:break-word;">' + escapeHtml(desc.substring(0, DESC_SHORT_LENGTH)) + (desc.length > DESC_SHORT_LENGTH ? '...' : '') + '</div>' +
      '</div></div>' +
    '<div id="my-stuff-desc-nav-' + key + '" style="flex-shrink:0;margin-top:10px;display:flex;justify-content:center;align-items:center;gap:6px;"></div>';

  var actionsHtml = (e.status === "pending" ?
        '<button class="btn btn-white btn-action-full" data-id="' + e.id + '" data-action="cancel-my-event">❌ Cancel</button>' :
        '<button class="btn btn-white btn-action-full" data-id="' + e.id + '" data-action="delete-my-event">🗑️ Delete</button>'
      );

  el.innerHTML = buildCardShell({ headerHtml: headerHtml, bodyHtml: bodyHtml, actionsHtml: actionsHtml, noFade: opts.noFade });
  if (desc.length > DESC_SHORT_LENGTH) {
    setTimeout(function () {
      var box = document.getElementById("my-stuff-desc-box-" + key);
      if (!box) return;
      var pages = splitTextToPages(myStuffDescFullText[key] || "", box.clientWidth, box.clientHeight);
      myStuffDescPageTotal[key] = pages.length;
      myStuffDescPageIdx[key] = 0;
      document.getElementById("my-stuff-desc-track-" + key)!.outerHTML = buildMyStuffDescPagesHTML(key, pages);
      document.getElementById("my-stuff-desc-nav-" + key)!.innerHTML = buildMyStuffDescNavHTML(key);
    }, AUTO_PAGINATE_DELAY);
  }
}
function updateMyStuffFooter(tab: string) {
  var items: any[] = [], idx = 0;
  if (tab === "rsvps") { items = myRsvps; idx = myRsvpIdx; }
  else if (tab === "pitches") { items = myPitches; idx = myPitchIdx; }
  else if (tab === "events") { items = myEvents; idx = myEventIdx; }
  log("updateMyStuffFooter tab=" + tab + " idx=" + idx + " total=" + items.length);
  updateCardNav("my-stuff", idx, items.length);
}
function myRsvpNext() { log("myRsvpNext idx=" + myRsvpIdx + "→" + (myRsvpIdx + 1) + " total=" + myRsvps.length); myRsvpIdx++; if (myRsvpIdx >= myRsvps.length) myRsvpIdx = myRsvps.length - 1; renderMyRsvpCard({ noFade: true }); }
function myRsvpPrev() { log("myRsvpPrev idx=" + myRsvpIdx + "→" + (myRsvpIdx - 1)); myRsvpIdx--; if (myRsvpIdx < 0) myRsvpIdx = 0; renderMyRsvpCard({ noFade: true }); }
function myPitchNext() { log("myPitchNext idx=" + myPitchIdx + "→" + (myPitchIdx + 1) + " total=" + myPitches.length); myPitchIdx++; if (myPitchIdx >= myPitches.length) myPitchIdx = myPitches.length - 1; renderMyPitchCard({ noFade: true }); }
function myPitchPrev() { log("myPitchPrev idx=" + myPitchIdx + "→" + (myPitchIdx - 1)); myPitchIdx--; if (myPitchIdx < 0) myPitchIdx = 0; renderMyPitchCard({ noFade: true }); }
function myEventNext() { log("myEventNext idx=" + myEventIdx + "→" + (myEventIdx + 1) + " total=" + myEvents.length); myEventIdx++; if (myEventIdx >= myEvents.length) myEventIdx = myEvents.length - 1; renderMyEventCard({ noFade: true }); }
function myEventPrev() { log("myEventPrev idx=" + myEventIdx + "→" + (myEventIdx - 1)); myEventIdx--; if (myEventIdx < 0) myEventIdx = 0; renderMyEventCard({ noFade: true }); }

// ======= MY STUFF DESC PAGINATION HELPERS =======
function buildMyStuffDescPagesHTML(key: string, pages: string[]): string {
  var pct = 100 / pages.length;
  var html = '<div id="my-stuff-desc-track-' + key + '" style="display:flex;width:' + (pages.length * 100) + '%;height:100%;position:absolute;top:0;left:0;transition:transform 0.25s;">';
  for (var i = 0; i < pages.length; i++) {
    html += '<div style="min-width:' + pct + '%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px;font-size:13px;line-height:1.45;word-break:break-word;">' + escapeHtml(pages[i]) + '</div>';
  }
  html += '</div>';
  return html;
}
function buildMyStuffDescNavHTML(key: string): string {
  var total = myStuffDescPageTotal[key] || 1;
  if (total <= 1) return '';
  var cur = myStuffDescPageIdx[key] || 0;
  return (cur > 0 ? '<button class="btn btn-white btn-pager" data-key="' + escapeAttr(key) + '" data-action="my-stuff-desc-prev">← Previous</button>' : '') +
    '<span style="font-size:12px;font-weight:700;">' + (cur + 1) + '/' + total + '</span>' +
    (cur < total - 1 ? '<button class="btn btn-white btn-pager" data-key="' + escapeAttr(key) + '" data-action="my-stuff-desc-next">Next →</button>' : '');
}

// ======= CREATE MENU =======
function toggleCreateMenu() { document.getElementById("create-menu")!.classList.toggle("active"); document.getElementById("create-backdrop")!.classList.toggle("active"); }
function closeCreateMenu() { document.getElementById("create-menu")!.classList.remove("active"); document.getElementById("create-backdrop")!.classList.remove("active"); }

// ======= EVENT DETAILS (unchanged) =======
function renderAttendees(eventId: string, att: any[]) {
  var el = document.getElementById("rsvps-public-" + eventId);
  if (!el) return;
  attListStore[eventId] = att;
  if (att.length === 0) { el.innerHTML = '<div style="text-align:center;padding:20px;font-size:14px;color:var(--muted);">No one yet — be the first!</div>'; return; }
  var perPage = ATTENDEES_PER_PAGE, totalPages = Math.ceil(att.length / perPage);
  attPageIdx[eventId] = 0;
  var pages = '';
  for (var p = 0; p < totalPages; p++) {
    pages += '<div style="min-width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px;">';
    for (var i = p * perPage; i < Math.min(att.length, (p + 1) * perPage); i++) {
      pages += '<div style="font-size:14px;font-weight:600;padding:8px 6px;border-bottom:1px solid var(--outline-v);display:flex;align-items:center;gap:8px;"><div style="width:28px;height:28px;border:3px solid #1c1c0f;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">' + att[i].username.charAt(0).toUpperCase() + '</div>u/' + escapeHtml(att[i].username) + '</div>';
    }
    pages += '</div>';
  }
  el.innerHTML = '<div id="att-track-' + eventId + '" style="display:flex;width:' + (totalPages * 100) + '%;height:100%;position:absolute;top:0;left:0;transition:transform 0.25s;">' + pages + '</div>';
  document.getElementById("att-nav-" + eventId)!.innerHTML = buildAttNav(eventId);
  if (detailStep === 3) persistStep3(eventId);
}
async function loadPublicAttendees(eventId: string) {
  // Check cache first
  var cached = attendeeCache[eventId];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_ATTENDEES) {
    renderAttendees(eventId, cached.data);
    return;
  }
  try {
    var res = await fetch(API_BASE + "/api/rsvp-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: eventId }) });
    var data = await res.json();
    if (data.type === "rsvp-list") {
      var att = data.attendees || [];
      attendeeCache[eventId] = { data: att, timestamp: Date.now() };
      // Guard: only render if details overlay is still open for this event
      var detailsOverlay2 = document.getElementById("details-overlay");
      if (detailsOverlay2 && detailsOverlay2.classList.contains("active") && currentEventId === eventId) {
        renderAttendees(eventId, att);
      } else {
        log("loadPublicAttendees STALE RESPONSE REJECTED — overlay closed or different event");
      }
    }
  } catch (e) { log("error: loadPublicAttendees " + e); }
}

function buildAttNav(eventId: string): string {
  var total = Math.ceil((attListStore[eventId] || []).length / ATTENDEES_PER_PAGE);
  if (total <= 1) return '';
  var cur = attPageIdx[eventId] || 0;
  return (cur > 0 ? '<button class="btn btn-white btn-pager btn-att-prev" data-id="' + eventId + '" data-action="att-prev">← Prev</button>' : '') +
    '<span style="font-size:12px;font-weight:700;padding:4px 8px;">' + (cur + 1) + '/' + total + '</span>' +
    (cur < total - 1 ? '<button class="btn btn-white btn-pager btn-att-next" data-id="' + eventId + '" data-action="att-next">Next →</button>' : '');
}

function slideTrack(trackId: string, page: number, totalPages: number) {
  var track = document.getElementById(trackId);
  if (track) track.style.transform = "translateX(-" + (page * (100 / totalPages)) + "%)";
}

var _measureDiv: HTMLDivElement | null = null;
function splitTextToPages(text: string, width: number, maxHeight: number): string[] {
  if (!_measureDiv) {
    _measureDiv = document.createElement("div");
    _measureDiv.style.cssText = "position:absolute;left:-9999px;top:0;font-size:15px;line-height:1.5;font-family:'Space Grotesk',sans-serif;padding:14px;word-break:break-word;white-space:pre-wrap;visibility:hidden;";
    document.body.appendChild(_measureDiv);
  }
  _measureDiv.style.width = width + "px";
  var words = text.split(" ");
  var pages: string[] = [];
  var current = "";
  for (var i = 0; i < words.length; i++) {
    var word = words[i] || "";
    var test = current ? current + " " + word : word;
    _measureDiv.textContent = test;
    if (_measureDiv.scrollHeight > maxHeight && current) { pages.push(current); current = word; }
    else { current = test; }
  }
  if (current) pages.push(current);
  return pages.length ? pages : [text];
}

function buildDescPagesHTML(eventId: string, pages: string[], trackPrefix = "desc-track-"): string {
  var pct = (100 / pages.length);
  var html = '<div id="' + trackPrefix + eventId + '" style="display:flex;width:' + (pages.length * 100) + '%;height:100%;position:absolute;top:0;left:0;transition:transform 0.25s;">';
  for (var i = 0; i < pages.length; i++) {
    html += '<div style="min-width:' + pct + '%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px;font-size:15px;line-height:1.5;word-break:break-word;">' + escapeHtml(pages[i]) + '</div>';
  }
  html += '</div>';
  return html;
}

function buildDescNavHTML(eventId: string): string {
  var total = descPageTotal[eventId] || 1;
  if (total <= 1) return '';
  var cur = descPageIdx[eventId] || 0;
  return (cur > 0 ? '<button class="btn btn-white btn-pager btn-desc-prev" data-id="' + eventId + '" data-action="desc-prev">← Previous</button>' : '') +
    '<span style="font-size:12px;font-weight:700;">' + (cur + 1) + '/' + total + '</span>' +
    (cur < total - 1 ? '<button class="btn btn-white btn-pager btn-desc-next" data-id="' + eventId + '" data-action="desc-next">Next →</button>' : '');
}

function buildModDetailDescNavHTML(eventId: string): string {
  var total = descPageTotal[eventId] || 1;
  if (total <= 1) return '';
  var cur = descPageIdx[eventId] || 0;
  return (cur > 0 ? '<button class="btn btn-white btn-pager" data-id="' + eventId + '" data-action="mod-detail-desc-prev">← Previous</button>' : '') +
    '<span style="font-size:12px;font-weight:700;">' + (cur + 1) + '/' + total + '</span>' +
    (cur < total - 1 ? '<button class="btn btn-white btn-pager" data-id="' + eventId + '" data-action="mod-detail-desc-next">Next →</button>' : '');
}

function persistStep2(eventId: string) {
  var body = document.getElementById("detail-body");
  if (!body) return;
  detailStep2 = body.innerHTML;
}

function persistStep3(eventId: string) {
  var body = document.getElementById("detail-body");
  if (!body) return;
  detailStep3 = body.innerHTML;
}

async function showEventDetails(id: string) {
  log("showEventDetails id=" + id + " loading=" + detailLoading);
  if (detailLoading) return;

  // Check detail cache before fetching
  var cached = detailCache[id];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_DETAIL) {
    log("showEventDetails using detailCache " + id);
    openDetailsOverlay(cached.data);
    // Still set detailLoading to block concurrent calls, but don't fetch
    detailLoading = false;
    return;
  }

  detailLoading = true;
  currentEventId = id;
  var cachedEvent = cachedHomeEvents.find(function (event) { return event.id === id; });
  if (cachedEvent) {
    log("showEventDetails using cached event " + id);
    openDetailsOverlay({ event: cachedEvent, rsvpCount: cachedEvent.rsvpCount || 0, hasRsvped: cachedEvent.hasRsvped || false, settings: {} });
  }
  try {
    var res = await fetch(API_BASE + "/api/event-details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });
    var data = await res.json();
    if (data.type === "event-details" && currentEventId === id) {
      // Guard: don't re-open if user navigated away while fetch was in flight
      var detailsOverlay = document.getElementById("details-overlay");
      if (detailsOverlay && !detailsOverlay.classList.contains("active")) {
        log("showEventDetails STALE RESPONSE REJECTED — user navigated away from " + id);
        detailLoading = false;
        return;
      }
      log("showEventDetails server response " + id + " hasRsvped=" + data.data.hasRsvped);
      detailCache[id] = { data: data.data, timestamp: Date.now() };
      openDetailsOverlay(data.data);
      detailLoading = false;
      return;
    }
    log("showEventDetails stale response " + id + " current=" + currentEventId);
  } catch (e) { log("showEventDetails fetch error " + id); }
  if (!cachedEvent) openDetailsOverlay({ event: { id: id, title: "Event", date: "", time: "", location: "", description: "", organizer: "", mapUrl: "" }, rsvpCount: 0, hasRsvped: false, settings: {} });
  detailLoading = false;
}
function openDetailsOverlay(d: { event: any; rsvpCount: number; hasRsvped: boolean; settings: any }) {
  var e = d.event;
  var isOpen = document.getElementById("details-overlay")!.classList.contains("active");
  log("openDetailsOverlay event=" + e.id + " isOpen=" + isOpen + " hasRsvped=" + d.hasRsvped + " step=" + detailStep);
  document.getElementById("details-overlay-title")!.textContent = e.title;
  var date = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Card 1: Quick Info
  var s1 = '<div class="detail-card" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:16px;">' +
    (e.emoji ? '<div style="text-align:center;font-size:48px;margin-bottom:4px;">' + e.emoji + '</div>' : '') +
    '<div style="text-align:center;"><div style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">📅 Date</div><div style="font-size:18px;font-weight:700;">' + date + '</div></div>' +
    '<div style="text-align:center;"><div style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">⏰ Time</div><div style="font-size:18px;font-weight:700;">' + escapeHtml(e.time) + '</div></div>' +
    '<div style="text-align:center;"><div style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">📍 Location</div><div style="font-size:16px;font-weight:700;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;max-height:42px;">' + escapeHtml(e.location) + '</div></div>' +
    (e.category ? '<div style="text-align:center;margin-top:4px;">' + catBadge(e.category) + '</div>' : '') +
    '<div style="background:var(--surface);border:var(--border);padding:10px;text-align:center;font-weight:700;font-size:14px;margin-top:2px;">👥 ' + d.rsvpCount + ' people going</div>' +
    '</div>';

  // Card 2: Organizer + Description
  var descFull = e.description || "", descShort = descFull.substring(0, DESC_SHORT_LENGTH), hasMore = descFull.length > DESC_SHORT_LENGTH;
  descFullText[e.id] = descFull;
  if (!isOpen) { descPageIdx[e.id] = 0; descPageTotal[e.id] = hasMore ? 99 : 1; }
  var s2 = '<div class="detail-card" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:6px;padding:8px 0;">';
  if (e.organizer) { var initial = e.organizer.replace("u/", "").charAt(0).toUpperCase(); s2 += '<div style="display:flex;align-items:center;gap:10px;padding:10px;margin:0 8px;background:var(--surface);border:var(--border);flex-shrink:0;"><div style="width:36px;height:36px;border:var(--border);background:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;">' + initial + '</div><div><div style="font-weight:700;font-size:10px;text-transform:uppercase;color:var(--muted);">Organizer</div><div style="font-weight:700;font-size:14px;">' + escapeHtml(e.organizer) + '</div></div></div>'; }
  s2 += '<div style="flex:1;min-height:0;overflow:hidden;margin:0 8px;background:#fff;border:var(--border);position:relative;" id="desc-box-' + e.id + '">' +
    '<div id="desc-track-' + e.id + '" style="display:flex;width:100%;height:100%;position:absolute;top:0;left:0;transition:transform 0.25s;">' +
    '<div id="desc-page-initial-' + e.id + '" style="min-width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px;font-size:15px;line-height:1.5;word-break:break-word;">' +
      escapeHtml(descShort) + (hasMore ? '...' : '') +
    '</div></div></div>' +
    '<div id="desc-nav-' + e.id + '" style="flex-shrink:0;display:flex;justify-content:center;align-items:center;gap:8px;padding:4px 8px 0 8px;min-height:28px;">' +
      (hasMore ? '<button class="btn btn-white btn-pager btn-desc-next" data-id="' + e.id + '" data-action="desc-next">Read more →</button>' : '') +
    '</div>';
  if (e.mapUrl) { s2 +=       '<div style="display:flex;align-items:center;gap:8px;padding:8px;margin:0 8px;background:var(--surface);border:var(--border);flex-shrink:0;"><span style="flex:1;font-size:14px;font-weight:600;">🗺️ Google Maps</span><button class="copy-btn btn-copy btn-copy-link" data-id="' + escapeAttr(e.mapUrl) + '" data-action="copy-link">📋 Copy</button></div>'; }
  s2 += '</div>';

  // Card 3: Who's Going
  if (!isOpen) attPageIdx[e.id] = 0;
  var s3 = '<div class="detail-card" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;padding:4px 0;">' +
    '<div style="text-align:center;padding:12px 0 8px 0;font-weight:700;font-size:17px;flex-shrink:0;">👥 Who\'s Going?</div>' +
    '<div style="text-align:center;font-size:14px;color:var(--muted);padding-bottom:8px;flex-shrink:0;">' + d.rsvpCount + ' attendee' + (d.rsvpCount !== 1 ? 's' : '') + '</div>' +
    '<div style="flex:1;min-height:0;overflow:hidden;margin:0 8px;background:#fff;border:var(--border);position:relative;"><div id="rsvps-public-' + e.id + '" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div></div>' +
    '<div id="att-nav-' + e.id + '" style="flex-shrink:0;display:flex;justify-content:center;align-items:center;gap:8px;padding:6px 8px 0 8px;min-height:32px;"></div>' +
    '</div>';

  // Card 4: RSVP / Leave
  var s4 = d.hasRsvped
    ? '<div class="detail-card" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:10px;padding:20px;text-align:center;padding-top:32px;">' +
      '<div style="font-size:56px;">🎉</div>' +
      '<div style="font-size:18px;font-weight:700;">You\'re on the list!</div>' +
      '<div style="font-size:14px;color:var(--muted);">See you there</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;width:100%;max-width:260px;">' +
      '<button class="btn btn-white btn-action btn-update-rsvp" data-id="' + e.id + '" data-action="update-rsvp">✏️ Update</button>' +
      '<button class="btn btn-white btn-action btn-leave-event" data-id="' + e.id + '" data-action="leave-event">❌ Leave</button>' +
      '</div>' +
      '</div>'
    : '<div class="detail-card" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;text-align:center;">' +
      '<div style="font-size:64px;">🎟️</div>' +
      '<div style="font-size:20px;font-weight:700;">Ready to join?</div>' +
      '<div style="font-size:14px;color:var(--muted);">' + d.rsvpCount + ' people are going</div>' +
      '<button class="btn btn-pink btn-rsvp-now" data-id="' + e.id + '" data-action="rsvp-now" style="width:80%;">🎟️ RSVP Now</button>';
      '</div>';

  detailStep1 = s1; detailStep2 = s2; detailStep3 = s3; detailStep4 = s4;
  if (!isOpen) {
    detailStep = 1;
    ["detail-dot-1", "detail-dot-2", "detail-dot-3", "detail-dot-4"].forEach(function (id, i) { document.getElementById(id)!.classList.toggle("done", i === 0); });
    document.getElementById("detail-body")!.innerHTML = s1;
    document.getElementById("detail-next-btn")!.classList.remove("hidden"); document.getElementById("detail-prev-btn")!.classList.add("hidden");
    openOverlay("details-overlay");
    // Load attendees on first open only
    loadPublicAttendees(e.id);
  }
  
}
function detailNext() {
  log("detailNext from=" + detailStep);
  if (detailStep === 1) {
    document.getElementById("detail-dot-2")!.classList.add("done");
    pulseDot("detail-dot-2");
    document.getElementById("detail-body")!.innerHTML = detailStep2;
    document.getElementById("detail-prev-btn")!.classList.remove("hidden");
     detailStep = 2;
  } else if (detailStep === 2) {
    document.getElementById("detail-dot-3")!.classList.add("done");
    pulseDot("detail-dot-3");
    document.getElementById("detail-body")!.innerHTML = detailStep3;
    if (currentEventId) loadPublicAttendees(currentEventId);
     detailStep = 3;
  } else if (detailStep === 3) {
    document.getElementById("detail-dot-4")!.classList.add("done");
    pulseDot("detail-dot-4");
    document.getElementById("detail-body")!.innerHTML = detailStep4;
    document.getElementById("detail-next-btn")!.classList.add("hidden");
    document.getElementById("detail-prev-btn")!.classList.remove("hidden");
     detailStep = 4;
  }
}
function detailPrev() {
  log("detailPrev from=" + detailStep);
  if (detailStep === 2) {
    document.getElementById("detail-dot-2")!.classList.remove("done");
    pulseDot("detail-dot-2");
    document.getElementById("detail-body")!.innerHTML = detailStep1;
    document.getElementById("detail-prev-btn")!.classList.add("hidden");
     detailStep = 1;
  } else if (detailStep === 3) {
    document.getElementById("detail-dot-3")!.classList.remove("done");
    pulseDot("detail-dot-3");
    document.getElementById("detail-body")!.innerHTML = detailStep2;
    document.getElementById("detail-next-btn")!.classList.remove("hidden");
     detailStep = 2;
  } else if (detailStep === 4) {
    document.getElementById("detail-dot-4")!.classList.remove("done");
    pulseDot("detail-dot-4");
    document.getElementById("detail-body")!.innerHTML = detailStep3;
    document.getElementById("detail-next-btn")!.classList.remove("hidden");
    if (currentEventId) loadPublicAttendees(currentEventId);
     detailStep = 3;
  }
}

function modNext() { var tab = modTab; log("modNext tab=" + tab); var idx = (modCardIdx[tab] || 0) + 1; var items = modItems[tab] || []; if (idx >= items.length) idx = items.length - 1; modCardIdx[tab] = idx; renderModCard(tab, { noFade: true }); updateCardDots("mod", idx, items.length); updateCardNav("mod", idx, items.length); }
function modPrev() { var tab = modTab; log("modPrev tab=" + tab); var idx = (modCardIdx[tab] || 0) - 1; if (idx < 0) idx = 0; modCardIdx[tab] = idx; renderModCard(tab, { noFade: true }); updateCardDots("mod", idx, (modItems[tab] || []).length); updateCardNav("mod", idx, (modItems[tab] || []).length); }
var modTab = "pending";
function showModDashboard() { openOverlay("mod-screen"); delete modTabCache["published"]; delete modTabCache["pitches"]; loadModTab("pending"); }
function switchModTab(tab: string) { if (tab === modTab) return; modTab = tab; document.querySelectorAll("#mod-tabs .mod-tab").forEach(function (t) { t.classList.toggle("active", (t as HTMLElement).dataset.mtab === tab); }); delete modTabCache[tab]; loadModTab(tab); }
function setModLoading(l: boolean) { var c = document.getElementById("pending-events-container"); if (c) c.style.opacity = l ? "0.4" : "1"; var t = document.getElementById("mod-tabs"); if (t) t.style.pointerEvents = l ? "none" : "auto"; }
async function loadModTab(tab: string) {
  // Check cache first
  var cached = modTabCache[tab];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MOD) {
    log("loadModTab using cache " + tab);
    if (tab === "pending") renderModPending(cached.data);
    else if (tab === "published") renderModPublished(cached.data);
    else if (tab === "pitches") renderModPitches(cached.data);
    return;
  }
  // Skip if already fetching this tab
  if (modFetching[tab]) { log("loadModTab skipped: fetch already in progress for " + tab); return; }
  modFetching[tab] = true;
  setModLoading(true);
  try {
    if (tab === "pending") {
      var pr = await fetch(API_BASE + "/api/pending-events");
      var pd = await pr.json();
      if (pd.type === "pending-events") { modTabCache[tab] = { data: pd.events, timestamp: Date.now() }; renderModPending(pd.events); }
    } else if (tab === "published") {
      var res = await fetch(API_BASE + "/api/all-approved-events");
      var d = await res.json();
      if (d.type === "all-approved-events") { modTabCache[tab] = { data: d.events, timestamp: Date.now() }; renderModPublished(d.events); }
    } else if (tab === "pitches") {
      var res2 = await fetch(API_BASE + "/api/pitched-ideas");
      var d2 = await res2.json();
      if (d2.type === "pitched-ideas") { modTabCache[tab] = { data: d2.ideas, timestamp: Date.now() }; renderModPitches(d2.ideas); }
    }
  } catch (e) { log("error: loadModTab " + e); }
  finally { modFetching[tab] = false; setModLoading(false); }
}
function renderModCard(tab: string, opts: { noFade?: boolean } = {}) {
  log("renderModCard tab=" + tab);
  var items = modItems[tab] || [];
  var idx = modCardIdx[tab] || 0;
  if (items.length === 0) return;
  if (idx >= items.length) { modCardIdx[tab] = 0; idx = 0; }
  var item = items[idx];
  var total = items.length;
  var c = document.getElementById("pending-events-container")!;
  var desc = item.description || "";
  var dcKey = tab + "-" + idx;
  var color = tab === "pending" ? "#ff69b4" : (tab === "pitches" ? "#ffeaa7" : "#fff");

  // modDesc* state is no longer used by the in-card body (it's a scrollable snippet now),
  // but the keys are preserved so the mod detail overlay (which uses them) stays consistent.
  modDescFullText[dcKey] = desc;
  if (!modDescTotal[dcKey]) modDescTotal[dcKey] = desc.length > DESC_SHORT_LENGTH ? 99 : 1;
  modDescPageIdx[dcKey] = 0;

  // Header
  var headerHtml = '';
  if (item.emoji) { headerHtml += '<div style="font-size:28px;margin-bottom:4px;">' + item.emoji + '</div>'; }
  headerHtml += '<h3 style="font-size:18px;font-weight:700;margin:0 0 4px 0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + escapeHtml(item.title) + '</h3>';
  headerHtml += '<div style="font-size:12px;color:var(--muted);font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:4px;min-width:0;">';
  if (tab === "pitches") { headerHtml += '👤 u/' + escapeHtml(item.submittedBy) + ' · ' + escapeHtml(new Date(item.submittedAt).toLocaleString()); }
  else { headerHtml += '<span style="flex-shrink:0;">📅 ' + escapeHtml(item.date) + ' at ' + escapeHtml(item.time) + ' ·</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📍 ' + escapeHtml(item.location || "") + '</span>'; }
  headerHtml += '</div>';
  log("renderModCard metadata location truncated tab=" + tab);
  if (tab !== "pitches" && item.category) { headerHtml += '<div style="margin-bottom:6px;">' + catBadge(item.category) + '</div>'; }
  // RSVP count badge for published events
  if (tab === "published") {
    var rc = item.rsvpCount || 0;
    var badgeColor = rc === 0 ? "#ff4444" : (rc < 5 ? "#ffaa00" : "#00ff88");
    var badgeText = rc === 0 ? "🔴 No RSVPs" : (rc < 5 ? "🟡 " + rc + " going" : "🟢 " + rc + " going");
    headerHtml += '<div style="font-size:11px;font-weight:700;color:#fff;background:' + badgeColor + ';border:var(--border);padding:2px 8px;margin-bottom:6px;display:inline-block;">' + badgeText + '</div>';
  }
  // Past event badge for mods
  if (tab !== "pitches") {
    var today2 = new Date().toISOString().split("T")[0] || "";
    if (item.date < today2) {
      headerHtml += '<div style="font-size:11px;font-weight:700;color:#fff;background:#999;border:var(--border);padding:2px 8px;margin-bottom:6px;display:inline-block;">⏰ Past Event</div>';
    }
  }
  log("renderModCard header complete tab=" + tab);

  // Body - scrollable description snippet (matches home card pattern).
  // No pagination: short text just scrolls inside the box. Saves vertical space
  // and lets the actions sit at the bottom of the card without overflow.
  // Progress dots are pinned to the bottom of the body (above the actions)
  // so they stay at a consistent y-position regardless of header/badge heights.
  var descSnippet = desc.substring(0, DESC_PREVIEW_LENGTH) + (desc.length > DESC_PREVIEW_LENGTH ? '...' : '');
  var bodyHtml = '<div style="flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 10px;background:#fff;border:var(--border);font-size:14px;line-height:1.45;word-break:break-word;">' +
    (descSnippet ? escapeHtml(descSnippet) : '<span style="color:var(--muted);font-style:italic;">No description</span>') +
    '</div>' +
    '<div class="card-progress mod-dots" style="flex-shrink:0;margin-top:6px;"></div>';
  log("renderModCard body tab=" + tab + " hasDesc=" + (desc.length > 0) + " snippetLen=" + descSnippet.length);

  // Actions
  var actionsHtml = '';
  if (tab === "pending") {
    actionsHtml = '<div style="display:flex;gap:8px;">' +
      '<button class="btn btn-green btn-action btn-approve-event" data-id="' + item.id + '" data-action="approve-event">✅ Approve</button>' +
      '<button class="btn btn-white btn-action btn-decline-event" data-id="' + item.id + '" data-action="decline-event">🗑️ Decline</button>' +
      '</div>';
  } else if (tab === "published") {
    // Single row, like the home card: Details | Attendees count | Delete icon
    actionsHtml = '<div style="display:flex;gap:6px;align-items:center;">' +
      '<button class="btn btn-white btn-action btn-view-mod-details" data-id="' + item.id + '" data-action="view-mod-details" style="flex:1;">Details →</button>' +
      '<button class="btn btn-white btn-action btn-view-attendees" data-id="' + item.id + '" data-action="view-attendees-mod" style="flex:1;">👥 ' + (item.rsvpCount || 0) + '</button>' +
      '<button class="btn btn-white btn-icon btn-delete-published" data-id="' + item.id + '" data-action="delete-published" title="Delete event" aria-label="Delete event">🗑️</button>' +
      '</div>';
  } else {
    actionsHtml = '<button class="btn btn-white btn-action-full btn-dismiss-idea" data-id="' + item.id + '" data-action="dismiss-idea">🗑️ Dismiss</button>';
  }

  c.innerHTML = buildCardShell({ color: color, headerHtml: headerHtml, bodyHtml: bodyHtml, actionsHtml: actionsHtml, noFade: opts.noFade });
  updateCardDots("mod", idx, total);
  updateCardNav("mod", idx, total);

  // Mod card body is now a simple scrollable snippet (matches home card pattern).
  // No auto-paginate needed — the body element handles overflow naturally.
}

function buildModDescPagesHTML(key: string, pages: string[]): string {
  var pct = 100 / pages.length;
  var html = '<div id="mod-desc-track-' + key + '" style="display:flex;width:' + (pages.length * 100) + '%;height:100%;position:absolute;top:0;left:0;transition:transform 0.25s;">';
  for (var i = 0; i < pages.length; i++) {
    html += '<div style="min-width:' + pct + '%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px;font-size:14px;line-height:1.45;word-break:break-word;">' + escapeHtml(pages[i]) + '</div>';
  }
  html += '</div>';
  return html;
}

function buildModDescNavHTML(key: string): string {
  var total = modDescTotal[key] || 1;
  if (total <= 1) return '';
  var cur = modDescPageIdx[key] || 0;
  return (cur > 0 ? '<button class="btn btn-white btn-pager btn-mod-desc-prev" data-key="' + escapeAttr(key) + '" data-action="mod-desc-prev">← Previous</button>' : '') +
    '<span style="font-size:12px;font-weight:700;">' + (cur + 1) + '/' + total + '</span>' +
    (cur < total - 1 ? '<button class="btn btn-white btn-pager btn-mod-desc-next" data-key="' + escapeAttr(key) + '" data-action="mod-desc-next">Next →</button>' : '');
}

function renderModPending(events: any[]) {
  log("renderModPending count=" + events.length);
  modItems["pending"] = events;
  modCardIdx["pending"] = 0;
  if (events.length === 0) {
    document.getElementById("pending-events-container")!.innerHTML = '<div class="empty-state"><span class="emoji">📋</span><h2>No pending events</h2></div>';
    updateCardDots("mod", 0, 0);
    updateCardNav("mod", 0, 0);
    return;
  }
  renderModCard("pending");
}
function renderModPublished(events: any[]) {
  // Sort by RSVP count descending (most popular first)
  events.sort(function(a, b) { return (b.rsvpCount || 0) - (a.rsvpCount || 0); });
  log("renderModPublished sorted " + events.length + " events by RSVP count");
  modItems["published"] = events;
  modCardIdx["published"] = 0;
  if (events.length === 0) {
    document.getElementById("pending-events-container")!.innerHTML = '<div class="empty-state"><span class="emoji">✅</span><h2>No published events</h2></div>';
    updateCardDots("mod", 0, 0);
    updateCardNav("mod", 0, 0);
    return;
  }
  renderModCard("published");
}
function renderModPitches(ideas: any[]) {
  log("renderModPitches count=" + ideas.length);
  modItems["pitches"] = ideas;
  modCardIdx["pitches"] = 0;
  if (ideas.length === 0) {
    document.getElementById("pending-events-container")!.innerHTML = '<div class="empty-state"><span class="emoji">💡</span><h2>No pitched ideas</h2></div>';
    updateCardDots("mod", 0, 0);
    updateCardNav("mod", 0, 0);
    return;
  }
  renderModCard("pitches");
}

// ======= LOADING HELPER =======
function setBtnLoading(selector: string, loading: boolean, text?: string) {
  var btn = document.querySelector(selector) as HTMLElement | null;
  if (!btn) return;
  if (loading) {
    // Only store original text if not already stored (prevents overwriting on rapid calls)
    if (!btn.dataset.originalText) {
      btn.dataset.originalText = btn.textContent || "";
    }
    btn.textContent = text || "⏳ Processing...";
    (btn as any).disabled = true;
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
  } else {
    // Only restore if we have a stored original (prevents blank text on double-reset)
    if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
    (btn as any).disabled = false;
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
  }
}

// ======= CONFIRM HELPER =======
function getItemTitle(id: string, store: Record<string, any[]>): string {
  for (var key in store) {
    var items = store[key] || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].id === id) return items[i].title || items[i].id;
    }
  }
  return id;
}
// Per-element resolver avoids race when two confirms fire in quick succession
function confirmDestructive(msg: string): Promise<boolean> {
  // Truncate long/PII-containing titles — cap at 80 chars
  var truncated = msg.length > 80 ? msg.substring(0, 77) + "..." : msg;
  log("confirmDestructive: " + truncated);
  document.getElementById("confirm-message")!.textContent = truncated;
  openOverlay("confirm-overlay");
  return new Promise(function (resolve) {
    var el = document.getElementById("confirm-overlay")!;
    (el as any)._confirmResolve = resolve;
  });
}

// ======= ACTIONS =======
var actionLocks: Record<string, boolean> = {};
function isLocked(key: string): boolean { return !!actionLocks[key]; }
function lock(key: string) { actionLocks[key] = true; }
function unlock(key: string) { actionLocks[key] = false; }

// U4: Show actual server error messages instead of generic "Error"
async function tryShowServerError(res: Response | undefined, fallback: string) {
  var msg = fallback;
  if (res) {
    try {
      var data = await res.json();
      if (data && data.error) msg = data.error;
    } catch (_) {}
  }
  showToast(msg, "error");
}
async function exportAttendeesCSV(id: string) {
  log("exportAttendeesCSV id=" + id);
  var k = "export-" + id;
  if (isLocked(k)) return;
  lock(k);
  setBtnLoading('[data-action="export-csv"][data-id="' + id + '"]', true, "⏳ Copying...");
  try {
    var res = await fetch(API_BASE + "/api/export-attendees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });
    var data = await res.json();
    if (data.type === "export-attendees" && data.csv) {
      var csvText = data.csv;
      var copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(csvText);
          copied = true;
        } catch (e) { log("clipboard write failed: " + e); }
      }
      if (!copied) {
        var ta = document.createElement("textarea");
        ta.value = csvText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          copied = true;
        } catch (e) { log("execCommand copy failed: " + e); }
        document.body.removeChild(ta);
      }
      if (copied) {
        showToast("CSV copied! Paste into a spreadsheet 📋", "success");
      } else {
        showToast("Could not copy — try again", "error");
      }
    } else {
      await tryShowServerError(res, "Export failed");
    }
  } catch (e) { showToast("Network error", "error"); }
  finally { setBtnLoading('[data-action="export-csv"][data-id="' + id + '"]', false); unlock(k); }
}
async function approveEvent(id: string) { log("approveEvent id=" + id); var k = "approve-" + id; if (isLocked(k)) return; lock(k); var title = getItemTitle(id, modItems); if (!await confirmDestructive('Approve "' + title + '"? This will publish it for everyone.')) { unlock(k); return; } var btn = document.querySelector('[data-id="' + id + '"].btn-approve-event') as HTMLElement; if (btn) { btn.dataset.originalText = btn.textContent || ""; btn.style.opacity = "0.3"; btn.style.pointerEvents = "none"; btn.textContent = "⏳ Approving..."; } var res; try { res = await fetch(API_BASE + "/api/approve-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });     if (res.ok) { showToast("Event approved!", "success"); if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; btn.textContent = btn.dataset.originalText || "✅ Approve & Publish"; delete btn.dataset.originalText; }       // Optimistically move from pending to published
      var pendingItems = modItems["pending"] || [];
      var pendingIdx = pendingItems.findIndex(function(e: any) { return e.id === id; });
      if (pendingIdx >= 0) {
        var approvedEvt = pendingItems.splice(pendingIdx, 1)[0];
        if (approvedEvt) { approvedEvt.status = "published"; (modItems["published"] || []).push(approvedEvt); log("optimistic approve: moved " + id + " to published"); }
      }
      // Re-render mod dashboard if user is viewing it
      var modScreen = document.getElementById("mod-screen");
      if (modScreen && modScreen.classList.contains("active")) {
        if (modTab === "pending") { renderModPending(modItems["pending"] || []); }
        else if (modTab === "published") { renderModPublished(modItems["published"] || []); }
      }
      delete modTabCache["pending"]; delete modTabCache["published"];
    } else { await tryShowServerError(res, "Approve failed"); } } catch (e) { showToast("Network error", "error"); } finally { if (btn && (res && !res.ok || !res)) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; btn.textContent = btn.dataset.originalText || "✅ Approve & Publish"; delete btn.dataset.originalText; } unlock(k); } }
async function deleteEvent(id: string, type: string) { log("deleteEvent id=" + id + " type=" + type); var k = type + "-" + id; if (isLocked(k)) return; lock(k); var title = getItemTitle(id, modItems); if (!await confirmDestructive('Delete "' + title + '"? This cannot be undone.')) { unlock(k); return; } var sel = type === "pending" ? ".btn-decline-event" : ".btn-delete-published"; var btn = document.querySelector('[data-id="' + id + '"]' + sel) as HTMLElement; if (btn) { btn.style.opacity = "0.3"; btn.style.pointerEvents = "none"; } var parent = btn ? btn.closest(".pending-card,.event-card") as HTMLElement : null; if (parent) parent.style.opacity = "0.3"; var endpoint = type === "pending" ? "/api/delete-pending" : "/api/delete-published"; var res; try { res = await fetch(API_BASE + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });     if (res.ok) { showToast("Deleted", "success"); if (parent) parent.style.opacity = "1"; if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; }       // Optimistically remove from modItems
      var tabName = type === "pending" ? "pending" : "published";
      var tabItems = modItems[tabName] || [];
      var delIdx2 = tabItems.findIndex(function(e: any) { return e.id === id; });
      if (delIdx2 >= 0) { tabItems.splice(delIdx2, 1); log("optimistic delete: removed " + id + " from " + tabName); }
      // Re-render mod dashboard if user is viewing it
      var modScreen2 = document.getElementById("mod-screen");
      if (modScreen2 && modScreen2.classList.contains("active") && modTab === tabName) {
        if (tabName === "pending") { renderModPending(modItems["pending"] || []); }
        else { renderModPublished(modItems["published"] || []); }
      }
      delete modTabCache[type];
    } else { await tryShowServerError(res, "Delete failed"); if (parent) parent.style.opacity = "1"; if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; } } } catch (e) { showToast("Network error", "error"); if (parent) parent.style.opacity = "1"; if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; } } finally { unlock(k); } }
async function dismissIdea(id: string) { log("dismissIdea id=" + id); var k = "dismiss-" + id; if (isLocked(k)) return; lock(k); var title = getItemTitle(id, modItems); if (!await confirmDestructive('Dismiss "' + title + '"? This cannot be undone.')) { unlock(k); return; } setBtnLoading('[data-action="dismiss-idea"][data-id="' + id + '"]', true, "⏳ Dismissing..."); var res; try { res = await fetch(API_BASE + "/api/dismiss-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ideaId: id }) });     if (res.ok) { showToast("Idea dismissed", "success");       // Optimistically remove from modItems
      var pitchItems = modItems["pitches"] || [];
      var dismissIdx = pitchItems.findIndex(function(i: any) { return i.id === id; });
      if (dismissIdx >= 0) { pitchItems.splice(dismissIdx, 1); log("optimistic dismiss: removed " + id + " from pitches"); }
      // Re-render mod dashboard if user is viewing it
      var modScreen3 = document.getElementById("mod-screen");
      if (modScreen3 && modScreen3.classList.contains("active") && modTab === "pitches") { renderModPitches(modItems["pitches"] || []); }
      delete modTabCache["pitches"];
    } else { await tryShowServerError(res, "Dismiss failed"); } } catch (e) { showToast("Network error", "error"); } finally { setBtnLoading('[data-action="dismiss-idea"][data-id="' + id + '"]', false); unlock(k); } }
async function deletePitch(id: string) { log("deletePitch id=" + id); var title = getItemTitle(id, { myPitches: myPitches }); if (!await confirmDestructive('Delete "' + title + '"? This cannot be undone.')) return; var k = "pitch-" + id; if (isLocked(k)) return; lock(k); setBtnLoading('[data-action="delete-pitch"][data-id="' + id + '"]', true, "⏳ Deleting..."); var res; try { res = await fetch(API_BASE + "/api/dismiss-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ideaId: id }) });     if (res.ok) { showToast("Deleted", "success");       // Optimistically remove from myPitches
      var pitchIdx = myPitches.findIndex(function(p: any) { return p.id === id; });
      if (pitchIdx >= 0) { myPitches.splice(pitchIdx, 1); log("optimistic pitch removed: " + id + " | myPitches count=" + myPitches.length); }
      // If user is in My Stuff on pitches tab, re-render instantly
      var myStuffOverlay3 = document.getElementById("my-stuff-overlay");
      if (myStuffOverlay3 && myStuffOverlay3.classList.contains("active") && myStuffTab === "pitches") { renderMyPitchCard(); }
    } else { await tryShowServerError(res, "Delete failed"); } } catch (e) { showToast("Network error", "error"); } finally { setBtnLoading('[data-action="delete-pitch"][data-id="' + id + '"]', false); unlock(k); } }
async function cancelMyEvent(id: string) {
  log("cancelMyEvent id=" + id);
  var k = "my-cancel-" + id;
  if (isLocked(k)) return;
  lock(k);
  var title = getItemTitle(id, { myEvents: myEvents });
  if (!await confirmDestructive('Cancel "' + title + '"? It will be removed from the review queue.')) { unlock(k); return; }
  setBtnLoading('[data-action="cancel-my-event"][data-id="' + id + '"]', true, "⏳ Cancelling...");
  var res; try {
    res = await fetch(API_BASE + "/api/delete-pending", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });
    if (res.ok) { showToast("Cancelled", "success");       // Optimistically remove from myEvents
      var cancelIdx = myEvents.findIndex(function(e: any) { return e.id === id; });
      if (cancelIdx >= 0) { myEvents.splice(cancelIdx, 1); log("optimistic event cancelled: " + id + " | myEvents count=" + myEvents.length); }
      // If user is in My Stuff on events tab, re-render instantly
      var myStuffOverlay4 = document.getElementById("my-stuff-overlay");
      if (myStuffOverlay4 && myStuffOverlay4.classList.contains("active") && myStuffTab === "events") { renderMyEventCard(); }
    }
    else { await tryShowServerError(res, "Cancel failed"); }
  } catch (e) { showToast("Network error", "error"); }
  finally { setBtnLoading('[data-action="cancel-my-event"][data-id="' + id + '"]', false); unlock(k); }
}
async function deleteMyEvent(id: string) {
  log("deleteMyEvent id=" + id);
  var k = "my-delete-" + id;
  if (isLocked(k)) return;
  lock(k);
  var title = getItemTitle(id, { myEvents: myEvents });
  if (!await confirmDestructive('Delete "' + title + '"? All RSVPs will be lost. This cannot be undone.')) { unlock(k); return; }
  setBtnLoading('[data-action="delete-my-event"][data-id="' + id + '"]', true, "⏳ Deleting...");
  var res; try {
    res = await fetch(API_BASE + "/api/delete-published", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });
    if (res.ok) { showToast("Deleted", "success");       // Optimistically remove from myEvents
      var delIdx = myEvents.findIndex(function(e: any) { return e.id === id; });
      if (delIdx >= 0) { myEvents.splice(delIdx, 1); log("optimistic event deleted: " + id + " | myEvents count=" + myEvents.length); }
      // If user is in My Stuff on events tab, re-render instantly
      var myStuffOverlay5 = document.getElementById("my-stuff-overlay");
      if (myStuffOverlay5 && myStuffOverlay5.classList.contains("active") && myStuffTab === "events") { renderMyEventCard(); }
    }
    else { await tryShowServerError(res, "Delete failed"); }
  } catch (e) { showToast("Network error", "error"); }
  finally { setBtnLoading('[data-action="delete-my-event"][data-id="' + id + '"]', false); unlock(k); }
}
// Mod detail overlay state — mirrors home page detail overlay exactly
var modDetailStep = 1;
var modDetailStep1 = "", modDetailStep2 = "", modDetailStep3 = "", modDetailStep4 = "";
var currentModEventId: string | null = null;

async function showModEventDetails(id: string) {
  log("showModEventDetails id=" + id);
  currentModEventId = id;
  var item = modItems["published"]?.find(function(e: any) { return e.id === id; });
  if (!item) return;
  document.getElementById("mod-detail-title")!.textContent = item.title;
  var date = new Date(item.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  var rc = item.rsvpCount || 0;
  var badgeText = rc === 0 ? "🔴 No RSVPs" : (rc < 5 ? "🟡 " + rc + " going" : "🟢 " + rc + " going");

  // Card 1: Quick Info
  var s1 = '<div class="detail-card" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:16px;">' +
    (item.emoji ? '<div style="text-align:center;font-size:48px;margin-bottom:4px;">' + item.emoji + '</div>' : '') +
    '<div style="text-align:center;"><div style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">📅 Date</div><div style="font-size:18px;font-weight:700;">' + date + '</div></div>' +
    '<div style="text-align:center;"><div style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">⏰ Time</div><div style="font-size:18px;font-weight:700;">' + formatTimeWithTz(item.time, appTimezone) + '</div></div>' +
    '<div style="text-align:center;"><div style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">📍 Location</div><div style="font-size:16px;font-weight:700;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;max-height:42px;">' + escapeHtml(item.location || "TBD") + '</div></div>' +
    (item.category ? '<div style="text-align:center;margin-top:4px;">' + catBadge(item.category) + '</div>' : '') +
    '<div style="background:var(--surface);border:var(--border);padding:10px;text-align:center;font-weight:700;font-size:14px;margin-top:2px;">' + badgeText + '</div>' +
    '</div>';

  // Card 2: Organizer + Description (with auto-pagination)
  var descFull = item.description || "";
  descFullText[id] = descFull;
  descPageIdx[id] = 0;
  descPageTotal[id] = descFull.length > DESC_SHORT_LENGTH ? 99 : 1;
  var s2 = '<div class="detail-card" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:6px;padding:8px 0;">';
  if (item.organizer) { var initial = item.organizer.replace("u/", "").charAt(0).toUpperCase(); s2 += '<div style="display:flex;align-items:center;gap:10px;padding:10px;margin:0 8px;background:var(--surface);border:var(--border);flex-shrink:0;"><div style="width:36px;height:36px;border:var(--border);background:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;">' + initial + '</div><div><div style="font-weight:700;font-size:10px;text-transform:uppercase;color:var(--muted);">Organizer</div><div style="font-weight:700;font-size:14px;">' + escapeHtml(item.organizer) + '</div></div></div>'; }
  s2 += '<div style="flex:1;min-height:0;overflow:hidden;margin:0 8px;background:#fff;border:var(--border);position:relative;" id="mod-desc-box-' + id + '">' +
    '<div id="mod-desc-track-' + id + '" style="display:flex;width:100%;height:100%;position:absolute;top:0;left:0;transition:transform 0.25s;">' +
    '<div id="mod-desc-page-initial-' + id + '" style="min-width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px;font-size:15px;line-height:1.5;word-break:break-word;">' +
      escapeHtml(descFull.substring(0, DESC_SHORT_LENGTH)) + (descFull.length > DESC_SHORT_LENGTH ? '...' : '') +
    '</div></div></div>' +
    '<div id="mod-desc-nav-' + id + '" style="flex-shrink:0;display:flex;justify-content:center;align-items:center;gap:8px;padding:4px 8px 0 8px;min-height:28px;">' +
      (descFull.length > DESC_SHORT_LENGTH ? '<button class="btn btn-white btn-pager" data-id="' + id + '" data-action="mod-detail-desc-next">Read more →</button>' : '') +
    '</div>';
  if (item.mapUrl) { s2 += '<div style="display:flex;align-items:center;gap:8px;padding:8px;margin:0 8px;background:var(--surface);border:var(--border);flex-shrink:0;"><span style="flex:1;font-size:14px;font-weight:600;">🗺️ Google Maps</span><button class="copy-btn btn-copy btn-copy-link" data-id="' + escapeAttr(item.mapUrl) + '" data-action="copy-link">📋 Copy</button></div>'; }
  s2 += '</div>';

  // Card 3: Who's Going
  attPageIdx[id] = 0;
  var s3 = '<div class="detail-card" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;padding:4px 0;">' +
    '<div style="text-align:center;padding:12px 0 8px 0;font-weight:700;font-size:17px;flex-shrink:0;">👥 Who\'s Going?</div>' +
    '<div style="text-align:center;font-size:14px;color:var(--muted);padding-bottom:8px;flex-shrink:0;">' + rc + ' attendee' + (rc !== 1 ? 's' : '') + '</div>' +
    '<div style="flex:1;min-height:0;overflow:hidden;margin:0 8px;background:#fff;border:var(--border);position:relative;"><div id="mod-rsvps-public-' + id + '" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div></div>' +
    '<div id="mod-att-nav-' + id + '" style="flex-shrink:0;display:flex;justify-content:center;align-items:center;gap:8px;padding:6px 8px 0 8px;min-height:32px;"></div>' +
    '</div>';

  // Card 4: Mod Actions
  var s4 = '<div class="detail-card" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;text-align:center;">' +
    '<div style="font-size:56px;">⚙️</div>' +
    '<div style="font-size:20px;font-weight:700;">Event Actions</div>' +
    '<div style="font-size:14px;color:var(--muted);margin-bottom:8px;">Manage this event</div>' +
    '<div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:280px;">' +
    '<button class="btn btn-white" data-id="' + id + '" data-action="export-csv">📋 Copy CSV</button>' +
    '<button class="btn btn-white" data-id="' + id + '" data-action="delete-published">🗑️ Delete Event</button>' +
    '</div>' +
    '</div>';

  modDetailStep1 = s1; modDetailStep2 = s2; modDetailStep3 = s3; modDetailStep4 = s4;
  modDetailStep = 1;
  ["mod-detail-dot-1", "mod-detail-dot-2", "mod-detail-dot-3", "mod-detail-dot-4"].forEach(function (id2, i) { document.getElementById(id2)!.classList.toggle("done", i === 0); });
  document.getElementById("mod-detail-body")!.innerHTML = s1;
  document.getElementById("mod-detail-next-btn")!.classList.remove("hidden"); document.getElementById("mod-detail-prev-btn")!.classList.add("hidden");
  openOverlay("mod-event-details-overlay");
  // Attendees loaded on demand when user navigates to card 3 (Who's Going)
  // Auto-paginate description after DOM settles
  if (descFull.length > DESC_SHORT_LENGTH) {
    setTimeout(function () {
      var box = document.getElementById("mod-desc-box-" + id);
      if (!box) return;
      if (box.clientWidth === 0 || box.clientHeight === 0) {
        setTimeout(function() {
          var retryBox = document.getElementById("mod-desc-box-" + id);
          if (!retryBox || retryBox.clientWidth === 0 || retryBox.clientHeight === 0) return;
          var pages = splitTextToPages(descFullText[id] || "", retryBox.clientWidth, retryBox.clientHeight);
          if (pages.length > 50) { pages = [descFullText[id] || ""]; }
          descPageTotal[id] = pages.length;
          descPageIdx[id] = 0;
          document.getElementById("mod-desc-track-" + id)!.outerHTML = buildDescPagesHTML(id, pages, "mod-desc-track-");
          document.getElementById("mod-desc-nav-" + id)!.innerHTML = buildModDetailDescNavHTML(id);
          persistModStep2(id);
        }, 300);
        return;
      }
      var pages = splitTextToPages(descFullText[id] || "", box.clientWidth, box.clientHeight);
      if (pages.length > 50) { pages = [descFullText[id] || ""]; }
      descPageTotal[id] = pages.length;
      descPageIdx[id] = 0;
      document.getElementById("mod-desc-track-" + id)!.outerHTML = buildDescPagesHTML(id, pages, "mod-desc-track-");
      document.getElementById("mod-desc-nav-" + id)!.innerHTML = buildModDetailDescNavHTML(id);
      persistModStep2(id);
    }, AUTO_PAGINATE_DELAY);
  }
}

function persistModStep2(id: string) {
  var body = document.getElementById("mod-detail-body");
  if (!body) return;
  modDetailStep2 = body.innerHTML;
}

function modDetailNext() {
  log("modDetailNext from=" + modDetailStep);
  if (modDetailStep === 1) {
    document.getElementById("mod-detail-dot-2")!.classList.add("done");
    pulseDot("mod-detail-dot-2");
    document.getElementById("mod-detail-body")!.innerHTML = modDetailStep2;
    document.getElementById("mod-detail-prev-btn")!.classList.remove("hidden");
    modDetailStep = 2;
  } else if (modDetailStep === 2) {
    document.getElementById("mod-detail-dot-3")!.classList.add("done");
    pulseDot("mod-detail-dot-3");
    document.getElementById("mod-detail-body")!.innerHTML = modDetailStep3;
    if (currentModEventId) loadModPublicAttendees(currentModEventId);
    modDetailStep = 3;
  } else if (modDetailStep === 3) {
    document.getElementById("mod-detail-dot-4")!.classList.add("done");
    pulseDot("mod-detail-dot-4");
    document.getElementById("mod-detail-body")!.innerHTML = modDetailStep4;
    document.getElementById("mod-detail-next-btn")!.classList.add("hidden");
    document.getElementById("mod-detail-prev-btn")!.classList.remove("hidden");
    modDetailStep = 4;
  }
}

function modDetailPrev() {
  log("modDetailPrev from=" + modDetailStep);
  if (modDetailStep === 2) {
    document.getElementById("mod-detail-dot-2")!.classList.remove("done");
    pulseDot("mod-detail-dot-2");
    document.getElementById("mod-detail-body")!.innerHTML = modDetailStep1;
    document.getElementById("mod-detail-prev-btn")!.classList.add("hidden");
    modDetailStep = 1;
  } else if (modDetailStep === 3) {
    document.getElementById("mod-detail-dot-3")!.classList.remove("done");
    pulseDot("mod-detail-dot-3");
    document.getElementById("mod-detail-body")!.innerHTML = modDetailStep2;
    document.getElementById("mod-detail-next-btn")!.classList.remove("hidden");
    modDetailStep = 2;
  } else if (modDetailStep === 4) {
    document.getElementById("mod-detail-dot-4")!.classList.remove("done");
    pulseDot("mod-detail-dot-4");
    document.getElementById("mod-detail-body")!.innerHTML = modDetailStep3;
    document.getElementById("mod-detail-next-btn")!.classList.remove("hidden");
    if (currentModEventId) loadModPublicAttendees(currentModEventId);
    modDetailStep = 3;
  }
}

function loadModPublicAttendees(eventId: string) {
  log("loadModPublicAttendees id=" + eventId);
  var cached = attendeeCache[eventId];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_ATTENDEES) {
    renderModAttendees(eventId, cached.data);
    return;
  }
  var container = document.getElementById("mod-rsvps-public-" + eventId);
  if (container) container.innerHTML = '<div style="text-align:center;padding:20px;">⏳ Loading...</div>';
  fetch(API_BASE + "/api/rsvp-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: eventId, includeContactDetails: true }) })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.type === "rsvp-list") {
        var att = data.attendees || [];
        attendeeCache[eventId] = { data: att, timestamp: Date.now() };
        // Guard: only render if mod detail overlay is still open for this event
        var modDetailOverlay = document.getElementById("mod-event-details-overlay");
        if (modDetailOverlay && modDetailOverlay.classList.contains("active") && currentModEventId === eventId) {
          renderModAttendees(eventId, att);
        } else {
          log("loadModPublicAttendees STALE RESPONSE REJECTED — overlay closed or different event");
        }
      }
    })
    .catch(function(e) { log("error: loadModPublicAttendees " + e); });
}

function renderModAttendees(eventId: string, att: any[]) {
  log("renderModAttendees id=" + eventId + " count=" + att.length);
  var container = document.getElementById("mod-rsvps-public-" + eventId);
  if (!container) { log("renderModAttendees container not found id=" + eventId); return; }
  if (att.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;font-size:14px;color:var(--muted);">No RSVPs yet</div>';
    document.getElementById("mod-att-nav-" + eventId)!.innerHTML = '';
    return;
  }
  attListStore[eventId] = att;
  attPageIdx[eventId] = 0;
  var totalPages = Math.ceil(att.length / ATTENDEES_PER_PAGE);
  log("renderModAttendees pages=" + totalPages + " perPage=" + ATTENDEES_PER_PAGE);
  var html = '<div id="mod-att-track-' + eventId + '" style="display:flex;width:' + (totalPages * 100) + '%;height:100%;position:absolute;top:0;left:0;transition:transform 0.25s;">';
  for (var i = 0; i < totalPages; i++) {
    var page = att.slice(i * ATTENDEES_PER_PAGE, (i + 1) * ATTENDEES_PER_PAGE);
    html += '<div style="min-width:' + (100 / totalPages) + '%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px;">';
    for (var j = 0; j < page.length; j++) {
      var a = page[j];
      html += '<div style="font-size:13px;font-weight:600;padding:6px 0;border-bottom:1px solid var(--outline-v);word-break:break-word;">👤 u/' + escapeHtml(a.username);
      if (a.email) html += '<span style="font-weight:400;color:var(--muted);word-break:break-word;"> ✉️ ' + escapeHtml(a.email) + '</span>';
      if (a.phone) html += '<span style="font-weight:400;color:var(--muted);word-break:break-word;"> 📱 ' + escapeHtml(a.phone) + '</span>';
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
  document.getElementById("mod-att-nav-" + eventId)!.innerHTML = buildModAttNavHTML(eventId);
}

function buildModAttNavHTML(eventId: string): string {
  var att = attListStore[eventId] || [];
  var total = Math.ceil(att.length / ATTENDEES_PER_PAGE);
  if (total <= 1) return '';
  var cur = attPageIdx[eventId] || 0;
  return (cur > 0 ? '<button class="btn btn-white btn-pager" data-id="' + eventId + '" data-action="mod-detail-att-prev">← Previous</button>' : '') +
    '<span style="font-size:11px;font-weight:700;">' + (cur + 1) + '/' + total + '</span>' +
    (cur < total - 1 ? '<button class="btn btn-white btn-pager" data-id="' + eventId + '" data-action="mod-detail-att-next">Next →</button>' : '');
}

// Mod attendees overlay state
var modAttPage = 0;
var modAttTotalPages = 1;
var MOD_ATT_PER_PAGE = 5;

async function showModAttendees(id: string) {
  log("showModAttendees id=" + id);
  var item = modItems["published"]?.find(function(e: any) { return e.id === id; });
  if (!item) return;
  document.getElementById("mod-attendees-title")!.textContent = "👥 Attendees — " + item.title;
  var body = document.getElementById("mod-attendees-body")!;
  body.innerHTML = '<div style="text-align:center;padding:20px;">⏳ Loading attendees...</div>';
  openOverlay("mod-attendees-overlay");
  try {
    var res = await fetch(API_BASE + "/api/rsvp-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id, includeContactDetails: true }) });
    var data = await res.json();
    if (data.type === "rsvp-list") {
      var att = data.attendees || [];
      // Guard: only render if mod attendees overlay is still open
      var modAttOverlay = document.getElementById("mod-attendees-overlay");
      if (!modAttOverlay || !modAttOverlay.classList.contains("active")) {
        log("showModAttendees STALE RESPONSE REJECTED — overlay closed");
        return;
      }
      if (att.length === 0) {
        body.innerHTML = '<div class="empty-state"><span class="emoji">👥</span><h2>No RSVPs yet</h2></div>';
      } else {
        var groups: any[][] = [];
        for (var i = 0; i < att.length; i += MOD_ATT_PER_PAGE) {
          groups.push(att.slice(i, i + MOD_ATT_PER_PAGE));
        }
        modAttTotalPages = groups.length;
        modAttPage = 0;
        var html = '<div style="position:relative;width:100%;height:100%;overflow:hidden;">';
        for (var p = 0; p < groups.length; p++) {
          var pageAtt = groups[p];
          if (!pageAtt) continue;
          var pageContent = '<div style="font-weight:700;font-size:12px;margin-bottom:10px;text-align:center;">' + att.length + ' Attendee' + (att.length > 1 ? 's' : '') + ' — ' + (p + 1) + '/' + groups.length + '</div>';
          for (var j = 0; j < pageAtt.length; j++) {
            var a = pageAtt[j];
            pageContent += '<div style="background:#fff;border:var(--border);padding:8px;margin-bottom:6px;word-break:break-word;">' +
              '<div style="font-size:13px;font-weight:700;word-break:break-word;">👤 u/' + escapeHtml(a.username) + '</div>';
            if (a.email) pageContent += '<div style="font-size:11px;color:var(--muted);margin-top:3px;word-break:break-word;">✉️ ' + escapeHtml(a.email) + '</div>';
            if (a.phone) pageContent += '<div style="font-size:11px;color:var(--muted);word-break:break-word;">📱 ' + escapeHtml(a.phone) + '</div>';
            pageContent += '</div>';
          }
          html += '<div id="mod-att-p' + p + '" style="position:absolute;top:0;left:0;width:100%;height:100%;padding:10px 12px;box-sizing:border-box;overflow-y:auto;-webkit-overflow-scrolling:touch;transition:transform 0.25s,opacity 0.25s;transform:translateX(' + (p * 100) + '%);opacity:' + (p === 0 ? '1' : '0') + ';visibility:' + (p === 0 ? 'visible' : 'hidden') + ';">' + pageContent + '</div>';
        }
        // Nav + CSV
        var hasNav = modAttTotalPages > 1;
        var navHtml = '<div style="position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:10px;z-index:10;">' +
          '<button class="btn btn-white btn-pager" id="mod-att-prev" data-action="mod-att-prev">← Prev</button>' +
          '<span id="mod-att-dots" style="font-size:11px;font-weight:700;">1/' + modAttTotalPages + '</span>' +
          '<button class="btn btn-white btn-pager" id="mod-att-next" data-action="mod-att-next">Next →</button>' +
          '</div>';
        var csvHtml = '<div style="position:absolute;bottom:' + (hasNav ? '42px' : '10px') + ';left:0;right:0;display:flex;justify-content:center;padding:0 12px;z-index:10;">' +
          '<button class="btn btn-white btn-compact" data-id="' + id + '" data-action="export-csv">📋 Copy CSV</button>' +
          '</div>';
        html += csvHtml + (hasNav ? navHtml : '') + '</div>';
        body.innerHTML = html;
        updateModAttNav();
      }
    }
  } catch (e) { body.innerHTML = '<div style="text-align:center;padding:20px;color:#ff4444;">Failed to load attendees</div>'; }
}

function updateModAttNav() {
  for (var i = 0; i < modAttTotalPages; i++) {
    var el = document.getElementById("mod-att-p" + i);
    if (!el) continue;
    var offset = (i - modAttPage) * 100;
    el.style.transform = 'translateX(' + offset + '%)';
    el.style.opacity = i === modAttPage ? '1' : '0';
    el.style.visibility = i === modAttPage ? 'visible' : 'hidden';
  }
  var dots = document.getElementById("mod-att-dots");
  if (dots) dots.textContent = (modAttPage + 1) + '/' + modAttTotalPages;
  var prev = document.getElementById("mod-att-prev");
  var next = document.getElementById("mod-att-next");
  if (prev) prev.style.visibility = modAttPage === 0 ? 'hidden' : 'visible';
  if (next) next.style.visibility = modAttPage >= modAttTotalPages - 1 ? 'hidden' : 'visible';
}

function modAttNext() {
  if (modAttPage >= modAttTotalPages - 1) { log("modAttNext BLOCKED page=" + modAttPage + "/" + modAttTotalPages); return; }
  modAttPage++;
  log("modAttNext page=" + modAttPage + "/" + modAttTotalPages);
  updateModAttNav();
}

function modAttPrev() {
  if (modAttPage <= 0) { log("modAttPrev BLOCKED page=" + modAttPage); return; }
  modAttPage--;
  log("modAttPrev page=" + modAttPage + "/" + modAttTotalPages);
  updateModAttNav();
}
async function viewRsvps(eventId: string) { log("viewRsvps id=" + eventId);
  var el = document.getElementById("rsvps-" + eventId)!;
  if (!el.classList.contains("hidden")) { el.classList.add("hidden"); return; }
  setBtnLoading('[data-action="view-rsvps"][data-id="' + eventId + '"]', true, "⏳ Loading...");
  try {
    var res = await fetch(API_BASE + "/api/rsvp-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: eventId, includeContactDetails: true }) });
    var data = await res.json();
    if (data.type === "rsvp-list") {
      var att = data.attendees || [];
      if (att.length === 0) el.innerHTML = '<div style="font-size:13px;">No RSVPs</div>';
      else {
        var list = '<div style="font-weight:700;font-size:11px;margin-bottom:8px;">' + att.length + ' Attendees</div>';
        for (var i = 0; i < att.length; i++) { var a = att[i]; list += '<div style="font-size:13px;font-weight:600;padding:6px 0;border-bottom:1px solid var(--outline-v);word-break:break-word;">👤 u/' + escapeHtml(a.username); if (a.email) list += '<span style="font-weight:400;color:var(--muted);word-break:break-word;"> ✉️ ' + escapeHtml(a.email) + '</span>'; if (a.phone) list += '<span style="font-weight:400;color:var(--muted);word-break:break-word;"> 📱 ' + escapeHtml(a.phone) + '</span>'; list += '</div>'; }
        el.innerHTML = list;
      }
      el.classList.remove("hidden");
    }
  } catch (e) { log("error: viewRsvps " + e); }
  setBtnLoading('[data-action="view-rsvps"][data-id="' + eventId + '"]', false);
}

// ======= RSVP / LEAVE / PITCH / SUBMIT =======
async function submitRsvp() {
  log("submitRsvp eventId=" + currentEventId);
  if (!currentEventId) return;
  if (isLocked("rsvp")) return;
  lock("rsvp");
  var email = (document.getElementById("rsvp-email") as HTMLInputElement).value.trim();
  var phone = (document.getElementById("rsvp-phone") as HTMLInputElement).value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("Invalid email format", "error"); unlock("rsvp"); return; }
  if (phone && !/^[\d\s\-\+\(\)]{7,20}$/.test(phone)) { showToast("Invalid phone format", "error"); unlock("rsvp"); return; }
  var isUpdate = false;
  setBtnLoading(".btn-submit-rsvp", true, "⏳ Processing...");
  try {
    var res = await fetch(API_BASE + "/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: currentEventId, email: email, phone: phone }) });
    var data = await res.json();
    if (data.type === "rsvp" && data.success) {
      isUpdate = data.wasExisting;
      showToast(isUpdate ? "Contact info updated ✅" : "RSVP confirmed! 🎉", "success");
      setBtnLoading(".btn-submit-rsvp", false);
      delete detailCache[currentEventId];
      delete attendeeCache[currentEventId];
      // Optimistically update home cache so button turns green immediately
      var homeEvt = cachedHomeEvents.find(function(e) { return e.id === currentEventId; });
      if (homeEvt) {
        homeEvt.hasRsvped = true;
        if (!isUpdate) { homeEvt.rsvpCount = (homeEvt.rsvpCount || 0) + 1; }
        log("optimistic RSVP update: " + currentEventId + " count=" + homeEvt.rsvpCount + " isUpdate=" + isUpdate);
      }
      // Re-render home card to show updated button state instantly
      renderHomeCard({ eventsByDate: groupByDate(cachedHomeEvents), isMod: cachedHomeIsMod, settings: {} });
      // Also add to myRsvps so it appears in My Stuff immediately
      if (homeEvt) {
        var alreadyInMyRsvps = myRsvps.findIndex(function(e: any) { return e.id === currentEventId; }) >= 0;
        if (!alreadyInMyRsvps) { myRsvps.push(homeEvt); log("added to myRsvps: " + currentEventId); }
      }
      closeOverlay("rsvp-overlay");
      // Show RSVP confirmation summary in detail overlay
      var evt = cachedHomeEvents.find(function(e) { return e.id === currentEventId; });
      if (evt) {
        var confirmEmoji = isUpdate ? "✅" : "🎉";
        var confirmHeading = isUpdate ? "Contact info updated" : "You\'re on the list!";
        var confirmHTML = '<div class="detail-card" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:10px;padding:20px;text-align:center;padding-top:32px;">' +
          '<div style="font-size:56px;">' + confirmEmoji + '</div>' +
          '<div style="font-size:18px;font-weight:700;">' + confirmHeading + '</div>' +
          '<div style="font-size:14px;color:var(--muted);max-width:260px;">' + escapeHtml(evt.title) + '</div>' +
          '<div style="font-size:13px;color:var(--muted);">📅 ' + escapeHtml(relativeDate(evt.date)) + ' at ' + formatTimeWithTz(evt.time, appTimezone) + '</div>' +
          '<div style="font-size:13px;color:var(--muted);">📍 ' + escapeHtml(evt.location || "TBD") + '</div>' +
          '<div style="display:flex;gap:8px;margin-top:8px;width:100%;max-width:260px;">' +
          '<button class="btn btn-white btn-compact" data-action="copy-event-details" data-id="' + currentEventId + '">📋 Copy Details</button>' +
          '<button class="btn btn-pink btn-compact" data-action="close-overlay">Done →</button>' +
          '</div>' +
          '</div>';
        document.getElementById("detail-body")!.innerHTML = confirmHTML;
        document.getElementById("detail-next-btn")!.classList.add("hidden");
        document.getElementById("detail-prev-btn")!.classList.add("hidden");
        document.querySelectorAll(".step-dot").forEach(function(d) { d.classList.add("done"); });
        log("RSVP confirmation card shown for " + currentEventId + " isUpdate=" + isUpdate);
      } else {
        closeOverlay("rsvp-overlay");
        // Stay on My Stuff if user was viewing it, otherwise go home
        var msOverlayRsvp = document.getElementById("my-stuff-overlay");
        if (msOverlayRsvp && msOverlayRsvp.classList.contains("active")) {
          log("submitRsvp update staying on My Stuff tab=" + myStuffTab);
          if (myStuffTab === "rsvps") renderMyRsvpCard();
        } else {
          showHomePage();
        }
      }
    } else {
      showToast(data.error || (isUpdate ? "Update failed - retry" : "RSVP failed - retry"), "error");
      setBtnLoading(".btn-submit-rsvp", false);
    }
  } catch (e) {
    showToast(isUpdate ? "Update failed - retry" : "RSVP failed - retry", "error");
    setBtnLoading(".btn-submit-rsvp", false);
  } finally {
    unlock("rsvp");
  }
}
function showRsvpOverlay(id: string, email?: string, phone?: string) { log("showRsvpOverlay id=" + id); currentEventId = id; (document.getElementById("rsvp-email") as HTMLInputElement).value = email || ""; (document.getElementById("rsvp-phone") as HTMLInputElement).value = phone || ""; var titleEl = document.querySelector("#rsvp-overlay .overlay-header h2"); if (titleEl) titleEl.textContent = email !== undefined ? "✏️ Update Contact" : "🎟️ RSVP"; var btnEl = document.querySelector(".btn-submit-rsvp") as HTMLElement | null; if (btnEl) { btnEl.textContent = email !== undefined ? "Update →" : "Confirm RSVP →"; btnEl.style.opacity = "1"; btnEl.style.pointerEvents = "auto"; (btnEl as any).disabled = false; delete btnEl.dataset.originalText; } openOverlay("rsvp-overlay"); }
async function showUpdateRsvpOverlay(id: string) { log("showUpdateRsvpOverlay id=" + id); setBtnLoading('[data-action="update-rsvp"][data-id="' + id + '"]', true, "⏳..."); try { var res = await fetch(API_BASE + "/api/my-rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) }); var data = await res.json(); if (data.type === "my-rsvp") { showRsvpOverlay(id, data.email || "", data.phone || ""); } else { showToast("Could not load contact info", "error"); } } catch (e) { showToast("Error loading contact info", "error"); } finally { setBtnLoading('[data-action="update-rsvp"][data-id="' + id + '"]', false); } }
async function leaveEvent(id: string) { log("leaveEvent id=" + id); var title = document.getElementById("details-overlay-title")!.textContent || "this event"; if (!await confirmDestructive('Leave "' + title + '"? You can RSVP again later.')) return; setBtnLoading('[data-action="leave-event"][data-id="' + id + '"]', true, "⏳ Leaving..."); try { var res = await fetch(API_BASE + "/api/leave-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) }); var data = await res.json();     if (data.type === "leave-event" && data.success) { showToast("You've left", "success"); setBtnLoading('[data-action="leave-event"][data-id="' + id + '"]', false); delete detailCache[id]; delete attendeeCache[id];       // Optimistically update home cache so button turns back to RSVP
      var leftEvt = cachedHomeEvents.find(function(e) { return e.id === id; });
      if (leftEvt) { leftEvt.hasRsvped = false; leftEvt.rsvpCount = Math.max(0, (leftEvt.rsvpCount || 0) - 1); log("optimistic leave update: " + id + " count=" + leftEvt.rsvpCount); }
      // Re-render home card to show updated button state instantly
      renderHomeCard({ eventsByDate: groupByDate(cachedHomeEvents), isMod: cachedHomeIsMod, settings: {} });
      // Also update My Stuff if this event is in myRsvps
      var myStuffIdx = myRsvps.findIndex(function(e: any) { return e.id === id; });
      if (myStuffIdx >= 0) { myRsvps.splice(myStuffIdx, 1); log("removed from myRsvps: " + id); }
      closeOverlay("details-overlay");
      // Stay on My Stuff if user was viewing it, otherwise go home
      var msOverlay = document.getElementById("my-stuff-overlay");
      if (msOverlay && msOverlay.classList.contains("active")) {
        log("leaveEvent staying on My Stuff tab=" + myStuffTab + " rsvpsCount=" + myRsvps.length);
        // If RSVPs tab is now empty, switch to another tab
        if (myStuffTab === "rsvps" && myRsvps.length === 0) {
          log("leaveEvent RSVPs empty, switching to events tab");
          switchMyStuffTab("events", false);
        } else if (myStuffTab === "rsvps") {
          renderMyRsvpCard();
        }
      } else {
        log("leaveEvent going home (My Stuff not active)");
        showHomePage();
      }
    } else { showToast("Failed", "error"); setBtnLoading('[data-action="leave-event"][data-id="' + id + '"]', false); } } catch (e) { showToast("Error", "error"); setBtnLoading('[data-action="leave-event"][data-id="' + id + '"]', false); } }
async function submitPitch() { log("submitPitch"); if (isLocked("submit-pitch")) return; lock("submit-pitch"); var title = (document.getElementById("pitch-title") as HTMLInputElement).value.trim(); var desc = (document.getElementById("pitch-description") as HTMLTextAreaElement).value.trim(); if (!title || !desc) { showToast("Fill all fields", "error"); unlock("submit-pitch"); return; } setBtnLoading("#pitch-submit-btn", true, "⏳ Submitting...");   try { var res = await fetch(API_BASE + "/api/pitch-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title, description: desc }) }); var data = await res.json();     if (data.type === "pitch-idea" && data.success) { showToast("Idea sent! ✅", "success"); setBtnLoading("#pitch-submit-btn", false); closeOverlay("pitch-overlay"); loadHome();       // Optimistically add to myPitches so it appears in My Stuff immediately
      var newPitch = { id: "pitch_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7), title: title, description: desc, submittedBy: currentUsername || usernameCached || "user", submittedAt: new Date().toISOString() };
      myPitches.push(newPitch);
      log("optimistic pitch added: " + newPitch.id + " | myPitches count=" + myPitches.length);
      // If user is in My Stuff on pitches tab, re-render instantly
      var myStuffOverlay = document.getElementById("my-stuff-overlay");
      if (myStuffOverlay && myStuffOverlay.classList.contains("active") && myStuffTab === "pitches") { renderMyPitchCard(); }
    } else { showToast(data.error || "Submit failed - retry", "error"); setBtnLoading("#pitch-submit-btn", false); } } catch (e) { showToast("Error", "error"); setBtnLoading("#pitch-submit-btn", false); } finally { unlock("submit-pitch"); } }
function resetEventForm() { eventStep = 1; ["event-step-1", "event-step-2", "event-step-3", "event-step-4"].forEach(function (id, i) { document.getElementById(id)!.classList.toggle("hidden", i !== 0); }); document.getElementById("event-next-btn")!.classList.remove("hidden"); document.getElementById("event-submit-btn")!.classList.add("hidden"); document.getElementById("event-prev-btn")!.classList.add("hidden"); ["event-dot-1", "event-dot-2", "event-dot-3", "event-dot-4"].forEach(function (id, i) { document.getElementById(id)!.classList.toggle("done", i === 0); });   ["event-title", "event-organizer", "event-date", "event-time", "event-location", "event-map-url", "event-desc", "event-category"].forEach(function (id) { var el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null; if (el) el.value = ""; }); setBtnLoading("#event-submit-btn", false); }
function eventPrev() { if (eventStep === 2) { document.getElementById("event-dot-2")!.classList.remove("done"); document.getElementById("event-step-2")!.classList.add("hidden"); document.getElementById("event-step-1")!.classList.remove("hidden"); document.getElementById("event-prev-btn")!.classList.add("hidden"); eventStep = 1; } else if (eventStep === 3) { document.getElementById("event-dot-3")!.classList.remove("done"); document.getElementById("event-step-3")!.classList.add("hidden"); document.getElementById("event-step-2")!.classList.remove("hidden"); eventStep = 2; } else if (eventStep === 4) { document.getElementById("event-dot-4")!.classList.remove("done"); document.getElementById("event-step-4")!.classList.add("hidden"); document.getElementById("event-step-3")!.classList.remove("hidden"); document.getElementById("event-next-btn")!.classList.remove("hidden"); document.getElementById("event-submit-btn")!.classList.add("hidden"); eventStep = 3; } }
function eventNext() { log("eventNext step=" + eventStep); if (eventStep === 1) { var title = (document.getElementById("event-title") as HTMLInputElement).value.trim(); var org = (document.getElementById("event-organizer") as HTMLInputElement).value.trim(); var cat = (document.getElementById("event-category") as HTMLSelectElement).value; if (!title || !org) { showToast("Fill all fields", "error"); return; } if (!cat) { showToast("Select a category", "error"); return; } document.getElementById("event-dot-2")!.classList.add("done"); document.getElementById("event-step-1")!.classList.add("hidden"); document.getElementById("event-step-2")!.classList.remove("hidden"); document.getElementById("event-prev-btn")!.classList.remove("hidden"); eventStep = 2; } else if (eventStep === 2) { var date = (document.getElementById("event-date") as HTMLInputElement).value.trim(); var time = (document.getElementById("event-time") as HTMLInputElement).value.trim(); if (!date || !time) { showToast("Fill all fields", "error"); return; } document.getElementById("event-dot-3")!.classList.add("done"); document.getElementById("event-step-2")!.classList.add("hidden"); document.getElementById("event-step-3")!.classList.remove("hidden"); eventStep = 3; } else if (eventStep === 3) { var loc = (document.getElementById("event-location") as HTMLInputElement).value.trim(); if (!loc) { showToast("Location required", "error"); return; } document.getElementById("event-dot-4")!.classList.add("done"); document.getElementById("event-step-3")!.classList.add("hidden"); document.getElementById("event-step-4")!.classList.remove("hidden"); document.getElementById("event-next-btn")!.classList.add("hidden"); document.getElementById("event-submit-btn")!.classList.remove("hidden"); document.getElementById("event-review-title-preview")!.textContent = (document.getElementById("event-title") as HTMLInputElement).value; document.getElementById("event-review-meta-preview")!.textContent = (document.getElementById("event-date") as HTMLInputElement).value + " at " + (document.getElementById("event-time") as HTMLInputElement).value + " · " + loc; eventStep = 4; } }
async function submitEvent() { log("submitEvent"); if (isLocked("submit-event")) return; lock("submit-event"); var title = (document.getElementById("event-title") as HTMLInputElement).value.trim(); var organizer = (document.getElementById("event-organizer") as HTMLInputElement).value.trim(); var date = (document.getElementById("event-date") as HTMLInputElement).value.trim(); var time = (document.getElementById("event-time") as HTMLInputElement).value.trim(); var loc = (document.getElementById("event-location") as HTMLInputElement).value.trim(); var mapUrl = (document.getElementById("event-map-url") as HTMLInputElement).value.trim(); var desc = (document.getElementById("event-desc") as HTMLTextAreaElement).value.trim(); var category = (document.getElementById("event-category") as HTMLSelectElement).value; log("submitEvent values: title=" + title + " category=" + category);   if (!title || !organizer || !date || !time || !loc || !desc) { showToast("Fill all fields", "error"); unlock("submit-event"); return; }
  var today = new Date().toISOString().split("T")[0] || "";
  if (date < today) { showToast("Event date must be today or in the future", "error"); unlock("submit-event"); return; }
  setBtnLoading("#event-submit-btn", true, "⏳ Submitting..."); try { var res = await fetch(API_BASE + "/api/submit-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title, organizer: organizer, date: date, time: time, location: loc, mapUrl: mapUrl, desc: desc, category: category }) }); var data = await res.json();     if (data.type === "submit-event" && data.success) { showToast("Event submitted! ✅", "success"); setBtnLoading("#event-submit-btn", false); closeOverlay("event-overlay"); loadHome();       // Optimistically add to myEvents so it appears in My Stuff immediately
      var newEvent = { id: "event_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7), title: title, organizer: organizer, date: date, time: time, location: loc, mapUrl: mapUrl, description: desc, category: category || "other", status: "pending", submittedAt: new Date().toISOString() };
      myEvents.push(newEvent);
      log("optimistic event added: " + newEvent.id + " | myEvents count=" + myEvents.length);
      // If user is in My Stuff on events tab, re-render instantly
      var myStuffOverlay2 = document.getElementById("my-stuff-overlay");
      if (myStuffOverlay2 && myStuffOverlay2.classList.contains("active") && myStuffTab === "events") { renderMyEventCard(); }
    } else { showToast(data.error || "Submit failed - retry", "error"); setBtnLoading("#event-submit-btn", false); } } catch (e) { showToast("Error", "error"); setBtnLoading("#event-submit-btn", false); } finally { unlock("submit-event"); } }
var usernameCached: string | null = null, prefillLoading = false;
async function prefillOrganizer() { if (currentUsername) { (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + currentUsername; return; } if (usernameCached) { (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + usernameCached; return; } if (prefillLoading) return; prefillLoading = true; try { var res = await fetch(API_BASE + "/api/init"); var data = await res.json(); if (data.type === "init" && data.username) { currentUsername = data.username; usernameCached = data.username; (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + data.username; } if (data.type === "init" && data.timezone) { setAppTimezone(data.timezone); } } catch (e) { log("error: prefillOrganizer " + e); } prefillLoading = false; }

// ======= OVERLAY HELPERS =======
function openOverlay(id: string) { log("OPEN overlay " + id); document.getElementById(id)!.classList.add("active"); }
function closeOverlay(id: string) { log("CLOSE overlay " + id); document.getElementById(id)!.classList.remove("active"); resetEventForm(); }
function closeAllOverlays() { log("CLOSE ALL overlays"); document.querySelectorAll(".overlay").forEach(function (el) { el.classList.remove("active"); }); resetEventForm(); closeCreateMenu(); }
function showHomePage() { log("showHomePage"); closeAllOverlays(); loadHome(); }

function handleAction(action: string, id: string | null) {
  switch (action) {
    case "view-details": if (id) showEventDetails(id); break;
    case "rsvp-card": if (id) { var evt = cachedHomeEvents.find(function(e) { return e.id === id; }); if (evt && evt.hasRsvped) showEventDetails(id); else showRsvpOverlay(id); } break;
    case "home-prev": homePrev(); break;
    case "home-next": homeNext(); break;
    case "share-event": shareEvent(); break;
    case "refresh-home": log("refresh-home clicked"); loadHome(); break;
    case "desc-next": if (id) {
      log("desc-next id=" + id + " pageTotal=" + (descPageTotal[id] || 0) + " curPage=" + (descPageIdx[id] || 0));
      if (descPageTotal[id] === 99) {
        log("desc-next PAGINATING id=" + id);
        var box = document.getElementById("desc-box-" + id);
        if (!box) return;
        var pages = splitTextToPages(descFullText[id] || "", box.clientWidth, box.clientHeight);
        log("desc-next split into " + pages.length + " pages id=" + id);
        descPageTotal[id] = pages.length;
        descPageIdx[id] = 0;
        document.getElementById("desc-track-" + id)!.outerHTML = buildDescPagesHTML(id, pages);
        document.getElementById("desc-nav-" + id)!.innerHTML = buildDescNavHTML(id);
        persistStep2(id);
      } else {
        var cur = (descPageIdx[id] || 0) + 1;
        if (cur >= (descPageTotal[id] || 1)) { log("desc-next BLOCKED at last page id=" + id); return; }
        descPageIdx[id] = cur;
        log("desc-next slide id=" + id + " page=" + cur + "/" + descPageTotal[id]);
        slideTrack("desc-track-" + id, cur, descPageTotal[id] || 1);
        document.getElementById("desc-nav-" + id)!.innerHTML = buildDescNavHTML(id);
        persistStep2(id);
      }
    } break;
    case "desc-prev": if (id) {
      var cur2 = (descPageIdx[id] || 0) - 1;
      if (cur2 < 0) { log("desc-prev BLOCKED at first page id=" + id); return; }
      descPageIdx[id] = cur2;
      log("desc-prev slide id=" + id + " page=" + cur2 + "/" + descPageTotal[id]);
      slideTrack("desc-track-" + id, cur2, descPageTotal[id] || 1);
      document.getElementById("desc-nav-" + id)!.innerHTML = buildDescNavHTML(id);
      persistStep2(id);
    } break;
    case "att-next": if (id) { var c3 = (attPageIdx[id] || 0) + 1; attPageIdx[id] = c3; var t3 = Math.ceil((attListStore[id] || []).length / ATTENDEES_PER_PAGE); log("att-next id=" + id + " page=" + c3 + "/" + t3); slideTrack("att-track-" + id, c3, t3); document.getElementById("att-nav-" + id)!.innerHTML = buildAttNav(id); persistStep3(id); } break;
    case "att-prev": if (id) { var c4 = (attPageIdx[id] || 0) - 1; attPageIdx[id] = c4; var t4 = Math.ceil((attListStore[id] || []).length / ATTENDEES_PER_PAGE); log("att-prev id=" + id + " page=" + c4 + "/" + t4); slideTrack("att-track-" + id, c4, t4); document.getElementById("att-nav-" + id)!.innerHTML = buildAttNav(id); persistStep3(id); } break;
    case "my-pitch-next": myPitchNext(); break;
    case "my-pitch-prev": myPitchPrev(); break;
    case "my-event-next": myEventNext(); break;
    case "my-event-prev": myEventPrev(); break;
    case "my-rsvp-next": myRsvpNext(); break;
    case "my-rsvp-prev": myRsvpPrev(); break;
    case "my-stuff-next": {
      log("my-stuff-next tab=" + myStuffTab);
      if (myStuffTab === "rsvps") myRsvpNext();
      else if (myStuffTab === "pitches") myPitchNext();
      else if (myStuffTab === "events") myEventNext();
    } break;
    case "my-stuff-prev": {
      log("my-stuff-prev tab=" + myStuffTab);
      if (myStuffTab === "rsvps") myRsvpPrev();
      else if (myStuffTab === "pitches") myPitchPrev();
      else if (myStuffTab === "events") myEventPrev();
    } break;
    case "cancel-my-event": if (id) cancelMyEvent(id); break;
    case "delete-my-event": if (id) deleteMyEvent(id); break;
    case "approve-event": if (id) approveEvent(id); break;
    case "decline-event": if (id) deleteEvent(id, "pending"); break;
    case "delete-published": if (id) deleteEvent(id, "published"); break;
    case "dismiss-idea": if (id) dismissIdea(id); break;
    case "delete-pitch": if (id) deletePitch(id); break;
    case "rsvp-now": if (id) showRsvpOverlay(id); break;
    case "update-rsvp": if (id) showUpdateRsvpOverlay(id); break;
    case "leave-event": if (id) leaveEvent(id); break;
    case "view-rsvps": if (id) viewRsvps(id); break;
    case "view-mod-details": if (id) showModEventDetails(id); break;
    case "view-attendees-mod": if (id) showModAttendees(id); break;
    case "close-mod-details": closeOverlay("mod-event-details-overlay"); break;
    case "close-mod-attendees": closeOverlay("mod-attendees-overlay"); break;
    case "mod-detail-next": modDetailNext(); break;
    case "mod-detail-prev": modDetailPrev(); break;
    case "mod-att-next": modAttNext(); break;
    case "mod-att-prev": modAttPrev(); break;
    case "mod-detail-att-next": if (id) {
      var c7 = (attPageIdx[id] || 0) + 1;
      var t7 = Math.ceil((attListStore[id] || []).length / ATTENDEES_PER_PAGE);
      if (c7 >= t7) break;
      attPageIdx[id] = c7;
      slideTrack("mod-att-track-" + id, c7, t7);
      document.getElementById("mod-att-nav-" + id)!.innerHTML = buildModAttNavHTML(id);
    } break;
    case "mod-detail-att-prev": if (id) {
      var c8 = (attPageIdx[id] || 0) - 1;
      if (c8 < 0) break;
      attPageIdx[id] = c8;
      var t8 = Math.ceil((attListStore[id] || []).length / ATTENDEES_PER_PAGE);
      slideTrack("mod-att-track-" + id, c8, t8);
      document.getElementById("mod-att-nav-" + id)!.innerHTML = buildModAttNavHTML(id);
    } break;
    case "load-attendees": { if (!id) break; loadPublicAttendees(id); } break;
    case "mod-next": modNext(); break;
    case "mod-prev": modPrev(); break;
    case "mod-desc-next": {
      if (!id) break;
      var lockKey = "mod-desc-" + id;
      if (isLocked(lockKey)) return;
      lock(lockKey);
      var c5 = (modDescPageIdx[id] || 0) + 1;
      if (c5 >= (modDescTotal[id] || 1)) { unlock(lockKey); return; }
      modDescPageIdx[id] = c5;
      slideTrack("mod-desc-track-" + id, c5, modDescTotal[id] || 1);
      document.getElementById("mod-desc-nav-" + id)!.innerHTML = buildModDescNavHTML(id);
      setTimeout(function() { unlock(lockKey); }, 300);
    } break;
    case "mod-desc-prev": {
      if (!id) break;
      var lockKey = "mod-desc-" + id;
      if (isLocked(lockKey)) return;
      lock(lockKey);
      var c6 = (modDescPageIdx[id] || 0) - 1;
      if (c6 < 0) { unlock(lockKey); return; }
      modDescPageIdx[id] = c6;
      slideTrack("mod-desc-track-" + id, c6, modDescTotal[id] || 1);
      document.getElementById("mod-desc-nav-" + id)!.innerHTML = buildModDescNavHTML(id);
      setTimeout(function() { unlock(lockKey); }, 300);
    } break;
    case "mod-detail-desc-next": {
      if (!id) break;
      log("mod-detail-desc-next id=" + id + " pageTotal=" + (descPageTotal[id] || 0) + " curPage=" + (descPageIdx[id] || 0));
      if (descPageTotal[id] === 99) {
        log("mod-detail-desc-next PAGINATING id=" + id);
        var box = document.getElementById("mod-desc-box-" + id);
        if (!box) return;
        var pages = splitTextToPages(descFullText[id] || "", box.clientWidth, box.clientHeight);
        log("mod-detail-desc-next split into " + pages.length + " pages id=" + id);
        descPageTotal[id] = pages.length;
        descPageIdx[id] = 0;
        document.getElementById("mod-desc-track-" + id)!.outerHTML = buildDescPagesHTML(id, pages, "mod-desc-track-");
        document.getElementById("mod-desc-nav-" + id)!.innerHTML = buildModDetailDescNavHTML(id);
        persistModStep2(id);
      } else {
        var cur = (descPageIdx[id] || 0) + 1;
        if (cur >= (descPageTotal[id] || 1)) { log("mod-detail-desc-next BLOCKED at last page id=" + id); return; }
        descPageIdx[id] = cur;
        log("mod-detail-desc-next slide id=" + id + " page=" + cur + "/" + descPageTotal[id]);
        slideTrack("mod-desc-track-" + id, cur, descPageTotal[id] || 1);
        document.getElementById("mod-desc-nav-" + id)!.innerHTML = buildModDetailDescNavHTML(id);
        persistModStep2(id);
      }
    } break;
    case "mod-detail-desc-prev": {
      if (!id) break;
      var cur2 = (descPageIdx[id] || 0) - 1;
      if (cur2 < 0) { log("mod-detail-desc-prev BLOCKED at first page id=" + id); return; }
      descPageIdx[id] = cur2;
      log("mod-detail-desc-prev slide id=" + id + " page=" + cur2 + "/" + descPageTotal[id]);
      slideTrack("mod-desc-track-" + id, cur2, descPageTotal[id] || 1);
      document.getElementById("mod-desc-nav-" + id)!.innerHTML = buildModDetailDescNavHTML(id);
      persistModStep2(id);
    } break;
    case "my-stuff-desc-next": {
      if (!id) break;
      var msKey = id;
      var msLock = "ms-desc-" + msKey;
      if (isLocked(msLock)) return;
      lock(msLock);
      var msCur = (myStuffDescPageIdx[msKey] || 0) + 1;
      if (msCur >= (myStuffDescPageTotal[msKey] || 1)) { unlock(msLock); return; }
      myStuffDescPageIdx[msKey] = msCur;
      slideTrack("my-stuff-desc-track-" + msKey, msCur, myStuffDescPageTotal[msKey] || 1);
      var msNav = document.getElementById("my-stuff-desc-nav-" + msKey);
      if (msNav) msNav.innerHTML = buildMyStuffDescNavHTML(msKey);
      setTimeout(function() { unlock(msLock); }, 300);
    } break;
    case "my-stuff-desc-prev": {
      if (!id) break;
      var msKey2 = id;
      var msLock2 = "ms-desc-" + msKey2;
      if (isLocked(msLock2)) return;
      lock(msLock2);
      var msCur2 = (myStuffDescPageIdx[msKey2] || 0) - 1;
      if (msCur2 < 0) { unlock(msLock2); return; }
      myStuffDescPageIdx[msKey2] = msCur2;
      slideTrack("my-stuff-desc-track-" + msKey2, msCur2, myStuffDescPageTotal[msKey2] || 1);
      var msNav2 = document.getElementById("my-stuff-desc-nav-" + msKey2);
      if (msNav2) msNav2.innerHTML = buildMyStuffDescNavHTML(msKey2);
      setTimeout(function() { unlock(msLock2); }, 300);
    } break;
    case "copy-link": if (id) { if (navigator.clipboard) navigator.clipboard.writeText(id); else { var ta = document.createElement("textarea"); ta.value = id; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } showToast("Link copied! 📋", "success"); } break;
    case "copy-event-details": if (id) { log("copy-event-details id=" + id); var ce = cachedHomeEvents.find(function(e) { return e.id === id; }); if (ce) { var detailText = ce.title + "\n📅 " + relativeDate(ce.date) + " at " + ce.time + "\n📍 " + (ce.location || "TBD") + "\n" + (ce.description || ""); if (navigator.clipboard) navigator.clipboard.writeText(detailText).then(function() { showToast("Event details copied! 📋", "success"); }).catch(function() { showToast("Copy failed", "error"); }); else { var t2 = document.createElement("textarea"); t2.value = detailText; document.body.appendChild(t2); t2.select(); try { document.execCommand("copy"); showToast("Event details copied! 📋", "success"); } catch(e) { showToast("Copy failed", "error"); } document.body.removeChild(t2); } } } break;
    case "export-csv": if (id) exportAttendeesCSV(id); break;
    case "toggle-create": toggleCreateMenu(); break;
    case "close-create-menu": closeCreateMenu(); break;
    case "create-pitch": closeCreateMenu(); openOverlay("pitch-overlay"); break;
    case "create-event": closeCreateMenu(); resetEventForm(); prefillOrganizer(); openOverlay("event-overlay"); break;
    case "open-my-stuff": openMyStuff(); break;
    case "show-mod": showModDashboard(); break;
    case "switch-mod-tab": if (id) switchModTab(id); break;
    case "switch-my-stuff-tab": if (id) switchMyStuffTab(id); break;
    case "detail-next": detailNext(); break;
    case "detail-prev": detailPrev(); break;
    case "pitch-submit": submitPitch(); break;
    case "event-next": eventNext(); break;
    case "event-prev": eventPrev(); break;
    case "event-submit": submitEvent(); break;
    case "close-overlay": showHomePage(); break;
    default: break;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  log("APP INIT - DOM ready");

  // A11y: every close button gets an aria-label. One pass at boot is enough
  // since the close buttons are static (not dynamically created).
  document.querySelectorAll(".close-btn").forEach(function (b) {
    b.setAttribute("role", "button");
    b.setAttribute("tabindex", "0");
    if (!b.getAttribute("aria-label")) b.setAttribute("aria-label", "Close");
  });

  // Animated loading screen: cycle wholesome emojis
  var wholesomeEmojis = ["✨", "🥰", "🌸", "🌟", "💫", "🦋", "🌈", "☀️", "🌻", "🍀", "🎈", "🌺", "💖", "🙌", "🎉"];
  var emojiIdx = 0;
  var emojiEl = document.getElementById("loading-emoji");
  if (emojiEl) {
    var loadingEmojiEl = emojiEl;
    setInterval(function() {
      emojiIdx = (emojiIdx + 1) % wholesomeEmojis.length;
      loadingEmojiEl.textContent = wholesomeEmojis[emojiIdx] || "";
    }, 600);
  }

  document.getElementById("debug-toggle")!.addEventListener("click", function () {
    var panel = document.getElementById("debug-panel")!;
    var show = panel.style.display !== "block";
    panel.style.display = show ? "block" : "none";
    log("debug panel " + (show ? "visible" : "hidden"));
    if (show) { fetchServerLogs(); }
  });
  document.getElementById("debug-copy-all")?.addEventListener("click", function (e) {
    e.stopPropagation();
    copyAllLogs();
  });
  document.querySelector(".btn-submit-rsvp")?.addEventListener("click", submitRsvp);
  // Custom confirm overlay buttons
  document.getElementById("confirm-ok-btn")!.addEventListener("click", function () { closeOverlay("confirm-overlay"); var el = document.getElementById("confirm-overlay")!; var r = (el as any)._confirmResolve; if (r) { log("confirm OK"); r(true); (el as any)._confirmResolve = null; } });
  document.getElementById("confirm-cancel-btn")!.addEventListener("click", function () { closeOverlay("confirm-overlay"); var el = document.getElementById("confirm-overlay")!; var r = (el as any)._confirmResolve; if (r) { log("confirm cancelled"); r(false); (el as any)._confirmResolve = null; } });
  document.getElementById("confirm-backdrop")!.addEventListener("click", function () { closeOverlay("confirm-overlay"); var el = document.getElementById("confirm-overlay")!; var r = (el as any)._confirmResolve; if (r) { log("confirm backdrop dismissed"); r(false); (el as any)._confirmResolve = null; } });

  // ONE event delegation listener - replaces all bindButtons() calls
  document.body.addEventListener("click", function(e) {
    var btn = (e.target as HTMLElement).closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    var id = btn.getAttribute("data-id") || btn.getAttribute("data-key") || btn.getAttribute("data-tab") || btn.getAttribute("data-mtab");
    if (action) handleAction(action, id);
  });

  // Search input listener (disabled — feature kept for future use)
  // var searchInput = document.getElementById("home-search") as HTMLInputElement | null;
  // if (searchInput) {
  //   searchInput.addEventListener("input", function() {
  //     filterHomeEvents(searchInput.value);
  //   });
  // }

  loadHome();
});
