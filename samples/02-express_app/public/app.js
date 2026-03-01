document.getElementById("ping")?.addEventListener("click", async () => {
  const output = document.getElementById("out");
  if (!output) {
    return;
  }

  const response = await fetch("/health");
  const payload = await response.json();
  output.textContent = JSON.stringify(payload, null, 2);
});
