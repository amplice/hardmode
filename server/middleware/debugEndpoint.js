/**
 * @fileoverview debugEndpoint - Server debugging and monitoring utilities
 * 
 * ARCHITECTURE ROLE:
 * - Provides HTTP endpoints for server debugging and monitoring
 * - Exposes anti-cheat statistics for security analysis
 * - Handles client debug log uploads for issue investigation
 * - Integrates with development tooling and monitoring systems
 * 
 * DEBUG LOG PIPELINE:
 * Client-to-server debug data flow:
 * 1. Client DebugLogger captures game state and events
 * 2. POST /debug-log receives and stores client debug data
 * 3. Server stores logs with sanitized filenames
 * 4. Development team analyzes logs for issue reproduction
 * 
 * ANTI-CHEAT MONITORING:
 * Security statistics endpoint:
 * - GET /anticheat-stats exposes SessionAntiCheat metrics
 * - Tracks violation counts, player behavior patterns
 * - Enables real-time monitoring of game security
 * - Integration with external monitoring systems
 * 
 * SECURITY CONSIDERATIONS:
 * - Filename sanitization prevents directory traversal
 * - Content size limits prevent DoS attacks
 * - Debug logs stored in isolated directory
 * - Production deployment should restrict access
 * 
 * DEVELOPMENT INTEGRATION:
 * - Client debug dumps automatically uploaded
 * - Server-side log aggregation for team analysis
 * - Anti-cheat tuning based on statistics
 * - Issue reproduction with captured state data
 * 
 * MONITORING CAPABILITIES:
 * - Real-time anti-cheat violation tracking
 * - Player behavior analysis via debug logs
 * - Server performance metrics exposure
 * - Development workflow automation support
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function setupDebugEndpoint(app, systems = {}) {
    app.use(express.json({ limit: '10mb' }));
    
    // Anti-cheat stats endpoint
    if (systems.sessionAntiCheat) {
        app.get('/anticheat-stats', (req, res) => {
            const stats = systems.sessionAntiCheat.getStats();
            res.json(stats);
        });
    }
    
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