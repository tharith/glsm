import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/create-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

const USER_SELECT = {
  // ── Identity ─────────────────────────────────────────────
  id: true, employeeId: true,
  firstName: true, lastName: true, firstNameKh: true, lastNameKh: true,
  email: true, phone: true, dateOfBirth: true, dop: true,
  gender: true, nationalId: true, passportNumber: true, address: true,
  signatureOfApplicant: true,

  // ── Photo & Signature ────────────────────────────────────
  photo: true, photoPath: true, avatarUrl: true,
  signatureImage: true, signatureFileId: true,

  // ── Work Info ────────────────────────────────────────────
  hireDate: true, dateOfPermanentAppointment: true,
  workExperience: true, currentRankAndGrade: true,
  dateOfLastPromotion: true, medalAwarded: true, dateOfAward: true,

  // ── Education & Language ─────────────────────────────────
  educationLevel: true, foreignLanguages: true,

  // ── Family ───────────────────────────────────────────────
  nameOfSpouse: true, occupationOfSpouse: true,
  workplaceOfSpouse: true, numberOfChildren: true, numbersOfSiblings: true,
  fathersName: true, dopOfFathers: true, fathersOccupation: true,
  mothersName: true, dopOfMothers: true, mothersOccupation: true,
  fathersInLawName: true, dopOfFathersInLaw: true, fathersInLawOccupation: true,
  mothersInLawName: true, dopOfMothersInLaw: true, mothersInLawOccupation: true,

  // ── System ───────────────────────────────────────────────
  isActive: true, isDeleted: true, createdAt: true, updatedAt: true,

  // ── Relations ────────────────────────────────────────────
  position:  { select: { id: true, nameEn: true, nameKh: true, code: true, rank: true } },
  orgUnit:   { select: { id: true, nameEn: true, nameKh: true, code: true, type: true } },
  userRoles: { include: { role: { select: { id: true, name: true } } } },
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private fileStorage: FileStorageService,
  ) {}

  async findAll(q: PaginationDto) {
    const where: any = { isDeleted: false };
    if (q.search) where.OR = [
      { firstName:  { contains: q.search, mode: 'insensitive' } },
      { lastName:   { contains: q.search, mode: 'insensitive' } },
      { email:      { contains: q.search, mode: 'insensitive' } },
      { employeeId: { contains: q.search, mode: 'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, select: USER_SELECT, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.take }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page: q.page, limit: q.limit };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id, isDeleted: false }, select: USER_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { employeeId: dto.employeeId }] }
    });
    if (exists) throw new ConflictException('Email or Employee ID already exists');
    const { password, ...rest } = dto;
    return this.prisma.user.create({
      data: { ...rest, passwordHash: await bcrypt.hash(password, 12) },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: dto, select: USER_SELECT });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), isActive: false },
    });
  }

  // ── Avatar Upload ───────────────────────────────────────────
  async uploadAvatar(userId: string, file: Express.Multer.File, requesterId: string) {
    // Only self or admin
    if (userId !== requesterId) {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
        include: { userRoles: { include: { role: true } } },
      });
      const isAdmin = requester?.userRoles?.some(ur => ur.role.name === 'SYSTEM_ADMIN');
      if (!isAdmin) throw new ForbiddenException('Can only update your own avatar');
    }

    await this.findOne(userId);
    const avatarUrl = await this.fileStorage.saveAvatar(file, requesterId);

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: USER_SELECT,
    });
  }

  // ── Remove Avatar ───────────────────────────────────────────
  async removeAvatar(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: USER_SELECT,
    });
  }

  // ── Change Password ─────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto, requesterId: string) {
    if (userId !== requesterId) throw new ForbiddenException('Can only change your own password');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordHash) throw new BadRequestException('No password set for this account');
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } });
    return { message: 'Password changed successfully. Please login again.' };
  }


  // ── Autocomplete search (no role restriction) ──────────────
  async searchForAutocomplete(q?: string, limit = 50) {
    const where: any = { isDeleted: false, isActive: true };
    if (q) where.OR = [
      { firstName:  { contains: q, mode: 'insensitive' } },
      { lastName:   { contains: q, mode: 'insensitive' } },
      { employeeId: { contains: q, mode: 'insensitive' } },
    ];
    return this.prisma.user.findMany({
      where, take: limit,
      select: {
        id: true, employeeId: true,
        firstName: true, lastName: true,
        firstNameKh: true, lastNameKh: true,
        email: true,
        position: { select: { nameEn: true, nameKh: true } },
        orgUnit:  { select: { nameEn: true, code: true } },
        userRoles:{ select: { role: { select: { name: true } } } },
      },
      orderBy: { firstName: 'asc' },
    });
  }
  // ── Assign / Remove Role ────────────────────────────────────
  async assignRole(userId: string, roleId: string) {
    await this.findOne(userId);
    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });
  }

  async removeRole(userId: string, roleId: string) {
    return this.prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
  }

  // ── Direct Permission Override ──────────────────────────────
  async grantPermission(userId: string, permissionId: string) {
    await this.findOne(userId);
    return this.prisma.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId } },
      update: { granted: true },
      create: { userId, permissionId, granted: true },
    });
  }

  async revokePermission(userId: string, permissionId: string) {
    return this.prisma.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId } },
      update: { granted: false },
      create: { userId, permissionId, granted: false },
    });
  }
}
