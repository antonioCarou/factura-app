const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

const generarPDF = async (factura, nombreArchivo) => {
  // Cargar y compilar la plantilla
  const templatePath = path.join(__dirname, "../templates/factura.html");
  const html = fs.readFileSync(templatePath, "utf8");
  const template = Handlebars.compile(html);

  // Calcular total por línea (precio_unitario ya incluye IVA)
  const productos = factura.productos.map((p) => {
    const total = p.precio_unitario * p.unidades;
    return {
      ...p,
      total: total.toFixed(2),
    };
  });

  // Recalcular desglose: partimos del total con IVA y descomponemos la base imponible
  const desgloseIVA = {};
  for (const p of factura.productos) {
    const total = p.precio_unitario * p.unidades;
    const ivaFactor = 1 + p.iva / 100;
    const base = total / ivaFactor;
    const cuota = total - base;

    const key = p.iva + "%";
    if (!desgloseIVA[key]) {
      desgloseIVA[key] = { base: 0, cuota: 0 };
    }
    desgloseIVA[key].base += base;
    desgloseIVA[key].cuota += cuota;
  }

  const resumenIVA = Object.entries(desgloseIVA).map(([tipo, datos]) => ({
    tipo,
    base: datos.base.toFixed(2),
    cuota: datos.cuota.toFixed(2),
    total: (datos.base + datos.cuota).toFixed(2),
  }));

  const totalFactura = productos
    .reduce((suma, p) => suma + parseFloat(p.total), 0)
    .toFixed(2);

  const content = template({
    ...factura,
    productos,
    resumenIVA,
    totalFactura,
  });

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setContent(content, { waitUntil: "networkidle0" });

  const outputPath = path.join(__dirname, "../facturas_pdf", nombreArchivo);
  await page.pdf({ path: outputPath, format: "A4" });

  await browser.close();

  return outputPath;
};

module.exports = generarPDF;
