import pg from 'pg';
import { GoogleGenAI } from "@google/genai";
import fs from 'fs/promises';
import { createRequire } from 'module';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

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

const chunkText = async (text, chunkSize = 1000, overlap = 200) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap: overlap,
    });
    return await splitter.splitText(text);
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
        const chunks = await chunkText(text);
        
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
        throw e;
    }
};

export const retrieveContext = async (query, limit = 3, userId) => {
    const pool = getPool();
    if (!pool) return [];
    
    try {
        const queryVector = await generateEmbedding(query);

        const result = await pool.query(
            `SELECT c.content, (c.embedding <=> $1::vector) as distance
             FROM material_chunks c
             JOIN materials m ON c.material_id = m.id
             WHERE m.user_id = $2
             ORDER BY distance ASC
             LIMIT $3`,
            [JSON.stringify(queryVector), userId, limit]
        );
        
        return result.rows.map(row => row.content);
    } catch (e) {
        console.error("Retrieval failed:", e);
        return [];
    }
};

export const getFullMaterialText = async (materialId) => {
    const pool = getPool();
    if (!pool) return "";
    
    try {
        const result = await pool.query(
            `SELECT content FROM material_chunks 
             WHERE material_id = $1 
             ORDER BY chunk_index ASC`,
            [materialId]
        );
        return result.rows.map(row => row.content).join("\n");
    } catch (e) {
        console.error("Full text retrieval failed:", e);
        return "";
    }
};

export const getMaterialDetails = async (materialId) => {
    const pool = getPool();
    if (!pool) return null;
    
    try {
        const result = await pool.query(
            `SELECT storage_path, type FROM materials WHERE id = $1`,
            [materialId]
        );
        if (result.rows.length === 0) return null;
        return result.rows[0];
    } catch (e) {
        console.error("Material details retrieval failed:", e);
        return null;
    }
};