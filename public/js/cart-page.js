function formatPrice(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
}

function renderCart() {
  const items = Cart.get();
  const container = document.getElementById('cartItems');
  const summary = document.getElementById('cartSummary');

  if (!items.length) {
    container.innerHTML = '<div class="empty-state"><p>Sepetiniz boş.</p><a href="/urunler" class="btn btn-primary" style="margin-top:1rem">Alışverişe Başla</a></div>';
    summary.style.display = 'none';
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
    <div class="cart-item" data-id="${item.product_id}">
      <div class="cart-item-info">
        <strong><a href="/urun/${item.slug}">${item.title}</a></strong>
        <p>${formatPrice(item.price)} × ${item.quantity}</p>
      </div>
      <div>
        <button type="button" class="btn-qty-minus" data-id="${item.product_id}">−</button>
        <span>${item.quantity}</span>
        <button type="button" class="btn-qty-plus" data-id="${item.product_id}">+</button>
        <button type="button" class="btn-remove" data-id="${item.product_id}" style="margin-left:1rem;color:#b91c1c;background:none;border:none;cursor:pointer">Kaldır</button>
      </div>
    </div>`
    )
    .join('');

  document.getElementById('cartTotal').textContent = formatPrice(Cart.total());
  summary.style.display = 'block';

  container.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.onclick = () => {
      Cart.remove(+btn.dataset.id);
      renderCart();
    };
  });
  container.querySelectorAll('.btn-qty-minus').forEach((btn) => {
    btn.onclick = () => {
      const item = Cart.get().find((i) => i.product_id === +btn.dataset.id);
      if (item && item.quantity > 1) {
        Cart.updateQty(+btn.dataset.id, item.quantity - 1);
        renderCart();
      }
    };
  });
  container.querySelectorAll('.btn-qty-plus').forEach((btn) => {
    btn.onclick = () => {
      const item = Cart.get().find((i) => i.product_id === +btn.dataset.id);
      if (item) {
        Cart.updateQty(+btn.dataset.id, item.quantity + 1);
        renderCart();
      }
    };
  });
}

document.addEventListener('DOMContentLoaded', renderCart);
