import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function setupDebugEndpoint(app) {
    app.use(express.json({ limit: '10mb' }));
    
    app.post('/debug-log', (req, res) => {
        const { filename, content } = req.body;
        if (!filename || !content) {
            return res.status(400).json({ error: 'Missing filename or content' });
        }
        
        // Sanitize filename
        const safeFilename = filename.replace(/[^a-zA-Z0-9\-_.]/g, '');
        const filepath = path.join(__dirname, '..', '..', 'debug-logs', safeFilename);
        
        // Ensure debug-logs directory exists
        const debugDir = path.join(__dirname, '..', '..', 'debug-logs');
        if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
        }
        
        fs.writeFile(filepath, content, (err) => {
            if (err) {
                console.error('Error saving debug log:', err);
                return res.status(500).json({ error: 'Failed to save debug log' });
            }
            console.log(`Debug log saved: ${safeFilename}`);
            res.json({ success: true, filename: safeFilename });
        });
    });
}