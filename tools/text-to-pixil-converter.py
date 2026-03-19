"""
Text Sprite to Pixil Converter

Converts the text-based sprite format (used in assets/sprites/*.js) to .pixil files
that can be opened and edited in Pixilart (https://www.pixilart.com/).

Usage:
  Single file:  python text-to-pixil-converter.py assets/sprites/cave_bat-sprite.js
  All sprites:  python text-to-pixil-converter.py assets/sprites/

Output:
  Creates .pixil files in tools/pixil_exports/ (or specify with --output)

After editing in Pixilart, use the PNG export and pixel-to-text-converter.py to convert back.
"""

import sys
import os
import re
import json
import base64
import io
import uuid
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("PIL not found. Installing Pillow...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image


def parse_sprite_js(js_content):
    """
    Parse a sprite JS file and extract the sprite data.
    Returns dict with: name, width, height, pixels (list of strings), palette (dict)
    """
    # Extract sprite name
    name_match = re.search(r"name:\s*['\"]([^'\"]+)['\"]", js_content)
    name = name_match.group(1) if name_match else "sprite"

    # Extract dimensions
    width_match = re.search(r"width:\s*(\d+)", js_content)
    height_match = re.search(r"height:\s*(\d+)", js_content)
    width = int(width_match.group(1)) if width_match else 32
    height = int(height_match.group(1)) if height_match else 32

    # Extract pixels array
    pixels_match = re.search(r"pixels:\s*\[(.*?)\]", js_content, re.DOTALL)
    if not pixels_match:
        raise ValueError("Could not find pixels array in sprite file")

    pixels_raw = pixels_match.group(1)
    # Extract all quoted strings
    pixel_rows = re.findall(r'["\']([^"\']*)["\']', pixels_raw)

    # Extract palette
    palette_match = re.search(r"palette:\s*\{(.*?)\}", js_content, re.DOTALL)
    if not palette_match:
        raise ValueError("Could not find palette in sprite file")

    palette_raw = palette_match.group(1)
    # Parse palette entries: 'char': '#hexcolor'
    palette = {}
    palette_entries = re.findall(r"['\"](.)['\"]:\s*['\"]([^'\"]+)['\"]", palette_raw)
    for char, color in palette_entries:
        palette[char] = color

    return {
        'name': name,
        'width': width,
        'height': height,
        'pixels': pixel_rows,
        'palette': palette
    }


def hex_to_rgba(hex_color):
    """Convert hex color string to RGBA tuple."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        return (r, g, b, 255)
    elif len(hex_color) == 8:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        a = int(hex_color[6:8], 16)
        return (r, g, b, a)
    else:
        return (128, 128, 128, 255)


def sprite_to_png(sprite_data):
    """
    Convert sprite data to a PIL Image.
    Returns Image object.
    """
    width = sprite_data['width']
    height = sprite_data['height']
    pixels = sprite_data['pixels']
    palette = sprite_data['palette']

    # Create image with transparency
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))

    for y, row in enumerate(pixels):
        if y >= height:
            break
        for x, char in enumerate(row):
            if x >= width:
                break
            if char == '.' or char == ' ':
                # Transparent pixel
                continue
            elif char in palette:
                color = hex_to_rgba(palette[char])
                img.putpixel((x, y), color)
            else:
                # Unknown character - use gray
                img.putpixel((x, y), (128, 128, 128, 255))

    return img


def png_to_base64(img):
    """Convert PIL Image to base64-encoded PNG data URI."""
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    b64 = base64.b64encode(buffer.read()).decode('utf-8')
    return f"data:image/png;base64,{b64}"


def create_pixil_json(sprite_data, img):
    """
    Create the .pixil JSON structure.
    Based on Pixilart's format.
    """
    width = sprite_data['width']
    height = sprite_data['height']
    name = sprite_data['name']

    # Get base64 PNG
    img_data = png_to_base64(img)

    # Generate unique IDs
    layer_id = str(uuid.uuid4())[:8]

    # Build color palette for Pixilart
    # Pixilart stores colors as a simple array of hex strings
    colors = list(set(sprite_data['palette'].values()))

    pixil_data = {
        "application": "pixilart",
        "version": "2.8.0",
        "website": "pixilart.com",
        "width": width,
        "height": height,
        "colors": colors,
        "name": name,
        "preview": img_data,
        "frames": [
            {
                "name": "Frame 1",
                "speed": 100,
                "layers": [
                    {
                        "id": 0,
                        "src": img_data,
                        "name": "Layer 1",
                        "opacity": 1,
                        "active": True,
                        "hidden": False,
                        "unqid": layer_id
                    }
                ],
                "preview": img_data,
                "width": width,
                "height": height
            }
        ],
        "currentFrame": 0,
        "speed": 100,
        "undos": [],
        "redos": [],
        "oldColors": []
    }

    return pixil_data


def convert_sprite_to_pixil(js_path, output_dir=None):
    """
    Convert a single sprite JS file to .pixil format.

    Args:
        js_path: Path to the sprite .js file
        output_dir: Output directory (default: tools/pixil_exports/)

    Returns:
        Path to the created .pixil file
    """
    js_path = Path(js_path)

    if not js_path.exists():
        raise FileNotFoundError(f"Sprite file not found: {js_path}")

    # Read and parse the JS file
    with open(js_path, 'r', encoding='utf-8') as f:
        js_content = f.read()

    sprite_data = parse_sprite_js(js_content)
    print(f"  Parsed: {sprite_data['name']} ({sprite_data['width']}x{sprite_data['height']})")
    print(f"  Palette: {len(sprite_data['palette'])} colors")

    # Convert to PNG
    img = sprite_to_png(sprite_data)

    # Create pixil JSON
    pixil_data = create_pixil_json(sprite_data, img)

    # Determine output path
    if output_dir is None:
        output_dir = js_path.parent.parent.parent / 'tools' / 'pixil_exports'
    else:
        output_dir = Path(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / f"{sprite_data['name']}.pixil"

    # Write the .pixil file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(pixil_data, f)

    print(f"  Output: {output_path}")

    # Also save the PNG for reference
    png_path = output_dir / f"{sprite_data['name']}.png"
    img.save(png_path)
    print(f"  PNG:    {png_path}")

    return output_path


def convert_folder(folder_path, output_dir=None):
    """
    Convert all sprite JS files in a folder to .pixil format.
    """
    folder = Path(folder_path)

    if not folder.exists():
        raise FileNotFoundError(f"Folder not found: {folder}")

    # Find all sprite files
    sprite_files = list(folder.glob('*-sprite.js'))

    if not sprite_files:
        print(f"No sprite files (*-sprite.js) found in: {folder}")
        return []

    print(f"Found {len(sprite_files)} sprite files in {folder}")
    print("=" * 60)

    results = []

    for sprite_path in sorted(sprite_files):
        try:
            print(f"\nConverting: {sprite_path.name}")
            output = convert_sprite_to_pixil(sprite_path, output_dir)
            results.append({'name': sprite_path.name, 'success': True, 'output': str(output)})
        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({'name': sprite_path.name, 'success': False, 'error': str(e)})

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    successful = sum(1 for r in results if r['success'])
    print(f"Converted: {successful}/{len(results)} sprites")

    if successful > 0:
        output_loc = Path(results[0]['output']).parent if results[0].get('output') else 'unknown'
        print(f"Output folder: {output_loc}")

    if successful < len(results):
        print("\nFailed:")
        for r in results:
            if not r['success']:
                print(f"  - {r['name']}: {r.get('error', 'Unknown error')}")

    return results


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nExamples:")
        print("  python text-to-pixil-converter.py assets/sprites/cave_bat-sprite.js")
        print("  python text-to-pixil-converter.py assets/sprites/")
        print("  python text-to-pixil-converter.py assets/sprites/ --output ./my_pixil_files/")
        sys.exit(1)

    input_path = sys.argv[1]
    output_dir = None

    # Parse arguments
    if '--output' in sys.argv:
        idx = sys.argv.index('--output')
        if idx + 1 < len(sys.argv):
            output_dir = sys.argv[idx + 1]

    if not os.path.exists(input_path):
        print(f"Path not found: {input_path}")
        sys.exit(1)

    if os.path.isdir(input_path):
        # Convert all sprites in folder
        convert_folder(input_path, output_dir)
    else:
        # Convert single file
        print(f"Converting: {input_path}")
        convert_sprite_to_pixil(input_path, output_dir)


if __name__ == '__main__':
    main()
