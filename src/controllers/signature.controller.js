const cloudinary = require('cloudinary').v2;

class SignatureController {
  /**
   * Generate Cloudinary upload signature
   */
  async generateUploadSignature(req, res) {
    try {
      const timestamp = Math.round((new Date()).getTime() / 1000);
      
      const uploadParams = {
        timestamp,
        upload_preset: 'sgm_preset_formulaires_adhesion'
      };

      const signature = cloudinary.utils.api_sign_request(
        uploadParams, 
        process.env.CLOUDINARY_API_SECRET
      );

      res.json({
        signature,
        timestamp,
        api_key: process.env.CLOUDINARY_API_KEY,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        upload_preset: 'sgm_preset_formulaires_adhesion'
      });

    } catch (error) {
      res.status(500).json({
        error: 'Failed to generate signature'
      });
    }
  }
}

module.exports = new SignatureController();