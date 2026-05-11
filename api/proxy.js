export default async function handler(req, res) {

  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyjuhqEeG-PAji5QDZhCTZHI8tLAIxRk1WMqKVeLne73ZPKFxCTkMJcXaDDDI9OmZqc/exec"

  if (req.method !== "POST") {
    return res.status(405).json({
      status: "error",
      message: "Método não permitido"
    });
  }

  try {

    const resposta = await fetch(APPS_SCRIPT_URL,{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const texto = await resposta.text();
    res.status(200).send(texto);
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).send(texto);

  } catch (erro) {

    return res.status(500).json({
      status: "error",
      message: erro.toString()
    });

  }
}
