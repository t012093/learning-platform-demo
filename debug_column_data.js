import { getPool } from './server/db.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function deepInspect() {
    const pool = getPool();
    if (!pool) return;

    const courseId = '35f8d075-ca96-4179-8412-3672413c79b5'; // Blender 3D

    try {
        const result = await pool.query(`
            SELECT 
                c.id, c.title, c.content as old_content, 
                v.content_json as new_content
            FROM curricula c
            LEFT JOIN curriculum_versions v ON c.current_version_id = v.id
            WHERE c.id = $1;
        `, [courseId]);

        const row = result.rows[0];
        console.log(`Course: ${row.title}`);
        console.log(`- old_content has modules?: ${!!row.old_content?.modules}`);
        if (row.old_content?.modules) console.log(`  count: ${row.old_content.modules.length}`);
        
        console.log(`- new_content has modules?: ${!!row.new_content?.modules}`);
        if (row.new_content?.modules) console.log(`  count: ${row.new_content.modules.length}`);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

deepInspect();
