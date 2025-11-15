// Simple icon generator for PWA
// This creates basic colored icons with the lightning emoji
// For production, use proper icon design tools

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, 'public', 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple SVG icon
const createSVGIcon = (size) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563EB;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#9333EA;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="50%" y="50%" font-size="${size * 0.6}" text-anchor="middle" dominant-baseline="central" fill="white">⚡</text>
</svg>`;
};

// Generate icons
sizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = `icon-${size}x${size}.png`;
  const svgFilename = `icon-${size}x${size}.svg`;
  
  // Save SVG (browsers can use these directly)
  fs.writeFileSync(path.join(iconsDir, svgFilename), svg);
  console.log(`Created ${svgFilename}`);
});

console.log('\n✅ Icon generation complete!');
console.log('📝 Note: SVG icons created. For production, convert to PNG using:');
console.log('   - Online tools like CloudConvert');
console.log('   - Or install sharp: npm install sharp');
console.log('   - Or use design tools like Figma/Photoshop\n');
