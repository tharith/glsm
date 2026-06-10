import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema"),
  migrate: {
    async adapter() {
      // Connection URL is read from DATABASE_URL env var at runtime
      // For pg adapter (Prisma 7 recommended approach)
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL environment variable is not set");
      return new PrismaPg({ connectionString: url });
    },
  },
});
