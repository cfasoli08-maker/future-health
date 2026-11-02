// Free reply check. Christopher, 14 Oct 2026: the Opus reply gate burned his Claude allowance
// (87 runs, 42 replies sent back). This one uses no AI: plain rules, in a few milliseconds.
// Runs only in sessions he is attending (the desktop app). It sends a reply back once at most.
import { readFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

const log = (s) => { try { appendFileSync(join(process.env.USERPROFILE || '', '.claude', 'hooks', 'ceo-check.log'), `${new Date().toISOString()} ${s}\n`) } catch {} }
const pass = () => process.exit(0)

if (process.env.CLAUDE_CODE_REMOTE !== 'true') pass()
let input = {}
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}') } catch { pass() }
if (input.stop_hook_active) pass()

const textOf = (c) => typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b && b.type === 'text').map((b) => b.text).join('\n') : ''
let reply = ''
try {
  const turns = []
  for (const l of readFileSync(input.transcript_path, 'utf8').split('\n')) {
    if (!l) continue
    let e; try { e = JSON.parse(l) } catch { continue }
    if (e.isSidechain || e.isMeta || !e.message) continue
    const t = textOf(e.message.content)
    if (e.type === 'user' && e.message.role === 'user' && t && !/^<(system-reminder|command-|local-command)/.test(t.trim())) turns.push({ who: 'user', t })
    else if (e.type === 'assistant' && t) turns.push({ who: 'claude', t })
  }
  let last = -1
  turns.forEach((x, i) => { if (x.who === 'user') last = i })
  reply = turns.slice(last + 1).filter((x) => x.who === 'claude').map((x) => x.t).pop() || ''
} catch { pass() }
if (!reply.trim()) pass()
// His transfer reply (SETTINGS.md rule 45) is the one other allowed shape.
if (/^\s*Continuing from previous work: carrying on with .+\. Read Wiki\/.+ first\.\s*$/.test(reply)) pass()

const prose = reply.replace(/```[\s\S]*?```/g, '')
const words = reply.split(/\s+/).filter(Boolean).length
const sources = (s) => new Set([...s.matchAll(/\[([^\]\r\n]+)\]/g)].filter((m) => /[\/\\]|\b[\w-]+\.[a-z][a-z0-9]*\b|\b(?:live|screen|dashboard|logs?|wiki|record|handoff|db|transcript|chat|email|invoice|stripe|square|fly)\b/i.test(m[1])).map((m) => m[1].trim().toLowerCase())).size
const report = /^\s*Christopher, report \([a-z0-9 -]+\):/i.test(reply)
const broke = []
if (!/^\s*Christopher\b/.test(reply)) broke.push('start with "Christopher"')
if (/—/.test(prose)) broke.push('take out the em dash')
const limit = report ? 600 : 130
if (words >= limit) broke.push(`cut it to under ${limit} words (it has ${words})`)
if (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(prose)) broke.push('take out the emoji')
if (/^#{1,6}\s/m.test(prose)) broke.push('drop the headers')
// Christopher, 25 Oct 2026: the shape is checked too, not only the first word (SETTINGS.md rule 9).
// 27 Oct 2026: four replies. CEO decision, Problem, Done, and Click. 213 stops in 3 days, about
// 1 in 9 a real CEO question, so a CEO decision must name one of his five reasons (rule 9c), show
// the staff work (rule 9f), and never be a progress report, a "may I" or a sorry.
// The old "question" and "decision needed" openings are retired and sent back.
// 29 Oct 2026: the fifth reply is Report, with sources and an independent checker (rule 9g).
const shape = [/^\s*Christopher, CEO decision \([a-z -]+\):/, /^\s*Christopher, problem \([a-z -]+\):/, /^\s*Christopher, all the tasks in the above prompt are completed, verified, and double checked\./, /^\s*Christopher, your click:/, /^\s*Christopher, report \([a-z0-9 -]+\):/i].findIndex((r) => r.test(reply))
if (shape >= 0 && prose.replace(/^\s*Christopher, (?:(?:CEO decision|problem) \([a-z -]+\):|report \([a-z0-9 -]+\):|your click:|all the tasks in the above prompt are completed, verified, and double checked\.)/i, '').split(/\s+/).filter(Boolean).length < 2) broke.push('say what it is after the opening words')
if (shape === 3 && !/\bopen\b/i.test(prose)) broke.push('a Click reply must say the screen is already open')
if (shape === 3 && /Reply yes/i.test(prose)) broke.push('a Click reply never asks "reply yes"')
// A Click is one or two lines. He never types anything back; Claude watches for the result.
if (shape === 3 && words >= 50) broke.push(`a Click reply is under 50 words (it has ${words}); put every click in one short list and nothing else`)
const buttonPattern = /\bClick\s+(?:on\s+)?["“]?([^."”\r\n]{1,60})/g
const buttons = [...prose.matchAll(buttonPattern)].map((m) => m[1])
if (shape === 3 && /\b(?:tell me|let me know|report back|reply|type|text me|message me|say)\b/i.test(prose.replace(buttonPattern, 'Click').replace(/^\s*Christopher, your click:/, ''))) broke.push('a Click reply never asks him to type or report back; watch for the result yourself')
if (shape === 3 && (!buttons.length || buttons.some((b) => !/^(?:the\s+)?(?:blue\s+|green\s+)?(?:allow|grant|install|authori[sz]e|connect|sign(?:-| )?in|log ?in|pay|buy|purchase|place (?:the )?order|sign|approve|accept|trust|send|confirm (?:payment|purchase)|continue to pay)/i.test(b.trim())))) broke.push('a Click is only for his rule 9d steps: money sent, the final Send on an email, a signature, or a sign-in or grant the safety system blocks. Any other click is yours')
if (/^\s*Christopher, (?:question|decision needed)\b/i.test(reply)) broke.push('"question" and "decision needed" are retired. If it is one of his five CEO reasons, open "Christopher, CEO decision (reason):". If not, it is yours (rule 9e): decide it, write it in the wiki and keep working')
const decision = ['new system', 'operations change', 'money spent', 'catastrophe', 'family health', 'one-way door']
const problem = ['catastrophe', 'other project', 'stuck']
const ceoFact = /\$\s?\d|\b(?:buy|spend|pay|paid|price|cost|fee|budget|invoice|refund|policy|new (?:business|product|market|brand|system|tool|host)|market|hire|partner|supplier|contract|legal|tax|sign(?:ature|-in| in)|password|Mom|health|down|lost|leak)/i.test(prose.replace(/^s*Christopher, [^:]*:/, ""))
if (shape === 0 || shape === 1) {
  const head = prose.split(/\bTried first:/)[0]
  const tag = (reply.match(/^\s*Christopher, (?:CEO decision|problem) \(([a-z -]+)\):/) || [])[1]
  if (shape === 0 && !decision.includes(tag)) broke.push('a CEO decision names one of his five reasons: new system, operations change, money spent, catastrophe, family health, or one-way door (rule 9c). If none fits, it is yours (rule 9e): decide it, write it in the wiki and keep working')
  if (shape === 1 && !problem.includes(tag)) broke.push('a Problem is only "problem (catastrophe):", "problem (other project):" or "problem (stuck):" (rules 9, 23). Anything else you fix yourself and keep working')
  if (!sources(head)) broke.push('give at least one bracketed source before "Tried first:"')
  if (!/\bTried first:/.test(prose)) broke.push('say "Tried first:" and what you tried: the wiki, Claude, Codex, the browser and Chrome, the web, a second and third way (rule 9f)')
  else {
    const tried = prose.split(/\bTried first:/)[1].replace(/Reply yes, or your own idea\.\s*$/, '').trim()
    if (!tried || /^(?:(?:everything|all of it|all tools|all the above)\b|\band\b|[\s,.;:!])+$/i.test(tried)) broke.push('Tried first names what you tried')
  }
  if (shape === 0 && !/\bMy pick:/.test(prose)) broke.push('a CEO decision names "My pick:" with the cost and time (rule 9)')
  if (shape === 0 && !/Reply yes, or your own idea\.\s*$/.test(reply)) broke.push('a CEO decision ends "Reply yes, or your own idea."')
  if (tag !== 'other project' && tag !== 'stuck' && !ceoFact && /\b(?:still (?:running|working|checking|building|being)|not (?:finished|done|live) yet|taking longer|has not finished|in progress|wait for (?:it|both|Codex|the)|is running|are running)\b/i.test(head)) broke.push('this is a progress report, not a CEO decision (rule 9b); keep working and send Done when it is done')
  if (/\b(?:may I|can I|should I|shall I) (?:open (?:the|a|this|that|your) (?:screen|tab|page|app|file|folder|window|notepad)|open notepad|push|deploy|carry on|keep going|go ahead|put (?:it|this|them|the \w+) live|move (?:the|this|a|that) (?:file|folder|note))\b/i.test(head) || (tag !== 'new system' && tag !== 'catastrophe' && /\bwhich (?:folder|file|tool|tab|branch)\b/i.test(head))) broke.push('opening a screen, putting approved work live, or picking a file, folder or tool are yours (rule 9e); do them and keep working')
  if (/\bis this (?:the plan|right|what you want)\b|\bapprove (?:it|this|the plan) again\b|\bstill (?:ok|okay|good) to\b/i.test(prose)) broke.push('an approved plan is never asked twice (rule 20); keep working')
  if (/^\s*Christopher, [A-Za-z ()]+:\s*(?:I'?m sorry|I am sorry|sorry)\b/i.test(reply)) broke.push('do not lead with sorry; fix it and note it in the next Done (rule 9e)')
}
if (shape < 0 && !/^\s*Christopher, (?:question|decision needed)\b/i.test(reply)) broke.push('open with one of his five replies word for word: "Christopher, CEO decision (reason):", "Christopher, problem (reason):", "Christopher, your click:", "Christopher, report (topic):" or the full Done line')
if (shape === 1 && !/problem \([a-z -]+\):\s*\S+(?:\s+\S+)+?.*?I recommend:/s.test(prose)) broke.push('a Problem reply must name the problem, then say "I recommend:"')
if (shape === 1 && !/Reply yes, or your own idea\.\s*$/.test(reply)) broke.push('a Problem reply must end "Reply yes, or your own idea."')
// A job with no live app (wiki or rules only) names the file to look at instead of a link.
if (shape === 2 && !/https?:\/\/|[A-Za-z]:\\|\.(?:md|html|mjs|js|json)\b/.test(prose)) broke.push('a Done reply must give the live link, or the file to look at')
if (shape === 4) {
  if (sources(prose) < 3) broke.push('a Report needs at least 3 bracketed sources (rule 9g)')
  const checkers = [...prose.matchAll(/^[ \t]*Checked by:[ \t]*([^\r\n]*)/gm)]
  if (!checkers.length || checkers.some((m) => !m[1].trim() || /^\s*(?:me|myself|this session|the same session|same session|no ?one|nobody|not yet|pending|none)\b|\b(?:and me|me and|myself|this session|same session|not yet|pending)\b/i.test(m[1]))) broke.push('a Report needs a "Checked by:" line naming who checked, other than the writer (rule 9g)')
  if (!/^[ \t]*My pick:[ \t]*\S[^\r\n]*/m.test(prose)) broke.push('a Report needs a "My pick:" line')
}
if ([0, 1, 4].includes(shape)) {
  // The opening line of a CEO decision is the decision itself, so it is read like a pick.
  const picks = [...prose.matchAll(/(?:\b(?:My pick|I recommend)|^\s*Christopher, CEO decision \([a-z -]+\)):[ \t]*([^\r\n]*)/gim)]
  if (picks.some((pick) => [...pick[1].matchAll(/\b(?:quit|abandon|give up|shelve|wind (?:it )?down|pause the (?:project|build|rebuild)|stop (?:the )?(?:rebuild|build|building|project)|go(?:ing)? back to (?:doing (?:it|this) )?(?:by hand|manually)|back to (?:\d+|one|two|three|four) hours? a day|run it by hand)\b/gi)].some((m) => {
    const before = pick[1].slice(0, m.index).match(/[a-z]+(?:'[a-z]+)?/gi) || []
    return !before.slice(-3).some((word) => /^(?:not|don't|never|no)$/i.test(word))
  }))) broke.push('never recommend quitting or going back to by hand (rule 48); find the best way to the goal')
}
for (const paragraph of prose.split(/\r?\n[ \t]*\r?\n/)) {
  if (/changed my answer|I now recommend|I was wrong|on second thought|I take that back|correction:|you are right|my advice is now/i.test(paragraph) && !sources(paragraph)) broke.push('say which new fact changed your answer, with its source (rule 12a)')
}
if (!broke.length) pass()
log(`sent back: ${broke.join('; ')}`)
process.stdout.write(JSON.stringify({ decision: 'block', reason: `Reply check: ${broke.join('; ')}. Rewrite it as one of his five replies: CEO decision, Problem, Click, Report or Done, or keep working.` }))
process.exit(0)
