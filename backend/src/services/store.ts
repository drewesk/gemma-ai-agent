import fs from 'fs/promises';
import path from 'path';
import { MongoClient, Collection } from 'mongodb';
import {
  DATA_DIR,
  MONGODB_URI,
  MONGODB_DB_NAME,
  MONGODB_COLLECTION_NAME
} from '../config';

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
let client: MongoClient | null = null;
let collection: Collection | null = null;

/**
 * Initialise and return the MongoDB collection. Called lazily by
 * getDocuments/addDocument when a URI is provided. If no URI is
 * configured, this function returns null.
 */
async function getMongoCollection(): Promise<Collection | null> {
  if (!MONGODB_URI) {
    return null;
  }
  if (collection) {
    return collection;
  }
  // Create a new client and connect
  client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);
  collection = db.collection(MONGODB_COLLECTION_NAME);
  return collection;
}

// Internal helper to get the path to the document JSON store
function getDocsFilePath(): string {
  return path.join(DATA_DIR, 'documents.json');
}

// Ensure the data directory and file exist before reading/writing
async function ensureStore(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  const file = getDocsFilePath();
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, '[]');
  }
}

/**
 * Load all documents from the store. Returns an array of documents.
 * When MongoDB is configured, reads from the configured collection.
 * Otherwise reads from the JSON file. Each document returned has
 * fields `id`, `content` and `createdAt`.
 */
export async function getDocuments(): Promise<any[]> {
  // Attempt to use MongoDB if configured
  const col = await getMongoCollection();
  if (col) {
    // Return all documents sorted by insertion order
    const docs = await col.find({}, { sort: { _id: 1 } }).toArray();
    return docs.map((d) => {
      return {
        id: d.id || d._id?.toString(),
        content: d.content,
        createdAt: d.createdAt?.toISOString?.() || d.createdAt || new Date().toISOString()
      };
    });
  }
  // Fall back to file storage
  await ensureStore();
  const content = await fs.readFile(getDocsFilePath(), { encoding: 'utf-8' });
  try {
    return JSON.parse(content);
  } catch {
    // If file contents are corrupted, reset to empty array
    await fs.writeFile(getDocsFilePath(), '[]');
    return [];
  }
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
export async function addDocument(content: string, id?: string): Promise<any> {
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
  const col = await getMongoCollection();
  if (col) {
    const res = await col.insertOne({ ...doc });
    return doc;
  }
  // Fall back to file storage
  const docs = await getDocuments();
  docs.push(doc);
  await ensureStore();
  await fs.writeFile(getDocsFilePath(), JSON.stringify(docs, null, 2));
  return doc;
}