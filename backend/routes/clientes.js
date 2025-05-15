const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const search = (req.query.search || '').trim().toUpperCase();

  db.all(
    `SELECT id, nombre, direccion, localidad, cp, provincia, nif
     FROM clientes
     WHERE UPPER(nombre) LIKE ? ORDER BY nombre LIMIT 10`,
    [`%${search}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error al buscar clientes' });
      res.json(rows);
    }
  );
});

module.exports = router;
