# Railway Debug Environment Variables Setup

## Debug Toggles Available

The following environment variables can be set in Railway to control debug features. These are processed server-side and sent to the client during connection initialization:

### Core Debug Settings

1. **`DEBUG_TILESET`** (true/false)
   - **Default**: false
   - **Purpose**: Use annotated debug tileset instead of regular tileset
   - **Effect**: Shows tile boundaries and numbers for debugging tile placement
   - **Example**: `DEBUG_TILESET=true`

2. **`DEBUG_TILE_LOGGING`** (true/false)
   - **Default**: false
   - **Purpose**: Enable detailed console logging for tile placement
   - **Effect**: Shows which tiles are placed where and why
   - **Example**: `DEBUG_TILE_LOGGING=true`

3. **`DEBUG_MONSTER_LOGGING`** (true/false)
   - **Default**: false
   - **Purpose**: Enable console logging for monster AI and state changes
   - **Effect**: Shows monster behavior decisions and transitions
   - **Example**: `DEBUG_MONSTER_LOGGING=true`

4. **`DEBUG_COMBAT_LOGGING`** (true/false)
   - **Default**: false
   - **Purpose**: Enable console logging for combat events
   - **Effect**: Shows attack calculations, damage dealing, etc.
   - **Example**: `DEBUG_COMBAT_LOGGING=true`

### Game Feature Toggles

5. **`PLAYTEST_MODE`** (true/false)
   - **Default**: false
   - **Purpose**: Enable easy leveling for testing (20 XP per level)
   - **Effect**: Makes character progression much faster
   - **Example**: `PLAYTEST_MODE=true`

6. **`ENABLE_PVP`** (true/false)
   - **Default**: false
   - **Purpose**: Enable player vs player combat
   - **Effect**: Allows players to damage each other
   - **Example**: `ENABLE_PVP=true`

## How to Set Environment Variables in Railway

### Step 1: Access Your Railway Project
1. Go to [railway.app](https://railway.app)
2. Sign in to your account
3. Click on your Hardmode project

### Step 2: Navigate to Variables
1. In your project dashboard, click on the **service/deployment** you want to configure
2. Click on the **"Variables"** tab in the top navigation

### Step 3: Add Environment Variables
1. Click the **"+ New Variable"** button
2. Enter the variable name (e.g., `DEBUG_TILESET`)
3. Enter the value (`true` or `false`)
4. Click **"Add"** or press Enter

### Step 4: Deploy Changes
1. Railway will automatically redeploy your service when you add variables
2. Wait for the deployment to complete (green checkmark)
3. Your debug settings will now be active

## Example Railway Variable Configuration

For full debugging, set these variables:

```
DEBUG_TILESET=true
DEBUG_TILE_LOGGING=true
DEBUG_MONSTER_LOGGING=false
DEBUG_COMBAT_LOGGING=false
PLAYTEST_MODE=true
ENABLE_PVP=false
```

For production, use:

```
DEBUG_TILESET=false
DEBUG_TILE_LOGGING=false
DEBUG_MONSTER_LOGGING=false
DEBUG_COMBAT_LOGGING=false
PLAYTEST_MODE=false
ENABLE_PVP=false
```

## Important Notes

- **Case Sensitive**: Variable names must be exactly as shown
- **String Values**: Use `"true"` or `"false"` (as strings)
- **Auto-Deploy**: Railway redeploys automatically when variables change
- **Takes Effect**: Changes apply after the next deployment completes
- **Server-Side Processing**: Environment variables are processed on the server and sent to clients
- **No Browser Restart Needed**: Clients get new settings when they connect/reconnect
- **Logging**: Debug logs appear in Railway's deployment logs section

## Viewing Debug Output

1. In Railway, go to your service
2. Click on the **"Deployments"** tab
3. Click on the latest deployment
4. Click **"View Logs"** to see console output
5. Debug messages will appear with `[DEBUG]` prefix

## Quick Toggle Commands

To quickly enable/disable debugging:

**Enable Debug Mode:**
```
DEBUG_TILESET=true
DEBUG_TILE_LOGGING=true
PLAYTEST_MODE=true
```

**Disable Debug Mode:**
```
DEBUG_TILESET=false
DEBUG_TILE_LOGGING=false
PLAYTEST_MODE=false
```

Save this file for quick reference when managing your Railway deployment!