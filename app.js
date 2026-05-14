/* =========================================================
   PORTAL CONSULTOR GPV — APP.JS
   Compatível com o Google Apps Script atual

   Regras:
   - CONSULTOR: acessa a Central, não solicita cadastro.
   - REGIONAL: vê consultores da própria cooperativa e solicita cadastro.
   - ADMINISTRATIVO: vê tudo, solicita, altera status e exclui tickets.
   - SUPER_ADMIN: acesso total.
========================================================= */

const API_URL = "/api/proxy";

let usuarioLogado = null;
let usuarios = [];
let cooperativas = [];
let tickets = [];
let conteudosGerais = [];

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

  const btnAtualizarDados = document.getElementById("btnAtualizarDados");
  if (btnAtualizarDados) {
    btnAtualizarDados.addEventListener("click", carregarDadosIniciais);
  }

  const formUsuario = document.getElementById("formUsuario");
  if (formUsuario) {
    formUsuario.addEventListener("submit", salvarUsuario);
  }

  const btnNovoUsuario = document.getElementById("btnNovoUsuario");
  if (btnNovoUsuario) {
    btnNovoUsuario.addEventListener("click", abrirFormularioNovoUsuario);
  }

  const btnFecharModalUsuario = document.getElementById("btnFecharModalUsuario");
  if (btnFecharModalUsuario) {
    btnFecharModalUsuario.addEventListener("click", () => fecharModal("modalUsuario"));
  }

  const formCooperativa = document.getElementById("formCooperativa");
  if (formCooperativa) {
    formCooperativa.addEventListener("submit", salvarCooperativa);
  }

  const btnNovaCooperativa = document.getElementById("btnNovaCooperativa");
  if (btnNovaCooperativa) {
    btnNovaCooperativa.addEventListener("click", abrirFormularioNovaCooperativa);
  }

  const formSolicitacao = document.getElementById("formSolicitacao");
  if (formSolicitacao) {
    formSolicitacao.addEventListener("submit", salvarSolicitacao);
  }

  const selectCooperativaSolicitacao = document.getElementById("cooperativaSolicitacao");
  if (selectCooperativaSolicitacao) {
    selectCooperativaSolicitacao.addEventListener("change", carregarUsuariosDaCooperativaSelecionada);
  }

  const filtroBuscaUsuario = document.getElementById("filtroBuscaUsuario");
  if (filtroBuscaUsuario) {
    filtroBuscaUsuario.addEventListener("input", renderizarUsuarios);
  }

  const filtroStatusUsuario = document.getElementById("filtroStatusUsuario");
  if (filtroStatusUsuario) {
    filtroStatusUsuario.addEventListener("change", renderizarUsuarios);
  }

  const filtroPerfilUsuario = document.getElementById("filtroPerfilUsuario");
  if (filtroPerfilUsuario) {
    filtroPerfilUsuario.addEventListener("change", renderizarUsuarios);
  }

  const filtroBuscaTicket = document.getElementById("filtroBuscaTicket");
  if (filtroBuscaTicket) {
    filtroBuscaTicket.addEventListener("input", renderizarTickets);
  }

  const filtroStatusTicket = document.getElementById("filtroStatusTicket");
  if (filtroStatusTicket) {
    filtroStatusTicket.addEventListener("change", renderizarTickets);
  }
}

/* =========================================================
   API
========================================================= */

async function chamarApi(action, dados = {}) {
  try {
    console.log("CHAMANDO API:", {
      url: API_URL,
      action,
      dados,
    });

    const resposta = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        ...dados,
      }),
    });

    console.log("STATUS DA RESPOSTA:", resposta.status);

    const texto = await resposta.text();

    console.log("TEXTO BRUTO DA API:", texto);

    let json;

    try {
      json = JSON.parse(texto);
    } catch (erroJson) {
      console.error("A resposta não é JSON válido:", texto);
      throw new Error("O servidor não retornou um JSON válido.");
    }

    console.log("JSON DA API:", json);

    if (!json || json.success === false || json.status === "erro" || json.status === "error") {
      throw new Error(json?.message || json?.mensagem || "Erro ao processar solicitação.");
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

  console.log("FUNÇÃO fazerLogin FOI CHAMADA");

  const email = pegarValor("email") || pegarValor("loginEmail");
  const senha = pegarValor("senha") || pegarValor("loginSenha");

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

    console.log("RESPOSTA LOGIN:", resposta);

    usuarioLogado = normalizarUsuario(resposta.usuario || resposta.dados || resposta.data || resposta);

    if (!usuarioLogado || !usuarioLogado.email) {
      console.error("Usuário não encontrado na resposta:", resposta);
      mostrarToast("Não foi possível validar o usuário.", "erro");
      return;
    }

    if (normalizarStatus(usuarioLogado.status) !== STATUS_USUARIO.ATIVO) {
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
  conteudosGerais = [];

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
  preencherTexto("nomeUsuarioLogado", usuarioLogado?.nome || "Usuário");
  preencherTexto("perfilUsuarioLogado", formatarPerfil(usuarioLogado?.perfil || ""));

  const cooperativaNome =
    obterNomeCooperativa(usuarioLogado?.cooperativa_id) ||
    usuarioLogado?.cooperativa ||
    "Sem cooperativa";

  preencherTexto("cooperativaUsuarioLogado", cooperativaNome);
}

/* =========================================================
   PERFIS / PERMISSÕES
========================================================= */

function perfilAtual() {
  return normalizarPerfil(usuarioLogado?.perfil || "");
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
  return podeVerTudo() || isRegional();
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
    return normalizarPerfil(usuario.perfil) === PERFIS.CONSULTOR;
  }

  if (isRegional()) {
    return (
      String(usuario.cooperativa_id) === String(usuarioLogado?.cooperativa_id) &&
      normalizarPerfil(usuario.perfil) === PERFIS.CONSULTOR
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

  controlarElementoPorPermissao("menuUsuarios", podeVerAreaUsuarios());
  controlarElementoPorPermissao("menuCooperativas", podeGerenciarCooperativas());
  controlarElementoPorPermissao("menuProcessos", podeVerAreaTickets());

  controlarElementoPorPermissao("btnNovoUsuario", podeGerenciarUsuarios());
  controlarElementoPorPermissao("btnNovaCooperativa", podeGerenciarCooperativas());
  controlarElementoPorPermissao("btnAbrirSolicitacaoCadastro", podeSolicitarCadastroConsultor());

  controlarElementoPorPermissao("filtroPerfilUsuario", podeVerTudo());

  const tituloSolicitacao = document.getElementById("tituloSolicitacao");
  if (tituloSolicitacao) {
    tituloSolicitacao.textContent = "Solicitar Cadastro de Consultor";
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
    await carregarPalavraChave();

    configurarFormularioSolicitacao();
    renderizarDashboard();
    renderizarUsuarios();
    renderizarCooperativas();
    renderizarTickets();
    preencherDadosUsuarioLogado();
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
  if (isConsultor()) {
    tickets = [];
    return;
  }

  const resposta = await chamarApi("listarConsultores", {
    perfil: usuarioLogado?.perfil || "",
    cooperativa_id: usuarioLogado?.cooperativa_id || "",
    usuario_logado_id: usuarioLogado?.id || "",
  });

  const lista = resposta.consultores || resposta.tickets || resposta.dados || [];

  tickets = lista.map(normalizarTicket);
}

async function carregarPalavraChave() {
  try {
    const resposta = await chamarApi("buscarPalavraChave");
    preencherTexto("palavraChaveDia", resposta.palavra || "---");
  } catch (erro) {
    console.error(erro);
    preencherTexto("palavraChaveDia", "---");
  }
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

  preencherTexto("dashUsuarios", usuariosPermitidos.length);
  preencherTexto("dashAtivos", ativos);
  preencherTexto("dashConsultores", usuariosPermitidos.filter(u => normalizarPerfil(u.perfil) === PERFIS.CONSULTOR).length);
  preencherTexto("dashRegionais", usuariosPermitidos.filter(u => normalizarPerfil(u.perfil) === PERFIS.REGIONAL).length);
  preencherTexto("dashCooperativas", cooperativas.length);

  preencherTexto("miniTotalUsuarios", usuariosPermitidos.length);
  preencherTexto("miniUsuariosAtivos", ativos);
  preencherTexto("miniUsuariosInativos", inativos);
  preencherTexto("miniAdmins", usuariosPermitidos.filter(u => normalizarPerfil(u.perfil) === PERFIS.ADMINISTRATIVO || normalizarPerfil(u.perfil) === PERFIS.SUPER_ADMIN).length);
  preencherTexto("miniRegionais", usuariosPermitidos.filter(u => normalizarPerfil(u.perfil) === PERFIS.REGIONAL).length);
  preencherTexto("miniConsultores", usuariosPermitidos.filter(u => normalizarPerfil(u.perfil) === PERFIS.CONSULTOR).length);
}

/* =========================================================
   USUÁRIOS
========================================================= */

function filtrarUsuariosPorPermissao(lista) {
  if (podeVerTudo()) return lista;

  if (isRegional()) {
    return lista.filter(usuario => {
      return (
        String(usuario.cooperativa_id) === String(usuarioLogado?.cooperativa_id) &&
        normalizarPerfil(usuario.perfil) === PERFIS.CONSULTOR
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
  const corpo =
    document.getElementById("listaUsuarios") ||
    document.getElementById("tabelaUsuariosBody") ||
    document.querySelector("#tabelaUsuarios tbody");

  if (!corpo) return;

  let lista = filtrarUsuariosPorPermissao(usuarios);

  const status = pegarValor("filtroStatusUsuario");
  const perfil = pegarValor("filtroPerfilUsuario");
  const busca = (pegarValor("filtroBuscaUsuario") || pegarValor("buscaUsuario")).toLowerCase();

  if (status) {
    lista = lista.filter(usuario => normalizarStatus(usuario.status) === normalizarStatus(status));
  }

  if (perfil && podeVerTudo()) {
    lista = lista.filter(usuario => normalizarPerfil(usuario.perfil) === normalizarPerfil(perfil));
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
        <td colspan="7" class="empty-table">Nenhum usuário encontrado.</td>
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
      <td><span class="tag">${escapar(formatarPerfil(usuario.perfil) || "-")}</span></td>
      <td>${escapar(obterNomeCooperativa(usuario.cooperativa_id) || usuario.cooperativa || "-")}</td>
      <td>
        <span class="badge ${classeStatusUsuario(usuario.status)}">
          ${escapar(usuario.status || "-")}
        </span>
      </td>
      <td class="acoes">
        ${
          podeGerenciarUsuarios()
            ? `<button type="button" class="btn-acao" onclick="editarUsuario('${escaparAtributo(usuario.id)}')">Editar</button>`
            : `<span class="acao-protegida">Protegido</span>`
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

function abrirModalNovoUsuario() {
  abrirFormularioNovoUsuario();
}

function limparFormularioUsuario() {
  preencherValor("usuarioId", "");
  preencherValor("usuarioNome", "");
  preencherValor("usuarioEmail", "");
  preencherValor("usuarioTelefone", "");
  preencherValor("usuarioSenha", "");
  preencherValor("usuarioPerfil", "");
  preencherValor("usuarioCooperativa", "");
  preencherValor("usuarioPermissoes", "");
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
  preencherValor("usuarioPermissoes", usuario.permissoes || "");
  preencherValor("usuarioStatus", usuario.status);
  preencherValor("usuarioSenha", "");

  preencherTexto("modalUsuarioTitulo", "Editar Usuário");

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
  const permissoes = pegarValor("usuarioPermissoes");
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
      permissoes,
      status,
      usuario_logado_id: usuarioLogado.id,
      usuario_logado_perfil: usuarioLogado.perfil,
    };

    if (id) {
      await chamarApi("editarUsuario", payload);
      mostrarToast("Usuário atualizado com sucesso.", "sucesso");
    } else {
      await chamarApi("salvarUsuario", payload);
      mostrarToast("Usuário cadastrado com sucesso.", "sucesso");
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

  const confirmar = confirm(`Deseja realmente alterar o status de ${usuario.nome}?`);

  if (!confirmar) return;

  try {
    await chamarApi("alterarStatusUsuario", {
      id,
      usuario_logado_id: usuarioLogado.id,
      usuario_logado_perfil: usuarioLogado.perfil,
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
  const corpo =
    document.getElementById("listaCooperativas") ||
    document.getElementById("tabelaCooperativasBody") ||
    document.querySelector("#tabelaCooperativas tbody");

  if (!corpo) return;

  let lista = cooperativas;

  if (!podeVerTudo()) {
    lista = cooperativas.filter(coop => String(coop.id) === String(usuarioLogado?.cooperativa_id));
  }

  corpo.innerHTML = "";

  if (!lista.length) {
    corpo.innerHTML = `
      <tr>
        <td colspan="4" class="empty-table">Nenhuma cooperativa encontrada.</td>
      </tr>
    `;
    return;
  }

  lista.forEach(coop => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapar(coop.nome_cooperativa || "-")}</td>
      <td>${escapar(coop.regional || coop.regional_responsavel || "-")}</td>
      <td>
        <span class="badge ${classeStatusUsuario(coop.status)}">
          ${escapar(coop.status || "-")}
        </span>
      </td>
      <td class="acoes">
        ${
          podeGerenciarCooperativas()
            ? `<button type="button" class="btn-acao" onclick="editarCooperativa('${escaparAtributo(coop.id)}')">Editar</button>`
            : `<span class="acao-protegida">Protegido</span>`
        }
      </td>
    `;

    corpo.appendChild(tr);
  });
}

function abrirFormularioNovaCooperativa() {
  if (!podeGerenciarCooperativas()) {
    mostrarToast("Você não tem permissão para criar cooperativas.", "erro");
    return;
  }

  preencherValor("cooperativaId", "");
  preencherValor("coopNome", "");
  preencherValor("coopRegional", "");
  preencherValor("coopCidade", "");
  preencherValor("coopStatus", "ATIVO");

  abrirModal("modalCooperativa");
}

function abrirModalNovaCooperativa() {
  abrirFormularioNovaCooperativa();
}

async function salvarCooperativa(event) {
  event.preventDefault();

  if (!podeGerenciarCooperativas()) {
    mostrarToast("Você não tem permissão para salvar cooperativas.", "erro");
    return;
  }

  const nome = pegarValor("coopNome");
  const regional = pegarValor("coopRegional");
  const cidade = pegarValor("coopCidade");
  const status = pegarValor("coopStatus") || "ATIVA";

  if (!nome) {
    mostrarToast("Informe o nome da cooperativa.", "erro");
    return;
  }

  try {
    bloquearBotao("btnSalvarCooperativa", true, "Salvando...");

    await chamarApi("criarCooperativa", {
      nome_cooperativa: nome,
      nome,
      regional_responsavel: regional,
      cidade,
      status,
    });

    mostrarToast("Cooperativa cadastrada com sucesso.", "sucesso");

    fecharModal("modalCooperativa");

    await carregarCooperativas();
    configurarFormularioSolicitacao();
    renderizarCooperativas();
    renderizarDashboard();
  } catch (erro) {
    console.error(erro);
  } finally {
    bloquearBotao("btnSalvarCooperativa", false, "Salvar Cooperativa");
  }
}

function editarCooperativa(id) {
  if (!podeGerenciarCooperativas()) {
    mostrarToast("Você não tem permissão para editar cooperativas.", "erro");
    return;
  }

  mostrarToast("A edição de cooperativa ainda não está configurada no Apps Script.", "aviso");
}

/* =========================================================
   SOLICITAÇÃO DE CADASTRO DE CONSULTOR
========================================================= */

function configurarFormularioSolicitacao() {
  carregarSelectCooperativasSolicitacao();
  carregarSelectUsuariosSolicitacao();

  const area = document.getElementById("areaSolicitacaoCadastro");
  if (area) {
    area.style.display = podeSolicitarCadastroConsultor() ? "" : "none";
  }
}

function abrirModalConsultor() {
  if (!podeSolicitarCadastroConsultor()) {
    mostrarToast("Você não tem permissão para solicitar cadastro de consultor.", "erro");
    return;
  }

  configurarFormularioSolicitacao();
  abrirModal("modalSolicitacaoCadastro");
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
    lista = usuarios.filter(usuario => normalizarPerfil(usuario.perfil) === PERFIS.CONSULTOR);
    select.innerHTML = `<option value="">Selecione o consultor</option>`;
  } else if (isRegional()) {
    lista = usuarios.filter(usuario => {
      return (
        String(usuario.cooperativa_id) === String(usuarioLogado?.cooperativa_id) &&
        normalizarPerfil(usuario.perfil) === PERFIS.CONSULTOR
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

  let lista = usuarios.filter(usuario => normalizarPerfil(usuario.perfil) === PERFIS.CONSULTOR);

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

  if (!usuarioSelecionado) {
    mostrarToast("Selecione um consultor para solicitar o cadastro.", "erro");
    return;
  }

  if (!podeSolicitarParaUsuario(usuarioSelecionado)) {
    mostrarToast("Você não tem permissão para solicitar cadastro para este consultor.", "erro");
    return;
  }

  let cooperativaId = usuarioSelecionado.cooperativa_id || pegarValor("cooperativaSolicitacao");

  if (isRegional()) {
    cooperativaId = usuarioLogado.cooperativa_id;
  }

  if (!cooperativaId) {
    mostrarToast("Cooperativa não informada.", "erro");
    return;
  }

  try {
    bloquearBotao("btnSalvarSolicitacao", true, "Enviando...");

    await chamarApi("salvarConsultor", {
      nome: usuarioSelecionado.nome || pegarValor("nomeSolicitacao"),
      email: usuarioSelecionado.email || pegarValor("emailSolicitacao"),
      telefone: usuarioSelecionado.telefone || pegarValor("telefoneSolicitacao"),
      cooperativa_id: cooperativaId,
      regional: obterRegionalDaCooperativa(cooperativaId),
      observacao: pegarValor("observacaoSolicitacao"),
      solicitante_perfil: usuarioLogado.perfil,
      solicitante_nome: usuarioLogado.nome,
    });

    mostrarToast("Solicitação enviada com sucesso.", "sucesso");

    limparFormularioSolicitacao();
    fecharModal("modalSolicitacaoCadastro");

    await carregarTickets();
    renderizarTickets();
    renderizarDashboard();
  } catch (erro) {
    console.error(erro);
  } finally {
    bloquearBotao("btnSalvarSolicitacao", false, "Enviar Solicitação");
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
   TICKETS / PROCESSOS
========================================================= */

function filtrarTicketsPorPermissao(lista) {
  if (podeVerTudo()) return lista;

  if (isRegional()) {
    return lista.filter(ticket => {
      return String(ticket.cooperativa_id) === String(usuarioLogado?.cooperativa_id);
    });
  }

  return [];
}

function renderizarTickets() {
  const corpo =
    document.getElementById("listaTickets") ||
    document.getElementById("tabelaProcessosBody") ||
    document.querySelector("#tabelaTickets tbody");

  if (!corpo) return;

  let lista = filtrarTicketsPorPermissao(tickets);

  const status = pegarValor("filtroStatusTicket") || pegarValor("filtroStatusProcesso");
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
        String(ticket.regional || "").toLowerCase().includes(busca) ||
        String(obterNomeCooperativa(ticket.cooperativa_id) || "").toLowerCase().includes(busca)
      );
    });
  }

  lista.sort((a, b) => {
    const dataA = new Date(a.data_solicitacao || 0).getTime();
    const dataB = new Date(b.data_solicitacao || 0).getTime();
    return dataB - dataA;
  });

  corpo.innerHTML = "";

  if (!lista.length) {
    corpo.innerHTML = `
      <tr>
        <td colspan="9" class="empty-table">Nenhum processo encontrado.</td>
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
      <td>${escapar(ticket.solicitado_por || ticket.nome_solicitante || "-")}</td>
      <td>${formatarData(ticket.data_solicitacao)}</td>
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
    mostrarToast("Você não tem permissão para alterar status de processo.", "erro");
    return;
  }

  const ticket = tickets.find(t => String(t.id) === String(id));

  if (!ticket) {
    mostrarToast("Processo não encontrado.", "erro");
    return;
  }

  const confirmar = confirm(`Deseja alterar o status deste processo para "${novoStatus}"?`);

  if (!confirmar) return;

  try {
    await chamarApi("atualizarStatusConsultor", {
      id,
      status: novoStatus,
      atualizado_por: usuarioLogado.email,
    });

    mostrarToast("Status atualizado com sucesso.", "sucesso");

    await carregarTickets();
    renderizarTickets();
    renderizarDashboard();
  } catch (erro) {
    console.error(erro);
  }
}

async function excluirTicket(id) {
  if (!podeExcluirTicket()) {
    mostrarToast("Você não tem permissão para excluir solicitações.", "erro");
    return;
  }

  const ticket = tickets.find(t => String(t.id) === String(id));

  if (!ticket) {
    mostrarToast("Solicitação não encontrada.", "erro");
    return;
  }

  const confirmar = confirm(
    `Deseja realmente excluir este ticket?\n\nEssa ação remove apenas a solicitação, não remove o usuário.`
  );

  if (!confirmar) return;

  try {
    await chamarApi("excluirTicketConsultor", {
      id,
      perfil: usuarioLogado.perfil,
      excluido_por: usuarioLogado.email,
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
   COMPATIBILIDADE COM FUNÇÕES ANTIGAS DO HTML
========================================================= */

function filtrarUsuarios() {
  renderizarUsuarios();
}

function filtrarProcessos() {
  renderizarTickets();
}

function carregarConsultores() {
  carregarTickets().then(() => {
    renderizarTickets();
    renderizarDashboard();
  });
}

function salvarConsultor(event) {
  salvarSolicitacao(event);
}

/* =========================================================
   NORMALIZAÇÃO
========================================================= */

function normalizarUsuario(usuario = {}) {
  return {
    id:
      usuario.id ||
      usuario.ID ||
      usuario.codigo ||
      usuario.Codigo ||
      usuario.codigo_usuario ||
      usuario.CodigoUsuario ||
      usuario["Código"] ||
      "",

    nome:
      usuario.nome ||
      usuario.Nome ||
      usuario.name ||
      usuario.Name ||
      usuario["Nome"] ||
      usuario["NOME"] ||
      "",

    email:
      usuario.email ||
      usuario.Email ||
      usuario.EMAIL ||
      usuario["E-mail"] ||
      usuario["e-mail"] ||
      usuario["Email"] ||
      usuario["EMAIL"] ||
      "",

    telefone:
      usuario.telefone ||
      usuario.Telefone ||
      usuario.TELEFONE ||
      usuario.whatsapp ||
      usuario.Whatsapp ||
      usuario.WHATSAPP ||
      usuario["Telefone"] ||
      usuario["WhatsApp"] ||
      "",

    senha:
      usuario.senha ||
      usuario.Senha ||
      usuario.SENHA ||
      "",

    perfil: normalizarPerfil(
      usuario.perfil ||
      usuario.Perfil ||
      usuario.PERFIL ||
      usuario["Perfil"] ||
      ""
    ),

    cooperativa_id:
      usuario.cooperativa_id ||
      usuario.id_cooperativa ||
      usuario.cooperativaId ||
      usuario.CooperativaID ||
      usuario.codigo_cooperativa ||
      usuario.CodigoCooperativa ||
      usuario["Cooperativa ID"] ||
      usuario["ID Cooperativa"] ||
      usuario["Código Cooperativa"] ||
      "",

    cooperativa:
      usuario.cooperativa ||
      usuario.Cooperativa ||
      usuario.COOPERATIVA ||
      usuario.nome_cooperativa ||
      usuario.NomeCooperativa ||
      usuario["Cooperativa"] ||
      usuario["Nome Cooperativa"] ||
      "",

    permissoes:
      usuario.permissoes ||
      usuario.Permissoes ||
      usuario.Permissões ||
      usuario["Permissões"] ||
      "",

    status: normalizarStatus(
      usuario.status ||
      usuario.Status ||
      usuario.STATUS ||
      usuario["Status"] ||
      STATUS_USUARIO.ATIVO
    ),

    data_criacao:
      usuario.data_criacao ||
      usuario.criado_em ||
      usuario.CriadoEm ||
      usuario["Data Criação"] ||
      "",

    ultimo_acesso:
      usuario.ultimo_acesso ||
      usuario.UltimoAcesso ||
      usuario["Último Acesso"] ||
      "",
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

    regional:
      coop.regional ||
      coop.Regional ||
      coop.regional_responsavel ||
      coop.RegionalResponsavel ||
      "",

    regional_responsavel:
      coop.regional_responsavel ||
      coop.RegionalResponsavel ||
      coop.regional ||
      "",

    cidade:
      coop.cidade ||
      coop.Cidade ||
      "",

    status: normalizarStatus(
      coop.status ||
      coop.Status ||
      STATUS_USUARIO.ATIVO
    ),

    data_criacao:
      coop.data_criacao ||
      coop.criado_em ||
      "",
  };
}

function normalizarTicket(ticket = {}) {
  return {
    id:
      ticket.id ||
      ticket.ID ||
      ticket.codigo ||
      ticket.codigo_ticket ||
      "",

    usuario_id:
      ticket.usuario_id ||
      ticket.UsuarioID ||
      ticket.codigo_usuario ||
      "",

    nome:
      ticket.nome ||
      ticket.Nome ||
      "",

    email:
      ticket.email ||
      ticket.Email ||
      "",

    telefone:
      ticket.telefone ||
      ticket.Telefone ||
      ticket.whatsapp ||
      "",

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

    regional:
      ticket.regional ||
      ticket.Regional ||
      "",

    status: normalizarStatus(
      ticket.status ||
      ticket.Status ||
      STATUS_TICKET.PENDENTE
    ),

    observacao:
      ticket.observacao ||
      ticket.Observacao ||
      ticket.observação ||
      "",

    solicitado_por:
      ticket.solicitado_por ||
      ticket.SolicitadoPor ||
      "",

    nome_solicitante:
      ticket.nome_solicitante ||
      ticket.NomeSolicitante ||
      "",

    perfil_solicitante:
      ticket.perfil_solicitante ||
      ticket.PerfilSolicitante ||
      "",

    data_solicitacao:
      ticket.data_solicitacao ||
      ticket.DataSolicitacao ||
      ticket.criado_em ||
      ticket.CriadoEm ||
      "",

    data_conclusao:
      ticket.data_conclusao ||
      ticket.DataConclusao ||
      "",
  };
}

/* =========================================================
   AUXILIARES
========================================================= */

function obterNomeCooperativa(cooperativaId) {
  if (!cooperativaId) return "";

  const coop = cooperativas.find(c => String(c.id) === String(cooperativaId));

  return coop?.nome_cooperativa || "";
}

function obterRegionalDaCooperativa(cooperativaId) {
  if (!cooperativaId) return "";

  const coop = cooperativas.find(c => String(c.id) === String(cooperativaId));

  return coop?.regional || coop?.regional_responsavel || "";
}

function normalizarStatus(status) {
  return String(status || "").trim().toUpperCase();
}

function normalizarPerfil(perfil) {
  return String(perfil || "").trim().toUpperCase();
}

function formatarPerfil(perfil) {
  const p = normalizarPerfil(perfil);

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

  if (s === STATUS_USUARIO.ATIVO || s === "ATIVA") return "badge-sucesso";
  if (s === STATUS_USUARIO.INATIVO || s === "INATIVA") return "badge-erro";

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

window.fazerLogin = fazerLogin;
window.sair = sair;

window.abrirModal = abrirModal;
window.fecharModal = fecharModal;

window.editarUsuario = editarUsuario;
window.alternarStatusUsuario = alternarStatusUsuario;
window.salvarUsuario = salvarUsuario;
window.abrirModalNovoUsuario = abrirModalNovoUsuario;

window.editarCooperativa = editarCooperativa;
window.salvarCooperativa = salvarCooperativa;
window.abrirModalNovaCooperativa = abrirModalNovaCooperativa;

window.abrirModalConsultor = abrirModalConsultor;
window.salvarConsultor = salvarConsultor;
window.alterarStatusTicket = alterarStatusTicket;
window.excluirTicket = excluirTicket;

window.filtrarUsuarios = filtrarUsuarios;
window.filtrarProcessos = filtrarProcessos;
window.carregarConsultores = carregarConsultores;
window.carregarUsuarios = carregarUsuarios;
window.carregarCooperativas = carregarCooperativas;
window.carregarTickets = carregarTickets;
