import { createClient } from "@supabase/supabase-js";

// 🔥 SUPABASE
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// 🔥 FUNÇÃO PRINCIPAL
export default async function handler(req, res) {

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 WEBHOOK INICIADO");
  console.log("METHOD:", req.method);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {

    /* ================= 🔐 VALIDAÇÃO META ================= */

    if (req.method === "GET") {

      const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      console.log("🔐 VALIDANDO WEBHOOK...");
      console.log("mode:", mode);
      console.log("token recebido:", token);

      if (mode && token === VERIFY_TOKEN) {
        console.log("✅ WEBHOOK VALIDADO");
        return res.status(200).send(challenge);
      } else {
        console.log("❌ TOKEN INVÁLIDO");
        return res.status(403).end();
      }
    }

    /* ================= 📩 RECEBER EVENTOS ================= */

    if (req.method === "POST") {

      const body = req.body;

      console.log("📥 BODY RECEBIDO:");
      console.log(JSON.stringify(body, null, 2));

      const change = body?.entry?.[0]?.changes?.[0]?.value;

      if (!change) {
        console.log("⚠️ EVENTO SEM CHANGE");
        return res.status(200).end();
      }

      /* ================= STATUS ================= */

      if (change.statuses) {
        console.log("📩 STATUS RECEBIDO:", change.statuses[0]?.status);
        return res.status(200).end();
      }

      /* ================= MENSAGEM ================= */

      const msg = change?.messages?.[0];

      if (!msg) {
        console.log("⚠️ SEM MENSAGEM");
        return res.status(200).end();
      }

      const from = msg.from;
      const text = msg.text?.body || "";

      console.log("📨 NOVA MENSAGEM");
      console.log("DE:", from);
      console.log("TEXTO:", text);

      /* ================= SALVAR CLIENTE ================= */

      try {
        await supabase.from("mensagens").insert({
          numero: from,
          mensagem: text,
          origem: "cliente",
          created_at: new Date().toISOString()
        });
        console.log("💾 SALVO NO SUPABASE");
      } catch (err) {
        console.log("❌ ERRO SUPABASE:", err.message);
      }

      /* ================= IA ================= */

      let resposta = "Recebi sua mensagem 😊";

      try {

        const ai = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "Você é atendente do Mercatto Delícia. Responda de forma simpática, rápida e objetiva."
              },
              {
                role: "user",
                content: text
              }
            ]
          })
        });

        const json = await ai.json();

        resposta =
          json?.choices?.[0]?.message?.content ||
          "Desculpe, não consegui responder agora 😕";

        console.log("🤖 RESPOSTA IA:", resposta);

      } catch (err) {
        console.log("❌ ERRO OPENAI:", err.message);
      }

      /* ================= ENVIAR WHATSAPP ================= */

      try {

        const phoneId = change?.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_ID;

        await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: { body: resposta }
          })
        });

        console.log("📤 MENSAGEM ENVIADA");

      } catch (err) {
        console.log("❌ ERRO WHATSAPP:", err.message);
      }

      /* ================= SALVAR RESPOSTA ================= */

      try {
        await supabase.from("mensagens").insert({
          numero: from,
          mensagem: resposta,
          origem: "bot",
          created_at: new Date().toISOString()
        });
        console.log("💾 RESPOSTA SALVA");
      } catch (err) {
        console.log("❌ ERRO AO SALVAR RESPOSTA:", err.message);
      }

      return res.status(200).end();
    }

    /* ================= FALLBACK ================= */

    return res.status(405).end();

  } catch (err) {

    console.log("💥 ERRO GERAL:", err);
    return res.status(500).end();
  }
}
