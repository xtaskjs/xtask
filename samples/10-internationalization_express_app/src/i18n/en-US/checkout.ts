const checkout = {
  page: {
    title: "Checkout for {{name, uppercase}}",
    subtitle: "This page is loaded from a namespace that is resolved on demand.",
  },
  summary: {
    title: "Order summary",
    total: {
      one: "Total for {{count, number}} item: {{amount, currency}}",
      other: "Total for {{count, number}} items: {{amount, currency}}",
    },
    processed:
      "Processed at {{processedAt, datetime, dateStyle=medium, timeStyle=short, timeZone=UTC}}",
  },
};

export default checkout;