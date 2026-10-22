document.getElementById('form-olvide').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const boton = evento.currentTarget.querySelector('button');
  boton.disabled = true;
  try {
    const respuesta = await fetch('/api/auth/olvide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('email').value.trim() }),
    });
    const data = await respuesta.json().catch(() => ({}));
    Swal.fire({
      icon: respuesta.ok ? 'success' : 'warning',
      title: respuesta.ok ? 'Revisa tu correo' : 'Revisa el correo',
      text: data.mensaje || 'Intenta de nuevo.',
    });
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo enviar', text: 'Intenta de nuevo.' });
  } finally {
    boton.disabled = false;
  }
});
