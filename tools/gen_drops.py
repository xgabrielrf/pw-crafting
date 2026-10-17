import json, sys

MA, A = "Média/Alta", "Alta"
CAP = {
    1: ("Cântico Espiritual", 1, ["Cavaleiros (60-65)", "Defensores (68-73)", "Valentes (76-81)"]),
    2: ("Sinfonia do Destino", 2, ["Valorosos (74-79)", "Heróicos (82-87)", "Iluminados (90-95)"]),
    3: ("Ópera do Crepúsculo", 3, ["Prestigiados (88-93)", "Sacerdotes (95-100)", "Santos (100+)"]),
}
IDS = {  # (nome, nivel) -> id no pwdatabase
    ("Lâmina de Qin Tian", 60): 15227, ("Fragmento de Esqueleto", 60): 15229,
    ("Fragmento da Armadura Qin Tian", 70): 15230, ("Caveira das Charadas", 70): 15238,
    ("Garras do Leão Insano", 80): 15241, ("Garra do Devorador", 80): 15248,
    ("Antiga Espada Ornamental", 80): 15256, ("Chifre Longo do Escravo Demônio", 90): 15260,
    ("Chifre do Demônio Ancestral", 90): 15271, ("Pedra do Lar", 90): 15279,
    ("Espelho Dourado Fantasma", 80): 15242, ("Espinho do Tenente Primordial", 80): 15243,
    ("Armadura de Ferro da Escuridão", 90): 15258, ("Espírito Guerreiro do Rei", 99): 15296,
    ("Asas Puras Brilhantes", 99): 15305, ("Símbolo do Crepúsculo", 99): 15308,
    # aba VI (nomes do guia podem diferir do pwdatabase: Símeo/Símio, Wuhen/Wushen, etc.)
    ("Tambor da Interferência", 60): 15228, ("Tentáculo Fantasma", 70): 15232, ("Carapaça do Leão Insano", 70): 15233,
    ("Elmo do Tenente Primordial", 70): 15236, ("Carapaça de Qin Tian", 80): 15239, ("Grande Tambor Tenaz", 80): 15240,
    ("Presa do Grande Símeo", 80): 15247, ("Estandarte de Feng Wuhen", 80): 15249, ("Espírito da Armadura Dourada", 80): 15253,
    ("Chifre de Sela de Shenwu", 90): 15261, ("Jóia da Sagrada Mãe", 90): 15263, ("Cauda do Grande Símeo", 90): 15264,
    ("Pó Estelar", 90): 15265, ("Pingente do Rei Fantasma", 90): 15266, ("Roda Prismática", 90): 15269,
    ("Farelo Estelar", 90): 15270, ("Diadema da Sagrada Mãe", 90): 15274, ("Alma do Demônio Ancestral", 90): 15278,
    ("Ferramentas da Escuridão", 99): 15282, ("Pedra Espiritual da Sagrada Mãe", 99): 15285, ("Energia da Mulher Demônio", 99): 15286,
    ("Poder do Rei Fantasma", 99): 15287, ("Hálito Negro da Grande Besta", 99): 15289, ("Chifre Rubro da Grande Besta", 99): 15291,
    ("Selo do Ministro", 99): 15295, ("Chicote de Seda Pura", 99): 15297, ("Fonte Espelhada Ilusória", 99): 15298,
    ("Remorso do Crepúsculo", 99): 15304, ("Marca do Senhor das Ilusões", 99): 15306, ("Espírito do Céu e da Terra", 100): 15311,
    # abas I-V
    ("Pele da Serpente Ancestral", 70): 15234, ("Fragmento da Armadura Dourada", 70): 15235,
    ("Sangue da Serpente Ancestral", 80): 15244, ("Pedaço da Armadura Dourada", 80): 15245,
    ("Armadura Negra de Feng Wuhen", 80): 15246, ("Couraça do Grande Símeo", 80): 15250,
    ("Pele do Devorador", 80): 15251, ("Mão do Grande Símeo", 80): 15255,
    ("Lâmina Afiada do Leão Insano", 90): 15257, ("Protetor do Tenente Primordial", 90): 15259,
    ("Mão da Mulher Demônio", 90): 15262, ("Barba de Ferro do Devorador", 90): 15267,
    ("Carapaça da Grande Besta", 90): 15268, ("Cinzas do Demônio Ancestral", 90): 15272,
    ("Lâmina-Machado do Fantasma", 99): 15281, ("Coroa da Mulher Demônio", 99): 15283,
    ("Coração de Fogo do Fantasma", 99): 15284, ("Coração da Sagrada Mãe", 99): 15288,
    ("Seda Dourada do Rei Fantasma", 99): 15290, ("Jóia Verdejante", 99): 15292, ("Lâmina Verdejante", 99): 15293,
    ("Máscara Dourada", 100): 15309, ("Cetro do Poder do Crepúsculo", 100): 15310,
    ("Casco da Grande Besta", 99): 15294,  # no jogo/db aparece como "Máscara Fantasma" (15294)
}
# (cap, boss, qtdeBoss, {dificuldade: [(item, nivel), ...]})
B = [
 (1, "Qin Tian", MA, {1: [("Lâmina de Qin Tian", 60)], 2: [("Fragmento da Armadura Qin Tian", 70)], 3: [("Carapaça de Qin Tian", 80)]}),
 (1, "Deus Tambor", MA, {1: [("Tambor da Interferência", 60)], 2: [("Porta Tambor", 70)], 3: [("Grande Tambor Tenaz", 80)]}),
 (1, "Emissário", A, {1: [], 2: [("Tentáculo Fantasma", 70)], 3: [("Espelho Dourado Fantasma", 80)]}),
 (1, "Armadura Sagrada", A, {1: [], 2: [("Fragmento da Armadura Dourada", 70)], 3: [("Pedaço da Armadura Dourada", 80), ("Espírito da Armadura Dourada", 80)]}),
 (1, "Serpente Ancestral", A, {1: [], 2: [("Pele da Serpente Ancestral", 70)], 3: [("Sangue da Serpente Ancestral", 80), ("Alma da Serpente Ancestral", 80)]}),
 (1, "Boss, Baú", MA, {1: [("Fragmento de Esqueleto", 60)], 2: [("Fragmento de Esqueleto", 60), ("Caveira das Charadas", 70)], 3: [("Caveira das Charadas", 70), ("Antiga Espada Ornamental", 80)]}),

 (2, "Leão Insano Zhen Zhun", MA, {1: [("Carapaça do Leão Insano", 70)], 2: [("Garras do Leão Insano", 80)], 3: [("Lâmina Afiada do Leão Insano", 90)]}),
 (2, "Marechal Shen Wuluo (Multiplica)", MA, {1: [("Elmo do Tenente Primordial", 70), ("Jóia Negra do Tenente Primordial", 70)], 2: [("Espinho do Tenente Primordial", 80)], 3: [("Protetor do Tenente Primordial", 90)]}),
 (2, "Marechal Feng Wuhen (Cavalo)", MA, {1: [("Armadura Negra de Feng Wuhen", 80), ("Luvas de Feng Wuhen", 80)], 2: [("Estandarte de Feng Wuhen", 80), ("Luvas de Feng Wuhen", 80)], 3: [("Chifre de Sela de Shenwu", 90)]}),
 (2, "Grande Símeo", A, {1: [("Presa do Grande Símeo", 80), ("Mão do Grande Símeo", 80)], 2: [("Couraça do Grande Símeo", 80), ("Mão do Grande Símeo", 80)], 3: [("Cauda do Grande Símeo", 90)]}),
 (2, "Devorador Insano", A, {1: [("Garra do Devorador", 80)], 2: [("Pele do Devorador", 80)], 3: [("Barba de Ferro do Devorador", 90)]}),
 (2, "Emissário das Sete Almas", A, {1: [], 2: [("Pó Estelar", 90), ("Presa Prismática", 90)], 3: [("Roda Prismática", 90), ("Farelo Estelar", 90), ("Poder do Espírito de Cristal", 90)]}),
 (2, "Aniquilador Ancestral", A, {1: [], 2: [], 3: [("Chifre do Demônio Ancestral", 90), ("Cinzas do Demônio Ancestral", 90), ("Alma do Demônio Ancestral", 90)]}),
 (2, "Boss, Baú", MA, {1: [("Caveira das Charadas", 70), ("Antiga Espada Ornamental", 80)], 2: [("Antiga Espada Ornamental", 80), ("Pedra do Lar", 90)], 3: [("Pedra do Lar", 90)]}),

 (3, "Qiu Jian", MA, {1: [("Armadura de Ferro da Escuridão", 90)], 2: [("Armadura da Escuridão", 99)], 3: [("Ferramentas da Escuridão", 99)]}),
 (3, "Escravo Demônio", MA, {1: [("Chifre Longo do Escravo Demônio", 90), ("Carapaça do Escravo Fantasma", 90)], 2: [("Lâmina-Machado do Fantasma", 99)], 3: [("Coração de Fogo do Fantasma", 99)]}),
 (3, "Mulher Demônio", MA, {1: [("Mão da Mulher Demônio", 90)], 2: [("Energia da Mulher Demônio", 99), ("Alma da Mulher Demônio", 99)], 3: [("Coroa da Mulher Demônio", 99)]}),
 (3, "Sagrada Mãe das Almas", A, {1: [("Jóia da Sagrada Mãe", 90), ("Diadema da Sagrada Mãe", 90)], 2: [("Pedra Espiritual da Sagrada Mãe", 99)], 3: [("Coração da Sagrada Mãe", 99)]}),
 (3, "Grande Besta das Trevas", A, {1: [("Carapaça da Grande Besta", 90), ("Casco da Grande Besta", 90)], 2: [("Hálito Negro da Grande Besta", 99)], 3: [("Chifre Rubro da Grande Besta", 99), ("Alma da Grande Besta", 99)]}),
 (3, "Tie Luoyun (Rei Fantasma)", A, {1: [("Pingente do Rei Fantasma", 90)], 2: [("Poder do Rei Fantasma", 99)], 3: [("Seda Dourada do Rei Fantasma", 99), ("Bainha do Rei Fantasma", 99)]}),
 (3, "Ministro Zi Cun", A, {1: [], 2: [("Casco da Grande Besta", 99), ("Selo do Ministro", 99), ("Alma Pura da Escuridão", 99)], 3: [("Chicote de Seda Pura", 99), ("Asas Puras Brilhantes", 99), ("Cetro do Poder do Crepúsculo", 100)]}),
 (3, "Rei Cang Li (Imperador do Crepúsculo)", A, {1: [], 2: [("Lâmina Verdejante", 99), ("Jóia Verdejante", 99), ("Destino do Crepúsculo", 99)], 3: [("Espírito Guerreiro do Rei", 99), ("Remorso do Crepúsculo", 99), ("Máscara Dourada", 100)]}),
 (3, "Senhor das Ilusões", A, {1: [], 2: [], 3: [("Fonte Espelhada Ilusória", 99), ("Marca do Senhor das Ilusões", 99), ("Pedra dos Sonhos", 99), ("Espírito do Céu e da Terra", 100)]}),
 (3, "Boss, Mobs, Baú", MA, {1: [("Antiga Espada Ornamental", 80), ("Pedra do Lar", 90)], 2: [("Pedra do Lar", 80), ("Símbolo do Crepúsculo", 99)], 3: [("Símbolo do Crepúsculo", 99)]}),
]

# Raridade pela cor do nome nas imagens do guia: amarelo = gold, vermelho = Red Dusk, resto = normal.
GOLD = {
    ("Espírito da Armadura Dourada", 80), ("Alma da Serpente Ancestral", 80),
    ("Jóia Negra do Tenente Primordial", 70), ("Luvas de Feng Wuhen", 80), ("Mão do Grande Símeo", 80),
    ("Presa Prismática", 90), ("Poder do Espírito de Cristal", 90), ("Alma do Demônio Ancestral", 90),
    ("Carapaça do Escravo Fantasma", 90), ("Alma da Mulher Demônio", 99), ("Diadema da Sagrada Mãe", 90),
    ("Casco da Grande Besta", 90), ("Alma da Grande Besta", 99), ("Bainha do Rei Fantasma", 99),
    ("Alma Pura da Escuridão", 99), ("Destino do Crepúsculo", 99), ("Remorso do Crepúsculo", 99),
    ("Marca do Senhor das Ilusões", 99), ("Pedra dos Sonhos", 99),
    ("Asas Puras Brilhantes", 99),  # verde na imagem, mas o usuário a definiu como gold
}
RED = {("Cetro do Poder do Crepúsculo", 100), ("Máscara Dourada", 100), ("Espírito do Céu e da Terra", 100)}
def raridade(n, v):
    return "gold" if (n, v) in GOLD else "red" if (n, v) in RED else "normal"

drops = []
for cap, boss, q, difs in B:
    for dif, itens in difs.items():
        for nome, nivel in itens:
            drops.append({
                "dusk": f"{cap}-{dif}", "capitulo": cap, "dificuldade": dif,
                "boss": boss, "qtdeBoss": q,
                "item": nome, "nivelItem": nivel, "itemId": IDS.get((nome, nivel)), "raridade": raridade(nome, nivel),
            })

out = {
    "capitulos": {str(c): {"nome": n, "essenciaPorBossAlta": e, "dificuldades": d} for c, (n, e, d) in CAP.items()},
    "semDrop": {"15461": "Gasto de entrada em bosses Alta (Cap.1: 1, Cap.2: 2, Cap.3: 3)"},
    "drops": drops,
}
path = sys.argv[1]
body = json.dumps(out, ensure_ascii=False, indent=1)
open(path, "w", encoding="utf-8").write(
    "// Drops do Crepúsculo (fonte: guia do usuário). 'dusk' = capítulo-dificuldade (ex.: 2-1).\n"
    "// Conteúdo é JSON puro; carregado via <script> para funcionar em file://.\n"
    "window.DROPS = " + body + ";\n")
print(len(drops), "drops;", sum(1 for d in drops if d["itemId"]), "com itemId")
