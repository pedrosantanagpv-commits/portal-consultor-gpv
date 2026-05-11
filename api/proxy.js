export default async function handler(req, res) {

  const SCRIPT_URL = "const API = "/api/proxy";

  if (req.method !== "POST") {
    return res.status(405).json({
      status: "error",
      message: "Método não permitido"
    });
  }

  try {

    const resposta = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(req.body)
    });

    const texto = await resposta.text();

    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).send(texto);

  } catch (erro) {

    return res.status(500).json({
      status: "error",
      message: erro.toString()
    });

  }
}
