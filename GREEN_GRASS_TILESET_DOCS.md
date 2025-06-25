# Green Grass Zone Documentation (MainLev2.0.png)
## Columns 0-10, Rows 0-43

### Basic Autotiling Section (Rows 0-6)
These tiles form the foundation for creating coherent terrain with proper edges and corners. The system includes both square (orthogonal) and diagonal cliff edges.

#### Row 0 - Top Edges & Diagonal Corners
- (0,0): Northwest outer corner (square cliff edge on top and left)
- (0,1): North edge tile 1 (cliff on top)
- (0,2): North edge tile 2 (cliff on top, variation)
- (0,3): North edge tile 3 (cliff on top, variation)
- (0,4): North edge tile 4 (cliff on top, variation)
- (0,5): North edge tile 5 (cliff on top, variation)
- (0,6): Northeast outer corner (square cliff edge on top and right)
- (0,7): Empty
- (0,8): Northwest outer diagonal corner
- (0,9): Northeast outer diagonal corner
- (0,10): Empty

#### Row 1 - Side Edges & Pure Grass
- (1,0): West edge tile (cliff on left)
- (1,1): Pure green grass tile
- (1,2): Pure green grass tile (variation)
- (1,3): Pure green grass tile (variation)
- (1,4): Pure green grass tile (variation)
- (1,5): Pure green grass tile (variation)
- (1,6): East edge tile (cliff on right)
- (1,7): Second northwest diagonal corner
- (1,8): Inner diagonal connecting (1,7) and (0,8)
- (1,9): Inner diagonal connecting (0,9) and (1,10)
- (1,10): Second northeast diagonal corner

#### Row 2 - Side Edge Variations & Inner Corners
- (2,0): West edge variation 2
- (2,1): Pure green grass tile (variation)
- (2,2): Pure green grass tile (variation)
- (2,3): Pure green grass tile (variation)
- (2,4): Pure green grass tile (variation)
- (2,5): Pure green grass tile (variation)
- (2,6): East edge variation 2
- (2,7): Northwest inner corner (goes below (1,7))
- (2,8): Empty
- (2,9): Empty
- (2,10): Northeast inner corner (goes below (1,10))

#### Row 3 - Side Edge Variations & Southwest Diagonal Start
- (3,0): West edge variation 3
- (3,1): Pure green grass tile (variation)
- (3,2): Pure green grass tile (variation)
- (3,3): Pure green grass tile (variation)
- (3,4): Pure green grass tile (variation)
- (3,5): Pure green grass tile (variation)
- (3,6): East edge variation 3
- (3,7): Beginning of southwest diagonal downwards
- (3,8): Always positioned east of (3,7)
- (3,9): Inner diagonal always west of (3,10)
- (3,10): Southeast diagonal start

#### Row 4 - Continued side variations
- (4,0): West edge variation 4
- (4,1): Pure green grass tile (variation)
- (4,2): Pure green grass tile (variation)
- (4,3): Pure green grass tile (variation)
- (4,4): Pure green grass tile (variation)
- (4,5): Pure green grass tile (variation)
- (4,6): East edge variation 4
- (4,7): Height depth tile (always below (3,7))
- (4,8): Second southwest diagonal (below (3,8))
- (4,9): Second southeast diagonal (below (3,9))
- (4,10): Height depth tile (below (3,10))

#### Row 5 - Bottom Edges & Height Layer 1
- (5,0): Southwest corner of cliff edge
- (5,1): Bottom cliff edge tile 1
- (5,2): Bottom cliff edge tile 2
- (5,3): Bottom cliff edge tile 3
- (5,4): Bottom cliff edge tile 4
- (5,5): Bottom cliff edge tile 5
- (5,6): Southeast corner of cliff edge
- (5,7): Empty
- (5,8): Always goes below (4,8)
- (5,9): Always goes below (4,9)
- (5,10): Empty

#### Row 6 - Height Layer 2 (Vertical Depth)
- (6,0): Second vertical layer (always below (5,0))
- (6,1): Second vertical layer (always below (5,1))
- (6,2): Second vertical layer (always below (5,2))
- (6,3): Second vertical layer (always below (5,3))
- (6,4): Second vertical layer (always below (5,4))
- (6,5): Second vertical layer (always below (5,5))
- (6,6): Second vertical layer (always below (5,6))
- (6,7): Empty
- (6,8): Always goes below (5,8)
- (6,9): Always goes below (5,9)
- (6,10): Empty

### Height Feature Section (Rows 7-27)
These tiles create the illusion of elevation and depth in the 2D world.

#### Rows 7-10 - Basic Elevated Platforms
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