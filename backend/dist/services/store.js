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
exports.getDocuments = getDocuments;
exports.addDocument = addDocument;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const mongodb_1 = require("mongodb");
const config_1 = require("../config");
/**
 * Document store module.
 *
 * The store provides a simple abstraction for loading and saving
 * documents either to a local JSON file or to a MongoDB collection,
 * depending on the presence of a MONGODB_URI environment variable.
 * All functions return promises to unify asynchronous and synchronous
 * behaviours. When MongoDB is configured, a single client is shared
 * across calls to avoid reconnecting on every operation.
 */
// Internal cached MongoDB client and collection
let client = null;
let collection = null;
/**
 * Initialise and return the MongoDB collection. Called lazily by
 * getDocuments/addDocument when a URI is provided. If no URI is
 * configured, this function returns null.
 */
function getMongoCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!config_1.MONGODB_URI) {
            return null;
        }
        if (collection) {
            return collection;
        }
        // Create a new client and connect
        client = new mongodb_1.MongoClient(config_1.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        yield client.connect();
        const db = client.db(config_1.MONGODB_DB_NAME);
        collection = db.collection(config_1.MONGODB_COLLECTION_NAME);
        return collection;
    });
}
// Internal helper to get the path to the document JSON store
function getDocsFilePath() {
    return path_1.default.join(config_1.DATA_DIR, 'documents.json');
}
// Ensure the data directory and file exist before reading/writing
function ensureStore() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield promises_1.default.access(config_1.DATA_DIR);
        }
        catch (_a) {
            yield promises_1.default.mkdir(config_1.DATA_DIR, { recursive: true });
        }
        const file = getDocsFilePath();
        try {
            yield promises_1.default.access(file);
        }
        catch (_b) {
            yield promises_1.default.writeFile(file, '[]');
        }
    });
}
/**
 * Load all documents from the store. Returns an array of documents.
 * When MongoDB is configured, reads from the configured collection.
 * Otherwise reads from the JSON file. Each document returned has
 * fields `id`, `content` and `createdAt`.
 */
function getDocuments() {
    return __awaiter(this, void 0, void 0, function* () {
        // Attempt to use MongoDB if configured
        const col = yield getMongoCollection();
        if (col) {
            // Return all documents sorted by insertion order
            const docs = yield col.find({}, { sort: { _id: 1 } }).toArray();
            return docs.map((d) => {
                var _a, _b, _c;
                return {
                    id: d.id || ((_a = d._id) === null || _a === void 0 ? void 0 : _a.toString()),
                    content: d.content,
                    createdAt: ((_c = (_b = d.createdAt) === null || _b === void 0 ? void 0 : _b.toISOString) === null || _c === void 0 ? void 0 : _c.call(_b)) || d.createdAt || new Date().toISOString()
                };
            });
        }
        // Fall back to file storage
        yield ensureStore();
        const content = yield promises_1.default.readFile(getDocsFilePath(), { encoding: 'utf-8' });
        try {
            return JSON.parse(content);
        }
        catch (_a) {
            // If file contents are corrupted, reset to empty array
            yield promises_1.default.writeFile(getDocsFilePath(), '[]');
            return [];
        }
    });
}
/**
 * Add a new document to the store. Automatically generates an id and
 * timestamp if not provided. Returns the saved document. When
 * MongoDB is configured, the document is inserted into the
 * collection. Otherwise it is appended to the JSON file.
 *
 * @param content The textual content of the document.
 * @param id Optional id. If omitted, a timestamp-based id is used.
 */
function addDocument(content, id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (typeof content !== 'string' || content.trim() === '') {
            throw new Error('Document content must be a non-empty string');
        }
        const createdAt = new Date();
        const doc = {
            id: id || Date.now().toString(),
            content,
            createdAt: createdAt.toISOString()
        };
        // Attempt to use MongoDB
        const col = yield getMongoCollection();
        if (col) {
            const res = yield col.insertOne(Object.assign({}, doc));
            return doc;
        }
        // Fall back to file storage
        const docs = yield getDocuments();
        docs.push(doc);
        yield ensureStore();
        yield promises_1.default.writeFile(getDocsFilePath(), JSON.stringify(docs, null, 2));
        return doc;
    });
}
