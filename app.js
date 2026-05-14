/* =========================
   CONFIG
========================= */

const API_URL = '/api/proxy';

let usuarioLogado = null;
let usuariosCache = [];
let cooperativasCache = [];
let consultoresCache = [];
let conteudosCache = [];
let bibliotecaConteudosAtual = [];

const LINK_CONTRATO_ZAPSIGN =
  'https://app.zapsign.com.br/verificar/doc/4c07c73c-9cbf-4498-89f1-27f95098ac60';

/* =========================
   INIT
========================= */

document.addEventListener('DOMContentLoaded', () => {
  const usuarioSalvo = localStorage.getItem('usuarioLogado');

  criarModalConteudoDinamico();

  if (usuarioSalvo) {
    usuarioLogado = JSON.parse(usuarioSalvo);
    abrirSistema();
  } else {
    mostrarLogin();
  }
});

/* =========================
   UI BASE
========================= */

function mostrarLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appPage').style.display = 'none';
}

function abrirSistema() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appPage').style.display = 'flex';

  document.getElementById('usuarioTopo').innerText =
    `${usuarioLogado.nome} | ${usuarioLogado.perfil}`;

  aplicarPermissoesVisuais();

  carregarDashboard();
  carregarCooperativas();
  carregarPalavraChave();
  carregarConteudosGerais();
}

/* =========================
   API
========================= */

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

/* =========================
   LOGIN
========================= */

async function fazerLogin(event) {
  event.preventDefault();

  const form = event.target;
  const botaoEntrar = form.querySelector('button[type="submit"]');

  const textoOriginalBotao = botaoEntrar.innerHTML;

  botaoEntrar.disabled = true;
  botaoEntrar.classList.add('btn-login-loading');
  botaoEntrar.innerHTML = `
    <span class="login-spinner"></span>
    Entrando...
  `;

  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();

  if (!email || !senha) {
    alert('Preencha e-mail e senha.');

    botaoEntrar.disabled = false;
    botaoEntrar.classList.remove('btn-login-loading');
    botaoEntrar.innerHTML = textoOriginalBotao;

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

      botaoEntrar.disabled = false;
      botaoEntrar.classList.remove('btn-login-loading');
      botaoEntrar.innerHTML = textoOriginalBotao;

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
    alert('Erro ao realizar login.');

    botaoEntrar.disabled = false;
    botaoEntrar.classList.remove('btn-login-loading');
    botaoEntrar.innerHTML = textoOriginalBotao;
  }
 }  
function sair() {
  localStorage.removeItem('usuarioLogado');
  usuarioLogado = null;
  mostrarLogin();
}

/* =========================
   PERMISSÕES / HIERARQUIA
========================= */

function aplicarPermissoesVisuais() {
  const perfil = String(usuarioLogado?.perfil || '').toUpperCase();

  const btnCadastro = document.getElementById('btnCadastroConsultor');
  const menuProcessos = document.querySelector('[data-aba="processos"]');
  const menuUsuarios = document.querySelector('[data-aba="usuarios"]');
  const menuCooperativas = document.querySelector('[data-aba="cooperativas"]');

  if (perfil === 'CONSULTOR') {
    if (btnCadastro) btnCadastro.style.display = 'none';
    if (menuProcessos) menuProcessos.style.display = 'none';
    if (menuUsuarios) menuUsuarios.style.display = 'none';
    if (menuCooperativas) menuCooperativas.style.display = 'none';
    return;
  }

  if (perfil === 'REGIONAL') {
    if (menuUsuarios) menuUsuarios.style.display = 'none';
    if (menuCooperativas) menuCooperativas.style.display = 'none';
  }

  if (btnCadastro) {
    btnCadastro.style.display = 'block';
    btnCadastro.innerText = 'Solicitar Cadastro de Consultor';
  }

  if (menuProcessos) {
    menuProcessos.style.display = 'block';
  }
}

function usuarioEhSuperAdmin() {
  const perfil = String(usuarioLogado?.perfil || '').toUpperCase();
  return perfil === 'SUPER_ADMIN';
}

function usuarioEhAdmin() {
  const perfil = String(usuarioLogado?.perfil || '').toUpperCase();

  return (
    perfil === 'SUPER_ADMIN' ||
    perfil === 'ADMINISTRATIVO'
  );
}

function usuarioEhAdministrativo() {
  const perfil = String(usuarioLogado?.perfil || '').toUpperCase();
  return perfil === 'ADMINISTRATIVO';
}

function usuarioEhRegional() {
  const perfil = String(usuarioLogado?.perfil || '').toUpperCase();
  return perfil === 'REGIONAL';
}

function podeSolicitarCadastroConsultor() {
  const perfil = String(usuarioLogado?.perfil || '').toUpperCase();

  return (
    perfil === 'SUPER_ADMIN' ||
    perfil === 'ADMINISTRATIVO' ||
    perfil === 'REGIONAL'
  );
}

function podeGerenciarUsuarios() {
  return usuarioEhSuperAdmin() || usuarioEhAdministrativo();
}

function mesmoUsuario(id) {
  return String(usuarioLogado?.id || '') === String(id || '');
}

function podeEditarUsuarioAlvo(usuarioAlvo) {
  const perfilLogado = String(usuarioLogado?.perfil || '').toUpperCase();
  const perfilAlvo = String(usuarioAlvo?.perfil || '').toUpperCase();

  if (!podeGerenciarUsuarios()) return false;

  if (perfilLogado === 'SUPER_ADMIN') return true;

  if (perfilLogado === 'ADMINISTRATIVO') {
    if (perfilAlvo === 'SUPER_ADMIN') return false;
    return true;
  }

  return false;
}

function podeAlterarStatusUsuarioAlvo(usuarioAlvo) {
  const perfilLogado = String(usuarioLogado?.perfil || '').toUpperCase();
  const perfilAlvo = String(usuarioAlvo?.perfil || '').toUpperCase();

  if (!podeGerenciarUsuarios()) return false;
  if (mesmoUsuario(usuarioAlvo?.id)) return false;

  if (perfilLogado === 'SUPER_ADMIN') return true;

  if (perfilLogado === 'ADMINISTRATIVO') {
    if (perfilAlvo === 'SUPER_ADMIN') return false;
    return true;
  }

  return false;
}

function podeExcluirUsuarioAlvo(usuarioAlvo) {
  const perfilLogado = String(usuarioLogado?.perfil || '').toUpperCase();
  const perfilAlvo = String(usuarioAlvo?.perfil || '').toUpperCase();

  if (!podeGerenciarUsuarios()) return false;
  if (mesmoUsuario(usuarioAlvo?.id)) return false;

  if (perfilLogado === 'SUPER_ADMIN') return true;

  if (perfilLogado === 'ADMINISTRATIVO') {
    if (perfilAlvo === 'SUPER_ADMIN') return false;
    if (perfilAlvo === 'ADMINISTRATIVO') return false;
    return true;
  }

  return false;
}

function podeCriarPerfil(perfilNovo) {
  const perfilLogado = String(usuarioLogado?.perfil || '').toUpperCase();
  const perfil = String(perfilNovo || '').toUpperCase();

  if (perfilLogado === 'SUPER_ADMIN') return true;

  if (perfilLogado === 'ADMINISTRATIVO') {
    if (perfil === 'SUPER_ADMIN') return false;
    return true;
  }

  return false;
}

function obterMensagemProtecaoUsuario(usuarioAlvo) {
  const perfilLogado = String(usuarioLogado?.perfil || '').toUpperCase();
  const perfilAlvo = String(usuarioAlvo?.perfil || '').toUpperCase();

  if (perfilLogado === 'SUPER_ADMIN') return '';

  if (perfilLogado === 'ADMINISTRATIVO' && perfilAlvo === 'SUPER_ADMIN') {
    return 'Usuário protegido';
  }

  if (perfilLogado === 'ADMINISTRATIVO' && mesmoUsuario(usuarioAlvo?.id)) {
    return 'Seu usuário';
  }

  if (perfilLogado === 'ADMINISTRATIVO' && perfilAlvo === 'ADMINISTRATIVO') {
    return 'Administrativo';
  }

  return '';
}

function ajustarOpcoesPerfilUsuario(perfilAtual = '') {
  const select = document.getElementById('usuarioPerfil');
  if (!select) return;

  Array.from(select.options).forEach(option => {
    option.disabled = false;

    if (usuarioEhAdministrativo() && option.value === 'SUPER_ADMIN') {
      option.disabled = true;
    }
  });

  if (usuarioEhAdministrativo() && select.value === 'SUPER_ADMIN') {
    select.value = perfilAtual && perfilAtual !== 'SUPER_ADMIN'
      ? perfilAtual
      : 'CONSULTOR';
  }
}

/* =========================
   MENU
========================= */

function mostrarAba(aba) {
  if (aba === 'usuarios' && !podeGerenciarUsuarios()) {
    alert('Você não tem permissão para acessar usuários.');
    return;
  }

  if (aba === 'cooperativas' && !podeGerenciarUsuarios()) {
    alert('Você não tem permissão para acessar cooperativas.');
    return;
  }

  document.querySelectorAll('.section').forEach(secao => {
    secao.style.display = 'none';
  });

  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });

  const secao = document.getElementById(`secao-${aba}`);
  if (secao) secao.style.display = 'block';

  const menu = document.querySelector(`[data-aba="${aba}"]`);
  if (menu) menu.classList.add('active');

  if (aba === 'inicio') carregarDashboard();

  if (aba === 'usuarios') {
    carregarUsuarios();
    carregarCooperativas();
  }

  if (aba === 'cooperativas') carregarCooperativas();

  if (aba === 'central') {
    carregarPalavraChave();
    carregarConteudosGerais();
  }

  if (aba === 'processos') carregarConsultores();
}

/* =========================
   DASHBOARD
========================= */

async function carregarDashboard() {
  try {
    const resultado = await apiPost({
      action: 'dashboard'
    });

    if (!resultado.success) return;

    const dados = resultado.dashboard;

    setTexto('dashUsuarios', dados.totalUsuarios || 0);
    setTexto('dashAtivos', dados.usuariosAtivos || 0);
    setTexto('dashConsultores', dados.consultores || 0);
    setTexto('dashRegionais', dados.regionais || 0);
    setTexto('dashCooperativas', dados.cooperativas || 0);

  } catch (erro) {
    console.error(erro);
  }
}

/* =========================
   USUÁRIOS
========================= */

async function carregarUsuarios() {
  if (!podeGerenciarUsuarios()) {
    alert('Você não tem permissão para carregar usuários.');
    return;
  }

  try {
    const resultado = await apiPost({
      action: 'listarUsuarios'
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao carregar usuários.');
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

    const podeEditar = podeEditarUsuarioAlvo(usuario);
    const podeAlterarStatus = podeAlterarStatusUsuarioAlvo(usuario);
    const podeExcluir = podeExcluirUsuarioAlvo(usuario);
    const mensagemProtecao = obterMensagemProtecaoUsuario(usuario);

    let botoesAcoes = '';

    if (podeEditar) {
      botoesAcoes += `
        <button onclick="abrirModalEditarUsuario('${usuario.id}')">
          Editar
        </button>
      `;
    }

    if (podeAlterarStatus) {
      botoesAcoes += `
        <button onclick="alterarStatusUsuario('${usuario.id}')">
          ${statusTexto === 'ATIVO' ? 'Inativar' : 'Ativar'}
        </button>
      `;
    }

    if (podeExcluir) {
      botoesAcoes += `
        <button
          class="danger"
          onclick="confirmarExclusaoUsuario('${usuario.id}', '${usuario.nome || ''}')"
        >
          Excluir
        </button>
      `;
    }

    if (!botoesAcoes.trim()) {
      botoesAcoes = `
        <span class="acao-protegida">
          ${mensagemProtecao || 'Sem ações disponíveis'}
        </span>
      `;
    } else if (mensagemProtecao && !podeExcluir) {
      botoesAcoes += `
        <span class="acao-protegida">
          ${mensagemProtecao}
        </span>
      `;
    }

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

      <td>${obterNomeCooperativa(usuario.cooperativa_id)}</td>

      <td>
        <span class="${statusClass}">
          ${usuario.status || '-'}
        </span>
      </td>

      <td class="acoes">
        ${botoesAcoes}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function atualizarMiniDashboardUsuarios(lista) {
  setTexto('miniTotalUsuarios', lista.length);

  setTexto(
    'miniUsuariosAtivos',
    lista.filter(u => String(u.status || '').toUpperCase() === 'ATIVO').length
  );

  setTexto(
    'miniUsuariosInativos',
    lista.filter(u => String(u.status || '').toUpperCase() === 'INATIVO').length
  );

  setTexto(
    'miniAdmins',
    lista.filter(u => {
      const perfil = String(u.perfil || '').toUpperCase();
      return perfil === 'SUPER_ADMIN' || perfil === 'ADMINISTRATIVO';
    }).length
  );

  setTexto(
    'miniRegionais',
    lista.filter(u => String(u.perfil || '').toUpperCase() === 'REGIONAL').length
  );

  setTexto(
    'miniConsultores',
    lista.filter(u => String(u.perfil || '').toUpperCase() === 'CONSULTOR').length
  );
}

function filtrarUsuarios() {
  const busca = document.getElementById('buscaUsuario')?.value.toLowerCase() || '';
  const status = document.getElementById('filtroStatusUsuario')?.value || '';
  const perfil = document.getElementById('filtroPerfilUsuario')?.value || '';

  let lista = [...usuariosCache];

  if (busca) {
    lista = lista.filter(usuario => {
      const nome = String(usuario.nome || '').toLowerCase();
      const email = String(usuario.email || '').toLowerCase();
      const coop = String(obterNomeCooperativa(usuario.cooperativa_id) || '').toLowerCase();

      return (
        nome.includes(busca) ||
        email.includes(busca) ||
        coop.includes(busca)
      );
    });
  }

  if (status) {
    lista = lista.filter(usuario =>
      String(usuario.status || '').toUpperCase() === status
    );
  }

  if (perfil) {
    lista = lista.filter(usuario =>
      String(usuario.perfil || '').toUpperCase() === perfil
    );
  }

  renderizarUsuarios(lista);
}

/* =========================
   MODAL USUÁRIOS
========================= */

function abrirModalNovoUsuario() {
  if (!podeGerenciarUsuarios()) {
    alert('Você não tem permissão para criar usuários.');
    return;
  }

  document.getElementById('modalUsuarioTitulo').innerText = 'Novo Usuário';

  document.getElementById('usuarioId').value = '';
  document.getElementById('usuarioNome').value = '';
  document.getElementById('usuarioEmail').value = '';
  document.getElementById('usuarioSenha').value = '';

  document.getElementById('usuarioPerfil').value = 'CONSULTOR';
  document.getElementById('usuarioCooperativa').value = '';
  document.getElementById('usuarioPermissoes').value = '';
  document.getElementById('usuarioStatus').value = 'ATIVO';

  preencherSelectCooperativas();
  ajustarOpcoesPerfilUsuario();

  abrirModal('modalUsuario');
}

function abrirModalEditarUsuario(id) {
  const usuario = usuariosCache.find(u => String(u.id) === String(id));

  if (!usuario) {
    alert('Usuário não encontrado.');
    return;
  }

  if (!podeEditarUsuarioAlvo(usuario)) {
    alert('Você não tem permissão para editar este usuário.');
    return;
  }

  document.getElementById('modalUsuarioTitulo').innerText = 'Editar Usuário';

  document.getElementById('usuarioId').value = usuario.id || '';
  document.getElementById('usuarioNome').value = usuario.nome || '';
  document.getElementById('usuarioEmail').value = usuario.email || '';
  document.getElementById('usuarioSenha').value = '';
  document.getElementById('usuarioPerfil').value = usuario.perfil || 'CONSULTOR';
  document.getElementById('usuarioCooperativa').value = usuario.cooperativa_id || '';
  document.getElementById('usuarioPermissoes').value = usuario.permissoes || '';
  document.getElementById('usuarioStatus').value = usuario.status || 'ATIVO';

  preencherSelectCooperativas(usuario.cooperativa_id);
  ajustarOpcoesPerfilUsuario(usuario.perfil || '');

  abrirModal('modalUsuario');
}

async function salvarUsuario(event) {
  event.preventDefault();

  if (!podeGerenciarUsuarios()) {
    alert('Você não tem permissão para salvar usuários.');
    return;
  }

  const id = document.getElementById('usuarioId').value.trim();
  const perfilSelecionado = document.getElementById('usuarioPerfil').value;

  if (!podeCriarPerfil(perfilSelecionado)) {
    alert('Você não tem permissão para criar ou definir este perfil.');
    return;
  }

  if (id) {
    const usuarioAtual = usuariosCache.find(u => String(u.id) === String(id));

    if (!usuarioAtual || !podeEditarUsuarioAlvo(usuarioAtual)) {
      alert('Você não tem permissão para editar este usuário.');
      return;
    }
  }

  const payload = {
    action: id ? 'editarUsuario' : 'salvarUsuario',
    id,
    usuario_logado_id: usuarioLogado?.id || '',
    usuario_logado_perfil: usuarioLogado?.perfil || '',
    nome: document.getElementById('usuarioNome').value.trim(),
    email: document.getElementById('usuarioEmail').value.trim(),
    senha: document.getElementById('usuarioSenha').value.trim(),
    perfil: perfilSelecionado,
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
  const usuario = usuariosCache.find(u => String(u.id) === String(id));

  if (!usuario || !podeAlterarStatusUsuarioAlvo(usuario)) {
    alert('Você não tem permissão para alterar o status deste usuário.');
    return;
  }

  try {
    const resultado = await apiPost({
      action: 'alterarStatusUsuario',
      id,
      usuario_logado_id: usuarioLogado?.id || '',
      usuario_logado_perfil: usuarioLogado?.perfil || ''
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
  const usuario = usuariosCache.find(u => String(u.id) === String(id));

  if (!usuario || !podeExcluirUsuarioAlvo(usuario)) {
    alert('Você não tem permissão para excluir este usuário.');
    return;
  }

  const confirmar = confirm(
    `Tem certeza que deseja excluir o usuário "${nome}"?\n\nEssa ação não poderá ser desfeita.`
  );

  if (!confirmar) return;

  excluirUsuario(id);
}

async function excluirUsuario(id) {
  const usuario = usuariosCache.find(u => String(u.id) === String(id));

  if (!usuario || !podeExcluirUsuarioAlvo(usuario)) {
    alert('Você não tem permissão para excluir este usuário.');
    return;
  }

  try {
    const resultado = await apiPost({
      action: 'excluirUsuario',
      id,
      usuario_logado_id: usuarioLogado?.id || '',
      usuario_logado_perfil: usuarioLogado?.perfil || ''
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

/* =========================
   COOPERATIVAS
========================= */

async function carregarCooperativas() {
  try {
    const resultado = await apiPost({
      action: 'listarCooperativas'
    });

    if (!resultado.success) return;

    cooperativasCache = resultado.cooperativas || [];

    renderizarCooperativas(cooperativasCache);
    preencherSelectCooperativas();
    preencherSelectConsultorCooperativas();

  } catch (erro) {
    console.error(erro);
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

    const statusTexto = String(coop.status || '').toUpperCase();

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
  if (!podeGerenciarUsuarios()) {
    alert('Você não tem permissão para criar cooperativas.');
    return;
  }

  document.getElementById('coopNome').value = '';
  document.getElementById('coopRegional').value = '';
  document.getElementById('coopCidade').value = '';
  document.getElementById('coopStatus').value = 'ATIVA';

  abrirModal('modalCooperativa');
}

async function salvarCooperativa(event) {
  event.preventDefault();

  if (!podeGerenciarUsuarios()) {
    alert('Você não tem permissão para salvar cooperativas.');
    return;
  }

  const payload = {
    action: 'criarCooperativa',
    nome_cooperativa: document.getElementById('coopNome').value.trim(),
    regional_responsavel: document.getElementById('coopRegional').value.trim(),
    cidade: document.getElementById('coopCidade').value.trim(),
    status: document.getElementById('coopStatus').value
  };

  if (!payload.nome_cooperativa || !payload.regional_responsavel || !payload.cidade) {
    alert('Preencha nome da cooperativa, regional responsável e cidade.');
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
    option.textContent = coop.nome_cooperativa || coop.nome || coop.id;

    if (String(coop.id) === String(valorSelecionado)) {
      option.selected = true;
    }

    select.appendChild(option);
  });
}

function preencherSelectConsultorCooperativas(valorSelecionado = '') {
  const select = document.getElementById('consultorCooperativa');

  if (!select) return;

  select.innerHTML =
    '<option value="">Selecione a cooperativa</option>';

  let lista = [...cooperativasCache];

  if (usuarioEhRegional()) {
    const coopUsuario = String(usuarioLogado?.cooperativa_id || '').trim();

    lista = lista.filter(coop =>
      String(coop.id) === coopUsuario ||
      String(coop.nome_cooperativa || '').toLowerCase() === coopUsuario.toLowerCase()
    );
  }

  lista.forEach(coop => {
    const option = document.createElement('option');

    option.value = coop.id;
    option.textContent = coop.nome_cooperativa || coop.nome || coop.id;

    if (String(coop.id) === String(valorSelecionado)) {
      option.selected = true;
    }

    select.appendChild(option);
  });
}

function obterNomeCooperativa(id) {
  if (!id) return '-';

  const valor = String(id).trim();

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

  return coop ? (coop.nome_cooperativa || coop.nome) : valor;
}

/* =========================
   CENTRAL DO CONSULTOR
========================= */

async function carregarPalavraChave() {
  try {
    const resultado = await apiPost({
      action: 'buscarPalavraChave'
    });

    if (!resultado.success) return;

    setTexto(
      'palavraChaveDia',
      resultado.palavra || '---'
    );

  } catch (erro) {
    console.error(erro);
  }
}

function abrirModalConsultor() {
  if (!podeSolicitarCadastroConsultor()) {
    alert('Você não tem permissão para realizar essa ação.');
    return;
  }

  const titulo = document.getElementById('tituloModalConsultor');
  const botao = document.getElementById('btnSalvarConsultor');

  if (titulo) {
    titulo.innerText = 'Solicitar Cadastro de Consultor';
  }

  if (botao) {
    botao.innerText = 'Enviar solicitação de Cadastro';
  }

  document.getElementById('consultorNome').value = '';
  document.getElementById('consultorEmail').value = '';
  document.getElementById('consultorTelefone').value = '';
  document.getElementById('consultorObservacao').value = '';

  const linkZap = document.getElementById('linkContratoZap');
  if (linkZap) linkZap.value = LINK_CONTRATO_ZAPSIGN;

  preencherSelectConsultorCooperativas();

  const regional = document.getElementById('consultorRegional');

  if (usuarioEhRegional()) {
    regional.value = usuarioLogado.nome || '';
    regional.readOnly = true;
  } else {
    regional.value = '';
    regional.readOnly = false;
  }

  abrirModal('modalConsultor');
}

async function salvarConsultor(event) {
  event.preventDefault();

  if (!podeSolicitarCadastroConsultor()) {
    alert('Você não tem permissão para realizar essa ação.');
    return;
  }

  const payload = {
    action: 'salvarConsultor',
    solicitante_id: usuarioLogado?.id || '',
    solicitante_nome: usuarioLogado?.nome || '',
    solicitante_perfil: usuarioLogado?.perfil || '',
    nome: document.getElementById('consultorNome').value.trim(),
    email: document.getElementById('consultorEmail').value.trim(),
    telefone: document.getElementById('consultorTelefone').value.trim(),
    cooperativa_id: document.getElementById('consultorCooperativa').value,
    regional: document.getElementById('consultorRegional').value.trim(),
    observacao: document.getElementById('consultorObservacao').value.trim(),
    status: 'PENDENTE'
  };

  if (
    !payload.nome ||
    !payload.email ||
    !payload.telefone ||
    !payload.cooperativa_id ||
    !payload.regional
  ) {
    alert('Preencha todos os campos obrigatórios.');
    return;
  }

  try {
    const resultado = await apiPost(payload);

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao enviar solicitação.');
      return;
    }

    alert(resultado.message || 'Solicitação enviada com sucesso.');

    fecharModal('modalConsultor');
    carregarConsultores();

  } catch (erro) {
    console.error(erro);
    alert('Erro ao enviar solicitação.');
  }
}

function copiarLinkContrato() {
  const input = document.getElementById('linkContratoZap');

  if (!input) return;

  input.select();
  input.setSelectionRange(0, 99999);

  navigator.clipboard.writeText(input.value)
    .then(() => {
      alert('Link copiado com sucesso.');
    })
    .catch(() => {
      document.execCommand('copy');
      alert('Link copiado com sucesso.');
    });
}

/* =========================
   CONTEÚDOS GERAIS
========================= */

async function carregarConteudosGerais() {
  try {
    const resultado = await apiPost({
      action: 'listarConteudosGerais',
      perfil: usuarioLogado?.perfil || ''
    });

    if (!resultado.success) {
      console.warn(resultado.message || 'Erro ao carregar conteúdos gerais.');
      return;
    }

    conteudosCache = resultado.conteudos || [];

    renderizarConteudosCentral();

  } catch (erro) {
    console.error('Erro ao carregar conteúdos gerais:', erro);
  }
}

function renderizarConteudosCentral() {
  const campanha = obterPrimeiroConteudoPorCategoria('CAMPANHA');
  const treinamento = obterPrimeiroConteudoPorCategoria('TREINAMENTO');
  const evento = obterPrimeiroConteudoPorCategoria('EVENTO');

  const itensCentral = document.querySelectorAll('.central-item');

  if (itensCentral && itensCentral.length >= 3) {
    configurarItemCentral(itensCentral[0], campanha, 'Campanha promocional em andamento');
    configurarItemCentral(itensCentral[1], treinamento, 'Novo treinamento disponível');
    configurarItemCentral(itensCentral[2], evento, 'Evento regional confirmado');
  }

  configurarBotaoCentralPorTexto('Treinamento Operacional', 'OPERACIONAL');
  configurarBotaoCentralPorTexto('Aplicativos de Uso Geral', 'APLICATIVO');
}

function obterPrimeiroConteudoPorCategoria(categoria) {
  return conteudosCache.find(item =>
    String(item.categoria || '').toUpperCase() === categoria
  );
}

function obterConteudosPorCategoria(categoria) {
  return conteudosCache.filter(item =>
    String(item.categoria || '').toUpperCase() === categoria
  );
}

function configurarItemCentral(elemento, conteudo, textoPadrao) {
  if (!elemento) return;

  elemento.style.cursor = 'pointer';

  if (conteudo) {
    elemento.innerText = conteudo.titulo || textoPadrao;
    elemento.onclick = () => abrirModalConteudo(conteudo);
    elemento.title = 'Clique para acessar';
  } else {
    elemento.innerText = textoPadrao;
    elemento.onclick = () => {
      alert('Nenhum conteúdo ativo cadastrado para esta seção.');
    };
    elemento.title = 'Nenhum conteúdo ativo cadastrado';
  }
}

function configurarBotaoCentralPorTexto(textoOriginal, categoria) {
  const botoes = document.querySelectorAll('.btn-central');

  botoes.forEach(botao => {
    const textoBotao = String(botao.innerText || '').trim();

    if (textoBotao.includes(textoOriginal)) {
      botao.onclick = () => abrirBibliotecaConteudos(categoria, textoOriginal);
      botao.style.cursor = 'pointer';
    }
  });
}

function criarModalConteudoDinamico() {
  criarModalConteudoIndividual();
  criarModalBibliotecaConteudos();
}

function criarModalConteudoIndividual() {
  if (document.getElementById('modalConteudoGeral')) return;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modalConteudoGeral';

  modal.innerHTML = `
    <div class="modal-content modal-conteudo-geral">

      <div class="modal-header">

        <div>
          <h2 id="conteudoModalTitulo">
            Conteúdo
          </h2>

          <p id="conteudoModalCategoria" class="modal-subtitle">
          </p>
        </div>

        <button onclick="fecharModal('modalConteudoGeral')">
          X
        </button>

      </div>

      <div id="conteudoModalImagemBox" class="conteudo-modal-imagem-box" style="display:none;">
        <img
          id="conteudoModalImagem"
          src=""
          alt="Imagem do conteúdo"
          class="conteudo-modal-imagem"
        />
      </div>

      <p id="conteudoModalDescricao" class="conteudo-modal-descricao">
      </p>

      <button
        type="button"
        id="conteudoModalBotao"
        class="conteudo-modal-botao"
      >
        Acessar
      </button>

    </div>
  `;

  document.body.appendChild(modal);
}

function criarModalBibliotecaConteudos() {
  if (document.getElementById('modalBibliotecaConteudos')) return;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modalBibliotecaConteudos';

  modal.innerHTML = `
    <div class="modal-content biblioteca-modal">

      <div class="biblioteca-header">

        <div>
          <h2 id="bibliotecaTitulo">
            Biblioteca
          </h2>

          <p id="bibliotecaDescricao">
            Consulte os materiais disponíveis.
          </p>
        </div>

        <button onclick="fecharModal('modalBibliotecaConteudos')" class="biblioteca-fechar">
          X
        </button>

      </div>

      <div class="biblioteca-search-row">
        <input
          type="text"
          id="bibliotecaBusca"
          placeholder="Buscar por nome, descrição ou tipo..."
          onkeyup="filtrarBibliotecaConteudos()"
        />
      </div>

      <div id="bibliotecaGrid" class="biblioteca-grid">
      </div>

      <div id="bibliotecaVazia" class="biblioteca-vazia" style="display:none;">
        Nenhum conteúdo encontrado para esta busca.
      </div>

    </div>
  `;

  document.body.appendChild(modal);
}

function abrirModalConteudo(conteudo) {
  if (!conteudo) {
    alert('Conteúdo não encontrado.');
    return;
  }

  const titulo = document.getElementById('conteudoModalTitulo');
  const categoria = document.getElementById('conteudoModalCategoria');
  const descricao = document.getElementById('conteudoModalDescricao');
  const imagemBox = document.getElementById('conteudoModalImagemBox');
  const imagem = document.getElementById('conteudoModalImagem');
  const botao = document.getElementById('conteudoModalBotao');

  if (titulo) titulo.innerText = conteudo.titulo || 'Conteúdo';

  if (categoria) {
    categoria.innerText = `${conteudo.categoria || ''} ${conteudo.tipo ? '• ' + conteudo.tipo : ''}`;
  }

  if (descricao) {
    descricao.innerText = conteudo.descricao || '';
  }

  const imagemCapa = String(conteudo.imagem_capa || '').trim();

  if (
    imagemCapa &&
    imagemCapa !== 'link_da_imagem' &&
    imagemCapa.startsWith('http')
  ) {
    imagem.src = imagemCapa;
    imagemBox.style.display = 'block';
  } else {
    imagem.src = '';
    imagemBox.style.display = 'none';
  }

  if (botao) {
    botao.style.display = 'block';
    botao.innerText = conteudo.botao_texto || 'Acessar conteúdo';
    botao.onclick = () => abrirLinkConteudo(conteudo);
  }

  abrirModal('modalConteudoGeral');
}

function abrirBibliotecaConteudos(categoria, tituloPadrao) {
  const lista = obterConteudosPorCategoria(categoria);

  if (!lista.length) {
    alert('Nenhum conteúdo ativo cadastrado para esta seção.');
    return;
  }

  bibliotecaConteudosAtual = lista;

  const titulo = document.getElementById('bibliotecaTitulo');
  const descricao = document.getElementById('bibliotecaDescricao');
  const busca = document.getElementById('bibliotecaBusca');

  if (titulo) {
    titulo.innerText = tituloPadrao || 'Biblioteca';
  }

  if (descricao) {
    if (categoria === 'OPERACIONAL') {
      descricao.innerText = 'Encontre treinamentos, tutoriais e materiais operacionais disponíveis para consulta.';
    } else if (categoria === 'APLICATIVO') {
      descricao.innerText = 'Veja os aplicativos, sistemas e atalhos úteis para acesso, download ou suporte.';
    } else {
      descricao.innerText = 'Consulte os conteúdos disponíveis.';
    }
  }

  if (busca) {
    busca.value = '';
    busca.placeholder = categoria === 'APLICATIVO'
      ? 'Buscar aplicativo, sistema ou atalho...'
      : 'Buscar treinamento ou material...';
  }

  renderizarBibliotecaConteudos(bibliotecaConteudosAtual);

  abrirModal('modalBibliotecaConteudos');
}

function filtrarBibliotecaConteudos() {
  const termo = String(document.getElementById('bibliotecaBusca')?.value || '')
    .trim()
    .toLowerCase();

  let lista = [...bibliotecaConteudosAtual];

  if (termo) {
    lista = lista.filter(item => {
      const titulo = String(item.titulo || '').toLowerCase();
      const descricao = String(item.descricao || '').toLowerCase();
      const tipo = String(item.tipo || '').toLowerCase();

      return (
        titulo.includes(termo) ||
        descricao.includes(termo) ||
        tipo.includes(termo)
      );
    });
  }

  renderizarBibliotecaConteudos(lista);
}

function renderizarBibliotecaConteudos(lista) {
  const grid = document.getElementById('bibliotecaGrid');
  const vazio = document.getElementById('bibliotecaVazia');

  if (!grid) return;

  grid.innerHTML = '';

  if (!lista.length) {
    if (vazio) vazio.style.display = 'block';
    return;
  }

  if (vazio) vazio.style.display = 'none';

  grid.innerHTML = lista.map(item => criarCardBiblioteca(item)).join('');
}

function criarCardBiblioteca(item) {
  const imagem = String(item.imagem_capa || '').trim();
  const temImagem =
    imagem &&
    imagem !== 'link_da_imagem' &&
    imagem.startsWith('http');

  const imagemHtml = temImagem
    ? `
      <img
        src="${imagem}"
        alt="${item.titulo || 'Conteúdo'}"
        class="biblioteca-card-img"
      />
    `
    : `
      <div class="biblioteca-card-placeholder">
        <span>${obterIconeTipo(item.tipo)}</span>
      </div>
    `;

  return `
    <div class="biblioteca-card">

      <div class="biblioteca-card-media">
        ${imagemHtml}
      </div>

      <div class="biblioteca-card-body">

        <span class="biblioteca-card-tipo">
          ${item.tipo || 'LINK'}
        </span>

        <h3>
          ${item.titulo || 'Conteúdo'}
        </h3>

        <p>
          ${item.descricao || 'Material disponível para acesso.'}
        </p>

      </div>

      <div class="biblioteca-card-footer">
        <button
          type="button"
          onclick="abrirLinkConteudoPorId('${item.id}')"
        >
          ${item.botao_texto || 'Acessar'}
        </button>
      </div>

    </div>
  `;
}

function obterIconeTipo(tipo) {
  const tipoTexto = String(tipo || '').toUpperCase();

  if (tipoTexto === 'VIDEO') return '▶';
  if (tipoTexto === 'PDF') return 'PDF';
  if (tipoTexto === 'PASTA') return '📁';
  if (tipoTexto === 'WHATSAPP') return '☏';
  if (tipoTexto === 'IMAGEM') return 'IMG';
  if (tipoTexto === 'APP') return 'APP';

  return '↗';
}

function abrirLinkConteudoPorId(id) {
  const conteudo = conteudosCache.find(item =>
    String(item.id) === String(id)
  );

  abrirLinkConteudo(conteudo);
}

function abrirLinkConteudo(conteudo) {
  if (!conteudo) {
    alert('Conteúdo não encontrado.');
    return;
  }

  const link = String(conteudo.arquivo_link || '').trim();

  if (!link || !link.startsWith('http')) {
    alert('Link do conteúdo não configurado corretamente.');
    return;
  }

  window.open(link, '_blank');
}

/* =========================
   PROCESSOS ADMINISTRATIVOS
========================= */

async function carregarConsultores() {
  try {
    const resultado = await apiPost({
      action: 'listarConsultores',
      perfil: usuarioLogado?.perfil || '',
      cooperativa_id: usuarioLogado?.cooperativa_id || ''
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao carregar processos.');
      return;
    }

    consultoresCache = resultado.consultores || [];

    filtrarProcessos();

  } catch (erro) {
    console.error(erro);
    alert('Erro ao carregar processos.');
  }
}

function filtrarProcessos() {
  const filtroStatus = document.getElementById('filtroStatusProcesso')?.value || '';

  let lista = [...consultoresCache];

  if (filtroStatus) {
    lista = lista.filter(item =>
      String(item.status || '').toUpperCase() === filtroStatus
    );
  }

  renderizarProcessos(lista);
}

function renderizarProcessos(lista) {
  const tbody = document.getElementById('tabelaProcessosBody');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">
          Nenhum processo encontrado.
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(item => {
    const tr = document.createElement('tr');

    const status = String(item.status || '').toUpperCase();

    let statusClass = 'status pendente';

    if (status === 'CADASTRO REALIZADO') {
      statusClass = 'status ativo';
    }

    if (status === 'RECUSADO') {
      statusClass = 'status inativo';
    }

    const acoes = usuarioEhAdmin()
      ? `
        <button onclick="atualizarStatusProcesso('${item.id}', 'CADASTRO REALIZADO')">
          Concluir
        </button>

        <button onclick="atualizarStatusProcesso('${item.id}', 'PENDENTE')">
          Pendente
        </button>

        <button class="danger" onclick="atualizarStatusProcesso('${item.id}', 'RECUSADO')">
          Recusar
        </button>

        <button class="danger" onclick="excluirTicketConsultor('${item.id}')">
          Excluir
        </button>
      `
      : `
        <button disabled>
          Acompanhar
        </button>
      `;

    tr.innerHTML = `
      <td>
        <strong>${item.nome || '-'}</strong>
        <small>${item.email || '-'}</small>
        <small>${item.telefone || '-'}</small>
      </td>

      <td>${obterNomeCooperativa(item.cooperativa_id)}</td>

      <td>${item.regional || '-'}</td>

      <td>
        <span class="${statusClass}">
          ${item.status || '-'}
        </span>
      </td>

      <td>${formatarData(item.data_solicitacao)}</td>

      <td>${item.observacao || '-'}</td>

      <td class="acoes">
        ${acoes}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function atualizarStatusProcesso(id, status) {
  const observacao = prompt(
    `Observação administrativa para "${status}" (opcional):`
  );

  try {
    const resultado = await apiPost({
      action: 'atualizarStatusConsultor',
      id,
      status,
      observacao: observacao || '',
      atualizado_por: usuarioLogado?.nome || ''
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao atualizar processo.');
      return;
    }

    alert(resultado.message || 'Processo atualizado com sucesso.');

    carregarConsultores();

  } catch (erro) {
    console.error(erro);
    alert('Erro ao atualizar processo.');
  }
}

async function excluirTicketConsultor(id) {
  if (!usuarioEhAdmin()) {
    alert('Você não tem permissão para excluir solicitações.');
    return;
  }

  const confirmar = confirm(
    'Tem certeza que deseja excluir esta solicitação?\n\nEssa ação remove apenas o ticket da aba CONSULTORES e não exclui nenhum usuário.'
  );

  if (!confirmar) return;

  try {
    const resultado = await apiPost({
      action: 'excluirTicketConsultor',
      id,
      excluido_por: usuarioLogado?.nome || '',
      perfil: usuarioLogado?.perfil || ''
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao excluir solicitação.');
      return;
    }

    alert(resultado.message || 'Solicitação excluída com sucesso.');

    carregarConsultores();

  } catch (erro) {
    console.error(erro);
    alert('Erro ao excluir solicitação.');
  }
}

/* =========================
   MODAIS
========================= */

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

/* =========================
   UTIL
========================= */

function setTexto(id, valor) {
  const el = document.getElementById(id);

  if (el) {
    el.innerText = valor;
  }
}

function formatarData(valor) {
  if (!valor) return '-';

  try {
    const data = new Date(valor);

    if (isNaN(data.getTime())) {
      return valor;
    }

    return data.toLocaleString('pt-BR');

  } catch (erro) {
    return valor;
  }
}
