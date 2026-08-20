# Future Health

Read in this order, every session:

1. `FINDINGS.md` — what we have learned about Valerie's body. Never skip this.
2. `claude/STATE.md` — where the code stands.
3. `claude/MAP.md` — what every file and every part of index.html is for.

Then read only the file the task needs.

---

## HOW TO TALK TO CHRISTOPHER — hard rules

Write at a grade three reading level. Short sentences, ten words or fewer where
you can. One idea per sentence. Plain words. No tech words unless you explain
them in plain words first.

- Start every reply with his name.
- Answer first. No warm up.
- Unicode numbers for lists: １ ２ ３. Never 1. 2. 3.
- Each item starts with a bold phrase, then a colon, then plain words.
- No blank lines between sections. Single line breaks only.
- No em dashes anywhere. No bullet points.
- The whole reply must copy on a phone in one action.

If a reply is long, hard, or full of tech words, it is wrong. Rewrite it.

**Never hand Christopher a task.** Before saying something needs doing, check
whether a tool exists to do it. If one does, do it and report the result. He
clicks. He does not do the work.

**Questions about Valerie's body go to Valerie**, through the `save_question`
action, which puts them on her Updates tile. Never route them through him.

---

## Who this is for

Valerie, 75, Kelowna BC. Christopher's mother. Right knee replaced 2 June 2026.
Protocol started 7 March 2026. Type 2 diabetes history, off insulin and off
blood pressure medication since spring 2026. Diabetic autonomic neuropathy
identified June 2026 behind twenty years of gut symptoms.

She gives up easily. Every screen answers one question: am I getting better.
Never a number without its arc. Not "BP is 127" but "BP is 127, down from your
145 start."

The AI runs invisibly in everything she reads. She knows it exists and helped
build the app, so do not flag it or worry about it, but her Updates and screens
read as coming from Christopher.


---

## Live right now

| | |
|---|---|
| App | https://cfasoli08-maker.github.io/future-health |
| Coach view | same URL with `?coach=future1` |
| Repo | `cfasoli08-maker/future-health`, public |
| State file | https://cfasoli08-maker.github.io/future-health/fh-state.json |
| Backend | Google Apps Script, account CFasoli08@gmail.com |
| Endpoint | `https://script.google.com/macros/s/AKfycbwc-FLnsJThCFmynUFb4m3KN3P895I-wATyPOxoGK4lWnIpVw6WGYkbBc3lCzJDMOymGg/exec` |
| Apps Script project | `1JBPQaZ_ZHlBpu0m7O6QzlrknQU803f5gCI0QCJkk1-wQw-NWNtuk4IeL` |
| Sheet id | `1lhHFZrm8H5Tti4PQ9Q6iIyq-fbaNUV125ZymWbVMEzA` |

Sheet tabs: Daily Log, Whoosh Log, Food Log, Food Searches, Supplement Log,
Chat, Updates, Analysis Log, Questions.

Twenty actions, all verified live 18 August 2026: `log_entry`, `log_supplement`,
`log_food`, `food_photo`, `send_message`, `send_coach_message`, `get_coach`,
`get_logs`, `get_verse`, `log_whoosh`, `get_whooshes`, `delete_entry`,
`save_update`, `get_updates`, `save_question`, `get_questions`, `save_answer`,
`log_food_search`, `get_food_searches`, `save_analysis`.

**The endpoint returns a 302.** POST, read the `redirect_url`, then GET that URL.
`curl -L` turns it into a 405.

```bash
LOC=$(curl -s -o /dev/null -w '%{redirect_url}' -X POST "$EP" --data-binary "$PAYLOAD")
curl -s "$LOC"
```

---

## Stack, locked

One file, `index.html`, about 140 KB. No frameworks, no build step. Chart.js
from cdnjs is the only external library.

Design: warm sage, gold and olive. Cormorant Garamond serif, DM Sans body,
Oswald for large numbers.

---

## Deploy

From here, with git, it is `git add`, `git commit`, `git push`. Pages rebuilds
in one to four minutes.

Verify by comparing the md5 of the live Pages URL with a cache-busting query
against the file you shipped. Never verify with raw.githubusercontent, its CDN
lags several minutes behind.

**Before editing, pull the live file.** The local copy has gone stale before.

```bash
curl -s "https://cfasoli08-maker.github.io/future-health/index.html?cb=$RANDOM" -o index.html
```

Edit by exact string replacement, asserting exactly one match. Never regex.
Validate with `node --check` on the extracted script block before shipping.

---

## Traps

- The Apps Script IDE rejects programmatic edits. `setValue` and `executeEdits`
  apply visually but Save writes the old content. Only real keyboard or paste
  input registers. Christopher has to make backend changes himself.
- The GitHub API is blocked from the Claude cloud sandbox for this repo. Not a
  problem here, where git works.
- Whoosh notes written before 18 August carry the episode count in prose. From
  18 August they lead with "N episodes today". Parse accordingly.
- Pain counter rows before 18 August include junk "0mg (0 pills)" entries.
  Ignore zero-dose rows. The counter is a running daily total, so use the final
  state per session.
- The `claude/` folder is gitignored. The repo is public and those notes carry
  patient detail.
