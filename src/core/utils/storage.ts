import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { config } from '../config';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export interface UploadFile {
  buffer: Buffer;
  originalname: string;
}

export async function uploadImage(file: UploadFile): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();
  const key = `ecommerce/${uuid()}${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: config.r2.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: CONTENT_TYPES[ext] || 'application/octet-stream',
    }),
  );
  return `${config.r2.publicUrl}/${key}`;
}

export async function uploadImages(files: UploadFile[]): Promise<string[]> {
  return Promise.all(files.map((file) => uploadImage(file)));
}

// Solo borra imágenes que viven en nuestro bucket (ignora URLs viejas de Cloudinary)
export async function deleteImage(url: string): Promise<void> {
  const prefix = `${config.r2.publicUrl}/`;
  if (!config.r2.publicUrl || !url.startsWith(prefix)) return;
  await s3.send(
    new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: url.slice(prefix.length) }),
  );
}
