process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const db = require('../db');

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Must set NODE_ENV=test before running tests');
}

describe('Invoice Routes Test', () => {
  let testCompany;
  let testInvoice;

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

    // Add test invoice
    const invResult = await db.query(
      `INSERT INTO invoices (comp_code, amt)
       VALUES ('testcomp', 100)
       RETURNING id, comp_code, amt, paid, add_date, paid_date`
    );
    testInvoice = invResult.rows[0];

    testInvoice.add_date = testInvoice.add_date.toISOString();
    if (testInvoice.paid_date) {
      testInvoice.paid_date = testInvoice.paid_date.toISOString();
    }
  });

  afterAll(async () => {
    // Close db connection
    await db.end();
  });

  describe('GET /invoices', () => {
    test('Gets a list of invoices', async () => {
      const response = await request(app).get('/invoices');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([testInvoice]);
    });
  });

  describe('GET /invoices/:id', () => {
    test('Gets a single invoice', async () => {
      const response = await request(app).get(`/invoices/${testInvoice.id}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        invoice: {
          id: testInvoice.id,
          company: {
            code: testCompany.code,
            name: testCompany.name,
            description: testCompany.description,
          },
          amt: testInvoice.amt,
          paid: testInvoice.paid,
          add_date: testInvoice.add_date,
          paid_date: testInvoice.paid_date,
        },
      });
    });

    test('Returns 404 for non-existent invoice', async () => {
      const response = await request(app).get('/invoices/0');
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /invoices', () => {
    test('Creates a new invoice', async () => {
      const response = await request(app).post('/invoices').send({
        comp_code: testCompany.code,
        amt: 200,
      });
      expect(response.statusCode).toBe(200);
      expect(response.body.invoice).toEqual(
        expect.objectContaining({
          comp_code: testCompany.code,
          amt: 200,
          paid: false,
        })
      );
    });

    test('Returns 500 for invalid company code', async () => {
      const response = await request(app).post('/invoices').send({
        comp_code: 'nonexistent',
        amt: 200,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /invoices/:id', () => {
    test('Updates an invoice', async () => {
      const response = await request(app)
        .put(`/invoices/${testInvoice.id}`)
        .send({ amt: 300 });
      expect(response.statusCode).toBe(200);
      expect(response.body.invoice).toEqual(
        expect.objectContaining({
          id: testInvoice.id,
          comp_code: testInvoice.comp_code,
          amt: 300,
        })
      );
    });

    test('Returns 404 for non-existent invoice', async () => {
      const response = await request(app).put('/invoices/0').send({ amt: 300 });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /invoices/:id', () => {
    test('Deletes an invoice', async () => {
      const response = await request(app).delete(`/invoices/${testInvoice.id}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ status: 'deleted' });

      // Verify invoice is deleted
      const checkResponse = await request(app).get(
        `/invoices/${testInvoice.id}`
      );
      expect(checkResponse.statusCode).toBe(404);
    });

    test('Returns 404 for non-existent invoice', async () => {
      const response = await request(app).delete('/invoices/0');
      expect(response.statusCode).toBe(404);
    });
  });
});
