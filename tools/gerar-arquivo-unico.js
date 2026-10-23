// Gera dist/pw-crafting.html: a página inteira num único arquivo (CSS, JS, dados e ícones embutidos),
// para mandar a alguém que só precisa dar duplo clique (sem pasta, sem Node).
// Uso (só para quem gera o arquivo; quem recebe não precisa de nada): node tools/gerar-arquivo-unico.js
const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..");
const ler = rel => fs.readFileSync(path.join(RAIZ, rel), "utf8");
// "</script" dentro de um <script> inline fecharia a tag antes da hora
const seguro = js => js.replace(/<\/script/gi, "<\\/script");

let html = ler("index.html");

// ícones -> data URI (o app usa window.ICONES[id] quando existe)
const pasta = path.join(RAIZ, "icons");
const icones = {};
for (const f of fs.readdirSync(pasta)) {
  if (!f.endsWith(".png")) continue;
  icones[f.replace(".png", "")] = "data:image/png;base64," + fs.readFileSync(path.join(pasta, f)).toString("base64");
}

// <link rel="stylesheet" href="x.css"> -> <style>
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => "<style>\n" + ler(href) + "\n</style>");

// <script src="x.js"></script> -> inline; os ícones entram antes do app
let primeiro = true;
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const prefixo = primeiro ? "<script>window.ICONES=" + seguro(JSON.stringify(icones)) + ";</script>\n  " : "";
  primeiro = false;
  return prefixo + "<script>\n" + seguro(ler(src)) + "\n</script>";
});

const saida = path.join(RAIZ, "dist", "pw-crafting.html");
fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, html);
console.log("Gerado:", saida, "(" + (Buffer.byteLength(html) / 1024).toFixed(0) + " KB,", Object.keys(icones).length, "ícones embutidos)");
