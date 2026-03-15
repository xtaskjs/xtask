const checkout = {
  page: {
    title: "Pago para {{name, uppercase}}",
    subtitle: "Esta pagina usa un namespace cargado bajo demanda.",
  },
  summary: {
    title: "Resumen del pedido",
    total: {
      one: "Total para {{count, number}} articulo: {{amount, currency}}",
      other: "Total para {{count, number}} articulos: {{amount, currency}}",
    },
    processed:
      "Procesado el {{processedAt, datetime, dateStyle=medium, timeStyle=short, timeZone=Europe/Madrid}}",
  },
};

export default checkout;