const form = document.getElementById("salesForm");
const message = document.getElementById("message");

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const item = document.getElementById("item").value;
  const price = document.getElementById("price").value;
  const quantity = document.getElementById("quantity").value;
  const seller = document.getElementById("seller").value;

  fetch("https://script.google.com/macros/s/AKfycbwZXO3fUwcyShvn-Ay8Iq73qHAUZJxgQiNuSGoLxhHnOnE8zWy0eWSkMkcNGisuYo0q-g/exec", {
    method: "POST",
    body: JSON.stringify({
      item: item,
      price: price,
      quantity: quantity,
      seller: seller,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.text())
    .then((data) => {
      message.textContent = "✅ Sale recorded successfully!";
      form.reset();
    })
    .catch((err) => {
      message.textContent = "❌ Error sending data. Check your connection.";
      console.error(err);
    });
});