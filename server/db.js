import pg from 'pg';
const { Pool } = pg;

// Environment variable helper
export const PHASE1_USER_ID = process.env.PHASE1_USER_ID || '00000000-0000-0000-0000-000000000001';

let pool = null;

export const getPool = () => {
    if (pool) return pool;
    
    const connectionString = process.env.DATABASE_URL_PHASE1;
    if (!connectionString) {
        console.warn("DATABASE_URL_PHASE1 is not set. DB features will fail.");
        return null;
    }
    
    pool = new Pool({ connectionString });
    
    // Add global error handler to prevent crash on idle client errors
    pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        // Don't exit process, just log
    });

    return pool;
};

// Helper to ensure the user exists (used in many routes)
export const ensurePhase1User = async (client) => {
    await client.query(
        'insert into auth.users (id) values ($1) on conflict do nothing',
        [PHASE1_USER_ID]
    );
};
