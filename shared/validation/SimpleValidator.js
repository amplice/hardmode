/**
 * Simple Network Message Validator for Phase 2.1
 * 
 * DESIGN PRINCIPLES:
 * 1. Only validate critical security/stability fields
 * 2. Preserve all original fields (no data transformation)
 * 3. Log warnings but don't break gameplay
 * 4. Minimal performance impact
 * 5. Focus on preventing crashes, not comprehensive validation
 */

/**
 * Validates basic message structure without transforming data
 * Returns true if message is safe to process, false if potentially dangerous
 */
export class SimpleValidator {
    
    /**
     * Validate playerInput message (most critical for movement)
     */
    static validatePlayerInput(data) {
        if (!data || typeof data !== 'object') return false;
        
        // Must have data object with keys array
        if (!data.data || typeof data.data !== 'object') return false;
        if (!Array.isArray(data.data.keys)) return false;
        
        // Sequence must be a reasonable number (prevent overflow attacks)
        if (typeof data.sequence !== 'number' || data.sequence < 0 || data.sequence > 999999999) return false;
        
        return true;
    }
    
    /**
     * Validate attackMonster message (critical for combat balance)
     */
    static validateAttackMonster(data) {
        if (!data || typeof data !== 'object') return false;
        
        // Must have monster ID
        if (!data.monsterId || typeof data.monsterId !== 'string') return false;
        
        // Damage must be reasonable number (prevent infinite damage exploits)
        if (typeof data.damage !== 'number' || data.damage < 0 || data.damage > 1000) return false;
        
        return true;
    }
    
    /**
     * Validate createProjectile message (prevent projectile spam)
     */
    static validateCreateProjectile(data) {
        if (!data || typeof data !== 'object') return false;
        
        // Must have position
        if (typeof data.x !== 'number' || typeof data.y !== 'number') return false;
        
        // Angle must be valid
        if (typeof data.angle !== 'number') return false;
        
        // Speed must be reasonable (prevent super-fast projectiles)
        if (data.speed !== undefined && (typeof data.speed !== 'number' || data.speed < 0 || data.speed > 5000)) return false;
        
        return true;
    }
    
    /**
     * Validate executeAbility message (prevent ability spam)
     */
    static validateExecuteAbility(data) {
        if (!data || typeof data !== 'object') return false;
        
        // Must have ability type
        if (!data.abilityType || typeof data.abilityType !== 'string') return false;
        
        // Ability type must be reasonable length (prevent buffer overflow)
        if (data.abilityType.length > 50) return false;
        
        return true;
    }
    
    /**
     * Validate ping message (prevent ping flood)
     */
    static validatePing(data) {
        if (!data || typeof data !== 'object') return false;
        
        // Sequence must be reasonable
        if (typeof data.sequence !== 'number' || data.sequence < 0 || data.sequence > 999999) return false;
        
        return true;
    }
    
    /**
     * Main validation function - routes to specific validators
     * Returns original data if valid, null if invalid
     */
    static validateMessage(messageType, data, socketId) {
        let isValid = false;
        
        switch (messageType) {
            case 'playerInput':
                isValid = this.validatePlayerInput(data);
                break;
            case 'attackMonster':
                isValid = this.validateAttackMonster(data);
                break;
            case 'createProjectile':
                isValid = this.validateCreateProjectile(data);
                break;
            case 'executeAbility':
                isValid = this.validateExecuteAbility(data);
                break;
            case 'ping':
                isValid = this.validatePing(data);
                break;
            default:
                // Unknown message types are allowed (defensive approach)
                isValid = true;
                break;
        }
        
        if (!isValid) {
            console.warn(`[SimpleValidator] Rejected ${messageType} from ${socketId}:`, JSON.stringify(data));
            return null;
        }
        
        // Return original data unchanged (no transformation)
        return data;
    }
}