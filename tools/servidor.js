// Servidor local mínimo (só Node, sem dependências): serve a pasta do projeto e guarda o estoque em
// <raiz>/estoque.json. Uso: node tools/servidor.js [--abrir]   (ou duplo clique em iniciar.bat)
// Só escuta em 127.0.0.1. Porta: variável PORT (padrão 8765).
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const RAIZ = path.resolve(__dirname, "..");
const ARQUIVO = path.join(RAIZ, "estoque.json");
const PORTA = Number(process.env.PORT) || 8765;
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".ico": "image/x-icon",
};
const VAZIO = { estoque: {}, planos: [] };

function responder(res, status, corpo, tipo) {
  res.writeHead(status, { "Content-Type": tipo || "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-PW-Crafting": "1" });
  res.end(corpo);
}

function lerCorpo(req, limite = 1024 * 1024) {
  return new Promise((ok, erro) => {
    let tam = 0; const partes = [];
    req.on("data", c => { tam += c.length; if (tam > limite) { erro(new Error("grande")); req.destroy(); } else partes.push(c); });
    req.on("end", () => ok(Buffer.concat(partes).toString("utf8")));
    req.on("error", erro);
  });
}

async function api(req, res) {
  if (req.method === "GET") {
    let conteudo = JSON.stringify(VAZIO);
    try { conteudo = fs.readFileSync(ARQUIVO, "utf8"); } catch (e) { /* ainda não existe */ }
    return responder(res, 200, conteudo, TIPOS[".json"]);
  }
  if (req.method === "PUT") {
    // o cabeçalho customizado força "preflight" em páginas de outros sites, que o servidor não autoriza (anti-CSRF)
    if (req.headers["x-pw-crafting"] !== "1") return responder(res, 403, "cabeçalho ausente");
    try {
      const dados = JSON.parse(await lerCorpo(req));
      if (!dados || typeof dados.estoque !== "object" || !Array.isArray(dados.planos)) throw new Error("formato");
      const saida = JSON.stringify({ app: "pw-crafting", versao: 1, salvoEm: new Date().toISOString(), estoque: dados.estoque, planos: dados.planos }, null, 2);
      if (fs.existsSync(ARQUIVO)) fs.copyFileSync(ARQUIVO, ARQUIVO + ".bak"); // uma cópia da versão anterior
      fs.writeFileSync(ARQUIVO + ".tmp", saida);
      fs.renameSync(ARQUIVO + ".tmp", ARQUIVO); // troca atômica: nunca deixa o arquivo pela metade
      return responder(res, 204, "");
    } catch (e) {
      return responder(res, 400, "dados inválidos");
    }
  }
  responder(res, 405, "método não permitido");
}

function estatico(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return responder(res, 405, "método não permitido");
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const alvo = path.resolve(RAIZ, "." + rel);
  const dentro = alvo.startsWith(RAIZ + path.sep);
  const oculto = rel.split("/").some(p => p.startsWith(".")) || /^\/(estoque\.json|tools\/|CLAUDE\.md)/.test(rel);
  if (!dentro || oculto) return responder(res, 404, "não encontrado");
  fs.readFile(alvo, (err, dados) => {
    if (err) return responder(res, 404, "não encontrado");
    responder(res, 200, dados, TIPOS[path.extname(alvo).toLowerCase()] || "application/octet-stream");
  });
}

const servidor = http.createServer((req, res) => {
  // só aceita acesso por localhost (protege contra "DNS rebinding")
  const host = (req.headers.host || "").replace(/:\d+$/, "");
  if (host !== "localhost" && host !== "127.0.0.1") return responder(res, 403, "host não permitido");
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/estoque") return api(req, res);
  estatico(req, res, url);
});

servidor.on("error", e => {
  console.error(e.code === "EADDRINUSE"
    ? `A porta ${PORTA} já está em uso (o servidor talvez já esteja aberto em outra janela).`
    : "Erro: " + e.message);
  process.exit(1);
});
servidor.listen(PORTA, "127.0.0.1", () => {
  const link = `http://localhost:${PORTA}/`;
  console.log(`PW Crafting rodando em ${link}\nEstoque salvo em: ${ARQUIVO}\nFeche esta janela para encerrar.`);
  if (process.argv.includes("--abrir")) exec(`start "" "${link}"`);
});
