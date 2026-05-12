const API = "/api/proxy";

async function apiPost(payload) {
    try {
        const resposta = await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        return await resposta.json();
    } catch (erro) {
        return { status: "error", message: "Erro ao conectar." };
    }
}

async function login() {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const resultado = document.getElementById("resultado");

    const dados = await apiPost({ acao: "login", email, senha });
    if (dados.status === "success") {
        localStorage.setItem("usuario", JSON.stringify(dados));
        location.reload();
    } else {
        resultado.innerHTML = dados.message;
    }
}

function logout() {
    localStorage.removeItem("usuario");
    location.reload();
}

function abrirPagina(pagina) {
    const conteudo = document.getElementById("conteudo");
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    if (pagina === "inicio") {
        conteudo.innerHTML = `<h1>Bem-vindo, ${usuario.nome}</h1><div class="card">Selecione uma opção no menu lateral para começar.</div>`;
    }
    if (pagina === "usuarios") telaUsuarios();
    if (pagina === "cooperativas") telaCooperativas();
    if (pagina === "conteudos") telaConteudos();
}

async function telaUsuarios() {
    const conteudo = document.getElementById("conteudo");
    conteudo.innerHTML = "<h1>Usuários</h1><p>Carregando...</p>";
    const dados = await apiPost({ acao: "listarUsuarios" });
    if (dados.status === "success") {
        let html = `<h1>Usuários</h1><div class="card"><table><tr><th>Nome</th><th>Perfil</th></tr>`;
        dados.usuarios.forEach(u => {
            html += `<tr><td>${u.nome}</td><td>${u.perfil}</td></tr>`;
        });
        html += "</table></div>";
        conteudo.innerHTML = html;
    }
}

async function telaCooperativas() {
    const conteudo = document.getElementById("conteudo");
    conteudo.innerHTML = "<h1>Cooperativas</h1><p>Carregando...</p>";
    const dados = await apiPost({ acao: "listarCooperativas" });
    if (dados.status === "success") {
        let html = `<h1>Cooperativas</h1><div class="card">`;
        dados.cooperativas.forEach(c => {
            html += `<p>🏢 ${c.nome} - ${c.cidade}</p>`;
        });
        html += "</div>";
        conteudo.innerHTML = html;
    }
}

function telaConteudos() {
    document.getElementById("conteudo").innerHTML = `<h1>Conteúdos</h1><div class="card"><p>Acesse seus materiais aqui.</p></div>`;
}

window.onload = function() {
    const logado = localStorage.getItem("usuario");
    if (logado) {
        const user = JSON.parse(logado);
        document.getElementById("telaLogin").style.display = "none";
        document.getElementById("painel").style.display = "block";
        document.getElementById("usuarioNome").innerText = user.nome;
        document.getElementById("usuarioPerfil").innerText = user.perfil;
        
        if (user.perfil === "SUPER_ADMIN" || user.perfil === "ADMINISTRATIVO") {
            document.getElementById("menuAdmin").style.display = "block";
        }
        abrirPagina("inicio");
    }
};
