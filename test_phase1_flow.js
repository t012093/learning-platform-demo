
import fetch from 'node-fetch'; // or built-in fetch if Node 18+
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

// Helper to load env for the test script itself
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
  } catch (e) { console.log("No .env.local found, assuming env vars set."); }
};

const BASE_URL = 'http://localhost:3006';
const USER_ID = '00000000-0000-0000-0000-000000000001'; // Matches server.js default

async function testFlow() {
  await loadEnv();
  
  // 1. Start Session & Generate Requirements
  console.log("\n🚀 Step 1: Start Chat & Generate Requirements...");
  const chatRes = await fetch(`${BASE_URL}/api/v2/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: "I want to learn Python for Data Science, focusing on pandas and visualization." })
  });
  
  if (!chatRes.ok) throw new Error(`Chat failed: ${chatRes.statusText} ${await chatRes.text()}`);
  const chatData = await chatRes.json();
  console.log("✅ Chat Response:", JSON.stringify(chatData, null, 2));
  
  const curriculumId = chatData.curriculum_id;
  const sessionId = chatData.session_id;
  
  if (!curriculumId || !sessionId) throw new Error("Missing ID in response");

  // 2. Approve Requirements -> Triggers Roadmap
  console.log(`\n🚀 Step 2: Approve Requirements for Curriculum ${curriculumId}...`);
  const approveReqRes = await fetch(`${BASE_URL}/api/v2/curricula/${curriculumId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      stage: 'requirements', 
      decision: 'approved', 
      session_id: sessionId,
      feedback_text: "Looks good, proceed."
    })
  });
  
  if (!approveReqRes.ok) throw new Error(`Approve Requirements failed: ${approveReqRes.statusText}`);
  const reqData = await approveReqRes.json();
  console.log("✅ Requirements Approved. Next Pending:", reqData.pending_approval);

  // 3. Approve Roadmap -> Triggers Curriculum
  console.log(`\n🚀 Step 3: Approve Roadmap...`);
  const approveRoadmapRes = await fetch(`${BASE_URL}/api/v2/curricula/${curriculumId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      stage: 'roadmap', 
      decision: 'approved', 
      session_id: sessionId 
    })
  });
  
  if (!approveRoadmapRes.ok) throw new Error(`Approve Roadmap failed: ${approveRoadmapRes.statusText}`);
  const roadmapData = await approveRoadmapRes.json();
  console.log("✅ Roadmap Approved. Next Pending:", roadmapData.pending_approval);

  // 4. Verify Final Curriculum in DB
  console.log(`\n🚀 Step 4: Verify Full Curriculum Data...`);
  const detailRes = await fetch(`${BASE_URL}/api/v2/curricula/${curriculumId}`);
  const detailData = await detailRes.json();
  
  if (!detailData.ok) throw new Error("Failed to fetch detail");
  const course = detailData.course;
  console.log("✅ Final Course Title:", course.title);
  console.log("✅ Modules Count:", course.modules?.length);
  console.log("✅ First Lesson:", JSON.stringify(course.modules?.[0]?.lessons?.[0], null, 2));
  
  if (course.ui_template_id !== 'vibe_coding') throw new Error("Template mismatch!");
}

testFlow().catch(e => {
  console.error("❌ Test Failed:", e);
  process.exit(1);
});
