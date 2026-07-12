# Future Health — App Context

Branded health transformation coaching portal. Christopher Fasoli is the coach.
Clients never know AI is involved — hard, permanent brand rule, no exceptions.

## Client zero
Valerie — Christopher's mother. 75. Kelowna, BC.
Protocol start: March 7, 2026. Knee replacement surgery: June 2, 2026.
No login gate currently (removed in last commit — was valerie/future1, confirm before re-adding).

## Stack — locked
Single HTML file (index.html). No frameworks. Chart.js via cdnjs.
Hosted two places: GitHub Pages (this repo, cfasoli08-maker/future-health) AND Hostinger (public_html — copied manually, not git-connected).
Backend: Google Apps Script, Google account CFasoli08@gmail.com (NOT the account connected to this Claude's Drive tool).
Apps Script endpoint called by the app:
https://script.google.com/macros/s/AKfycbwnWfBbg4sCMdKWO_u6yDOZee7GUexUVBeOX-TcBfZ7sDy6Vu8ZWgm7_vgxDs_PCOSa7A/exec
Sheet tabs: Vitals Log | Coach Messages | Clients | Protocol
Sheet actions: auth_client | log_vitals | get_coach | get_verse

## Known issue as of Jul 12 2026
Apps Script endpoint redirects to Google sign-in instead of returning data — deployment is not set to "Anyone" access, or isn't deployed as a web app currently. Log vitals / live coach message / verse pulls are non-functional until fixed. Not yet fixed — deferred by Christopher.

## Backend source
The Apps Script .js source is NOT in this repo. It only exists in the Apps Script editor on CFasoli08@gmail.com. Pull it in as FutureHealth-AppsScript.js when that account is reachable (Drive connector is currently authenticated as aquiferspringskelowna@gmail.com, a different account, and cannot see it).

## Portal structure — 5 tabs
Home | Log | Progress | Wins | Coach

## Design
Warm sage/gold/olive palette. Cormorant Garamond serif + DM Sans body. Oswald for large numbers.

## Execution rules
Always pull latest index.html from this repo before editing — never edit from memory.
Deliver complete file, not fragments or diffs.
After pushing to GitHub, Hostinger's copy still needs manual re-upload — it is not auto-synced.
No em dashes in any output.
Lead with the answer, zero preamble.
