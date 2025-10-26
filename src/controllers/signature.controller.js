const cloudinary = require('cloudinary').v2;

class SignatureController {
  /**
   * Generate Cloudinary upload signature
   */
  async generateUploadSignature(req, res) {
    try {
      const { public_id } = req.query;
      const timestamp = Math.round((new Date()).getTime() / 1000);
      
      const uploadParams = {
        timestamp,
        upload_preset: 'sgm_preset_formulaires_adhesion'
      };

      // Add public_id to upload params if provided
      if (public_id) {
        uploadParams.public_id = public_id;
      }

      const signature = cloudinary.utils.api_sign_request(
        uploadParams, 
        process.env.CLOUDINARY_API_SECRET
      );

      const response = {
        signature,
        timestamp,
        api_key: process.env.CLOUDINARY_API_KEY,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        upload_preset: 'sgm_preset_formulaires_adhesion'
      };

      // Include public_id in response if it was provided
      if (public_id) {
        response.public_id = public_id;
      }

      res.json(response);

    } catch (error) {
      res.status(500).json({
        error: 'Failed to generate signature'
      });
    }
  }
}

module.exports = new SignatureController();