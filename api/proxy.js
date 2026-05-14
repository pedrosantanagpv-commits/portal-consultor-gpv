export default async function handler(req, res) {
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyjuhqEeG-PAji5QDZhCTZHI8tLAIxRk1WMqKVeLne73ZPKFxCTkMJcXaDDDI9OmZqc/exec";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      status: "erro",
      success: false,
      mensagem: "Método não permitido.",
      message: "Método não permitido."
    });
  }

  try {
    console.log("BODY RECEBIDO NO PROXY:", req.body);

    const respostaGoogle = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const texto = await respostaGoogle.text();

    console.log("STATUS GOOGLE:", respostaGoogle.status);
    console.log("RESPOSTA BRUTA GOOGLE:", texto);

    let dados;

    try {
      dados = JSON.parse(texto);
    } catch (erroJSON) {
      return res.status(500).json({
        status: "erro",
        success: false,
        mensagem: "Resposta inválida do Apps Script.",
        message: "Resposta inválida do Apps Script.",
        raw: texto
      });
    }

    if (dados?.success === false || dados?.status === "erro" || dados?.status === "error") {
      return res.status(200).json({
        ...dados,
        status: "erro",
        success: false,
        mensagem: dados.mensagem || dados.message || "Erro retornado pelo Apps Script.",
        message: dados.message || dados.mensagem || "Erro retornado pelo Apps Script."
      });
    }

    return res.status(200).json({
      ...dados,
      status: dados.status || "sucesso",
      success: dados.success !== false
    });

  } catch (erro) {
    console.error("ERRO NO PROXY:", erro);

    return res.status(500).json({
      status: "erro",
      success: false,
      mensagem: "Erro interno do proxy.",
      message: "Erro interno do proxy.",
      error: erro.message
    });
  }
}
