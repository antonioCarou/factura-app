import React from 'react';
import './App.css';
import FormularioFactura from './components/FormularioFactura';
import ListadoProductos from './components/ListadoProductos';
import ListadoFacturas from './components/ListadoFacturas';

function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>🧾 Generador de Facturas</h1>
      <FormularioFactura />
      <hr style={{ margin: '2rem 0' }} />
      <ListadoProductos />
      <hr style={{ margin: '2rem 0' }} />
      <ListadoFacturas />
    </div>
  );
}

export default App;
