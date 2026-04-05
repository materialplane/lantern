const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function generateWorldMap() {
    const envContent = fs.readFileSync('.env', 'utf8');
    const apiKey = envContent.match(/GEMINI_API_KEY=(.*)/)[1].trim();
    const model = 'gemini-3.1-flash-image-preview';
    const outputPath = 'assets/world-map-continental.png';

    const prompt = `4k stylized hand-painted fantasy RPG with chunky exaggerated proportions, dramatic rim lighting, and a vibrant painterly finish. 16:9 ratio.

A highly detailed colorful top-down fantasy map of the continent of Ethoria. The perspective is a flat ortho-graphic view, like a master-crafted ancient artifact. 

The map shows a vast continental landmass filled with intricate miniature geography: dense networks of tiny river veins, jagged clusters of miniature mountain peaks, and rich textured forests. The scale is epic and world-sized, similar to the Forgotten Realms, showing the interaction of multiple distinct biomes across a massive landmass.

STRICT VISUAL RULES:
- TOP-DOWN PERSPECTIVE ONLY.
- NO SPACE VIEW, NO PLANETARY CURVE, NO CLOUDS.
- ABSOLUTELY NO TEXT, NO LABELS, NO LETTERS, NO WORDS.
- NO ICONS, NO MARKERS, NO CASTLES, NO VILLAGES, NO SYMBOLS.
- NO CHARACTERS.
- MAP GOES FULLY TO THE EDGE, NO BORDERS.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            image_config: {
                image_size: "4K",
                aspect_ratio: "16:9"
            }
        }
    };

    console.log("Generating CONTINENTAL 16:9 World Map...");

    try {
        const response = await axios.post(url, payload);
        
        if (response.data.candidates && response.data.candidates[0].content) {
            const parts = response.data.candidates[0].content.parts;
            const imagePart = parts.find(p => p.inlineData);
            
            if (imagePart) {
                const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
                fs.writeFileSync(outputPath, buffer);
                console.log(`Success! Continental map saved to ${outputPath}`);
            } else {
                console.error("No image data found.");
            }
        }
    } catch (error) {
        console.error("Generation failed:", error.response?.data || error.message);
    }
}

generateWorldMap();
