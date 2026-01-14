
import fetch from 'node-fetch';
import fs from 'fs/promises';

// Helper to load env
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

async function testReviseFlow() {
  await loadEnv();
  
  console.log("\n🚀 [Test] LangGraph Conditional Edge: Revise Loop");

  // 1. Start Chat (Initial Request)
  console.log("\n🔹 Step 1: Request 'Basic Python'...");
  const chatRes = await fetch(`${BASE_URL}/api/v2/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: "I want to learn Basic Python for beginners." })
  });
  const chatData = await chatRes.json();
  const curriculumId = chatData.curriculum_id;
  const sessionId = chatData.session_id;
  const draft1 = chatData.state_summary.requirements.draft;
  
  console.log(`   ID: ${curriculumId}`);
  console.log(`   Draft 1 Level: ${draft1.level}`);
  console.log(`   Pending: ${chatData.pending_approval}`);

  if (chatData.pending_approval !== 'requirements') throw new Error("Expected requirements pending");

  // 2. Request Revision (Trigger Conditional Edge)
  console.log("\n🔹 Step 2: Sending REVISE decision ('Make it Advanced')...");
  const reviseRes = await fetch(`${BASE_URL}/api/v2/curricula/${curriculumId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: 'requirements',
      decision: 'revise',
      session_id: sessionId,
      feedback_text: "Actually, make it an Advanced Python course for experts."
    })
  });
  const reviseData = await reviseRes.json();
  const draft2 = reviseData.state_summary.requirements.draft;

  console.log(`   Draft 2 Level: ${draft2.level}`);
  console.log(`   Pending: ${reviseData.pending_approval}`);

  // Validation
  if (reviseData.pending_approval !== 'requirements') throw new Error("Graph did not loop back to requirements!");
  if (draft2.level !== 'advanced') throw new Error(`AI failed to update level. Got ${draft2.level}, expected advanced.`);
  console.log("✅ Loopback Successful: Graph returned to generation node with new feedback.");

  // 3. Approve New Draft (Trigger Next Edge)
  console.log("\n🔹 Step 3: Sending APPROVED decision...");
  const approveRes = await fetch(`${BASE_URL}/api/v2/curricula/${curriculumId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: 'requirements',
      decision: 'approved',
      session_id: sessionId
    })
  });
  const approveData = await approveRes.json();
  
  console.log(`   Pending: ${approveData.pending_approval}`);
  
  if (approveData.pending_approval !== 'roadmap') throw new Error("Graph did not proceed to roadmap!");
  console.log("✅ Progression Successful: Graph moved to roadmap node.");

  console.log("\n🎉 Conditional Branching Test PASSED!");
}

testReviseFlow().catch(e => {
  console.error("\n❌ Test Failed:", e);
  process.exit(1);
});
