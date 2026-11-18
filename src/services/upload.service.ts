import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// Configure Multer in-memory storage (max 5MB, JPEG/PNG/WEBP only)
const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, and WEBP image files are allowed.'
      )
    );
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB maximum file size
  },
  fileFilter,
});

export const uploadToImgBB = async (
  buffer: Buffer,
  originalname: string = 'image.jpg'
): Promise<string> => {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey || apiKey === 'your_imgbb_api_key') {
    throw new Error(
      'ImgBB API key is missing. Please configure IMGBB_API_KEY in your server .env file.'
    );
  }

  const base64Image = buffer.toString('base64');
  const formData = new URLSearchParams();
  formData.append('image', base64Image);
  formData.append('name', originalname.split('.')[0] || 'pizza');

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  const data: any = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data.error?.message || 'Failed to upload image to ImgBB.';
    throw new Error(`ImgBB API Error: ${errorMsg}`);
  }

  // Returns direct hosted image URL
  return data.data.display_url || data.data.url;
};
