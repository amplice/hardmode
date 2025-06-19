# Hunter Projectile Collision Test

## Setup
1. Start server: `npm start`
2. Open game in browser
3. Open browser console (F12)
4. Choose Hunter class

## Test Steps
1. Find a monster (skeleton, etc.)
2. Fire a projectile at the monster
3. Watch console for these debug messages:

### Expected Server Console Output:
```
Creating projectile - owner: { id: 'xxx', class: 'hunter', type: undefined }
Projectile ownerType will be: hunter
Projectile X created by xxx at (xxx, xxx)
Projectile update: 1 active projectiles, 5 monsters
Projectile X (owner: hunter) is player projectile: true
Checking collision with monster skeleton at distance: XXX (radius: 20)
```

### Expected Client Console Output:
```
Primary attack (bow shot) started
Executing projectile attack for hunter primary, windup: 100ms
Creating projectile at (xxx, xxx) angle: x.xx rad
Owner class: hunter, projectile options: {...}
Sending createProjectile to server: {...}
Setting primaryAttackCooldown to: 0.1
```

## What to Look For:
1. **ownerType**: Should be 'hunter' not 'player'
2. **isPlayerProjectile**: Should be true
3. **Monster collision checks**: Should show distance calculations
4. **Collision detection**: Should show "Checking collision" messages

## Potential Issues:
- If no "Projectile update" messages appear, projectiles aren't being updated
- If no "Checking collision" messages appear, collision detection isn't running
- If distances are always large, there might be a coordinate mismatch
- If monsters count is 0, monsters aren't being tracked properly