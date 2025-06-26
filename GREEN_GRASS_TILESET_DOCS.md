# Green Grass Zone Documentation (MainLev2.0.png)
## Columns 0-10, Rows 0-43

### Basic Autotiling Section (Rows 0-6)
These tiles form the foundation for creating coherent terrain with proper edges and corners. The system includes both square (orthogonal) and diagonal cliff edges.

#### Row 0 - Top Edges & Diagonal Corners
- (0,0): Northwest corner (square/orthogonal)
- (0,1): North edge tile 1 (cliff on top)
- (0,2): North edge tile 2 (cliff on top, variation)
- (0,3): North edge tile 3 (cliff on top, variation)
- (0,4): North edge tile 4 (cliff on top, variation)
- (0,5): North edge tile 5 (cliff on top, variation)
- (0,6): Northeast corner (square/orthogonal)
- (0,7): Empty
- (0,8): Northwest diagonal corner - START of diagonal edge going southeast
- (0,9): Northeast diagonal corner - START of diagonal edge going southwest
- (0,10): Empty

#### Row 1 - Side Edges & Diagonal Edges
- (1,0): West edge tile (cliff on left)
- (1,1): Pure green grass tile
- (1,2): Pure green grass tile (variation)
- (1,3): Pure green grass tile (variation)
- (1,4): Pure green grass tile (variation)
- (1,5): Pure green grass tile (variation)
- (1,6): East edge tile (cliff on right)
- (1,7): SW diagonal edge continuation (placed SE of (0,8))
- (1,8): Bridge tile - placed E of (1,7) when connecting to corners
- (1,9): Bridge tile - placed W of (1,10) when connecting to corners
- (1,10): SE diagonal edge continuation (placed SW of (0,9))

#### Row 2 - Side Edge Variations & Diagonal Connectors
- (2,0): West edge variation 2
- (2,1): Pure green grass tile (variation)
- (2,2): Pure green grass tile (variation)
- (2,3): Pure green grass tile (variation)
- (2,4): Pure green grass tile (variation)
- (2,5): Pure green grass tile (variation)
- (2,6): East edge variation 2
- (2,7): West-side diagonal connector - connects diagonal tiles on the west side
  - Used when diagonal tile is above AND (horizontal or diagonal) tile is to the west
  - Also used when vertical tile is above AND diagonal tile is to the west
- (2,8): Empty
- (2,9): Empty
- (2,10): East-side diagonal connector - connects diagonal tiles on the east side
  - Used when diagonal tile is above AND diagonal tile is to the east

#### Row 3 - Side Edge Variations
- (3,0): West edge variation 3
- (3,1): Pure green grass tile (variation)
- (3,2): Pure green grass tile (variation)
- (3,3): Pure green grass tile (variation)
- (3,4): Pure green grass tile (variation)
- (3,5): Pure green grass tile (variation)
- (3,6): East edge variation 3
- (3,7): Unknown/unused tile (purpose unclear)
- (3,8): Unknown/unused tile (purpose unclear)
- (3,9): Unknown/unused tile (purpose unclear)
- (3,10): Unknown/unused tile (purpose unclear)

#### Row 4 - Side Edge Variations & Bottom Diagonal Connectors
- (4,0): West edge variation 4
- (4,1): Pure green grass tile (variation)
- (4,2): Pure green grass tile (variation)
- (4,3): Pure green grass tile (variation)
- (4,4): Pure green grass tile (variation)
- (4,5): Pure green grass tile (variation)
- (4,6): East edge variation 4
- (4,7): Unknown/unused tile (purpose unclear)
- (4,8): Southwest diagonal connector (replaces inner corner 7,8)
- (4,9): Southeast diagonal connector (replaces inner corner 7,7)
- (4,10): Unknown/unused tile (purpose unclear)

#### Row 5 - Bottom Edges
- (5,0): Southwest corner of cliff edge - CORNER ONLY (when both south and west neighbors are lower)
- (5,1): Bottom cliff edge tile 1 - HORIZONTAL EDGE ONLY (when only south neighbor is lower)
- (5,2): Bottom cliff edge tile 2 - HORIZONTAL EDGE ONLY (when only south neighbor is lower)
- (5,3): Bottom cliff edge tile 3 - HORIZONTAL EDGE ONLY (when only south neighbor is lower) 
- (5,4): Bottom cliff edge tile 4 - HORIZONTAL EDGE ONLY (when only south neighbor is lower)
- (5,5): Bottom cliff edge tile 5 - HORIZONTAL EDGE ONLY (when only south neighbor is lower)
- (5,6): Southeast corner of cliff edge - CORNER ONLY (when both south and east neighbors are lower)
- (5,7-5,10): Additional terrain variations

**IMPORTANT**: (5,1) to (5,5) are for horizontal bottom edges only. (5,0) and (5,6) are corner pieces only.
Never use (5,6) for horizontal edges - it creates visual inconsistencies.

#### Row 6 - Height Layer 2 (Vertical Depth)
- (6,0): Second vertical layer (always below (5,0))
- (6,1): Second vertical layer (always below (5,1))
- (6,2): Second vertical layer (always below (5,2))
- (6,3): Second vertical layer (always below (5,3))
- (6,4): Second vertical layer (always below (5,4))
- (6,5): Second vertical layer (always below (5,5))
- (6,6): Second vertical layer (always below (5,6))
- (6,7-6,10): Additional terrain variations

#### Row 7 - Inner Corners (Not Used) and Additional Tiles
- (7,0): Not used - use (2,7) instead for all cases
- (7,1-7,5): Additional terrain variations
- (7,6): Not used - use (2,10) instead for all cases
- (7,7): Not used - use (4,9) instead for all cases
- (7,8): Not used - use (4,8) instead for all cases
- (7,9-7,10): Additional terrain variations

### Height Feature Section (Rows 8-27)
These tiles create the illusion of elevation and depth in the 2D world.

#### Rows 8-10 - Basic Elevated Platforms
- Small elevated grass platforms with cliff edges
- 2x2 and 3x3 elevated areas
- Various cliff face textures for different heights

#### Rows 11-14 - Slopes and Ramps
- Diagonal slope tiles (northeast facing)
- Diagonal slope tiles (northwest facing)
- Diagonal slope tiles (southeast facing)
- Diagonal slope tiles (southwest facing)
- Transition pieces for slopes meeting flat ground

#### Rows 15-18 - Stairs and Steps
- Single-width stairs going up (north)
- Single-width stairs going down (south)
- Double-width stairs
- Corner stairs for direction changes
- Stair railings and decorative elements

#### Rows 19-22 - Complex Height Transitions
- Multi-level cliff faces
- Terraced landscapes
- Curved elevation changes
- Natural-looking height variations

#### Rows 23-27 - Advanced Height Features
- Large platform edges
- Complex corner pieces for elevated areas
- Smooth height transitions
- Natural cliff formations

### Decorative Alternates Section (Rows 28-29)
These provide visual variety to break up monotonous grass areas.

#### Row 28 - Grass Texture Variations
- (28,0): Grass with small flowers
- (28,1): Grass with dirt patches
- (28,2): Grass with subtle wear
- (28,3): Grass with small stones
- (28,4): Grass with leaf litter
- (28,5-28,10): More texture variations

#### Row 29 - Additional Decorative Options
- (29,0-29,10): More decorative grass alternatives with various natural elements

### Row 30
- Empty/transparent (used as spacing)

### Transition Section (Rows 31-37)
Green grass transitioning to dark grass.

#### Row 31 - Basic Transitions
- (31,0): Northwest corner (green to dark)
- (31,1): North edge transition
- (31,2): North edge transition variation
- (31,3): North edge transition variation
- (31,4): Northeast corner (green to dark)
- (31,5-31,10): Various transition pieces

#### Rows 32-37 - Complete Transition Set
- All necessary tiles to smoothly blend from green grass to dark grass
- Includes corners, edges, and complex transition patterns
- Multiple variations for natural-looking boundaries

### Transparency Transition Section (Rows 38-43)
Green grass transitioning to transparency (for overlays or special effects).

#### Rows 38-43
- Complete set of tiles for fading grass to transparent
- Useful for fog of war effects
- Edge blending with non-terrain elements
- Overlay possibilities

## Diagonal Cliff Rules

### Diagonal Tile Placement
1. **Starting Diagonal Edges**:
   - (0,8): NW diagonal corner - starts a diagonal edge going southeast
   - (0,9): NE diagonal corner - starts a diagonal edge going southwest
   
2. **Continuing Diagonal Edges**:
   - (1,7): SW diagonal continuation - placed southeast of (0,8)
   - (1,10): SE diagonal continuation - placed southwest of (0,9)
   
3. **Diagonal Connectors**:
   - (2,7): West-side connector - used when:
     - Diagonal tile (0,8 or 1,7) is above AND horizontal/diagonal tile is to the west
     - Vertical tile (0,1 or 1,0) is above AND diagonal tile is to the west
   - (2,10): East-side connector - used when:
     - Diagonal tile (0,9 or 1,10) is above AND diagonal tile is to the east
   
4. **Bridge Tiles**:
   - (1,8): Placed east of (1,7) when connecting to corners
   - (1,9): Placed west of (1,10) when connecting to corners

### Important Notes
- Diagonal tiles are complete tiles and do NOT require extension tiles below them
- Each diagonal tile should be placed only once - no overlapping
- The system automatically determines tile placement based on elevation patterns

### Minimum Cliff Formation Rules

To ensure natural-looking cliff formations, the following minimum sizes must be enforced:

#### General Formation Requirements
- **Absolute minimum**: 3x3 tiles (9 tiles total) for any cliff formation
- **Width requirement**: All cliff formations must be at least 3 tiles wide
- **Height requirement**: All cliff formations must be at least 3 tiles high
- **No narrow paths**: No formations with width or height less than 3 tiles

#### Side Cliff Formations (Jutting from Plateau Sides)
- **Minimum**: 3 tiles vertically, 3 tiles horizontally
- **Western side formations**:
  - Top tile: (1,7) - SW diagonal edge
  - Bottom tile: (4,7) - SW diagonal connector bottom
  - Height tiles: (5,7) and (6,7) below for 2-tile cliff depth
- **Eastern side formations**:
  - Top tile: (1,10) - SE diagonal edge  
  - Bottom tile: (4,10) - SE diagonal connector bottom
  - Height tiles: (5,10) and (6,10) below for 2-tile cliff depth

#### Top Cliff Formations (Jutting from Formation Tops)
- **Minimum**: 3 tiles horizontally, 3 tiles vertically
- **Tiles**: (0,8) NW diagonal corner and (0,9) NE diagonal corner
- Must be part of larger 3x3+ formation

#### Bottom Cliff Formations (Jutting from Formation Bottoms)
- **Minimum**: 3 tiles horizontally, 3 tiles vertically
- **Main tiles**: (5,1) to (5,5) for horizontal bottom edges (NOT 5,6)
- **Height tiles**: (6,1) to (6,5) below for cliff depth
- **Corners**: (5,0) and (5,6) only for true corner cases

#### Bottom Edge Requirements
- **All bottom edges**: Use (5,1) to (5,5) for horizontal edges
- **Corner pieces**: (5,0) for SW corners, (5,6) for SE corners only
- **Structure**: Main edge tile (row 5) + extension tile below (row 6)
- **Never use (5,6) for horizontal edges**

#### Updated Formation Rules
1. **No formations smaller than 3x3** (9 tiles minimum)
2. **All jutting formations** must be at least 3 tiles in both directions
3. **Bottom edges always need extensions** below them for proper cliff depth
4. **Proper tile selection**: (5,1-5,5) for horizontal, (5,0)/(5,6) for corners only

## Usage Notes
1. **Basic Terrain**: Use rows 0-6 for standard terrain generation
   - Square cliff edges use columns 0-6
   - Diagonal cliff edges use columns 7-10
   - Pure grass tiles are found at (1,1) through (1,5) and variations in rows 2-3
2. **Height System**: 
   - Cliffs have a height of 2 tiles
   - Row 5 tiles must be followed by row 6 tiles below them to show proper depth
   - Diagonal corners also follow this 2-tile height system
3. **Elevation**: Use rows 7-27 to create additional height variation
4. **Variety**: Substitute row 28-29 tiles randomly for visual interest
5. **Zone Transitions**: Use rows 31-37 when transitioning to dark grass zones
6. **Special Effects**: Use rows 38-43 for transparency effects

## Tile Indexing
For programming reference:
- Tile (x,y) = Column x (0-10), Row y (0-43)
- Each tile is 32x32 pixels
- Total green grass zone width: 11 tiles (352 pixels)
- Total height: 44 tiles (1408 pixels)