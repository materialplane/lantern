#!/bin/bash

# Lantern Image Optimizer
# Usage: ./optimize_images.sh path/to/image.png

if [ -z "$1" ]; then
    echo "Usage: $0 <image_path>"
    exit 1
fi

INPUT_FILE="$1"
FILENAME=$(basename -- "$INPUT_FILE")
EXTENSION="${FILENAME##*.}"
BASENAME="${FILENAME%.*}"
DIRNAME=$(dirname "$INPUT_FILE")
OUTPUT_FILE="$DIRNAME/$BASENAME.jpg"

echo "Optimizing $FILENAME..."

# Resize to 1920 width, convert to JPG, set quality to 82% (good balance for ~300kb)
convert "$INPUT_FILE" -resize 1920 -quality 82 "$OUTPUT_FILE"

echo "Created: $OUTPUT_FILE"
ls -lh "$OUTPUT_FILE"
