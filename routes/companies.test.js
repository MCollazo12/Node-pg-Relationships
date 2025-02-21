process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const db = require('../db');

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Must set NODE_ENV=test before running tests');
}

describe('Invoice Routes Test', () => {
  let testCompany;

  beforeAll(async () => {
    // Clear database tables
    await db.query('DELETE FROM invoices');
    await db.query('DELETE FROM companies');

    // Add test company
    const compResult = await db.query(
      `INSERT INTO companies (code, name, description)
       VALUES ('testcomp', 'Test Company', 'A test company')
       RETURNING code, name, description`
    );

    testCompany = compResult.rows[0];
  });

  afterAll(async () => {
    // Close db connection
    await db.end();
  });

  describe('GET /companies', () => {
    test('returns a list of companies', async () => {
      const response = await request(app).get('/companies');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('GET /companies/:code', () => {
    test('returns a company by code', async () => {
      const code = testCompany.code;
      const response = await request(app).get(`/companies/${code}`);
      expect(response.status).toBe(200);
      expect(response.body.company).toHaveProperty('code', code);
    });

    test('returns 404 if company not found', async () => {
      const code = 'non-existent-code';
      const response = await request(app).get(`/companies/${code}`);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /companies', () => {
    test('adds a new company', async () => {
      const response = await request(app).post('/companies').send({
        name: 'New Company',
        description: 'A new company',
      });
      expect(response.status).toBe(201);
      expect(response.body.company).toHaveProperty('code');
      expect(response.body.company).toHaveProperty('name', 'New Company');
      expect(response.body.company).toHaveProperty(
        'description',
        'A new company'
      );
    });

    test('returns 400 if company name is missing', async () => {
      const company = { description: 'Test description' };
      const response = await request(app).post('/companies').send(company);
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Company name is required!');
    });
  });

  describe('PUT /companies/:code', () => {
    test('edits an existing company', async () => {
      const code = testCompany.code;
      const updateData = {
        name: 'Updated Company',
        description: 'Updated description',
      };
      const response = await request(app)
        .put(`/companies/${code}`)
        .send(updateData);
      expect(response.status).toBe(200);
      expect(response.body.company).toHaveProperty('code', testCompany.code);
      expect(response.body.company).toHaveProperty('name', updateData.name);
      expect(response.body.company).toHaveProperty(
        'description',
        updateData.description
      );
    });

    test('returns 404 if company not found', async () => {
      const response = await request(app)
        .put(`/companies/non-existentcode}`)
        .send({
          name: 'Some Company',
          description: 'Some description',
        });
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /companies/:code', () => {
    test('deletes a company', async () => {
      const code = testCompany.code;
      const response = await request(app).delete(`/companies/${code}`);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('deleted');
    });

    test('returns 404 if company not found', async () => {
      const response = await request(app).delete(`/companies/non-existentcode`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
