import fs from 'node:fs';
import path from 'node:path';

const planPath = path.resolve('.cursor/plan-activo.md');
const statePath = path.resolve('.cursor/hooks/state/seguir-plan.json');

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', () => resolve(''));
  });
}

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
}

function readText(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function isActive(text) {
  const match = text.match(/^activo:\s*(true|false)\s*$/m);
  return match?.[1] === 'true';
}

function setActive(text, value) {
  if (!/^activo:\s*(true|false)\s*$/m.test(text)) return text;
  return text.replace(/^activo:\s*(true|false)\s*$/m, `activo: ${value}`);
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function planWasUpdatedAfter(state) {
  if (!state.updatedAt) return true;
  try {
    return fs.statSync(planPath).mtimeMs > Date.parse(state.updatedAt);
  } catch {
    return true;
  }
}

function clearState() {
  try {
    fs.unlinkSync(statePath);
  } catch {
    // No había sesión atada.
  }
}

function deactivate() {
  try {
    const text = readText(planPath);
    const next = setActive(text, false);
    if (next !== text) fs.writeFileSync(planPath, next);
  } catch {
    // El plan no está: no hay nada que apagar.
  }
  clearState();
}

function firstOpenItem(text) {
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^\s*[-*]\s+\[([ xX!])\]\s+(.+?)\s*$/);
    if (!match) continue;
    const mark = match[1];
    if (mark === 'x' || mark === 'X') continue;
    return { blocked: mark === '!', text: match[2] };
  }
  return null;
}

function followup(itemText) {
  return [
    'Continuá la implementación iterativa del plan en .cursor/plan-activo.md.',
    'Leé y seguí .cursor/skills/seguir-plan/SKILL.md.',
    '',
    'El punto anterior ya terminó. Hacé solamente este siguiente punto y después parate:',
    itemText,
    '',
    'Implementá y verificá este punto antes de marcarlo [x] en .cursor/plan-activo.md.',
    'Si no podés completarlo, marcalo [!] y escribí una línea «bloqueo:» debajo.',
    'No empieces el punto siguiente.',
  ].join('\n');
}

const raw = await readStdin();
let payload = {};
try {
  payload = raw.trim() ? JSON.parse(raw) : {};
} catch {
  emit({});
  process.exit(0);
}

const status = payload.status;
const conversationId = payload.conversation_id || payload.conversationId || '';

if (status === 'aborted') {
  const state = loadState();
  const ownsRun = !conversationId || !state.conversationId || state.conversationId === conversationId;
  if (ownsRun) deactivate();
  emit({});
  process.exit(0);
}

if (status !== 'completed') {
  emit({});
  process.exit(0);
}

let plan = '';
try {
  plan = readText(planPath);
} catch {
  emit({});
  process.exit(0);
}

if (!isActive(plan)) {
  emit({});
  process.exit(0);
}

const next = firstOpenItem(plan);
if (!next || next.blocked) {
  deactivate();
  emit({});
  process.exit(0);
}

const state = loadState();
if (conversationId && state.conversationId && state.conversationId !== conversationId) {
  if (!planWasUpdatedAfter(state)) {
    emit({});
    process.exit(0);
  }
  saveState({ conversationId, updatedAt: new Date().toISOString() });
}

if (conversationId && state.conversationId !== conversationId) {
  saveState({ conversationId, updatedAt: new Date().toISOString() });
}

emit({ followup_message: followup(next.text) });
