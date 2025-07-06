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

import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

// Debug log request body structure
interface DebugLogRequest {
    filename: string;
    content: string;
}

// Systems that can be passed to debug endpoint
interface DebugSystems {
    sessionAntiCheat?: {
        getStats(): any;
    };
}

// Get directory path - use process.cwd() for TypeScript compatibility
const getProjectRoot = () => process.cwd();

export function setupDebugEndpoint(app: any, systems: DebugSystems = {}): void {
    app.use(express.json({ limit: '10mb' }));
    
    // Anti-cheat stats endpoint
    if (systems.sessionAntiCheat) {
        app.get('/anticheat-stats', (req: any, res: any) => {
            try {
                const stats = systems.sessionAntiCheat!.getStats();
                res.json(stats);
            } catch (error) {
                console.error('Error getting anti-cheat stats:', error);
                res.status(500).json({ error: 'Failed to get anti-cheat stats' });
            }
        });
    }
    
    app.post('/debug-log', (req: any, res: any) => {
        const { filename, content }: DebugLogRequest = req.body;
        
        if (!filename || !content) {
            return res.status(400).json({ error: 'Missing filename or content' });
        }
        
        // Sanitize filename to prevent directory traversal
        const safeFilename = filename.replace(/[^a-zA-Z0-9\-_.]/g, '');
        if (safeFilename.length === 0) {
            return res.status(400).json({ error: 'Invalid filename' });
        }
        
        const filepath = path.join(getProjectRoot(), 'debug-logs', safeFilename);
        
        // Ensure debug-logs directory exists
        const debugDir = path.join(getProjectRoot(), 'debug-logs');
        if (!fs.existsSync(debugDir)) {
            try {
                fs.mkdirSync(debugDir, { recursive: true });
            } catch (error) {
                console.error('Error creating debug directory:', error);
                return res.status(500).json({ error: 'Failed to create debug directory' });
            }
        }
        
        // Write debug log file
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