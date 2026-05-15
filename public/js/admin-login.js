(function () {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const redirect = form.dataset.redirect || '/admin';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const err = document.getElementById('loginError');

    if (!username || !password) {
      err.textContent = 'Kullanıcı adı ve şifre zorunludur';
      err.style.display = 'block';
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Giriş başarısız');
      window.location.href = redirect;
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
    }
  });
})();
