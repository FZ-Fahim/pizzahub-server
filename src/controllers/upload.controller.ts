import { Request, Response } from 'express';
import { uploadToImgBB } from '../services/upload.service.js';

export const uploadImageHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'No image file uploaded. Field "image" is required in form-data.',
      });
      return;
    }

    const imageUrl = await uploadToImgBB(req.file.buffer, req.file.originalname);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully to ImgBB.',
      data: {
        url: imageUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'UploadError',
      message: error.message || 'Failed to upload image.',
    });
  }
};
