import { getPool } from './server/db.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// --- Mocking functions from the codebase ---
const isVibeCodingCurriculum = (payload) => {
  if (!payload || typeof payload !== 'object') return false;
  return payload.ui_template_id === 'vibe_coding' && Array.isArray(payload.modules);
};

async function debugApi() {
    const pool = getPool();
    if (!pool) return;

    // Use the latest course ID that has content
    const courseId = '68201318-96ca-4cf9-9523-b2d685b64958'; 

    try {
        const result = await pool.query(`
            SELECT c.*, v.content_json, v.status
            FROM curricula c
            LEFT JOIN curriculum_versions v ON c.current_version_id = v.id
            WHERE c.id = $1
        `, [courseId]);

        const row = result.rows[0];
        const finalContent = row.content_json || row.content;

        // Current backend response logic (after my latest "Flatten" fix)
        const responseData = {
            ...row,
            ...(typeof finalContent === 'object' ? finalContent : {})
        };

        console.log("--- Debug: Backend Response Structure ---");
        console.log(`Course ID: ${responseData.id}`);
        console.log(`Title: ${responseData.title}`);
        console.log(`UI Template ID (root): ${responseData.ui_template_id}`);
        console.log(`Modules exists at root?: ${Array.isArray(responseData.modules)}`);
        
        const isVibe = isVibeCodingCurriculum(responseData);
        console.log(`\nDoes it pass isVibeCodingCurriculum? : ${isVibe ? "✅ YES" : "❌ NO"}`);

        if (!isVibe) {
            console.log("\n--- Troubleshooting ---");
            if (responseData.ui_template_id !== 'vibe_coding') {
                console.log(`- Problem: ui_template_id is '${responseData.ui_template_id}', expected 'vibe_coding'`);
            }
            if (!Array.isArray(responseData.modules)) {
                console.log("- Problem: modules is NOT an array at the root level.");
                console.log("  Actual keys at root:", Object.keys(responseData));
            }
        } else {
            console.log("\n✅ Perfect. This structure will display the path in the UI.");
        }

    } catch (e) {
        console.error("Debug failed:", e);
    } finally {
        await pool.end();
    }
}

debugApi();
