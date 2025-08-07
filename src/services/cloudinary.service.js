const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const logger = require('../config/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudinaryService {
  constructor() {
    this.isConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET
    );
    
    if (!this.isConfigured) {
      logger.warn('Cloudinary not configured - file uploads will be mocked');
    }
  }

  /**
   * Upload a photo to Cloudinary
   * @param {Buffer} buffer - File buffer
   * @param {string} folder - Cloudinary folder
   * @param {string} publicId - Public ID for the file
   * @param {Object} options - Additional upload options
   */
  async uploadPhoto(buffer, folder, publicId, options = {}) {
    if (!this.isConfigured) {
      // Return mock URL for development
      logger.info(`Mock upload: ${publicId} to folder ${folder}`);
      return `https://via.placeholder.com/400x300?text=${encodeURIComponent(publicId)}`;
    }

    try {
      const uploadOptions = {
        folder: `sgm/${folder}`,
        public_id: publicId,
        format: 'jpg',
        transformation: [
          { width: 800, height: 600, crop: 'fit' },
          { quality: 'auto:good' }
        ],
        ...options
      };

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });

      logger.info(`Photo uploaded successfully: ${result.public_id}`);
      return result.secure_url;

    } catch (error) {
      logger.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }

  /**
   * Upload ID document photos
   */
  async uploadIdPhotos(frontBuffer, backBuffer, selfieBuffer, userId) {
    try {
      const timestamp = Date.now();
      const uploads = await Promise.all([
        this.uploadPhoto(frontBuffer, 'id_documents', `user_${userId}_front_${timestamp}`),
        this.uploadPhoto(backBuffer, 'id_documents', `user_${userId}_back_${timestamp}`),
        this.uploadPhoto(selfieBuffer, 'id_documents', `user_${userId}_selfie_${timestamp}`)
      ]);

      return {
        id_front_photo_url: uploads[0],
        id_back_photo_url: uploads[1],
        selfie_photo_url: uploads[2]
      };
    } catch (error) {
      logger.error('ID photos upload error:', error);
      throw error;
    }
  }

  /**
   * Upload signature image
   */
  async uploadSignature(buffer, presidentId) {
    try {
      const timestamp = Date.now();
      const url = await this.uploadPhoto(
        buffer, 
        'signatures', 
        `president_${presidentId}_signature_${timestamp}`,
        {
          transformation: [
            { width: 400, height: 150, crop: 'fit' },
            { quality: 'auto:good' },
            { background: 'transparent' }
          ]
        }
      );

      return url;
    } catch (error) {
      logger.error('Signature upload error:', error);
      throw error;
    }
  }

  /**
   * Upload QR code
   */
  async uploadQRCode(buffer, memberId) {
    try {
      const url = await this.uploadPhoto(
        buffer,
        'qrcodes',
        `member_${memberId}_qr`,
        {
          format: 'png',
          transformation: [
            { width: 300, height: 300, crop: 'fit' }
          ]
        }
      );

      return url;
    } catch (error) {
      logger.error('QR code upload error:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Cloudinary
   */
  async deleteFile(publicId) {
    if (!this.isConfigured) {
      logger.info(`Mock delete: ${publicId}`);
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId);
      logger.info(`File deleted: ${publicId}`);
    } catch (error) {
      logger.error(`Failed to delete file ${publicId}:`, error);
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(publicId) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      logger.error(`Failed to get file info for ${publicId}:`, error);
      return null;
    }
  }
}

module.exports = new CloudinaryService();