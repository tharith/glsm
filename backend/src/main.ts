import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import helmet from "helmet";
import compression from "compression";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["error", "warn", "log"],
    // Performance: increase keep-alive timeout for large payloads
    rawBody: true,
  });

  // ── SECURITY ────────────────────────────────────────────────
  // Helmet: set secure HTTP headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }, // allow static file serving
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
        },
      },
    }),
  );

  // CORS: only allow frontend origin
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  // ── PERFORMANCE ─────────────────────────────────────────────
  // Gzip compression — reduce payload size
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) return false;
        return compression.filter(req, res);
      },
      level: 6, // balance speed vs compression ratio
    }),
  );

  // ── VALIDATION ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // throw on unknown properties
      transform: true, // auto-transform types (string→number etc.)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── SWAGGER (disable in production) ─────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("GLMS API")
      .setDescription(
        "Government Leave Management System — អង្គភាពប្រឆាំងអំពើពុករលួយ",
      )
      .setVersion("1.0.0")
      .addBearerAuth(
        { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        "JWT",
      )
      .addServer("http://localhost:3000", "Development")
      .build();
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, doc, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log("📖 Swagger docs: http://localhost:3000/api/docs");
  }

  const port = +(process.env.PORT || 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`🚀 GLMS API: http://localhost:${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
}
bootstrap();
