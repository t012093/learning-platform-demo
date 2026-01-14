import pg from 'pg';
import { GoogleGenAI } from "@google/genai";
import fs from 'fs/promises';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const { Pool } = pg;

let _pool = null;
const getPool = () => {
    if (_pool) return _pool;
    const phase1DatabaseUrl = process.env.DATABASE_URL_PHASE1;
    if (!phase1DatabaseUrl) return null;
    _pool = new Pool({ connectionString: phase1DatabaseUrl });
    return _pool;
};

const getApiKey = () => process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const getClient = () => {
    const key = getApiKey();
    return key ? new GoogleGenAI(key) : null;
};

// --- Ingestion ---

const extractText = async (filePath, mimeType) => {
    if (mimeType === 'application/pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    }
    // Default to text
    return await fs.readFile(filePath, 'utf8');
};

const chunkText = (text, chunkSize = 1000, overlap = 100) => {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        start += chunkSize - overlap;
    }
    return chunks;
};

const generateEmbedding = async (text) => {
    const genAI = getClient();
    if (!genAI) throw new Error("Gemini API Key missing");
    
    const result = await genAI.models.embedContent({
        model: "text-embedding-004",
        contents: [{ parts: [{ text }] }]
    });

    return result.embeddings[0].values; 
};

export const ingestMaterial = async (materialId, filePath, mimeType, userId) => {
    const pool = getPool();
    if (!pool) throw new Error("DB not configured");
    
    try {
        const text = await extractText(filePath, mimeType);
        const chunks = chunkText(text);
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM material_chunks WHERE material_id = $1', [materialId]);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const vector = await generateEmbedding(chunk);
                
                await client.query(
                    `INSERT INTO material_chunks 
                    (material_id, chunk_index, content, embedding, token_count)
                    VALUES ($1, $2, $3, $4, $5)`,
                    [materialId, i, chunk, vector, chunk.length]
                );
            }
            
            await client.query('UPDATE materials SET status = $1, updated_at = NOW() WHERE id = $2', ['ready', materialId]);
            await client.query('COMMIT');
            console.log(`Ingested material ${materialId}: ${chunks.length} chunks`);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        console.error("Ingestion failed:", e);
        // materials table doesn't have error column, so just log it.
        throw e;
    }
};

export const retrieveContext = async (query, limit = 5, userId) => {
    const pool = getPool();
    if (!pool) return [];
    
    try {
        const queryVector = await generateEmbedding(query);

        const result = await pool.query(
            `SELECT c.content, (c.embedding <=> $1) as distance
             FROM material_chunks c
             JOIN materials m ON c.material_id = m.id
             WHERE m.user_id = $2
             ORDER BY distance ASC
             LIMIT $3`,
            [queryVector, userId, limit]
        );
        
        return result.rows.map(row => row.content);
    } catch (e) {
        console.error("Retrieval failed:", e);
        return [];
    }
};