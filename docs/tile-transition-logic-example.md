# Tile Transition Logic Example

This document captures the tile transition pattern used for biome transitions in the game. This pattern is used for both grass-to-snow and white-snow-to-variant transitions.

## Core Concept

Transitions are always handled from the perspective of the "base" tile type:
- Green grass handles transitions to dark grass and snow
- White snow handles transitions to blue and grey snow variants

The "base" tile detects neighbors of different types and applies transparency overlays to create smooth transitions.

## Implementation Pattern

### 1. Perspective and Direction Logic

**IMPORTANT**: The logic uses **reversed directions** - when the variant/different biome is to the south of the base tile, it uses the **north edge** of the transition area. This creates the visual effect of the base tile "fading into" the variant.

### 2. Rendering Approach

1. **Base layer**: The variant/different biome tile (what shows through transparent parts)
2. **Overlay**: The base biome's transparency tile

### 3. Priority Order

The transition selection follows this priority:
1. **Inner corners** (two adjacent cardinals) - highest priority
2. **Outer diagonal edges** (diagonal only, no adjacent cardinals)
3. **Single cardinal edges**
4. **Edge variants** (used when multiple neighbors exist)
5. **Fallback patterns**

## Example: White Snow to Blue/Grey Snow Transitions

Using white snow transparency tiles from the snow tileset:

### Single Cardinal Edges
- Blue/grey snow to **south** (N edge): row 38, col 1
- Blue/grey snow to **east** (W edge): row 39, col 0
- Blue/grey snow to **west** (E edge): row 39, col 4
- Blue/grey snow to **north** (S edge): row 42, col 1

### Inner Corners (two adjacent cardinals)
- Blue/grey snow **south & east**: row 36, col 2 (NW inner corner)
- Blue/grey snow **south & west**: row 36, col 3 (NE inner corner)
- Blue/grey snow **north & east**: row 37, col 2 (SW inner corner)
- Blue/grey snow **north & west**: row 37, col 3 (SE inner corner)

### Outer Diagonal Edges (diagonal only, no adjacent cardinals)
- Blue/grey snow **southeast only**: row 38, col 0
- Blue/grey snow **southwest only**: row 38, col 4
- Blue/grey snow **northeast only**: row 42, col 0
- Blue/grey snow **northwest only**: row 42, col 4

### Edge Variants (used when multiple neighbors)
- **West edge variants**: rows 40-41, col 0
- **East edge variants**: rows 40-41, col 4
- **North edge variants**: row 38, cols 2-3
- **South edge variants**: row 42, cols 2-3

## Code Implementation Pattern

```typescript
// Check all 8 directions for variant neighbors
if (isVariant(x, y - 1)) bitmask |= BITS.NORTH;
if (isVariant(x + 1, y)) bitmask |= BITS.EAST;
// ... etc for all 8 directions

// Priority 1: Inner corners (two adjacent cardinals)
if (hasSouth && hasEast) return { row: 36, col: 2 };
if (hasSouth && hasWest) return { row: 36, col: 3 };
// ... etc

// Priority 2: Outer diagonal edges
if (hasSoutheast && !hasSouth && !hasEast) return { row: 38, col: 0 };
// ... etc

// Priority 3: Single cardinal edges
if (hasSouth && !hasEast && !hasNorth && !hasWest) return { row: 38, col: 1 };
// ... etc
```

## Key Principles

1. **Always approach from base tile perspective** - The base tile checks for variants, not the other way around
2. **Use reversed directions** - Neighbor direction determines which edge of the transition area to use
3. **Transparency allows base to show through** - The overlay tile has transparent areas where the variant shows
4. **Consistent priority order** - Inner corners > outer diagonals > single edges > variants
5. **Column offsets for variants** - Different biome types may use column offsets (e.g., +11 for dark grass)

This pattern ensures smooth, consistent transitions between different tile types throughout the game.