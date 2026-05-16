var API_BASE = "";
var currentEventId: string | null = null;
var currentUsername: string | null = null;
var eventStep = 1;
var detailStep = 1;

function showToast(msg: string, type: "success" | "error") {
  var t = document.createElement("div");
  t.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:" + (type === "success" ? "#00ff88" : "#ff4444") + ";color:#1c1c0f;padding:14px 24px;font-weight:700;z-index:2000;font-family:'Space Grotesk',sans-serif;border:4px solid #1c1c0f;box-shadow:6px 6px 0 #1c1c0f;";
  t.textContent = msg; document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 3000);
}
function showCopyToast() {
  var t = document.createElement("div"); t.className = "toast-copied"; t.textContent = "📍 Copied!";
  document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1500);
}
function escapeHtml(s: string | undefined | null) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

var overlayActive = false;
// Smart scroll: scroll visible overlay body if active, else window
function getScrollTarget(): HTMLElement {
  var overlays = document.querySelectorAll(".overlay.active");
  if (overlays.length > 0) {
    overlayActive = true;
    var bodies = overlays[0].querySelectorAll(".overlay-body");
    for (var i = 0; i < bodies.length; i++) {
      if (!bodies[i].classList.contains("hidden")) return bodies[i] as HTMLElement;
    }
    return overlays[0] as HTMLElement;
  }
  overlayActive = false;
  return document.body;
}
var scrollAnimId: number | null = null;
function scrollBy(amount: number) {
  var t = getScrollTarget();
  if (scrollAnimId) cancelAnimationFrame(scrollAnimId);
  var step = overlayActive ? 30 : 80;
  var dir = amount > 0 ? 1 : -1;
  var target = Math.max(0, t.scrollTop + step * dir);
  animateScroll(t, target);
}
function scrollTo(pos: number) {
  var t = getScrollTarget();
  t.scrollTop = pos;
}

function updateScrollButtons() {
  var nav = document.getElementById("scroll-nav");
  if (!nav) return;
  var t = getScrollTarget();
  var overflow = t.scrollHeight > t.clientHeight + 20;
  nav.style.display = overflow ? "flex" : "none";
}
function animateScroll(el: HTMLElement, target: number) {
  var start = el.scrollTop;
  var distance = target - start;
  var duration = 150; // ms
  var startTime = performance.now();
  function step(currentTime: number) {
    var elapsed = currentTime - startTime;
    var progress = Math.min(elapsed / duration, 1);
    var ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress; // easeInOutQuad
    el.scrollTop = start + distance * ease;
    if (progress < 1) { scrollAnimId = requestAnimationFrame(step); }
    else { scrollAnimId = null; }
  }
  scrollAnimId = requestAnimationFrame(step);
}

// ======= TABS =======
function switchTab(tab: string) {
  console.log("[UI] Switching to tab:", tab);
  document.querySelectorAll(".tab").forEach(function (el) { el.classList.toggle("active", (el as HTMLElement).dataset.tab === tab); });
  document.getElementById("tab-events")!.classList.toggle("hidden", tab !== "events");
  document.getElementById("tab-create")!.classList.toggle("hidden", tab !== "create");
  document.getElementById("tab-mine")!.classList.toggle("hidden", tab !== "mine");
  document.getElementById("mod-screen")!.classList.add("hidden");
  closeAllOverlays();
  if (tab === "events") loadHome();
  if (tab === "mine") loadMySubmissions();
}
function showHome() {
  document.getElementById("mod-screen")!.classList.add("hidden");
  closeAllOverlays();
  switchTab("events");
}

// ======= HOME =======
async function loadHome() {
  // Animate loading bar
  var bar = document.getElementById("loading-bar");
  var msg = document.getElementById("loading-msg");
  if (bar) bar.style.width = "30%";
  if (msg) msg.textContent = "Fetching events...";
  try {
    var res = await fetch(API_BASE + "/api/home");
    if (bar) bar.style.width = "70%";
    if (msg) msg.textContent = "Almost there...";
    var data = await res.json();
    if (bar) bar.style.width = "100%";
    if (msg) msg.textContent = "Ready!";
    if (data.type === "home") {
      setTimeout(function () { renderHome(data.data); }, 200);
    }
  } catch (e) {
    console.error(e);
    if (msg) msg.textContent = "Could not load. Check connection.";
  }
}
function formatDateBadge(dateStr: string): string {
  var d = new Date(dateStr + "T00:00:00");
  return '<div class="event-date-badge"><div class="day">' + d.getDate() + '</div><div class="month">' + d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) + '</div></div>';
}
function renderHome(state: { eventsByDate: Record<string, any[]>; isMod: boolean; settings: any }) {
  var c = document.getElementById("events-container")!;
  c.innerHTML = "";
  var dates = Object.keys(state.eventsByDate).sort();
  if (dates.length === 0) {
    c.innerHTML = '<div class="empty-state"><span class="emoji">🐱</span><h2>Wow, so empty!</h2><p>Switch to ✨ Create tab to pitch an idea</p><button class="btn btn-pink btn-create-pitch" style="margin-top:16px;">💡 Pitch an Idea</button></div>';
  } else {
    for (var di = 0; di < dates.length; di++) {
      var dk = dates[di];
      c.innerHTML += formatDateBadge(dk);
      var events = state.eventsByDate[dk];
      for (var ei = 0; ei < events.length; ei++) {
        var e = events[ei];
        c.innerHTML += '<div class="event-card"><h3>' + escapeHtml(e.title) + '</h3><div class="event-meta"><span class="event-tag">⏰ ' + escapeHtml(e.time) + '</span><span class="event-tag">📍 ' + escapeHtml(e.location) + '</span></div><button class="btn btn-view-details" data-id="' + e.id + '">View Details →</button></div>';
      }
    }
  }
  document.getElementById("mod-section")!.classList.toggle("hidden", !state.isMod);
  bindButtons();
  updateScrollButtons();
}

// ======= MY SUBMISSIONS =======
var myStuffLoading = false;

async function loadMySubmissions() {
  if (myStuffLoading) return; // Debounce
  myStuffLoading = true;
  var c = document.getElementById("my-submissions-container")!;
  if (!c.classList.contains("loading")) { c.classList.add("loading"); c.innerHTML = '<div class="empty-state"><span class="emoji">⏳</span><h2>Loading...</h2></div>'; }
  try {
    var res = await fetch(API_BASE + "/api/my-submissions");
    var data = await res.json();
    if (data.type === "my-submissions") {
      var pitches = data.pitches || [];
      var events = data.events || [];
      var html = "";
      if (pitches.length === 0 && events.length === 0) {
        html = '<div class="empty-state"><span class="emoji">📭</span><h2>Nothing yet</h2><p>Your pitches & submissions appear here</p></div>';
      }
      if (pitches.length > 0) {
        html += '<div class="date-header" style="background:#ffeaa7;color:#1c1c0f;">💡 My Pitches (' + pitches.length + ')</div>';
        for (var i = 0; i < pitches.length; i++) {
          var p = pitches[i];
          html += '<div class="idea-card"><h3>💡 ' + escapeHtml(p.title) + '</h3><div class="event-row" style="color:var(--muted);">' + escapeHtml(p.description).substring(0, 150) + '</div><button class="btn btn-white btn-sm btn-delete-pitch" data-id="' + p.id + '" style="margin-top:8px;">🗑️ Delete</button></div>';
        }
      }
      if (events.length > 0) {
        html += '<div class="date-header">📋 My Events (' + events.length + ')</div>';
        for (var j = 0; j < events.length; j++) {
          var e = events[j];
          var statusLabel = e.status === "published" ? "✅ Published" : "⏳ Pending Review";
          html += '<div class="pending-card" style="background:' + (e.status === "published" ? "#00ff88" : "var(--secondary)") + ';"><h3>' + escapeHtml(e.title) + '</h3><div class="event-row">📅 ' + escapeHtml(e.date) + ' at ' + escapeHtml(e.time) + '</div><div class="event-row">📍 ' + escapeHtml(e.location) + '</div><div style="font-weight:700;margin-top:6px;">' + statusLabel + '</div></div>';
        }
      }
      c.innerHTML = html;
      c.classList.remove("loading");
    }
  } catch (e) { console.error(e); c.innerHTML = '<div class="empty-state"><span class="emoji">❌</span><h2>Could not load</h2></div>'; c.classList.remove("loading"); }
  myStuffLoading = false;
  updateScrollButtons();
}

function deletePitch(id: string) {
  console.log("[UI] Deleting pitch:", id);
  fetch(API_BASE + "/api/dismiss-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ideaId: id }) })
    .then(function () { showToast("Deleted", "success"); loadMySubmissions(); })
    .catch(function () { showToast("Error deleting", "error"); });
}

function deleteEvent(id: string, type: string) {
  if (actionInProgress) return;
  actionInProgress = true;
  var sel = type === "pending" ? ".btn-decline-event" : ".btn-delete-published";
  var btn = document.querySelector('[data-id="' + id + '"]' + sel) as HTMLElement;
  if (btn) { btn.style.opacity = "0.3"; btn.style.pointerEvents = "none"; }
  var parent = btn ? btn.closest(".pending-card,.event-card") as HTMLElement : null;
  if (parent) parent.style.opacity = "0.3";
  var endpoint = type === "pending" ? "/api/delete-pending" : "/api/delete-published";
  fetch(API_BASE + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) })
    .then(function () { showToast("Deleted", "success"); setTimeout(function () { loadModTab(type === "pending" ? "pending" : "published"); }, 300); })
    .catch(function () { showToast("Error", "error"); if (parent) parent.style.opacity = "1"; if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; } });
  setTimeout(function () { actionInProgress = false; }, 500);
}

// ======= EVENT DETAILS =======
async function showEventDetails(id: string) {
  currentEventId = id;
  try {
    var res = await fetch(API_BASE + "/api/event-details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });
    var data = await res.json();
    if (data.type === "event-details") { openDetailsOverlay(data.data); return; }
  } catch (e) { console.error(e); }
  openDetailsOverlay({ event: { id: id, title: "Bangalore Tech & Chai", date: "2026-05-15", time: "16:00", location: "Cubbon Park, Bangalore", description: "Join fellow redditors for an evening of tech talks, networking, and cutting chai.", organizer: "u/darelphilip", mapUrl: "https://maps.google.com/?q=Cubbon+Park+Bangalore" }, rsvpCount: 0, hasRsvped: false, settings: {} });
}

function openDetailsOverlay(d: { event: any; rsvpCount: number; hasRsvped: boolean; settings: any }) {
  var e = d.event;
  document.getElementById("details-overlay-title")!.textContent = e.title;
  var date = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  document.getElementById("detail-step-1")!.innerHTML = '<div class="detail-card"><div style="margin-bottom:16px;"><div class="detail-label">Date</div><div style="font-size:20px;font-weight:700;">📅 ' + date + '</div></div><div style="margin-bottom:16px;"><div class="detail-label">Time</div><div style="font-size:20px;font-weight:700;">⏰ ' + escapeHtml(e.time) + '</div></div><div style="margin-bottom:16px;"><div class="detail-label">Location</div><div style="font-size:20px;font-weight:700;">📍 ' + escapeHtml(e.location) + '</div></div><div style="background:var(--surface);border:var(--border);padding:12px;font-weight:700;font-size:15px;">👥 ' + d.rsvpCount + ' people going</div></div>';

  var descText = (e.description || "").substring(0, 200);
  if ((e.description || "").length > 200) descText += "...";
  var s2 = '<div class="detail-card" style="padding:14px;">';
  if (e.organizer) {
    var initial = e.organizer.replace("u/", "").charAt(0).toUpperCase();
    s2 += '<div class="organizer-card" style="padding:10px;margin-bottom:10px;"><div class="organizer-avatar">' + initial + '</div><div><div style="font-weight:700;font-size:11px;text-transform:uppercase;color:var(--muted);">Organizer</div><div style="font-weight:700;font-size:15px;">' + escapeHtml(e.organizer) + '</div></div></div>';
  }
  var descFull = e.description || "";
  var descShort = descFull.substring(0, 100);
  var hasMore = descFull.length > 100;
  s2 += '<div class="detail-desc" style="padding:10px;font-size:14px;margin-top:0;">';
  s2 += '<span id="desc-short-' + e.id + '">' + escapeHtml(descShort) + (hasMore ? '...' : '') + '</span>';
  if (hasMore) {
    s2 += '<span id="desc-full-' + e.id + '" style="display:none;">' + escapeHtml(descFull) + '</span>';
    s2 += '<button class="btn btn-white btn-sm btn-read-more" data-id="' + e.id + '" style="margin-top:6px;width:auto;display:inline-block;">Read more ↓</button>';
  }
  s2 += '</div>';
  if (e.mapUrl) {
    s2 += '<div class="map-link" style="padding:10px;margin-top:10px;"><span style="flex:1;font-size:13px;">🗺️ Google Maps</span><button class="copy-btn btn-copy-link" data-url="' + escapeHtml(e.mapUrl) + '" style="margin-left:6px;background:#fff;font-size:12px;">📋 Copy</button></div>';
  }
  s2 += "</div>";
  document.getElementById("detail-step-2")!.innerHTML = s2;

  // Step 3: RSVP + Who's Going
  var s3 = '<div class="detail-card">';
  s3 += d.hasRsvped
    ? '<div class="rsvp-success">🎉 You\'re on the list!</div><button class="btn btn-white btn-leave-event" data-id="' + e.id + '" style="margin-top:10px;">❌ Leave Event</button>'
    : '<div style="text-align:center;"><div style="font-size:36px;">🎟️</div><div style="font-size:18px;font-weight:700;margin:8px 0;">Ready to join?</div></div>';
  s3 += '<button class="btn btn-white btn-sm btn-view-attendees" data-id="' + e.id + '" style="margin-top:12px;width:100%;">👥 Who\'s Going? (' + d.rsvpCount + ')</button>';
  s3 += '<div class="rsvp-attendees hidden" id="rsvps-public-' + e.id + '" style="background:#fff;border:var(--border);padding:8px;margin-top:6px;max-height:180px;overflow-y:auto;-webkit-overflow-scrolling:touch;"></div>';
  s3 += "</div>";
  document.getElementById("detail-step-3")!.innerHTML = s3;

  detailStep = 1;
  ["detail-dot-1","detail-dot-2","detail-dot-3"].forEach(function(id, i) { document.getElementById(id)!.classList.toggle("done", i === 0); });
  ["detail-step-1","detail-step-2","detail-step-3"].forEach(function(id, i) { document.getElementById(id)!.classList.toggle("hidden", i !== 0); });
  document.getElementById("detail-next-btn")!.classList.remove("hidden");
  document.getElementById("detail-prev-btn")!.classList.add("hidden");
  document.getElementById("detail-rsvp-btn")!.classList.add("hidden");
  document.getElementById("detail-rsvped")!.classList.add("hidden");

  if (d.hasRsvped) {
    document.getElementById("detail-rsvped")!.classList.remove("hidden");
  }
  openOverlay("details-overlay");
  bindButtons();
  setTimeout(updateScrollButtons, 100);
}

function detailNext() {
  if (detailStep === 1) {
    document.getElementById("detail-dot-2")!.classList.add("done");
    document.getElementById("detail-step-1")!.classList.add("hidden");
    document.getElementById("detail-step-2")!.classList.remove("hidden");
    document.getElementById("detail-prev-btn")!.classList.remove("hidden");
    detailStep = 2;
    updateScrollButtons();
  } else if (detailStep === 2) {
    document.getElementById("detail-dot-3")!.classList.add("done");
    document.getElementById("detail-step-2")!.classList.add("hidden");
    document.getElementById("detail-step-3")!.classList.remove("hidden");
    document.getElementById("detail-next-btn")!.classList.add("hidden");
    document.getElementById("detail-prev-btn")!.classList.remove("hidden");
    if (document.getElementById("detail-rsvped")!.classList.contains("hidden")) {
      document.getElementById("detail-rsvp-btn")!.classList.remove("hidden");
    }
    detailStep = 3;
    updateScrollButtons();
  }
}
function detailPrev() {
  if (detailStep === 2) {
    document.getElementById("detail-dot-2")!.classList.remove("done");
    document.getElementById("detail-step-2")!.classList.add("hidden");
    document.getElementById("detail-step-1")!.classList.remove("hidden");
    document.getElementById("detail-prev-btn")!.classList.add("hidden");
    detailStep = 1;
    updateScrollButtons();
  } else if (detailStep === 3) {
    document.getElementById("detail-dot-3")!.classList.remove("done");
    document.getElementById("detail-step-3")!.classList.add("hidden");
    document.getElementById("detail-step-2")!.classList.remove("hidden");
    document.getElementById("detail-next-btn")!.classList.remove("hidden");
    document.getElementById("detail-rsvp-btn")!.classList.add("hidden");
    detailStep = 2;
    updateScrollButtons();
  }
}

// ======= LEAVE EVENT =======
async function leaveEvent(id: string) {
  try {
    var res = await fetch(API_BASE + "/api/leave-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });
    var data = await res.json();
    if (data.type === "leave-event" && data.success) {
      showToast("You've left the event", "success");
      closeOverlay("details-overlay");
      showHome();
    } else {
      showToast("Failed to leave event", "error");
    }
  } catch (e) {
    showToast("Error leaving", "error");
  }
}

// ======= MOD DASHBOARD =======
var modTab = "pending";

function showModDashboard() {
  document.getElementById("tab-events")!.classList.add("hidden");
  document.getElementById("tab-create")!.classList.add("hidden");
  document.getElementById("tab-mine")!.classList.add("hidden");
  document.getElementById("mod-screen")!.classList.remove("hidden");
  modTab = "pending";
  loadModTab("pending");
}

function switchModTab(tab: string) {
  if (tab === modTab) return;
  modTab = tab;
  document.querySelectorAll("#mod-tabs .mod-tab").forEach(function (t) { t.classList.toggle("active", (t as HTMLElement).dataset.mtab === tab); });
  loadModTab(tab);
}

function setModLoading(loading: boolean) {
  var c = document.getElementById("pending-events-container");
  if (c) c.style.opacity = loading ? "0.4" : "1";
  var tabs = document.getElementById("mod-tabs");
  if (tabs) tabs.style.pointerEvents = loading ? "none" : "auto";
}

async function loadModTab(tab: string) {
  setModLoading(true);
  if (tab === "pending") {
    try { var pr = await fetch(API_BASE + "/api/pending-events"); var pd = await pr.json(); renderModPending(pd.type === "pending-events" ? pd.events : []); }
    catch (e) { console.error(e); }
  } else if (tab === "published") {
    try { var res = await fetch(API_BASE + "/api/all-approved-events"); var data = await res.json(); renderModPublished(data.type === "all-approved-events" ? data.events : []); }
    catch (e) { console.error(e); }
  } else if (tab === "pitches") {
    try { var res = await fetch(API_BASE + "/api/pitched-ideas"); var data = await res.json(); renderModPitches(data.type === "pitched-ideas" ? data.ideas : []); }
    catch (e) { console.error(e); }
  }
  setModLoading(false);
  updateScrollButtons();
}

function renderModPending(events: any[]) {
  var c = document.getElementById("pending-events-container")!;
  if (events.length === 0) { c.innerHTML = '<div class="empty-state" style="margin-top:16px;"><span class="emoji">📋</span><h2>No pending events</h2></div>'; bindButtons(); return; }
  var h = "";
  for (var j = 0; j < events.length; j++) {
    var e = events[j];
    h += '<div class="pending-card"><h3>' + escapeHtml(e.title) + '</h3><div class="detail-row">📅 ' + escapeHtml(e.date) + ' at ' + escapeHtml(e.time) + '</div><div class="detail-row">📍 ' + escapeHtml(e.location) + '</div><div class="desc">' + escapeHtml(e.description) + '</div><button class="btn btn-green btn-approve-event" data-id="' + e.id + '">✅ Approve & Publish</button><button class="btn btn-white btn-sm btn-decline-event" data-id="' + e.id + '" style="margin-top:8px;">🗑️ Decline</button><button class="btn btn-white btn-sm btn-view-rsvps" data-id="' + e.id + '" style="margin-top:8px;">👥 View RSVPs</button><div class="rsvp-attendees hidden" id="rsvps-' + e.id + '" style="background:#fff;border:var(--border);padding:12px;margin-top:8px;"></div></div>';
  }
  c.innerHTML = h; bindButtons();
}

function renderModPublished(events: any[]) {
  var c = document.getElementById("pending-events-container")!;
  if (events.length === 0) { c.innerHTML = '<div class="empty-state" style="margin-top:16px;"><span class="emoji">✅</span><h2>No published events</h2></div>'; bindButtons(); return; }
  var h = "";
  for (var j = 0; j < events.length; j++) {
    var e = events[j];
    h += '<div class="event-card"><h3>' + escapeHtml(e.title) + '</h3><div class="event-meta"><span class="event-tag">📅 ' + escapeHtml(e.date) + '</span><span class="event-tag">⏰ ' + escapeHtml(e.time) + '</span></div><div style="font-weight:700;margin-top:8px;">👥 ' + (e.rsvpCount || 0) + ' RSVPs</div><button class="btn btn-white btn-sm btn-view-rsvps" data-id="' + e.id + '" style="margin-top:8px;">👥 View Attendees</button><button class="btn btn-white btn-sm btn-delete-published" data-id="' + e.id + '" style="margin-top:6px;">🗑️ Delete</button><div class="rsvp-attendees hidden" id="rsvps-' + e.id + '" style="background:#fff;border:var(--border);padding:10px;margin-top:6px;"></div></div>';
  }
  c.innerHTML = h; bindButtons();
}

function renderModPitches(ideas: any[]) {
  var c = document.getElementById("pending-events-container")!;
  if (ideas.length === 0) { c.innerHTML = '<div class="empty-state" style="margin-top:16px;"><span class="emoji">💡</span><h2>No pitched ideas</h2></div>'; bindButtons(); return; }
  var h = "";
  for (var i = 0; i < ideas.length; i++) {
    var idea = ideas[i];
    h += '<div class="idea-card"><h3>💡 ' + escapeHtml(idea.title) + '</h3><div class="detail-row">👤 u/' + escapeHtml(idea.submittedBy) + '</div><div class="detail-row">📅 ' + escapeHtml(new Date(idea.submittedAt).toLocaleString()) + '</div><div class="desc">' + escapeHtml(idea.description) + '</div><button class="btn btn-white btn-sm btn-dismiss-idea" data-id="' + idea.id + '">🗑️ Dismiss</button></div>';
  }
  c.innerHTML = h; bindButtons();
}

async function dismissIdea(id: string) {
  try {
    await fetch(API_BASE + "/api/dismiss-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ideaId: id }) });
    showToast("Idea dismissed", "success");
    loadModTab("pitches");
  } catch (e) { showToast("Error", "error"); }
}

var actionInProgress = false;

async function approveEvent(id: string) {
  if (actionInProgress) return;
  actionInProgress = true;
  var btn = document.querySelector('[data-id="' + id + '"].btn-approve-event') as HTMLElement;
  if (btn) { btn.style.opacity = "0.3"; btn.style.pointerEvents = "none"; btn.textContent = "⏳ Approving..."; }
  try {
    await fetch(API_BASE + "/api/approve-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });
    showToast("Event approved!", "success");
    setTimeout(function () { loadModTab("pending"); }, 300);
  } catch (e) { showToast("Error", "error"); if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; btn.textContent = "✅ Approve & Publish"; } }
  setTimeout(function () { actionInProgress = false; }, 500);
}
async function viewRsvps(eventId: string) {
  var el = document.getElementById("rsvps-" + eventId)!;
  if (!el.classList.contains("hidden")) { el.classList.add("hidden"); return; }
  try {
    var res = await fetch(API_BASE + "/api/rsvp-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: eventId }) });
    var data = await res.json();
    if (data.type === "rsvp-list") {
      var attendees = data.attendees || [];
      if (attendees.length === 0) { el.innerHTML = '<div style="font-size:13px;">No RSVPs yet</div>'; }
      else {
        var list = '<div style="font-weight:700;font-size:11px;margin-bottom:8px;">' + attendees.length + ' Attendees</div>';
        for (var i = 0; i < attendees.length; i++) {
          var a = attendees[i];
          list += '<div style="font-size:13px;font-weight:600;padding:6px 0;border-bottom:1px solid var(--outline-v);">👤 u/' + escapeHtml(a.username);
          if (a.email) list += '<span style="font-weight:400;color:var(--muted);"> ✉️ ' + escapeHtml(a.email) + '</span>';
          if (a.phone) list += '<span style="font-weight:400;color:var(--muted);"> 📱 ' + escapeHtml(a.phone) + '</span>';
          list += '</div>';
        }
        list += '<button class="copy-btn btn-copy-rsvp" data-rsvps="' + escapeHtml(JSON.stringify(attendees)) + '" style="margin-top:8px;background:var(--primary);padding:6px 14px;font-size:12px;">📋 Copy CSV</button>';
        el.innerHTML = list;
      }
      el.classList.remove("hidden");
    }
  } catch (e) { console.error(e); }
  bindButtons();
}

// ======= PITCH (single step) =======
async function submitPitch() {
  console.log("[UI] Submitting pitch...");
  var title = (document.getElementById("pitch-title") as HTMLInputElement).value.trim();
  var desc = (document.getElementById("pitch-description") as HTMLTextAreaElement).value.trim();
  if (!title || !desc) { showToast("Fill all fields", "error"); return; }
  try {
    await fetch(API_BASE + "/api/pitch-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title, description: desc }) });
    showToast("Idea sent to mods! ✅", "success");
    closeOverlay("pitch-overlay");
  } catch (e) { showToast("Error", "error"); }
}

// ======= SUBMIT EVENT (4 steps) =======
function resetEventForm() {
  eventStep = 1;
  ["event-step-1","event-step-2","event-step-3","event-step-4"].forEach(function(id, i) { document.getElementById(id)!.classList.toggle("hidden", i !== 0); });
  document.getElementById("event-next-btn")!.classList.remove("hidden");
  document.getElementById("event-submit-btn")!.classList.add("hidden");
  document.getElementById("event-prev-btn")!.classList.add("hidden");
  ["event-dot-1","event-dot-2","event-dot-3","event-dot-4"].forEach(function(id, i) { document.getElementById(id)!.classList.toggle("done", i === 0); });
  ["event-title","event-organizer","event-date","event-time","event-location","event-map-url","event-desc"].forEach(function(id) { (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value = ""; });
}
function eventPrev() {
  if (eventStep === 2) { document.getElementById("event-dot-2")!.classList.remove("done"); document.getElementById("event-step-2")!.classList.add("hidden"); document.getElementById("event-step-1")!.classList.remove("hidden"); document.getElementById("event-prev-btn")!.classList.add("hidden"); eventStep = 1; }
  else if (eventStep === 3) { document.getElementById("event-dot-3")!.classList.remove("done"); document.getElementById("event-step-3")!.classList.add("hidden"); document.getElementById("event-step-2")!.classList.remove("hidden"); eventStep = 2; }
  else if (eventStep === 4) { document.getElementById("event-dot-4")!.classList.remove("done"); document.getElementById("event-step-4")!.classList.add("hidden"); document.getElementById("event-step-3")!.classList.remove("hidden"); document.getElementById("event-next-btn")!.classList.remove("hidden"); document.getElementById("event-submit-btn")!.classList.add("hidden"); eventStep = 3; }
}
function eventNext() {
  if (eventStep === 1) { var title = (document.getElementById("event-title") as HTMLInputElement).value.trim(); var org = (document.getElementById("event-organizer") as HTMLInputElement).value.trim(); if (!title || !org) { showToast("Fill all fields", "error"); return; } document.getElementById("event-dot-2")!.classList.add("done"); document.getElementById("event-step-1")!.classList.add("hidden"); document.getElementById("event-step-2")!.classList.remove("hidden"); document.getElementById("event-prev-btn")!.classList.remove("hidden"); eventStep = 2; }
  else if (eventStep === 2) { var date = (document.getElementById("event-date") as HTMLInputElement).value.trim(); var time = (document.getElementById("event-time") as HTMLInputElement).value.trim(); if (!date || !time) { showToast("Fill all fields", "error"); return; } document.getElementById("event-dot-3")!.classList.add("done"); document.getElementById("event-step-2")!.classList.add("hidden"); document.getElementById("event-step-3")!.classList.remove("hidden"); eventStep = 3; }
  else if (eventStep === 3) { var loc = (document.getElementById("event-location") as HTMLInputElement).value.trim(); if (!loc) { showToast("Location is required", "error"); return; } document.getElementById("event-dot-4")!.classList.add("done"); document.getElementById("event-step-3")!.classList.add("hidden"); document.getElementById("event-step-4")!.classList.remove("hidden"); document.getElementById("event-next-btn")!.classList.add("hidden"); document.getElementById("event-submit-btn")!.classList.remove("hidden"); document.getElementById("event-review-title-preview")!.textContent = (document.getElementById("event-title") as HTMLInputElement).value; document.getElementById("event-review-meta-preview")!.textContent = (document.getElementById("event-date") as HTMLInputElement).value + " at " + (document.getElementById("event-time") as HTMLInputElement).value + " · " + loc; eventStep = 4; }
}
async function submitEvent() {
  var title = (document.getElementById("event-title") as HTMLInputElement).value.trim();
  var organizer = (document.getElementById("event-organizer") as HTMLInputElement).value.trim();
  var date = (document.getElementById("event-date") as HTMLInputElement).value.trim();
  var time = (document.getElementById("event-time") as HTMLInputElement).value.trim();
  var loc = (document.getElementById("event-location") as HTMLInputElement).value.trim();
  var mapUrl = (document.getElementById("event-map-url") as HTMLInputElement).value.trim();
  var desc = (document.getElementById("event-desc") as HTMLTextAreaElement).value.trim();
  if (!title || !organizer || !date || !time || !loc || !desc) { showToast("Fill all fields", "error"); return; }
  try {
    await fetch(API_BASE + "/api/submit-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title, organizer: organizer, date: date, time: time, location: loc, mapUrl: mapUrl, desc: desc }) });
    showToast("Event submitted! ✅", "success");
    closeOverlay("event-overlay");
  } catch (e) { showToast("Error", "error"); }
}

// ======= RSVP =======
async function submitRsvp() {
  if (!currentEventId) return;
  var email = (document.getElementById("rsvp-email") as HTMLInputElement).value;
  var phone = (document.getElementById("rsvp-phone") as HTMLInputElement).value;
  try {
    await fetch(API_BASE + "/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: currentEventId, email: email, phone: phone }) });
    showToast("RSVP confirmed! 🎉", "success");
    closeOverlay("rsvp-overlay");
    closeOverlay("details-overlay");
    showHome();
  } catch (e) { showToast("Error", "error"); }
}
function showRsvpOverlay(id: string) { currentEventId = id; (document.getElementById("rsvp-email") as HTMLInputElement).value = ""; (document.getElementById("rsvp-phone") as HTMLInputElement).value = ""; openOverlay("rsvp-overlay"); }

// ======= OVERLAY HELPERS =======
function openOverlay(id: string) { document.getElementById(id)!.classList.add("active"); }
function closeOverlay(id: string) { document.getElementById(id)!.classList.remove("active"); resetEventForm(); updateScrollButtons(); }
function closeAllOverlays() { document.querySelectorAll(".overlay").forEach(function (el) { el.classList.remove("active"); }); resetEventForm(); updateScrollButtons(); }

// ======= BIND ALL =======
function bindButtons() {
  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () {
      var tab = (b as HTMLElement).dataset.tab;
      if (tab === "events" || tab === "create" || tab === "mine") switchTab(tab);
    });
  });
  document.querySelectorAll(".btn-view-details").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) showEventDetails(id); }); });
  document.querySelectorAll(".btn-back-home").forEach(function (b) { b.addEventListener("click", showHome); });
  document.querySelectorAll(".btn-show-mod").forEach(function (b) { b.addEventListener("click", showModDashboard); });
  document.querySelectorAll(".btn-approve-event").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) approveEvent(id); }); });
  document.querySelectorAll(".btn-view-rsvps").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) viewRsvps(id); }); });
  // Mod dashboard tabs (data-mtab, not data-tab to avoid main tab conflict)
  document.querySelectorAll(".mod-tab").forEach(function (b) { b.addEventListener("click", function () { var mt = (b as HTMLElement).dataset.mtab; if (mt) switchModTab(mt); }); });
  // Dismiss idea
  document.querySelectorAll(".btn-dismiss-idea").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) dismissIdea(id); }); });
  // Delete pitch from My Stuff
  document.querySelectorAll(".btn-delete-pitch").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) deletePitch(id); }); });
  // Decline pending event
  document.querySelectorAll(".btn-decline-event").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) deleteEvent(id, "pending"); }); });
  // Delete published event
  document.querySelectorAll(".btn-delete-published").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) deleteEvent(id, "published"); }); });
  document.querySelectorAll(".btn-rsvp-now").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) showRsvpOverlay(id); }); });
  document.querySelectorAll(".btn-leave-event").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) leaveEvent(id); }); });
  document.querySelectorAll(".btn-submit-rsvp").forEach(function (b) { b.addEventListener("click", submitRsvp); });
  document.querySelectorAll(".btn-create-pitch").forEach(function (b) { b.addEventListener("click", function () { openOverlay("pitch-overlay"); }); });
  document.querySelectorAll(".btn-create-event").forEach(function (b) { b.addEventListener("click", function () { resetEventForm(); prefillOrganizer(); openOverlay("event-overlay"); }); });
  document.querySelectorAll("#pitch-submit-btn").forEach(function (b) { b.addEventListener("click", submitPitch); });
  document.querySelectorAll("#event-next-btn").forEach(function (b) { b.addEventListener("click", eventNext); });
  document.querySelectorAll("#event-prev-btn").forEach(function (b) { b.addEventListener("click", eventPrev); });
  document.querySelectorAll("#event-submit-btn").forEach(function (b) { b.addEventListener("click", submitEvent); });
  document.querySelectorAll("#detail-next-btn").forEach(function (b) { b.addEventListener("click", detailNext); });
  document.querySelectorAll("#detail-prev-btn").forEach(function (b) { b.addEventListener("click", detailPrev); });
  document.querySelectorAll("#detail-rsvp-btn").forEach(function (b) { b.addEventListener("click", function () { if (currentEventId) showRsvpOverlay(currentEventId); }); });
  document.querySelectorAll(".close-overlay").forEach(function (b) { b.addEventListener("click", closeAllOverlays); });
  document.querySelectorAll(".btn-copy-link").forEach(function (b) { b.addEventListener("click", function () { var url = (b as HTMLElement).getAttribute("data-url") || ""; if (navigator.clipboard) { navigator.clipboard.writeText(url); } else { var ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } showCopyToast(); }); });
  // Read more toggle
  document.querySelectorAll(".btn-read-more").forEach(function (b) { b.addEventListener("click", function () {
    var id = (b as HTMLElement).getAttribute("data-id"); if (!id) return;
    var s = document.getElementById("desc-short-" + id), f = document.getElementById("desc-full-" + id);
    if (!s || !f) return; var x = f.style.display !== "none";
    f.style.display = x ? "none" : "block"; s.style.display = x ? "inline" : "none";
    b.textContent = x ? "Read more ↓" : "Read less ↑";
  }); });
  document.querySelectorAll(".btn-copy-rsvp").forEach(function (b) { b.addEventListener("click", function () {
    var raw = (b as HTMLElement).getAttribute("data-rsvps") || "[]";
    var arr = JSON.parse(raw);
    var csv = "username,email,phone,timestamp\n";
    for (var i = 0; i < arr.length; i++) {
      csv += arr[i].username + "," + (arr[i].email || "") + "," + (arr[i].phone || "") + "," + (arr[i].timestamp || "") + "\n";
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(csv).then(function () { showToast("Copied!", "success"); }).catch(fallbackCopy);
      } else { fallbackCopy(); }
    } catch (e) { fallbackCopy(); }
    function fallbackCopy() { var ta = document.createElement("textarea"); ta.value = csv; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); showToast("Copied!", "success"); }
  }); });
  // Scroll arrows
  // Scroll buttons - smart: scroll overlay body if overlay is open, else window
  document.querySelectorAll("#scroll-up").forEach(function (b) { b.addEventListener("click", function () { scrollBy(-200); }); });
  document.querySelectorAll("#scroll-down").forEach(function (b) { b.addEventListener("click", function () { scrollBy(200); }); });
  document.querySelectorAll("#scroll-top").forEach(function (b) { b.addEventListener("click", function () { scrollTo(0); }); });
  document.querySelectorAll("#scroll-bottom").forEach(function (b) { b.addEventListener("click", function () { scrollTo(99999); }); });
  // Public attendee viewer - usernames only, no contact details
  document.querySelectorAll(".btn-view-attendees").forEach(function (b) { b.addEventListener("click", function () {
    var id = (b as HTMLElement).getAttribute("data-id"); if (!id) return;
    var el = document.getElementById("rsvps-public-" + id); if (!el) return;
    if (!el.classList.contains("hidden")) { el.classList.add("hidden"); return; }
    fetch(API_BASE + "/api/rsvp-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.type === "rsvp-list") {
          var attendees = data.attendees || [];
          if (attendees.length === 0) { el.innerHTML = '<div style="font-size:13px;">No one yet</div>'; }
          else {
            var html = '<div style="font-weight:700;font-size:11px;margin-bottom:6px;">' + attendees.length + ' going</div>';
            for (var i = 0; i < attendees.length; i++) {
              html += '<div style="font-size:13px;font-weight:600;padding:4px 0;border-bottom:1px solid var(--outline-v);">👤 u/' + escapeHtml(attendees[i].username) + '</div>';
            }
            el.innerHTML = html;
          }
          el.classList.remove("hidden");
        }
      });
  }); });
}

// Cache username to avoid repeated API calls
var usernameCached: string | null = null;
var prefillLoading = false;

async function prefillOrganizer() {
  if (currentUsername) { (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + currentUsername; return; }
  if (usernameCached) { (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + usernameCached; return; }
  if (prefillLoading) return; // Prevent parallel fetches
  prefillLoading = true;
  try {
    var res = await fetch(API_BASE + "/api/init");
    var data = await res.json();
    if (data.type === "init" && data.username) {
      currentUsername = data.username;
      usernameCached = data.username;
      (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + data.username;
    }
  } catch (e) { console.error(e); }
  prefillLoading = false;
}

document.addEventListener("DOMContentLoaded", function () { bindButtons(); loadHome(); });
