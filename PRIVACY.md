# Privacy Policy

**Last updated:** 2026-06-27

Meetit is a Reddit app that helps subreddit communities organize real-world and virtual meetups. This policy explains what data the app collects, how it is stored, who can see it, and what choices you have.

---

## What data we collect

### When you use the app as a subreddit member

| Data | When | Required? |
|---|---|---|
| Your Reddit username | Always (Reddit provides this) | Yes — needed to identify you |
| Event RSVPs | When you tap RSVP on an event | Optional — you can RSVP without sharing contact info |
| Email address | If you type it in the RSVP form | **No** — entirely optional |
| Phone number | If you type it in the RSVP form | **No** — entirely optional |
| Pitches you submit | When you use the "Pitch a Meetup" feature | Required for the feature to work |

### When you use the app as an event organizer

| Data | When | Required? |
|---|---|---|
| Event title, date, time, location, description, map link, category | When you submit an event | Yes — needed for the event to be useful |
| Organizer name (your Reddit username) | Auto-filled from your Reddit account | Yes |
| Optional phone or email in the organizer field | If you type it | **No** — entirely optional |

### When you use the app as a moderator

| Data | When | Required? |
|---|---|---|
| Your Reddit username | Always (Reddit provides this) | Yes — needed to gate the mod dashboard |
| Mod actions you take (approve, dismiss, delete, dismiss-reason) | When you take them | Yes — recorded as part of the event/pitch lifecycle |
| Debug logs you view | When the `show_debug_panel` setting is enabled for your subreddit | Server logs are capped at the 100 most recent entries |

### What we never collect

- We do not track you across other subreddits or other websites
- We do not collect your IP address, device info, or browser fingerprint
- We do not use third-party analytics, advertising, or marketing trackers
- We do not sell or share data with any third party

---

## Where your data is stored

All data is stored in **Reddit's own infrastructure** (Redis on the Devvit platform). We do not run any external servers, databases, or services. Your data lives in the same infrastructure that powers the rest of your subreddit.

The data is namespaced under `meetit:*` keys in Reddit's Redis:
- `meetit:active_events` — published events
- `meetit:pending_events` — events awaiting moderator approval
- `meetit:rsvps:{eventId}` — list of attendees per event
- `meetit:rsvp_details:{eventId}` — optional email/phone per attendee
- `meetit:pitched_ideas` — community-submitted meetup ideas
- `meetit:server_logs` — last 100 server log entries (mod-only)
- `meetit:cleanup_log` — last 50 cleanup-run audit entries (mod-only)

---

## Who can see your data

This is the most important part. **Read it carefully.**

| Data | Visible to |
|---|---|
| Event titles, dates, locations, descriptions, map links | **Everyone** (they appear in public posts and on the subreddit home) |
| Your Reddit username as an RSVP | **Everyone** (it appears in public posts) |
| Your email and/or phone (if you provided it) | **Only the event organizer and the subreddit moderators** — never other community members, never the public |
| Pitches you submit | **Only the subreddit moderators** (until the pitch is approved and becomes an event) |
| Dismiss reason for your pitch | **Only you** (it appears in your "My Stuff" view) |
| Server logs | **Only moderators** (and only if `show_debug_panel` is enabled) |
| Mod alert DMs | **Only the configured moderators** |

We will never share, sell, or expose your email or phone to anyone other than the event organizer and the subreddit's moderators. If the organizer shares it elsewhere, that is outside the app's control.

---

## How long we keep your data

| Data | Retention |
|---|---|
| Published events | Indefinitely, until the daily cleanup removes them (default 30 days after the event date) |
| Pending events | Indefinitely, until the daily cleanup removes them (default 30 days after submission if still pending) |
| Pitches | Indefinitely, until the daily cleanup removes them (default 30 days after submission) |
| RSVPs | Indefinitely, until the event they belong to is cleaned up |
| Email/phone in `rsvp_details` | Until you clear them, leave the event, or the event is cleaned up |
| Reminder dedup keys | 24 hours (auto-expire) |
| Share-post dedup keys | 24 hours (auto-expire) |
| DM rate-limit keys | Variable (auto-expire) |
| Server logs | Most recent 100 entries; older entries are auto-removed |
| Cleanup log | Most recent 50 entries; older entries are auto-removed |

The cleanup threshold is configurable by the subreddit's moderators (range: 1-365 days). The default is 30 days.

---

## How to delete your data

You can delete most of your data yourself:

- **Remove your RSVP**: open the event in the app, tap "Leave" — your username and contact info are removed immediately.
- **Clear your contact info**: open the event in the app, tap "RSVP" again, leave email and phone blank, confirm — your stored email/phone is hard-deleted from Redis.
- **Delete your pitch**: open "My Stuff" → Pitches, tap "🗑️ Delete" — your pitch is hard-deleted.
- **Delete your event (as organizer)**: open "My Stuff" → Events, tap "🗑️ Delete" — your event is hard-deleted.

If you delete your Reddit account, your data will be cleaned up by the daily background job within 30 days of deletion.

If you want your data removed sooner, ask a moderator of the subreddit to run the manual cleanup. They can also pause the daily cleanup if needed for a data migration.

---

## Your rights

You have the right to:

- **Access** — see what data the app has stored about you (use the My Stuff view, or ask a mod)
- **Delete** — remove your data at any time (instructions above)
- **Withdraw consent** — stop providing your email or phone at any time by clearing the fields
- **Complain** — contact the subreddit moderators, or Reddit directly via the Reddit Help Center

---

## Children

The app is not directed at children under 13. We do not knowingly collect data from children under 13. If you believe a child under 13 has used the app, please contact the subreddit moderators to have the data removed.

---

## Changes to this policy

We may update this privacy policy as the app evolves. Changes will be committed to this repository. Subreddit moderators will be notified through the app's mod alert system of any material changes.

---

## The app's open source

This app is open source under the BSD-3-Clause license. You can read the source code, verify the data practices described above, and submit improvements. The repository is at: https://github.com/darelphilipo/meetit

---

## Contact

For privacy questions:
- **Subreddit moderators** — for data stored by the app on a specific subreddit
- **Reddit** — for general Reddit platform questions, via https://www.reddit.com/help
- **The app's author** — via the GitHub repository's issue tracker at https://github.com/darelphilipo/meetit/issues

---

## Disclaimer

This privacy policy describes the data practices of the Meetit app. It does not describe the data practices of Reddit itself, of any subreddit that has the app installed, or of any third-party service. Please review Reddit's privacy policy at https://www.reddit.com/policies/privacy-policy for the platform-level practices.
