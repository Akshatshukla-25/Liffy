import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
const URL = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/dist/exercises.json`;
const OUT_PATH = path.resolve(__dirname, '../assets/exercises.json');

function mapCategory(cat, equipment) {
  if (cat === 'stretching') return 'mobility';
  if (cat === 'cardio') return 'cardio';
  if (equipment === 'body only') return 'bodyweight';
  return 'strength';
}

async function main() {
  console.log(`Fetching exercise catalogue from ${URL}...`);
  const res = await fetch(URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch exercises: ${res.status} ${res.statusText}`);
  }
  const rawList = await res.json();

  const mapped = rawList.map((item) => ({
    id: item.id,
    name: item.name,
    category: mapCategory(item.category, item.equipment),
    equipment: item.equipment || null,
    primaryMuscles: Array.isArray(item.primaryMuscles) ? item.primaryMuscles : [],
    secondaryMuscles: Array.isArray(item.secondaryMuscles) ? item.secondaryMuscles : [],
  }));

  const outDir = path.dirname(OUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(mapped, null, 2), 'utf-8');
  console.log(`Successfully wrote ${mapped.length} exercises to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
