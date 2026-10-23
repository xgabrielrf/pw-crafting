#!/bin/sh
# Baixa do pwdatabase os ícones (32x32) de todos os itens de data/data.js que ainda não estão em icons/.
# Uso (Git Bash, de qualquer pasta): sh tools/baixar-icones.sh
cd "$(dirname "$0")/.." || exit 1  # sempre roda a partir da raiz do projeto
mkdir -p icons
for id in $(node -e "global.window={};require('./data/data.js');console.log(Object.keys(window.DATA.items).join(' '))"); do
  [ -s "icons/$id.png" ] && continue
  curl -sf -o "icons/$id.png" "https://www.pwdatabase.com/images/icons/generalm/$id.png" && echo "ok $id" || { echo "falhou $id"; rm -f "icons/$id.png"; }
done
