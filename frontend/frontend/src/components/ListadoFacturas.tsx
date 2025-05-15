import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface FacturaResumen {
  id: number;
  numero: string;
  fecha: string;
  cliente: string;
}

const ListadoFacturas: React.FC = () => {
  const [facturas, setFacturas] = useState<FacturaResumen[]>([]);

  useEffect(() => {
    axios.get('http://localhost:5000/facturas')
      .then(res => setFacturas(res.data))
      .catch(err => console.error('Error al cargar facturas:', err));
  }, []);

  const abrirPDF = (numero: string) => {
    const url = `http://localhost:5000/facturas/pdf/FACTURA_${numero}.pdf`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <h2>📄 Facturas generadas</h2>
      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>Número</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {facturas.map((f) => (
            <tr key={f.id}>
              <td>{f.numero}</td>
              <td>{f.fecha}</td>
              <td>{f.cliente}</td>
              <td>
                <button onClick={() => abrirPDF(f.numero)}>📥 Abrir PDF</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ListadoFacturas;
