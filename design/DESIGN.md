# Fika design

Source of truth for how the app looks: the "Fika app design" canvas, https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15 (private to its owner; ask for access). A snapshot of its six screens is in `screens/` as HTML mock-ups, 390 × 844. They are reference only: the app is React Native, so rebuild them with React Native views and styles. Do not ship or embed the HTML. If the canvas and this snapshot differ, the canvas wins; refresh the snapshot.

## Screens

| Screen | File | What it shows | Tickets |
| --- | --- | --- | --- |
| Today · on time | `Main.dc.html` | Map, status pill, "Leave by 8:05", decision line, conditions note, route list, "Remind me at 7:55", "Updated 7:40", Open in Google Maps | 01, 02, 05, 07, 09 |
| Today · at risk | `AtRisk.dc.html` | Simulated-traffic banner, "Leave Now", "5 min inside your buffer", incident marker on the map, "Switch to James Gichuru Rd" | 02, 03, 05, 07 |
| Today · late | `Late.dc.html` | "Arriving 9:15", "15 min late", notice preview card with locked ETA chips, "Review and send notice" | 02, 03, 04, 05 |
| Late notice sheet | `Notice.dc.html` | Bottom sheet: tone switch, language chips, To row, editable message, locked chips, WhatsApp / SMS / Share | 04, 05, 06 |
| Commute setup | `Setup.dc.html` | From, To, Arrive by, Usual departure, Buffer, Parking time, then a card with "Different time on some days" and "Quiet on weekends" (not on the canvas yet), I drive / Ride-hail, contact name, phone, relationship | 08, v2 06 |
| Demo mode sheet | `Demo.dc.html` | Scenarios, app clock back/forward 5 minutes, "Use saved routes", Reset to start | 03, 10 |
| Welcome | not on the canvas yet | First run only, on a phone with no commute stored: the glyph in accent (fades and rises in), "Know when to leave.", one line on what Fika does, "Set up my commute" (primary button), "Try it with a sample commute" (accent text button). Either choice ends it for good | v2 05 |

## Tokens

- Theme: dark only. Background `#000000`; map ground `#0C0E11`; card `#1B1B1D`; raised surface `#252527`; chip `#2A2A2D`; hairline `rgba(255,255,255,0.07)`; control border `rgba(255,255,255,0.12)`.
- Text: primary `#FFFFFF`; secondary `#A1A1A6`; body on cards `#E4E4E8`.
- Accent (primary buttons, selected route, links): `#F28C38`, text on accent `#1A0F04`. "Best" badge: `#F9A45C` on `#3A2410`.
- State colours: on time `#4CC38A` on `#12261C`; at risk `#F2C94C` on `#2B2410`; late `#FF6B5E` on `#2E1614`.
- Simulated-traffic banner: white `#FFFFFF` strip, black text, 12px, weight 800, letter-spacing 0.08em, uppercase, directly under the map.
- Type: Figtree (400–800). Hero time 64px / 800 / −0.03em. Decision line 16px / 500. Conditions note 14px secondary. Route name 16px / 600, route meta 13px secondary. Primary button label 17px / 700.
- Shape: primary button 56px high, fully rounded; secondary buttons 50px; cards radius 22; sheet top radius 32; chips 28px high; touch targets at least 44px.
- Icons: simple stroke icons, no emoji.
- App icon: accent `#F28C38` ground with one white stroke glyph, a clock whose hand runs out of it as a road (source `mobile/assets/source/fika-glyph.svg`). The splash is the same glyph in white on black.

## Behaviour the design adds to the spec

- Route difference colour: green when arrival is at or before deadline − buffer, amber when inside the buffer, red when past the deadline.
- The hero changes by state: "Leave by 8:05" with "in 25 min · arrive 8:50" (on time); "Leave Now" with "arrive 8:55 · 5 min inside your buffer" (at risk); "Arriving 9:15" with "15 min late · via Waiyaki Way" (late).
- One primary action per state: "Remind me at <leave-by − 10 min>" (on time), "Switch to <best route>" (at risk, and late while not yet on the road and another route is still on time), "Review and send notice" (late otherwise).
- Header controls on the map: edit commute (left), Demo mode and manual refresh (right). The Demo mode icon turns accent orange while Demo mode is on.
- The map shows an ETA bubble on each route and an incident marker on the delayed route while a simulated accident is active. Unselected routes dim further in the late state.
- The map moves rather than jumps: it eases to fit every route when they change and to fit a route when it is selected, and after "Switch to …" the camera tilts to 45° on the way and settles flat. The selected route sits on a soft accent glow, the map fades into the black at its foot, ETA bubbles have a tail pointing at their road, the origin and destination pins have a soft halo, and the incident marker pulses while an accident is simulated. The header controls float on a blur (iOS; a flat fill on Android). With reduce motion the camera moves at once and the pulse holds still.
- Between the hero and the route card, full width inside the screen insets, a strip of blocks shows every departure Fika checked (about six), in time order. Each block shows its departure time in the colour of how its best route arrives, on that colour's tint (the route difference colours: green, amber, red); the departure the screen is about is taller, with a border in its colour. Tapping a block shows one line under the strip, "Leave 7:50 · arrive 8:52 via Limuru Road"; tapping it again hides it. It never changes what the screen decided. Demo mode's delay and clock recolour and move it. It goes with the routes when, late, the notice takes their place.
- The decision line ends in a small stroke info glyph and is a button ("Shows how Fika chose this time") in every state. It opens the "Why" sheet, titled "Why leave by 7:50" or "Why leave now": the rule in one line ("Arrive by 9:00, minus 10 min buffer and 10 min parking"; "pickup wait" for ride-hail), then a card with a row per departure checked (its time, the best route, "arrive 8:49" in the state colour of how it stands, and a "Chosen" tag on the one Fika picked), then one sentence on why that one.
- The banner says what is simulated: "SIMULATED TRAFFIC · WAIYAKI WAY +25 MIN", "SIMULATED TRAFFIC · CLOCK SET TO 8:40".
- Nothing to show is a card, not a line of muted text: a stroke icon, a title, one line of reason and one action. "No driving route" names the two places and offers "Edit commute". "Couldn’t get routes" gives the error and "Try again"; with numbers already on screen, the "these are the numbers Fika last got" line stays instead. A reminder asked for while the phone will not let Fika notify shows "Reminders are off" with "Open settings" in place of the reminder button.
- The late state shows the notice preview on the main screen; the full editor is a bottom sheet over it.
- ETA and lateness appear as locked chips next to the message, labelled "from your route, not AI", with the line "Fika opens a prefilled message. Nothing goes out until you press send."
- Demo mode sheet has an app clock with 5-minute steps and a "Use saved routes — works with no internet" switch.
- Setup labels the extra-minutes field "Parking time" for drivers (pickup wait for ride-hail) and ends with "Saved on this phone only. No account needed."
- Setup's days card, under the times card: "Different time on some days" (calendar icon) shows "None", the one day ("Fri 8:30") or how many days ("2 days"), and opens a sheet listing Monday to Sunday. Each day reads "Usual" in muted grey until it has its own time; tapping a day opens the usual time sheet, titled "Arrive by on Friday", starting from the usual arrive-by, and closing it goes back to the week. A day with its own time has a stroke cross that puts it back on the usual one. "Quiet on weekends" (moon icon) is a switch, on by default. Both are saved with the rest; the footnote stays last.
- A day's own arrive-by is what the Today screen shows and fetches for that day ("arrive by 8:30" on a Friday). Morning reminders go out 15 minutes before the usual departure on commute days only: never on Saturday or Sunday while weekends are quiet, and never on a Kenyan public holiday.
- On a public holiday the hero keeps its numbers, and the decision line reads "Public holiday: Mashujaa Day. No reminder today." Demo mode ignores holidays.
- The sample notice names a cause ("an accident on Waiyaki Way"). Claude may mention a cause only when one is passed to it as a fact (the simulated accident). With live data there is no cause; it must not invent one.
