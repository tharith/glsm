import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { addDays } from "date-fns";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * Login with employeeId OR signatureOfApplicant + password
   * PDF spec: identifier = អត្តលេខ (employee ID) ឬ អត្ថលេខ (signature ID)
   */
  async login(identifier: string, password: string, loginChoice?: string) {
    console.log("loginChoice", loginChoice);
    const whereCondition =
      loginChoice === "employeeId"
        ? {
            employeeId: identifier,
            isDeleted: false,
          }
        : {
            signatureOfApplicant: identifier,
            isDeleted: false,
          };

    console.log("whereCondition", JSON.stringify(whereCondition));

    // Try to find user by employeeId first, then signatureOfApplicant
    const user = await this.prisma.user.findFirst({
      where: whereCondition,
    });

    // Validate password
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(
        "Invalid credentials — គណនី ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ",
      );
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      // Log failed attempt for security
      await this.prisma.auditLog
        .create({
          data: {
            userId: user.id,
            action: "LOGIN_FAILED",
            module: "auth",
            newValue: { identifier, reason: "Wrong password" },
          },
        })
        .catch(() => {});
      throw new UnauthorizedException(
        "Invalid credentials — គណនី ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ",
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        "Account is disabled. Contact system admin. — គណនីត្រូវបានបិទ",
      );
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email ?? user.employeeId ?? identifier,
    );

    // Save refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: addDays(new Date(), 7),
      },
    });

    // Audit log
    await this.prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: "LOGIN",
          module: "auth",
          newValue: { identifier, loginAt: new Date().toISOString() },
        },
      })
      .catch(() => {});

    return { ...tokens, userId: user.id };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!stored || stored.isRevoked || stored.expiresAt < new Date())
      throw new UnauthorizedException("Invalid or expired refresh token");

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user || !user.isActive)
      throw new UnauthorizedException("User inactive");

    const tokens = await this.generateTokens(
      user.id,
      user.email ?? user.employeeId ?? "",
    );
    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: addDays(new Date(), 7),
      },
    });
    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    await this.prisma.auditLog
      .create({
        data: {
          userId,
          action: "LOGOUT",
          module: "auth",
          newValue: { logoutAt: new Date().toISOString() },
        },
      })
      .catch(() => {});
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        employeeId: true,
        signatureOfApplicant: true,
        firstName: true,
        lastName: true,
        firstNameKh: true,
        lastNameKh: true,
        email: true,
        phone: true,
        photo: true,
        avatarUrl: true,
        currentRankAndGrade: true,
        hireDate: true,
        isActive: true,
        createdAt: true,
        position: {
          select: {
            id: true,
            nameEn: true,
            nameKh: true,
            code: true,
            rank: true,
          },
        },
        orgUnit: {
          select: {
            id: true,
            nameEn: true,
            nameKh: true,
            code: true,
            type: true,
          },
        },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: { select: { action: true, module: true } },
                  },
                },
              },
            },
          },
        },
        userPermissions: {
          include: { permission: { select: { action: true, module: true } } },
        },
      },
    });
  }

  // ── Change Password (requires old password) ─────────────
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash)
      throw new UnauthorizedException("User not found");

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid)
      throw new UnauthorizedException(
        "Current password is incorrect — ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ",
      );

    if (currentPassword === newPassword)
      throw new BadRequestException(
        "New password must be different — ពាក្យសម្ងាត់ថ្មីត្រូវខុសពីចាស់",
      );

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });

    // Revoke all refresh tokens for security — force re-login
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.prisma.auditLog
      .create({
        data: {
          userId,
          action: "CHANGE_PASSWORD",
          module: "auth",
          newValue: { changedAt: new Date().toISOString() },
        },
      })
      .catch(() => {});

    return {
      message:
        "Password changed successfully. Please login again. — ពាក្យសម្ងាត់ត្រូវបានប្ដូរ",
    };
  }

  // ── Reset Password (SYSTEM_ADMIN only — no old password needed) ──
  async resetPassword(
    targetUserId: string,
    newPassword: string,
    adminId: string,
  ) {
    const [targetUser, admin] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: targetUserId } }),
      this.prisma.user.findUnique({
        where: { id: adminId },
        include: { userRoles: { include: { role: true } } },
      }),
    ]);

    if (!targetUser) throw new NotFoundException("User not found");

    const isAdmin = admin?.userRoles?.some(
      (ur) => ur.role.name === "SYSTEM_ADMIN",
    );
    if (!isAdmin)
      throw new ForbiddenException("Only SYSTEM_ADMIN can reset passwords");

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash: hash },
    });

    // Revoke all tokens for target user
    await this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.prisma.auditLog
      .create({
        data: {
          userId: adminId,
          action: "RESET_PASSWORD",
          module: "auth",
          targetId: targetUserId,
          newValue: {
            resetBy: adminId,
            targetUser: targetUserId,
            resetAt: new Date().toISOString(),
          },
        },
      })
      .catch(() => {});

    return {
      message: `Password reset successfully for user ${targetUser.firstName} ${targetUser.lastName}`,
    };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get("JWT_ACCESS_EXPIRES") || "15m",
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get("JWT_REFRESH_EXPIRES") || "7d",
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
