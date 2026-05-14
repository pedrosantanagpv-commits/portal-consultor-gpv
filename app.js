/* =========================================================
   CENTRAL DO CONSULTOR GPV — APP.JS
   Versão atualizada com regras finais:

   CONSULTOR
   - Acessa a Central do Consultor.
   - Não vê a área "Solicitar cadastro de consultor".
   - Não pode solicitar cadastro de outro consultor.
   - Não vê gestão geral de usuários/cooperativas.

   REGIONAL
   - Acessa a Central do Consultor.
   - Vê somente a própria cooperativa.
   - Vê somente os consultores da própria cooperativa.
   - Pode solicitar cadastro de consultor apenas da própria cooperativa.
   - Na seleção de cooperativa, aparece somente a dele.

   ADMINISTRATIVO
   - Vê tudo.
   - Pode solicitar cadastro de consultor em qualquer cooperativa.
   - Pode filtrar tickets.
   - Pode excluir ticket.

   SUPER ADMIN
   - Acesso total.
========================================================= */

const API_URL = "/api/proxy";

let usuarioLogado = null;
let usuarios = [];
let cooperativas = [];
let tickets = [];

const PERFIS = {
  CONSULTOR: "CONSULTOR",
  REGIONAL: "REGIONAL",
  ADMINISTRATIVO: "ADMINISTRATIVO",
  SUPER_ADMIN: "SUPER_ADMIN",
};

const STATUS_USUARIO = {
  ATIVO: "ATIVO",
  INATIVO: "INATIVO",
};

const STATUS_TICKET = {
  PENDENTE: "PENDENTE",
  CADASTRO_REALIZADO: "CADASTRO REALIZADO",
  RECUSADO: "RECUSADO",
};

document.addEventListener("DOMContentLoaded", () => {
  iniciarApp();
});

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function iniciarApp() {
  carregarSessaoSalva();
  configurarEventosGlobais();

  if (usuarioLogado) {
    abrirSistema();
  } else {
    mostrarTelaLogin();
  }
}

function configurarEventosGlobais() {
  const formLogin = document.getElementById("formLogin");
  if (formLogin) {
    formLogin.addEventListener("submit", fazerLogin);
  }

  const btnSair = document.getElementById("btnSair");
  if (btnSair) {
    btnSair.addEventListener("click", sair);
  }

  const formSolicitacao = document.getElementById("formSolicitacao");
  if (formSolicitacao) {
    formSolicitacao.addEventListener("submit", salvarSolicitacao);
  }

  const filtroStatusTicket = document.getElementById("filtroStatusTicket");
  if (filtroStatusTicket) {
    filtroStatusTicket.addEventListener("change", renderizarTickets);
  }

  const filtroBuscaTicket = document.getElementById("filtroBuscaTicket");
  if (filtroBuscaTicket) {
    filtroBuscaTicket.addEventListener("input", renderizarTickets);
  }

  const filtroStatusUsuario = document.getElementById("filtroStatusUsuario");
  if (filtroStatusUsuario) {
    filtroStatusUsuario.addEventListener("change", renderizarUsuarios);
  }

  const filtroPerfilUsuario = document.getElementById("filtroPerfilUsuario");
  if (filtroPerfilUsuario) {
    filtroPerfilUsuario.addEventListener("change", renderizarUsuarios);
  }

  const filtroBuscaUsuario = document.getElementById("filtroBuscaUsuario");
  if (filtroBuscaUsuario) {
    filtroBuscaUsuario.addEventListener("input", renderizarUsuarios);
  }

  const selectCooperativaSolicitacao = document.getElementById("cooperativaSolicitacao");
  if (selectCooperativaSolicitacao) {
    selectCooperativaSolicitacao.addEventListener("change", carregarUsuariosDaCooperativaSelecionada);
  }

  const btnAtualizarDados = document.getElementById("btnAtualizarDados");
  if (btnAtualizarDados) {
    btnAtualizarDados.addEventListener("click", carregarDadosIniciais);
  }

  const btnFecharModalUsuario = document.getElementById("btnFecharModalUsuario");
  if (btnFecharModalUsuario) {
    btnFecharModalUsuario.addEventListener("click", () => fecharModal("modalUsuario"));
  }

  const formUsuario = document.getElementById("formUsuario");
  if (formUsuario) {
    formUsuario.addEventListener("submit", salvarUsuario);
  }

  const btnNovoUsuario = document.getElementById("btnNovoUsuario");
  if (btnNovoUsuario) {
    btnNovoUsuario.addEventListener("click", abrirFormularioNovoUsuario);
  }
}

/* =========================================================
   API
========================================================= */

async function chamarApi(acao, dados = {}) {
  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        acao,
        dados,
      }),
    });

    const json = await resposta.json();

    if (!json || json.status === "erro" || json.status === "error") {
      throw new Error(json?.mensagem || json?.message || "Erro ao processar solicitação.");
    }

    return json;
  } catch (erro) {
    console.error("Erro na API:", erro);
    mostrarToast(erro.message || "Erro de conexão com o servidor.", "erro");
    throw erro;
  }
}

/* =========================================================
   LOGIN / SESSÃO
========================================================= */

async function fazerLogin(event) {
  event.preventDefault();

  const email = pegarValor("email");
  const senha = pegarValor("senha");

  if (!email || !senha) {
    mostrarToast("Informe e-mail e senha.", "erro");
    return;
  }

  try {
    bloquearBotao("btnLogin", true, "Entrando...");

    const resposta = await chamarApi("login", {
      email,
      senha,
    });

    usuarioLogado = normalizarUsuario(resposta.usuario || resposta.dados || resposta);

    if (!usuarioLogado || !usuarioLogado.email) {
      mostrarToast("Não foi possível validar o usuário.", "erro");
      return;
    }

    if (String(usuarioLogado.status || "").toUpperCase() !== STATUS_USUARIO.ATIVO) {
      mostrarToast("Usuário inativo. Procure o administrativo.", "erro");
      return;
    }

    localStorage.setItem("usuarioLogadoGPV", JSON.stringify(usuarioLogado));
    abrirSistema();
  } catch (erro) {
    console.error(erro);
  } finally {
    bloquearBotao("btnLogin", false, "Entrar");
  }
}

function carregarSessaoSalva() {
  const dados = localStorage.getItem("usuarioLogadoGPV");

  if (!dados) return;

  try {
    usuarioLogado = JSON.parse(dados);
  } catch {
    usuarioLogado = null;
    localStorage.removeItem("usuarioLogadoGPV");
  }
}

function sair() {
  localStorage.removeItem("usuarioLogadoGPV");

  usuarioLogado = null;
  usuarios = [];
  cooperativas = [];
  tickets = [];

  mostrarTelaLogin();
}

function abrirSistema() {
  mostrarTelaSistema();
  aplicarPermissoesVisuais();
  preencherDadosUsuarioLogado();
  carregarDadosIniciais();
}

function mostrarTelaLogin() {
  mostrarElemento("telaLogin");
  ocultarElemento("app");
  ocultarElemento("dashboard");
}

function mostrarTelaSistema() {
  ocultarElemento("telaLogin");
  mostrarElemento("app");
  mostrarElemento("dashboard");
}

function preencherDadosUsuarioLogado() {
  preencherTexto("nomeUsuarioLogado", usuarioLogado?.nome || "");
  preencherTexto("perfilUsuarioLogado", formatarPerfil(usuarioLogado?.perfil || ""));

  const cooperativaNome = obterNomeCooperativa(usuarioLogado?.cooperativa_id);
  preencherTexto("cooperativaUsuarioLogado", cooperativaNome || "");
}

/* =========================================================
   PERFIS / PERMISSÕES
========================================================= */

function perfilAtual() {
  return String(usuarioLogado?.perfil || "").trim().toUpperCase();
}

function isConsultor() {
  return perfilAtual() === PERFIS.CONSULTOR;
}

function isRegional() {
  return perfilAtual() === PERFIS.REGIONAL;
}

function isAdministrativo() {
  return perfilAtual() === PERFIS.ADMINISTRATIVO;
}

function isSuperAdmin() {
  return perfilAtual() === PERFIS.SUPER_ADMIN;
}

function podeVerTudo() {
  return isAdministrativo() || isSuperAdmin();
}

function podeGerenciarUsuarios() {
  return podeVerTudo();
}

function podeGerenciarCooperativas() {
  return podeVerTudo();
}

function podeAlterarStatusUsuario() {
  return podeVerTudo();
}

function podeVerAreaUsuarios() {
  return podeVerTudo() || isRegional();
}

function podeVerAreaTickets() {
  return podeVerTudo() || isRegional() || isConsultor();
}

function podeAlterarStatusTicket() {
  return podeVerTudo();
}

function podeExcluirTicket() {
  return podeVerTudo();
}

function podeSolicitarCadastroConsultor() {
  return isRegional() || isAdministrativo() || isSuperAdmin();
}

function podeVerCooperativa(cooperativaId) {
  if (podeVerTudo()) return true;

  if (isRegional() || isConsultor()) {
    return String(cooperativaId) === String(usuarioLogado?.cooperativa_id);
  }

  return false;
}

function podeSolicitarParaUsuario(usuario) {
  if (!usuario) return false;

  if (!podeSolicitarCadastroConsultor()) return false;

  if (podeVerTudo()) {
    return String(usuario.perfil).toUpperCase() === PERFIS.CONSULTOR;
  }

  if (isRegional()) {
    return (
      String(usuario.cooperativa_id) === String(usuarioLogado?.cooperativa_id) &&
      String(usuario.perfil).toUpperCase() === PERFIS.CONSULTOR
    );
  }

  return false;
}

function aplicarPermissoesVisuais() {
  const perfil = perfilAtual();

  document.body.setAttribute("data-perfil", perfil);

  controlarElementoPorPermissao("areaUsuarios", podeVerAreaUsuarios());
  controlarElementoPorPermissao("areaCooperativas", podeGerenciarCooperativas());
  controlarElementoPorPermissao("areaTickets", podeVerAreaTickets());
  controlarElementoPorPermissao("areaSolicitacaoCadastro", podeSolicitarCadastroConsultor());

  controlarElementoPorPermissao("btnNovoUsuario", podeGerenciarUsuarios());
  controlarElementoPorPermissao("btnNovaCooperativa", podeGerenciarCooperativas());

  controlarElementoPorPermissao("filtroPerfilUsuario", podeVerTudo());

  const tituloSolicitacao = document.getElementById("tituloSolicitacao");
  if (tituloSolicitacao) {
    tituloSolicitacao.textContent = "Solicitar cadastro de consultor";
  }

  const textoAjudaSolicitacao = document.getElementById("textoAjudaSolicitacao");
  if (textoAjudaSolicitacao) {
    if (isRegional()) {
      textoAjudaSolicitacao.textContent = "Você pode solicitar cadastro apenas para consultores da sua cooperativa.";
    } else if (podeVerTudo()) {
      textoAjudaSolicitacao.textContent = "Você pode solicitar cadastro para consultores de qualquer cooperativa.";
    }
  }
}

/* =========================================================
   CARREGAMENTO DE DADOS
========================================================= */

async function carregarDadosIniciais() {
  try {
    mostrarLoading(true);

    await carregarCooperativas();
    await carregarUsuarios();
    await carregarTickets();

    configurarFormularioSolicitacao();
    renderizarDashboard();
    renderizarUsuarios();
    renderizarTickets();
    renderizarCooperativas();
  } catch (erro) {
    console.error(erro);
  } finally {
    mostrarLoading(false);
  }
}

async function carregarCooperativas() {
  const resposta = await chamarApi("listarCooperativas");
  const lista = resposta.cooperativas || resposta.dados || [];

  cooperativas = lista.map(normalizarCooperativa);
}

async function carregarUsuarios() {
  const resposta = await chamarApi("listarUsuarios");
  const lista = resposta.usuarios || resposta.dados || [];

  usuarios = lista.map(normalizarUsuario);
}

async function carregarTickets() {
  const resposta = await chamarApi("listarTickets");
  const lista = resposta.tickets || resposta.dados || [];

  tickets = lista.map(normalizarTicket);
}

/* =========================================================
   DASHBOARD
========================================================= */

function renderizarDashboard() {
  const ticketsPermitidos = filtrarTicketsPorPermissao(tickets);
  const usuariosPermitidos = filtrarUsuariosPorPermissao(usuarios);

  const totalTickets = ticketsPermitidos.length;
  const pendentes = ticketsPermitidos.filter(t => normalizarStatus(t.status) === STATUS_TICKET.PENDENTE).length;
  const realizados = ticketsPermitidos.filter(t => normalizarStatus(t.status) === STATUS_TICKET.CADASTRO_REALIZADO).length;
  const recusados = ticketsPermitidos.filter(t => normalizarStatus(t.status) === STATUS_TICKET.RECUSADO).length;

  const ativos = usuariosPermitidos.filter(u => normalizarStatus(u.status) === STATUS_USUARIO.ATIVO).length;
  const inativos = usuariosPermitidos.filter(u => normalizarStatus(u.status) === STATUS_USUARIO.INATIVO).length;

  preencherTexto("cardTotalTickets", totalTickets);
  preencherTexto("cardTicketsPendentes", pendentes);
  preencherTexto("cardTicketsRealizados", realizados);
  preencherTexto("cardTicketsRecusados", recusados);

  preencherTexto("cardUsuariosAtivos", ativos);
  preencherTexto("cardUsuariosInativos", inativos);
}

/* =========================================================
   USUÁRIOS / CONSULTORES
========================================================= */

function filtrarUsuariosPorPermissao(lista) {
  if (podeVerTudo()) return lista;

  if (isRegional()) {
    return lista.filter(usuario => {
      return (
        String(usuario.cooperativa_id) === String(usuarioLogado?.cooperativa_id) &&
        String(usuario.perfil).toUpperCase() === PERFIS.CONSULTOR
      );
    });
  }

  if (isConsultor()) {
    return lista.filter(usuario => {
      return String(usuario.email).toLowerCase() === String(usuarioLogado?.email).toLowerCase();
    });
  }

  return [];
}

function renderizarUsuarios() {
  const corpo = document.getElementById("listaUsuarios") || document.querySelector("#tabelaUsuarios tbody");

  if (!corpo) return;

  let lista = filtrarUsuariosPorPermissao(usuarios);

  const status = pegarValor("filtroStatusUsuario");
  const perfil = pegarValor("filtroPerfilUsuario");
  const busca = pegarValor("filtroBuscaUsuario").toLowerCase();

  if (status) {
    lista = lista.filter(usuario => normalizarStatus(usuario.status) === normalizarStatus(status));
  }

  if (perfil && podeVerTudo()) {
    lista = lista.filter(usuario => String(usuario.perfil).toUpperCase() === String(perfil).toUpperCase());
  }

  if (busca) {
    lista = lista.filter(usuario => {
      return (
        String(usuario.nome || "").toLowerCase().includes(busca) ||
        String(usuario.email || "").toLowerCase().includes(busca) ||
        String(usuario.telefone || "").toLowerCase().includes(busca) ||
        String(formatarPerfil(usuario.perfil) || "").toLowerCase().includes(busca) ||
        String(obterNomeCooperativa(usuario.cooperativa_id) || "").toLowerCase().includes(busca)
      );
    });
  }

  corpo.innerHTML = "";

  if (!lista.length) {
    corpo.innerHTML = `
      <tr>
        <td colspan="7" class="text-center vazio">Nenhum usuário encontrado.</td>
      </tr>
    `;
    return;
  }

  lista.forEach(usuario => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapar(usuario.nome || "-")}</td>
      <td>${escapar(usuario.email || "-")}</td>
      <td>${escapar(usuario.telefone || "-")}</td>
      <td>${escapar(formatarPerfil(usuario.perfil) || "-")}</td>
      <td>${escapar(obterNomeCooperativa(usuario.cooperativa_id) || "-")}</td>
      <td>
        <span class="badge ${classeStatusUsuario(usuario.status)}">
          ${escapar(usuario.status || "-")}
        </span>
      </td>
      <td class="acoes">
        ${
          podeGerenciarUsuarios()
            ? `<button type="button" class="btn-acao" onclick="editarUsuario('${escaparAtributo(usuario.id)}')">Editar</button>`
            : ""
        }
        ${
          podeAlterarStatusUsuario()
            ? `<button type="button" class="btn-acao secundario" onclick="alternarStatusUsuario('${escaparAtributo(usuario.id)}')">
                ${normalizarStatus(usuario.status) === STATUS_USUARIO.ATIVO ? "Inativar" : "Ativar"}
              </button>`
            : ""
        }
      </td>
    `;

    corpo.appendChild(tr);
  });
}

function abrirFormularioNovoUsuario() {
  if (!podeGerenciarUsuarios()) {
    mostrarToast("Você não tem permissão para criar usuários.", "erro");
    return;
  }

  limparFormularioUsuario();
  carregarSelectCooperativasUsuario();
  abrirModal("modalUsuario");
}

function limparFormularioUsuario() {
  preencherValor("usuarioId", "");
  preencherValor("usuarioNome", "");
  preencherValor("usuarioEmail", "");
  preencherValor("usuarioTelefone", "");
  preencherValor("usuarioSenha", "");
  preencherValor("usuarioPerfil", "");
  preencherValor("usuarioCooperativa", "");
  preencherValor("usuarioStatus", STATUS_USUARIO.ATIVO);
}

function carregarSelectCooperativasUsuario() {
  const select = document.getElementById("usuarioCooperativa");
  if (!select) return;

  select.innerHTML = `<option value="">Selecione a cooperativa</option>`;

  cooperativas.forEach(coop => {
    const option = document.createElement("option");
    option.value = coop.id;
    option.textContent = coop.nome_cooperativa;
    select.appendChild(option);
  });
}

function editarUsuario(id) {
  if (!podeGerenciarUsuarios()) {
    mostrarToast("Você não tem permissão para editar usuários.", "erro");
    return;
  }

  const usuario = usuarios.find(u => String(u.id) === String(id));

  if (!usuario) {
    mostrarToast("Usuário não encontrado.", "erro");
    return;
  }

  carregarSelectCooperativasUsuario();

  preencherValor("usuarioId", usuario.id);
  preencherValor("usuarioNome", usuario.nome);
  preencherValor("usuarioEmail", usuario.email);
  preencherValor("usuarioTelefone", usuario.telefone);
  preencherValor("usuarioPerfil", usuario.perfil);
  preencherValor("usuarioCooperativa", usuario.cooperativa_id);
  preencherValor("usuarioStatus", usuario.status);
  preencherValor("usuarioSenha", "");

  abrirModal("modalUsuario");
}

async function salvarUsuario(event) {
  event.preventDefault();

  if (!podeGerenciarUsuarios()) {
    mostrarToast("Você não tem permissão para salvar usuários.", "erro");
    return;
  }

  const id = pegarValor("usuarioId");
  const nome = pegarValor("usuarioNome");
  const email = pegarValor("usuarioEmail");
  const telefone = pegarValor("usuarioTelefone");
  const senha = pegarValor("usuarioSenha");
  const perfil = pegarValor("usuarioPerfil");
  const cooperativaId = pegarValor("usuarioCooperativa");
  const status = pegarValor("usuarioStatus") || STATUS_USUARIO.ATIVO;

  if (!nome || !email || !perfil || !cooperativaId) {
    mostrarToast("Preencha nome, e-mail, perfil e cooperativa.", "erro");
    return;
  }

  try {
    bloquearBotao("btnSalvarUsuario", true, "Salvando...");

    const payload = {
      id,
      nome,
      email,
      telefone,
      senha,
      perfil,
      cooperativa_id: cooperativaId,
      status,
      atualizado_por: usuarioLogado.email,
    };

    if (id) {
      await chamarApi("editarUsuario", payload);
      mostrarToast("Usuário atualizado com sucesso.", "sucesso");
    } else {
      await chamarApi("criarUsuario", payload);
      mostrarToast("Usuário criado com sucesso.", "sucesso");
    }

    fecharModal("modalUsuario");

    await carregarUsuarios();
    configurarFormularioSolicitacao();
    renderizarUsuarios();
    renderizarDashboard();
  } catch (erro) {
    console.error(erro);
  } finally {
    bloquearBotao("btnSalvarUsuario", false, "Salvar");
  }
}

async function alternarStatusUsuario(id) {
  if (!podeAlterarStatusUsuario()) {
    mostrarToast("Você não tem permissão para alterar status de usuários.", "erro");
    return;
  }

  const usuario = usuarios.find(u => String(u.id) === String(id));

  if (!usuario) {
    mostrarToast("Usuário não encontrado.", "erro");
    return;
  }

  const novoStatus = normalizarStatus(usuario.status) === STATUS_USUARIO.ATIVO ? STATUS_USUARIO.INATIVO : STATUS_USUARIO.ATIVO;

  const confirmar = confirm(`Deseja realmente alterar o status de ${usuario.nome} para ${novoStatus}?`);

  if (!confirmar) return;

  try {
    await chamarApi("alterarStatusUsuario", {
      id,
      status: novoStatus,
      usuario_responsavel: usuarioLogado.email,
    });

    mostrarToast("Status atualizado com sucesso.", "sucesso");

    await carregarUsuarios();
    configurarFormularioSolicitacao();
    renderizarUsuarios();
    renderizarDashboard();
  } catch (erro) {
    console.error(erro);
  }
}

/* =========================================================
   COOPERATIVAS
========================================================= */

function renderizarCooperativas() {
  const corpo = document.getElementById("listaCooperativas") || document.querySelector("#tabelaCooperativas tbody");

  if (!corpo) return;

  let lista = cooperativas;

  if (!podeVerTudo()) {
    lista = cooperativas.filter(coop => String(coop.id) === String(usuarioLogado?.cooperativa_id));
  }

  corpo.innerHTML = "";

  if (!lista.length) {
    corpo.innerHTML = `
      <tr>
        <td colspan="4" class="text-center vazio">Nenhuma cooperativa encontrada.</td>
      </tr>
    `;
    return;
  }

  lista.forEach(coop => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapar(coop.nome_cooperativa || "-")}</td>
      <td>${escapar(coop.regional || "-")}</td>
      <td>${escapar(coop.status || "-")}</td>
      <td class="acoes">
        ${
          podeGerenciarCooperativas()
            ? `<button type="button" class="btn-acao" onclick="editarCooperativa('${escaparAtributo(coop.id)}')">Editar</button>`
            : ""
        }
      </td>
    `;

    corpo.appendChild(tr);
  });
}

function editarCooperativa(id) {
  if (!podeGerenciarCooperativas()) {
    mostrarToast("Você não tem permissão para editar cooperativas.", "erro");
    return;
  }

  mostrarToast("Função de edição de cooperativa ainda não configurada nesta tela.", "aviso");
}

/* =========================================================
   FORMULÁRIO DE SOLICITAÇÃO DE CADASTRO
========================================================= */

function configurarFormularioSolicitacao() {
  carregarSelectCooperativasSolicitacao();
  carregarSelectUsuariosSolicitacao();

  const area = document.getElementById("areaSolicitacaoCadastro");
  if (area) {
    area.style.display = podeSolicitarCadastroConsultor() ? "" : "none";
  }
}

function carregarSelectCooperativasSolicitacao() {
  const select = document.getElementById("cooperativaSolicitacao");
  if (!select) return;

  select.innerHTML = "";

  if (!podeSolicitarCadastroConsultor()) {
    select.innerHTML = `<option value="">Sem permissão</option>`;
    select.disabled = true;
    return;
  }

  let lista = [];

  if (podeVerTudo()) {
    lista = cooperativas;
    select.innerHTML = `<option value="">Selecione uma cooperativa</option>`;
  } else if (isRegional()) {
    lista = cooperativas.filter(coop => {
      return String(coop.id) === String(usuarioLogado?.cooperativa_id);
    });
  }

  lista.forEach(coop => {
    const option = document.createElement("option");
    option.value = coop.id;
    option.textContent = coop.nome_cooperativa;
    select.appendChild(option);
  });

  if (isRegional() && usuarioLogado?.cooperativa_id) {
    select.value = usuarioLogado.cooperativa_id;
    select.disabled = true;
  } else {
    select.disabled = false;
  }
}

function carregarSelectUsuariosSolicitacao() {
  const select = document.getElementById("usuarioSolicitacao");
  if (!select) return;

  select.innerHTML = "";

  if (!podeSolicitarCadastroConsultor()) {
    select.innerHTML = `<option value="">Sem permissão</option>`;
    select.disabled = true;
    return;
  }

  let lista = [];

  if (podeVerTudo()) {
    lista = usuarios.filter(usuario => {
      return String(usuario.perfil).toUpperCase() === PERFIS.CONSULTOR;
    });

    select.innerHTML = `<option value="">Selecione o consultor</option>`;
  } else if (isRegional()) {
    lista = usuarios.filter(usuario => {
      return (
        String(usuario.cooperativa_id) === String(usuarioLogado?.cooperativa_id) &&
        String(usuario.perfil).toUpperCase() === PERFIS.CONSULTOR
      );
    });

    select.innerHTML = `<option value="">Selecione o consultor</option>`;
  }

  lista.forEach(usuario => {
    if (!podeSolicitarParaUsuario(usuario)) return;

    const option = document.createElement("option");
    option.value = usuario.id;
    option.textContent = `${usuario.nome} — ${usuario.email}`;
    select.appendChild(option);
  });

  select.disabled = false;

  select.onchange = () => {
    const usuarioSelecionado = usuarios.find(u => String(u.id) === String(select.value));
    if (usuarioSelecionado) preencherDadosSolicitacaoPorUsuario(usuarioSelecionado);
  };
}

function carregarUsuariosDaCooperativaSelecionada() {
  const selectCoop = document.getElementById("cooperativaSolicitacao");
  const selectUsuario = document.getElementById("usuarioSolicitacao");

  if (!selectCoop || !selectUsuario) return;
  if (!podeSolicitarCadastroConsultor()) return;

  const cooperativaId = selectCoop.value;

  let lista = usuarios.filter(usuario => {
    return String(usuario.perfil).toUpperCase() === PERFIS.CONSULTOR;
  });

  if (cooperativaId) {
    lista = lista.filter(usuario => String(usuario.cooperativa_id) === String(cooperativaId));
  }

  if (isRegional()) {
    lista = lista.filter(usuario => {
      return String(usuario.cooperativa_id) === String(usuarioLogado?.cooperativa_id);
    });
  }

  selectUsuario.innerHTML = `<option value="">Selecione o consultor</option>`;

  lista.forEach(usuario => {
    if (!podeSolicitarParaUsuario(usuario)) return;

    const option = document.createElement("option");
    option.value = usuario.id;
    option.textContent = `${usuario.nome} — ${usuario.email}`;
    selectUsuario.appendChild(option);
  });
}

function preencherDadosSolicitacaoPorUsuario(usuario) {
  if (!usuario) return;

  preencherValor("nomeSolicitacao", usuario.nome || "");
  preencherValor("emailSolicitacao", usuario.email || "");
  preencherValor("telefoneSolicitacao", usuario.telefone || "");
  preencherValor("cooperativaSolicitacao", usuario.cooperativa_id || "");

  const campoCoop = document.getElementById("cooperativaSolicitacao");
  if (campoCoop && isRegional()) {
    campoCoop.disabled = true;
  }
}

async function salvarSolicitacao(event) {
  event.preventDefault();

  if (!podeSolicitarCadastroConsultor()) {
    mostrarToast("Você não tem permissão para solicitar cadastro de consultor.", "erro");
    return;
  }

  const usuarioId = pegarValor("usuarioSolicitacao");
  const usuarioSelecionado = usuarios.find(u => String(u.id) === String(usuarioId));

  let nome = pegarValor("nomeSolicitacao");
  let email = pegarValor("emailSolicitacao");
  let telefone = pegarValor("telefoneSolicitacao");
  let cooperativaId = pegarValor("cooperativaSolicitacao");
  let observacao = pegarValor("observacaoSolicitacao");

  if (usuarioSelecionado) {
    nome = usuarioSelecionado.nome || nome;
    email = usuarioSelecionado.email || email;
    telefone = usuarioSelecionado.telefone || telefone;
    cooperativaId = usuarioSelecionado.cooperativa_id || cooperativaId;
  }

  if (isRegional()) {
    cooperativaId = usuarioLogado.cooperativa_id;
  }

  if (!usuarioSelecionado) {
    mostrarToast("Selecione um consultor para solicitar o cadastro.", "erro");
    return;
  }

  if (!podeSolicitarParaUsuario(usuarioSelecionado)) {
    mostrarToast("Você não tem permissão para solicitar cadastro para este consultor.", "erro");
    return;
  }

  if (!nome || !email || !cooperativaId) {
    mostrarToast("Preencha os dados obrigatórios da solicitação.", "erro");
    return;
  }

  if (!podeVerCooperativa(cooperativaId)) {
    mostrarToast("Você não tem permissão para solicitar cadastro nesta cooperativa.", "erro");
    return;
  }

  try {
    bloquearBotao("btnSalvarSolicitacao", true, "Enviando...");

    await chamarApi("criarTicket", {
      usuario_id: usuarioSelecionado.id,
      nome,
      email,
      telefone,
      cooperativa_id: cooperativaId,
      cooperativa: obterNomeCooperativa(cooperativaId),
      regional: obterRegionalDaCooperativa(cooperativaId),
      status: STATUS_TICKET.PENDENTE,
      observacao,
      solicitado_por: usuarioLogado.email,
      nome_solicitante: usuarioLogado.nome,
      perfil_solicitante: usuarioLogado.perfil,
      data_solicitacao: new Date().toISOString(),
    });

    mostrarToast("Solicitação enviada com sucesso.", "sucesso");

    limparFormularioSolicitacao();

    await carregarTickets();
    renderizarTickets();
    renderizarDashboard();
  } catch (erro) {
    console.error(erro);
  } finally {
    bloquearBotao("btnSalvarSolicitacao", false, "Enviar solicitação");
  }
}

function limparFormularioSolicitacao() {
  preencherValor("usuarioSolicitacao", "");
  preencherValor("nomeSolicitacao", "");
  preencherValor("emailSolicitacao", "");
  preencherValor("telefoneSolicitacao", "");
  preencherValor("observacaoSolicitacao", "");

  carregarSelectCooperativasSolicitacao();
  carregarSelectUsuariosSolicitacao();
}

/* =========================================================
   TICKETS / SOLICITAÇÕES
========================================================= */

function filtrarTicketsPorPermissao(lista) {
  if (podeVerTudo()) return lista;

  if (isRegional()) {
    return lista.filter(ticket => {
      return String(ticket.cooperativa_id) === String(usuarioLogado?.cooperativa_id);
    });
  }

  if (isConsultor()) {
    return lista.filter(ticket => {
      return String(ticket.email).toLowerCase() === String(usuarioLogado?.email).toLowerCase();
    });
  }

  return [];
}

function renderizarTickets() {
  const corpo = document.getElementById("listaTickets") || document.querySelector("#tabelaTickets tbody");

  if (!corpo) return;

  let lista = filtrarTicketsPorPermissao(tickets);

  const status = pegarValor("filtroStatusTicket");
  const busca = pegarValor("filtroBuscaTicket").toLowerCase();

  if (status) {
    lista = lista.filter(ticket => normalizarStatus(ticket.status) === normalizarStatus(status));
  }

  if (busca) {
    lista = lista.filter(ticket => {
      return (
        String(ticket.nome || "").toLowerCase().includes(busca) ||
        String(ticket.email || "").toLowerCase().includes(busca) ||
        String(ticket.telefone || "").toLowerCase().includes(busca) ||
        String(ticket.observacao || "").toLowerCase().includes(busca) ||
        String(ticket.solicitado_por || "").toLowerCase().includes(busca) ||
        String(obterNomeCooperativa(ticket.cooperativa_id) || "").toLowerCase().includes(busca)
      );
    });
  }

  lista.sort((a, b) => {
    const dataA = new Date(a.data_solicitacao || a.criado_em || 0).getTime();
    const dataB = new Date(b.data_solicitacao || b.criado_em || 0).getTime();

    return dataB - dataA;
  });

  corpo.innerHTML = "";

  if (!lista.length) {
    corpo.innerHTML = `
      <tr>
        <td colspan="9" class="text-center vazio">Nenhuma solicitação encontrada.</td>
      </tr>
    `;
    return;
  }

  lista.forEach(ticket => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapar(ticket.nome || "-")}</td>
      <td>${escapar(ticket.email || "-")}</td>
      <td>${escapar(ticket.telefone || "-")}</td>
      <td>${escapar(obterNomeCooperativa(ticket.cooperativa_id) || ticket.cooperativa || "-")}</td>
      <td>
        <span class="badge ${classeStatusTicket(ticket.status)}">
          ${escapar(ticket.status || "-")}
        </span>
      </td>
      <td>${escapar(ticket.solicitado_por || "-")}</td>
      <td>${formatarData(ticket.data_solicitacao || ticket.criado_em)}</td>
      <td>${escapar(ticket.observacao || "-")}</td>
      <td class="acoes">
        ${
          podeAlterarStatusTicket()
            ? `
              <button type="button" class="btn-acao" onclick="alterarStatusTicket('${escaparAtributo(ticket.id)}', '${STATUS_TICKET.CADASTRO_REALIZADO}')">
                Realizado
              </button>
              <button type="button" class="btn-acao secundario" onclick="alterarStatusTicket('${escaparAtributo(ticket.id)}', '${STATUS_TICKET.RECUSADO}')">
                Recusar
              </button>
            `
            : ""
        }

        ${
          podeExcluirTicket()
            ? `
              <button type="button" class="btn-acao perigo" onclick="excluirTicket('${escaparAtributo(ticket.id)}')">
                Excluir
              </button>
            `
            : ""
        }
      </td>
    `;

    corpo.appendChild(tr);
  });
}

async function alterarStatusTicket(id, novoStatus) {
  if (!podeAlterarStatusTicket()) {
    mostrarToast("Você não tem permissão para alterar status de ticket.", "erro");
    return;
  }

  const ticket = tickets.find(t => String(t.id) === String(id));

  if (!ticket) {
    mostrarToast("Ticket não encontrado.", "erro");
    return;
  }

  const confirmar = confirm(`Deseja alterar o status deste ticket para "${novoStatus}"?`);

  if (!confirmar) return;

  try {
    await chamarApi("alterarStatusTicket", {
      id,
      status: novoStatus,
      atualizado_por: usuarioLogado.email,
      data_atualizacao: new Date().toISOString(),
    });

    mostrarToast("Status do ticket atualizado com sucesso.", "sucesso");

    await carregarTickets();
    renderizarTickets();
    renderizarDashboard();
  } catch (erro) {
    console.error(erro);
  }
}

async function excluirTicket(id) {
  if (!podeExcluirTicket()) {
    mostrarToast("Você não tem permissão para excluir tickets.", "erro");
    return;
  }

  const ticket = tickets.find(t => String(t.id) === String(id));

  if (!ticket) {
    mostrarToast("Ticket não encontrado.", "erro");
    return;
  }

  const confirmar = confirm(
    `Deseja realmente excluir este ticket?\n\nEssa ação remove apenas a solicitação/ticket, não remove o usuário.`
  );

  if (!confirmar) return;

  try {
    await chamarApi("excluirTicket", {
      id,
      excluido_por: usuarioLogado.email,
      data_exclusao: new Date().toISOString(),
    });

    mostrarToast("Ticket excluído com sucesso.", "sucesso");

    await carregarTickets();
    renderizarTickets();
    renderizarDashboard();
  } catch (erro) {
    console.error(erro);
  }
}

/* =========================================================
   NORMALIZAÇÃO DE DADOS
========================================================= */

function normalizarUsuario(usuario = {}) {
  return {
    id: usuario.id || usuario.ID || usuario.codigo || usuario.codigo_usuario || "",
    nome: usuario.nome || usuario.Nome || usuario.name || "",
    email: usuario.email || usuario.Email || "",
    telefone: usuario.telefone || usuario.Telefone || usuario.whatsapp || usuario.Whatsapp || "",
    senha: usuario.senha || usuario.Senha || "",
    perfil: String(usuario.perfil || usuario.Perfil || "").trim().toUpperCase(),
    cooperativa_id:
      usuario.cooperativa_id ||
      usuario.id_cooperativa ||
      usuario.cooperativaId ||
      usuario.CooperativaID ||
      usuario.codigo_cooperativa ||
      usuario.CodigoCooperativa ||
      "",
    cooperativa:
      usuario.cooperativa ||
      usuario.Cooperativa ||
      usuario.nome_cooperativa ||
      usuario.NomeCooperativa ||
      "",
    status: String(usuario.status || usuario.Status || STATUS_USUARIO.ATIVO).trim().toUpperCase(),
    criado_em: usuario.criado_em || usuario.CriadoEm || usuario.data_criacao || "",
  };
}

function normalizarCooperativa(coop = {}) {
  return {
    id:
      coop.id ||
      coop.ID ||
      coop.codigo ||
      coop.codigo_cooperativa ||
      coop.CodigoCooperativa ||
      coop.cooperativa_id ||
      "",
    nome_cooperativa:
      coop.nome_cooperativa ||
      coop.NomeCooperativa ||
      coop.nome ||
      coop.Nome ||
      coop.cooperativa ||
      coop.Cooperativa ||
      "",
    regional: coop.regional || coop.Regional || "",
    status: String(coop.status || coop.Status || STATUS_USUARIO.ATIVO).trim().toUpperCase(),
  };
}

function normalizarTicket(ticket = {}) {
  return {
    id: ticket.id || ticket.ID || ticket.codigo || ticket.codigo_ticket || "",
    usuario_id: ticket.usuario_id || ticket.UsuarioID || ticket.codigo_usuario || "",
    nome: ticket.nome || ticket.Nome || "",
    email: ticket.email || ticket.Email || "",
    telefone: ticket.telefone || ticket.Telefone || ticket.whatsapp || "",
    cooperativa_id:
      ticket.cooperativa_id ||
      ticket.id_cooperativa ||
      ticket.cooperativaId ||
      ticket.CooperativaID ||
      ticket.codigo_cooperativa ||
      "",
    cooperativa:
      ticket.cooperativa ||
      ticket.Cooperativa ||
      ticket.nome_cooperativa ||
      ticket.NomeCooperativa ||
      "",
    regional: ticket.regional || ticket.Regional || "",
    status: String(ticket.status || ticket.Status || STATUS_TICKET.PENDENTE).trim().toUpperCase(),
    observacao: ticket.observacao || ticket.Observacao || ticket.observação || "",
    solicitado_por: ticket.solicitado_por || ticket.SolicitadoPor || "",
    nome_solicitante: ticket.nome_solicitante || ticket.NomeSolicitante || "",
    perfil_solicitante: ticket.perfil_solicitante || ticket.PerfilSolicitante || "",
    data_solicitacao:
      ticket.data_solicitacao ||
      ticket.DataSolicitacao ||
      ticket.criado_em ||
      ticket.CriadoEm ||
      "",
  };
}

/* =========================================================
   BUSCAS AUXILIARES
========================================================= */

function obterNomeCooperativa(cooperativaId) {
  if (!cooperativaId) return "";

  const coop = cooperativas.find(c => String(c.id) === String(cooperativaId));

  return coop?.nome_cooperativa || "";
}

function obterRegionalDaCooperativa(cooperativaId) {
  if (!cooperativaId) return "";

  const coop = cooperativas.find(c => String(c.id) === String(cooperativaId));

  return coop?.regional || "";
}

function normalizarStatus(status) {
  return String(status || "").trim().toUpperCase();
}

function formatarPerfil(perfil) {
  const p = String(perfil || "").trim().toUpperCase();

  const mapa = {
    CONSULTOR: "Consultor",
    REGIONAL: "Regional",
    ADMINISTRATIVO: "Administrativo",
    SUPER_ADMIN: "Super Admin",
  };

  return mapa[p] || perfil || "";
}

function classeStatusUsuario(status) {
  const s = normalizarStatus(status);

  if (s === STATUS_USUARIO.ATIVO) return "badge-sucesso";
  if (s === STATUS_USUARIO.INATIVO) return "badge-neutro";

  return "badge-neutro";
}

function classeStatusTicket(status) {
  const s = normalizarStatus(status);

  if (s === STATUS_TICKET.PENDENTE) return "badge-alerta";
  if (s === STATUS_TICKET.CADASTRO_REALIZADO) return "badge-sucesso";
  if (s === STATUS_TICKET.RECUSADO) return "badge-erro";

  return "badge-neutro";
}

/* =========================================================
   UI HELPERS
========================================================= */

function pegarValor(id) {
  const elemento = document.getElementById(id);
  return elemento ? String(elemento.value || "").trim() : "";
}

function preencherValor(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.value = valor ?? "";
}

function preencherTexto(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = texto ?? "";
}

function mostrarElemento(id) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.style.display = "";
}

function ocultarElemento(id) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.style.display = "none";
}

function controlarElementoPorPermissao(id, permitido) {
  const elemento = document.getElementById(id);
  if (!elemento) return;

  elemento.style.display = permitido ? "" : "none";
}

function bloquearBotao(id, bloquear, texto) {
  const botao = document.getElementById(id);

  if (!botao) return;

  botao.disabled = bloquear;

  if (texto) {
    botao.textContent = texto;
  }
}

function mostrarLoading(ativo) {
  const loading = document.getElementById("loading");

  if (loading) {
    loading.style.display = ativo ? "flex" : "none";
  }
}

function abrirModal(id) {
  const modal = document.getElementById(id);

  if (!modal) return;

  modal.classList.add("ativo");
  modal.style.display = "flex";
}

function fecharModal(id) {
  const modal = document.getElementById(id);

  if (!modal) return;

  modal.classList.remove("ativo");
  modal.style.display = "none";
}

function mostrarToast(mensagem, tipo = "info") {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = mensagem;
  toast.className = `toast ativo ${tipo}`;

  setTimeout(() => {
    toast.classList.remove("ativo");
  }, 3500);
}

function formatarData(data) {
  if (!data) return "-";

  const d = new Date(data);

  if (Number.isNaN(d.getTime())) {
    return String(data);
  }

  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function escapar(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escaparAtributo(valor) {
  return escapar(valor).replace(/`/g, "&#096;");
}

/* =========================================================
   EXPOSIÇÃO GLOBAL PARA ONCLICK DO HTML
========================================================= */

window.editarUsuario = editarUsuario;
window.alternarStatusUsuario = alternarStatusUsuario;
window.alterarStatusTicket = alterarStatusTicket;
window.excluirTicket = excluirTicket;
window.editarCooperativa = editarCooperativa;
