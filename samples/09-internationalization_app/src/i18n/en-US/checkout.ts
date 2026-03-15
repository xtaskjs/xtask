const checkout = {
  summary: {
    headline: "Checkout for {{name, uppercase}}",
    total: {
      one: "Checkout total for {{count, number}} item: {{amount, currency}}",
      other: "Checkout total for {{count, number}} items: {{amount, currency}}",
    },
    processed:
      "Processed at {{processedAt, datetime, dateStyle=medium, timeStyle=short, timeZone=UTC}}",
  },
};

export default checkout;