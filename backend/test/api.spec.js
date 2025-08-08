"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const sinon_1 = __importDefault(require("sinon"));
// Import the Express application from the TypeScript source. Because the
// tests run with ts-node/register, we can import directly from src.
const app_1 = __importDefault(require("../src/app"));
describe('API Endpoints', () => {
    // Stub for global fetch used in scraping
    let fetchStub;
    beforeEach(() => {
        // Stub global fetch for scraping routes. Return a simple HTML string.
        fetchStub = sinon_1.default.stub(globalThis, 'fetch').resolves({
            ok: true,
            text: () => __awaiter(void 0, void 0, void 0, function* () { return '<html><body><h1>Hello</h1></body></html>'; })
        });
    });
    afterEach(() => {
        // Restore the original fetch implementation
        fetchStub.restore();
    });
    it('GET /health should return ok', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get('/health');
        (0, chai_1.expect)(res.status).to.equal(200);
        (0, chai_1.expect)(res.body).to.deep.equal({ status: 'ok' });
    }));
    it('POST /api/documents should save a document', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default)
            .post('/api/documents')
            .send({ content: 'Test document' });
        (0, chai_1.expect)(res.status).to.equal(201);
        (0, chai_1.expect)(res.body).to.have.property('id');
        (0, chai_1.expect)(res.body.content).to.equal('Test document');
    }));
    it('GET /api/documents should return an array of documents', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get('/api/documents');
        (0, chai_1.expect)(res.status).to.equal(200);
        (0, chai_1.expect)(res.body).to.be.an('array');
    }));
    it('POST /api/scrape should return HTML when summarise is false', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default)
            .post('/api/scrape')
            .send({ url: 'https://example.com', summarise: false });
        (0, chai_1.expect)(res.status).to.equal(200);
        (0, chai_1.expect)(res.body).to.have.property('html');
        (0, chai_1.expect)(res.body.html).to.contain('<html');
    }));
    it('POST /api/scrape should return summary when summarise is true', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default)
            .post('/api/scrape')
            .send({ url: 'https://example.com', summarise: true });
        (0, chai_1.expect)(res.status).to.equal(200);
        (0, chai_1.expect)(res.body).to.have.property('summary');
        (0, chai_1.expect)(res.body.summary).to.contain('LLM output');
    }));
});
