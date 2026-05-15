// Mobil sidebar
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function closeSidebar() {
  document.body.classList.remove('admin-sidebar-open');
  sidebarOverlay?.classList.remove('visible');
}

sidebarToggle?.addEventListener('click', () => {
  const open = document.body.classList.toggle('admin-sidebar-open');
  sidebarOverlay?.classList.toggle('visible', open);
});

sidebarOverlay?.addEventListener('click', closeSidebar);

document.querySelectorAll('.admin-sidebar a').forEach((link) => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 900) closeSidebar();
  });
});

// Kullanıcı menüsü
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const userMenu = document.querySelector('.admin-user-menu');

userMenuBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = userMenu?.classList.toggle('open');
  userDropdown.hidden = !open;
  userMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
});

document.addEventListener('click', (e) => {
  if (userMenu && !userMenu.contains(e.target)) {
    userMenu.classList.remove('open');
    if (userDropdown) userDropdown.hidden = true;
    userMenuBtn?.setAttribute('aria-expanded', 'false');
  }
});

document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const msg = document.getElementById('profileMsg');
  msg.textContent = '';
  msg.className = 'profile-msg';

  const body = {
    current_password: f.current_password.value,
    new_username: f.new_username.value.trim() || undefined,
    new_password: f.new_password.value || undefined,
  };

  try {
    const res = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Güncellenemedi');
    msg.textContent = data.message;
    msg.classList.add('ok');
    document.getElementById('currentUsername').textContent = data.username;
    f.current_password.value = '';
    f.new_password.value = '';
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('err');
  }
});

// Ürün silme
document.querySelectorAll('.btn-delete-product').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!confirm('Bu ürün silinsin mi?')) return;
    const res = await fetch(`/api/admin/products/${btn.dataset.id}`, { method: 'DELETE' });
    if (res.ok) location.reload();
    else alert('Silinemedi');
  });
});
