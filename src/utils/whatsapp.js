// src/utils/whatsapp.js
const axios = require('axios');

const sendWhatsApp = async (phone, message) => {
  if (!process.env.WHATSAPP_API_KEY && process.env.NODE_ENV !== 'development') {
    console.log('WhatsApp disabled (no API key)');
    return;
  }

  // Remove +92 or 0092, ensure 03xxxxxxxxx
  const cleanPhone = phone.replace(/^\+92|0092/, '0');

  const payload = {
    to: cleanPhone,
    message: message,
    type: 'text'
  };

  axios.post('https://api.92api.com/v1/send', payload, {
    headers: { 
      'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
      'Content-Type': 'application/json'
    }
  }).catch(err => {
    console.error('WhatsApp Failed:', err.response?.data || err.message);
  });
};

module.exports = { sendWhatsApp };