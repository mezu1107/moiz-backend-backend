// src/controllers/upload/uploadController.js
const axios = require('axios');

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);
    formData.append('upload_preset', 'foodapp_menu');
    formData.append('folder', 'foodapp/menu');

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData
    );

    const result = response.data;

    res.json({
      success: true,
      message: 'Image uploaded successfully!',
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format
    });
  } catch (error) {
      console.error('Cloudinary upload error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.response?.data?.error?.message || error.message
    });
  }
};

module.exports = { uploadImage };