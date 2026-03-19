"""
Pixel Art to Text Sprite Converter

Converts a PNG image to the text-based sprite format used in monster-sprites.js
Automatically resizes to 32x32 and quantizes colors.

Usage: python pixel-to-text-converter.py <image-path> [sprite-name] [--size 32]
"""

import sys
import os
from pathlib import Path
from collections import Counter

try:
    from PIL import Image
except ImportError:
    print("PIL not found. Installing Pillow...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image


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


def is_background_color(r, g, b):
    """
    Detect if a color is likely a background/checkerboard pattern.
    Common patterns: near-white, near-gray checkerboard colors.
    """
    # Pure gray detection (checkerboard patterns are typically gray)
    if abs(r - g) < 5 and abs(g - b) < 5 and abs(r - b) < 5:
        # It's grayscale - likely background if light gray or white
        if r > 200:  # Light gray or white
            return True
    return False


def get_dominant_colors(img, max_colors=12):
    """Extract dominant colors from the image, excluding background colors."""
    pixels = list(img.convert('RGBA').getdata())

    # Filter out transparent and background pixels
    color_counts = Counter()
    for r, g, b, a in pixels:
        if a < 200:  # More strict alpha threshold
            continue
        if is_background_color(r, g, b):
            continue
        color_counts[(r, g, b)] += 1

    # Get most common colors
    dominant = [color for color, count in color_counts.most_common(max_colors * 3)]

    if len(dominant) == 0:
        return [(128, 128, 128)]

    # Simple clustering - merge colors that are very close
    clustered = []
    used = set()

    for color in dominant:
        if color in used:
            continue

        # Find all similar colors
        cluster = [color]
        for other in dominant:
            if other not in used and other != color:
                if rgb_distance(color, other) < 25:
                    cluster.append(other)
                    used.add(other)

        # Average the cluster
        avg_r = sum(c[0] for c in cluster) // len(cluster)
        avg_g = sum(c[1] for c in cluster) // len(cluster)
        avg_b = sum(c[2] for c in cluster) // len(cluster)
        clustered.append((avg_r, avg_g, avg_b))
        used.add(color)

        if len(clustered) >= max_colors:
            break

    return clustered[:max_colors]


def convert_image(image_path, sprite_name=None, target_size=32, max_colors=10):
    img = Image.open(image_path).convert('RGBA')
    original_size = img.size

    print(f"Original dimensions: {original_size[0]}x{original_size[1]}")

    # First, crop to the bounding box of non-transparent content
    # This removes any padding and centers the sprite
    bbox = img.getbbox()
    if bbox:
        # Add small padding
        pad = 2
        bbox = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(img.width, bbox[2] + pad),
            min(img.height, bbox[3] + pad)
        )
        img_cropped = img.crop(bbox)
        print(f"Cropped to content: {img_cropped.size[0]}x{img_cropped.size[1]}")
    else:
        img_cropped = img

    # Resize to target size
    # Use BOX for downscaling to preserve hard edges better
    if img_cropped.size[0] != target_size or img_cropped.size[1] != target_size:
        # Make it square first by padding
        max_dim = max(img_cropped.size)
        square_img = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
        offset = ((max_dim - img_cropped.size[0]) // 2, (max_dim - img_cropped.size[1]) // 2)
        square_img.paste(img_cropped, offset)

        # Now resize
        img_resized = square_img.resize((target_size, target_size), Image.Resampling.BOX)
        print(f"Resized to: {target_size}x{target_size}")
    else:
        img_resized = img_cropped

    # Get dominant colors for the palette
    palette_colors = get_dominant_colors(img_resized, max_colors)
    print(f"\nExtracted {len(palette_colors)} dominant colors for palette")

    width, height = img_resized.size
    pixels_data = list(img_resized.getdata())

    # Build pixel grid with quantized colors
    pixel_grid = []
    color_usage = Counter()

    for y in range(height):
        row = []
        for x in range(width):
            idx = y * width + x
            r, g, b, a = pixels_data[idx]

            # Strict transparency check
            if a < 180:
                row.append({'transparent': True})
            elif is_background_color(r, g, b):
                row.append({'transparent': True})
            else:
                # Quantize to nearest palette color
                quantized = quantize_color((r, g, b), palette_colors)
                color_usage[quantized] += 1
                row.append({'transparent': False, 'color': quantized})
        pixel_grid.append(row)

    # Sort colors by brightness (light to dark) for intuitive character assignment
    sorted_colors = sorted(color_usage.keys(), key=lambda c: -(c[0] + c[1] + c[2]))

    print(f"\nFinal palette ({len(sorted_colors)} colors):")

    # Assign characters based on typical sprite conventions
    char_hints = ['H', 'L', 'M', 'B', 'S', 'D', 'C', 'o', 'E', 'F', 'G', 'I', 'J', 'K']

    color_to_char = {}
    for i, color in enumerate(sorted_colors):
        char = char_hints[i] if i < len(char_hints) else chr(ord('a') + i - len(char_hints))
        color_to_char[color] = char
        hex_color = '#{:02X}{:02X}{:02X}'.format(*color)
        print(f"  '{char}': '{hex_color}',  // {color_usage[color]} pixels, RGB{color}")

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

    # Generate output name
    if sprite_name is None:
        sprite_name = Path(image_path).stem
        sprite_name = ''.join(c if c.isalnum() or c == '_' else '_' for c in sprite_name)

    output = f"""// ============================================================================
// {sprite_name.upper()} SPRITE DEFINITION
// ============================================================================
// Auto-converted from: {Path(image_path).name}
// Original size: {original_size[0]}x{original_size[1]}, scaled to {width}x{height}
// ============================================================================

const {sprite_name.upper()}_SPRITE = {{
    name: '{sprite_name}',
    width: {width},
    height: {height},
    pixels: [
{chr(10).join(f'        "{row}",' for row in pixel_strings)}
    ],
    palette: {{
{chr(10).join(f"        '{char}': '{hex_val}'," for char, hex_val in palette.items())}
    }}
}};

// Export for use in other modules
if (typeof window !== 'undefined') {{
    window.{sprite_name.upper()}_SPRITE = {sprite_name.upper()}_SPRITE;
}}
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = {{ {sprite_name.upper()}_SPRITE }};
}}

console.log('[{sprite_name}] Loaded sprite definition');
"""

    # Write output
    output_dir = Path(image_path).parent.parent / 'sprites'
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / f'{sprite_name}-sprite.js'

    with open(output_path, 'w') as f:
        f.write(output)

    print(f"\nSprite definition written to: {output_path}")

    # Print raw data
    print('\n--- RAW PIXEL DATA (copy-paste ready) ---\n')
    print('pixels: [')
    for row in pixel_strings:
        print(f'    "{row}",')
    print('],')
    print('\npalette: {')
    for char, hex_val in palette.items():
        print(f"    '{char}': '{hex_val}',")
    print('}')

    return pixel_strings, palette


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python pixel-to-text-converter.py <image-path> [sprite-name] [--size N] [--colors N]")
        print("  --size N    Target size (default: 32)")
        print("  --colors N  Max palette colors (default: 10)")
        sys.exit(1)

    image_path = sys.argv[1]
    sprite_name = None
    target_size = 32
    max_colors = 10

    # Parse arguments
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--size' and i + 1 < len(sys.argv):
            target_size = int(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == '--colors' and i + 1 < len(sys.argv):
            max_colors = int(sys.argv[i + 1])
            i += 2
        elif not sys.argv[i].startswith('--'):
            sprite_name = sys.argv[i]
            i += 1
        else:
            i += 1

    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        sys.exit(1)

    convert_image(image_path, sprite_name, target_size, max_colors)
