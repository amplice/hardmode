# Debug System Guide

The game now includes a comprehensive debug logging system that provides ASCII visualizations and detailed state tracking to help with development and bug fixing.

## Console Commands

Open the browser console (F12) and use these commands:

- `debugDump()` - Manually dump the current debug state to a file
- `debugToggle()` - Enable/disable debug logging
- `debugClear()` - Clear debug history

## Automatic Dumps

The system automatically creates debug dumps when:
- A player dies
- An error occurs

Files are automatically saved to the `debug-logs/` directory in the project with names like:
- `debug-playerDeath-1234567890.txt`
- `debug-error-1234567890.txt`

**Note**: Debug logs are automatically accessible to the AI assistant - no need to share them manually! Just mention which log file you want analyzed.

## Debug File Contents

Each debug dump contains:

### 1. Current State
- Player positions, HP, state (idle/moving/attacking)
- Monster positions, HP, targets
- Active projectiles

### 2. ASCII Map Visualization
```
+---------------------------------------------------------+
|·····························································|
|···················O·········································|
|·····················@·······································|
|··················2··········································|
|·····························································|
+---------------------------------------------------------+
Legend: @ = You, 2-9 = Remote players, OGSE = Monsters, * = Projectiles
```

### 3. Recent Events
- Attack events with positions and facing
- Damage taken
- State changes
- Player deaths

### 4. State History
Shows what changed over the last 20 frames

## Usage Tips

1. When reporting a bug, include the debug dump file
2. Use `debugDump()` right after encountering an issue
3. The ASCII map helps visualize spatial bugs (like dash not working)
4. Event logs show the sequence leading to problems

## Example Output

```
=== CURRENT STATE (Frame 1823) ===

Players:
  [local] guardian @ (3200, 3200)
       HP: 3/4, State: attacking(secondary), Facing: right

Monsters:
  [0] ogre @ (3150, 3250)
       HP: 2/3, State: chasing, Target: player

=== MAP VISUALIZATION ===
+------------------------------------------------------------+
|············································|
|·····O······································|
|······@·····································|
|············································|
+------------------------------------------------------------+

=== RECENT EVENTS ===
[10:23:45] Frame 1820: playerAttack - {"type":"secondary","class":"guardian"}
[10:23:45] Frame 1822: playerDamage - {"from":4,"to":3,"damage":1}
```

This system provides much better visibility into what's happening during gameplay!