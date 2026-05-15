const Cart = {
  key: 'manset_cart',

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || '[]');
    } catch {
      return [];
    }
  },

  save(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
    this.updateBadge();
  },

  add(item) {
    const items = this.get();
    const existing = items.find((i) => i.product_id === item.product_id);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      items.push({
        product_id: item.product_id,
        title: item.title,
        price: item.price,
        slug: item.slug,
        quantity: item.quantity || 1,
      });
    }
    this.save(items);
  },

  remove(productId) {
    this.save(this.get().filter((i) => i.product_id !== productId));
  },

  updateQty(productId, quantity) {
    const items = this.get();
    const item = items.find((i) => i.product_id === productId);
    if (item) {
      item.quantity = Math.max(1, quantity);
      this.save(items);
    }
  },

  total() {
    return this.get().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  count() {
    return this.get().reduce((sum, i) => sum + i.quantity, 0);
  },

  updateBadge() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = this.count();
  },

  clear() {
    localStorage.removeItem(this.key);
    this.updateBadge();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
  document.querySelectorAll('[data-add-cart]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.disabled) return;
      Cart.add({
        product_id: +btn.dataset.addCart,
        title: btn.dataset.title,
        price: +btn.dataset.price,
        slug: btn.dataset.slug,
        quantity: 1,
      });
      const orig = btn.textContent;
      btn.textContent = '✓ Eklendi';
      setTimeout(() => { btn.textContent = orig; }, 1200);
    });
  });
});
