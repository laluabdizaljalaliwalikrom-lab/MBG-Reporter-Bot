const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const apiKey = env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json"
  }
});

const reportText = `*Laporan Harian SPPG Lombok Timur Sikur Kotaraja 2*

*Rabu, 6 Mei 2026*
* Nasi Putih 
* Udang Saos Padang
* Kedelai Goreng
* Buncis Bawang Putih
* Melon, Semangka, Pepaya

*Porsi Besar*
* Energi           : 633,6  kkal
* Protein         : 30,7 g
* Lemak          : 16,6 g
* Karbohidrat : 92,2 g
* Serat             : 6,2 g

*Porsi Kecil*
* Energi           : 471,1 kkal
* Protein         : 27,7 g
* Lemak          : 16,3 g
* Karbohidrat : 56,5 g
* Serat             : 5,9 g`;

const prompt = `
  Anda adalah asisten data Badan Gizi Nasional. Tugas Anda adalah mengekstrak teks laporan harian MBG menjadi format JSON.

  Aturan:
  1. Gunakan skema JSON berikut:
     {
       "Tanggal": "YYYY-MM-DD",
       "Porsi Besar": number atau null,
       "Porsi Kecil": number atau null,
       "Menu": "string",
       "Energi": float atau null,
       "Protein": float atau null,
       "Lemak": float atau null,
       "Karbohidrat": float atau null,
       "Serat": float atau null
     }
  2. Pastikan angka gizi dikonversi menjadi format float (desimal) atau integer, bukan string.

  Teks Laporan: "${reportText}"
`;

async function run() {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().trim();
    console.log("Raw Response:\n", jsonStr);
    const parsed = JSON.parse(jsonStr);
    console.log("Parsed keys:", Object.keys(parsed));
    console.log("Parsed data:", parsed);
  } catch (error) {
    console.error("Error during test:", error);
  }
}

run();
