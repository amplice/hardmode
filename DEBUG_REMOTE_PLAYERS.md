# Remote Player Rendering Debug Guide

## Changes Made for Debugging

1. **RemotePlayer.js**
   - Added console logging when creating sprites
   - Made sprites bright cyan with white border for visibility
   - Added logging for position updates and visibility checks
   - Fixed initial position sync to prevent interpolation jumps

2. **Game.js**
   - Added detailed logging for game state updates
   - Added debug logging when creating remote players
   - Added periodic camera/container position logging
   - Added red debug marker at world center
   - Added request for game state after class selection
   - Made entity container explicitly visible

3. **Server (messageHandlers.ts)**
   - Added handler for `requestGameState` event
   - Server already sends game state after class selection

4. **Debug HTML Tool**
   - Created `debug-remote-players.html` for runtime inspection

## What to Check in Console

1. **On Connection:**
   - Look for "Received world config" and spawn position
   - Check if game state is received with other players

2. **When Remote Player Joins:**
   - "=== GAME STATE UPDATE ===" should show all players
   - "Creating new remote player" with position
   - "RemotePlayer sprite created with bounds"
   - Entity container children count should increase

3. **During Gameplay:**
   - "Updating X remote players" should appear if remote players exist
   - Camera and entity container positions should update
   - Remote player positions should change when they move

## Common Issues to Check

1. **Players not in PLAYING status**
   - Server only sends players with PLAYING or DEAD status
   - Check server logs for player status changes

2. **Position mismatch**
   - Remote players might be at different world coordinates
   - The red debug marker shows world center (spawn point)
   - Check if remote player positions are reasonable

3. **Container visibility**
   - Entity container should be visible
   - Entity container position should match world container
   - Both containers move with camera

4. **Sprite creation**
   - Remote player sprites should be bright cyan circles
   - Sprites should have white borders
   - Username labels should be visible above sprites

## Using the Debug Tool

1. Open `debug-remote-players.html` in a browser tab
2. Connect to the game normally in another tab
3. Use the debug buttons to:
   - Check remote player states
   - Toggle entity container visibility
   - Check render order
   - Add test remote players

## Next Steps if Players Still Not Visible

1. Check browser console for any errors
2. Verify network tab shows gameState messages
3. Use PIXI DevTools extension if available
4. Check if issue is specific to certain browsers
5. Try with players at very different positions (not near spawn)

## Testing Procedure

1. Start the server with logging enabled
2. Open game in two browser windows
3. Connect both clients with different usernames
4. Select classes for both players
5. Move one player away from spawn
6. Check if the other player can see the movement

The bright cyan sprites with white borders should be very visible against any background. If they're still not appearing, the issue is likely with the game state synchronization or player status on the server.