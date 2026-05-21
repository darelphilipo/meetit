var API_BASE = "";
var currentEventId: string | null = null;
var currentUsername: string | null = null;
var eventStep = 1;
var detailStep = 1;
var homeCardIndex = 0;
var cachedHomeEvents: any[] = [];

function showToast(msg: string, type: "success" | "error") {
  var t = document.createElement("div");
  t.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:" + (type === "success" ? "#00ff88" : "#ff4444") + ";color:#1c1c0f;padding:14px 24px;font-weight:700;z-index:2000;font-family:'Space Grotesk',sans-serif;border:4px solid #1c1c0f;box-shadow:6px 6px 0 #1c1c0f;";
  t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3000);
}
function showCopyToast() { var t = document.createElement("div"); t.className = "toast-copied"; t.textContent = "📍 Copied!"; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1500); }
function escapeHtml(s: string | undefined | null) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

// ======= HOME - Single card navigation =======
async function loadHome() {
  var bar = document.getElementById("loading-bar"), msg = document.getElementById("loading-msg");
  if (bar) bar.style.width = "30%"; if (msg) msg.textContent = "Fetching events...";
  try {
    var res = await fetch(API_BASE + "/api/home");
    if (bar) bar.style.width = "70%"; if (msg) msg.textContent = "Almost there...";
    var data = await res.json();
    if (bar) bar.style.width = "100%"; if (msg) msg.textContent = "Ready!";
    if (data.type === "home") {
      var allEvents: any[] = [];
      var dates = Object.keys(data.data.eventsByDate).sort();
      for (var i = 0; i < dates.length; i++) {
        var events = data.data.eventsByDate[dates[i]];
        for (var j = 0; j < events.length; j++) allEvents.push({ ...events[j], _date: dates[i] });
      }
      cachedHomeEvents = allEvents;
      homeCardIndex = 0;
      setTimeout(function () { renderHomeCard(data.data); }, 200);
    }
  } catch (e) { console.error(e); if (msg) msg.textContent = "Could not load."; }
}

function renderHomeCard(state: { eventsByDate: Record<string, any[]>; isMod: boolean; settings: any }) {
  var dates = Object.keys(state.eventsByDate).sort();
  var c = document.getElementById("events-container")!;
  
  if (dates.length === 0) {
    c.innerHTML = '<div class="empty-state"><span class="emoji">🐱</span><h2>Wow, so empty!</h2><p>Tap ➕ to pitch an idea</p></div>';
  } else {
    // Flatten all events
    var all: any[] = [];
    for (var i = 0; i < dates.length; i++) {
      var evts = state.eventsByDate[dates[i]];
      for (var j = 0; j < evts.length; j++) all.push({ ...evts[j], _date: dates[i] });
    }
    cachedHomeEvents = all;
    if (homeCardIndex >= all.length) homeCardIndex = 0;
    var event = all[homeCardIndex];
    var count = all.length;
    var dateStr = event._date ? new Date(event._date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";

    c.innerHTML =
      '<div class="event-card" style="padding:24px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<div style="font-size:12px;font-weight:700;background:var(--surface);border:var(--border);padding:4px 12px;">' + (homeCardIndex + 1) + '/' + count + '</div>' +
      '<div style="font-size:13px;font-weight:700;color:var(--muted);">📅 ' + dateStr + '</div>' +
      '</div>' +
      '<h3 style="font-size:22px;font-weight:700;margin-bottom:12px;">' + escapeHtml(event.title) + '</h3>' +
      '<div class="event-meta" style="margin-bottom:20px;">' +
      '<span class="event-tag">⏰ ' + escapeHtml(event.time) + '</span>' +
      '<span class="event-tag">📍 ' + escapeHtml(event.location) + '</span>' +
      '<span class="event-tag" style="background:var(--primary);">👥 ' + (event.rsvpCount || 0) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:10px;">' +
      '<button class="btn btn-view-details" data-id="' + event.id + '" style="flex:1;margin-top:0;font-size:14px;padding:12px;">View Details →</button>' +
      '<button class="btn btn-pink btn-inline btn-rsvp-card" data-id="' + event.id + '" style="flex:1;margin-top:0;font-size:14px;padding:12px;">🎟️ RSVP</button>' +
      '</div>' +
      (count > 1 ? '<div style="display:flex;gap:6px;margin-top:10px;"><button class="btn btn-white btn-sm btn-home-prev" style="flex:1;padding:8px;font-size:13px;">← Prev</button><button class="btn btn-white btn-sm btn-home-next" style="flex:1;padding:8px;font-size:13px;">Next →</button></div>' : '') +
      '</div>';
  }
  document.getElementById("mod-btn")!.classList.toggle("hidden", !state.isMod);
  bindButtons();
}

function homePrev() { if (cachedHomeEvents.length > 1) { homeCardIndex = (homeCardIndex - 1 + cachedHomeEvents.length) % cachedHomeEvents.length; renderHomeCard({ eventsByDate: groupByDate(cachedHomeEvents), isMod: false, settings: {} }); } }
function homeNext() { if (cachedHomeEvents.length > 1) { homeCardIndex = (homeCardIndex + 1) % cachedHomeEvents.length; renderHomeCard({ eventsByDate: groupByDate(cachedHomeEvents), isMod: false, settings: {} }); } }
function groupByDate(events: any[]): Record<string, any[]> { var g: Record<string, any[]> = {}; for (var i = 0; i < events.length; i++) { var d = events[i]._date || ""; if (!g[d]) g[d] = []; g[d].push(events[i]); } return g; }

// ======= MY STUFF (compact) =======
var myStuffLoading = false;
function openMyStuff() { loadMySubmissions(); openOverlay("my-stuff-overlay"); }
async function loadMySubmissions() {
  myStuffLoading = true;
  var c = document.getElementById("my-submissions-container")!;
  c.innerHTML = '<div class="empty-state"><span class="emoji">⏳</span><h2>Loading...</h2></div>';
  try {
    var res = await fetch(API_BASE + "/api/my-submissions");
    var data = await res.json();
    if (data.type === "my-submissions") {
      var pitches = data.pitches || [], events = data.events || [], html = "";
      if (pitches.length === 0 && events.length === 0) html = '<div class="empty-state"><span class="emoji">📭</span><h2>Nothing yet</h2></div>';
      if (pitches.length > 0) {
        html += '<div class="date-header" style="background:#ffeaa7;color:#1c1c0f;">💡 Pitches (' + pitches.length + ')</div>';
        var max = Math.min(pitches.length, 2);
        for (var i = 0; i < max; i++) { html += '<div class="idea-card"><h3>💡 ' + escapeHtml(pitches[i].title) + '</h3><div style="color:var(--muted);font-size:13px;">' + escapeHtml(pitches[i].description).substring(0, 100) + '</div><button class="btn btn-white btn-sm btn-delete-pitch" data-id="' + pitches[i].id + '" style="margin-top:8px;">🗑️ Delete</button></div>'; }
        if (pitches.length > 2) html += '<div style="text-align:center;color:var(--muted);font-size:13px;padding:8px;">+ ' + (pitches.length - 2) + ' more</div>';
      }
      if (events.length > 0) {
        html += '<div class="date-header">📋 My Events (' + events.length + ')</div>';
        var m2 = Math.min(events.length, 2);
        for (var j = 0; j < m2; j++) { var sl = events[j].status === "published" ? "✅ Published" : "⏳ Pending"; html += '<div class="pending-card" style="background:' + (events[j].status === "published" ? "#00ff88" : "var(--secondary)") + ';"><h3>' + escapeHtml(events[j].title) + '</h3><div>📅 ' + escapeHtml(events[j].date) + ' at ' + escapeHtml(events[j].time) + '</div><div style="font-weight:700;margin-top:4px;">' + sl + '</div></div>'; }
        if (events.length > 2) html += '<div style="text-align:center;color:var(--muted);font-size:13px;padding:8px;">+ ' + (events.length - 2) + ' more</div>';
      }
      c.innerHTML = html; bindButtons();
    }
  } catch (e) { c.innerHTML = '<div class="empty-state"><span class="emoji">❌</span><h2>Could not load</h2></div>'; }
  myStuffLoading = false;
}

// ======= CREATE MENU =======
function toggleCreateMenu() { document.getElementById("create-menu")!.classList.toggle("active"); document.getElementById("create-backdrop")!.classList.toggle("active"); }
function closeCreateMenu() { document.getElementById("create-menu")!.classList.remove("active"); document.getElementById("create-backdrop")!.classList.remove("active"); }

// ======= EVENT DETAILS (unchanged) =======
async function showEventDetails(id: string) { currentEventId = id; try { var res = await fetch(API_BASE + "/api/event-details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) }); var data = await res.json(); if (data.type === "event-details") { openDetailsOverlay(data.data); return; } } catch (e) { console.error(e); } openDetailsOverlay({ event: { id: id, title: "Event", date: "", time: "", location: "", description: "", organizer: "", mapUrl: "" }, rsvpCount: 0, hasRsvped: false, settings: {} }); }
function openDetailsOverlay(d: { event: any; rsvpCount: number; hasRsvped: boolean; settings: any }) {
  var e = d.event; document.getElementById("details-overlay-title")!.textContent = e.title;
  var date = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  document.getElementById("detail-step-1")!.innerHTML = '<div class="detail-card"><div style="margin-bottom:16px;"><div class="detail-label">Date</div><div style="font-size:20px;font-weight:700;">📅 ' + date + '</div></div><div style="margin-bottom:16px;"><div class="detail-label">Time</div><div style="font-size:20px;font-weight:700;">⏰ ' + escapeHtml(e.time) + '</div></div><div style="margin-bottom:16px;"><div class="detail-label">Location</div><div style="font-size:20px;font-weight:700;">📍 ' + escapeHtml(e.location) + '</div></div><div style="background:var(--surface);border:var(--border);padding:12px;font-weight:700;font-size:15px;">👥 ' + d.rsvpCount + ' people going</div></div>';
  var descFull = e.description || "", descShort = descFull.substring(0, 100), hasMore = descFull.length > 100;
  var s2 = '<div class="detail-card" style="padding:14px;">';
  if (e.organizer) { var initial = e.organizer.replace("u/", "").charAt(0).toUpperCase(); s2 += '<div class="organizer-card" style="padding:10px;margin-bottom:10px;"><div class="organizer-avatar">' + initial + '</div><div><div style="font-weight:700;font-size:11px;text-transform:uppercase;color:var(--muted);">Organizer</div><div style="font-weight:700;font-size:15px;">' + escapeHtml(e.organizer) + '</div></div></div>'; }
  s2 += '<div class="detail-desc" style="padding:10px;font-size:14px;margin-top:0;"><span id="desc-short-' + e.id + '">' + escapeHtml(descShort) + (hasMore ? '...' : '') + '</span>';
  if (hasMore) { s2 += '<span id="desc-full-' + e.id + '" style="display:none;">' + escapeHtml(descFull) + '</span><button class="btn btn-white btn-sm btn-read-more" data-id="' + e.id + '" style="margin-top:6px;width:auto;display:inline-block;">Read more ↓</button>'; }
  s2 += '</div>';
  if (e.mapUrl) s2 += '<div class="map-link" style="padding:10px;margin-top:10px;"><span style="flex:1;font-size:13px;">🗺️ Google Maps</span><button class="copy-btn btn-copy-link" data-url="' + escapeHtml(e.mapUrl) + '" style="margin-left:6px;background:#fff;font-size:12px;">📋 Copy</button></div>';
  s2 += '<button class="btn btn-white btn-sm btn-view-attendees" data-id="' + e.id + '" style="margin-top:10px;width:100%;">👥 Who\'s Going? (' + d.rsvpCount + ')</button><div class="rsvp-attendees hidden" id="rsvps-public-' + e.id + '" style="background:#fff;border:var(--border);padding:10px;margin-top:6px;max-height:150px;overflow-y:auto;-webkit-overflow-scrolling:touch;"></div></div>';
  document.getElementById("detail-step-2")!.innerHTML = s2;
  document.getElementById("detail-step-3")!.innerHTML = d.hasRsvped && d.hasRsvped
    ? '<div class="detail-card" style="text-align:center;padding:40px 20px;"><div class="rsvp-success" style="margin-bottom:12px;">🎉 You\'re on the list!</div><button class="btn btn-white btn-leave-event" data-id="' + e.id + '" style="margin-top:8px;">❌ Leave Event</button></div>'
    : '<div class="detail-card" style="text-align:center;padding:40px 20px;"><div style="font-size:48px;margin-bottom:8px;">🎟️</div><div style="font-size:20px;font-weight:700;margin-bottom:4px;">Ready to join?</div><div style="font-size:14px;color:var(--muted);margin-bottom:16px;">' + d.rsvpCount + ' people are going</div></div>';
  detailStep = 1; ["detail-dot-1", "detail-dot-2", "detail-dot-3"].forEach(function (id, i) { document.getElementById(id)!.classList.toggle("done", i === 0); });
  ["detail-step-1", "detail-step-2", "detail-step-3"].forEach(function (id, i) { document.getElementById(id)!.classList.toggle("hidden", i !== 0); });
  document.getElementById("detail-next-btn")!.classList.remove("hidden"); document.getElementById("detail-prev-btn")!.classList.add("hidden");
  document.getElementById("detail-rsvp-btn")!.classList.add("hidden"); document.getElementById("detail-rsvped")!.classList.add("hidden");
  if (d.hasRsvped) document.getElementById("detail-rsvped")!.classList.remove("hidden");
  openOverlay("details-overlay"); bindButtons();
}
function detailNext() { if (detailStep === 1) { document.getElementById("detail-dot-2")!.classList.add("done"); document.getElementById("detail-step-1")!.classList.add("hidden"); document.getElementById("detail-step-2")!.classList.remove("hidden"); document.getElementById("detail-prev-btn")!.classList.remove("hidden"); detailStep = 2; } else if (detailStep === 2) { document.getElementById("detail-dot-3")!.classList.add("done"); document.getElementById("detail-step-2")!.classList.add("hidden"); document.getElementById("detail-step-3")!.classList.remove("hidden"); document.getElementById("detail-next-btn")!.classList.add("hidden"); document.getElementById("detail-prev-btn")!.classList.remove("hidden"); if (document.getElementById("detail-rsvped")!.classList.contains("hidden")) document.getElementById("detail-rsvp-btn")!.classList.remove("hidden"); detailStep = 3; } }
function detailPrev() { if (detailStep === 2) { document.getElementById("detail-dot-2")!.classList.remove("done"); document.getElementById("detail-step-2")!.classList.add("hidden"); document.getElementById("detail-step-1")!.classList.remove("hidden"); document.getElementById("detail-prev-btn")!.classList.add("hidden"); detailStep = 1; } else if (detailStep === 3) { document.getElementById("detail-dot-3")!.classList.remove("done"); document.getElementById("detail-step-3")!.classList.add("hidden"); document.getElementById("detail-step-2")!.classList.remove("hidden"); document.getElementById("detail-next-btn")!.classList.remove("hidden"); document.getElementById("detail-rsvp-btn")!.classList.add("hidden"); detailStep = 2; } }

// ======= MOD DASHBOARD =======
var modTab = "pending";
function showModDashboard() { openOverlay("mod-screen"); loadModTab("pending"); }
function switchModTab(tab: string) { if (tab === modTab) return; modTab = tab; document.querySelectorAll("#mod-tabs .mod-tab").forEach(function (t) { t.classList.toggle("active", (t as HTMLElement).dataset.mtab === tab); }); loadModTab(tab); }
function setModLoading(l: boolean) { var c = document.getElementById("pending-events-container"); if (c) c.style.opacity = l ? "0.4" : "1"; var t = document.getElementById("mod-tabs"); if (t) t.style.pointerEvents = l ? "none" : "auto"; }
async function loadModTab(tab: string) { setModLoading(true); if (tab === "pending") { try { var pr = await fetch(API_BASE + "/api/pending-events"); var pd = await pr.json(); renderModPending(pd.type === "pending-events" ? pd.events : []); } catch (e) { console.error(e); } } else if (tab === "published") { try { var res = await fetch(API_BASE + "/api/all-approved-events"); var d = await res.json(); renderModPublished(d.type === "all-approved-events" ? d.events : []); } catch (e) { console.error(e); } } else if (tab === "pitches") { try { var res = await fetch(API_BASE + "/api/pitched-ideas"); var d = await res.json(); renderModPitches(d.type === "pitched-ideas" ? d.ideas : []); } catch (e) { console.error(e); } } setModLoading(false); }
function renderModPending(events: any[]) { var c = document.getElementById("pending-events-container")!; if (events.length === 0) { c.innerHTML = '<div class="empty-state" style="margin-top:16px;"><span class="emoji">📋</span><h2>No pending events</h2></div>'; bindButtons(); return; } var h = ""; var max = Math.min(events.length, 3); for (var j = 0; j < max; j++) { var e = events[j]; h += '<div class="pending-card"><h3>' + escapeHtml(e.title) + '</h3><div class="detail-row">📅 ' + escapeHtml(e.date) + ' at ' + escapeHtml(e.time) + '</div><div class="detail-row">📍 ' + escapeHtml(e.location) + '</div><div class="desc">' + escapeHtml(e.description) + '</div><button class="btn btn-green btn-approve-event" data-id="' + e.id + '">✅ Approve & Publish</button><button class="btn btn-white btn-sm btn-decline-event" data-id="' + e.id + '" style="margin-top:8px;">🗑️ Decline</button><button class="btn btn-white btn-sm btn-view-rsvps" data-id="' + e.id + '" style="margin-top:8px;">👥 View RSVPs</button><div class="rsvp-attendees hidden" id="rsvps-' + e.id + '" style="background:#fff;border:var(--border);padding:12px;margin-top:8px;"></div></div>'; } if (events.length > 3) h += '<div style="text-align:center;color:var(--muted);font-size:13px;padding:8px;">+ ' + (events.length - 3) + ' more</div>'; c.innerHTML = h; bindButtons(); }
function renderModPublished(events: any[]) { var c = document.getElementById("pending-events-container")!; if (events.length === 0) { c.innerHTML = '<div class="empty-state" style="margin-top:16px;"><span class="emoji">✅</span><h2>No published events</h2></div>'; bindButtons(); return; } var h = ""; var max = Math.min(events.length, 3); for (var j = 0; j < max; j++) { var e = events[j]; h += '<div class="event-card"><h3>' + escapeHtml(e.title) + '</h3><div class="event-meta"><span class="event-tag">📅 ' + escapeHtml(e.date) + '</span><span class="event-tag">⏰ ' + escapeHtml(e.time) + '</span></div><div style="font-weight:700;margin-top:8px;">👥 ' + (e.rsvpCount || 0) + ' RSVPs</div><button class="btn btn-white btn-sm btn-view-rsvps" data-id="' + e.id + '" style="margin-top:8px;">👥 View Attendees</button><button class="btn btn-white btn-sm btn-delete-published" data-id="' + e.id + '" style="margin-top:6px;">🗑️ Delete</button><div class="rsvp-attendees hidden" id="rsvps-' + e.id + '" style="background:#fff;border:var(--border);padding:10px;margin-top:6px;"></div></div>'; } if (events.length > 3) h += '<div style="text-align:center;color:var(--muted);font-size:13px;padding:8px;">+ ' + (events.length - 3) + ' more</div>'; c.innerHTML = h; bindButtons(); }
function renderModPitches(ideas: any[]) { var c = document.getElementById("pending-events-container")!; if (ideas.length === 0) { c.innerHTML = '<div class="empty-state" style="margin-top:16px;"><span class="emoji">💡</span><h2>No pitched ideas</h2></div>'; bindButtons(); return; } var h = ""; var max = Math.min(ideas.length, 3); for (var i = 0; i < max; i++) { var idea = ideas[i]; h += '<div class="idea-card"><h3>💡 ' + escapeHtml(idea.title) + '</h3><div class="detail-row">👤 u/' + escapeHtml(idea.submittedBy) + '</div><div class="detail-row">📅 ' + escapeHtml(new Date(idea.submittedAt).toLocaleString()) + '</div><div class="desc">' + escapeHtml(idea.description) + '</div><button class="btn btn-white btn-sm btn-dismiss-idea" data-id="' + idea.id + '">🗑️ Dismiss</button></div>'; } if (ideas.length > 3) h += '<div style="text-align:center;color:var(--muted);font-size:13px;padding:8px;">+ ' + (ideas.length - 3) + ' more</div>'; c.innerHTML = h; bindButtons(); }

// ======= ACTIONS =======
var actionInProgress = false;
async function approveEvent(id: string) { if (actionInProgress) return; actionInProgress = true; var btn = document.querySelector('[data-id="' + id + '"].btn-approve-event') as HTMLElement; if (btn) { btn.style.opacity = "0.3"; btn.style.pointerEvents = "none"; btn.textContent = "⏳ Approving..."; } try { await fetch(API_BASE + "/api/approve-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) }); showToast("Event approved!", "success"); setTimeout(function () { loadModTab("pending"); }, 300); } catch (e) { showToast("Error", "error"); if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; btn.textContent = "✅ Approve & Publish"; } } setTimeout(function () { actionInProgress = false; }, 500); }
function deleteEvent(id: string, type: string) { if (actionInProgress) return; actionInProgress = true; var sel = type === "pending" ? ".btn-decline-event" : ".btn-delete-published"; var btn = document.querySelector('[data-id="' + id + '"]' + sel) as HTMLElement; if (btn) { btn.style.opacity = "0.3"; btn.style.pointerEvents = "none"; } var parent = btn ? btn.closest(".pending-card,.event-card") as HTMLElement : null; if (parent) parent.style.opacity = "0.3"; var endpoint = type === "pending" ? "/api/delete-pending" : "/api/delete-published"; fetch(API_BASE + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) }).then(function () { showToast("Deleted", "success"); setTimeout(function () { loadModTab(type === "pending" ? "pending" : "published"); }, 300); }).catch(function () { showToast("Error", "error"); if (parent) parent.style.opacity = "1"; if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; } }); setTimeout(function () { actionInProgress = false; }, 500); }
async function dismissIdea(id: string) { try { await fetch(API_BASE + "/api/dismiss-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ideaId: id }) }); showToast("Idea dismissed", "success"); loadModTab("pitches"); } catch (e) { showToast("Error", "error"); } }
function deletePitch(id: string) { if (actionInProgress) return; actionInProgress = true; fetch(API_BASE + "/api/dismiss-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ideaId: id }) }).then(function () { showToast("Deleted", "success"); loadMySubmissions(); }).catch(function () { showToast("Error", "error"); }); setTimeout(function () { actionInProgress = false; }, 500); }
async function viewRsvps(eventId: string) { var el = document.getElementById("rsvps-" + eventId)!; if (!el.classList.contains("hidden")) { el.classList.add("hidden"); return; } try { var res = await fetch(API_BASE + "/api/rsvp-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: eventId }) }); var data = await res.json(); if (data.type === "rsvp-list") { var att = data.attendees || []; if (att.length === 0) el.innerHTML = '<div style="font-size:13px;">No RSVPs</div>'; else { var list = '<div style="font-weight:700;font-size:11px;margin-bottom:8px;">' + att.length + ' Attendees</div>'; for (var i = 0; i < att.length; i++) { var a = att[i]; list += '<div style="font-size:13px;font-weight:600;padding:6px 0;border-bottom:1px solid var(--outline-v);">👤 u/' + escapeHtml(a.username); if (a.email) list += '<span style="font-weight:400;color:var(--muted);"> ✉️ ' + escapeHtml(a.email) + '</span>'; if (a.phone) list += '<span style="font-weight:400;color:var(--muted);"> 📱 ' + escapeHtml(a.phone) + '</span>'; list += '</div>'; } list += '<button class="copy-btn btn-copy-rsvp" data-rsvps="' + escapeHtml(JSON.stringify(att)) + '" style="margin-top:8px;background:var(--primary);padding:6px 14px;font-size:12px;">📋 Copy CSV</button>'; el.innerHTML = list; } el.classList.remove("hidden"); } } catch (e) { console.error(e); } bindButtons(); }

// ======= RSVP / LEAVE / PITCH / SUBMIT (unchanged) =======
async function submitRsvp() { if (!currentEventId) return; var email = (document.getElementById("rsvp-email") as HTMLInputElement).value; var phone = (document.getElementById("rsvp-phone") as HTMLInputElement).value; showToast("RSVP confirmed! 🎉", "success"); closeOverlay("rsvp-overlay"); closeOverlay("details-overlay"); showHomePage(); try { await fetch(API_BASE + "/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: currentEventId, email: email, phone: phone }) }); } catch (e) { showToast("RSVP failed - retry", "error"); } }
function showRsvpOverlay(id: string) { currentEventId = id; (document.getElementById("rsvp-email") as HTMLInputElement).value = ""; (document.getElementById("rsvp-phone") as HTMLInputElement).value = ""; openOverlay("rsvp-overlay"); }
async function leaveEvent(id: string) { try { var res = await fetch(API_BASE + "/api/leave-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) }); var data = await res.json(); if (data.type === "leave-event" && data.success) { showToast("You've left", "success"); closeOverlay("details-overlay"); showHomePage(); } else showToast("Failed", "error"); } catch (e) { showToast("Error", "error"); } }
async function submitPitch() { var title = (document.getElementById("pitch-title") as HTMLInputElement).value.trim(); var desc = (document.getElementById("pitch-description") as HTMLTextAreaElement).value.trim(); if (!title || !desc) { showToast("Fill all fields", "error"); return; } try { await fetch(API_BASE + "/api/pitch-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title, description: desc }) }); showToast("Idea sent! ✅", "success"); closeOverlay("pitch-overlay"); } catch (e) { showToast("Error", "error"); } }
function resetEventForm() { eventStep = 1; ["event-step-1", "event-step-2", "event-step-3", "event-step-4"].forEach(function (id, i) { document.getElementById(id)!.classList.toggle("hidden", i !== 0); }); document.getElementById("event-next-btn")!.classList.remove("hidden"); document.getElementById("event-submit-btn")!.classList.add("hidden"); document.getElementById("event-prev-btn")!.classList.add("hidden"); ["event-dot-1", "event-dot-2", "event-dot-3", "event-dot-4"].forEach(function (id, i) { document.getElementById(id)!.classList.toggle("done", i === 0); }); ["event-title", "event-organizer", "event-date", "event-time", "event-location", "event-map-url", "event-desc"].forEach(function (id) { (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value = ""; }); }
function eventPrev() { if (eventStep === 2) { document.getElementById("event-dot-2")!.classList.remove("done"); document.getElementById("event-step-2")!.classList.add("hidden"); document.getElementById("event-step-1")!.classList.remove("hidden"); document.getElementById("event-prev-btn")!.classList.add("hidden"); eventStep = 1; } else if (eventStep === 3) { document.getElementById("event-dot-3")!.classList.remove("done"); document.getElementById("event-step-3")!.classList.add("hidden"); document.getElementById("event-step-2")!.classList.remove("hidden"); eventStep = 2; } else if (eventStep === 4) { document.getElementById("event-dot-4")!.classList.remove("done"); document.getElementById("event-step-4")!.classList.add("hidden"); document.getElementById("event-step-3")!.classList.remove("hidden"); document.getElementById("event-next-btn")!.classList.remove("hidden"); document.getElementById("event-submit-btn")!.classList.add("hidden"); eventStep = 3; } }
function eventNext() { if (eventStep === 1) { var title = (document.getElementById("event-title") as HTMLInputElement).value.trim(); var org = (document.getElementById("event-organizer") as HTMLInputElement).value.trim(); if (!title || !org) { showToast("Fill all fields", "error"); return; } document.getElementById("event-dot-2")!.classList.add("done"); document.getElementById("event-step-1")!.classList.add("hidden"); document.getElementById("event-step-2")!.classList.remove("hidden"); document.getElementById("event-prev-btn")!.classList.remove("hidden"); eventStep = 2; } else if (eventStep === 2) { var date = (document.getElementById("event-date") as HTMLInputElement).value.trim(); var time = (document.getElementById("event-time") as HTMLInputElement).value.trim(); if (!date || !time) { showToast("Fill all fields", "error"); return; } document.getElementById("event-dot-3")!.classList.add("done"); document.getElementById("event-step-2")!.classList.add("hidden"); document.getElementById("event-step-3")!.classList.remove("hidden"); eventStep = 3; } else if (eventStep === 3) { var loc = (document.getElementById("event-location") as HTMLInputElement).value.trim(); if (!loc) { showToast("Location required", "error"); return; } document.getElementById("event-dot-4")!.classList.add("done"); document.getElementById("event-step-3")!.classList.add("hidden"); document.getElementById("event-step-4")!.classList.remove("hidden"); document.getElementById("event-next-btn")!.classList.add("hidden"); document.getElementById("event-submit-btn")!.classList.remove("hidden"); document.getElementById("event-review-title-preview")!.textContent = (document.getElementById("event-title") as HTMLInputElement).value; document.getElementById("event-review-meta-preview")!.textContent = (document.getElementById("event-date") as HTMLInputElement).value + " at " + (document.getElementById("event-time") as HTMLInputElement).value + " · " + loc; eventStep = 4; } }
async function submitEvent() { var title = (document.getElementById("event-title") as HTMLInputElement).value.trim(); var organizer = (document.getElementById("event-organizer") as HTMLInputElement).value.trim(); var date = (document.getElementById("event-date") as HTMLInputElement).value.trim(); var time = (document.getElementById("event-time") as HTMLInputElement).value.trim(); var loc = (document.getElementById("event-location") as HTMLInputElement).value.trim(); var mapUrl = (document.getElementById("event-map-url") as HTMLInputElement).value.trim(); var desc = (document.getElementById("event-desc") as HTMLTextAreaElement).value.trim(); if (!title || !organizer || !date || !time || !loc || !desc) { showToast("Fill all fields", "error"); return; } try { await fetch(API_BASE + "/api/submit-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title, organizer: organizer, date: date, time: time, location: loc, mapUrl: mapUrl, desc: desc }) }); showToast("Event submitted! ✅", "success"); closeOverlay("event-overlay"); } catch (e) { showToast("Error", "error"); } }
var usernameCached: string | null = null, prefillLoading = false;
async function prefillOrganizer() { if (currentUsername) { (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + currentUsername; return; } if (usernameCached) { (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + usernameCached; return; } if (prefillLoading) return; prefillLoading = true; try { var res = await fetch(API_BASE + "/api/init"); var data = await res.json(); if (data.type === "init" && data.username) { currentUsername = data.username; usernameCached = data.username; (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + data.username; } } catch (e) { console.error(e); } prefillLoading = false; }

// ======= OVERLAY HELPERS =======
function openOverlay(id: string) { document.getElementById(id)!.classList.add("active"); }
function closeOverlay(id: string) { document.getElementById(id)!.classList.remove("active"); resetEventForm(); }
function closeAllOverlays() { document.querySelectorAll(".overlay").forEach(function (el) { el.classList.remove("active"); }); resetEventForm(); closeCreateMenu(); }
function showHomePage() { closeAllOverlays(); loadHome(); }

// ======= BIND ALL =======
function bindButtons() {
  document.querySelectorAll(".btn-view-details").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) showEventDetails(id); }); });
  document.querySelectorAll(".btn-back-home").forEach(function (b) { b.addEventListener("click", showHomePage); });
  document.querySelectorAll(".btn-toggle-create").forEach(function (b) { b.addEventListener("click", toggleCreateMenu); });
  document.querySelectorAll("#create-backdrop").forEach(function (b) { b.addEventListener("click", closeCreateMenu); });
  document.querySelectorAll(".btn-open-my-stuff").forEach(function (b) { b.addEventListener("click", openMyStuff); });
  document.querySelectorAll(".btn-create-pitch").forEach(function (b) { b.addEventListener("click", function () { closeCreateMenu(); openOverlay("pitch-overlay"); }); });
  document.querySelectorAll(".btn-create-event").forEach(function (b) { b.addEventListener("click", function () { closeCreateMenu(); resetEventForm(); prefillOrganizer(); openOverlay("event-overlay"); }); });
  document.querySelectorAll(".btn-show-mod").forEach(function (b) { b.addEventListener("click", showModDashboard); });
  document.querySelectorAll(".btn-approve-event").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) approveEvent(id); }); });
  document.querySelectorAll(".btn-decline-event").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) deleteEvent(id, "pending"); }); });
  document.querySelectorAll(".btn-delete-published").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) deleteEvent(id, "published"); }); });
  document.querySelectorAll(".btn-dismiss-idea").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) dismissIdea(id); }); });
  document.querySelectorAll(".btn-delete-pitch").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) deletePitch(id); }); });
  document.querySelectorAll(".btn-rsvp-card").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) showRsvpOverlay(id); }); });
  document.querySelectorAll(".btn-rsvp-now").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) showRsvpOverlay(id); }); });
  document.querySelectorAll(".btn-submit-rsvp").forEach(function (b) { b.addEventListener("click", submitRsvp); });
  document.querySelectorAll(".btn-leave-event").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) leaveEvent(id); }); });
  document.querySelectorAll(".btn-view-rsvps").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) viewRsvps(id); }); });
  document.querySelectorAll(".btn-view-attendees").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (!id) return; var el = document.getElementById("rsvps-public-" + id); if (!el) return; if (!el.classList.contains("hidden")) { el.classList.add("hidden"); return; } fetch(API_BASE + "/api/rsvp-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) }).then(function (r) { return r.json(); }).then(function (data) { if (data.type === "rsvp-list") { var att = data.attendees || []; if (att.length === 0) el.innerHTML = '<div style="font-size:13px;">No one yet</div>'; else { var h = '<div style="font-weight:700;font-size:11px;margin-bottom:6px;">' + att.length + ' going</div>'; for (var i = 0; i < att.length; i++) h += '<div style="font-size:13px;font-weight:600;padding:4px 0;border-bottom:1px solid var(--outline-v);">👤 u/' + escapeHtml(att[i].username) + '</div>'; el.innerHTML = h; } el.classList.remove("hidden"); } }); }); });
  // Home page card navigation
  document.querySelectorAll(".btn-home-prev").forEach(function (b) { b.addEventListener("click", homePrev); });
  document.querySelectorAll(".btn-home-next").forEach(function (b) { b.addEventListener("click", homeNext); });
  // Mod tabs
  document.querySelectorAll(".mod-tab").forEach(function (b) { b.addEventListener("click", function () { var mt = (b as HTMLElement).dataset.mtab; if (mt) switchModTab(mt); }); });
  // Detail nav
  document.querySelectorAll("#detail-next-btn").forEach(function (b) { b.addEventListener("click", detailNext); });
  document.querySelectorAll("#detail-prev-btn").forEach(function (b) { b.addEventListener("click", detailPrev); });
  document.querySelectorAll("#detail-rsvp-btn").forEach(function (b) { b.addEventListener("click", function () { if (currentEventId) showRsvpOverlay(currentEventId); }); });
  document.querySelectorAll("#pitch-submit-btn").forEach(function (b) { b.addEventListener("click", submitPitch); });
  document.querySelectorAll("#event-next-btn").forEach(function (b) { b.addEventListener("click", eventNext); });
  document.querySelectorAll("#event-prev-btn").forEach(function (b) { b.addEventListener("click", eventPrev); });
  document.querySelectorAll("#event-submit-btn").forEach(function (b) { b.addEventListener("click", submitEvent); });
  document.querySelectorAll(".close-overlay").forEach(function (b) { b.addEventListener("click", closeAllOverlays); });
  document.querySelectorAll(".btn-copy-link").forEach(function (b) { b.addEventListener("click", function () { var url = (b as HTMLElement).getAttribute("data-url") || ""; if (navigator.clipboard) navigator.clipboard.writeText(url); else { var ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } showCopyToast(); }); });
  document.querySelectorAll(".btn-copy-rsvp").forEach(function (b) { b.addEventListener("click", function () { var raw = (b as HTMLElement).getAttribute("data-rsvps") || "[]", arr = JSON.parse(raw), csv = "username,email,phone,timestamp\n"; for (var i = 0; i < arr.length; i++) csv += arr[i].username + "," + (arr[i].email || "") + "," + (arr[i].phone || "") + "," + (arr[i].timestamp || "") + "\n"; try { navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(csv).then(function () { showToast("Copied!", "success"); }).catch(fc) : fc(); } catch (e) { fc(); } function fc() { var ta = document.createElement("textarea"); ta.value = csv; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); showToast("Copied!", "success"); } }); });
  document.querySelectorAll(".btn-read-more").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (!id) return; var s = document.getElementById("desc-short-" + id), f = document.getElementById("desc-full-" + id); if (!s || !f) return; var x = f.style.display !== "none"; f.style.display = x ? "none" : "block"; s.style.display = x ? "inline" : "none"; b.textContent = x ? "Read more ↓" : "Read less ↑"; }); });
}

document.addEventListener("DOMContentLoaded", function () { bindButtons(); loadHome(); });
