"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = __importDefault(require("./routes"));
const config_1 = require("./config");
// Load environment variables from .env if present
dotenv_1.default.config();
console.log(config_1.PORT);
// Create the Express application
const app = (0, express_1.default)();
// Middleware
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
// Register routes
app.use("/api", routes_1.default);
// Health check route
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// Error handling middleware. If any route handler calls next(err),
// this middleware will send a JSON error response. Centralising error
// handling like this keeps route handlers clean and DRY.
app.use((err, _req, res, _next) => {
    console.error(err);
    const status = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ error: message });
});
/**
 * Only start the server when this module is executed directly. When
 * imported (e.g. by tests), the Express app is exported without
 * binding to a port. This avoids port conflicts during testing.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const moduleRequire = typeof require !== "undefined" ? require : undefined;
if (moduleRequire && moduleRequire.main === module) {
    app.listen(config_1.PORT, () => {
        console.log(`🚀 Server listening on port ${config_1.PORT}`);
    });
}
exports.default = app;
