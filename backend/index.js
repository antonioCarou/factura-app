// index.js
const express = require('express');
const cors = require('cors');
const db = require('./db'); // conexión a la base de datos
const facturaRouter = require('./routes/facturas'); // importamos la ruta de facturas
const productosRouter = require('./routes/productos');
const clientesRouter = require('./routes/clientes');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware para permitir peticiones entre frontend y backend
app.use(cors());

// Middleware para parsear JSON del body de las peticiones
app.use(express.json());

// Ruta base de prueba
app.get('/', (req, res) => {
  res.send('✅ API de facturación funcionando');
});

// Usamos las rutas de facturas bajo /facturas
app.use('/facturas', facturaRouter);
// Usamos las rutas de productos bajo /productos
app.use('/productos', productosRouter);
// Usamos las rutas para obtener los pdf
app.use('/facturas/pdf', express.static(path.join(__dirname, 'facturas_pdf')));
app.use('/clientes', clientesRouter);

// Arrancamos el servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
});
