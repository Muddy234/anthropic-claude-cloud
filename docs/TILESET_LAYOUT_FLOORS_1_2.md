# Tileset Layout Guide: Floors 1-2 (Stone Dungeon)

## File Specifications

| Property | Value |
|----------|-------|
| **Filename** | `dungeon_upper.png` |
| **Location** | `assets/spritesheets/dungeon_upper.png` |
| **Tile Size** | 16 x 16 pixels |
| **Grid Size** | 12 columns x 13 rows |
| **Total Dimensions** | 192 x 208 pixels |
| **Format** | PNG with transparency |

---

## Visual Grid Layout

Each cell below represents one 16x16 tile. Numbers show `(row, col)` coordinates.

```
     Col:  0        1        2        3        4        5        6        7        8        9        10       11
         ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┐
Row 0    │ WALL   │ WALL   │ WALL   │ WALL   │ DOOR   │ DOOR   │ ENTRY  │ ENTRY  │ WALL   │ WALL   │ WALL   │ WALL   │
         │ brick  │ brick  │ brick  │ brick  │ arch   │ arch   │ mine   │ cave   │ top    │ top    │ top    │ corner │
         │ clean  │cracked │ mossy  │damaged │ stone  │ wood   │        │        │ left   │ center │ right  │ outer  │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 1    │ WALL   │ WALL   │ WALL   │ WALL   │ CORNER │ CORNER │ CORNER │ CORNER │ PILLAR │ PILLAR │ PILLAR │        │
         │ left   │ center │ right  │ bottom │ inner  │ inner  │ inner  │ inner  │ top    │ mid    │ base   │(empty) │
         │        │        │        │        │ TL     │ TR     │ BL     │ BR     │        │        │        │        │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 2    │ FLOOR  │ FLOOR  │ FLOOR  │ FLOOR  │ FLOOR  │ FLOOR  │ FLOOR  │ FLOOR  │ FLOOR  │ FLOOR  │        │        │
         │ stone  │ stone  │ stone  │ stone  │ large  │ large  │ large  │ large  │detail  │detail  │(empty) │(empty) │
         │ clean  │cracked │ worn   │ mossy  │ tile 1 │ tile 2 │ tile 3 │ tile 4 │ 1      │ 2      │        │        │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 3    │ FLOOR  │ FLOOR  │ FLOOR  │ FLOOR  │ TRANS  │ TRANS  │ TRANS  │ TRANS  │        │        │        │        │
         │ dirt   │ dirt   │ earth  │ mud    │ stone/ │ stone/ │ stone/ │ stone/ │(empty) │(empty) │(empty) │(empty) │
         │ 1      │ 2      │ rocky  │        │ dirt N │ dirt S │ dirt E │ dirt W │        │        │        │        │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 4    │ PIT    │ PIT    │ PIT    │ PIT    │ PIT    │ PIT    │ PIT    │ PIT    │ PIT    │        │        │        │
         │ center │ edge   │ edge   │ edge   │ edge   │ corner │ corner │ corner │ corner │(empty) │(empty) │(empty) │
         │        │ N      │ S      │ E      │ W      │ NW     │ NE     │ SW     │ SE     │        │        │        │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 5    │CRYSTAL │CRYSTAL │CRYSTAL │CRYSTAL │CRYSTAL │CRYSTAL │CRYSTAL │CRYSTAL │CRYSTAL │CRYSTAL │        │        │
         │ blue   │ blue   │ blue   │ blue   │ purple │ purple │ purple │ purple │ mixed  │ mixed  │(empty) │(empty) │
         │ small  │ medium │ large  │cluster │ small  │ medium │ large  │cluster │ 1      │ 2      │        │        │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 6    │ LAVA   │ LAVA   │ LAVA   │ LAVA   │ LAVA   │ LAVA   │ LAVA   │ LAVA   │ LAVA   │        │        │        │
         │ crack  │ crack  │ crack  │ crack  │ spread │ spread │ spread │ spread │ spread │(empty) │(empty) │(empty) │
         │ light  │ medium │ heavy  │ severe │ N      │ S      │ E      │ W      │ center │        │        │        │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 7    │ CRATE  │ CRATE  │ CRATE  │ CRATE  │ BARREL │ BARREL │ BARREL │ BARREL │ CRATES │BARRELS │        │        │
         │ wood   │ wood   │ metal  │ broken │ wood   │ wood   │ metal  │ broken │stacked │stacked │(empty) │(empty) │
         │ 1      │ 2      │        │        │ 1      │ 2      │        │        │        │        │        │        │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 8    │LANTERN │LANTERN │LANTERN │LANTERN │ TORCH  │ TORCH  │ TORCH  │ TORCH  │BRAZIER │BRAZIER │        │        │
         │hanging │hanging │standing│standing│ wall   │ wall   │ floor  │ floor  │ lit    │ unlit  │(empty) │(empty) │
         │ lit    │ unlit  │ lit    │ unlit  │ lit    │ unlit  │ lit    │ unlit  │        │        │        │        │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 9    │PILLAR  │PILLAR  │PILLAR  │PILLAR  │PILLAR  │PILLAR  │PILLAR  │PILLAR  │ CHAIN  │ ROPE   │        │        │
         │ stone  │ stone  │ stone  │ stone  │ wood   │ wood   │ wood   │ wood   │vertical│ coiled │(empty) │(empty) │
         │ top    │ mid    │ base   │ broken │ top    │ mid    │ base   │ broken │        │        │        │        │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 10   │SKELETON│SKELETON│SKELETON│ BONES  │ BONES  │ SKULL  │ SKULLS │ RUBBLE │ RUBBLE │        │        │        │
         │sitting │ lying  │chained │ pile   │ pile   │ single │ pile   │ stone  │ wood   │(empty) │(empty) │(empty) │
         │        │        │        │ small  │ large  │        │        │        │        │        │        │        │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 11   │PICKAXE │PICKAXE │ SHOVEL │ CART   │ CART   │LANTERN │ RAIL   │ RAIL   │        │        │        │        │
         │ wall   │ floor  │        │ empty  │ full   │ mining │ horiz  │ vert   │(empty) │(empty) │(empty) │(empty) │
         │        │        │        │        │        │        │        │        │        │        │        │        │
         ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Row 12   │ BARS   │ BARS   │ CAGE   │ CAGE   │ CAGE   │ CAGE   │ CAGE   │SHACKLES│        │        │        │        │
         │vertical│ horiz  │ small  │ large  │ large  │ large  │ large  │        │(empty) │(empty) │(empty) │(empty) │
         │        │        │        │ TL     │ TR     │ BL     │ BR     │        │        │        │        │        │
         └────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┘
```

---

## Row-by-Row Breakdown

### Row 0: Stone Walls (Upper)
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0 | `wall_brick_clean` | Clean grey brick wall |
| 1 | `wall_brick_cracked` | Cracked brick wall |
| 2 | `wall_brick_mossy` | Mossy/overgrown brick wall |
| 3 | `wall_brick_damaged` | Heavily damaged wall |
| 4 | `door_arch_stone` | Stone arched doorway |
| 5 | `door_arch_wood` | Wood-framed arched doorway |
| 6 | `entrance_mine` | Mine shaft entrance |
| 7 | `entrance_cave` | Natural cave opening |
| 8 | `wall_top_left` | Top-left corner piece |
| 9 | `wall_top_center` | Top wall edge |
| 10 | `wall_top_right` | Top-right corner piece |
| 11 | `wall_corner_outer` | Outer corner piece |

### Row 1: Stone Walls (Lower/Sides)
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0 | `wall_left` | Left side wall |
| 1 | `wall_center` | Center/fill wall |
| 2 | `wall_right` | Right side wall |
| 3 | `wall_bottom` | Bottom wall edge |
| 4 | `inner_corner_tl` | Inner corner top-left |
| 5 | `inner_corner_tr` | Inner corner top-right |
| 6 | `inner_corner_bl` | Inner corner bottom-left |
| 7 | `inner_corner_br` | Inner corner bottom-right |
| 8 | `wall_pillar_top` | Wall pillar top |
| 9 | `wall_pillar_mid` | Wall pillar middle |
| 10 | `wall_pillar_base` | Wall pillar base |

### Row 2: Stone Floor Tiles
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0 | `floor_stone_clean` | Clean stone floor |
| 1 | `floor_stone_cracked` | Cracked stone floor |
| 2 | `floor_stone_worn` | Worn/weathered floor |
| 3 | `floor_stone_mossy` | Mossy floor |
| 4-7 | `floor_large_tile_1-4` | Large tile pattern variations |
| 8-9 | `floor_detailed_1-2` | Detailed/decorated floors |

### Row 3: Earth/Dirt Floors
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0-1 | `floor_dirt_1-2` | Basic dirt floor variations |
| 2 | `floor_earth_rocky` | Rocky earth |
| 3 | `floor_mud` | Muddy floor |
| 4-7 | `transition_stone_dirt_*` | Stone-to-dirt transitions (N/S/E/W) |

### Row 4: Pit/Void Tiles
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0 | `pit_center` | Center of pit (black void) |
| 1-4 | `pit_edge_*` | Pit edges (N/S/E/W) |
| 5-8 | `pit_corner_*` | Pit corners (NW/NE/SW/SE) |

### Row 5: Crystal Decorations
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0-3 | `crystal_blue_*` | Blue crystals (small/medium/large/cluster) |
| 4-7 | `crystal_purple_*` | Purple crystals (small/medium/large/cluster) |
| 8-9 | `crystal_mixed_1-2` | Mixed crystal formations |

### Row 6: Lava Crack Overlays
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0-3 | `crack_lava_*` | Crack intensity (light/medium/heavy/severe) |
| 4-7 | `crack_spread_*` | Directional spread (N/S/E/W) |
| 8 | `crack_spread_center` | Center spread pattern |

### Row 7: Storage Props
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0-1 | `crate_wood_1-2` | Wooden crate variations |
| 2 | `crate_metal` | Metal reinforced crate |
| 3 | `crate_broken` | Broken crate |
| 4-5 | `barrel_wood_1-2` | Wooden barrel variations |
| 6 | `barrel_metal` | Metal barrel |
| 7 | `barrel_broken` | Broken barrel |
| 8 | `crates_stacked` | Stacked crates |
| 9 | `barrels_stacked` | Stacked barrels |

### Row 8: Lighting Props
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0-1 | `lantern_hanging_*` | Hanging lantern (lit/unlit) |
| 2-3 | `lantern_standing_*` | Standing lantern (lit/unlit) |
| 4-5 | `torch_wall_*` | Wall torch (lit/unlit) |
| 6-7 | `torch_floor_*` | Floor torch (lit/unlit) |
| 8-9 | `brazier_*` | Brazier (lit/unlit) |

### Row 9: Structural Props
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0-3 | `pillar_stone_*` | Stone pillar (top/mid/base/broken) |
| 4-7 | `pillar_wood_*` | Wood pillar (top/mid/base/broken) |
| 8 | `chain_vertical` | Hanging chain |
| 9 | `rope_coiled` | Coiled rope |

### Row 10: Remains/Debris
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0 | `skeleton_sitting` | Skeleton sitting against wall |
| 1 | `skeleton_lying` | Skeleton lying on floor |
| 2 | `skeleton_chained` | Chained skeleton |
| 3-4 | `bones_pile_*` | Bone pile (small/large) |
| 5 | `skull_single` | Single skull |
| 6 | `skulls_pile` | Pile of skulls |
| 7-8 | `rubble_*` | Rubble (stone/wood) |

### Row 11: Mining Props
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0 | `pickaxe_wall` | Pickaxe leaning on wall |
| 1 | `pickaxe_floor` | Pickaxe on floor |
| 2 | `shovel` | Shovel |
| 3 | `mining_cart` | Empty mining cart |
| 4 | `mining_cart_full` | Full mining cart (ore) |
| 5 | `lantern_mining` | Mining lantern |
| 6 | `rail_track_h` | Horizontal rail track |
| 7 | `rail_track_v` | Vertical rail track |

### Row 12: Prison Props
| Col | Tile Name | Description |
|-----|-----------|-------------|
| 0 | `bars_vertical` | Vertical prison bars |
| 1 | `bars_horizontal` | Horizontal bars |
| 2 | `cage_small` | Small cage (1 tile) |
| 3-6 | `cage_large_*` | Large cage corners (TL/TR/BL/BR) |
| 7 | `shackles` | Wall shackles |

---

## Animation Notes

For animated tiles, place animation frames **horizontally adjacent**:

| Tile Type | Frames | Notes |
|-----------|--------|-------|
| Torches (lit) | 2-4 frames | Flickering flame |
| Brazier (lit) | 2-4 frames | Flickering fire |
| Lanterns (lit) | 2 frames | Subtle glow pulse |
| Lava cracks | 2-3 frames | Pulsing glow |
| Crystals | 2 frames | Optional shimmer |

**Example:** If `torch_wall_lit` needs 3 animation frames, use columns 4, 5, 6 for frames 1, 2, 3.

---

## Color Palette Reference

| Element | Primary Colors | Notes |
|---------|---------------|-------|
| Stone walls | `#4a4a4a`, `#3a3a3a`, `#2a2a2a` | Grey tones |
| Stone floors | `#5a5a5a`, `#4a4a4a` | Slightly lighter |
| Dirt/earth | `#5a4a3a`, `#4a3a2a` | Brown tones |
| Blue crystals | `#4488ff`, `#66aaff` | Bright cyan-blue |
| Purple crystals | `#8844ff`, `#aa66ff` | Magenta-purple |
| Lava cracks | `#ff4400`, `#ff6600` | Orange-red glow |
| Wood (crates) | `#8b6914`, `#6b4914` | Warm brown |
| Metal | `#6a6a7a`, `#5a5a6a` | Blue-grey steel |

---

## Checklist for Design Team

- [ ] Create 192 x 208 pixel PNG
- [ ] Arrange tiles in 12 x 13 grid (16px each)
- [ ] Include transparency for props/decorations
- [ ] Match positions to grid layout above
- [ ] Save as `assets/spritesheets/dungeon_upper.png`
- [ ] Test in-game by loading floor 1

---

## Questions?

If you need to reorganize the layout, just let the dev team know and we'll update the coordinate mappings in `js/data/tileset-floors-1-2.js`.
