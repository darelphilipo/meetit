var API_BASE = "";
var currentEventId: string | null = null;
var eventStep = 1;

function showToast(msg: string, type: "success" | "error") {
  var t = document.createElement("div");
  t.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:" + (type === "success" ? "#00ff88" : "#ff4444") + ";color:#1c1c0f;padding:14px 24px;font-weight:700;z-index:2000;font-family:'Space Grotesk',sans-serif;border:4px solid #1c1c0f;box-shadow:6px 6px 0 #1c1c0f;";
  t.textContent = msg; document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 3000);
}

function showCopyToast() {
  var t = document.createElement("div");
  t.className = "toast-copied"; t.textContent = "📍 Link copied!";
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 1500);
}

function escapeHtml(s: string | undefined | null) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

// ======= TABS =======
function switchTab(tab: string) {
  document.querySelectorAll(".tab").forEach(function (el) { el.classList.toggle("active", (el as HTMLElement).dataset.tab === tab); });
  document.getElementById("tab-events")!.classList.toggle("hidden", tab !== "events");
  document.getElementById("tab-create")!.classList.toggle("hidden", tab !== "create");
  document.getElementById("mod-screen")!.classList.add("hidden");
  if (tab === "events") loadHome();
}

// ======= HOME / EVENTS =======
async function loadHome() {
  try {
    var res = await fetch(API_BASE + "/api/home");
    var data = await res.json();
    if (data.type === "home") renderHome(data.data);
  } catch (e) { console.error(e); }
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
    c.innerHTML = '<div class="empty-state"><span class="emoji">🤝</span><h2>No meetups yet!</h2><p>Switch to ✨ Create tab to pitch an idea</p></div>';
  } else {
    for (var di = 0; di < dates.length; di++) {
      var dateKey = dates[di];
      c.innerHTML += formatDateBadge(dateKey);
      var events = state.eventsByDate[dateKey];
      for (var ei = 0; ei < events.length; ei++) {
        var e = events[ei];
        c.innerHTML +=
          '<div class="event-card">' +
          "<h3>" + escapeHtml(e.title) + "</h3>" +
          '<div class="event-meta">' +
          '<span class="event-tag">⏰ ' + escapeHtml(e.time) + '</span>' +
          '<span class="event-tag">📍 ' + escapeHtml(e.location) + '</span>' +
          '</div>' +
          '<button class="btn btn-view-details" data-id="' + e.id + '">View Details →</button>' +
          "</div>";
      }
    }
  }
  document.getElementById("mod-section")!.classList.toggle("hidden", !state.isMod);
  bindButtons();
}

// ======= EVENT DETAILS (3-step overlay) =======
var detailStep = 1;

async function showEventDetails(id: string) {
  currentEventId = id;
  try {
    var res = await fetch(API_BASE + "/api/event-details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });
    var data = await res.json();
    if (data.type === "event-details") { openDetailsOverlay(data.data); return; }
  } catch (e) { console.error(e); }
  // Fallback
  openDetailsOverlay({
    event: { id: id, title: "Bangalore Tech & Chai", date: "2026-05-15", time: "16:00", location: "Cubbon Park, Bangalore", description: "Join fellow redditors for an evening of tech talks, networking, and cutting chai.", organizer: "u/darelphilip", mapUrl: "https://maps.google.com/?q=Cubbon+Park+Bangalore" },
    rsvpCount: 0, hasRsvped: false, settings: {}
  });
}

function openDetailsOverlay(d: { event: any; rsvpCount: number; hasRsvped: boolean; settings: any }) {
  var e = d.event;
  document.getElementById("details-overlay-title")!.textContent = e.title;
  var date = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Step 1: Basic info
  document.getElementById("detail-step-1")!.innerHTML =
    '<div class="detail-card">' +
    '<div style="margin-bottom:16px;"><div class="detail-label">Date</div><div style="font-size:20px;font-weight:700;">📅 ' + date + '</div></div>' +
    '<div style="margin-bottom:16px;"><div class="detail-label">Time</div><div style="font-size:20px;font-weight:700;">⏰ ' + escapeHtml(e.time) + '</div></div>' +
    '<div style="margin-bottom:16px;"><div class="detail-label">Location</div><div style="font-size:20px;font-weight:700;">📍 ' + escapeHtml(e.location) + '</div></div>' +
    '<div style="background:var(--surface);border:var(--border);padding:12px;font-weight:700;font-size:15px;">👥 ' + d.rsvpCount + ' people going</div>' +
    "</div>";

  // Step 2: Organizer + Description + Maps (compact)
  var descText = (e.description || "").substring(0, 200);
  if ((e.description || "").length > 200) descText += "...";
  var s2 = '<div class="detail-card" style="padding:14px;">';
  if (e.organizer) {
    var initial = e.organizer.replace("u/", "").charAt(0).toUpperCase();
    s2 +=
      '<div class="organizer-card" style="padding:10px;margin-bottom:10px;">' +
      '<div class="organizer-avatar">' + initial + '</div>' +
      '<div><div style="font-weight:700;font-size:11px;text-transform:uppercase;color:var(--muted);">Organizer</div>' +
      '<div style="font-weight:700;font-size:15px;">' + escapeHtml(e.organizer) + '</div></div>' +
      "</div>";
  }
  s2 += '<div class="detail-desc" style="padding:10px;font-size:14px;margin-top:0;">' + escapeHtml(descText) + "</div>";
  if (e.mapUrl) {
    s2 +=
      '<div class="map-link" style="padding:10px;margin-top:10px;"><span style="flex:1;font-size:13px;">🗺️ Google Maps</span>' +
      '<button class="copy-btn btn-copy-link" data-url="' + escapeHtml(e.mapUrl) + '" style="margin-left:6px;background:#fff;font-size:12px;">📋 Copy</button></div>';
  }
  s2 += "</div>";
  document.getElementById("detail-step-2")!.innerHTML = s2;

  // Step 3: RSVP
  document.getElementById("detail-step-3")!.innerHTML = d.hasRsvped
    ? '<div class="detail-card"><div class="rsvp-success">🎉 You\'re on the list!</div></div>'
    : '<div class="detail-card"><div style="text-align:center;"><div style="font-size:48px;">🎟️</div><div style="font-size:20px;font-weight:700;margin:12px 0;">Ready to join?</div><div style="font-size:15px;color:var(--muted);margin-bottom:20px;">' + d.rsvpCount + ' people are going</div></div></div>';

  // Reset state
  detailStep = 1;
  document.getElementById("detail-dot-1")!.classList.add("done");
  document.getElementById("detail-dot-2")!.classList.remove("done");
  document.getElementById("detail-dot-3")!.classList.remove("done");
  document.getElementById("detail-step-1")!.classList.remove("hidden");
  document.getElementById("detail-step-2")!.classList.add("hidden");
  document.getElementById("detail-step-3")!.classList.add("hidden");
  document.getElementById("detail-next-btn")!.classList.remove("hidden");
  document.getElementById("detail-rsvp-btn")!.classList.add("hidden");
  document.getElementById("detail-rsvped")!.classList.add("hidden");

  if (d.hasRsvped) {
    document.getElementById("detail-rsvped")!.classList.remove("hidden");
  }

  openOverlay("details-overlay");
  bindButtons();
}

function detailNext() {
  if (detailStep === 1) {
    document.getElementById("detail-dot-2")!.classList.add("done");
    document.getElementById("detail-step-1")!.classList.add("hidden");
    document.getElementById("detail-step-2")!.classList.remove("hidden");
    document.getElementById("detail-prev-btn")!.classList.remove("hidden");
    detailStep = 2;
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
  }
}

function detailPrev() {
  if (detailStep === 2) {
    document.getElementById("detail-dot-2")!.classList.remove("done");
    document.getElementById("detail-step-2")!.classList.add("hidden");
    document.getElementById("detail-step-1")!.classList.remove("hidden");
    document.getElementById("detail-prev-btn")!.classList.add("hidden");
    detailStep = 1;
  } else if (detailStep === 3) {
    document.getElementById("detail-dot-3")!.classList.remove("done");
    document.getElementById("detail-step-3")!.classList.add("hidden");
    document.getElementById("detail-step-2")!.classList.remove("hidden");
    document.getElementById("detail-next-btn")!.classList.remove("hidden");
    document.getElementById("detail-rsvp-btn")!.classList.add("hidden");
    detailStep = 2;
  }
}

function showHome() {
  document.getElementById("tab-events")!.classList.remove("hidden");
  document.getElementById("tab-create")!.classList.add("hidden");
  document.getElementById("mod-screen")!.classList.add("hidden");
  closeAllOverlays();
  switchTab("events");
}

// ======= MOD DASHBOARD =======
function showModDashboard() {
  document.getElementById("tab-events")!.classList.add("hidden");
  document.getElementById("tab-create")!.classList.add("hidden");
  document.getElementById("details-screen")!.classList.add("hidden");
  document.getElementById("mod-screen")!.classList.remove("hidden");
  loadPending();
}

async function loadPending() {
  try {
    var [pr, ir] = await Promise.all([fetch(API_BASE + "/api/pending-events"), fetch(API_BASE + "/api/pitched-ideas")]);
    var pd = await pr.json(); var id = await ir.json();
    renderPendingAndIdeas(pd.type === "pending-events" ? pd.events : [], id.type === "pitched-ideas" ? id.ideas : []);
  } catch (e) { console.error(e); }
}

function renderPendingAndIdeas(events: any[], ideas: any[]) {
  var c = document.getElementById("pending-events-container")!;
  var h = "";
  if (events.length === 0 && ideas.length === 0) { c.innerHTML = '<div class="empty-state" style="margin-top:16px;"><span class="emoji">📋</span><h2>Nothing to review</h2></div>'; bindButtons(); return; }
  if (ideas.length > 0) {
    h += '<div class="date-header" style="background:#ffeaa7;color:#1c1c0f;">💡 Pitched Ideas</div>';
    for (var i = 0; i < ideas.length; i++) {
      var idea = ideas[i];
      h += '<div class="idea-card"><h3>💡 ' + escapeHtml(idea.title) + '</h3><div class="detail-row">👤 u/' + escapeHtml(idea.submittedBy) + '</div><div class="detail-row">📅 ' + escapeHtml(new Date(idea.submittedAt).toLocaleString()) + '</div><div class="desc">' + escapeHtml(idea.description) + '</div></div>';
    }
  }
  if (events.length > 0) {
    h += '<div class="date-header">📋 Pending Events</div>';
    for (var j = 0; j < events.length; j++) {
      var e = events[j];
      h += '<div class="pending-card"><h3>' + escapeHtml(e.title) + '</h3><div class="detail-row">📅 ' + escapeHtml(e.date) + ' at ' + escapeHtml(e.time) + '</div><div class="detail-row">📍 ' + escapeHtml(e.location) + '</div><div class="desc">' + escapeHtml(e.description) + '</div><button class="btn btn-green btn-approve-event" data-id="' + e.id + '">✅ Approve & Publish</button></div>';
    }
  }
  c.innerHTML = h; bindButtons();
}

async function approveEvent(id: string) {
  try {
    await fetch(API_BASE + "/api/approve-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }) });
    showToast("Event approved!", "success"); loadPending();
  } catch (e) { showToast("Error", "error"); }
}

// ======= PITCH (single step) =======
async function submitPitch() {
  var title = (document.getElementById("pitch-title") as HTMLInputElement).value.trim();
  var desc = (document.getElementById("pitch-description") as HTMLTextAreaElement).value.trim();
  if (!title || !desc) { showToast("Fill all fields", "error"); return; }
  try {
    await fetch(API_BASE + "/api/pitch-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title, description: desc }) });
    showToast("Idea sent to mods! ✅", "success");
    closeOverlay("pitch-overlay");
  } catch (e) { showToast("Error", "error"); }
}

// ======= SUBMIT EVENT (4 compact steps, 2 fields each) =======
function resetEventForm() {
  eventStep = 1;
  ["event-step-1","event-step-2","event-step-3","event-step-4"].forEach(function (id, i) { document.getElementById(id)!.classList.toggle("hidden", i !== 0); });
  document.getElementById("event-next-btn")!.classList.remove("hidden");
  document.getElementById("event-submit-btn")!.classList.add("hidden");
  ["event-dot-1","event-dot-2","event-dot-3","event-dot-4"].forEach(function (id, i) { document.getElementById(id)!.classList.toggle("done", i === 0); });
  ["event-title","event-organizer","event-date","event-time","event-location","event-map-url","event-desc"].forEach(function (id) { (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value = ""; });
  document.getElementById("event-prev-btn")!.classList.add("hidden");
}

function eventPrev() {
  if (eventStep === 2) {
    document.getElementById("event-dot-2")!.classList.remove("done");
    document.getElementById("event-step-2")!.classList.add("hidden");
    document.getElementById("event-step-1")!.classList.remove("hidden");
    document.getElementById("event-prev-btn")!.classList.add("hidden");
    eventStep = 1;
  } else if (eventStep === 3) {
    document.getElementById("event-dot-3")!.classList.remove("done");
    document.getElementById("event-step-3")!.classList.add("hidden");
    document.getElementById("event-step-2")!.classList.remove("hidden");
    eventStep = 2;
  } else if (eventStep === 4) {
    document.getElementById("event-dot-4")!.classList.remove("done");
    document.getElementById("event-step-4")!.classList.add("hidden");
    document.getElementById("event-step-3")!.classList.remove("hidden");
    document.getElementById("event-next-btn")!.classList.remove("hidden");
    document.getElementById("event-submit-btn")!.classList.add("hidden");
    eventStep = 3;
  }
}

function eventNext() {
  if (eventStep === 1) {
    var title = (document.getElementById("event-title") as HTMLInputElement).value.trim();
    var org = (document.getElementById("event-organizer") as HTMLInputElement).value.trim();
    if (!title || !org) { showToast("Fill all fields", "error"); return; }
    document.getElementById("event-dot-2")!.classList.add("done");
    document.getElementById("event-step-1")!.classList.add("hidden");
    document.getElementById("event-step-2")!.classList.remove("hidden");
    document.getElementById("event-prev-btn")!.classList.remove("hidden");
    eventStep = 2;
  } else if (eventStep === 2) {
    var date = (document.getElementById("event-date") as HTMLInputElement).value.trim();
    var time = (document.getElementById("event-time") as HTMLInputElement).value.trim();
    if (!date || !time) { showToast("Fill all fields", "error"); return; }
    document.getElementById("event-dot-3")!.classList.add("done");
    document.getElementById("event-step-2")!.classList.add("hidden");
    document.getElementById("event-step-3")!.classList.remove("hidden");
    eventStep = 3;
  } else if (eventStep === 3) {
    var loc = (document.getElementById("event-location") as HTMLInputElement).value.trim();
    if (!loc) { showToast("Location is required", "error"); return; }
    document.getElementById("event-dot-4")!.classList.add("done");
    document.getElementById("event-step-3")!.classList.add("hidden");
    document.getElementById("event-step-4")!.classList.remove("hidden");
    document.getElementById("event-next-btn")!.classList.add("hidden");
    document.getElementById("event-submit-btn")!.classList.remove("hidden");
    document.getElementById("event-review-title-preview")!.textContent = (document.getElementById("event-title") as HTMLInputElement).value;
    document.getElementById("event-review-meta-preview")!.textContent =
      (document.getElementById("event-date") as HTMLInputElement).value + " at " +
      (document.getElementById("event-time") as HTMLInputElement).value + " · " + loc;
    eventStep = 4;
  }
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
    showEventDetails(currentEventId);
  } catch (e) { showToast("Error", "error"); }
}

function showRsvpOverlay(id: string) { currentEventId = id; (document.getElementById("rsvp-email") as HTMLInputElement).value = ""; (document.getElementById("rsvp-phone") as HTMLInputElement).value = ""; openOverlay("rsvp-overlay"); }

// ======= OVERLAY HELPERS =======
function openOverlay(id: string) { document.getElementById(id)!.classList.add("active"); }
function closeOverlay(id: string) { document.getElementById(id)!.classList.remove("active"); resetEventForm(); }
function closeAllOverlays() { document.querySelectorAll(".overlay").forEach(function (el) { el.classList.remove("active"); }); resetEventForm(); }

// ======= BIND =======
function bindButtons() {
  // Tabs
  document.querySelectorAll(".tab").forEach(function (b) { b.addEventListener("click", function () { switchTab((b as HTMLElement).dataset.tab!); }); });
  // View Details
  document.querySelectorAll(".btn-view-details").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) showEventDetails(id); }); });
  // Back
  document.querySelectorAll(".btn-back-home").forEach(function (b) { b.addEventListener("click", showHome); });
  // Mod
  document.querySelectorAll(".btn-show-mod").forEach(function (b) { b.addEventListener("click", showModDashboard); });
  // Approve
  document.querySelectorAll(".btn-approve-event").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) approveEvent(id); }); });
  // RSVP now
  document.querySelectorAll(".btn-rsvp-now").forEach(function (b) { b.addEventListener("click", function () { var id = (b as HTMLElement).getAttribute("data-id"); if (id) showRsvpOverlay(id); }); });
  // Detail next / prev / RSVP in overlay
  document.querySelectorAll("#detail-next-btn").forEach(function (b) { b.addEventListener("click", detailNext); });
  document.querySelectorAll("#detail-prev-btn").forEach(function (b) { b.addEventListener("click", detailPrev); });
  document.querySelectorAll("#detail-rsvp-btn").forEach(function (b) { b.addEventListener("click", function () { if (currentEventId) showRsvpOverlay(currentEventId); }); });
  // Submit RSVP
  document.querySelectorAll(".btn-submit-rsvp").forEach(function (b) { b.addEventListener("click", submitRsvp); });
  // Create tab buttons
  document.querySelectorAll(".btn-create-pitch").forEach(function (b) { b.addEventListener("click", function () { openOverlay("pitch-overlay"); }); });
  document.querySelectorAll(".btn-create-event").forEach(function (b) { b.addEventListener("click", function () { resetEventForm(); openOverlay("event-overlay"); }); });
  // Pitch submit
  document.querySelectorAll("#pitch-submit-btn").forEach(function (b) { b.addEventListener("click", submitPitch); });
  // Event next / prev / submit
  document.querySelectorAll("#event-next-btn").forEach(function (b) { b.addEventListener("click", eventNext); });
  document.querySelectorAll("#event-prev-btn").forEach(function (b) { b.addEventListener("click", eventPrev); });
  document.querySelectorAll("#event-submit-btn").forEach(function (b) { b.addEventListener("click", submitEvent); });
  // Close overlays
  document.querySelectorAll(".close-overlay").forEach(function (b) { b.addEventListener("click", closeAllOverlays); });
  // Copy map link
  document.querySelectorAll(".btn-copy-link").forEach(function (b) { b.addEventListener("click", function () {
    var url = (b as HTMLElement).getAttribute("data-url") || "";
    if (navigator.clipboard) { navigator.clipboard.writeText(url).then(function () { showCopyToast(); }); }
    else { var ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); showCopyToast(); }
  }); });
}

document.addEventListener("DOMContentLoaded", function () { bindButtons(); loadHome(); });
