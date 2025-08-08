"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scrape_1 = __importDefault(require("./scrape"));
const doc_1 = __importDefault(require("./doc"));
const router = (0, express_1.Router)();
// Mount each sub-route under its own path
router.use('/scrape', scrape_1.default);
router.use('/documents', doc_1.default);
exports.default = router;
