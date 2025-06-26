# Green Grass Tileset - Complete Understanding (MainLev2.0.png)

## Overview
This document contains our complete understanding of how the MainLev2.0.png tileset works based on extensive testing and debugging.

## Core Autotiling System (Rows 0-6)

### Row 0 - Top Edges and Diagonal Corners
- (0,0): **NW Corner** - Use when NORTH=1 AND WEST=1
- (0,1): **North Edge** - Use when NORTH=1 AND WEST=0 AND EAST=0
- (0,2-0,5): **North Edge Variations** - Same condition as (0,1)
- (0,6): **NE Corner** - Use when NORTH=1 AND EAST=1
- (0,8): **NW Diagonal Corner** - Special diagonal start tile
- (0,9): **NE Diagonal Corner** - Special diagonal start tile

### Row 1 - Side Edges and Basic Grass
- (1,0): **West Edge** - Use when WEST=1 AND NORTH=0 AND SOUTH=0
- (1,1): **Basic Grass** - Use for cliff autotiling when no elevation differences
- (1,2-1,5): **Redundant** - Same as (1,1), ignore these
- (1,6): **East Edge** - Use when EAST=1 AND NORTH=0 AND SOUTH=0
- (1,7): **SW Diagonal Edge** - Special diagonal continuation
- (1,10): **SE Diagonal Edge** - Special diagonal continuation

### Row 2 - Edge Variations and Diagonal Connectors
- (2,0): **West Edge Variation**
- (2,1-2,5): **Redundant** - Same as (1,1), ignore these
- (2,6): **East Edge Variation**
- (2,7): **West Diagonal Connector** - Replaces old inner corner (7,0)
- (2,10): **East Diagonal Connector** - Replaces old inner corner (7,6)

### Row 4 - Bottom Diagonal Connectors
- (4,8): **SW Bottom Diagonal Connector** - Replaces old inner corner (7,8)
- (4,9): **SE Bottom Diagonal Connector** - Replaces old inner corner (7,7)

### Row 5 - Bottom Edges and Corners (CRITICAL SECTION)

**This is where the main bugs occur. The logic must be:**

- (5,0): **SW Corner** - Use when SOUTH=1 AND WEST=1 (both neighbors lower)
- (5,1): **Bottom Edge 1** - Use when SOUTH=1 AND WEST=0 AND EAST=0 (only south lower)
- (5,2): **Bottom Edge 2** - Use when SOUTH=1 AND WEST=0 AND EAST=0 (only south lower)
- (5,3): **Bottom Edge 3** - Use when SOUTH=1 AND WEST=0 AND EAST=0 (only south lower)
- (5,4): **Bottom Edge 4** - Use when SOUTH=1 AND WEST=0 AND EAST=0 (only south lower)
- (5,5): **Bottom Edge 5** - Use when SOUTH=1 AND WEST=0 AND EAST=0 (only south lower)
- (5,6): **SE Corner** - Use when SOUTH=1 AND EAST=1 (both neighbors lower)

**NEVER use (5,6) for horizontal bottom edges! Only for true SE corners!**

### Row 6 - Extension Layer
These tiles are placed below Row 5 tiles to create the 2-tile cliff height effect.
- (6,0): Below (5,0) SW corner extensions
- (6,1-6,5): Below (5,1-5,5) bottom edge extensions  
- (6,6): Below (5,6) SE corner extensions

## Decorative Grass Variations (Rows 27-28)

### Row 27 - Grass Texture Variations
- (27,5): **Grass with small flowers**
- (27,6): **Grass with dirt patches**
- (27,7): **Grass with subtle wear**
- (27,8): **Grass with small stones**
- (27,9): **Grass with leaf litter**

### Row 28 - Additional Decorative Options
- (28,5): **More decorative grass alternatives**
- (28,6): **Natural grass variations**
- (28,7): **Additional texture options**
- (28,8): **Environmental grass details**
- (28,9): **Diverse grass appearances**

## Extended Grass Variations (Rows 22-31, Columns 54-63)

### Large Grass Variation Square
This 10x10 grid contains a massive collection of grass variations:
- **Location**: (22,54) to (31,63) - 100 unique grass tiles!
- **Content**: Extensive variety of natural grass textures
- **Features**: Different lighting, shadows, plant density, terrain details
- **Purpose**: Maximum visual diversity for large grass areas

**Usage**: These decorative tiles are used sparingly via weighted selection in `getRandomPureGrass()`:

### Grass Tile Selection Weights
- **70%**: Basic grass (1,1) - Clean, consistent base appearance
- **25%**: Common variations (rows 27-28) - Subtle natural variety
- **5%**: Decorative variations (22,54)-(31,63) - Special accent tiles

This ensures the world feels natural and varied without being overwhelming. The decorative tiles provide visual interest as rare special features, while the basic grass maintains a cohesive look.

The cliff autotiling system always uses basic (1,1) for consistency at cliff edges.

## Bitmasking Logic

### Complete 8-Bit System
Include all 8 directions for proper diagonal detection:
- NORTH = 1 (bit 0): North neighbor is at lower elevation
- NORTHEAST = 2 (bit 1): Northeast neighbor is at lower elevation
- EAST = 4 (bit 2): East neighbor is at lower elevation  
- SOUTHEAST = 8 (bit 3): Southeast neighbor is at lower elevation
- SOUTH = 16 (bit 4): South neighbor is at lower elevation
- SOUTHWEST = 32 (bit 5): Southwest neighbor is at lower elevation
- WEST = 64 (bit 6): West neighbor is at lower elevation
- NORTHWEST = 128 (bit 7): Northwest neighbor is at lower elevation

### Tile Selection Rules

**Corners (adjacent cardinal bits):**
- Bitmask 65 (NORTH + WEST): Use (0,0) NW corner
- Bitmask 5 (NORTH + EAST): Use (0,6) NE corner
- Bitmask 80 (SOUTH + WEST): Use (5,0) SW corner
- Bitmask 20 (SOUTH + EAST): Use (5,6) SE corner

**Edges (single cardinal bits):**
- Bitmask 1 (NORTH only): Use (0,1-0,5) top edge
- Bitmask 4 (EAST only): Use (1,6) right edge
- Bitmask 16 (SOUTH only): Use (5,1-5,5) bottom edge - **NEVER (5,6)!**
- Bitmask 64 (WEST only): Use (1,0) left edge

**Inner Corners (diagonal only, cardinals same):**
- Bitmask 128 (NORTHWEST only): Use (2,7) diagonal connector
- Bitmask 2 (NORTHEAST only): Use (2,10) diagonal connector
- Bitmask 32 (SOUTHWEST only): Use (4,8) diagonal connector
- Bitmask 8 (SOUTHEAST only): Use (4,9) diagonal connector

**Edge Variations (edge + adjacent diagonal):**
- Bitmask 3 (NORTH + NORTHEAST): Use (0,2) top edge variation
- Bitmask 129 (NORTH + NORTHWEST): Use (0,3) top edge variation
- Similar patterns for other edges

**Grass (no elevation difference):**
- Bitmask 0: Use (1,1-1,5) pure grass

## Formation Rules

### Minimum Sizes
- All cliff formations must be at least **3x3 tiles**
- No single-tile jutting allowed
- No 2-tile wide paths allowed

### Generation Strategy
1. Create organic plateau shapes using noise
2. Ensure all plateaus meet 3x3 minimum
3. Remove any formations smaller than 3x3
4. Apply proper bitmasking for tile selection
5. Add extension layer (row 6) below cliff edges

## Common Bugs and Solutions

### Bug 1: Wrong Bottom Edge Tiles
**Problem**: Using (5,6) corner tile for horizontal bottom edges
**Solution**: Check if ONLY south neighbor is lower → use (5,1-5,5)

### Bug 2: Single Jutting Tiles  
**Problem**: Formations with 1 or 2 tile extensions
**Solution**: Enforce 3-tile minimum in all directions during generation

### Bug 3: Detached Cliff Bits
**Problem**: Small isolated elevated areas
**Solution**: Remove any connected plateau regions smaller than 9 tiles (3x3)

## Implementation Notes

The key is to separate the logic clearly:
1. **Elevation Generation**: Create proper 3x3+ plateau shapes
2. **Bitmasking**: Simple 4-bit cardinal-only system
3. **Tile Selection**: Clear rules based on neighbor patterns
4. **Extension Layer**: Automatic placement below cliff edges

This approach should eliminate the complex diagonal detection and focus on getting the basic edge/corner selection correct first.