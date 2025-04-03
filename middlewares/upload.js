import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'ecommerce-api/product-pictures',
        public_id: (req, file) => file.originalname,
    }
});

export const productPicturesUpload = multer({ storage });

// Set up Multer storage to use Cloudinary
// const storage = new CloudinaryStorage({
//     cloudinary,
//     params: {
//         folder: 'product_images', // Cloudinary folder
//         allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
//     },
// });

// const upload = multer({ storage });

// export { cloudinary, upload };
