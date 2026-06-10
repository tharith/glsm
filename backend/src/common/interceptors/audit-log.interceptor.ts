import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { PrismaService } from "../../prisma/prisma.service";
import { Reflector } from "@nestjs/core";
import { SetMetadata } from "@nestjs/common";

/** Use on endpoints that should NOT be logged (e.g. read-only health checks) */
export const NO_AUDIT = "no_audit";
export const SkipAudit = () => SetMetadata(NO_AUDIT, true);

/** Logged write methods */
const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skip = this.reflector.getAllAndOverride<boolean>(NO_AUDIT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    const req = context.switchToHttp().getRequest();
    const method = req.method as string;
    if (!WRITE_METHODS.has(method)) return next.handle();

    const userId = req.user?.id ?? null;
    const userEmail = req.user?.email ?? null;
    const ipAddress = this.getIp(req);
    const userAgent = (req.headers["user-agent"] || "").slice(0, 255);
    const url = req.url as string;
    const module = this.resolveModule(url);
    const action = this.resolveAction(method, url);
    const body = this.sanitize(req.body);

    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startedAt;
          // Log slow requests for performance monitoring
          if (duration > 2000) {
            console.warn(
              `[SLOW] ${method} ${url} took ${duration}ms — userId: ${userId}`,
            );
          }
          this.write({
            userId,
            action,
            module,
            targetId: data?.id ?? data?.data?.id ?? null,
            oldValue: null,
            newValue: { ...body, _meta: { userEmail, duration } },
            ipAddress,
            userAgent,
          });
        },
        error: (err) => {
          this.write({
            userId,
            action: `${action}_FAILED`,
            module,
            targetId: null,
            oldValue: null,
            newValue: {
              error: err?.message?.slice(0, 500),
              status: err?.status,
              body,
              _meta: { userEmail, duration: Date.now() - startedAt },
            },
            ipAddress,
            userAgent,
          });
        },
      }),
    );
  }

  private write(data: any) {
    this.prisma.auditLog.create({ data }).catch(() => {
      /* silent */
    });
  }

  private getIp(req: any): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) return String(forwarded).split(",")[0].trim().slice(0, 45);
    return String(req.ip || "unknown").slice(0, 45);
  }

  private resolveModule(url: string): string {
    const map: [string, string][] = [
      ["/auth", "auth"],
      ["/users", "user"],
      ["/organization", "organization"],
      ["/positions", "position"],
      ["/leave-types", "leave_type"],
      ["/leave-balances", "leave_balance"],
      ["/leave-requests", "leave_request"],
      ["/public-holidays", "public_holiday"],
      ["/workflow", "workflow"],
      ["/delegations", "delegation"],
      ["/notifications", "notification"],
      ["/reports", "report"],
      ["/audit-logs", "audit_log"],
    ];
    for (const [path, mod] of map) {
      if (url.includes(path)) return mod;
    }
    return "system";
  }

  private resolveAction(method: string, url: string): string {
    if (url.includes("/login")) return "LOGIN";
    if (url.includes("/logout")) return "LOGOUT";
    if (url.includes("/approve")) return "APPROVE";
    if (url.includes("/cancel")) return "CANCEL";
    if (url.includes("/submit")) return "SUBMIT";
    if (url.includes("/restore")) return "RESTORE";
    if (url.includes("/assign")) return "ASSIGN";
    if (url.includes("/avatar")) return "AVATAR_UPLOAD";
    if (url.includes("/change-password")) return "CHANGE_PASSWORD";
    if (method === "POST") return "CREATE";
    if (method === "PATCH") return "UPDATE";
    if (method === "PUT") return "UPDATE";
    if (method === "DELETE") return "DELETE";
    return method;
  }

  private sanitize(body: any): any {
    if (!body || typeof body !== "object") return body ?? null;
    const clone = { ...body };
    const SENSITIVE = [
      "password",
      "passwordHash",
      "currentPassword",
      "newPassword",
      "token",
      "refreshToken",
      "accessToken",
      "secret",
      "signature",
      "signatureUrl",
    ];
    for (const key of SENSITIVE) {
      if (key in clone) clone[key] = "[REDACTED]";
    }
    return clone;
  }
}
