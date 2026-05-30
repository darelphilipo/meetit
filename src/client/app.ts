var API_BASE = "";
var currentEventId: string | null = null;
var currentUsername: string | null = null;
var eventStep = 1;
var detailStep = 1;
var detailStep1 = "", detailStep2 = "", detailStep3 = "", detailStep4 = "";
var homeCardIndex = 0;
var cachedHomeEvents: any[] = [];
var cachedHomeIsMod = false;
var homeLoadSeq = 0;
var detailLoading = false;
var descPageMap: Record<string, number> = {};
var descPageTotal: Record<string, number> = {};
var attPageMap: Record<string, number> = {};
var attStore: Record<string, any[]> = {};
var descFullStore: Record<string, string> = {};
var modCardIndex: Record<string, number> = {};
var modItems: Record<string, any[]> = {};
var modDescPage: Record<string, number> = {};
var modDescTotal: Record<string, number> = {};
var modDescFull: Record<string, string> = {};
var myPitchIdx = 0, myEventIdx = 0;
var myPitches: any[] = [], myEvents: any[] = [];

function log(msg: string) {
  console.log("[MEETIT] " + msg);
  var panel = document.getElementById("debug-panel");
  if (!panel) return;
  var entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = new Date().toISOString().substring(11, 23) + " " + msg;
  panel.prepend(entry);
  if (panel.children.length > 50) panel.removeChild(panel.lastChild!);
}

function showToast(msg: string, type: "success" | "error") {
  var t = document.createElement("div");
  t.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:" + (type === "success" ? "#00ff88" : "#ff4444") + ";color:#1c1c0f;padding:14px 24px;font-weight:700;z-index:2000;font-family:'Space Grotesk',sans-serif;border:4px solid #1c1c0f;box-shadow:6px 6px 0 #1c1c0f;";
  t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3000);
}
function showCopyToast() { var t = document.createElement("div"); t.className = "toast-copied"; t.textContent = "📍 Copied!"; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1500); }
function escapeHtml(s: string | undefined | null) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

// ======= HOME - Single card navigation =======
async function loadHome() {
  var loadSeq = ++homeLoadSeq;
  var bar = document.getElementById("loading-bar"), msg = document.getElementById("loading-msg");
  if (bar) bar.style.width = "30%"; if (msg) msg.textContent = "Fetching events...";
  try {
    var res = await fetch(API_BASE + "/api/home");
    if (loadSeq !== homeLoadSeq) return;
    if (bar) bar.style.width = "70%"; if (msg) msg.textContent = "Almost there...";
    var data = await res.json();
    if (loadSeq !== homeLoadSeq) return;
    if (bar) bar.style.width = "100%"; if (msg) msg.textContent = "Ready!";
    if (data.type === "home") {
      var allEvents = flattenHomeEvents(data.data.eventsByDate);
      var currentEvent = cachedHomeEvents[homeCardIndex];
      var currentId = currentEvent && currentEvent.id;
      cachedHomeEvents = allEvents;
      cachedHomeIsMod = data.data.isMod;
      if (currentId) {
        var updatedIndex = allEvents.findIndex(function (event) { return event.id === currentId; });
        if (updatedIndex >= 0) homeCardIndex = updatedIndex;
        else if (homeCardIndex >= allEvents.length) homeCardIndex = Math.max(0, allEvents.length - 1);
      } else if (homeCardIndex >= allEvents.length) {
        homeCardIndex = Math.max(0, allEvents.length - 1);
      }
      setTimeout(function () {
        if (loadSeq === homeLoadSeq) renderHomeCard(data.data);
      }, 200);
    }
  } catch (e) { console.error(e); if (msg) msg.textContent = "Could not load."; }
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

function renderHomeCard(state: { eventsByDate: Record<string, any[]>; isMod: boolean; settings: any }) {
  var dates = Object.keys(state.eventsByDate).sort();
  var c = document.getElementById("events-container")!;
  
  if (dates.length === 0) {
    c.innerHTML = '<div class="empty-state"><span class="emoji">🐱</span><h2>Wow, so empty!</h2><p>Tap ➕ to pitch an idea</p></div>';
  } else {
    // Flatten all events
    var all = flattenHomeEvents(state.eventsByDate);
    cachedHomeEvents = all;
    cachedHomeIsMod = state.isMod;
    if (homeCardIndex >= all.length) homeCardIndex = 0;
    var event = all[homeCardIndex];
    if (!event) return;
    var count = all.length;
    var dateStr = event._date ? new Date(event._date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";

    c.innerHTML =
      '<div class="event-card" style="padding:20px;height:calc(100vh - 180px);display:flex;flex-direction:column;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-shrink:0;">' +
      '<span style="font-size:11px;font-weight:700;background:var(--surface);border:var(--border);padding:3px 10px;">' + (homeCardIndex + 1) + '/' + count + '</span>' +
      '<span style="font-size:12px;font-weight:700;color:var(--muted);">📅 ' + dateStr + '</span>' +
      '</div>' +
      '<div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;min-height:0;">' +
      '<h3 style="font-size:18px;font-weight:700;margin-bottom:8px;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;max-height:47px;">' + escapeHtml(event.title) + '</h3>' +
      '<div class="event-meta" style="margin-bottom:8px;">' +
      '<span class="event-tag" style="font-size:12px;padding:2px 8px;">⏰ ' + escapeHtml(event.time) + '</span>' +
      '<span class="event-tag" style="font-size:12px;padding:2px 8px;background:var(--primary);">👥 ' + (event.rsvpCount || 0) + '</span>' +
      '</div>' +
      '<div style="font-size:14px;color:var(--muted);line-height:1.5;padding-bottom:4px;">' + escapeHtml((event.description || "").substring(0, 120)) + ((event.description || "").length > 120 ? "..." : "") + '</div>' +
      '</div>' +
      '<div style="flex-shrink:0;padding-top:10px;border-top:2px solid var(--outline-v);">' +
      '<div style="display:flex;gap:8px;align-items:center;">' +
      '<button class="btn btn-white btn-sm btn-view-details" data-id="' + event.id + '" style="flex:1;margin-top:0;padding:10px 12px;font-size:13px;">View Details →</button>' +
      '<button class="btn btn-pink btn-sm btn-rsvp-card" data-id="' + event.id + '" style="flex:1;margin-top:0;padding:10px 12px;font-size:13px;">🎟️ RSVP</button>' +
      '</div>' +
      (count > 1 ? '<div style="display:flex;gap:4px;margin-top:6px;"><button class="btn btn-white btn-sm btn-home-prev" style="flex:1;padding:6px;font-size:12px;">← Prev</button><button class="btn btn-white btn-sm btn-home-next" style="flex:1;padding:6px;font-size:12px;">Next →</button></div>' : '') +
      '</div>' +
      '</div>';
  }
  document.getElementById("mod-btn")!.classList.toggle("hidden", !state.isMod);
  bindButtons();
}

function homePrev() { log("homePrev idx=" + homeCardIndex + " total=" + cachedHomeEvents.length); if (cachedHomeEvents.length > 1) { homeCardIndex = (homeCardIndex - 1 + cachedHomeEvents.length) % cachedHomeEvents.length; renderHomeCard({ eventsByDate: groupByDate(cachedHomeEvents), isMod: cachedHomeIsMod, settings: {} }); } }
function homeNext() { log("homeNext idx=" + homeCardIndex + " total=" + cachedHomeEvents.length); if (cachedHomeEvents.length > 1) { homeCardIndex = (homeCardIndex + 1) % cachedHomeEvents.length; renderHomeCard({ eventsByDate: groupByDate(cachedHomeEvents), isMod: cachedHomeIsMod, settings: {} }); } }
function groupByDate(events: any[]): Record<string, any[]> { var g: Record<string, any[]> = {}; for (var i = 0; i < events.length; i++) { var event = events[i]; if (!event) continue; var d = event._date || ""; if (!g[d]) g[d] = []; g[d]!.push(event); } return g; }

// ======= MY STUFF (horizontal cards) =======
var myStuffLoading = false;
function openMyStuff() { log("openMyStuff"); loadMySubmissions(); openOverlay("my-stuff-overlay"); }
async function loadMySubmissions() {
  log("loadMySubmissions");
  document.getElementById("my-pitches-section")!.innerHTML = '<div class="empty-state"><span class="emoji">⏳</span><h2>Loading...</h2></div>';
  document.getElementById("my-events-section")!.innerHTML = '';
  try {
    var res = await fetch(API_BASE + "/api/my-submissions");
    var data = await res.json();
    if (data.type === "my-submissions") {
      myPitches = data.pitches || [];
      myEvents = data.events || [];
      myPitchIdx = 0; myEventIdx = 0;
      renderMyPitchCard();
      renderMyEventCard();
    }
  } catch (e) {
    document.getElementById("my-pitches-section")!.innerHTML = '<div class="empty-state"><span class="emoji">❌</span><h2>Could not load</h2></div>';
    document.getElementById("my-events-section")!.innerHTML = '';
  }
  myStuffLoading = false;
}
function renderMyPitchCard() {
  var el = document.getElementById("my-pitches-section")!;
  if (myPitches.length === 0) { el.innerHTML = '<div style="text-align:center;padding:8px;color:var(--muted);font-size:13px;">💡 No pitches</div>'; return; }
  if (myPitchIdx >= myPitches.length) myPitchIdx = 0;
  var p = myPitches[myPitchIdx];
  var total = myPitches.length;
  el.innerHTML = '<div class="idea-card" style="height:100%;display:flex;flex-direction:column;padding:10px;overflow:hidden;box-sizing:border-box;">' +
    '<div style="font-weight:700;font-size:11px;text-transform:uppercase;color:var(--muted);flex-shrink:0;">💡 Pitches</div>' +
    '<h3 style="font-size:16px;font-weight:700;margin:4px 0;flex-shrink:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + escapeHtml(p.title) + '</h3>' +
    '<div style="flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;font-size:13px;color:var(--muted);line-height:1.4;">' + escapeHtml(p.description) + '</div>' +
    '<div style="flex-shrink:0;display:flex;gap:6px;justify-content:center;align-items:center;padding-top:6px;">' +
      '<button class="btn btn-white btn-sm btn-delete-pitch" data-id="' + p.id + '" style="padding:6px 14px;font-size:12px;">🗑️ Delete</button>' +
      (total > 1 ? '<button class="btn btn-white btn-sm btn-my-pitch-prev" style="padding:4px 10px;font-size:11px;">←</button><span style="font-size:11px;font-weight:700;">' + (myPitchIdx + 1) + '/' + total + '</span><button class="btn btn-white btn-sm btn-my-pitch-next" style="padding:4px 10px;font-size:11px;">→</button>' : '') +
    '</div></div>';
  bindButtons();
}
function renderMyEventCard() {
  var el = document.getElementById("my-events-section")!;
  if (myEvents.length === 0) { el.innerHTML = '<div style="text-align:center;padding:8px;color:var(--muted);font-size:13px;">📋 No events</div>'; return; }
  if (myEventIdx >= myEvents.length) myEventIdx = 0;
  var e = myEvents[myEventIdx];
  var total = myEvents.length;
  var status = e.status === "published" ? "✅ Published" : "⏳ Pending";
  var bg = e.status === "published" ? "#00ff88" : "var(--secondary)";
  el.innerHTML = '<div class="pending-card" style="height:100%;display:flex;flex-direction:column;padding:10px;overflow:hidden;box-sizing:border-box;background:' + bg + ';">' +
    '<div style="font-weight:700;font-size:11px;text-transform:uppercase;color:var(--muted);flex-shrink:0;">📋 My Events</div>' +
    '<h3 style="font-size:16px;font-weight:700;margin:4px 0;flex-shrink:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + escapeHtml(e.title) + '</h3>' +
    '<div style="flex-shrink:0;font-size:12px;color:var(--muted);font-weight:600;">📅 ' + escapeHtml(e.date) + ' at ' + escapeHtml(e.time) + '</div>' +
    '<div style="flex-shrink:0;font-size:12px;font-weight:600;">' + status + '</div>' +
    '<div style="flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;font-size:13px;color:var(--muted);line-height:1.4;">' + escapeHtml(e.description || "") + '</div>' +
    '<div style="flex-shrink:0;display:flex;justify-content:center;align-items:center;gap:6px;padding-top:6px;">' +
      (total > 1 ? '<button class="btn btn-white btn-sm btn-my-event-prev" style="padding:4px 10px;font-size:11px;">←</button><span style="font-size:11px;font-weight:700;">' + (myEventIdx + 1) + '/' + total + '</span><button class="btn btn-white btn-sm btn-my-event-next" style="padding:4px 10px;font-size:11px;">→</button>' : '') +
    '</div></div>';
  bindButtons();
}
function myPitchNext() { myPitchIdx++; if (myPitchIdx >= myPitches.length) myPitchIdx = 0; renderMyPitchCard(); }
function myPitchPrev() { myPitchIdx--; if (myPitchIdx < 0) myPitchIdx = myPitches.length - 1; renderMyPitchCard(); }
function myEventNext() { myEventIdx++; if (myEventIdx >= myEvents.length) myEventIdx = 0; renderMyEventCard(); }
function myEventPrev() { myEventIdx--; if (myEventIdx < 0) myEventIdx = myEvents.length - 1; renderMyEventCard(); }

// ======= CREATE MENU =======
function toggleCreateMenu() { document.getElementById("create-menu")!.classList.toggle("active"); document.getElementById("create-backdrop")!.classList.toggle("active"); }
function closeCreateMenu() { document.getElementById("create-menu")!.classList.remove("active"); document.getElementById("create-backdrop")!.classList.remove("active"); }

// ======= EVENT DETAILS (unchanged) =======
async function loadPublicAttendees(eventId: string) {
  var el = document.getElementById("rsvps-public-" + eventId);
  if (!el) return;
  try {
    var res = await fetch(API_BASE + "/api/rsvp-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: eventId }) });
    var data = await res.json();
    if (data.type === "rsvp-list") {
      var att = data.attendees || [];
      attStore[eventId] = att;
      if (att.length === 0) { el.innerHTML = '<div style="text-align:center;padding:20px;font-size:14px;color:var(--muted);">No one yet — be the first!</div>'; return; }
      var perPage = 5, totalPages = Math.ceil(att.length / perPage);
      attPageMap[eventId] = 0;
      var pages = '';
      for (var p = 0; p < totalPages; p++) {
        pages += '<div style="min-width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px;">';
        for (var i = p * perPage; i < Math.min(att.length, (p + 1) * perPage); i++) {
          pages += '<div style="font-size:14px;font-weight:600;padding:8px 6px;border-bottom:1px solid var(--outline-v);display:flex;align-items:center;gap:8px;"><div style="width:28px;height:28px;border:3px solid #1c1c0f;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">' + att[i].username.charAt(0).toUpperCase() + '</div>u/' + escapeHtml(att[i].username) + '</div>';
        }
        pages += '</div>';
      }
      el.innerHTML = '<div id="att-track-' + eventId + '" style="display:flex;width:' + (totalPages * 100) + '%;height:100%;transition:transform 0.25s;">' + pages + '</div>';
      document.getElementById("att-nav-" + eventId)!.innerHTML = buildAttNav(eventId);
      if (detailStep === 3) persistStep3(eventId);
      bindButtons();
    }
  } catch (e) { console.error(e); }
}

function buildAttNav(eventId: string): string {
  var total = Math.ceil((attStore[eventId] || []).length / 5);
  if (total <= 1) return '';
  var cur = attPageMap[eventId] || 0;
  return (cur > 0 ? '<button class="btn btn-white btn-sm btn-att-prev" data-id="' + eventId + '" style="padding:4px 12px;font-size:12px;">← Prev</button>' : '') +
    '<span style="font-size:12px;font-weight:700;padding:4px 8px;">' + (cur + 1) + '/' + total + '</span>' +
    (cur < total - 1 ? '<button class="btn btn-white btn-sm btn-att-next" data-id="' + eventId + '" style="padding:4px 12px;font-size:12px;">Next →</button>' : '');
}

function slideTrack(trackId: string, page: number, totalPages: number) {
  var track = document.getElementById(trackId);
  if (track) track.style.transform = "translateX(-" + (page * (100 / totalPages)) + "%)";
}

function splitTextToPages(text: string, width: number, maxHeight: number): string[] {
  var m = document.createElement("div");
  m.style.cssText = "position:absolute;left:-9999px;top:0;width:" + width + "px;font-size:15px;line-height:1.5;font-family:'Space Grotesk',sans-serif;padding:14px;word-break:break-word;white-space:pre-wrap;visibility:hidden;";
  document.body.appendChild(m);
  var words = text.split(" ");
  var pages: string[] = [];
  var current = "";
  for (var i = 0; i < words.length; i++) {
    var test = current ? current + " " + words[i] : words[i];
    m.textContent = test;
    if (m.scrollHeight > maxHeight && current) { pages.push(current); current = words[i]; }
    else { current = test; }
  }
  if (current) pages.push(current);
  document.body.removeChild(m);
  return pages.length ? pages : [text];
}

function buildDescPagesHTML(eventId: string, pages: string[]): string {
  var pct = (100 / pages.length);
  var html = '<div id="desc-track-' + eventId + '" style="display:flex;width:' + (pages.length * 100) + '%;height:100%;transition:transform 0.25s;">';
  for (var i = 0; i < pages.length; i++) {
    html += '<div style="min-width:' + pct + '%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px;font-size:15px;line-height:1.5;word-break:break-word;">' + escapeHtml(pages[i]) + '</div>';
  }
  html += '</div>';
  return html;
}

function buildDescNavHTML(eventId: string): string {
  var total = descPageTotal[eventId] || 1;
  if (total <= 1) return '';
  var cur = descPageMap[eventId] || 0;
  return (cur > 0 ? '<button class="btn btn-white btn-sm btn-desc-prev" data-id="' + eventId + '" style="padding:4px 12px;font-size:12px;">← Previous</button>' : '') +
    '<span style="font-size:12px;font-weight:700;">' + (cur + 1) + '/' + total + '</span>' +
    (cur < total - 1 ? '<button class="btn btn-white btn-sm btn-desc-next" data-id="' + eventId + '" style="padding:4px 12px;font-size:12px;">Next →</button>' : '');
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
  detailLoading = true;
  currentEventId = id;
  var cachedEvent = cachedHomeEvents.find(function (event) { return event.id === id; });
  if (cachedEvent) {
    log("showEventDetails using cached event " + id);
    openDetailsOverlay({ event: cachedEvent, rsvpCount: cachedEvent.rsvpCount || 0, hasRsvped: false, settings: {} });
  }
  try {
    var res = await fetch(API_BASE + "/api/event-details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });
    var data = await res.json();
    if (data.type === "event-details" && currentEventId === id) {
      log("showEventDetails server response " + id + " hasRsvped=" + data.data.hasRsvped);
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
  var s1 = '<div class="detail-card" style="height:100%;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:16px;">' +
    '<div style="text-align:center;"><div style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">📅 Date</div><div style="font-size:18px;font-weight:700;">' + date + '</div></div>' +
    '<div style="text-align:center;"><div style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">⏰ Time</div><div style="font-size:18px;font-weight:700;">' + escapeHtml(e.time) + '</div></div>' +
    '<div style="text-align:center;"><div style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">📍 Location</div><div style="font-size:16px;font-weight:700;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;max-height:42px;">' + escapeHtml(e.location) + '</div></div>' +
    '<div style="background:var(--surface);border:var(--border);padding:10px;text-align:center;font-weight:700;font-size:14px;margin-top:2px;">👥 ' + d.rsvpCount + ' people going</div>' +
    '</div>';

  // Card 2: Organizer + Description
  var descFull = e.description || "", descShort = descFull.substring(0, 100), hasMore = descFull.length > 100;
  descFullStore[e.id] = descFull;
  if (!isOpen) { descPageMap[e.id] = 0; descPageTotal[e.id] = hasMore ? 99 : 1; }
  var s2 = '<div class="detail-card" style="height:100%;display:flex;flex-direction:column;gap:6px;padding:8px 0;">';
  if (e.organizer) { var initial = e.organizer.replace("u/", "").charAt(0).toUpperCase(); s2 += '<div style="display:flex;align-items:center;gap:10px;padding:10px;margin:0 8px;background:var(--surface);border:var(--border);flex-shrink:0;"><div style="width:36px;height:36px;border:var(--border);background:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;">' + initial + '</div><div><div style="font-weight:700;font-size:10px;text-transform:uppercase;color:var(--muted);">Organizer</div><div style="font-weight:700;font-size:14px;">' + escapeHtml(e.organizer) + '</div></div></div>'; }
  s2 += '<div style="flex:1;min-height:0;overflow:hidden;margin:0 8px;background:#fff;border:var(--border);" id="desc-box-' + e.id + '">' +
    '<div id="desc-track-' + e.id + '" style="display:flex;width:100%;height:100%;transition:transform 0.25s;">' +
    '<div id="desc-page-initial-' + e.id + '" style="min-width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px;font-size:15px;line-height:1.5;word-break:break-word;">' +
      escapeHtml(descShort) + (hasMore ? '...' : '') +
    '</div></div></div>' +
    '<div id="desc-nav-' + e.id + '" style="flex-shrink:0;display:flex;justify-content:center;align-items:center;gap:8px;padding:4px 8px 0 8px;min-height:28px;">' +
      (hasMore ? '<button class="btn btn-white btn-sm btn-desc-next" data-id="' + e.id + '" style="padding:4px 14px;font-size:12px;">Read more →</button>' : '') +
    '</div>';
  if (e.mapUrl) { s2 += '<div style="display:flex;align-items:center;gap:8px;padding:8px;margin:0 8px;background:var(--surface);border:var(--border);flex-shrink:0;"><span style="flex:1;font-size:14px;font-weight:600;">🗺️ Google Maps</span><button class="copy-btn btn-copy-link" data-url="' + escapeHtml(e.mapUrl) + '" style="background:#fff;border:var(--border);padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:var(--shadow-sm);">📋 Copy</button></div>'; }
  s2 += '</div>';

  // Card 3: Who's Going
  if (!isOpen) attPageMap[e.id] = 0;
  var s3 = '<div class="detail-card" style="height:100%;display:flex;flex-direction:column;padding:4px 0;">' +
    '<div style="text-align:center;padding:12px 0 8px 0;font-weight:700;font-size:17px;flex-shrink:0;">👥 Who\'s Going?</div>' +
    '<div style="text-align:center;font-size:14px;color:var(--muted);padding-bottom:8px;flex-shrink:0;">' + d.rsvpCount + ' attendee' + (d.rsvpCount !== 1 ? 's' : '') + '</div>' +
    '<div style="flex:1;min-height:0;overflow:hidden;margin:0 8px;background:#fff;border:var(--border);"><div id="rsvps-public-' + e.id + '" style="height:100%;"></div></div>' +
    '<div id="att-nav-' + e.id + '" style="flex-shrink:0;display:flex;justify-content:center;align-items:center;gap:8px;padding:6px 8px 0 8px;min-height:32px;"></div>' +
    '</div>';

  // Card 4: RSVP / Leave
  var s4 = d.hasRsvped
    ? '<div class="detail-card" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:12px;padding:20px;text-align:center;padding-top:40px;">' +
      '<div style="font-size:56px;">🎉</div>' +
      '<div style="font-size:18px;font-weight:700;">You\'re on the list!</div>' +
      '<div style="font-size:14px;color:var(--muted);">See you there</div>' +
      '<button class="btn btn-white btn-leave-event" data-id="' + e.id + '" style="margin-top:12px;width:auto;padding:10px 20px;">❌ Leave Event</button>' +
      '</div>'
    : '<div class="detail-card" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;text-align:center;">' +
      '<div style="font-size:64px;">🎟️</div>' +
      '<div style="font-size:20px;font-weight:700;">Ready to join?</div>' +
      '<div style="font-size:14px;color:var(--muted);">' + d.rsvpCount + ' people are going</div>' +
      '<button class="btn btn-pink btn-rsvp-now" data-id="' + e.id + '" style="width:80%;">🎟️ RSVP Now</button>' +
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
  bindButtons();
}
function detailNext() {
  log("detailNext from=" + detailStep);
  if (detailStep === 1) {
    document.getElementById("detail-dot-2")!.classList.add("done");
    document.getElementById("detail-body")!.innerHTML = detailStep2;
    document.getElementById("detail-prev-btn")!.classList.remove("hidden");
    bindButtons(); detailStep = 2;
  } else if (detailStep === 2) {
    document.getElementById("detail-dot-3")!.classList.add("done");
    document.getElementById("detail-body")!.innerHTML = detailStep3;
    if (currentEventId) loadPublicAttendees(currentEventId);
    bindButtons(); detailStep = 3;
  } else if (detailStep === 3) {
    document.getElementById("detail-dot-4")!.classList.add("done");
    document.getElementById("detail-body")!.innerHTML = detailStep4;
    document.getElementById("detail-next-btn")!.classList.add("hidden");
    document.getElementById("detail-prev-btn")!.classList.remove("hidden");
    bindButtons(); detailStep = 4;
  }
}
function detailPrev() {
  log("detailPrev from=" + detailStep);
  if (detailStep === 2) {
    document.getElementById("detail-dot-2")!.classList.remove("done");
    document.getElementById("detail-body")!.innerHTML = detailStep1;
    document.getElementById("detail-prev-btn")!.classList.add("hidden");
    bindButtons(); detailStep = 1;
  } else if (detailStep === 3) {
    document.getElementById("detail-dot-3")!.classList.remove("done");
    document.getElementById("detail-body")!.innerHTML = detailStep2;
    document.getElementById("detail-next-btn")!.classList.remove("hidden");
    bindButtons(); detailStep = 2;
  } else if (detailStep === 4) {
    document.getElementById("detail-dot-4")!.classList.remove("done");
    document.getElementById("detail-body")!.innerHTML = detailStep3;
    document.getElementById("detail-next-btn")!.classList.remove("hidden");
    if (currentEventId) loadPublicAttendees(currentEventId);
    bindButtons(); detailStep = 3;
  }
}

function modNext(tab: string) { log("modNext tab=" + tab); var idx = (modCardIndex[tab] || 0) + 1; modCardIndex[tab] = idx; renderModCard(tab); }
function modPrev(tab: string) { log("modPrev tab=" + tab); var idx = (modCardIndex[tab] || 0) - 1; if (idx < 0) idx = 0; modCardIndex[tab] = idx; renderModCard(tab); }
var modTab = "pending";
function showModDashboard() { openOverlay("mod-screen"); loadModTab("pending"); }
function switchModTab(tab: string) { if (tab === modTab) return; modTab = tab; document.querySelectorAll("#mod-tabs .mod-tab").forEach(function (t) { t.classList.toggle("active", (t as HTMLElement).dataset.mtab === tab); }); loadModTab(tab); }
function setModLoading(l: boolean) { var c = document.getElementById("pending-events-container"); if (c) c.style.opacity = l ? "0.4" : "1"; var t = document.getElementById("mod-tabs"); if (t) t.style.pointerEvents = l ? "none" : "auto"; }
async function loadModTab(tab: string) { setModLoading(true); if (tab === "pending") { try { var pr = await fetch(API_BASE + "/api/pending-events"); var pd = await pr.json(); renderModPending(pd.type === "pending-events" ? pd.events : []); } catch (e) { console.error(e); } } else if (tab === "published") { try { var res = await fetch(API_BASE + "/api/all-approved-events"); var d = await res.json(); renderModPublished(d.type === "all-approved-events" ? d.events : []); } catch (e) { console.error(e); } } else if (tab === "pitches") { try { var res = await fetch(API_BASE + "/api/pitched-ideas"); var d = await res.json(); renderModPitches(d.type === "pitched-ideas" ? d.ideas : []); } catch (e) { console.error(e); } } setModLoading(false); }
function renderModCard(tab: string) {
  var items = modItems[tab] || [];
  var idx = modCardIndex[tab] || 0;
  if (items.length === 0) return;
  if (idx >= items.length) { modCardIndex[tab] = 0; idx = 0; }
  var item = items[idx];
  var total = items.length;
  var c = document.getElementById("pending-events-container")!;
  var cardClass = tab === "pitches" ? "idea-card" : (tab === "pending" ? "pending-card" : "event-card");
  var desc = item.description || "";
  var dcKey = tab + "-" + idx;

  modDescFull[dcKey] = desc;
  if (!modDescTotal[dcKey]) modDescTotal[dcKey] = desc.length > 100 ? 99 : 1;
  modDescPage[dcKey] = 0;

  var html = '<div class="' + cardClass + '" style="height:100%;display:flex;flex-direction:column;padding:10px;overflow:hidden;box-sizing:border-box;">';
  html += '<div style="flex-shrink:0;"><h3 style="font-size:17px;font-weight:700;margin:0 0 4px 0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + escapeHtml(item.title) + '</h3></div>';
  html += '<div style="flex-shrink:0;font-size:12px;color:var(--muted);font-weight:600;margin-bottom:8px;">';
  if (tab === "pitches") { html += '👤 u/' + escapeHtml(item.submittedBy) + ' · ' + escapeHtml(new Date(item.submittedAt).toLocaleString()); }
  else { html += '📅 ' + escapeHtml(item.date) + ' at ' + escapeHtml(item.time) + ' · 📍 ' + escapeHtml(item.location || ""); }
  html += '</div>';
  // Description with horizontal pages
  html += '<div id="mod-desc-box-' + dcKey + '" style="flex:1;min-height:0;overflow:hidden;background:#fff;border:var(--border);">' +
    '<div id="mod-desc-track-' + dcKey + '" style="display:flex;width:100%;height:100%;transition:transform 0.25s;">' +
    '<div style="min-width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px;font-size:14px;line-height:1.45;word-break:break-word;">' + escapeHtml(desc.substring(0, 100)) + (desc.length > 100 ? '...' : '') + '</div>' +
    '</div></div>' +
    '<div id="mod-desc-nav-' + dcKey + '" style="flex-shrink:0;min-height:0;display:flex;justify-content:center;align-items:center;gap:6px;"></div>';
  // Actions
  html += '<div style="flex-shrink:0;display:flex;flex-wrap:wrap;gap:6px;">';
  if (tab === "pending") {
    html += '<button class="btn btn-green btn-sm btn-approve-event" data-id="' + item.id + '" style="font-size:13px;padding:8px 16px;">✅ Approve</button>';
    html += '<button class="btn btn-white btn-sm btn-decline-event" data-id="' + item.id + '" style="font-size:13px;padding:8px 16px;">🗑️ Decline</button>';
  } else if (tab === "published") {
    html += '<button class="btn btn-white btn-sm btn-view-rsvps" data-id="' + item.id + '" style="font-size:13px;padding:8px 16px;">👥 Attendees (' + (item.rsvpCount || 0) + ')</button>';
    html += '<button class="btn btn-white btn-sm btn-delete-published" data-id="' + item.id + '" style="font-size:13px;padding:8px 16px;">🗑️ Delete</button>';
  } else {
    html += '<button class="btn btn-white btn-sm btn-dismiss-idea" data-id="' + item.id + '" style="font-size:13px;padding:8px 16px;">🗑️ Dismiss</button>';
  }
  if (tab === "pending") {
    html += '<button class="btn btn-white btn-sm btn-view-rsvps" data-id="' + item.id + '" style="font-size:13px;padding:8px 16px;">👥 RSVPs</button>';
  }
  html += '</div><div class="rsvp-attendees hidden" id="rsvps-' + item.id + '" style="flex-shrink:0;background:#fff;border:var(--border);padding:8px;margin-top:-2px;"></div>';
  // Card nav
  if (total > 1) {
    html += '<div style="flex-shrink:0;display:flex;gap:4px;justify-content:center;align-items:center;padding-top:6px;">' +
      '<button class="btn btn-white btn-sm btn-mod-prev" data-tab="' + tab + '" style="padding:4px 12px;font-size:12px;">← Prev</button>' +
      '<span style="font-size:12px;font-weight:700;">' + (idx + 1) + '/' + total + '</span>' +
      '<button class="btn btn-white btn-sm btn-mod-next" data-tab="' + tab + '" style="padding:4px 12px;font-size:12px;">Next →</button></div>';
  }
  html += '</div>';
  c.innerHTML = html;
  bindButtons();
  // Auto-paginate description after DOM settles
  var dcKey2 = dcKey;
  if (desc.length > 100) {
    setTimeout(function () {
      var box = document.getElementById("mod-desc-box-" + dcKey2);
      if (!box) return;
      var pages = splitTextToPages(modDescFull[dcKey2] || "", box.clientWidth, box.clientHeight);
      modDescTotal[dcKey2] = pages.length;
      modDescPage[dcKey2] = 0;
      document.getElementById("mod-desc-track-" + dcKey2)!.outerHTML = buildModDescPagesHTML(dcKey2, pages);
      document.getElementById("mod-desc-nav-" + dcKey2)!.innerHTML = buildModDescNavHTML(dcKey2);
      bindModDescNav(dcKey2);
    }, 100);
  }
}

function buildModDescPagesHTML(key: string, pages: string[]): string {
  var pct = 100 / pages.length;
  var html = '<div id="mod-desc-track-' + key + '" style="display:flex;width:' + (pages.length * 100) + '%;height:100%;transition:transform 0.25s;">';
  for (var i = 0; i < pages.length; i++) {
    html += '<div style="min-width:' + pct + '%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px;font-size:14px;line-height:1.45;word-break:break-word;">' + escapeHtml(pages[i]) + '</div>';
  }
  html += '</div>';
  return html;
}

function buildModDescNavHTML(key: string): string {
  var total = modDescTotal[key] || 1;
  if (total <= 1) return '';
  var cur = modDescPage[key] || 0;
  return (cur > 0 ? '<button class="btn btn-white btn-sm btn-mod-desc-prev" data-key="' + key + '" style="padding:2px 10px;font-size:11px;">← Previous</button>' : '') +
    '<span style="font-size:11px;font-weight:700;">' + (cur + 1) + '/' + total + '</span>' +
    (cur < total - 1 ? '<button class="btn btn-white btn-sm btn-mod-desc-next" data-key="' + key + '" style="padding:2px 10px;font-size:11px;">Next →</button>' : '');
}

function bindModDescNav(key: string) {
  document.querySelectorAll("#mod-desc-nav-" + key + " .btn-mod-desc-next").forEach(function (b) { b.addEventListener("click", function () { var cur = (modDescPage[key] || 0) + 1; if (cur >= (modDescTotal[key] || 1)) return; modDescPage[key] = cur; slideTrack("mod-desc-track-" + key, cur, modDescTotal[key] || 1); document.getElementById("mod-desc-nav-" + key)!.innerHTML = buildModDescNavHTML(key); bindModDescNav(key); }); });
  document.querySelectorAll("#mod-desc-nav-" + key + " .btn-mod-desc-prev").forEach(function (b) { b.addEventListener("click", function () { var cur = (modDescPage[key] || 0) - 1; if (cur < 0) return; modDescPage[key] = cur; slideTrack("mod-desc-track-" + key, cur, modDescTotal[key] || 1); document.getElementById("mod-desc-nav-" + key)!.innerHTML = buildModDescNavHTML(key); bindModDescNav(key); }); });
}

function renderModPending(events: any[]) {
  modItems["pending"] = events;
  modCardIndex["pending"] = 0;
  if (events.length === 0) {
    document.getElementById("pending-events-container")!.innerHTML = '<div class="empty-state"><span class="emoji">📋</span><h2>No pending events</h2></div>';
    bindButtons(); return;
  }
  renderModCard("pending");
}
function renderModPublished(events: any[]) {
  modItems["published"] = events;
  modCardIndex["published"] = 0;
  if (events.length === 0) {
    document.getElementById("pending-events-container")!.innerHTML = '<div class="empty-state"><span class="emoji">✅</span><h2>No published events</h2></div>';
    bindButtons(); return;
  }
  renderModCard("published");
}
function renderModPitches(ideas: any[]) {
  modItems["pitches"] = ideas;
  modCardIndex["pitches"] = 0;
  if (ideas.length === 0) {
    document.getElementById("pending-events-container")!.innerHTML = '<div class="empty-state"><span class="emoji">💡</span><h2>No pitched ideas</h2></div>';
    bindButtons(); return;
  }
  renderModCard("pitches");
}

// ======= ACTIONS =======
var actionInProgress = false;
async function approveEvent(id: string) { log("approveEvent id=" + id); if (actionInProgress) return; actionInProgress = true; var btn = document.querySelector('[data-id="' + id + '"].btn-approve-event') as HTMLElement; if (btn) { btn.style.opacity = "0.3"; btn.style.pointerEvents = "none"; btn.textContent = "⏳ Approving..."; } try { await fetch(API_BASE + "/api/approve-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) }); showToast("Event approved!", "success"); setTimeout(function () { loadModTab("pending"); }, 300); } catch (e) { showToast("Error", "error"); if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; btn.textContent = "✅ Approve & Publish"; } } setTimeout(function () { actionInProgress = false; }, 500); }
function deleteEvent(id: string, type: string) { log("deleteEvent id=" + id + " type=" + type); if (actionInProgress) return; actionInProgress = true; var sel = type === "pending" ? ".btn-decline-event" : ".btn-delete-published"; var btn = document.querySelector('[data-id="' + id + '"]' + sel) as HTMLElement; if (btn) { btn.style.opacity = "0.3"; btn.style.pointerEvents = "none"; } var parent = btn ? btn.closest(".pending-card,.event-card") as HTMLElement : null; if (parent) parent.style.opacity = "0.3"; var endpoint = type === "pending" ? "/api/delete-pending" : "/api/delete-published"; fetch(API_BASE + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) }).then(function () { showToast("Deleted", "success"); setTimeout(function () { loadModTab(type === "pending" ? "pending" : "published"); }, 300); }).catch(function () { showToast("Error", "error"); if (parent) parent.style.opacity = "1"; if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; } }); setTimeout(function () { actionInProgress = false; }, 500); }
async function dismissIdea(id: string) { log("dismissIdea id=" + id); try { await fetch(API_BASE + "/api/dismiss-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ideaId: id }) }); showToast("Idea dismissed", "success"); loadModTab("pitches"); } catch (e) { showToast("Error", "error"); } }
function deletePitch(id: string) { log("deletePitch id=" + id); if (actionInProgress) return; actionInProgress = true; fetch(API_BASE + "/api/dismiss-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ideaId: id }) }).then(function () { showToast("Deleted", "success"); loadMySubmissions(); }).catch(function () { showToast("Error", "error"); }); setTimeout(function () { actionInProgress = false; }, 500); }
async function viewRsvps(eventId: string) { log("viewRsvps id=" + eventId);
  var el = document.getElementById("rsvps-" + eventId)!;
  if (!el.classList.contains("hidden")) { el.classList.add("hidden"); return; }
  try {
    var res = await fetch(API_BASE + "/api/rsvp-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: eventId, includeContactDetails: true }) });
    var data = await res.json();
    if (data.type === "rsvp-list") {
      var att = data.attendees || [];
      if (att.length === 0) el.innerHTML = '<div style="font-size:13px;">No RSVPs</div>';
      else {
        var list = '<div style="font-weight:700;font-size:11px;margin-bottom:8px;">' + att.length + ' Attendees</div>';
        for (var i = 0; i < att.length; i++) { var a = att[i]; list += '<div style="font-size:13px;font-weight:600;padding:6px 0;border-bottom:1px solid var(--outline-v);">👤 u/' + escapeHtml(a.username); if (a.email) list += '<span style="font-weight:400;color:var(--muted);"> ✉️ ' + escapeHtml(a.email) + '</span>'; if (a.phone) list += '<span style="font-weight:400;color:var(--muted);"> 📱 ' + escapeHtml(a.phone) + '</span>'; list += '</div>'; }
        el.innerHTML = list;
      }
      el.classList.remove("hidden");
    }
  } catch (e) { console.error(e); }
}

// ======= RSVP / LEAVE / PITCH / SUBMIT =======
async function submitRsvp() {
  log("submitRsvp eventId=" + currentEventId);
  if (!currentEventId) return;
  var email = (document.getElementById("rsvp-email") as HTMLInputElement).value;
  var phone = (document.getElementById("rsvp-phone") as HTMLInputElement).value;
  try {
    await fetch(API_BASE + "/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: currentEventId, email: email, phone: phone }) });
    showToast("RSVP confirmed! 🎉", "success");
    closeOverlay("rsvp-overlay");
    closeOverlay("details-overlay");
    showHomePage();
  } catch (e) {
    showToast("RSVP failed - retry", "error");
  }
}
function showRsvpOverlay(id: string) { log("showRsvpOverlay id=" + id); currentEventId = id; (document.getElementById("rsvp-email") as HTMLInputElement).value = ""; (document.getElementById("rsvp-phone") as HTMLInputElement).value = ""; openOverlay("rsvp-overlay"); }
async function leaveEvent(id: string) { log("leaveEvent id=" + id); try { var res = await fetch(API_BASE + "/api/leave-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) }); var data = await res.json(); if (data.type === "leave-event" && data.success) { showToast("You've left", "success"); closeOverlay("details-overlay"); showHomePage(); } else showToast("Failed", "error"); } catch (e) { showToast("Error", "error"); } }
async function submitPitch() { log("submitPitch"); var title = (document.getElementById("pitch-title") as HTMLInputElement).value.trim(); var desc = (document.getElementById("pitch-description") as HTMLTextAreaElement).value.trim(); if (!title || !desc) { showToast("Fill all fields", "error"); return; } try { await fetch(API_BASE + "/api/pitch-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title, description: desc }) }); showToast("Idea sent! ✅", "success"); closeOverlay("pitch-overlay"); } catch (e) { showToast("Error", "error"); } }
function resetEventForm() { eventStep = 1; ["event-step-1", "event-step-2", "event-step-3", "event-step-4"].forEach(function (id, i) { document.getElementById(id)!.classList.toggle("hidden", i !== 0); }); document.getElementById("event-next-btn")!.classList.remove("hidden"); document.getElementById("event-submit-btn")!.classList.add("hidden"); document.getElementById("event-prev-btn")!.classList.add("hidden"); ["event-dot-1", "event-dot-2", "event-dot-3", "event-dot-4"].forEach(function (id, i) { document.getElementById(id)!.classList.toggle("done", i === 0); }); ["event-title", "event-organizer", "event-date", "event-time", "event-location", "event-map-url", "event-desc"].forEach(function (id) { (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value = ""; }); }
function eventPrev() { if (eventStep === 2) { document.getElementById("event-dot-2")!.classList.remove("done"); document.getElementById("event-step-2")!.classList.add("hidden"); document.getElementById("event-step-1")!.classList.remove("hidden"); document.getElementById("event-prev-btn")!.classList.add("hidden"); eventStep = 1; } else if (eventStep === 3) { document.getElementById("event-dot-3")!.classList.remove("done"); document.getElementById("event-step-3")!.classList.add("hidden"); document.getElementById("event-step-2")!.classList.remove("hidden"); eventStep = 2; } else if (eventStep === 4) { document.getElementById("event-dot-4")!.classList.remove("done"); document.getElementById("event-step-4")!.classList.add("hidden"); document.getElementById("event-step-3")!.classList.remove("hidden"); document.getElementById("event-next-btn")!.classList.remove("hidden"); document.getElementById("event-submit-btn")!.classList.add("hidden"); eventStep = 3; } }
function eventNext() { log("eventNext step=" + eventStep); if (eventStep === 1) { var title = (document.getElementById("event-title") as HTMLInputElement).value.trim(); var org = (document.getElementById("event-organizer") as HTMLInputElement).value.trim(); if (!title || !org) { showToast("Fill all fields", "error"); return; } document.getElementById("event-dot-2")!.classList.add("done"); document.getElementById("event-step-1")!.classList.add("hidden"); document.getElementById("event-step-2")!.classList.remove("hidden"); document.getElementById("event-prev-btn")!.classList.remove("hidden"); eventStep = 2; } else if (eventStep === 2) { var date = (document.getElementById("event-date") as HTMLInputElement).value.trim(); var time = (document.getElementById("event-time") as HTMLInputElement).value.trim(); if (!date || !time) { showToast("Fill all fields", "error"); return; } document.getElementById("event-dot-3")!.classList.add("done"); document.getElementById("event-step-2")!.classList.add("hidden"); document.getElementById("event-step-3")!.classList.remove("hidden"); eventStep = 3; } else if (eventStep === 3) { var loc = (document.getElementById("event-location") as HTMLInputElement).value.trim(); if (!loc) { showToast("Location required", "error"); return; } document.getElementById("event-dot-4")!.classList.add("done"); document.getElementById("event-step-3")!.classList.add("hidden"); document.getElementById("event-step-4")!.classList.remove("hidden"); document.getElementById("event-next-btn")!.classList.add("hidden"); document.getElementById("event-submit-btn")!.classList.remove("hidden"); document.getElementById("event-review-title-preview")!.textContent = (document.getElementById("event-title") as HTMLInputElement).value; document.getElementById("event-review-meta-preview")!.textContent = (document.getElementById("event-date") as HTMLInputElement).value + " at " + (document.getElementById("event-time") as HTMLInputElement).value + " · " + loc; eventStep = 4; } }
async function submitEvent() { log("submitEvent"); var title = (document.getElementById("event-title") as HTMLInputElement).value.trim(); var organizer = (document.getElementById("event-organizer") as HTMLInputElement).value.trim(); var date = (document.getElementById("event-date") as HTMLInputElement).value.trim(); var time = (document.getElementById("event-time") as HTMLInputElement).value.trim(); var loc = (document.getElementById("event-location") as HTMLInputElement).value.trim(); var mapUrl = (document.getElementById("event-map-url") as HTMLInputElement).value.trim(); var desc = (document.getElementById("event-desc") as HTMLTextAreaElement).value.trim(); if (!title || !organizer || !date || !time || !loc || !desc) { showToast("Fill all fields", "error"); return; } try { await fetch(API_BASE + "/api/submit-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title, organizer: organizer, date: date, time: time, location: loc, mapUrl: mapUrl, desc: desc }) }); showToast("Event submitted! ✅", "success"); closeOverlay("event-overlay"); } catch (e) { showToast("Error", "error"); } }
var usernameCached: string | null = null, prefillLoading = false;
async function prefillOrganizer() { if (currentUsername) { (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + currentUsername; return; } if (usernameCached) { (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + usernameCached; return; } if (prefillLoading) return; prefillLoading = true; try { var res = await fetch(API_BASE + "/api/init"); var data = await res.json(); if (data.type === "init" && data.username) { currentUsername = data.username; usernameCached = data.username; (document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + data.username; } } catch (e) { console.error(e); } prefillLoading = false; }

// ======= OVERLAY HELPERS =======
function openOverlay(id: string) { document.getElementById(id)!.classList.add("active"); }
function closeOverlay(id: string) { document.getElementById(id)!.classList.remove("active"); resetEventForm(); }
function closeAllOverlays() { document.querySelectorAll(".overlay").forEach(function (el) { el.classList.remove("active"); }); resetEventForm(); closeCreateMenu(); }
function showHomePage() { log("showHomePage"); closeAllOverlays(); loadHome(); }

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
  document.querySelectorAll(".btn-leave-event").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) leaveEvent(id); }); });
  document.querySelectorAll(".btn-view-rsvps").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) viewRsvps(id); }); });
  document.querySelectorAll(".btn-load-attendees").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) loadPublicAttendees(id); }); });
  document.querySelectorAll(".btn-desc-next").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (!id) return;
    log("desc-next id=" + id + " pageTotal=" + (descPageTotal[id] || 0) + " curPage=" + (descPageMap[id] || 0));
    if (descPageTotal[id] === 99) {
      log("desc-next PAGINATING id=" + id);
      var box = document.getElementById("desc-box-" + id);
      if (!box) return;
      var pages = splitTextToPages(descFullStore[id] || "", box.clientWidth, box.clientHeight);
      log("desc-next split into " + pages.length + " pages id=" + id);
      descPageTotal[id] = pages.length;
      descPageMap[id] = 0;
      document.getElementById("desc-track-" + id)!.outerHTML = buildDescPagesHTML(id, pages);
      document.getElementById("desc-nav-" + id)!.innerHTML = buildDescNavHTML(id);
      persistStep2(id);
      bindButtons();
    } else {
      var cur = (descPageMap[id] || 0) + 1;
      if (cur >= (descPageTotal[id] || 1)) { log("desc-next BLOCKED at last page id=" + id); return; }
      descPageMap[id] = cur;
      log("desc-next slide id=" + id + " page=" + cur + "/" + descPageTotal[id]);
      slideTrack("desc-track-" + id, cur, descPageTotal[id] || 1);
      document.getElementById("desc-nav-" + id)!.innerHTML = buildDescNavHTML(id);
      persistStep2(id);
      bindButtons();
    }
  }); });
  document.querySelectorAll(".btn-desc-prev").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (!id) return;
    var cur = (descPageMap[id] || 0) - 1;
    if (cur < 0) { log("desc-prev BLOCKED at first page id=" + id); return; }
    descPageMap[id] = cur;
    log("desc-prev slide id=" + id + " page=" + cur + "/" + descPageTotal[id]);
    slideTrack("desc-track-" + id, cur, descPageTotal[id] || 1);
    document.getElementById("desc-nav-" + id)!.innerHTML = buildDescNavHTML(id);
    persistStep2(id);
    bindButtons();
  }); });
  document.querySelectorAll(".btn-my-pitch-next").forEach(function (b) { b.addEventListener("click", myPitchNext); });
  document.querySelectorAll(".btn-my-pitch-prev").forEach(function (b) { b.addEventListener("click", myPitchPrev); });
  document.querySelectorAll(".btn-my-event-next").forEach(function (b) { b.addEventListener("click", myEventNext); });
  document.querySelectorAll(".btn-my-event-prev").forEach(function (b) { b.addEventListener("click", myEventPrev); });
  document.querySelectorAll(".btn-att-next").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (!id) return; var cur = (attPageMap[id] || 0) + 1; attPageMap[id] = cur; var total = Math.ceil((attStore[id] || []).length / 5); log("att-next id=" + id + " page=" + cur + "/" + total); slideTrack("att-track-" + id, cur, total); document.getElementById("att-nav-" + id)!.innerHTML = buildAttNav(id); persistStep3(id); bindButtons(); }); });
  document.querySelectorAll(".btn-att-prev").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (!id) return; var cur = (attPageMap[id] || 0) - 1; attPageMap[id] = cur; var total = Math.ceil((attStore[id] || []).length / 5); log("att-prev id=" + id + " page=" + cur + "/" + total); slideTrack("att-track-" + id, cur, total); document.getElementById("att-nav-" + id)!.innerHTML = buildAttNav(id); persistStep3(id); bindButtons(); }); });
  // Home page card navigation
  document.querySelectorAll(".btn-home-prev").forEach(function (b) { b.addEventListener("click", homePrev); });
  document.querySelectorAll(".btn-home-next").forEach(function (b) { b.addEventListener("click", homeNext); });
  // Mod tabs
  document.querySelectorAll(".mod-tab").forEach(function (b) { b.addEventListener("click", function () { var mt = (b as HTMLElement).dataset.mtab; if (mt) switchModTab(mt); }); });
  // Mod card nav
  document.querySelectorAll(".btn-mod-next").forEach(function (b) { b.addEventListener("click", function () { var tab = (b as HTMLElement).getAttribute("data-tab"); if (tab) modNext(tab); }); });
  document.querySelectorAll(".btn-mod-prev").forEach(function (b) { b.addEventListener("click", function () { var tab = (b as HTMLElement).getAttribute("data-tab"); if (tab) modPrev(tab); }); });
  // Mod desc (within-card) nav
  document.querySelectorAll(".btn-mod-desc-next").forEach(function (b) { b.addEventListener("click", function () { var key = (b as HTMLElement).getAttribute("data-key"); if (!key) return; var cur = (modDescPage[key] || 0) + 1; if (cur >= (modDescTotal[key] || 1)) return; modDescPage[key] = cur; slideTrack("mod-desc-track-" + key, cur, modDescTotal[key] || 1); document.getElementById("mod-desc-nav-" + key)!.innerHTML = buildModDescNavHTML(key); bindModDescNav(key); }); });
  document.querySelectorAll(".btn-mod-desc-prev").forEach(function (b) { b.addEventListener("click", function () { var key = (b as HTMLElement).getAttribute("data-key"); if (!key) return; var cur = (modDescPage[key] || 0) - 1; if (cur < 0) return; modDescPage[key] = cur; slideTrack("mod-desc-track-" + key, cur, modDescTotal[key] || 1); document.getElementById("mod-desc-nav-" + key)!.innerHTML = buildModDescNavHTML(key); bindModDescNav(key); }); });
  // Detail nav
  document.querySelectorAll("#detail-next-btn").forEach(function (b) { b.addEventListener("click", detailNext); });
  document.querySelectorAll("#detail-prev-btn").forEach(function (b) { b.addEventListener("click", detailPrev); });
  document.querySelectorAll("#pitch-submit-btn").forEach(function (b) { b.addEventListener("click", submitPitch); });
  document.querySelectorAll("#event-next-btn").forEach(function (b) { b.addEventListener("click", eventNext); });
  document.querySelectorAll("#event-prev-btn").forEach(function (b) { b.addEventListener("click", eventPrev); });
  document.querySelectorAll("#event-submit-btn").forEach(function (b) { b.addEventListener("click", submitEvent); });
  document.querySelectorAll(".close-overlay").forEach(function (b) { b.addEventListener("click", showHomePage); });
  document.querySelectorAll(".btn-copy-link").forEach(function (b) { b.addEventListener("click", function () { var url = (b as HTMLElement).getAttribute("data-url") || ""; if (navigator.clipboard) navigator.clipboard.writeText(url); else { var ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } showCopyToast(); }); });
}

document.addEventListener("DOMContentLoaded", function () {
  log("APP INIT - DOM ready");
  document.getElementById("debug-toggle")!.addEventListener("click", function () {
    var panel = document.getElementById("debug-panel")!;
    var show = panel.style.display !== "block";
    panel.style.display = show ? "block" : "none";
    log("debug panel " + (show ? "visible" : "hidden"));
  });
  document.querySelector(".btn-submit-rsvp")?.addEventListener("click", submitRsvp);
  bindButtons(); loadHome();
});
