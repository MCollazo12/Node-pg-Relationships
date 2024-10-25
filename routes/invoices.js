const express = require('express');
const ExpressError = require('../expressError');
const db = require('../db');

let router = new express.Router();

// GET /invoices: Returns all invoices
router.get('/', async (req, res, next) => {
  try {
    const results = await db.query(`SELECT * FROM invoices`);
    return res.json(results.rows);
  } catch (err) {
    return next(err);
  }
});

// GET /invoices[id]: Returns a specific invoice
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await db.query(
      `SELECT i.id,
              i.comp_code,
              i.amt,
              i.paid,
              i.add_date,
              i.paid_date,
              c.name,
              c.description
        FROM invoices AS i
        INNER JOIN companies AS c ON (i.comp_code = c.code)
        WHERE id=$1`,
      [id]
    );

    const data = result.rows[0];

    if (!data) {
      throw new ExpressError('Invoice not found', 404);
    }

    return res.json({
      invoice: {
        id: data.id,
        company: {
          code: data.code,
          name: data.name,
          description: data.description,
        },
        amt: data.amt,
        paid: data.paid,
        add_date: data.add_date,
        paid_date: data.paid_date,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// POST /invoices: Adds a new invoice.
router.post('/', async (req, res, next) => {
  try {
    let { comp_code, amt } = req.body;

    const result = db.query(
      `
      INSERT INTO invoices (comp_code, amt)
      VALUES ($1, $2)
      RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [comp_code, amt]
    );

    return res.json({ invoice: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// PUT /invoices/[id]: Updates an invoice. If invoice not found, return 404.
router.put('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    let { amt } = req.body;

    const result = await db.query(
      `UPDATE invoices
       SET amt=$1
       WHERE id=$2
       RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [amt, id]
    );

    if (result.rows.length === 0) {
      throw new ExpressError('Invoice not found', 404);
    }

    return res.json({ invoice: result.rows[0] });
  } catch (err) {
    console.error('Error updating invoice:', err)
    return next(err);
  }
});

// DELETE /invoices/[id]: Deletes an invoice. If invoice not found, return 404.
router.delete('/:id', async function (req, res, next) {
  try {
    let id = req.params.id;

    const result = await db.query(
      `DELETE FROM invoices
           WHERE id = $1
           RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`Invoice not found `, 404);
    }

    return res.json({ status: 'deleted' });
  } catch (err) {
    return next(err);
  }
});
module.exports = router;
