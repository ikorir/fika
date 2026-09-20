# Fika design

Source of truth for how the app looks: the "Fika app design" canvas, https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15 (private to its owner; ask for access). A snapshot of its six screens is in `screens/` as HTML mock-ups, 390 × 844. They are reference only: the app is React Native, so rebuild them with React Native views and styles. Do not ship or embed the HTML. If the canvas and this snapshot differ, the canvas wins; refresh the snapshot.

## Screens

| Screen | File | What it shows | Tickets |
| --- | --- | --- | --- |
| Today · on time | `Main.dc.html` | Map, status pill, "Leave by 8:05", decision line, conditions note, route list, "Remind me at 7:55", "Updated 7:40", Open in Google Maps | 01, 02, 05, 07, 09 |
| Today · at risk | `AtRisk.dc.html` | Simulated-traffic banner, "Leave Now", "5 min inside your buffer", incident marker on the map, "Switch to James Gichuru Rd" | 02, 03, 05, 07 |
| Today · late | `Late.dc.html` | "Arriving 9:15", "15 min late", notice preview card with locked ETA chips, "Review and send notice" | 02, 03, 04, 05 |
| Late notice sheet | `Notice.dc.html` | Bottom sheet: tone switch, language chips, To row, editable message, locked chips, WhatsApp / SMS / Share | 04, 05, 06 |
| Commute setup | `Setup.dc.html` | From, To, Arrive by, Usual departure, Buffer, Parking time, I drive / Ride-hail, contact name, phone, relationship | 08 |
| Demo mode sheet | `Demo.dc.html` | Scenarios, app clock back/forward 5 minutes, "Use saved routes", Reset to start | 03, 10 |

## Tokens

- Theme: dark only. Background `#000000`; map ground `#0C0E11`; card `#1B1B1D`; raised surface `#252527`; chip `#2A2A2D`; hairline `rgba(255,255,255,0.07)`; control border `rgba(255,255,255,0.12)`.
- Text: primary `#FFFFFF`; secondary `#A1A1A6`; body on cards `#E4E4E8`.
- Accent (primary buttons, selected route, links): `#F28C38`, text on accent `#1A0F04`. "Best" badge: `#F9A45C` on `#3A2410`.
- State colours: on time `#4CC38A` on `#12261C`; at risk `#F2C94C` on `#2B2410`; late `#FF6B5E` on `#2E1614`.
- Simulated-traffic banner: white `#FFFFFF` strip, black text, 12px, weight 800, letter-spacing 0.08em, uppercase, directly under the map.
- Type: Figtree (400–800). Hero time 64px / 800 / −0.03em. Decision line 16px / 500. Conditions note 14px secondary. Route name 16px / 600, route meta 13px secondary. Primary button label 17px / 700.
- Shape: primary button 56px high, fully rounded; secondary buttons 50px; cards radius 22; sheet top radius 32; chips 28px high; touch targets at least 44px.
- Icons: simple stroke icons, no emoji.

## Behaviour the design adds to the spec

- Route difference colour: green when arrival is at or before deadline − buffer, amber when inside the buffer, red when past the deadline.
- The hero changes by state: "Leave by 8:05" with "in 25 min · arrive 8:50" (on time); "Leave Now" with "arrive 8:55 · 5 min inside your buffer" (at risk); "Arriving 9:15" with "15 min late · via Waiyaki Way" (late).
- One primary action per state: "Remind me at <leave-by − 10 min>" (on time), "Switch to <best route>" (at risk, and late while not yet on the road and another route is still on time), "Review and send notice" (late otherwise).
- Header controls on the map: edit commute (left), Demo mode and manual refresh (right). The Demo mode icon turns accent orange while Demo mode is on.
- The map shows an ETA bubble on each route and an incident marker on the delayed route while a simulated accident is active. Unselected routes dim further in the late state.
- The banner says what is simulated: "SIMULATED TRAFFIC · WAIYAKI WAY +25 MIN", "SIMULATED TRAFFIC · CLOCK SET TO 8:40".
- The late state shows the notice preview on the main screen; the full editor is a bottom sheet over it.
- ETA and lateness appear as locked chips next to the message, labelled "from your route, not AI", with the line "Fika opens a prefilled message. Nothing goes out until you press send."
- Demo mode sheet has an app clock with 5-minute steps and a "Use saved routes — works with no internet" switch.
- Setup labels the extra-minutes field "Parking time" for drivers (pickup wait for ride-hail) and ends with "Saved on this phone only. No account needed."
- The sample notice names a cause ("an accident on Waiyaki Way"). Claude may mention a cause only when one is passed to it as a fact (the simulated accident). With live data there is no cause; it must not invent one.
