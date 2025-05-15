import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface ProductoHistorial {
  id: number;
  nombre: string;
  descripcion: string;
  precio_unitario: number;
  iva: number;
  activo: number;
}

const ListadoProductos: React.FC = () => {
  const [productos, setProductos] = useState<ProductoHistorial[]>([]);

  useEffect(() => {
    axios.get('http://localhost:5000/productos/historial')
      .then(res => setProductos(res.data))
      .catch(err => console.error('Error cargando historial:', err));
  }, []);

  return (
    <div>
      <h2>📦 Historial de Productos</h2>
      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Precio unitario</th>
            <th>IVA (%)</th>
            <th>Activo</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td>{p.descripcion}</td>
              <td>{p.precio_unitario.toFixed(2)} €</td>
              <td>{p.iva}%</td>
              <td>{p.activo === 1 ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ListadoProductos;
