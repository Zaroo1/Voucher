document.getElementById("salesForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const item = document.getElementById("item").value;
  const price = document.getElementById("price").value;
  const quantity = document.getElementById("quantity").value;
  const seller = document.getElementById("seller").value;

  const data = { item, price, quantity, seller };

  fetch("https://docs.google.com/spreadsheets/d/1-4lp-mYGqlS4fQCgTuMyTqpLpjGJFr8H76IdlOynrWs/edit?usp=drivesdk", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" }
  })
  .then(response => response.text())
  .then(result => {
    document.getElementById("responseMessage").textContent = "Sale recorded!";
    document.getElementById("salesForm").reset();
  })
  .catch(error => {
    document.getElementById("responseMessage").textContent = "Error sending data.";
  });
});