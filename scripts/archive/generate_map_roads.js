const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function generateRoadMap() {
    const envContent = fs.readFileSync('.env', 'utf8');
    const apiKey = envContent.match(/GEMINI_API_KEY=(.*)/)[1].trim();
    const model = 'gemini-3.1-flash-image-preview';
    const inputPath = 'assets/world-map-continental.png';
    const outputPath = 'assets/world-map-with-roads.png';

    console.log("Reading master map for reference...");
    const imageData = fs.readFileSync(inputPath).toString('base64');

    const prompt = `4k stylized hand-painted fantasy RPG with chunky exaggerated proportions, dramatic rim lighting, and a vibrant painterly finish. 16:9 ratio.

Re-generate the provided continental map with the EXACT same landmass shapes, mountain peak positions, and river networks, but fully integrate a network of roads into the terrain.

- Incorporate a logical road system that connects different regions of the continent.
- Use visible stone bridges where roads cross rivers.
- The roads must be a native part of the hand-painted landscape, not an overlay or transparent lines.
- NO TEXT, NO LABELS, NO LETTERS, NO WORDS.
- NO ICONS, NO MARKERS, NO CASTLES, NO VILLAGES.
- NO CHARACTERS.
- MAP GOES FULLY TO THE EDGE, NO BORDERS.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: "image/png",
                        data: imageData
                    }
                }
            ]
        }],
        generationConfig: {
            image_config: {
                image_size: "4K",
                aspect_ratio: "16:9"
            }
        }
    };

    console.log("Generating INTEGRATED ROAD Map (New Prompt)...");

    try {
        const response = await axios.post(url, payload);
        
        if (response.data.candidates && response.data.candidates[0].content) {
            const parts = response.data.candidates[0].content.parts;
            const imagePart = parts.find(p => p.inlineData || p.inline_data);
            
            if (imagePart) {
                const data = imagePart.inlineData ? imagePart.inlineData.data : imagePart.inline_data.data;
                const buffer = Buffer.from(data, 'base64');
                fs.writeFileSync(outputPath, buffer);
                console.log(`Success! Integrated road map saved to ${outputPath}`);
            } else {
                console.error("No image data found in response.");
            }
        }
    } catch (error) {
        console.error("Generation failed:", error.response?.data || error.message);
    }
}

generateRoadMap();
