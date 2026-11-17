// Reads TODO.md and the three ROOM.md files on this PC and writes HQ.json.
// The Build screen shows HQ.json under Command center. Run it before each deploy:
//   node scripts/hq-sync.mjs
// Paths can be changed with HQ_TODO and HQ_ROOMS (the folder that holds hired-abroad, uns, ladder).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TODO = process.env.HQ_TODO || 'D:\\Hired Abroad\\HB_MASTER_HANDOFF\\TODO.md';
const ROOMS = process.env.HQ_ROOMS || 'D:\\Projects';
const ROOM_LIST = [['hired-abroad', 'Hired Abroad', 'Priority'], ['uns', 'UNS', 'Running'], ['ladder', 'The Ladder', 'On hold']];
const SKIP_LABELS = ['Client'];

function read(file) { return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'); }

function parseTodo(text) {
  const tasks = [];
  let section = '', priority = '', kind = 'task';
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    let m = line.match(/^##\s+(.*)$/);
    if (m) {
      const h = m[1], pm = h.match(/^(P\d)\.\s*(.*)$/);
      priority = pm ? pm[1] : '';
      section = (pm ? pm[2] : h).replace(/\s*\(.*\)\s*$/, '').trim();
      kind = /waiting/i.test(h) ? 'Waiting' : /parked/i.test(h) ? 'Parked' : 'task';
      continue;
    }
    m = line.match(/^-\s+\[([ xX])\]\s+(.*)$/);
    if (m && section) { tasks.push({ priority, section, task: m[2], status: m[1] === ' ' ? 'Open' : 'Done' }); continue; }
    m = line.match(/^-\s+(.*)$/);
    if (m && section && kind !== 'task') tasks.push({ priority, section, task: m[1], status: kind });
  }
  return tasks;
}

function parseRoom(text) {
  const items = [];
  for (const raw of text.split('\n')) {
    const m = raw.replace(/\s+$/, '').match(/^-\s+([^:]+):\s*(.*)$/);
    if (!m) continue;
    const label = m[1].trim();
    if (SKIP_LABELS.includes(label)) continue;
    items.push({ label, value: m[2].replace(/`/g, '') });
  }
  return items;
}

const out = {
  updated: new Date().toISOString().slice(0, 10),
  tasks: parseTodo(read(TODO)),
  rooms: ROOM_LIST.map(([key, name, tag]) => ({ key, name, tag, items: parseRoom(read(path.join(ROOMS, key, 'ROOM.md'))) }))
};
fs.writeFileSync(path.join(here, '..', 'HQ.json'), JSON.stringify(out, null, 2) + '\n');
console.log('HQ.json written: ' + out.tasks.length + ' tasks, ' + out.rooms.length + ' rooms.');
