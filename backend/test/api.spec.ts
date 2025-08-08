import { expect } from 'chai';
import request from 'supertest';
import sinon from 'sinon';

// Import the Express application from the TypeScript source. Because the
// tests run with ts-node/register, we can import directly from src.
import app from '../src/app';

// Import the scrape service so we can restore fetch after stubbing
import * as scrapeService from '../src/services/scrapeService';

describe('API Endpoints', () => {
  // Stub for global fetch used in scraping
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    // Stub global fetch for scraping routes. Return a simple HTML string.
    fetchStub = sinon.stub(globalThis as any, 'fetch').resolves({
      ok: true,
      text: async () => '<html><body><h1>Hello</h1></body></html>'
    } as any);
  });

  afterEach(() => {
    // Restore the original fetch implementation
    fetchStub.restore();
  });

  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ status: 'ok' });
  });

  it('POST /api/documents should save a document', async () => {
    const res = await request(app)
      .post('/api/documents')
      .send({ content: 'Test document' });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('id');
    expect(res.body.content).to.equal('Test document');
  });

  it('GET /api/documents should return an array of documents', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  it('POST /api/scrape should return HTML when summarise is false', async () => {
    const res = await request(app)
      .post('/api/scrape')
      .send({ url: 'https://example.com', summarise: false });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('html');
    expect(res.body.html).to.contain('<html');
  });

  it('POST /api/scrape should return summary when summarise is true', async () => {
    const res = await request(app)
      .post('/api/scrape')
      .send({ url: 'https://example.com', summarise: true });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('summary');
    expect(res.body.summary).to.contain('LLM output');
  });
});