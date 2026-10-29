// Cloud-only PreToolUse hook. No shell execution, dependencies, or network.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const REASON = "Cloud sessions never put work live. Push your own claude/ branch and stop. Christopher's laptop runs Codex and the six checks before it goes live (rule book, .claude/ceo/SETTINGS.md).";

// Preserve quoted arguments; only unquoted shell separators split commands.
export function commandSegments(command) {
  const segments = []; let words = [], word = '', active = false, quote = '';
  const flushWord = () => { if (active) words.push(word); word = ''; active = false; };
  const flush = () => { flushWord(); if (words.length) segments.push(words); words = []; };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === '\\' && quote !== "'") {
      const next = command[++i];
      if (next === undefined) throw new Error('Unfinished escape');
      if (next !== '\n') { word += next; active = true; }
    } else if (quote) {
      if (c === quote) quote = ''; else word += c;
    } else if (c === '"' || c === "'") { quote = c; active = true;
    } else if (';&|\n()'.includes(c)) { flush();
    } else if (/\s/.test(c)) { flushWord();
    } else if (c === '#' && !active) {
      while (i + 1 < command.length && command[i + 1] !== '\n') i++;
    } else { word += c; active = true; }
  }
  if (quote) throw new Error('Unclosed quote');
  flush(); return segments;
}

function gitText(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, timeout: 3000 });
  return result.status === 0 ? result.stdout.trim() : '';
}

function branchState(cwd) {
  const remote = gitText(cwd, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  return {
    defaults: remote.startsWith('origin/') ? [remote.slice(7)] : ['main', 'master'],
    current: gitText(cwd, ['branch', '--show-current']),
    upstream: gitText(cwd, ['rev-parse', '--abbrev-ref', '@{u}']),
  };
}

function destination(ref) {
  const clean = ref.replace(/^\+/, '');
  return (clean.includes(':') ? clean.slice(clean.lastIndexOf(':') + 1) : clean).replace(/^refs\/heads\//, '');
}

function unsafePush(args, state, nested = false) {
  let force = false, remoteSeen = false, deleteMode = false;
  const refs = [];
  const valueOptions = new Set(['--repo', '--receive-pack', '--exec', '--push-option', '-o']);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all' || arg === '--mirror') return true;
    if (arg === '--delete' || arg === '-d') { deleteMode = true; continue; }
    if (arg === '-f' || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(arg) || /^--force(?:-with-lease)?(?:=|$)/.test(arg)) { force = true; continue; }
    if (valueOptions.has(arg)) { if (arg === '--repo') remoteSeen = true; i++; continue; }
    if (arg.startsWith('--repo=')) { remoteSeen = true; continue; }
    if (arg === '--') {
      for (const rest of args.slice(i + 1)) { if (!remoteSeen) remoteSeen = true; else refs.push(rest); }
      break;
    }
    if (arg.startsWith('-')) continue;
    if (!remoteSeen) remoteSeen = true; else refs.push(arg);
  }
  const targets = refs.length ? refs.map(ref => {
    const target = destination(ref);
    return target === 'HEAD' || target === '@' ? state.current : target;
  }) : [state.current];
  if (!refs.length && state.upstream.startsWith('origin/') && state.defaults.includes(state.upstream.slice(7))) return true;
  if (nested && targets.some(target => !target || /[$`*?{}]/.test(target) || target === 'HEAD')) return true;
  if (targets.some(target => state.defaults.includes(target))) return true;
  // A leading '+' is itself a force refspec, even without --force.
  return targets.some((target, i) => (force || refs[i]?.startsWith('+')) && !target.startsWith('claude/')) ||
    (deleteMode && targets.some(target => state.defaults.includes(target)));
}

function unsafeApi(args, state) {
  let method = '', fields = [], path = '';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-X' || a === '--method') method = (args[++i] || '').toUpperCase();
    else if (['-H', '--header', '--hostname', '--input', '--jq', '-q', '--template', '-t'].includes(a)) i++;
    else if (/^(?:--method=|-X.)/.test(a)) method = a.replace(/^(?:--method=|-X)/, '').toUpperCase();
    else if (['-f', '-F', '--field', '--raw-field'].includes(a)) fields.push(args[++i] || '');
    else if (/^(?:--(?:raw-)?field=|-[fF].)/.test(a)) fields.push(a.replace(/^(?:--(?:raw-)?field=|-[fF])/, ''));
    else if (!a.startsWith('-') && !path) path = a;
  }
  method ||= fields.length || args.includes('--input') ? 'POST' : 'GET';
  if (!['PATCH', 'PUT', 'POST', 'DELETE'].includes(method)) return false;
  try { path = decodeURIComponent(path); } catch { return true; }
  if (/\/(?:merges|pulls\/\d+\/merge)(?:[/?]|$)/.test(path)) return true;
  const ref = /\/git\/refs?\/heads\/(.*?)(?:\?|$)/.exec(path);
  if (ref && ['main', 'master', ...state.defaults].includes(ref[1])) return true;
  if (/\/contents(?:\/|\?|$)/.test(path)) {
    const branches = fields.filter(f => f.startsWith('branch=')).map(f => f.slice(7));
    return args.some(a => a === '--input' || a.startsWith('--input=')) || branches.length !== 1 || !branches[0] || /[$`]/.test(branches[0]) || ['HEAD', 'main', 'master', ...state.defaults].includes(destination(branches[0]));
  }
  return false;
}

// Substitutions execute even inside double quotes. Never execute shell text here.
function substitutions(command) {
  const found = []; let quote = '';
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === '\\' && quote !== "'") { i++; continue; }
    if (c === "'" && quote !== '"') { quote = quote ? '' : "'"; continue; }
    if (quote === "'") continue;
    if (c === '"') { quote = quote ? '' : '"'; continue; }
    if (c === '`') {
      let body = '', closed = false;
      while (++i < command.length) { if (command[i] === '`') { closed = true; break; } body += command[i]; }
      if (!closed) throw new Error('Unclosed substitution');
      found.push(body);
    } else if (c === '$' && command[i + 1] === '(') {
      let start = i + 2, depth = 1; i++;
      while (++i < command.length && depth) {
        if (command[i] === '(') depth++;
        else if (command[i] === ')') depth--;
      }
      if (depth) throw new Error('Unclosed substitution');
      found.push(command.slice(start, i - 1)); i--;
    }
  }
  return found;
}

export function shouldDeny(input, { remote = process.env.CLAUDE_CODE_REMOTE, cwd = process.cwd() } = {}) {
  if (remote !== 'true') return false;
  try {
    const { tool_name: name, tool_input: data = {} } = input;
    const mcp = /^mcp__.*github.*__(merge_pull_request|push_files|create_or_update_file|delete_file)$/i.exec(name);
    if (mcp) {
      if (mcp[1].toLowerCase() === 'merge_pull_request') return true;
      const branch = typeof data.branch === 'string' ? destination(data.branch) : '';
      return !branch || ['main', 'master', ...branchState(cwd).defaults].includes(branch);
    }
    if (name !== 'Bash' || typeof data.command !== 'string') return false;
    function inspect(command, commandCwd, nested = false, depth = 0) {
    try {
    if (depth > 20) return true;
    for (const body of substitutions(command)) if (inspect(body, commandCwd, true, depth + 1)) return true;
    for (let words of commandSegments(command)) {
      // Common shell wrappers do not change the command being checked.
      while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0] || '')) words = words.slice(1);
      if (words[0] === 'env') {
        words = words.slice(1);
        while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0] || '')) words = words.slice(1);
      }
      if (words[0] === 'command') words = words.slice(1);
      if (words[0] === 'cd' && words[1]) { commandCwd = resolve(commandCwd, words[1]); continue; }
      const executable = (words[0] || '').split(/[\\/]/).pop().replace(/\.exe$/i, '');
      if (['bash', 'sh', 'dash', 'zsh', 'ksh'].includes(executable)) {
        const flag = words.findIndex((w, i) => i > 0 && /^-[a-z]*c[a-z]*$/.test(w));
        if (flag >= 0 && inspect(words[flag + 1] || '', commandCwd, true, depth + 1)) return true;
      }
      if (executable === 'eval' && inspect(words.slice(1).join(' '), commandCwd, true, depth + 1)) return true;
      if (executable === 'gh') {
        const args = words.slice(1);
        if (args.some((a, i) => a === 'pr' && args[i + 1] === 'merge')) return true;
        if (args.includes('api') && unsafeApi(args.slice(args.indexOf('api') + 1), branchState(commandCwd))) return true;
      }
      if (executable !== 'git') continue;
      let i = 1, gitCwd = commandCwd;
      for (; i < words.length && words[i].startsWith('-'); i++) {
        if (words[i] === '-C') gitCwd = resolve(gitCwd, words[++i]);
        else if (['-c', '--git-dir', '--work-tree', '--namespace'].includes(words[i])) i++;
      }
      if (words[i] === 'push' && unsafePush(words.slice(i + 1), branchState(gitCwd), nested)) return true;
    }
    return false;
    } catch { return nested; }
    }
    return inspect(data.command, cwd);
  } catch { return false; } // Malformed hook input must not block ordinary work.
  return false;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.env.CLAUDE_CODE_REMOTE === 'true' && shouldDeny(JSON.parse(readFileSync(0, 'utf8')))) {
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: REASON } }));
    }
  } catch { /* Parse error = allow. */ }
}
