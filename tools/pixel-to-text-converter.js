/**
 * Pixel Art to Text Sprite Converter
 *
 * Converts a PNG image to the text-based sprite format used in monster-sprites.js
 *
 * Usage: node pixel-to-text-converter.js <image-path> [output-name]
 * Example: node pixel-to-text-converter.js ../assets/pixel-images/my-sprite.png my_sprite
 */

const fs = require('fs');
const path = require('path');

// We'll use the built-in approach with a PNG decoder
// For simplicity, let's use pngjs if available, otherwise provide instructions

async function convertImage(imagePath, spriteName) {
    let PNG;
    try {
        PNG = require('pngjs').PNG;
    } catch (e) {
        console.log('pngjs not installed. Installing...');
        const { execSync } = require('child_process');
        try {
            execSync('npm install pngjs', { stdio: 'inherit' });
            PNG = require('pngjs').PNG;
        } catch (installError) {
            console.error('Failed to install pngjs. Please run: npm install pngjs');
            process.exit(1);
        }
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const png = PNG.sync.read(imageBuffer);

    const { width, height, data } = png;

    console.log(`Image dimensions: ${width}x${height}`);

    // Collect all unique colors (ignoring fully transparent pixels)
    const colorMap = new Map();
    const pixels = [];

    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a < 128) {
                // Transparent pixel
                row.push({ transparent: true });
            } else {
                const colorKey = `${r},${g},${b}`;
                const hexColor = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0').toUpperCase()).join('');

                if (!colorMap.has(colorKey)) {
                    colorMap.set(colorKey, { hex: hexColor, r, g, b, count: 0 });
                }
                colorMap.get(colorKey).count++;

                row.push({ transparent: false, colorKey, hex: hexColor });
            }
        }
        pixels.push(row);
    }

    // Sort colors by usage frequency and assign characters
    const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1].count - a[1].count);

    console.log(`\nFound ${sortedColors.length} unique colors:`);

    // Available characters for palette (avoiding confusing ones)
    const availableChars = 'oHLMBSDCEFGIJKNPQRTUVWXYZabcdefghijklmnpqrstuvwxyz0123456789';

    const colorToChar = new Map();
    sortedColors.forEach(([colorKey, colorData], index) => {
        const char = availableChars[index] || String(index);
        colorToChar.set(colorKey, char);
        console.log(`  '${char}': '${colorData.hex}',  // ${colorData.count} pixels`);
    });

    // Generate the pixel array
    const pixelStrings = pixels.map(row => {
        return row.map(pixel => {
            if (pixel.transparent) return '.';
            return colorToChar.get(pixel.colorKey);
        }).join('');
    });

    // Generate palette object
    const palette = {};
    sortedColors.forEach(([colorKey, colorData]) => {
        const char = colorToChar.get(colorKey);
        palette[char] = colorData.hex;
    });

    // Generate output
    const outputName = spriteName || path.basename(imagePath, path.extname(imagePath)).replace(/[^a-zA-Z0-9_]/g, '_');

    const output = `// ============================================================================
// ${outputName.toUpperCase()} SPRITE DEFINITION
// ============================================================================
// Auto-converted from: ${path.basename(imagePath)}
// Dimensions: ${width}x${height}
// ============================================================================

const ${outputName.toUpperCase()}_SPRITE = {
    name: '${outputName}',
    width: ${width},
    height: ${height},
    pixels: [
${pixelStrings.map(row => `        "${row}"`).join(',\n')}
    ],
    palette: {
${Object.entries(palette).map(([char, hex]) => `        '${char}': '${hex}'`).join(',\n')}
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.${outputName.toUpperCase()}_SPRITE = ${outputName.toUpperCase()}_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ${outputName.toUpperCase()}_SPRITE };
}

console.log('[${outputName}] Loaded sprite definition');
`;

    // Write output file
    const outputPath = path.join(path.dirname(imagePath), '..', 'sprites', `${outputName}-sprite.js`);
    fs.writeFileSync(outputPath, output);
    console.log(`\nSprite definition written to: ${outputPath}`);

    // Also output just the raw data for easy copy-paste
    console.log('\n--- RAW PIXEL DATA ---\n');
    console.log('pixels: [');
    pixelStrings.forEach(row => console.log(`    "${row}",`));
    console.log(']');
    console.log('\npalette: {');
    Object.entries(palette).forEach(([char, hex]) => console.log(`    '${char}': '${hex}',`));
    console.log('}');

    return { pixels: pixelStrings, palette, width, height };
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: node pixel-to-text-converter.js <image-path> [sprite-name]');
    console.log('Example: node pixel-to-text-converter.js ../assets/pixel-images/blob.png orange_blob');
    process.exit(1);
}

const imagePath = path.resolve(args[0]);
const spriteName = args[1];

if (!fs.existsSync(imagePath)) {
    console.error(`File not found: ${imagePath}`);
    process.exit(1);
}

convertImage(imagePath, spriteName).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
