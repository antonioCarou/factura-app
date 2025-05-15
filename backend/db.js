// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ruta al archivo de la base de datos
const dbPath = path.resolve(__dirname, 'facturas.db');

// 👉 Para desarrollo: Elimina la base de datos si ya existe (cuidado: borra todo)
const borrarBD = false; // ⬅️ Cambia a true si quieres reiniciar

if (borrarBD && fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('⚠️ Base de datos eliminada');
}

const db = new sqlite3.Database(dbPath);

// Crear tablas
db.serialize(() => {
  // Clientes
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      direccion TEXT,
      localidad TEXT,
      cp TEXT,
      provincia TEXT,
      nif TEXT
    )
  `);

  // Productos
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio_unitario REAL NOT NULL,
      iva REAL NOT NULL,
      activo INTEGER DEFAULT 1
    )
  `);

  // Facturas
  db.run(`
    CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL UNIQUE,
      fecha TEXT NOT NULL,
      cliente_id INTEGER NOT NULL,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )
  `);

  // Relación productos <-> factura
  db.run(`
    CREATE TABLE IF NOT EXISTS factura_productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factura_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      unidades INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      iva REAL NOT NULL,
      FOREIGN KEY (factura_id) REFERENCES facturas(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `);
  
});

module.exports = db;
