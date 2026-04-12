export default async function handler(req, res) {

  console.log("🚀 WEBHOOK CHAMADO:", req.method)

  /* ================= VALIDAR META ================= */
  if (req.method === "GET") {

    const VERIFY_TOKEN = process.env.VERIFY_TOKEN

    const mode = req.query["hub.mode"]
    const token = req.query["hub.verify_token"]
    const challenge = req.query["hub.challenge"]

    console.log("🔐 VALIDANDO...")
    console.log("mode:", mode)
    console.log("token:", token)

    if (mode && token === VERIFY_TOKEN) {
      console.log("✅ VALIDADO COM SUCESSO")
      return res.status(200).send(challenge)
    } else {
      console.log("❌ TOKEN INVALIDO")
      return res.status(403).end()
    }
  }

  /* ================= RECEBER EVENTOS ================= */
  if (req.method === "POST") {

    console.log("📩 EVENTO RECEBIDO")
    console.log(JSON.stringify(req.body, null, 2))

    return res.status(200).end()
  }

  return res.status(405).end()
}
