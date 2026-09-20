# Fika — five-minute pitch

Track: Everyday. Live demo, hard clock. Aim to finish at 4:40.
One person talks, one person drives the phone. The driver never waits for the talker.

## Before you walk up

- App open on the Today screen, Demo mode **off**, state **on time**. Commute: Kangemi → Upper Hill, arrive by 9:00, usual departure 8:20, contact Mary (manager).
- Pull to refresh once so the numbers are fresh. WhatsApp signed in on the demo phone.
- Notice sheet set to Manager + English.
- Backup phone unlocked with the same screen. Recorded run open in a tab.
- Know the reset: Demo mode sheet → "Reset to start".

## Script

**0:00 – 0:30 · The job** (nothing on screen changes)

> "We're in the Everyday track. The recurring job: getting to work by nine, every weekday, in Nairobi traffic — and warning your manager when you won't make it. Today you do that job yourself, with Google Maps, a guess about when to leave, and a panicked WhatsApp sent *after* you're already late. This is Fika."

**0:30 – 1:40 · Which way, and when to leave** (real data)

Driver: point at the hero time, then the route cards, then tap a second route so the map and cards move together.

> "This is my real commute, Kangemi to Upper Hill, with live Google traffic — nothing on this screen is mocked. Fika checked six departure times and says: leave by this time, on this route. And this line is the one Maps never gives you: if I leave at my usual 8:20, this is when I actually arrive. Three routes, each one measured against my nine o'clock deadline — green, amber, red. Code does all the maths. Claude only writes the sentence."

**1:40 – 2:40 · At risk** (simulated, labelled)

Driver: flask icon → "Accident on …, +25 min" → close the sheet. Then tap "Switch to …".

> "A demo can't wait for a real jam, so we add one. Look at the white banner — SIMULATED TRAFFIC. It stays up the whole time, and it sits on top of the real Google numbers. Now I'm at risk: inside my ten-minute buffer. Fika doesn't just warn me, it tells me what to do — leave now, or switch route and I'm back on time. One tap."

**2:40 – 4:00 · Late — the part that's new**

Driver: flask → "Advance clock to mid-trip" → close. Tap "Review and send notice". Tap Friend, then Sheng. Tap "Send on WhatsApp" and stop on the prefilled chat. **Do not press send.**

> "Now I'm mid-trip and it's gone wrong. Arriving 9:15 — fifteen minutes late, and no route saves me. Here's the moment Fika exists for: it's 8:40. I'm not late *yet*. And the message to Mary is already written, with my real ETA. Those two locked chips — ETA and minutes late — come from the route, not from AI. If Claude's message ever left out the exact ETA, we'd throw it away and use a template.
> Mary's my manager. But if it's a friend waiting…" *(tap Friend, Sheng — let the room read it)* "…Fika speaks Sheng. WhatsApp opens with it typed in. Fika never sends anything. I press send."

**4:00 – 4:40 · Monday**

Driver: Demo mode → "Reset to start" (banner disappears). Open the setup screen for two seconds, then back.

> "Banner's gone — this is live again. On Monday I put in my own home, my own office, my own manager's number. It reminds me before I usually leave, I open it, and it tells me when to go, which way, and when to let someone know. Would I use it Monday? It's my commute. I'm using it Monday. Thank you."

Spare: 20 seconds. If you are behind at 2:40, skip the route switch. If behind at 4:00, skip the setup screen and go straight to the last line.

## If something breaks

- **Routes won't load:** the screen keeps the last result — keep talking, say "that's the last fetch, it keeps it so you never see a blank screen." Or Demo mode → "Use saved routes" if it is in the build.
- **Claude is slow or fails:** the template notice appears instead. Say so: "that's the fallback — same ETA, plain words. The number is never at the mercy of the AI."
- **WhatsApp doesn't open:** tap SMS or Share instead.
- **App crashes:** backup phone. Then the recorded run.

## Questions judges are likely to ask

- **"Google Maps already does arrive-by."** For transit. For driving, Google's API ignores arrive-by, so Fika searches departure times itself. And Maps never tells you that your *habit* makes you late, or writes the message.
- **"What's mocked?"** Only the accident and the moved clock, behind a banner. Route times, the three states, Claude's wording and the WhatsApp hand-off are real.
- **"Where is Fable 5.1?"** Not in the app — a two-line notice needs speed, so the app uses Haiku 4.5, and Sonnet 5 for Swahili and Sheng. Fable 5.1 built it through Claude Code: questioned the idea, checked the API facts, wrote the spec and 12 tickets, then built them test-first with a review and handoff notes on each. Its own review caught Haiku inventing Swahili words, which is why those languages moved to Sonnet.
- **"Can the AI get my ETA wrong?"** No. It is handed the ETA as text and the notice is rejected if that exact text is missing.
- **"Does it track me?"** No GPS, no account, no background polling. The commute is stored on the phone only.
- **"Matatus?"** Driving and ride-hail only for now — that is where real traffic ETAs exist.
- **"What's next?"** Learning your own buffer from past trips, calendar deadlines, and rain.
