"""
Body Part PNG to Text Sprite Converter

Converts individual body part PNGs into a single structured JavaScript file
for the layered sprite animation system. Unlike pixel-to-text-converter.py,
this converter PRESERVES the exact 32x32 canvas positioning (no cropping, no resizing).

Usage:
  python bodypart-converter.py assets/base/ --output js/rendering/body-part-sprites.js

Expected directory structure:
  assets/base/
  ├── down/    (front-facing sprites)
  ├── up/      (back-facing sprites)
  └── mirror/  (side-facing sprites)

Each directory should contain:
  Head_sprite_*.png, Body_sprite_*.png, Left Arm_sprite_*.png,
  Right Arm_sprite_*.png, Left Leg_sprite_*.png, Right Leg_sprite_*.png
"""

import sys
import os
import re
from pathlib import Path
from collections import Counter

try:
    from PIL import Image
except ImportError:
    print("PIL not found. Installing Pillow...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image


# Part name mapping from filename patterns to JS property names
PART_NAME_MAP = {
    'head': 'head',
    'body': 'body',
    'left arm': 'leftArm',
    'left_arm': 'leftArm',
    'right arm': 'rightArm',
    'right_arm': 'rightArm',
    'left leg': 'leftLeg',
    'left_leg': 'leftLeg',
    'right leg': 'rightLeg',
    'right_leg': 'rightLeg',
}

# Direction mapping from folder names to JS property names
DIRECTION_MAP = {
    'down': 'down',
    'up': 'up',
    'mirror': 'left',
}

# Character assignment order (light to dark)
CHAR_HINTS = ['H', 'L', 'M', 'B', 'S', 'D', 'C', 'o', 'E', 'F', 'G', 'I', 'J', 'K',
              'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']


def rgb_distance(c1, c2):
    """Calculate color distance between two RGB tuples."""
    return sum((a - b) ** 2 for a, b in zip(c1, c2)) ** 0.5


def quantize_color(rgb, palette):
    """Find the closest color in the palette."""
    min_dist = float('inf')
    closest = palette[0]
    for p in palette:
        dist = rgb_distance(rgb, p)
        if dist < min_dist:
            min_dist = dist
            closest = p
    return closest


def get_dominant_colors(img, max_colors=10):
    """Extract dominant colors from the image, excluding transparent pixels."""
    pixels = list(img.convert('RGBA').getdata())

    color_counts = Counter()
    for r, g, b, a in pixels:
        if a < 64:  # Low threshold preserves anti-aliased edges
            continue
        color_counts[(r, g, b)] += 1

    dominant = [color for color, count in color_counts.most_common(max_colors * 3)]

    if len(dominant) == 0:
        return [(128, 128, 128)]

    # Simple clustering - merge colors that are very close
    clustered = []
    used = set()

    for color in dominant:
        if color in used:
            continue

        cluster = [color]
        for other in dominant:
            if other not in used and other != color:
                if rgb_distance(color, other) < 20:
                    cluster.append(other)
                    used.add(other)

        avg_r = sum(c[0] for c in cluster) // len(cluster)
        avg_g = sum(c[1] for c in cluster) // len(cluster)
        avg_b = sum(c[2] for c in cluster) // len(cluster)
        clustered.append((avg_r, avg_g, avg_b))
        used.add(color)

        if len(clustered) >= max_colors:
            break

    return clustered[:max_colors]


def extract_part_name(filename):
    """Extract the body part name from a filename."""
    name = Path(filename).stem.lower()
    # Remove _sprite_N suffix
    name = re.sub(r'_sprite_\d+$', '', name)
    # Try to match against known part names
    for pattern, js_name in PART_NAME_MAP.items():
        if pattern in name:
            return js_name
    return name


def convert_bodypart(image_path, max_colors=10):
    """
    Convert a single body part PNG to text format.
    PRESERVES exact 32x32 canvas positioning - no cropping, no resizing.

    Returns: (pixel_strings, palette_dict)
    """
    img = Image.open(image_path).convert('RGBA')

    # Assert 32x32
    if img.size != (32, 32):
        raise ValueError(f"Expected 32x32, got {img.size[0]}x{img.size[1]}. "
                        "Body part PNGs must be pre-positioned on 32x32 canvases.")

    pixels_data = list(img.getdata())

    # Count non-transparent pixels for info
    opaque_count = sum(1 for r, g, b, a in pixels_data if a >= 128)

    # Get dominant colors
    palette_colors = get_dominant_colors(img, max_colors)

    # Build pixel grid - NO cropping, NO resizing
    pixel_grid = []
    color_usage = Counter()

    for y in range(32):
        row = []
        for x in range(32):
            idx = y * 32 + x
            r, g, b, a = pixels_data[idx]

            if a < 64:
                row.append({'transparent': True})
            else:
                quantized = quantize_color((r, g, b), palette_colors)
                color_usage[quantized] += 1
                row.append({'transparent': False, 'color': quantized})
        pixel_grid.append(row)

    # Sort colors by brightness (light to dark)
    sorted_colors = sorted(color_usage.keys(), key=lambda c: -(c[0] + c[1] + c[2]))

    # Assign characters
    color_to_char = {}
    for i, color in enumerate(sorted_colors):
        char = CHAR_HINTS[i] if i < len(CHAR_HINTS) else chr(ord('A') + i)
        color_to_char[color] = char

    # Generate pixel strings
    pixel_strings = []
    for row in pixel_grid:
        row_str = ''
        for pixel in row:
            if pixel['transparent']:
                row_str += '.'
            else:
                row_str += color_to_char[pixel['color']]
        pixel_strings.append(row_str)

    # Generate palette dict
    palette = {}
    for color in sorted_colors:
        char = color_to_char[color]
        palette[char] = '#{:02X}{:02X}{:02X}'.format(*color)

    return pixel_strings, palette, opaque_count


def process_base_directory(base_dir, output_path, max_colors=10):
    """
    Process all body part PNGs in the base directory structure.
    Outputs a single structured JavaScript file.
    """
    base_dir = Path(base_dir)

    if not base_dir.exists():
        raise FileNotFoundError(f"Directory not found: {base_dir}")

    print(f"Processing body parts from: {base_dir}")
    print("=" * 60)

    # Collect all sprites organized by direction and part
    all_sprites = {}

    for dir_name, js_direction in DIRECTION_MAP.items():
        dir_path = base_dir / dir_name
        if not dir_path.exists():
            print(f"  WARNING: Directory not found: {dir_path}")
            continue

        print(f"\n  Direction: {dir_name} -> '{js_direction}'")
        all_sprites[js_direction] = {}

        # Find all PNG files in this directory
        png_files = sorted(dir_path.glob('*.png'))

        if not png_files:
            print(f"    No PNG files found in {dir_path}")
            continue

        for png_path in png_files:
            part_name = extract_part_name(png_path.name)
            print(f"    {png_path.name} -> '{part_name}'", end='')

            try:
                pixel_strings, palette, opaque_count = convert_bodypart(
                    str(png_path), max_colors
                )
                all_sprites[js_direction][part_name] = {
                    'pixels': pixel_strings,
                    'palette': palette,
                }
                print(f" ({opaque_count} pixels, {len(palette)} colors)")
            except Exception as e:
                print(f" ERROR: {e}")

    # Generate JavaScript output
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    js_output = generate_js_output(all_sprites)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_output)

    print(f"\n{'=' * 60}")
    print(f"Output: {output_path}")

    # Summary
    total_parts = sum(len(parts) for parts in all_sprites.values())
    print(f"Total: {total_parts} body part sprites across {len(all_sprites)} directions")

    return all_sprites


def generate_js_output(all_sprites):
    """Generate the structured JavaScript file content."""
    lines = []
    lines.append("// ============================================================================")
    lines.append("// BODY PART SPRITES - Layered Sprite Animation System")
    lines.append("// ============================================================================")
    lines.append("// Auto-generated by bodypart-converter.py")
    lines.append("// DO NOT EDIT MANUALLY - re-run converter to update")
    lines.append("// ============================================================================")
    lines.append("")
    lines.append("const BODY_PART_SPRITES = {")
    lines.append("    name: 'humanoid_base',")
    lines.append("    width: 32,")
    lines.append("    height: 32,")
    lines.append("")
    lines.append("    directions: {")

    direction_order = ['down', 'up', 'left']
    part_order = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']

    for d_idx, direction in enumerate(direction_order):
        if direction not in all_sprites:
            continue

        parts = all_sprites[direction]
        lines.append(f"        // {'Front-facing' if direction == 'down' else 'Back-facing' if direction == 'up' else 'Side-facing (mirror for right)'}")
        lines.append(f"        {direction}: {{")

        for p_idx, part_name in enumerate(part_order):
            if part_name not in parts:
                continue

            sprite = parts[part_name]
            pixels = sprite['pixels']
            palette = sprite['palette']

            lines.append(f"            {part_name}: {{")
            lines.append(f"                pixels: [")
            for row in pixels:
                lines.append(f'                    "{row}",')
            lines.append(f"                ],")
            lines.append(f"                palette: {{")
            for char, hex_val in palette.items():
                lines.append(f"                    '{char}': '{hex_val}',")
            lines.append(f"                }}")

            # Add comma if not last part
            if p_idx < len(part_order) - 1:
                lines[-1] += ","
            lines.append("")

        lines.append(f"        }}")

        # Add comma if not last direction
        if d_idx < len(direction_order) - 1:
            lines[-1] += ","
        lines.append("")

    lines.append("        // right: derived at runtime by flipping 'left' with flipX")
    lines.append("    }")
    lines.append("};")
    lines.append("")
    lines.append("// Export for browser and Node.js")
    lines.append("if (typeof window !== 'undefined') {")
    lines.append("    window.BODY_PART_SPRITES = BODY_PART_SPRITES;")
    lines.append("}")
    lines.append("if (typeof module !== 'undefined' && module.exports) {")
    lines.append("    module.exports = { BODY_PART_SPRITES };")
    lines.append("}")
    lines.append("")

    return '\n'.join(lines)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        print("Examples:")
        print("  python bodypart-converter.py assets/base/")
        print("  python bodypart-converter.py assets/base/ --output js/rendering/body-part-sprites.js")
        print("  python bodypart-converter.py assets/base/ --colors 8")
        sys.exit(1)

    input_dir = sys.argv[1]
    output_path = 'js/rendering/body-part-sprites.js'
    max_colors = 10

    # Parse arguments
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--output' and i + 1 < len(sys.argv):
            output_path = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--colors' and i + 1 < len(sys.argv):
            max_colors = int(sys.argv[i + 1])
            i += 2
        else:
            i += 1

    if not os.path.isdir(input_dir):
        print(f"Not a directory: {input_dir}")
        sys.exit(1)

    process_base_directory(input_dir, output_path, max_colors)
