import fs from 'fs';
import path from 'path';

async function downloadFont() {
  const fontUrl = 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf';
  const destDir = path.resolve(__dirname, '../public/fonts');
  const destPath = path.join(destDir, 'Poppins-Bold.ttf');

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  console.log(`Downloading font from ${fontUrl}...`);
  try {
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Failed to download font: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destPath, buffer);
    console.log(`SUCCESS! Font downloaded to ${destPath}`);
  } catch (error) {
    console.error('ERROR downloading font:', error);
  }
}

downloadFont();
