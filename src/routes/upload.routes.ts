import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadMiddleware } from '../services/upload.service';
import { uploadImageHandler } from '../controllers/upload.controller';
import { verifyToken, checkNotBlocked, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Wrapper for handling Multer errors gracefully
const handleMulterUpload = (req: Request, res: Response, next: NextFunction) => {
  const uploadSingle = uploadMiddleware.single('image');

  uploadSingle(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          error: 'BadRequest',
          message: 'File size exceeds maximum allowed limit of 5MB.',
        });
        return;
      }
      res.status(400).json({
        error: 'BadRequest',
        message: `Upload error: ${err.message}`,
      });
      return;
    } else if (err) {
      res.status(400).json({
        error: 'BadRequest',
        message: err.message || 'Invalid file upload.',
      });
      return;
    }
    next();
  });
};

router.post(
  '/image',
  verifyToken,
  checkNotBlocked,
  requireRole('vendor', 'admin'),
  handleMulterUpload,
  uploadImageHandler
);

export default router;
