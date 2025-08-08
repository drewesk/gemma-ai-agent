import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import routes from "./routes";
import { PORT } from "./config";

// Load environment variables from .env if present
dotenv.config();

console.log(PORT);
// Create the Express application
const app = express();

// Middleware
app.use(morgan("dev"));
app.use(express.json());

// Register routes
app.use("/api", routes);

// Health check route
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handling middleware. If any route handler calls next(err),
// this middleware will send a JSON error response. Centralising error
// handling like this keeps route handlers clean and DRY.
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    const status = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ error: message });
  }
);

/**
 * Only start the server when this module is executed directly. When
 * imported (e.g. by tests), the Express app is exported without
 * binding to a port. This avoids port conflicts during testing.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const moduleRequire = typeof require !== "undefined" ? require : undefined;
if (moduleRequire && moduleRequire.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });
}

export default app;
