// routes/facturas.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const generarPDF = require("../utils/pdfGenerator");
const path = require("path");

/**
 * Devuelve el siguiente número disponible.
 * Si no se proporciona un número base, parte del último + random(3-5)
 */
const obtenerNumeroFacturaDisponible = async (numeroPropuesto = null) => {
  return new Promise((resolve, reject) => {
    if (numeroPropuesto) {
      // Si el número fue enviado manualmente, validamos que no exista
      const comprobarDisponibilidad = (numero) => {
        db.get(
          `SELECT numero FROM facturas WHERE numero = ?`,
          [numero],
          (err, row) => {
            if (err) return reject(err);
            if (!row) {
              // Número libre
              resolve(String(numero));
            } else {
              // Intentar el siguiente
              comprobarDisponibilidad(numero + 1);
            }
          }
        );
      };

      comprobarDisponibilidad(parseInt(numeroPropuesto));
    } else {
      // Si no se propuso ningún número, buscamos el último
      db.get(
        `SELECT numero FROM facturas ORDER BY id DESC LIMIT 1`,
        [],
        (err, row) => {
          if (err) return reject(err);
          const base = row ? parseInt(row.numero) : 1000;
          const incremento = Math.floor(Math.random() * 3) + 3; // [3, 5]
          resolve(String(base + incremento));
        }
      );
    }
  });
};

// Función que encapsula la creación de producto
const crearProductoNuevo = (resolve, reject, producto) => {
  db.run(
    `INSERT INTO productos (nombre, descripcion, precio_unitario, iva, activo)
     VALUES (?, ?, ?, ?, 1)`,
    [
      producto.nombre.trim(),
      producto.descripcion.trim() || "",
      producto.precio_unitario,
      producto.iva,
    ],
    function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    }
  );
};

// Ruta para crear una nueva factura
router.post("/", async (req, res) => {
  try {
    const { numero, fecha, cliente, productos } = req.body;

    // Validación mínima
    if (!fecha || !cliente || !productos || productos.length === 0) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // 1️⃣ Insertar o buscar cliente existente por nombre y NIF
    const cliente_id = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM clientes WHERE UPPER(nombre) = ? AND UPPER(nif) = ?`,
        [cliente.nombre.trim().toUpperCase(), cliente.nif.trim().toUpperCase()],
        (err, row) => {
          if (err) return reject(err);

          if (row) {
            // Cliente ya existe
            resolve(row.id);
          } else {
            // Insertamos nuevo cliente
            db.run(
              `INSERT INTO clientes (nombre, direccion, localidad, cp, provincia, nif)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                cliente.nombre.trim(),
                cliente.direccion.trim() || "",
                cliente.localidad.trim() || "",
                cliente.cp.trim() || "",
                cliente.provincia.trim() || "",
                cliente.nif.trim() || "",
              ],
              function (err) {
                if (err) return reject(err);
                resolve(this.lastID); // ID generado automáticamente
              }
            );
          }
        }
      );
    });

    // 2️⃣ Determinar número de factura si no se proporciona
    const numeroFactura = numero || (await obtenerNumeroFacturaDisponible());

    // 3️⃣ Insertar factura
    const factura_id = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO facturas (numero, fecha, cliente_id)
         VALUES (?, ?, ?)`,
        [numeroFactura, fecha, cliente_id],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });

    // 4️⃣ Insertar productos y relaciones con la factura
    for (const producto of productos) {
      // Buscar producto por nombre y si está activo
      const producto_id = await new Promise((resolve, reject) => {
        db.get(
          `SELECT id, precio_unitario, iva FROM productos WHERE UPPER(nombre) = ? AND activo = 1`,
          [producto.nombre.trim().toUpperCase()],
          (err, row) => {
            if (err) return reject(err);

            if (!row) {
              // No existe ningún producto activo con este nombre → crear uno nuevo
              crearProductoNuevo(resolve, reject, producto);
            } else {
              // Existe, pero debemos comparar precio e IVA
              const mismoPrecio =
                row.precio_unitario === producto.precio_unitario;
              const mismoIVA = row.iva === producto.iva;

              if (mismoPrecio && mismoIVA) {
                // Es exactamente igual → reutilizamos
                resolve(row.id);
              } else {
                // Aquí deberíamos **preguntar al usuario** si quiere crear nuevo producto
                // Pero como estamos en backend, asumimos que el frontend ya lo ha preguntado

                // Marcar como inactivo el producto viejo
                db.run(
                  `UPDATE productos SET activo = 0 WHERE id = ?`,
                  [row.id],
                  (err) => {
                    if (err) return reject(err);
                    // Crear nuevo producto
                    crearProductoNuevo(resolve, reject, producto);
                  }
                );
              }
            }
          }
        );
      });

      // Insertar en factura_productos (línea de factura)
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO factura_productos (factura_id, producto_id, unidades, precio_unitario, iva)
           VALUES (?, ?, ?, ?, ?)`,
          [
            factura_id,
            producto_id,
            producto.unidades,
            producto.precio_unitario,
            producto.iva,
          ],
          function (err) {
            if (err) return reject(err);
            resolve();
          }
        );
      });
    }

    // 5️⃣ Generar el PDF después de crear la factura
    const facturaCompleta = {
      numero: numeroFactura,
      fecha,
      cliente,
      productos,
    };

    const nombreArchivo = `FACTURA_${numeroFactura}.pdf`;
    const pdfPath = await generarPDF(facturaCompleta, nombreArchivo);

    // 6️⃣ Enviar respuesta incluyendo la ruta del PDF
    res.status(201).json({
      mensaje: "Factura creada correctamente",
      numero: numeroFactura,
      archivo: path.basename(pdfPath),
    });
  } catch (error) {
    console.error("❌ Error al crear factura:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Listar facturas con cliente
router.get('/', (req, res) => {
  db.all(
    `SELECT f.id, f.numero, f.fecha, c.nombre as cliente
     FROM facturas f
     JOIN clientes c ON f.cliente_id = c.id
     ORDER BY f.id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error al obtener facturas' });
      res.json(rows);
    }
  );
});

module.exports = router;
