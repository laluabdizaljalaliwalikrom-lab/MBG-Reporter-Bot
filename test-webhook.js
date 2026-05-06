const axios = require('axios');

async function testWebhook() {
  const url = 'http://localhost:3000/api/webhook/whatsapp';
  
  const payload = {
    messages: [
      {
        from: '628123456789',
        text: {
          body: 'Laporan MBG Tanggal 2026-05-06. Porsi Besar 100, Porsi Kecil 50. Menu: Nasi Ayam Bakar. Energi 500, Protein 30, Lemak 15, Karbohidrat 60, Serat 5.'
        }
      }
    ]
  };

  try {
    console.log('Sending test webhook payload...');
    const response = await axios.post(url, payload);
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

testWebhook();
