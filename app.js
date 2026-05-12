const API = "/api/proxy";
let listaUsuariosLocal = []; // Para busca em tempo real

async function apiPost(payload) {
    try {
        const resposta = await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        return await resposta.json();
    } catch (erro) {
        return { status: "error", message: "Erro de conexão." };
    }
}

// --- SISTEMA DE NAVEGAÇÃO ---
function abrirPagina(pagina) {
    const conteudo = document.getElementById("conteudo");
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    if (pagina === "inicio") carregarDashboardAdmin();
    if (pagina === "usuarios") telaUsuarios();
    if (pagina === "cooperativas") telaCooperativas();
    if (pagina === "conteudos") telaConteudos();
}

// --- GESTÃO DE USUÁRIOS (RESTAURADA) ---
async function telaUsuarios() {
    const conteudo = document.getElementById("conteudo");
    conteudo.innerHTML = `
        <div class="header-acoes">
            <h1>Gerenciar Usuários</h1>
            <button class="btn-atualizar" onclick="modalUsuario()">+ Novo Usuário</button>
        </div>
        <div class="card">
            <div class="filtros">
                <input type="text" id="buscaUser" placeholder="Pesquisar por nome..." onkeyup="filtrarUsuarios()">
            </div>
            <table id="tabelaUsuarios">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Perfil</th>
                        <th>Cooperativa</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="listaUsuariosBody">
                    <tr><td colspan="4">Carregando usuários...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    const dados = await apiPost({ acao: "listarUsuarios" });
    if (dados.status === "success") {
        listaUsuariosLocal = dados.usuarios;
        renderizarTabela(listaUsuariosLocal);
    }
}

function renderizarTabela(lista) {
    const body = document.getElementById("listaUsuariosBody");
    body.innerHTML = lista.map(u => `
        <tr>
            <td>${u.nome}</td>
            <td><span class="badge">${u.perfil}</span></td>
            <td>${u.cooperativa || '-'}</td>
            <td>
                <button class="btn-edit" onclick="modalUsuario('${u.id}')">✏️</button>
                <button class="btn-del" onclick="deletarUsuario('${u.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function filtrarUsuarios() {
    const termo = document.getElementById("buscaUser").value.toLowerCase();
    const filtrados = listaUsuariosLocal.filter(u => u.nome.toLowerCase().includes(termo));
    renderizarTabela(filtrados);
}

// --- FUNÇÕES DE CRUD (EXCLUIR/CRIAR) ---
async function deletarUsuario(id) {
    if (confirm("Deseja realmente excluir este usuário?")) {
        const res = await apiPost({ acao: "deletarUsuario", id });
        if (res.status === "success") telaUsuarios();
        else alert("Erro ao excluir");
    }
}

// --- DASHBOARD COM GRÁFICOS (RESTAURADO) ---
async function carregarDashboardAdmin() {
    const conteudo = document.getElementById("conteudo");
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    
    conteudo.innerHTML = `
        <h1>Olá, ${usuario.nome}! 👋</h1>
        <div class="grid-dashboard-premium">
            <div class="card-premium border-amarelo"><div><p>Total Usuários</p><h2 id="dashTotal">...</h2></div></div>
            <div class="card-premium border-verde"><div><p>Ativos</p><h2 id="dashAtivos">...</h2></div></div>
            <div class="card-premium border-azul"><div><p>Cooperativas</p><h2 id="dashCoops">...</h2></div></div>
        </div>
        <div class="row-graficos">
            <div class="card"><h3>Crescimento</h3><canvas id="graficoLinha"></canvas></div>
            <div class="card"><h3>Perfil</h3><canvas id="graficoDonut"></canvas></div>
        </div>
    `;

    const dados = await apiPost({ acao: "dashboardAdmin" });
    if (dados.status === "success") {
        document.getElementById("dashTotal").innerText = dados.totalUsuarios;
        document.getElementById("dashAtivos").innerText = dados.usuariosAtivos;
        document.getElementById("dashCoops").innerText = dados.totalCooperativas;
        renderizarGraficos(dados);
    }
}

// --- LOGIN E START ---
async function login() {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const res = await apiPost({ acao: "login", email, senha });
    if (res.status === "success") {
        localStorage.setItem("usuario", JSON.stringify(res));
        location.reload();
    } else document.getElementById("resultado").innerHTML = res.message;
}

function logout() { localStorage.removeItem("usuario"); location.reload(); }

window.onload = function() {
    const user = localStorage.getItem("usuario");
    if (user) {
        const u = JSON.parse(user);
        document.getElementById("telaLogin").style.display = "none";
        document.getElementById("painel").style.display = "block";
        document.getElementById("usuarioNome").innerText = u.nome;
        document.getElementById("usuarioPerfil").innerText = u.perfil;
        if (u.perfil === "SUPER_ADMIN" || u.perfil === "ADMINISTRATIVO") {
            document.getElementById("menuAdmin").style.display = "block";
        }
        abrirPagina("inicio");
    }
};
