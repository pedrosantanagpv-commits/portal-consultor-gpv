export default async function handler(req, res) {
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyjuhqEeG-PAji5QDZhCTZHI8tLAIxRk1WMqKVeLne73ZPKFxCTkMJcXaDDDI9OmZqc/exec";

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Método não permitido" });
  }

  try {
    const resposta = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(req.body)
    });

    // O Google Apps Script retorna JSON, então lemos como .json() direto
    const dados = await resposta.json();
    
    // Devolvemos os dados reais para o seu app.js
    return res.status(200).json(dados);

  } catch (erro) {
    console.error("Erro no Proxy:", erro);
    return res.status(500).json({
      status: "error",
      message: "Erro na comunicação com o Google Scripts"
    });
  }
}
