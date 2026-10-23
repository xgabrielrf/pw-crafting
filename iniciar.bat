@echo off
rem Inicia o PW Crafting: sobe o servidor local, abre o navegador e salva o estoque em estoque.json (nesta pasta).
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js nao encontrado. Instale em https://nodejs.org e tente de novo. & pause & exit /b 1)
title PW Crafting (feche esta janela para encerrar)
node tools\servidor.js --abrir
pause
