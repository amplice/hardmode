# Snow Tileset Mapping Documentation

## Overview
The snow tileset (src/assets/sprites/tiles/snow/MainLev2.0.png) contains three distinct snow variants, compared to grass which has two (green and dark).

## Tile Sections

### 1. Snow Variant 1 (Light Snow)
- **Location**: `(0,0)` to `(6,10)`
- **Structure**: Identical to green grass section in grass tileset
- **Contents**:
  - Rows 0-5: Cliff autotiling tiles
  - Row 6: Cliff extensions
  - Basic ground tile likely at `[1,1]`

### 2. Gap
- **Location**: Column 11
- **Purpose**: 1-tile spacing between variants

### 3. Snow Variant 2 (Medium Snow) 
- **Location**: `(0,12)` to `(6,22)`
- **Structure**: Maps to dark grass section `(0,11)` to `(6,21)` in grass tileset
- **Offset**: +12 columns from Variant 1 (compared to +11 for dark grass)
- **Contents**:
  - Rows 0-5: Cliff autotiling tiles
  - Row 6: Cliff extensions
  - Basic ground tile likely at `[1,13]`

### 4. Gap
- **Location**: Column 23
- **Purpose**: 1-tile spacing between variants

### 5. Snow Variant 3 (Heavy/Ice Snow)
- **Location**: `(0,24)` to `(6,34)`
- **Structure**: Same autotiling structure as other variants
- **Offset**: +24 columns from Variant 1
- **Contents**:
  - Rows 0-5: Cliff autotiling tiles
  - Row 6: Cliff extensions
  - Basic ground tile likely at `[1,25]`

## Key Differences from Grass Tileset
1. **Three variants instead of two**
2. **Column gaps between variants** (grass has no gaps)
3. **Different offsets**: +12 and +24 (vs grass which uses +11)

## Implementation Notes
- Will need to update column offset logic in CliffAutotilerNew
- Consider how to assign the three snow variants (elevation-based? random? sub-biomes?)
- Adjust TilesetManager slicing logic to account for gaps

## Stair Tiles

### 1. White Snow Stairs (Variant 1)
- **Location**: `(17,2)` to `(20,8)`
- **Structure**: Maps to green grass stairs `(13,2)` to `(16,8)` in grass tileset
- **Row offset**: +4 rows compared to grass stairs

### 2. Blue Snow Stairs (Variant 2)
- **Location**: `(17,14)` to `(20,20)`
- **Structure**: Maps to dark grass stairs `(13,13)` to `(16,19)` in grass tileset
- **Column offset**: +12 from Variant 1 stairs

### 3. Grey Snow Stairs (Variant 3)
- **Location**: `(17,26)` to `(20,32)`
- **Structure**: Same stair patterns as other variants
- **Column offset**: +24 from Variant 1 stairs

## Pattern Notes
- Snow stairs are 4 rows lower than grass stairs (row 17 vs row 13)
- Each variant maintains the same column spacing pattern (gaps at columns 11 and 23)
- 7 columns wide per variant, same as grass stairs

## Transition Tiles

### Direct Transitions (Opaque)
These work like the current grass-to-dark grass transitions:

#### 1. White Snow to Blue Snow
- **Location**: `(22,0)` to `(28,9)`
- **Structure**: Similar to grass-to-dark transitions `(30,0)` to `(36,9)`

#### 2. White Snow to Grey Snow
- **Location**: `(29,0)` to `(35,9)`
- **Structure**: Same transition pattern as above

### Transparency Overlay Transitions
These are overlaid on top of full tiles to create transitions:

#### 1. White Snow to Transparency
- **Location**: `(36,0)` to `(42,9)`
- **Usage**: Overlay on grass tiles for grass→white snow borders

#### 2. Blue Snow to Transparency
- **Location**: `(36,10)` to `(42,19)`
- **Usage**: Could be used for blue→grey snow (but see notes)

#### 3. Grey Snow to Transparency
- **Location**: `(43,0)` to `(49,9)`
- **Usage**: Overlay on blue snow tiles for blue→grey snow borders

## Transition Strategy
1. **Grass to Snow**: Only transition to white snow
   - Use full grass tiles with white snow transparency overlay
   
2. **Blue to Grey Snow**: Use one direction only
   - Option A: Full blue tiles + grey snow transparency overlay
   - Option B: Full grey tiles + blue snow transparency overlay
   - (Only one set needed, the other can remain unused)

3. **No double transitions**: Each border uses only one transition method

## Implementation Notes
- Transparency overlays require a two-layer rendering approach
- Base layer: Full tile (grass, blue snow, etc.)
- Overlay layer: Transparency transition tile
- This is different from current opaque transition tiles

## Sections Still To Document
- [ ] Snow ground variations (common and rare)
- [x] Snow stair tiles
- [x] Snow-to-grass transition tiles (via transparency)
- [ ] Any decorative snow elements