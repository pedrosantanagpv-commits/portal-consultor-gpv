export default async function handler(req, res) {

  // URL DO APPS SCRIPT
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjuhqEeG-PAji5QDZhCTZHI8tLAIxRk1WMqKVeLne73ZPKFxCTkMJcXaDDDI9OmZqc/exec';

  // LIBERA CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // PRE-FLIGHT
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ACEITA SOMENTE POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido.'
    });
  }

  try {

    // ENVIA PARA O APPS SCRIPT
    const resposta = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    // TEXTO BRUTO
    const texto = await resposta.text();

    let dados;

    try {

      // TENTA CONVERTER EM JSON
      dados = JSON.parse(texto);

    } catch (erroJSON) {

      console.error('Erro ao converter JSON:', texto);

      return res.status(500).json({
        success: false,
        message: 'Resposta inválida do Apps Script.',
        raw: texto
      });

    }

    // RETORNA PARA O FRONT
    return res.status(200).json(dados);

  } catch (erro) {

    console.error('Erro Proxy:', erro);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do proxy.',
      error: erro.message
    });

  }

}
