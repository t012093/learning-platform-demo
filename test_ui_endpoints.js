
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

async function testUiEndpoints() {
  await loadEnv();
  console.log("🚀 Testing UI Endpoints...");

  // 1. List Courses
  const listRes = await fetch(`${BASE_URL}/api/v2/curricula`);
  if (!listRes.ok) throw new Error(`List failed: ${listRes.status}`);
  const listData = await listRes.json();
  
  console.log(`✅ List API returned ${listData.curricula?.length || 0} items.`);
  
  if (listData.curricula?.length > 0) {
      const firstId = listData.curricula[0].id;
      console.log(`   First ID: ${firstId}`);
      
      // 2. Detail API
      const detailRes = await fetch(`${BASE_URL}/api/v2/curricula/${firstId}`);
      if (!detailRes.ok) throw new Error(`Detail failed: ${detailRes.status}`);
      const detailData = await detailRes.json();
      
      console.log(`✅ Detail API title: ${detailData.curriculum.title}`);
      if (detailData.course) {
          console.log("   Content JSON present.");
      } else {
          console.warn("   Content JSON missing (maybe draft?)");
      }
  } else {
      console.warn("   No courses found. Run generation test first.");
  }
}

testUiEndpoints().catch(e => {
    console.error("❌ UI Endpoint Test Failed:", e);
    process.exit(1);
});
