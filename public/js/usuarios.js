(() => {
  if (!tokenDeSesion()) {
    window.location.replace('/login');
    return;
  }
  if (rolDeSesion() !== 'admin') {
    window.location.replace('/');
    return;
  }

  const PUESTOS = {
    admin: 'Administrador',
    despacho: 'Puerta',
    mantenimiento: 'Mantenimiento',
  };
  const COLORES_PUESTO = {
    admin: 'bg-slate-100 text-slate-700',
    despacho: 'bg-blue-50 text-blue-700',
    mantenimiento: 'bg-amber-50 text-amber-800',
  };

  let vista = 'personal';
  let equipo = [];
  let clientes = [];
  let cuentaEditando = null;

  const modal = document.getElementById('modal-cuenta');
  const notaPassword = document.getElementById('nota-password');
  const campoPassword = document.getElementById('cuenta-password');

  const inicialDe = (nombre) => {
    const letra = String(nombre || '').trim().charAt(0);
    return letra ? letra.toLocaleUpperCase('es') : '?';
  };

  const marcarVista = () => {
    document.querySelectorAll('#vistas [data-vista]').forEach((boton) => {
      const activo = boton.dataset.vista === vista;
      boton.setAttribute('aria-selected', activo ? 'true' : 'false');
      boton.className = activo
        ? 'h-10 rounded-full bg-blue-950 px-4 text-sm font-semibold text-white'
        : 'h-10 rounded-full bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50';
    });
    const esPersonal = vista === 'personal';
    document.getElementById('panel-personal').classList.toggle('hidden', !esPersonal);
    document.getElementById('panel-clientes').classList.toggle('hidden', esPersonal);
    document.getElementById('filtro-puesto').classList.toggle('hidden', !esPersonal);
    document.getElementById('btn-nueva-cuenta').classList.toggle('hidden', !esPersonal);
    document.getElementById('descripcion').textContent = esPersonal
      ? 'Cuentas de puerta y de mantenimiento. El administrador se ve, pero no se modifica aquí.'
      : 'Personas que crearon su cuenta. Aquí solo se consultan.';
    document.getElementById('buscar-usuarios').placeholder = esPersonal
      ? 'Nombre, correo o puesto'
      : 'Nombre o correo';
  };

  const abrirModal = () => {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('cuenta-nombre').focus();
  };

  const cerrarModal = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    cuentaEditando = null;
    document.getElementById('form-cuenta').reset();
    document.getElementById('cuenta-rol').value = 'despacho';
    notaPassword.classList.add('hidden');
    campoPassword.required = true;
    document.getElementById('btn-guardar-cuenta').textContent = 'Crear cuenta';
    document.getElementById('titulo-modal-cuenta').textContent = 'Nueva cuenta';
  };

  const textoEquipo = (cuenta) => sinAcentos(`${cuenta.nombre} ${cuenta.email} ${PUESTOS[cuenta.rol] || ''}`);

  const equipoVisible = () => {
    const consulta = sinAcentos(document.getElementById('buscar-usuarios').value.trim());
    const puesto = document.getElementById('filtro-puesto').value;
    return equipo.filter((cuenta) => {
      if (puesto && cuenta.rol !== puesto) {
        return false;
      }
      return !consulta || textoEquipo(cuenta).includes(consulta);
    });
  };

  const clientesVisibles = () => {
    const consulta = sinAcentos(document.getElementById('buscar-usuarios').value.trim());
    return clientes.filter((cuenta) => {
      if (!consulta) {
        return true;
      }
      return sinAcentos(`${cuenta.nombre} ${cuenta.email}`).includes(consulta);
    });
  };

  const pintarConteo = (visibles, total, etiqueta) => {
    const nota = document.getElementById('conteo-usuarios');
    const consulta = document.getElementById('buscar-usuarios').value.trim();
    const puesto = vista === 'personal' ? document.getElementById('filtro-puesto').value : '';
    const filtrando = Boolean(consulta || puesto);
    nota.textContent = filtrando ? `${visibles} de ${total} ${etiqueta}` : '';
    nota.classList.toggle('hidden', !filtrando);
  };

  const pintarEquipo = () => {
    const visibles = equipoVisible();
    const cuerpo = document.getElementById('lista-personal');
    pintarConteo(visibles.length, equipo.length, 'cuentas');
    if (visibles.length === 0) {
      const mensaje = equipo.length === 0
        ? 'Todavía no hay cuentas de personal.'
        : 'No hay cuentas con ese dato.';
      cuerpo.innerHTML = `<tr><td colspan="4" class="px-5 py-8 text-center text-sm text-slate-500">${mensaje}</td></tr>`;
      return;
    }
    cuerpo.innerHTML = visibles.map((cuenta) => {
      const editable = cuenta.rol !== 'admin';
      const acciones = editable
        ? `<button type="button" data-accion="editar" data-cuenta-id="${Number(cuenta.id)}" class="rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50">Editar</button>
           <button type="button" data-accion="eliminar" data-cuenta-id="${Number(cuenta.id)}" data-nombre="${escapar(cuenta.nombre)}" data-rol="${escapar(cuenta.rol)}" class="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Eliminar</button>`
        : '<span class="text-xs text-slate-400">No se modifica aquí</span>';
      return `
        <tr class="hover:bg-slate-50">
          <td class="px-5 py-4">
            <div class="flex items-center gap-3">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">${escapar(inicialDe(cuenta.nombre))}</span>
              <span class="font-medium text-slate-900">${escapar(cuenta.nombre)}</span>
            </div>
          </td>
          <td class="px-5 py-4">${escapar(cuenta.email)}</td>
          <td class="px-5 py-4"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${COLORES_PUESTO[cuenta.rol] || 'bg-slate-100 text-slate-700'}">${escapar(PUESTOS[cuenta.rol] || cuenta.rol)}</span></td>
          <td class="px-5 py-4"><div class="flex items-center gap-2">${acciones}</div></td>
        </tr>`;
    }).join('');
  };

  const pintarClientes = () => {
    const visibles = clientesVisibles();
    const cuerpo = document.getElementById('lista-clientes');
    pintarConteo(visibles.length, clientes.length, 'clientes');
    if (visibles.length === 0) {
      const mensaje = clientes.length === 0
        ? 'Todavía no hay clientes registrados.'
        : 'No hay clientes con ese dato.';
      cuerpo.innerHTML = `<tr><td colspan="5" class="px-5 py-8 text-center text-sm text-slate-500">${mensaje}</td></tr>`;
      return;
    }
    cuerpo.innerHTML = visibles.map((cuenta) => `
      <tr class="hover:bg-slate-50">
        <td class="px-5 py-4">
          <div class="flex items-center gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">${escapar(inicialDe(cuenta.nombre))}</span>
            <span class="font-medium text-slate-900">${escapar(cuenta.nombre)}</span>
          </div>
        </td>
        <td class="px-5 py-4">${escapar(cuenta.email)}</td>
        <td class="px-5 py-4"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cuenta.email_verificado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}">${cuenta.email_verificado ? 'Sí' : 'No'}</span></td>
        <td class="px-5 py-4">${escapar(quetzales(cuenta.saldo))}</td>
        <td class="px-5 py-4">${Number(cuenta.reservas) || 0}</td>
      </tr>
    `).join('');
  };

  const pintar = () => {
    if (vista === 'personal') {
      pintarEquipo();
    } else {
      pintarClientes();
    }
  };

  const cargar = async () => {
    const ruta = vista === 'personal' ? '/api/personal/equipo' : '/api/personal/clientes';
    const respuesta = await fetch(ruta, { headers: autorizacion() });
    if (await cerrarSiSesionRechazada(respuesta, '/usuarios')) {
      return;
    }
    const data = await respuesta.json().catch(() => []);
    if (!respuesta.ok) {
      throw new Error(data.mensaje || 'No se pudo cargar.');
    }
    if (vista === 'personal') {
      equipo = Array.isArray(data) ? data : [];
    } else {
      clientes = Array.isArray(data) ? data : [];
    }
    pintar();
  };

  const destinoDe = (rol) => (rol === 'mantenimiento' ? 'Asientos' : 'Abordaje');

  document.getElementById('vistas').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-vista]');
    if (!boton || boton.dataset.vista === vista) {
      return;
    }
    vista = boton.dataset.vista;
    document.getElementById('buscar-usuarios').value = '';
    document.getElementById('filtro-puesto').value = '';
    marcarVista();
    const lista = vista === 'personal' ? equipo : clientes;
    if (lista.length === 0) {
      cargar().catch(() => {
        const cuerpo = document.getElementById(vista === 'personal' ? 'lista-personal' : 'lista-clientes');
        cuerpo.innerHTML = '<tr><td colspan="5" class="px-5 py-8 text-center text-sm text-red-600">No se pudo cargar la lista.</td></tr>';
      });
      return;
    }
    pintar();
  });

  document.getElementById('buscar-usuarios').addEventListener('input', pintar);
  document.getElementById('filtro-puesto').addEventListener('change', pintar);

  document.getElementById('btn-nueva-cuenta').addEventListener('click', () => {
    cerrarModal();
    abrirModal();
  });
  document.getElementById('btn-cancelar-cuenta').addEventListener('click', cerrarModal);
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) {
      cerrarModal();
    }
  });

  document.getElementById('form-cuenta').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const boton = document.getElementById('btn-guardar-cuenta');
    const nombre = document.getElementById('cuenta-nombre').value.trim();
    const email = document.getElementById('cuenta-email').value.trim();
    const rol = document.getElementById('cuenta-rol').value;
    const password = campoPassword.value;
    const editando = Boolean(cuentaEditando);
    boton.disabled = true;
    boton.textContent = editando ? 'Guardando…' : 'Creando…';
    try {
      const respuesta = await fetch(editando ? `/api/personal/equipo/${cuentaEditando.id}` : '/api/personal/equipo', {
        method: editando ? 'PUT' : 'POST',
        headers: { ...autorizacion(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, rol }),
      });
      const data = await respuesta.json().catch(() => ({}));
      if (await cerrarSiSesionRechazada(respuesta, '/usuarios')) {
        return;
      }
      if (!respuesta.ok) {
        Swal.fire({ icon: 'warning', title: editando ? 'No se pudo guardar' : 'No se pudo crear', text: data.mensaje || 'Intenta de nuevo.' });
        return;
      }
      cerrarModal();
      await cargar();
      Swal.fire({
        icon: 'success',
        title: editando ? 'Cuenta actualizada' : 'Cuenta lista',
        text: editando
          ? 'Los datos de la cuenta quedaron guardados.'
          : `Ya puede entrar en ${destinoDe(rol)} con ese correo y esa contraseña.`,
        confirmButtonText: 'Listo',
      });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: 'Intenta de nuevo.' });
    } finally {
      boton.disabled = false;
      if (!modal.classList.contains('hidden')) {
        boton.textContent = cuentaEditando ? 'Guardar cambios' : 'Crear cuenta';
      }
    }
  });

  document.getElementById('lista-personal').addEventListener('click', async (evento) => {
    const boton = evento.target.closest('[data-accion]');
    if (!boton) {
      return;
    }
    const cuenta = equipo.find((item) => item.id === Number(boton.dataset.cuentaId));
    if (!cuenta || cuenta.rol === 'admin') {
      return;
    }
    if (boton.dataset.accion === 'editar') {
      cuentaEditando = cuenta;
      document.getElementById('titulo-modal-cuenta').textContent = 'Editar cuenta';
      document.getElementById('cuenta-nombre').value = cuenta.nombre || '';
      document.getElementById('cuenta-email').value = cuenta.email || '';
      document.getElementById('cuenta-rol').value = cuenta.rol === 'mantenimiento' ? 'mantenimiento' : 'despacho';
      campoPassword.value = '';
      campoPassword.required = false;
      notaPassword.classList.remove('hidden');
      document.getElementById('btn-guardar-cuenta').textContent = 'Guardar cambios';
      abrirModal();
      return;
    }
    const resultado = await Swal.fire({
      title: '¿Eliminar esta cuenta?',
      text: `${cuenta.nombre || 'Esta persona'} ya no podrá entrar a ${destinoDe(cuenta.rol)}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!resultado.isConfirmed) {
      return;
    }
    try {
      const respuesta = await fetch(`/api/personal/equipo/${cuenta.id}`, {
        method: 'DELETE',
        headers: autorizacion(),
      });
      const data = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: data.mensaje || 'Intenta de nuevo.' });
        return;
      }
      await cargar();
      mostrarExito('Cuenta eliminada');
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: 'Intenta de nuevo.' });
    }
  });

  marcarVista();
  cargar().catch(() => {
    document.getElementById('lista-personal').innerHTML = '<tr><td colspan="4" class="px-5 py-8 text-center text-sm text-red-600">No se pudieron cargar las cuentas.</td></tr>';
  });
})();
