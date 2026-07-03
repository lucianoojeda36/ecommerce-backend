import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export { cloudinary };

export async function uploadImage(filePath: string, publicId?: string): Promise<string> {
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: publicId,
    folder: 'ecommerce',
  });
  return result.secure_url;
}

export async function uploadImages(files: string[]): Promise<string[]> {
  const uploads = files.map((file) => uploadImage(file));
  return Promise.all(uploads);
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
