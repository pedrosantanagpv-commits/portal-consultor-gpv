const API_URL = '/api/proxy';

let usuarioLogado = null;
let usuariosCache = [];
let cooperativasCache = [];

document.addEventListener('DOMContentLoaded', () => {
  const usuarioSalvo = localStorage.getItem('usuarioLogado');

  if (usuarioSalvo) {
    usuarioLogado = JSON.parse(usuarioSalvo);
    abrirSistema();
  } else {
    mostrarLogin();
  }
});

function mostrarLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appPage').style.display = 'none';
}

function abrirSistema() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appPage').style.display = 'flex';

  document.getElementById('usuarioTopo').innerText =
    `${usuarioLogado.nome} | ${usuarioLogado.perfil}`;

  carregarDashboard();
  carregarCooperativas();
  carregarPalavraChave();
}

async function apiPost(payload) {
  const resposta = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return await resposta.json();
}

/* LOGIN */

async function fazerLogin(event) {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();

  if (!email || !senha) {
    alert('Preencha e-mail e senha.');
    return;
  }

  try {

    const resultado = await apiPost({
      action: 'login',
      email,
      senha
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao fazer login.');
      return;
    }

    usuarioLogado = resultado.usuario;

    localStorage.setItem(
      'usuarioLogado',
      JSON.stringify(usuarioLogado)
    );

    abrirSistema();

  } catch (erro) {

    console.error(erro);
    alert('Erro de comunicação com o servidor.');

  }
}

function sair() {
  localStorage.removeItem('usuarioLogado');
  usuarioLogado = null;
  mostrarLogin();
}

/* NAVEGAÇÃO */

function mostrarAba(aba) {

  document.querySelectorAll('.section').forEach(secao => {
    secao.style.display = 'none';
  });

  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });

  const secao = document.getElementById(`secao-${aba}`);

  if (secao) {
    secao.style.display = 'block';
  }

  const menu = document.querySelector(`[data-aba="${aba}"]`);

  if (menu) {
    menu.classList.add('active');
  }

  if (aba === 'inicio') {
    carregarDashboard();
  }

  if (aba === 'usuarios') {
    carregarUsuarios();
    carregarCooperativas();
  }

  if (aba === 'cooperativas') {
    carregarCooperativas();
  }

  if (aba === 'central') {
    carregarPalavraChave();
  }
}

/* DASHBOARD */

async function carregarDashboard() {

  try {

    const resultado = await apiPost({
      action: 'dashboard'
    });

    if (!resultado.success) {
      console.warn(resultado.message);
      return;
    }

    const dados = resultado.dashboard;

    setTexto('dashUsuarios', dados.totalUsuarios || 0);
    setTexto('dashAtivos', dados.usuariosAtivos || 0);
    setTexto('dashConsultores', dados.consultores || 0);
    setTexto('dashRegionais', dados.regionais || 0);
    setTexto('dashCooperativas', dados.cooperativas || 0);

  } catch (erro) {

    console.error('Erro dashboard:', erro);

  }
}

/* USUÁRIOS */

async function carregarUsuarios() {

  try {

    const resultado = await apiPost({
      action: 'listarUsuarios'
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao listar usuários.');
      return;
    }

    usuariosCache = resultado.usuarios || [];

    renderizarUsuarios(usuariosCache);
    atualizarMiniDashboardUsuarios(usuariosCache);

  } catch (erro) {

    console.error(erro);
    alert('Erro ao carregar usuários.');

  }
}

function renderizarUsuarios(lista) {

  const tbody = document.getElementById('tabelaUsuariosBody');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!lista.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-table">
          Nenhum usuário encontrado.
        </td>
      </tr>
    `;

    return;
  }

  lista.forEach(usuario => {

    const tr = document.createElement('tr');

    const statusTexto = String(usuario.status || '').toUpperCase();

    const statusClass = statusTexto === 'ATIVO'
      ? 'status ativo'
      : 'status inativo';

    const cooperativaTexto = obterNomeCooperativa(
      usuario.cooperativa_id
    );

    tr.innerHTML = `
      <td>
        <strong>${usuario.nome || '-'}</strong>
        <small>${usuario.id || ''}</small>
      </td>

      <td>${usuario.email || '-'}</td>

      <td>
        <span class="tag">
          ${usuario.perfil || '-'}
        </span>
      </td>

      <td>${cooperativaTexto || '-'}</td>

      <td>
        <span class="${statusClass}">
          ${usuario.status || '-'}
        </span>
      </td>

      <td class="acoes">

        <button onclick="abrirModalEditarUsuario('${usuario.id}')">
          Editar
        </button>

        <button onclick="alterarStatusUsuario('${usuario.id}')">
          ${statusTexto === 'ATIVO' ? 'Inativar' : 'Ativar'}
        </button>

        <button
          class="danger"
          onclick="confirmarExclusaoUsuario('${usuario.id}', '${usuario.nome || ''}')"
        >
          Excluir
        </button>

      </td>
    `;

    tbody.appendChild(tr);

  });
}

function atualizarMiniDashboardUsuarios(lista) {

  const total = lista.length;

  const ativos = lista.filter(u =>
    String(u.status || '').toUpperCase() === 'ATIVO'
  ).length;

  const inativos = lista.filter(u =>
    String(u.status || '').toUpperCase() === 'INATIVO'
  ).length;

  const admins = lista.filter(u => {

    const perfil = String(u.perfil || '').toUpperCase();

    return (
      perfil === 'SUPER_ADMIN' ||
      perfil === 'ADMINISTRATIVO'
    );

  }).length;

  const regionais = lista.filter(u =>
    String(u.perfil || '').toUpperCase() === 'REGIONAL'
  ).length;

  const consultores = lista.filter(u =>
    String(u.perfil || '').toUpperCase() === 'CONSULTOR'
  ).length;

  setTexto('miniTotalUsuarios', total);
  setTexto('miniUsuariosAtivos', ativos);
  setTexto('miniUsuariosInativos', inativos);
  setTexto('miniAdmins', admins);
  setTexto('miniRegionais', regionais);
  setTexto('miniConsultores', consultores);
}

function filtrarUsuarios() {

  const busca = document.getElementById('buscaUsuario')?.value.toLowerCase() || '';

  const filtroStatus =
    document.getElementById('filtroStatusUsuario')?.value || '';

  const filtroPerfil =
    document.getElementById('filtroPerfilUsuario')?.value || '';

  let lista = [...usuariosCache];

  if (busca) {

    lista = lista.filter(usuario => {

      const nome = String(usuario.nome || '').toLowerCase();

      const email = String(usuario.email || '').toLowerCase();

      const coopId = String(usuario.cooperativa_id || '').toLowerCase();

      const coopNome = String(
        obterNomeCooperativa(usuario.cooperativa_id) || ''
      ).toLowerCase();

      return (
        nome.includes(busca) ||
        email.includes(busca) ||
        coopId.includes(busca) ||
        coopNome.includes(busca)
      );

    });
  }

  if (filtroStatus) {

    lista = lista.filter(usuario =>
      String(usuario.status || '').toUpperCase() === filtroStatus
    );

  }

  if (filtroPerfil) {

    lista = lista.filter(usuario =>
      String(usuario.perfil || '').toUpperCase() === filtroPerfil
    );

  }

  renderizarUsuarios(lista);
}

/* MODAL USUÁRIO */

function abrirModalNovoUsuario() {

  document.getElementById('modalUsuarioTitulo').innerText =
    'Novo Usuário';

  document.getElementById('usuarioId').value = '';
  document.getElementById('usuarioNome').value = '';
  document.getElementById('usuarioEmail').value = '';
  document.getElementById('usuarioSenha').value = '';
  document.getElementById('usuarioPerfil').value = 'CONSULTOR';
  document.getElementById('usuarioCooperativa').value = '';
  document.getElementById('usuarioPermissoes').value = '';
  document.getElementById('usuarioStatus').value = 'ATIVO';

  preencherSelectCooperativas();

  abrirModal('modalUsuario');
}

function abrirModalEditarUsuario(id) {

  const usuario = usuariosCache.find(
    u => String(u.id) === String(id)
  );

  if (!usuario) {
    alert('Usuário não encontrado.');
    return;
  }

  document.getElementById('modalUsuarioTitulo').innerText =
    'Editar Usuário';

  document.getElementById('usuarioId').value =
    usuario.id || '';

  document.getElementById('usuarioNome').value =
    usuario.nome || '';

  document.getElementById('usuarioEmail').value =
    usuario.email || '';

  document.getElementById('usuarioSenha').value = '';

  document.getElementById('usuarioPerfil').value =
    usuario.perfil || 'CONSULTOR';

  document.getElementById('usuarioCooperativa').value =
    usuario.cooperativa_id || '';

  document.getElementById('usuarioPermissoes').value =
    usuario.permissoes || '';

  document.getElementById('usuarioStatus').value =
    usuario.status || 'ATIVO';

  preencherSelectCooperativas(usuario.cooperativa_id);

  abrirModal('modalUsuario');
}

async function salvarUsuario(event) {

  event.preventDefault();

  const id = document.getElementById('usuarioId').value.trim();

  const payload = {
    action: id ? 'editarUsuario' : 'salvarUsuario',
    id,
    nome: document.getElementById('usuarioNome').value.trim(),
    email: document.getElementById('usuarioEmail').value.trim(),
    senha: document.getElementById('usuarioSenha').value.trim(),
    perfil: document.getElementById('usuarioPerfil').value,
    cooperativa_id: document.getElementById('usuarioCooperativa').value,
    permissoes: document.getElementById('usuarioPermissoes').value.trim(),
    status: document.getElementById('usuarioStatus').value
  };

  if (!payload.nome || !payload.email || !payload.perfil) {
    alert('Preencha nome, e-mail e perfil.');
    return;
  }

  try {

    const resultado = await apiPost(payload);

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao salvar usuário.');
      return;
    }

    alert(resultado.message || 'Usuário salvo com sucesso.');

    fecharModal('modalUsuario');

    carregarUsuarios();
    carregarDashboard();

  } catch (erro) {

    console.error(erro);
    alert('Erro ao salvar usuário.');

  }
}

async function alterarStatusUsuario(id) {

  try {

    const resultado = await apiPost({
      action: 'alterarStatusUsuario',
      id
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao alterar status.');
      return;
    }

    carregarUsuarios();
    carregarDashboard();

  } catch (erro) {

    console.error(erro);
    alert('Erro ao alterar status.');

  }
}

function confirmarExclusaoUsuario(id, nome) {

  const confirmar = confirm(
    `Tem certeza que deseja excluir o usuário "${nome}"?\n\nEssa ação não poderá ser desfeita.`
  );

  if (!confirmar) return;

  excluirUsuario(id);
}

async function excluirUsuario(id) {

  try {

    const resultado = await apiPost({
      action: 'excluirUsuario',
      id
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao excluir usuário.');
      return;
    }

    alert(resultado.message || 'Usuário excluído com sucesso.');

    carregarUsuarios();
    carregarDashboard();

  } catch (erro) {

    console.error(erro);
    alert('Erro ao excluir usuário.');

  }
}

/* COOPERATIVAS */

async function carregarCooperativas() {

  try {

    const resultado = await apiPost({
      action: 'listarCooperativas'
    });

    if (!resultado.success) {
      console.warn(resultado.message || 'Erro ao listar cooperativas.');
      return;
    }

    cooperativasCache = resultado.cooperativas || [];

    renderizarCooperativas(cooperativasCache);
    preencherSelectCooperativas();

  } catch (erro) {

    console.error('Erro cooperativas:', erro);

  }
}

function renderizarCooperativas(lista) {

  const tbody = document.getElementById('tabelaCooperativasBody');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!lista.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-table">
          Nenhuma cooperativa encontrada.
        </td>
      </tr>
    `;

    return;
  }

  lista.forEach(coop => {

    const tr = document.createElement('tr');

    const statusTexto =
      String(coop.status || '').toUpperCase();

    const statusClass =
      statusTexto === 'ATIVA' || statusTexto === 'ATIVO'
        ? 'status ativo'
        : 'status inativo';

    tr.innerHTML = `
      <td>
        <strong>${coop.nome_cooperativa || coop.nome || '-'}</strong>
        <small>${coop.id || ''}</small>
      </td>

      <td>${coop.regional_responsavel || '-'}</td>

      <td>${coop.cidade || '-'}</td>

      <td>
        <span class="${statusClass}">
          ${coop.status || '-'}
        </span>
      </td>

      <td class="acoes">
        <button disabled>Editar</button>
      </td>
    `;

    tbody.appendChild(tr);

  });
}

function abrirModalNovaCooperativa() {

  document.getElementById('coopNome').value = '';
  document.getElementById('coopRegional').value = '';
  document.getElementById('coopCidade').value = '';
  document.getElementById('coopStatus').value = 'ATIVA';

  abrirModal('modalCooperativa');
}

async function salvarCooperativa(event) {

  event.preventDefault();

  const payload = {
    action: 'criarCooperativa',
    nome_cooperativa: document.getElementById('coopNome').value.trim(),
    regional_responsavel: document.getElementById('coopRegional').value.trim(),
    cidade: document.getElementById('coopCidade').value.trim(),
    status: document.getElementById('coopStatus').value
  };

  if (
    !payload.nome_cooperativa ||
    !payload.regional_responsavel ||
    !payload.cidade
  ) {
    alert(
      'Preencha nome da cooperativa, regional responsável e cidade.'
    );
    return;
  }

  try {

    const resultado = await apiPost(payload);

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao salvar cooperativa.');
      return;
    }

    alert(resultado.message || 'Cooperativa cadastrada com sucesso.');

    fecharModal('modalCooperativa');

    carregarCooperativas();
    carregarDashboard();

  } catch (erro) {

    console.error(erro);
    alert('Erro ao salvar cooperativa.');

  }
}

function preencherSelectCooperativas(valorSelecionado = '') {

  const select = document.getElementById('usuarioCooperativa');

  if (!select) return;

  select.innerHTML =
    '<option value="">Selecione uma cooperativa</option>';

  cooperativasCache.forEach(coop => {

    const option = document.createElement('option');

    option.value = coop.id;

    option.textContent =
      coop.nome_cooperativa || coop.nome || coop.id;

    if (String(coop.id) === String(valorSelecionado)) {
      option.selected = true;
    }

    select.appendChild(option);

  });
}

function obterNomeCooperativa(cooperativaId) {

  if (!cooperativaId) return '-';

  const valor = String(cooperativaId).trim();

  if (
    valor.toUpperCase() === 'TODAS' ||
    valor.toLowerCase() === 'todas'
  ) {
    return 'Todas';
  }

  const coop = cooperativasCache.find(c =>
    String(c.id) === valor ||
    String(c.nome_cooperativa || '').toLowerCase() === valor.toLowerCase()
  );

  return coop
    ? (coop.nome_cooperativa || coop.nome)
    : valor;
}

/* CENTRAL DO CONSULTOR */

async function carregarPalavraChave() {

  try {

    const resultado = await apiPost({
      action: 'buscarPalavraChave'
    });

    if (!resultado.success) {
      return;
    }

    setTexto(
      'palavraChaveDia',
      resultado.palavra || '---'
    );

  } catch (erro) {

    console.error('Erro palavra-chave:', erro);

  }
}

/* MODAIS */

function abrirModal(id) {

  const modal = document.getElementById(id);

  if (modal) {
    modal.style.display = 'flex';
  }
}

function fecharModal(id) {

  const modal = document.getElementById(id);

  if (modal) {
    modal.style.display = 'none';
  }
}

/* AUXILIARES */

function setTexto(id, valor) {

  const el = document.getElementById(id);

  if (el) {
    el.innerText = valor;
  }
}
