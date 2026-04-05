const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_IMAGE = 'assets/world-map-continental.png';
const OUTPUT_DIR = 'world-engine/client/public/tiles';
const TILE_SIZE = 256;
const MAX_ZOOM = 5;

async function generateNativeTiles() {
    console.log(`Starting Native 16:9 Tiling for: ${INPUT_IMAGE}`);
    
    if (fs.existsSync(OUTPUT_DIR)) {
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const source = sharp(INPUT_IMAGE);
    const { width, height } = await source.metadata();
    console.log(`Dimensions: ${width}x${height} (16:9)`);

    for (let z = 0; z <= MAX_ZOOM; z++) {
        // At max zoom (5), the scale is 1:1. At zoom 0, it's 1/32 size.
        const scale = Math.pow(2, MAX_ZOOM - z);
        const zWidth = Math.ceil(width / scale);
        const zHeight = Math.ceil(height / scale);
        
        const zDir = path.join(OUTPUT_DIR, z.toString());
        if (!fs.existsSync(zDir)) fs.mkdirSync(zDir);

        console.log(`Processing Zoom ${z}: Resizing to ${zWidth}x${zHeight}...`);

        // Create the resized version for this zoom level
        const layer = await source.clone().resize(zWidth, zHeight, { fit: 'fill' }).toBuffer();

        const cols = Math.ceil(zWidth / TILE_SIZE);
        const rows = Math.ceil(zHeight / TILE_SIZE);

        for (let x = 0; x < cols; x++) {
            const xDir = path.join(zDir, x.toString());
            if (!fs.existsSync(xDir)) fs.mkdirSync(xDir);

            for (let y = 0; y < rows; y++) {
                const tilePath = path.join(xDir, `${y}.png`);
                
                // Calculate actual extraction box (don't exceed layer bounds)
                const left = x * TILE_SIZE;
                const top = y * TILE_SIZE;
                const extractWidth = Math.min(TILE_SIZE, zWidth - left);
                const extractHeight = Math.min(TILE_SIZE, zHeight - top);

                await sharp(layer)
                    .extract({ left, top, width: extractWidth, height: extractHeight })
                    .png()
                    .toFile(tilePath);
            }
        }
    }

    console.log("Native 16:9 Tiling Complete!");
}

generateNativeTiles().catch(err => console.error(err));
