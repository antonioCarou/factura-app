// routes/productos.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// Devuelve el producto activo con ese nombre (si existe)
router.get("/buscar", (req, res) => {
  const { nombre } = req.query;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

  db.get(
    `SELECT precio_unitario, iva FROM productos WHERE UPPER(nombre) = ? AND activo = 1`,
    [nombre.trim().toUpperCase()],
    (err, row) => {
      if (err)
        return res.status(500).json({ error: "Error al buscar producto" });
      if (!row)
        return res.status(404).json({ error: "Producto no encontrado" });
      res.json(row);
    }
  );
});

router.get("/historial", (req, res) => {
  db.all(
    `SELECT nombre, descripcion, precio_unitario, iva, activo, rowid as id
       FROM productos
       ORDER BY activo DESC, nombre COLLATE NOCASE ASC, id DESC`,
    [],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error al obtener historial" });
      res.json(rows);
    }
  );
});

router.get("/sugerencias", (req, res) => {
  const raw = req.query.search || "";
  const search = raw.toString().trim().toUpperCase();

  // Si está vacío, devolvemos productos sin filtro
  if (!search) {
    return db.all(
      `SELECT id, nombre, descripcion, precio_unitario, iva
         FROM productos
         WHERE activo = 1
         ORDER BY nombre
         LIMIT 10`,
      [],
      (err, rows) => {
        if (err)
          return res.status(500).json({ error: "Error al obtener productos" });
        res.json(rows);
      }
    );
  }

  db.all(
    `SELECT id, nombre, descripcion, precio_unitario, iva
       FROM productos
       WHERE activo = 1 AND UPPER(nombre) LIKE ?
       ORDER BY nombre
       LIMIT 10`,
    [`%${search}%`],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error al buscar productos" });
      res.json(rows);
    }
  );
});

module.exports = router;
