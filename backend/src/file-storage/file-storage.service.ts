import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const UPLOAD_DIR  = process.env.UPLOAD_DIR || './uploads';
export const AVATAR_DIR  = path.join(UPLOAD_DIR, 'avatars');
export const ATTACH_DIR  = path.join(UPLOAD_DIR, 'attachments');
export const SIG_DIR     = path.join(UPLOAD_DIR, 'signatures');

// Ensure all directories exist on startup
[UPLOAD_DIR, AVATAR_DIR, ATTACH_DIR, SIG_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg','image/png','image/webp','image/gif'];
const ALLOWED_SIG_TYPES   = ['image/jpeg','image/png','image/webp'];
const ALLOWED_DOC_TYPES   = [
  'application/pdf',
  'image/jpeg','image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_AVATAR_SIZE = 5  * 1024 * 1024;  //  5MB
const MAX_SIG_SIZE    = 2  * 1024 * 1024;  //  2MB
const MAX_FILE_SIZE   = 10 * 1024 * 1024;  // 10MB

@Injectable()
export class FileStorageService {
  constructor(private prisma: PrismaService) {}

  // ── Save avatar (profile picture) ──────────────────────────
  async saveAvatar(file: Express.Multer.File, uploadedById: string): Promise<string> {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype))
      throw new BadRequestException('Only JPG, PNG, WEBP images allowed for avatar');
    if (file.size > MAX_AVATAR_SIZE)
      throw new BadRequestException('Avatar must be less than 5MB');

    const ext        = path.extname(file.originalname).toLowerCase() || '.jpg';
    const storedName = `avatar_${uuidv4()}${ext}`;
    const filePath   = path.join(AVATAR_DIR, storedName);
    fs.writeFileSync(filePath, file.buffer);

    await this.prisma.fileStorage.create({
      data: { originalName: file.originalname, storedName, mimeType: file.mimetype, size: file.size, path: filePath, uploadedById },
    });

    return `/uploads/avatars/${storedName}`;
  }

  // ── Save signature (requester OR approver) ──────────────────
  // Returns: URL string stored in DB
  async saveSignature(file: Express.Multer.File, uploadedById: string): Promise<string> {
    if (!ALLOWED_SIG_TYPES.includes(file.mimetype))
      throw new BadRequestException('Signature must be JPG, PNG or WEBP image');
    if (file.size > MAX_SIG_SIZE)
      throw new BadRequestException('Signature image must be less than 2MB');

    const ext        = path.extname(file.originalname).toLowerCase() || '.png';
    const storedName = `sig_${uuidv4()}${ext}`;
    const filePath   = path.join(SIG_DIR, storedName);
    fs.writeFileSync(filePath, file.buffer);

    await this.prisma.fileStorage.create({
      data: { originalName: file.originalname, storedName, mimeType: file.mimetype, size: file.size, path: filePath, uploadedById },
    });

    // Return the URL path served statically
    return `/uploads/signatures/${storedName}`;
  }

  // ── Save attachment (for leave requests) ───────────────────
  async saveAttachment(file: Express.Multer.File, uploadedById: string) {
    if (!ALLOWED_DOC_TYPES.includes(file.mimetype))
      throw new BadRequestException('Only PDF, JPG, PNG, DOC files allowed');
    if (file.size > MAX_FILE_SIZE)
      throw new BadRequestException('File must be less than 10MB');

    const ext        = path.extname(file.originalname).toLowerCase() || '.pdf';
    const storedName = `attach_${uuidv4()}${ext}`;
    const filePath   = path.join(ATTACH_DIR, storedName);
    fs.writeFileSync(filePath, file.buffer);

    return this.prisma.fileStorage.create({
      data: { originalName: file.originalname, storedName, mimeType: file.mimetype, size: file.size, path: filePath, uploadedById },
    });
  }

  // ── Delete file from disk + DB ──────────────────────────────
  async deleteFile(id: string) {
    const record = await this.prisma.fileStorage.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('File not found');
    if (fs.existsSync(record.path)) fs.unlinkSync(record.path);
    return this.prisma.fileStorage.delete({ where: { id } });
  }

  // ── Get file record ─────────────────────────────────────────
  async getFile(id: string) {
    const record = await this.prisma.fileStorage.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('File not found');
    return record;
  }

  // ── Get full disk path for streaming ───────────────────────
  getFilePath(storedName: string, type: 'avatar' | 'attachment' | 'signature'): string {
    const dirMap = { avatar: AVATAR_DIR, attachment: ATTACH_DIR, signature: SIG_DIR };
    const fp = path.join(dirMap[type], storedName);
    if (!fs.existsSync(fp)) throw new NotFoundException('File not found on disk');
    return fp;
  }
}
