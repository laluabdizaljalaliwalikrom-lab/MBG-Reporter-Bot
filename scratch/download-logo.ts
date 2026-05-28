import fs from 'fs';
import path from 'path';

async function downloadLogo() {
  const logoUrl = 'https://commons.wikimedia.org/wiki/Special:FilePath/Logo_Badan_Gizi_Nasional_(2024).png';
  const destDir = path.resolve(__dirname, '../public/images');
  const destPath = path.join(destDir, 'logo-bgn.png');

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  console.log(`Downloading logo from ${logoUrl}...`);
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download logo: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destPath, buffer);
    console.log(`SUCCESS! Logo downloaded to ${destPath}`);
  } catch (error) {
    console.error('ERROR downloading logo:', error);
  }
}

downloadLogo();
