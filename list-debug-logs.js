const fs = require('fs');
const path = require('path');

const debugLogsDir = path.join(__dirname, 'debug-logs');

console.log('Available debug logs:\n');

try {
    const files = fs.readdirSync(debugLogsDir);
    const debugFiles = files
        .filter(f => f.endsWith('.txt'))
        .sort((a, b) => {
            // Sort by timestamp (newer first)
            const timeA = parseInt(a.match(/\d+/)?.[0] || '0');
            const timeB = parseInt(b.match(/\d+/)?.[0] || '0');
            return timeB - timeA;
        });
    
    if (debugFiles.length === 0) {
        console.log('No debug logs found.');
    } else {
        debugFiles.forEach(file => {
            const stats = fs.statSync(path.join(debugLogsDir, file));
            const size = (stats.size / 1024).toFixed(1) + ' KB';
            const date = stats.mtime.toLocaleString();
            console.log(`- ${file} (${size}, ${date})`);
        });
        
        console.log(`\nTotal: ${debugFiles.length} debug log(s)`);
        console.log('\nTo read a log, use: node read-debug-log.js <filename>');
    }
} catch (error) {
    if (error.code === 'ENOENT') {
        console.log('Debug logs directory not found. No logs have been created yet.');
    } else {
        console.error('Error reading debug logs:', error);
    }
}