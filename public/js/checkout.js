document.addEventListener('DOMContentLoaded', () => {
  const items = Cart.get();
  if (!items.length) {
    window.location.href = '/sepet';
    return;
  }
  document.getElementById('checkoutTotal').textContent = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(Cart.total());

  document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const payment = f.payment_method?.value;
    if (!payment) return alert('Ödeme yöntemi seçin');

    const body = {
      customer: {
        name: f.name.value,
        phone: f.phone.value,
        email: f.email.value,
        address: f.address.value,
        city: f.city.value,
        district: f.district.value,
      },
      items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      payment_method: payment,
      notes: f.notes.value,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sipariş oluşturulamadı');

      Cart.clear();
      f.style.display = 'none';
      document.getElementById('orderSuccess').style.display = 'block';
      document.getElementById('orderNumber').textContent = data.order_number;
    } catch (err) {
      alert(err.message);
    }
  });
});
