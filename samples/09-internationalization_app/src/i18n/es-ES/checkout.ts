const checkout = {
  summary: {
    headline: "Pago para {{name, uppercase}}",
    total: {
      one: "Total del pago para {{count, number}} articulo: {{amount, currency}}",
      other: "Total del pago para {{count, number}} articulos: {{amount, currency}}",
    },
    processed:
      "Procesado el {{processedAt, datetime, dateStyle=medium, timeStyle=short, timeZone=Europe/Madrid}}",
  },
};

export default checkout;