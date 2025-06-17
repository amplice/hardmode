/**
 * LLM_NOTE: Validates player input messages for format and sanity.
 * This is the first line of defense against malformed or malicious inputs.
 * 
 * ARCHITECTURE_DECISION: Input validation is separated into its own class
 * for clarity and reusability. All validation is strict to prevent exploits.
 */

import { PlayerInputMessage } from '@hardmode/shared';

export class InputValidator {
  /**
   * Validate a player input message.
   */
  validateInput(input: any): input is PlayerInputMessage {
    // Check basic structure
    if (!input || typeof input !== 'object') {
      console.warn('Input validation failed: not an object', input);
      return false;
    }
    
    // Check sequence number
    if (typeof input.sequence !== 'number' || 
        input.sequence < 0 || 
        input.sequence > Number.MAX_SAFE_INTEGER) {
      console.warn('Input validation failed: invalid sequence', input.sequence);
      return false;
    }
    
    // Check timestamp
    if (typeof input.timestamp !== 'number' || 
        input.timestamp < 0 || 
        input.timestamp > Date.now() + 10000) { // Allow 10s future for clock drift
      console.warn('Input validation failed: invalid timestamp', input.timestamp);
      return false;
    }
    
    // Check keys object
    if (!input.keys || typeof input.keys !== 'object') {
      console.warn('Input validation failed: missing or invalid keys', input.keys);
      return false;
    }
    
    // Check each key
    const validKeys = ['up', 'down', 'left', 'right'];
    for (const key of validKeys) {
      if (typeof input.keys[key] !== 'boolean') {
        return false;
      }
    }
    
    // Check for extra keys
    const inputKeys = Object.keys(input.keys);
    if (inputKeys.length !== validKeys.length || 
        !inputKeys.every(key => validKeys.includes(key))) {
      return false;
    }
    
    // Check mouse position
    if (!input.mousePosition || typeof input.mousePosition !== 'object') {
      return false;
    }
    
    if (typeof input.mousePosition.x !== 'number' || 
        typeof input.mousePosition.y !== 'number') {
      return false;
    }
    
    // Check mouse position bounds (world coordinates)
    if (input.mousePosition.x < -1000 || input.mousePosition.x > 10000 ||
        input.mousePosition.y < -1000 || input.mousePosition.y > 10000) {
      return false;
    }
    
    // Check deltaTime
    if (typeof input.deltaTime !== 'number' || 
        input.deltaTime < 0 || 
        input.deltaTime > 1000) { // Max 1 second delta
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate input sequence is in expected range.
   */
  validateSequence(current: number, previous: number, maxGap: number = 300): boolean {
    // Sequence should be increasing
    if (current <= previous) {
      return false;
    }
    
    // Check for reasonable gap
    const gap = current - previous;
    if (gap > maxGap) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate timestamp is reasonable.
   */
  validateTimestamp(timestamp: number, maxAge: number = 5000): boolean {
    const now = Date.now();
    
    // Not too far in the past
    if (now - timestamp > maxAge) {
      return false;
    }
    
    // Not in the future (allow small drift)
    if (timestamp > now + 1000) {
      return false;
    }
    
    return true;
  }
}