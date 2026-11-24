(function () {
  'use strict';
  const { api, toast, confirmar, cargando, escapar } = window.Navidad;

  const CLAVE_SESION = 'navidad_admin_pw';
  let password = sessionStorage.getItem(CLAVE_SESION) || '';
  let estado = null;

  const $ = function (id) { return document.getElementById(id); };
  const coloresAvatar = ['#b3202a', '#17573f', '#c9a24a', '#2e7d5b', '#7e141b', '#0f3d2e'];

  function llamar(accion, extra) {
    return api(accion, Object.assign({ password: password }, extra || {}));
  }

  /* ---------------- Login ---------------- */
  $('form-login').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = $('btn-login');
    const err = $('login-error');
    err.classList.add('oculto');
    password = $('password').value;
    cargando(btn, true, 'Verificando...');
    try {
      await llamar('adminLogin');
      sessionStorage.setItem(CLAVE_SESION, password);
      await entrar();
    } catch (ex) {
      err.innerHTML = '<span class="material-symbols-rounded">error</span><span>' + escapar(ex.message) + '</span>';
      err.classList.remove('oculto');
    } finally {
      cargando(btn, false);
    }
  });

  async function entrar() {
    await cargar();
    $('vista-login').classList.add('oculto');
    $('vista-panel').classList.remove('oculto');
  }

  $('btn-salir').addEventListener('click', function () {
    sessionStorage.removeItem(CLAVE_SESION);
    location.reload();
  });

  /* ---------------- Carga de datos ---------------- */
  async function cargar() {
    const r = await llamar('adminEstado');
    estado = r.data;
    pintar();
  }

  function pintar() {
    const cfg = estado.config;
    const lista = estado.participantes;
    const enviados = lista.filter(function (p) { return p.correoEnviado; }).length;

    $('stat-total').textContent = lista.length;
    $('stat-enviados').textContent = enviados;
    $('stat-cuota').textContent = estado.cuotaCorreos;

    // Estado del sorteo
    let html;
    if (cfg.sorteoRealizado) {
      const fecha = cfg.fechaSorteo ? new Date(cfg.fechaSorteo).toLocaleString('es-MX') : '';
      html = '<div class="aviso aviso-ok"><span class="material-symbols-rounded">verified</span><span>Sorteo realizado' +
        (fecha ? ' el ' + escapar(fecha) : '') + '. ' + enviados + ' de ' + lista.length + ' correos enviados.</span></div>';
    } else if (lista.length < 3) {
      html = '<div class="aviso aviso-info"><span class="material-symbols-rounded">hourglass_top</span><span>Esperando participantes. Se necesitan al menos 3 para hacer el sorteo.</span></div>';
    } else {
      html = '<div class="aviso aviso-info"><span class="material-symbols-rounded">info</span><span>Cuando todos estén registrados, presiona el botón para hacer el sorteo. Cada persona recibirá un correo con su amigo secreto.</span></div>';
    }
    $('estado-sorteo').innerHTML = html;

    $('btn-sortear').disabled = cfg.sorteoRealizado || lista.length < 3;
    $('btn-sortear').classList.toggle('oculto', cfg.sorteoRealizado);
    $('btn-reenviar-pendientes').classList.toggle('oculto', !(cfg.sorteoRealizado && enviados < lista.length));

    // Lista de nombres
    if (!lista.length) {
      $('lista').innerHTML = '<li class="vacio" style="display:block;border:none;background:none"><span class="material-symbols-rounded">inbox</span><p>Aún no hay nadie registrado. Comparte el enlace de registro con tus amigos.</p></li>';
    } else {
      $('lista').innerHTML = lista.map(function (p, i) {
        const inicial = escapar((p.nombre || '?').trim().charAt(0).toUpperCase());
        const color = coloresAvatar[i % coloresAvatar.length];
        let estadoHtml = '';
        if (cfg.sorteoRealizado) {
          estadoHtml = p.correoEnviado
            ? '<span class="estado estado-ok"><span class="material-symbols-rounded">mark_email_read</span>Enviado</span>'
            : '<span class="estado estado-pendiente"><span class="material-symbols-rounded">schedule_send</span>Pendiente</span>';
        }
        const accion = cfg.sorteoRealizado
          ? '<button class="btn btn-secundario btn-icono" title="Reenviar correo" data-reenviar="' + escapar(p.id) + '"><span class="material-symbols-rounded">forward_to_inbox</span></button>'
          : '<button class="btn btn-peligro btn-icono" title="Eliminar" data-eliminar="' + escapar(p.id) + '" data-nombre="' + escapar(p.nombre) + '"><span class="material-symbols-rounded">person_remove</span></button>';
        return '<li style="animation-delay:' + (i * 0.03) + 's">' +
          '<span class="avatar" style="background:' + color + '">' + inicial + '</span>' +
          '<span class="nombre">' + escapar(p.nombre) + '</span>' +
          estadoHtml + accion + '</li>';
      }).join('');
    }

    // Config
    $('cfg-nombre').value = cfg.nombreEvento || '';
    $('cfg-presupuesto').value = cfg.presupuesto || '';
    $('cfg-fecha').value = cfg.fechaEvento || '';
    $('cfg-lugar').value = cfg.lugar || '';
    $('cfg-abierto').checked = !!cfg.registroAbierto;
    $('cfg-abierto').disabled = !!cfg.sorteoRealizado;
  }

  /* ---------------- Acciones ---------------- */
  $('btn-refrescar').addEventListener('click', async function () {
    const btn = this;
    cargando(btn, true, 'Actualizando...');
    try { await cargar(); toast('Lista actualizada'); }
    catch (e) { toast(e.message, 'error'); }
    finally { cargando(btn, false); }
  });

  $('btn-sortear').addEventListener('click', async function () {
    const n = estado.participantes.length;
    const ok = await confirmar({
      icono: 'casino',
      titulo: 'Hacer el sorteo',
      mensaje: 'Se asignará un amigo secreto a cada uno de los ' + n + ' participantes y se enviarán los correos. El registro se cerrará. ¿Continuar?',
      aceptar: 'Sortear y enviar'
    });
    if (!ok) return;
    const btn = this;
    cargando(btn, true, 'Los duendes están sorteando...');
    try {
      const r = await llamar('adminSortear');
      toast('Sorteo listo. ' + r.enviados + ' correos enviados.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      cargando(btn, false);
      try { await cargar(); } catch (_) { /* ignorar */ }
    }
  });

  $('btn-reenviar-pendientes').addEventListener('click', async function () {
    const btn = this;
    cargando(btn, true, 'Enviando...');
    try {
      const r = await llamar('adminReenviar');
      toast(r.enviados + ' correos enviados.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      cargando(btn, false);
      try { await cargar(); } catch (_) { /* ignorar */ }
    }
  });

  $('lista').addEventListener('click', async function (e) {
    const btnEliminar = e.target.closest('[data-eliminar]');
    const btnReenviar = e.target.closest('[data-reenviar]');

    if (btnEliminar) {
      const ok = await confirmar({
        icono: 'person_remove',
        titulo: 'Eliminar participante',
        mensaje: '¿Quitar a ' + btnEliminar.dataset.nombre + ' del intercambio?',
        aceptar: 'Eliminar'
      });
      if (!ok) return;
      cargando(btnEliminar, true, '');
      try {
        await llamar('adminEliminar', { id: btnEliminar.dataset.eliminar });
        toast('Participante eliminado');
        await cargar();
      } catch (ex) {
        toast(ex.message, 'error');
        cargando(btnEliminar, false);
      }
    }

    if (btnReenviar) {
      const ok = await confirmar({
        icono: 'forward_to_inbox',
        titulo: 'Reenviar correo',
        mensaje: 'Se volverá a enviar el correo con su amigo secreto (el mismo de antes).',
        aceptar: 'Reenviar'
      });
      if (!ok) return;
      cargando(btnReenviar, true, '');
      try {
        await llamar('adminReenviar', { id: btnReenviar.dataset.reenviar });
        toast('Correo reenviado');
        await cargar();
      } catch (ex) {
        toast(ex.message, 'error');
        cargando(btnReenviar, false);
      }
    }
  });

  $('form-config').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = $('btn-guardar');
    cargando(btn, true, 'Guardando...');
    try {
      await llamar('adminGuardarConfig', {
        data: {
          nombreEvento: $('cfg-nombre').value,
          presupuesto: $('cfg-presupuesto').value,
          fechaEvento: $('cfg-fecha').value,
          lugar: $('cfg-lugar').value,
          registroAbierto: $('cfg-abierto').checked
        }
      });
      toast('Cambios guardados');
      await cargar();
    } catch (ex) {
      toast(ex.message, 'error');
    } finally {
      cargando(btn, false);
    }
  });

  $('btn-reiniciar').addEventListener('click', async function () {
    const ok = await confirmar({
      icono: 'restart_alt',
      titulo: 'Reiniciar sorteo',
      mensaje: 'Se borrarán las asignaciones actuales (los correos ya enviados no se pueden deshacer). Después podrás volver a sortear. Úsalo solo si algo salió mal.',
      aceptar: 'Reiniciar'
    });
    if (!ok) return;
    try { await llamar('adminReiniciarSorteo'); toast('Sorteo reiniciado'); await cargar(); }
    catch (ex) { toast(ex.message, 'error'); }
  });

  $('btn-borrar').addEventListener('click', async function () {
    const ok = await confirmar({
      icono: 'delete_forever',
      titulo: 'Borrar todo',
      mensaje: 'Se eliminarán TODOS los participantes y sus cartas. Esto no se puede deshacer.',
      aceptar: 'Borrar todo'
    });
    if (!ok) return;
    try { await llamar('adminBorrarTodo'); toast('Participantes eliminados'); await cargar(); }
    catch (ex) { toast(ex.message, 'error'); }
  });

  /* ---------------- Inicio ---------------- */
  if (password) {
    entrar().catch(function () {
      sessionStorage.removeItem(CLAVE_SESION);
      password = '';
    });
  }
})();
