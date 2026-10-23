// Check every shipped data file against its validator. Exit 1 if anything is invalid.
//   node tools/validate-data.ts
import { KINDS, load } from './kinds.ts';

let bad = 0;
for (const [name, kind] of Object.entries(KINDS)) {
  const list = load(kind.data);
  const mine = kind.owns ? list.filter(kind.owns) : list;
  const errors = mine.flatMap((e) => kind.errors(e, list));
  bad += errors.length;
  console.log(`${errors.length ? '✗' : '✓'} ${name.padEnd(10)} ${String(mine.length).padStart(5)} entries${errors.length ? `, ${errors.length} problem(s)` : ''}`);
  for (const e of errors.slice(0, 20)) console.log(`    ${e}`);
}
if (bad) {
  console.log(`\n${bad} problem(s). Regenerate the failing entries with --replace (never hand-edit generated data).`);
  process.exit(1);
}
