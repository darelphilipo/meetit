# Meetit

**Run real meetups from your subreddit. Built for r/bihar, open to every community.**

---

## Why we built this

Our subreddit r/bihar meets up regularly — chai, hikes, cricket, Diwali dinners, the works. The hard part was never deciding to do a meetup. It was everything around it:

- Reminding people the day before
- Collecting phone numbers so the organizer could reach the venue
- Sending maps to the location
- Handling the inevitable "wait, when is this happening?" messages
- Chasing attendance after the fact

Meetit centralizes the whole flow inside Reddit. Pin it to your subreddit and members always see what's coming up. The organizer gets the attendee list. The reminders go out automatically. No external tools, no spreadsheets, no group chats, no chasing.

---

## What you get

### For your community (subreddit members)

- **Always-visible upcoming events** — pin a launcher post to the top of the subreddit and the app stays on the home page
- **One-tap RSVP** with optional contact info (email or phone) that goes **only** to the organizer
- **Automatic reminder posts** 24 hours and 2 hours before each event, with the event details, the map link, and the organizer's handle
- **Add to Google Calendar** in one tap, right from the post
- **Map link or virtual meetup link** in every post — in-person or online, both work
- **"I'm going" share** with one tap — posts a "u/you is going to X" thread to start the conversation
- **Pitch a meetup idea** — anyone can suggest a meetup; mods review; you get a DM when your idea is approved or dismissed

### For event organizers

- **5-step submit wizard** — title, organizer, date, time, location, description
- **Auto-RSVPed as the organizer** the moment your event goes live — you appear in your own attendee list immediately
- **Public announcement post** automatically created on approval — the community sees it the moment you do
- **See who's coming** with avatars, names, and (for you) the contact info you need to reach attendees
- **Export the full attendee list to CSV** for any external coordination (larger groups, ride-sharing, dietary tracking)
- **One place to manage your events** — pending, published, and past in My Stuff
- **Auto-cleanup of old events** — no manual housekeeping required

### For moderators

- **One mod dashboard** with three tabs: pending events, your published events, and community-submitted ideas
- **Approve or dismiss in one tap** with optional reason for pitches (the pitcher gets a DM automatically)
- **Daily aged cleanup** removes old events and pitches — set the threshold (1-365 days) and set it and forget it
- **Manual cleanup button** when you need a clean slate before a big release
- **Pause cleanup** with one setting flip if you're about to do a manual data migration
- **In-app debug log panel** (opt-in) for troubleshooting — only mods see it
- **All attendee data is exportable** as a safe CSV (formula-injection guarded, RFC 4180 compliant)

---

## Privacy & data

Your community's trust is the most important thing.

- **No personal info is collected** unless the user explicitly types it in
- Email and phone numbers are stored encrypted at rest in Reddit's Redis
- Contact info is visible **only** to the event organizer and the moderators
- Other community members see attendee names, not their contact info
- Deleting your RSVP removes your contact info immediately
- Account deletion triggers a full data cleanup
- Aged events and pitches are automatically hard-deleted by a daily background job (configurable threshold, default 30 days)

---

## How it works

1. **Sub admin installs the app** from the Reddit App Directory
2. **Sub admin creates the launcher post** via the subreddit menu (one click) and pins it to the top
3. **Organizers submit events** through the Create menu — events go to the mod approval queue
4. **Mods approve or dismiss** from the mod dashboard
5. **Approved events go live** on the subreddit home with a public announcement post
6. **Members RSVP** from the event card, optionally sharing contact info with the organizer
7. **Reminders fire automatically** at 24h and 2h before the event as plain-text posts
8. **After the event**, the organizer can export the full attendee list as CSV

The whole thing runs on Reddit's infrastructure. No external servers, no external data collection, no third-party integrations.

---

## For subreddit admins

### Installation

1. Install Meetit from the Reddit App Directory
2. Open the subreddit menu and click **"Set Up Meetit"** — this creates the launcher post
3. Pin the launcher post to the top of the subreddit
4. Open the Mod Dashboard (the button appears for mods in the home page header) and start approving events

That's it. The app works out of the box with sensible defaults.

### Configuration (all optional)

The app has 9 install settings, all with defaults that work for most communities:

| Setting | Default | What it does |
|---|---|---|
| Primary color | `#ffff00` | Brand color #1 |
| Secondary color | `#ff69b4` | Brand color #2 |
| Brutalist borders | on | Visual style toggle |
| Moderator usernames | empty | Comma-separated list — gates the mod dashboard |
| Reminder hours | 24 | When the first reminder fires |
| Second reminder hours | 2 | When the second reminder fires (set 0 to disable) |
| Community timezone | IST | Event times and reminders use this |
| Show debug panel | off | Opt-in for the in-app 🐛 log panel |
| Cleanup after days | 30 | Auto-delete old events and pitches |
| Pause cleanup | off | Freeze the daily auto-cleanup |

---

## Open source

Built on [Reddit Devvit](https://developers.reddit.com/), the official platform for Reddit apps. Source code is in this repository under the BSD-3-Clause license. The app runs entirely on Reddit's infrastructure — no external servers, no external data collection, no third-party tracking.

Contributions, bug reports, and feature requests are welcome.

---

## Privacy & Terms

The app's data practices are described in [PRIVACY.md](PRIVACY.md). The Terms of Service are in [TERMS.md](TERMS.md). Both are short, written in plain language, and cover exactly what data the app stores, who can see it, and how to delete it.

**TL;DR:**
- No PII is collected unless you type it in
- Email/phone you provide is visible **only** to the event organizer and the subreddit moderators
- All data is stored in Reddit's own Redis, no external servers
- You can delete your data at any time through the app, or by asking a mod

---

## Credits

Built by [u/darelphilip](https://www.reddit.com/user/darelphilip) for the r/bihar community. If this helps your subreddit, share it with your fellow mods.

---

## License

BSD-3-Clause. See [LICENSE](LICENSE).
