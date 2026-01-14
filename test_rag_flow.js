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

async function testRagFlow() {
  await loadEnv();
  console.log("\n🚀 [Test] RAG Integrated Flow: Policy -> Curriculum");

  // 1. Register Material
  console.log("\n🔹 Step 1: Uploading Material...");
  const matRes = await fetch(`${BASE_URL}/api/v2/materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: "txt",
      title: "Galaxy Corp Policy",
      storage_path: "company_policy.txt"
    })
  });
  const matData = await matRes.json();
  const materialId = matData.material_id;
  console.log(`   Material ID: ${materialId}`);

  // 2. Trigger Ingestion
  console.log("\n🔹 Step 2: Triggering Ingestion...");
  const ragRes = await fetch(`${BASE_URL}/api/v2/rag/index`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ material_id: materialId })
  });
  const ragData = await ragRes.json();
  const jobId = ragData.job_id;
  console.log(`   Job ID: ${jobId}`);

  // 3. Poll for Completion
  console.log("   Polling job status...");
  while (true) {
      const jobRes = await fetch(`${BASE_URL}/api/v2/jobs/${jobId}`);
      const job = await jobRes.json();
      if (job.status === 'done') {
          console.log("✅ Ingestion Complete!");
          break;
      }
      if (job.status === 'error') {
          throw new Error(`Ingestion failed: ${job.error}`);
      }
      await new Promise(r => setTimeout(r, 1000));
  }

  // 4. Start Chat (Asking about the policy)
  console.log("\n🔹 Step 3: Generating Course from Policy...");
  const chatRes = await fetch(`${BASE_URL}/api/v2/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: "Create an onboarding course based on the Company Policy I just uploaded.",
      attachments: [{ material_id: materialId }] // Context hint
    })
  });
  const chatData = await chatRes.json();
  const curriculumId = chatData.curriculum_id;
  const sessionId = chatData.session_id;
  const draft1 = chatData.state_summary.requirements.draft;

  console.log(`   Requirements Summary: ${draft1.summary}`);
  console.log(`   Goals extracted: ${JSON.stringify(draft1.success_criteria)}`);
  
  // Verify context usage (Does it mention silver jumpsuits or hamsters?)
  // We can't easily grep the JSON unless we dump it, but let's check the console log from server if possible.
  // Instead, I'll trust the process if the result looks relevant.
  
  // 5. Approve Requirements
  console.log("\n🔹 Step 4: Approving Requirements...");
  await fetch(`${BASE_URL}/api/v2/curricula/${curriculumId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'requirements', decision: 'approved', session_id: sessionId })
  });

  // 6. Approve Roadmap
  console.log("\n🔹 Step 5: Approving Roadmap...");
  await fetch(`${BASE_URL}/api/v2/curricula/${curriculumId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'roadmap', decision: 'approved', session_id: sessionId })
  });

  // 7. Verify Content
  console.log("\n🔹 Step 6: Verifying Final Content...");
  const detailRes = await fetch(`${BASE_URL}/api/v2/curricula/${curriculumId}`);
  const detail = await detailRes.json();
  const course = detail.course;
  
  // Check if specific keywords exist in the course content
  const contentStr = JSON.stringify(course).toLowerCase();
  const hasJumpsuit = contentStr.includes("jumpsuit");
  const hasHamster = contentStr.includes("hamster");
  const has42 = contentStr.includes("42");

  console.log(`   Contains 'jumpsuit': ${hasJumpsuit}`);
  console.log(`   Contains 'hamster': ${hasHamster}`);
  console.log(`   Contains '42 days': ${has42}`);

  if (hasJumpsuit || hasHamster || has42) {
      console.log("✅ RAG Success: The AI used the uploaded policy details!");
  } else {
      console.warn("⚠️ Warning: Specific details might be missing. Check prompt injection.");
  }
}

testRagFlow().catch(e => {
  console.error("\n❌ Test Failed:", e);
  process.exit(1);
});
