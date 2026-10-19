document.getElementById('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();

  try {
    const respuesta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
      }),
    });
    const data = await respuesta.json();

    if (!respuesta.ok) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Credenciales incorrectas' });
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('rol', data.rol);
    localStorage.setItem('nombre', data.usuario?.nombre || '');

    if (data.rol === 'admin') {
      window.location.replace('/administracion.html');
      return;
    }

    const destino = localStorage.getItem('redirectAfterLogin');
    if (destino && destino.startsWith('/') && !destino.startsWith('//')) {
      localStorage.removeItem('redirectAfterLogin');
      window.location.replace(destino);
      return;
    }

    localStorage.removeItem('redirectAfterLogin');
    window.location.replace('/index.html');
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: 'Credenciales incorrectas' });
  }
});
