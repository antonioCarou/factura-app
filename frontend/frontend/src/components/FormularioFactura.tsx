import React, { useState } from 'react';
import axios from 'axios';

interface Cliente {
  nombre: string;
  direccion?: string;
  localidad?: string;
  cp?: string;
  provincia?: string;
  nif: string;
}

interface ClienteResumen {
  id: number;
  nombre: string;
  direccion: string;
  localidad: string;
  cp: string;
  provincia: string;
  nif: string;
}

interface ProductoResumen {
  id: number;
  nombre: string;
  descripcion: string;
  precio_unitario: number;
  iva: number;
}


interface Producto {
  nombre: string;
  descripcion?: string;
  precio_unitario: string; // inicialmente como texto del input
  iva: string;
  unidades: string;
}

const obtenerProductoPorNombre = async (nombre: string) => {
  try {
    const res = await axios.get(`http://localhost:5000/productos/buscar?nombre=${encodeURIComponent(nombre)}`);
    return res.data; // debe devolver { precio_unitario, iva }
  } catch {
    return null;
  }
};

const FormularioFactura: React.FC = () => {
  const [cliente, setCliente] = useState<Cliente>({
    nombre: '',
    direccion: '',
    localidad: '',
    cp: '',
    provincia: '',
    nif: ''
  });

  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0, 10));
  const [productos, setProductos] = useState<Producto[]>([
    { nombre: '', descripcion: '', precio_unitario: '', iva: '', unidades: '' }
  ]);
  const [sugerenciasCliente, setSugerenciasCliente] = useState<ClienteResumen[]>([]);

  const handleClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCliente({ ...cliente, [e.target.name]: e.target.value });
  };

  const [sugerenciasProducto, setSugerenciasProducto] = useState<Record<number, ProductoResumen[]>>({});
  const [numeroFactura, setNumeroFactura] = useState('');

  const handleProductoChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nuevos = [...productos];
    nuevos[index][name as keyof Producto] = value;
    setProductos(nuevos);
  };

  const buscarClientes = async (filtro: string): Promise<ClienteResumen[]> => {
    try {
      const res = await axios.get(`http://localhost:5000/clientes?search=${encodeURIComponent(filtro)}`);
      return res.data;
    } catch {
      return [];
    }
  };

  const rellenarClienteSiExiste = (nombre: string) => {
    const clienteEncontrado = sugerenciasCliente.find(
      (c) => c.nombre.trim().toUpperCase() === nombre.trim().toUpperCase()
    );

    if (clienteEncontrado) {
      setCliente({
        nombre: clienteEncontrado.nombre,
        direccion: clienteEncontrado.direccion,
        localidad: clienteEncontrado.localidad,
        cp: clienteEncontrado.cp,
        provincia: clienteEncontrado.provincia,
        nif: clienteEncontrado.nif
      });
    }
  };

  const buscarProductos = async (nombre: string): Promise<ProductoResumen[]> => {
    try {
      const res = await axios.get(
        `http://localhost:5000/productos/sugerencias?search=${encodeURIComponent(nombre)}`
      );
      return res.data;
    } catch {
      return [];
    }
  };

  const rellenarProductoSiExiste = (index: number, nombre: string) => {
    const lista = sugerenciasProducto[index] || [];
    const producto = lista.find(
      (p) => p.nombre.trim().toUpperCase() === nombre.trim().toUpperCase()
    );

    if (producto) {
      const copia = [...productos];
      copia[index] = {
        ...copia[index],
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio_unitario: producto.precio_unitario.toString(),
        iva: producto.iva.toString()
      };
      setProductos(copia);
    }
  };

  const verificarCambioPrecio = async (index: number) => {
    const producto = productos[index];
    if (!producto.nombre.trim()) return;

    const productoBD = await obtenerProductoPorNombre(producto.nombre.trim());
    if (!productoBD) return;

    const precioInput = parseFloat(producto.precio_unitario);
    const precioBD = parseFloat(productoBD.precio_unitario);

    if (precioInput !== precioBD) {
      const confirmar = window.confirm(
        `⚠️ El producto "${producto.nombre}" ya existe con un precio diferente (${precioBD}€). ¿Quieres registrar este nuevo precio?`
      );
      if (!confirmar) {
        // Revertimos
        const copia = [...productos];
        copia[index].precio_unitario = productoBD.precio_unitario.toString();
        setProductos(copia);
      }
    }
  };

  const verificarCambioIVA = async (index: number) => {
    const producto = productos[index];
    if (!producto.nombre.trim()) return;

    const productoBD = await obtenerProductoPorNombre(producto.nombre.trim());
    if (!productoBD) return;

    const ivaInput = parseFloat(producto.iva);
    const ivaBD = parseFloat(productoBD.iva);

    if (ivaInput !== ivaBD) {
      const confirmar = window.confirm(
        `⚠️ El producto "${producto.nombre}" ya existe con un IVA diferente (${ivaBD}%). ¿Quieres registrar este nuevo IVA?`
      );
      if (!confirmar) {
        // Revertimos
        const copia = [...productos];
        copia[index].iva = productoBD.iva.toString();
        setProductos(copia);
      }
    }
  };

  const agregarProducto = () => {
    setProductos([...productos, { nombre: '', descripcion: '', precio_unitario: '', iva: '', unidades: '' }]);
  };

  const eliminarProducto = (index: number) => {
    setProductos(productos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      fecha,
      numero: numeroFactura !== '' ? numeroFactura : undefined, // solo si no está vacío
      cliente: {
        ...cliente,
        nombre: cliente.nombre.trim(),
        direccion: cliente.direccion?.trim() || '',
        localidad: cliente.localidad?.trim() || '',
        cp: cliente.cp?.trim() || '',
        provincia: cliente.provincia?.trim() || '',
        nif: cliente.nif.trim()
      },
      productos: productos.map(p => ({
        nombre: p.nombre.trim(),
        descripcion: p.descripcion?.trim() || '',
        precio_unitario: parseFloat(p.precio_unitario),
        iva: parseFloat(p.iva),
        unidades: parseInt(p.unidades)
      }))
    };

    try {
      const res = await axios.post('http://localhost:5000/facturas', payload);
      alert(`✅ Factura creada con número ${res.data.numero}`);
      // Descargar el PDF generado
      const pdfUrl = `http://localhost:5000/facturas/pdf/${res.data.archivo}`;
      window.open(pdfUrl, '_blank');
    } catch (err) {
      console.error(err);
      alert('❌ Error al crear la factura');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Datos del Cliente</h2>
      <input
        name="nombre"
        placeholder="Nombre"
        value={cliente.nombre}
        onChange={async (e) => {
          handleClienteChange(e);
          const sugerencias = await buscarClientes(e.target.value);
          setSugerenciasCliente(sugerencias);
        }}
        onBlur={() => rellenarClienteSiExiste(cliente.nombre)}
        list="clientes-sugerencias"
      />
      <datalist id="clientes-sugerencias">
        {sugerenciasCliente.map((c) => (
          <option key={c.id} value={c.nombre} />
        ))}
      </datalist>

      <input name="direccion" placeholder="Dirección" value={cliente.direccion} onChange={handleClienteChange} />
      <input name="localidad" placeholder="Localidad" value={cliente.localidad} onChange={handleClienteChange} />
      <input name="cp" placeholder="CP" value={cliente.cp} onChange={handleClienteChange} />
      <input name="provincia" placeholder="Provincia" value={cliente.provincia} onChange={handleClienteChange} />
      <input name="nif" placeholder="NIF" value={cliente.nif} onChange={handleClienteChange} />

      <h2>Fecha de la factura</h2>
      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      <h2>Número de factura (opcional)</h2>
      <input
        type="text"
        placeholder="Ej: 1055"
        value={numeroFactura}
        onChange={(e) => setNumeroFactura(e.target.value.trim())}
      />

      <h2>Productos</h2>
      {productos.map((producto, index) => (
        <div key={index} style={{ border: '1px solid #ccc', padding: '8px', marginBottom: '10px' }}>
          <input
            name="nombre"
            placeholder="Nombre"
            value={producto.nombre}
            onChange={async (e) => {
              handleProductoChange(index, e);
              const sugerencias = await buscarProductos(e.target.value);
              setSugerenciasProducto((prev) => ({
                ...prev,
                [index]: sugerencias
              }));
            }}
            onBlur={() => rellenarProductoSiExiste(index, producto.nombre)}
            list={`productos-sugerencias-${index}`}
          />

          <datalist id={`productos-sugerencias-${index}`}>
            {(sugerenciasProducto[index] || []).map((p) => (
              <option key={p.id} value={p.nombre} />
            ))}
          </datalist>
          <input name="descripcion" placeholder="Descripción" value={producto.descripcion} onChange={(e) => handleProductoChange(index, e)} />
          <input
            name="precio_unitario"
            type="number"
            step="0.01"
            placeholder="Precio"
            value={producto.precio_unitario}
            onChange={(e) => handleProductoChange(index, e)}
            onBlur={() => verificarCambioPrecio(index)}
          />
          <input
            name="iva"
            type="number"
            step="0.01"
            placeholder="IVA %"
            value={producto.iva}
            onChange={(e) => handleProductoChange(index, e)}
            onBlur={() => verificarCambioIVA(index)}
          />
          <input name="unidades" type="number" placeholder="Unidades" value={producto.unidades} onChange={(e) => handleProductoChange(index, e)} />
          <button type="button" onClick={() => eliminarProducto(index)}>❌ Eliminar</button>
        </div>
      ))}

      <button type="button" onClick={agregarProducto}>➕ Agregar producto</button>
      <br /><br />
      <button type="submit">💾 Crear factura</button>
    </form>
  );
};

export default FormularioFactura;
