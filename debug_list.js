
import fetch from 'node-fetch';
import fs from 'fs/promises';

const loadEnv = async () => {
  try {
    const raw = await fs.readFile('.env.local', 'utf8');
    raw.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2 && !line.trim().startsWith('#')) {
        const key = parts[0].trim().replace(/^export\s+/, '');
        const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    });
  } catch (e) { console.log("No .env.local found."); }
};

const BASE_URL = 'http://localhost:3006';

async function checkList() {
  await loadEnv();
  const res = await fetch(`${BASE_URL}/api/v2/curricula`);
  const data = await res.json();
  console.log("Count:", data.curricula?.length);
  if (data.curricula?.length) {
      console.log("First item:", JSON.stringify(data.curricula[0], null, 2));
  }
}

checkList();
