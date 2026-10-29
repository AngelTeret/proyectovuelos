const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const revisarCorreo = (avisarVacio) => {
  const correo = document.getElementById('email').value.trim();
  const nota = document.getElementById('nota-correo');
  const valido = CORREO.test(correo) && correo.length <= 100;
  let texto = '';
  if (!valido && (correo.length > 0 || avisarVacio)) {
    texto = correo.includes('@')
      ? 'Después del @ escribe el dominio, por ejemplo gmail.com.'
      : 'Falta el signo @. Ejemplo: nombre@gmail.com.';
  }
  nota.textContent = texto;
  nota.classList.toggle('hidden', !texto);
  return valido;
};

document.getElementById('email').addEventListener('input', () => revisarCorreo(false));

document.getElementById('form-olvide').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!revisarCorreo(true)) {
    return;
  }
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
