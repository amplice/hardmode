# MainLev2.0.png Tileset Documentation (UNIFIED)
## Comprehensive Tileset Reference - Columns 0-63, Rows 0-43

**⚠️ CRITICAL COORDINATE SYSTEM NOTE**
- **Format**: (row, column) where row = y-coordinate (vertical), column = x-coordinate (horizontal)
- **Green grass main tile**: (1,1) = row 1, column 1
- **Dark grass main tile**: (1,12) = row 1, column 12 (same row, +11 column offset)
- **Transition tiles**: rows 30-36, columns 0-9

This tileset contains green grass, dark grass, and transition tiles for creating varied terrain with mini-biomes.

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

#### Rows 13-17 - Stairs and Steps (Complete Reference)
**West Stairs**:
- Location: Rows 13-16, Columns 2-3
- Size: 4 rows × 2 columns
- Placement: Western edges of plateaus

**North Stairs**:
- Location: Rows 13-14, Columns 4-6
- Size: 2 rows × 3 columns
- Placement: Northern edges of plateaus

**South Stairs**:
- Location: Rows 15-17, Columns 4-6
- Size: 3 rows × 3 columns
- Placement: Southern edges of plateaus

**East Stairs**:
- Location: Rows 13-16, Columns 7-8
- Size: 4 rows × 2 columns
- Placement: Eastern edges of plateaus

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

## Dark Grass Zone (Columns 11-21, Rows 0-10) 
**IMPORTANT**: The dark grass zone has exactly the same layout and structure as the green grass zone but uses **column offset +11**.

### Dark Grass Autotiling Section (Same Rows, Different Columns)
- **Row 0, Columns 11-21**: Top edges & diagonal corners (mirrors row 0, cols 0-10)
- **Row 1, Columns 11-21**: Side edges & diagonal edges (mirrors row 1, cols 0-10)  
- **Row 2, Columns 11-21**: Side edge variations & diagonal connectors (mirrors row 2, cols 0-10)
- **Row 3, Columns 11-21**: Side edge variations (mirrors row 3, cols 0-10)
- **Row 4, Columns 11-21**: Side edge variations & bottom diagonal connectors (mirrors row 4, cols 0-10)
- **Row 5, Columns 11-21**: Bottom edges (mirrors row 5, cols 0-10)
- **Row 6, Columns 11-21**: Height Layer 2 for dark grass (mirrors row 6, cols 0-10)

### Dark Grass Key Coordinates
- **Main dark grass tile**: (1,12) - equivalent to green grass (1,1)
- **Dark grass variations**: (1,13), (1,14), (1,15), (1,16) - same row, different columns
- **Dark NW corner**: (0,11) - equivalent to green NW corner (0,0)
- **Dark SE corner**: (5,17) - equivalent to green SE corner (5,6)

All placement rules, corner logic, and cliff formation requirements that apply to green grass also apply to dark grass using the corresponding **column offset +11**, NOT row offset.

## Green-Dark Grass Transitions (Rows 30-36, Columns 0-9)
These tiles handle the blending between green and dark grass biomes.

### Diagonal Transition Tiles (30,0) to (31,1)
- **(30,0)**: Green grass top-left, dark grass bottom-right (diagonal split)
- **(30,1)**: Green grass top-right, dark grass bottom-left (diagonal split)
- **(31,0)**: Green grass bottom-left, dark grass top-right (diagonal split)
- **(31,1)**: Green grass bottom-right, dark grass top-left (diagonal split)
Used for outer diagonal transitions where biomes meet at an angle.

### Green Grass Corner Patches (30,2) to (31,3)
Small green grass patches surrounded by dark grass:
- **(30,2)**: Tiny green patch in top-left corner
- **(30,3)**: Tiny green patch in top-right corner
- **(31,2)**: Tiny green patch in bottom-left corner
- **(31,3)**: Tiny green patch in bottom-right corner

### Dark Grass Corner Patches (30,4) to (31,5)
Small dark grass patches surrounded by green grass:
- **(30,4)**: Tiny dark patch in bottom-right corner
- **(30,5)**: Tiny dark patch in bottom-left corner
- **(31,4)**: Tiny dark patch in top-right corner
- **(31,5)**: Tiny dark patch in top-left corner

### Green to Dark Transitions (Rows 30-34, Columns 0-4)
5x5 autotiling set where green grass transitions to dark grass:
- **(30,0)**: NW outer corner (green outside, dark inside)
- **(30,1)**: N edge (green north, dark south)
- **(30,2)**: N edge center variant
- **(30,3)**: N edge variant
- **(30,4)**: NE outer corner (green outside, dark inside)
- **(31,0)**: W edge (green west, dark east)
- **(31,1-31,3)**: Center/fill tiles
- **(31,4)**: E edge (green east, dark west)
- **(32,0-32,4)**: Center row transition patterns
- **(33,0)**: W edge variant
- **(33,4)**: E edge variant
- **(34,0)**: SW outer corner (green outside, dark inside)
- **(34,1-34,3)**: S edge variants (green south, dark north)
- **(34,4)**: SE outer corner (green outside, dark inside)

### Dark to Green Transitions (Rows 30-34, Columns 5-9)
5x5 autotiling set where dark grass transitions to green grass:
- **(30,5)**: NW outer corner (dark outside, green inside)
- **(30,6-30,8)**: N edge (dark north, green south)
- **(30,9)**: NE outer corner (dark outside, green inside)
- **(31,5)**: W edge (dark west, green east)
- **(31,6-31,8)**: Center/fill tiles
- **(31,9)**: E edge (dark east, green west)
- **(32,5-32,9)**: Center row transition patterns
- **(33,5)**: W edge variant
- **(33,9)**: E edge variant
- **(34,5)**: SW outer corner (dark outside, green inside)
- **(34,6-34,8)**: S edge (dark south, green north)
- **(34,9)**: SE outer corner (dark outside, green inside)

### Transition Section (Rows 31-37) - LEGACY
Legacy green grass transitioning to dark grass (may be superseded by new transition system above).

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
1. **Green Grass Terrain**: Use columns 0-10, rows 0-10 for green grass terrain generation
   - Square cliff edges use columns 0-6
   - Diagonal cliff edges use columns 7-10
   - Pure grass tiles are found at (1,1) through (1,5) and variations in rows 2-3
2. **Dark Grass Terrain**: Use columns 11-21, rows 0-10 for dark grass terrain generation
   - Exact same logic as green grass but with +11 column offset
   - Pure dark grass tiles at (1,12) through (1,16) - same rows, different columns
   - All cliff rules apply with corresponding dark grass tiles
3. **Biome Transitions**: Use rows 30-36, columns 0-9 for green-dark grass transitions
   - Green to dark: rows 30-34, columns 0-4 (5x5 autotiling set)
   - Dark to green: rows 30-34, columns 5-9 (5x5 autotiling set) 
   - Inner corners: rows 35-36 (if they exist)
   - Priority-based bitmask selection for natural boundaries
4. **Height System**: 
   - Cliffs have a height of 2 tiles (both green and dark grass)
   - Row 5 tiles must be followed by row 6 tiles below them
   - Diagonal corners follow this 2-tile height system
5. **Stairs**: Use rows 13-17 for stair systems connecting elevation levels
6. **Decorative Elements**: Use rows 27-28 and 22-31,54-63 for grass variations
7. **Legacy Content**: Rows 31-43 contain legacy transitions and special effects

## Mini-Biome Implementation
- Create **large chunks** of each grass type (green or dark)
- Use transition tiles sparingly - only at biome boundaries
- Aim for natural-looking irregular boundaries between biomes
- Dark grass should feel like distinct terrain zones, not scattered patches

## Tile Indexing
For programming reference:
- Tile (x,y) = Column x (0-10), Row y (0-43)
- Each tile is 32x32 pixels
- Total green grass zone width: 11 tiles (352 pixels)
- Total height: 44 tiles (1408 pixels)