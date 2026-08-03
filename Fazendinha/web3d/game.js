import * as THREE from './lib/three.module.js';

// ══════════════════════════════════════════════════════════════
//  A FAZENDA DA MANU — versão 3D (Three.js)
//  Personagens torneados por lathe/extrusão em vez de primitivas
//  soltas, luz com sombra suave e câmera de terceira pessoa.
// ══════════════════════════════════════════════════════════════

// Paleta no estilo render 3D cartoon: azul de céu saturado, verdes em
// camadas claras, vermelho de celeiro quente e madeiras alaranjadas.
const PALETA = {
  ceu: 0x2ea3dd,
  ceuBaixo: 0x7fd0f0,
  grama: 0x8cc63f,
  gramaClara: 0xa8d24f,
  gramaEsc: 0x6ba832,
  terra: 0x9c6236,
  terraEsc: 0x7a4a28,
  pele: 0xf3c9a0,
  cabelo: 0x5a2d10,
  vestido: 0xe8478f,
  celeiro: 0xd8382c,
  celeiroEsc: 0xb62a20,
  telhado: 0x8e3b26,
  telhadoEsc: 0x732d1c,
  madeira: 0xc8823c,
  madeiraEsc: 0xa4652b,
  agua: 0x4a9fd4,
  urso: 0x8b5a2b,
  ursoClaro: 0xb98a5e,
  camisa: 0x3fbf6a,
  cao: 0xf7f5f0,
  caoMancha: 0x2a2a2a,
  capacete: 0xd81f1f,
  folha: 0x4f9e2f,
  folhaClara: 0x6cbb3c,
  tronco: 0x8a5a2f,
  nuvem: 0xffffff,
  sol: 0xffd21e,
  solClaro: 0xffe97a,
  moinhoParede: 0xf2ede1,
  moinhoTelha: 0xd8382c,
  moinhoPa: 0xd9cbb0,
  milho: 0xf2c53d,
  milhoFolha: 0x5aa832,
};

// ── Culturas ──────────────────────────────────────────────────
const CULTURAS = {
  cenoura:  { nome: 'Cenoura',  emoji: '🥕', cresce: 45, estrelas: 1, cor: 0xf07316, topo: 0x4a9a30 },
  girassol: { nome: 'Girassol', emoji: '🌻', cresce: 60, estrelas: 2, cor: 0xffd400, topo: 0x6b4426 },
  morango:  { nome: 'Morango',  emoji: '🍓', cresce: 75, estrelas: 3, cor: 0xd92626, topo: 0x3f8f37 },
  abobora:  { nome: 'Abóbora',  emoji: '🎃', cresce: 90, estrelas: 4, cor: 0xef911f, topo: 0x4a9a30 },
};

// `onde` marca o ponto do mapa que a missão pede — vira uma seta
// flutuante no mundo, para a criança saber para onde ir.
const MISSOES = [
  { id: 'colheita', icone: '🥕', titulo: 'Colha 1 cenourinha!', alvo: 1, evento: 'colheuCenoura', premio: 3, onde: 'canteiros' },
  { id: 'regar',    icone: '💧', titulo: 'Regue 3 canteiros',   alvo: 3, evento: 'regou',          premio: 3, onde: 'canteiros' },
  { id: 'alimentar',icone: '🌾', titulo: 'Encha o cocho de comida', alvo: 1, evento: 'alimentou',  premio: 4, onde: 'cocho' },
  { id: 'carinho',  icone: '🐄', titulo: 'Faça carinho em 3 bichinhos', alvo: 3, evento: 'carinho', premio: 4, onde: 'animais' },
  { id: 'ovo',      icone: '🥚', titulo: 'Pegue um ovinho no chão', alvo: 1, evento: 'pegouOvo',   premio: 3, onde: 'ovo' },
  { id: 'fruta',    icone: '🍎', titulo: 'Pegue 2 frutinhas que caíram', alvo: 2, evento: 'colheuFruta', premio: 4, onde: 'fruta' },
  { id: 'peixe',    icone: '🐟', titulo: 'Pesque 1 peixinho no lago!', alvo: 1, evento: 'pescou', premio: 4, onde: 'pesca' },
  { id: 'camisa',   icone: '👕', titulo: 'Ache a camisa do Nenão', alvo: 1, evento: 'achouCamisa', premio: 5, onde: 'camisa' },
  { id: 'colher5',  icone: '🧺', titulo: 'Colha 5 plantinhas',  alvo: 5, evento: 'colheu',         premio: 5, onde: 'canteiros' },
];

const ANIMAIS = [
  { tipo: 'galinha', nome: 'Galinha',   emoji: '🐔', pos: [-3.2, 0, 3.4] },
  { tipo: 'vaca',    nome: 'Vaca',      emoji: '🐄', pos: [-1.4, 0, 4.0] },
  { tipo: 'ovelha',  nome: 'Ovelha',    emoji: '🐑', pos: [ 1.4, 0, 4.0] },
  { tipo: 'porco',   nome: 'Porquinho', emoji: '🐖', pos: [ 3.2, 0, 3.4] },
];

const CHAVE_SAVE = 'fazendinha_manu_3d';

// ── Estado ────────────────────────────────────────────────────
const estado = {
  estrelas: 0,
  cesta: 0,
  canteiros: Array.from({ length: 9 }, (_, i) => ({ id: i, cultura: null, plantadoEm: null, regado: false })),
  animais: ANIMAIS.map(a => ({ tipo: a.tipo, coracoes: 0, ultimoCarinho: null, ovos: 0, proximoOvo: null })),
  missao: 0,
  progresso: 0,
  camisaAchada: false,
  camisaLocal: null,
  totalColheitas: 0,
  regasFeitas: 0,
  carinhosFeitos: 0,
  peixesPescados: 0,
};

// ══════════════════════════════════════════════════════════════
//  Cena, luz e câmera
// ══════════════════════════════════════════════════════════════
const cena = new THREE.Scene();
cena.background = new THREE.Color(PALETA.ceu);
cena.fog = new THREE.Fog(PALETA.ceuBaixo, 38, 78);
// guardada para restaurar ao sair do celeiro, onde a névoa é desligada
const nevoaOriginal = cena.fog;

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('cena').appendChild(renderer.domElement);

// Luz: hemisférica para o ambiente + sol direcional com sombra
cena.add(new THREE.HemisphereLight(0xbfe3ff, PALETA.grama, 0.85));

const sol = new THREE.DirectionalLight(0xfff4e0, 2.1);
sol.position.set(9, 14, 7);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
sol.shadow.camera.left = -18;
sol.shadow.camera.right = 18;
sol.shadow.camera.top = 18;
sol.shadow.camera.bottom = -18;
sol.shadow.camera.far = 45;
sol.shadow.bias = -0.0006;
sol.shadow.normalBias = 0.02;
cena.add(sol);

// ── Helpers de material/geometria ──────────────────────────────
const mat = (cor, extra = {}) =>
  new THREE.MeshStandardMaterial({ color: cor, roughness: 0.72, metalness: 0.0, ...extra });

/**
 * Sólido de revolução: dá volume orgânico onde uma esfera ficaria "de bloco".
 * LatheGeometry é uma casca de face única — sem DoubleSide a peça fica
 * "transparente" de certos ângulos e dá para ver o que está dentro dela.
 */
function torneado(perfil, material, segmentos = 20) {
  const pontos = perfil.map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pontos, segmentos);
  g.computeVertexNormals();
  const m = material.clone();
  m.side = THREE.DoubleSide;
  m.shadowSide = THREE.DoubleSide;
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function esfera(r, material, achatamento = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), material);
  m.scale.y = achatamento;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function caixa(l, a, p, material, arred = 0.03) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cilindro(rt, rb, alt, material, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, alt, seg), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ══════════════════════════════════════════════════════════════
//  Texturas procedurais
// ══════════════════════════════════════════════════════════════
// Cor chapada deixa tudo com cara de plástico. Estas texturas são
// pintadas em canvas na hora — sem arquivo externo — e dão ao pelo
// variação de tom, fios e sombreado, que é o que cria a sensação de
// volume que faltava.

/** Converte 0xRRGGBB em [r,g,b]. */
const hexRGB = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

/** Mistura duas cores, t=0 devolve a, t=1 devolve b. */
function misturar(a, b, t) {
  const A = hexRGB(a), B = hexRGB(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

/**
 * Pelo: base com nuvens de tom + fios finos por cima.
 * `claro`/`escuro` definem a amplitude da variação.
 */
function texturaPelo(base, escuro, claro, { fios = 900, px = 512 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const c = cv.getContext('2d');

  c.fillStyle = misturar(base, base, 0);
  c.fillRect(0, 0, px, px);

  // manchas suaves de luz e sombra, para o pelo não ficar uniforme
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * px, y = Math.random() * px;
    const r = px * (0.05 + Math.random() * 0.16);
    const paraClaro = Math.random() > 0.5;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, misturar(base, paraClaro ? claro : escuro, 0.5));
    g.addColorStop(1, misturar(base, paraClaro ? claro : escuro, 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  // fios: traços curtos alternando claro e escuro
  c.lineWidth = Math.max(1, px / 380);
  for (let i = 0; i < fios; i++) {
    const x = Math.random() * px, y = Math.random() * px;
    const comp = px * (0.012 + Math.random() * 0.03);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
    const t = 0.18 + Math.random() * 0.4;
    c.strokeStyle = misturar(base, Math.random() > 0.45 ? escuro : claro, t);
    c.globalAlpha = 0.4 + Math.random() * 0.35;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang) * comp, y + Math.sin(ang) * comp);
    c.stroke();
  }
  c.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Material de pelo pronto, com leve rugosidade variável. */
function matPelo(base, escuro, claro, extra = {}) {
  return new THREE.MeshStandardMaterial({
    map: texturaPelo(base, escuro, claro),
    roughness: 0.92,
    metalness: 0,
    ...extra,
  });
}

/**
 * Grama: base malhada com tufos em V desenhados por cima. Repetida
 * muitas vezes no chão, o que some com o aspecto de feltro verde liso.
 */
function texturaGrama(px = 512) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const c = cv.getContext('2d');
  c.fillStyle = misturar(PALETA.grama, PALETA.grama, 0);
  c.fillRect(0, 0, px, px);

  // clareiras e sombras amplas
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * px, y = Math.random() * px;
    const r = px * (0.04 + Math.random() * 0.14);
    const claro = Math.random() > 0.45;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, misturar(PALETA.grama, claro ? PALETA.gramaClara : PALETA.gramaEsc, 0.55));
    g.addColorStop(1, misturar(PALETA.grama, claro ? PALETA.gramaClara : PALETA.gramaEsc, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }

  // tufos: dois riscos saindo do mesmo ponto
  c.lineCap = 'round';
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * px, y = Math.random() * px;
    const h = px * (0.014 + Math.random() * 0.030);
    const claro = Math.random() > 0.5;
    c.strokeStyle = misturar(PALETA.grama, claro ? PALETA.gramaClara : PALETA.gramaEsc, 0.5 + Math.random() * 0.45);
    c.lineWidth = Math.max(1.4, px / 300);
    c.globalAlpha = 0.65 + Math.random() * 0.35;
    for (const lado of [-1, 1]) {
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + lado * h * 0.3, y - h * 0.6, x + lado * h * 0.55, y - h);
      c.stroke();
    }
  }
  c.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Folhagem: massa de folhinhas sobrepostas em vários verdes. */
function texturaFolhagem(base, escuro, claro, px = 512) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const c = cv.getContext('2d');
  c.fillStyle = misturar(base, escuro, 0.25);
  c.fillRect(0, 0, px, px);

  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * px, y = Math.random() * px;
    const r = px * (0.016 + Math.random() * 0.038);
    const t = Math.random();
    // mistura forte: com pouco contraste a folhagem some sob a luz
    c.fillStyle = misturar(base, t > 0.55 ? claro : escuro, 0.45 + Math.random() * 0.5);
    c.globalAlpha = 0.7 + Math.random() * 0.3;
    // folha: elipse inclinada
    c.save();
    c.translate(x, y);
    c.rotate(Math.random() * Math.PI);
    c.beginPath();
    c.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  c.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Casca: fibras verticais em tons de marrom. */
function texturaCasca(base, px = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const c = cv.getContext('2d');
  c.fillStyle = misturar(base, base, 0);
  c.fillRect(0, 0, px, px);
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * px;
    c.strokeStyle = misturar(base, Math.random() > 0.5 ? 0x4a2f18 : 0xb98a52, 0.25 + Math.random() * 0.45);
    c.lineWidth = px * (0.004 + Math.random() * 0.014);
    c.globalAlpha = 0.5 + Math.random() * 0.4;
    c.beginPath();
    c.moveTo(x, 0);
    c.bezierCurveTo(x + (Math.random() - 0.5) * 14, px * 0.35, x + (Math.random() - 0.5) * 14, px * 0.7, x, px);
    c.stroke();
  }
  c.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Tábuas: ripas verticais com veio e frestas escuras entre elas. */
function texturaTabuas(base, escuro, claro, { ripas = 9, px = 512 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const c = cv.getContext('2d');
  const larg = px / ripas;

  for (let i = 0; i < ripas; i++) {
    // cada ripa com tom levemente diferente, como madeira de verdade
    const t = (Math.random() - 0.5) * 0.35;
    c.fillStyle = misturar(base, t > 0 ? claro : escuro, Math.abs(t));
    c.fillRect(i * larg, 0, larg, px);

    // veio da madeira
    c.globalAlpha = 0.16;
    for (let v = 0; v < 9; v++) {
      const x = i * larg + Math.random() * larg;
      c.strokeStyle = misturar(base, escuro, 0.5 + Math.random() * 0.4);
      c.lineWidth = px / 420;
      c.beginPath();
      c.moveTo(x, 0);
      c.bezierCurveTo(x + (Math.random() - 0.5) * 8, px * 0.4, x + (Math.random() - 0.5) * 8, px * 0.7, x, px);
      c.stroke();
    }
    c.globalAlpha = 1;

    // fresta entre ripas
    c.fillStyle = misturar(base, escuro, 0.75);
    c.fillRect(i * larg, 0, Math.max(1.5, px / 300), px);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// criadas uma vez e reaproveitadas em toda a cena
const TEX_GRAMA = texturaGrama();
const TEX_CELEIRO = texturaTabuas(PALETA.celeiro, 0x8f1f16, 0xf05a4a);
const TEX_TELHADO = texturaTabuas(PALETA.telhado, 0x4d1c10, 0xb45a3c, { ripas: 16 });
const TEX_MADEIRA = texturaTabuas(PALETA.madeira, 0x7a4a1e, 0xe0a566, { ripas: 6 });
const TEX_FOLHA = texturaFolhagem(PALETA.folha, 0x2f6b22, 0x8ed14e);
const TEX_FOLHA_CLARA = texturaFolhagem(PALETA.folhaClara, 0x3d8a2a, 0xa8de63);
const TEX_CASCA = texturaCasca(PALETA.tronco);

// ══════════════════════════════════════════════════════════════
//  Mundo
// ══════════════════════════════════════════════════════════════
const mundo = new THREE.Group();
cena.add(mundo);

// Chão com relevo suave (não um plano chapado).
// A mesma fórmula é usada para apoiar os pés dos personagens; sem isso
// eles andam em y=0 e afundam onde o terreno sobe.
const RAIO_PLANO = 11;   // centro plano, onde ficam canteiros e construções
function alturaTerreno(x, z) {
  const d = Math.hypot(x, z);
  if (d <= RAIO_PLANO) return 0;
  const ondula = Math.sin(x * 0.16) * Math.cos(z * 0.14) * 0.9;
  // limita o quanto a borda sobe, senão vira montanha intransponível
  const fator = Math.min((d - RAIO_PLANO) / 9, 1.6);
  return ondula * fator;
}
{
  const g = new THREE.PlaneGeometry(80, 80, 96, 96);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    // o plano é girado -90° em X, então o y local vira -z do mundo
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, alturaTerreno(x, -y));
  }
  g.computeVertexNormals();
  const texChao = TEX_GRAMA.clone();
  texChao.needsUpdate = true;
  texChao.repeat.set(55, 55);       // muitas repetições: tufos em escala de pé
  const chao = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    map: texChao, roughness: 0.97, metalness: 0,
  }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  mundo.add(chao);
}

// Colinas em camadas: as de trás mais claras, dando a leitura de
// profundidade em faixas que a referência usa. São decorativas — viram
// obstáculo mais abaixo, senão dá para entrar dentro delas.
const COLINAS = [
  [-24, -26, 12, PALETA.gramaClara, 0.38],
  [14, -30, 15, PALETA.gramaClara, 0.34],
  [34, -14, 11, PALETA.gramaClara, 0.36],
  [-34, -8, 10, PALETA.gramaClara, 0.36],
  [-16, -18, 8, PALETA.grama, 0.44],
  [20, -20, 9, PALETA.grama, 0.42],
  [30, 6, 9, PALETA.gramaEsc, 0.40],
  [-30, 10, 8, PALETA.gramaEsc, 0.40],
];
for (const [x, z, r, cor, achata] of COLINAS) {
  const h = esfera(r, mat(cor, { roughness: 1 }), achata);
  h.position.set(x, -0.9, z);
  h.castShadow = false;
  h.receiveShadow = false;
  mundo.add(h);
}

// ── Sol estilizado ────────────────────────────────────────────
{
  const sunGrp = new THREE.Group();
  const disco = esfera(1.5, new THREE.MeshBasicMaterial({ color: PALETA.sol }));
  disco.castShadow = false; disco.receiveShadow = false;
  sunGrp.add(disco);
  const halo = esfera(1.85, new THREE.MeshBasicMaterial({ color: PALETA.solClaro, transparent: true, opacity: 0.55 }));
  halo.castShadow = false; halo.receiveShadow = false;
  sunGrp.add(halo);
  // raios triangulares em volta
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const raio = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.15, 4),
      new THREE.MeshBasicMaterial({ color: PALETA.sol })
    );
    raio.position.set(Math.cos(a) * 2.35, Math.sin(a) * 2.35, 0);
    raio.rotation.z = a - Math.PI / 2;
    raio.castShadow = false; raio.receiveShadow = false;
    sunGrp.add(raio);
  }
  sunGrp.position.set(17, 11.5, -36);
  cena.add(sunGrp);
}

// ── Nuvens fofas ──────────────────────────────────────────────
// Aglomerado de esferas: mesma leitura das nuvens da referência.
const nuvens = [];
function criarNuvem(x, y, z, escala) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: PALETA.nuvem, roughness: 1, metalness: 0 });
  const bolhas = [
    [0, 0, 0, 1.0], [1.15, -0.12, 0.1, 0.78], [-1.1, -0.15, -0.05, 0.72],
    [0.55, 0.42, 0.12, 0.66], [-0.5, 0.36, -0.1, 0.6], [1.9, -0.3, 0, 0.5],
  ];
  for (const [dx, dy, dz, r] of bolhas) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m);
    b.position.set(dx, dy, dz);
    b.scale.y = 0.82;
    b.castShadow = false;
    b.receiveShadow = false;
    g.add(b);
  }
  g.position.set(x, y, z);
  g.scale.setScalar(escala);
  cena.add(g);
  nuvens.push({ grupo: g, vx: 0.16 + Math.random() * 0.12, x0: x });
  return g;
}
// alturas baixas de propósito: com a câmera inclinada para o chão, nuvem
// acima de ~12 sai do enquadramento e o céu fica vazio
for (const [x, y, z, s] of [
  [-20, 8.5, -30, 1.5], [8, 10.5, -34, 1.8], [26, 8, -28, 1.3],
  [-30, 11, -20, 1.2], [34, 9.5, -12, 1.4], [-12, 12, -38, 1.6],
  [16, 7.5, -24, 1.1], [-8, 9, -26, 1.0],
]) criarNuvem(x, y, z, s);

// ── Celeiro ───────────────────────────────────────────────────
let portasCeleiro = [];          // as duas folhas, para abrir e fechar
const CELEIRO_POS = new THREE.Vector3(-7.5, 0, -5.5);
const CELEIRO_ROT = 0.35;
let entradaCeleiro = null;       // ponto na frente da porta, no mundo
{
  const celeiro = new THREE.Group();
  const matParede = new THREE.MeshStandardMaterial({ map: TEX_CELEIRO, roughness: 0.9 });
  const matTelha = new THREE.MeshStandardMaterial({ map: TEX_TELHADO, roughness: 0.92 });
  const matMad = new THREE.MeshStandardMaterial({ map: TEX_MADEIRA, roughness: 0.9 });
  const matBranco = mat(0xf4efe4, { roughness: 0.75 });

  const corpo = caixa(3.4, 2.3, 2.6, matParede);
  corpo.position.y = 1.15;
  celeiro.add(corpo);

  // cantoneiras brancas, marca registrada de celeiro americano
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const canto = caixa(0.14, 2.3, 0.14, matBranco);
      canto.position.set(sx * 1.7, 1.15, sz * 1.3);
      celeiro.add(canto);
    }
  }
  // faixa de acabamento no topo da parede
  for (const sz of [-1, 1]) {
    const faixa = caixa(3.5, 0.13, 0.06, matBranco);
    faixa.position.set(0, 2.24, sz * 1.31);
    celeiro.add(faixa);
  }

  // Telhado de duas águas via prisma extrudado.
  // Corpo: X de -1.7 a 1.7, Z de -1.3 a 1.3, topo em y=2.3.
  // Com rotation.y=90°, a largura da forma cai no eixo Z e a extrusão
  // cresce em +X a partir de position.x — daí o offset de -metade.
  const ABA_Z = 1.52;   // meia-largura: 0.22 de beiral sobre Z
  const VAO_X = 3.84;   // vão extrudado: 0.22 de beiral sobre X
  const forma = new THREE.Shape();
  forma.moveTo(-ABA_Z, 0);
  forma.lineTo(0, 1.3);
  forma.lineTo(ABA_Z, 0);
  forma.lineTo(-ABA_Z, 0);
  const telhado = new THREE.Mesh(
    new THREE.ExtrudeGeometry(forma, { depth: VAO_X, bevelEnabled: false }),
    matTelha
  );
  telhado.rotation.y = Math.PI / 2;
  telhado.position.set(-VAO_X / 2, 2.3, 0);
  telhado.castShadow = true;
  telhado.receiveShadow = true;
  celeiro.add(telhado);

  // cumeeira e beirais
  const cumeeira = caixa(VAO_X + 0.1, 0.12, 0.16, matBranco);
  cumeeira.position.set(0, 3.62, 0);
  celeiro.add(cumeeira);
  for (const sz of [-1, 1]) {
    const beiral = caixa(VAO_X + 0.1, 0.1, 0.12, matBranco);
    beiral.position.set(0, 2.34, sz * ABA_Z);
    celeiro.add(beiral);
  }

  // ── Portas duplas que abrem ──
  // Cada folha pendura num pivô na lateral do vão, então gira pela
  // dobradiça em vez de rodar no próprio centro.
  const VAO_PORTA = 1.5, ALT_PORTA = 1.62;
  portasCeleiro = [];
  for (const lado of [-1, 1]) {
    const pivo = new THREE.Group();
    pivo.position.set(lado * (VAO_PORTA / 2), 0, 1.32);

    const folha = caixa(VAO_PORTA / 2, ALT_PORTA, 0.09, matMad);
    folha.position.set(-lado * VAO_PORTA / 4, ALT_PORTA / 2, 0);
    pivo.add(folha);

    // travessas em X, típicas de porta de celeiro
    for (const inc of [1, -1]) {
      const diag = caixa(Math.hypot(VAO_PORTA / 2, ALT_PORTA) * 0.94, 0.1, 0.03, matBranco);
      diag.position.set(-lado * VAO_PORTA / 4, ALT_PORTA / 2, 0.06);
      diag.rotation.z = inc * Math.atan2(ALT_PORTA, VAO_PORTA / 2);
      pivo.add(diag);
    }
    for (const y of [0.12, ALT_PORTA - 0.12]) {
      const trav = caixa(VAO_PORTA / 2, 0.1, 0.03, matBranco);
      trav.position.set(-lado * VAO_PORTA / 4, y, 0.06);
      pivo.add(trav);
    }
    // maçaneta
    const mac = esfera(0.055, mat(0x3a3a3a, { roughness: 0.35 }));
    mac.position.set(-lado * (VAO_PORTA / 2 - 0.12), ALT_PORTA / 2, 0.1);
    pivo.add(mac);

    pivo.userData = { tipo: 'portaCeleiro', lado };
    celeiro.add(pivo);
    portasCeleiro.push({ pivo, lado, aberto: 0 });
  }

  // batente
  for (const lado of [-1, 1]) {
    const bat = caixa(0.12, ALT_PORTA + 0.14, 0.16, matBranco);
    bat.position.set(lado * (VAO_PORTA / 2 + 0.06), (ALT_PORTA + 0.14) / 2, 1.32);
    celeiro.add(bat);
  }
  const verga = caixa(VAO_PORTA + 0.24, 0.14, 0.16, matBranco);
  verga.position.set(0, ALT_PORTA + 0.14, 1.32);
  celeiro.add(verga);
  // vão escuro atrás das portas, para dar sensação de interior
  const interior = caixa(VAO_PORTA, ALT_PORTA, 0.05, mat(0x241812, { roughness: 1 }));
  interior.position.set(0, ALT_PORTA / 2, 1.27);
  celeiro.add(interior);

  // ── Janelas ──
  for (const sx of [-1, 1]) {
    const moldura = caixa(0.62, 0.62, 0.08, matBranco);
    moldura.position.set(sx * 1.05, 1.62, 1.32);
    celeiro.add(moldura);
    const vidro = caixa(0.5, 0.5, 0.04, mat(0x7fc6e8, { roughness: 0.18, metalness: 0.25 }));
    vidro.position.set(sx * 1.05, 1.62, 1.37);
    celeiro.add(vidro);
    for (const [w, h] of [[0.5, 0.05], [0.05, 0.5]]) {
      const cruz = caixa(w, h, 0.03, matBranco);
      cruz.position.set(sx * 1.05, 1.62, 1.40);
      celeiro.add(cruz);
    }
  }

  // ── Sótão: janelinha redonda no frontão ──
  const sotao = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), mat(0x241812, { roughness: 1 }));
  sotao.position.set(0, 2.95, 1.53);
  celeiro.add(sotao);
  const aroSotao = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.05, 8, 22), matBranco);
  aroSotao.position.set(0, 2.95, 1.53);
  aroSotao.castShadow = true;
  celeiro.add(aroSotao);
  // roldana de feno
  const braco = caixa(0.09, 0.09, 0.5, matMad);
  braco.position.set(0, 3.45, 1.7);
  celeiro.add(braco);

  // ── Silo ao lado ──
  const silo = new THREE.Group();
  const cilSilo = cilindro(0.75, 0.8, 3.2, mat(0xd9d3c4, { roughness: 0.85 }), 20);
  cilSilo.position.y = 1.6;
  silo.add(cilSilo);
  for (let i = 0; i < 5; i++) {
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.035, 6, 22), mat(0xa8a294, { roughness: 0.7 }));
    aro.rotation.x = Math.PI / 2;
    aro.position.y = 0.5 + i * 0.62;
    aro.castShadow = true;
    silo.add(aro);
  }
  const cupula = esfera(0.8, matTelha, 0.62);
  cupula.position.y = 3.2;
  silo.add(cupula);
  silo.position.set(2.55, 0, -0.3);
  celeiro.add(silo);

  // ── Fardos de feno na entrada ──
  for (const [fx, fz, rot] of [[-2.3, 1.9, 0.3], [-2.75, 1.55, -0.2]]) {
    const fardo = cilindro(0.32, 0.32, 0.52, mat(0xd9b44a, { roughness: 0.95 }), 14);
    fardo.rotation.z = Math.PI / 2;
    fardo.rotation.y = rot;
    fardo.position.set(fx, 0.32, fz);
    celeiro.add(fardo);
  }

  celeiro.position.copy(CELEIRO_POS);
  celeiro.rotation.y = CELEIRO_ROT;
  mundo.add(celeiro);

  // ponto de parada em frente à porta, já no espaço do mundo
  entradaCeleiro = new THREE.Vector3(0, 0, 2.5)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), CELEIRO_ROT)
    .add(CELEIRO_POS);
}
// o obstáculo do silo é registrado junto com os demais, mais abaixo —
// `addObstaculo` ainda não existe neste ponto do arquivo
const SILO_POS = new THREE.Vector3(2.55, 0, -0.3)
  .applyAxisAngle(new THREE.Vector3(0, 1, 0), CELEIRO_ROT)
  .add(CELEIRO_POS);

// ── Moinho de vento ───────────────────────────────────────────
let pasMoinho = null;
{
  const moinho = new THREE.Group();

  // torre levemente cônica
  const torre = torneado([
    [1.42, 0], [1.36, 0.9], [1.24, 2.2], [1.10, 3.4], [1.02, 4.2], [0, 4.25],
  ], mat(PALETA.moinhoParede, { roughness: 0.85 }), 26);
  moinho.add(torre);

  // faixa de pedra na base
  const base = cilindro(1.46, 1.52, 0.5, mat(0xe0d8c8, { roughness: 0.95 }), 26);
  base.position.y = 0.25;
  moinho.add(base);

  // telhado cônico vermelho
  const telha = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 1.5, 26),
    mat(PALETA.moinhoTelha, { roughness: 0.75 })
  );
  telha.position.y = 4.95;
  telha.castShadow = true;
  moinho.add(telha);

  // porta arqueada
  const porta = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16, 1, false, 0, Math.PI),
    mat(PALETA.madeiraEsc, { roughness: 0.8 })
  );
  porta.rotation.set(Math.PI / 2, 0, 0);
  porta.position.set(0, 0.95, 1.30);
  porta.castShadow = true;
  moinho.add(porta);
  const portaBase = caixa(0.84, 0.95, 0.12, mat(PALETA.madeiraEsc, { roughness: 0.8 }));
  portaBase.position.set(0, 0.475, 1.30);
  moinho.add(portaBase);

  // janelinha
  const jan = caixa(0.44, 0.56, 0.1, mat(0x2f8fb5, { roughness: 0.4 }));
  jan.position.set(0, 2.6, 1.22);
  moinho.add(jan);

  // eixo + pás
  const eixo = cilindro(0.14, 0.14, 0.5, mat(PALETA.telhadoEsc, { roughness: 0.7 }), 12);
  eixo.rotation.x = Math.PI / 2;
  eixo.position.set(0, 4.1, 1.35);
  moinho.add(eixo);

  pasMoinho = new THREE.Group();
  pasMoinho.position.set(0, 4.1, 1.55);
  for (let i = 0; i < 4; i++) {
    const pa = new THREE.Group();
    const haste = caixa(0.26, 3.5, 0.12, mat(PALETA.moinhoPa, { roughness: 0.8 }));
    haste.position.y = 1.75;
    pa.add(haste);
    // travessas da pá, como na referência
    for (let k = 0; k < 6; k++) {
      const t = caixa(0.62, 0.12, 0.09, mat(PALETA.moinhoPa, { roughness: 0.8 }));
      t.position.set(0, 0.55 + k * 0.52, 0.02);
      pa.add(t);
    }
    pa.rotation.z = (i / 4) * Math.PI * 2;
    pasMoinho.add(pa);
  }
  moinho.add(pasMoinho);

  moinho.position.set(-2.5, 0, -11.5);
  moinho.rotation.y = 0.22;
  mundo.add(moinho);
}

// ── Milharal ──────────────────────────────────────────────────
function peMilho(x, z) {
  const g = new THREE.Group();
  const caule = cilindro(0.05, 0.07, 1.5, mat(PALETA.milhoFolha, { roughness: 0.9 }), 8);
  caule.position.y = 0.75;
  g.add(caule);
  // Folhas: lâminas compridas apontando para cima e caindo nas pontas.
  // Achatar a esfera no eixo Y (como antes) deitava a folha e o pé de
  // milho virava uma mesa verde.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
    const folha = esfera(0.5, mat(PALETA.milhoFolha, { roughness: 0.9 }), 1);
    folha.scale.set(0.14, 0.62, 0.30);
    folha.position.set(Math.cos(a) * 0.16, 0.62 + i * 0.19, Math.sin(a) * 0.16);
    folha.rotation.set(0, -a, Math.cos(a) * 0.55);   // abre para fora
    g.add(folha);
  }
  const espiga = cilindro(0.07, 0.09, 0.36, mat(PALETA.milho, { roughness: 0.7 }), 10);
  espiga.position.set(0.14, 1.05, 0.05);
  espiga.rotation.z = -0.3;
  g.add(espiga);
  const topo = cilindro(0.005, 0.045, 0.34, mat(0xdcc06a, { roughness: 0.9 }), 6);
  topo.position.y = 1.62;
  g.add(topo);
  g.position.set(x, alturaTerreno(x, z), z);
  g.rotation.y = Math.random() * Math.PI;
  mundo.add(g);
}
for (let i = 0; i < 9; i++) peMilho(6.2 + (i % 3) * 0.95, -6.5 + Math.floor(i / 3) * 1.0);

// ── Árvores (copa em 3 camadas, dá silhueta melhor que 1 esfera) ──
// Frutas que as árvores dão. `cor` também tinge a fruta caída no chão.
const FRUTAS = {
  maca:    { nome: 'Maçã',    emoji: '🍎', cor: 0xe03a2f, estrelas: 2 },
  laranja: { nome: 'Laranja', emoji: '🍊', cor: 0xf2900d, estrelas: 2 },
  pera:    { nome: 'Pera',    emoji: '🍐', cor: 0xc3d94a, estrelas: 3 },
};

const arvoresFrutiferas = [];

function arvore(x, z, escala = 1, fruta = null) {
  const g = new THREE.Group();
  const matCasca = new THREE.MeshStandardMaterial({ map: TEX_CASCA, roughness: 0.95 });
  const tronco = cilindro(0.16, 0.22, 1.3, matCasca);
  tronco.position.y = 0.65;
  tronco.userData = { tipo: 'tronco' };   // sacudir derruba fruta na hora
  g.add(tronco);

  // raízes na base, para o tronco não sair do chão como um cano
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const raiz = esfera(0.11, matCasca, 0.6);
    raiz.scale.z = 1.6;
    raiz.position.set(Math.cos(a) * 0.16, 0.06, Math.sin(a) * 0.16);
    raiz.rotation.y = -a;
    g.add(raiz);
  }

  // Cada copa recebe a textura repetida algumas vezes: em 1x1 as folhas
  // ficam esticadas na esfera e somem, virando verde liso de novo.
  const copaMat = (tex) => {
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(3, 2);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.94 });
  };
  const camadas = [[0.95, 1.45, TEX_FOLHA], [0.75, 2.05, TEX_FOLHA_CLARA], [0.5, 2.55, TEX_FOLHA]];
  for (const [r, y, tex] of camadas) {
    const c = esfera(r, copaMat(tex), 0.85);
    c.position.y = y;
    c.rotation.y = Math.random() * Math.PI;   // quebra a repetição da textura
    g.add(c);
  }

  // frutinhas penduradas: são o estoque que a árvore vai derrubando
  if (fruta) {
    const info = FRUTAS[fruta];
    const penduradas = [];
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.55 + Math.random() * 0.35;
      const f = esfera(0.115, mat(info.cor, { roughness: 0.45 }), 0.92);
      f.position.set(Math.cos(a) * r, 1.35 + Math.random() * 0.9, Math.sin(a) * r);
      g.add(f);
      penduradas.push(f);
    }
    arvoresFrutiferas.push({
      grupo: g, tipo: fruta, penduradas,
      proxima: performance.now() + (8000 + Math.random() * 12000),
    });
  }
  // assenta o tronco no relevo, senão a árvore flutua ou enterra
  g.position.set(x, alturaTerreno(x, z) - 0.05, z);
  g.scale.setScalar(escala);
  g.rotation.y = Math.random() * Math.PI;
  mundo.add(g);
  return g;
}
// O 4º item marca a árvore como frutífera. Elas ficam perto do centro,
// senão a criança nunca encontra a fruta que caiu.
const ARVORES = [
  [-11, -1, 1.1, 'maca'], [-9.5, 5, 0.9], [10.5, -3, 1.15, 'laranja'], [12, 4, 0.95],
  [6, -9, 1.0, 'pera'], [-4, -11, 1.05], [-13, -8, 0.85, 'maca'],
  // bosque do mapa ampliado
  [-19, 2, 1.2], [-22, -6, 1.0], [-17, 9, 0.95, 'laranja'], [-24, 8, 1.1],
  [18, -8, 1.15], [21, 1, 1.0], [17, 8, 0.9, 'pera'], [23, -13, 1.05],
  [-8, 14, 1.0, 'maca'], [4, 15, 1.1], [13, 13, 0.95], [-15, 15, 0.9],
  [-20, -14, 1.0], [9, -17, 1.1], [-6, -19, 0.95], [15, -20, 1.05],
  [24, 10, 1.0], [-25, -1, 0.9],
];
for (const [x, z, s, fruta] of ARVORES) arvore(x, z, s, fruta);

// ── Lago ──────────────────────────────────────────────────────
{
  // Círculo cheio (CircleGeometry sempre fecha 360°) e maior que antes —
  // era raio 2.6, foi para 4.0.
  const lago = new THREE.Mesh(
    new THREE.CircleGeometry(4.0, 40),
    mat(PALETA.agua, { roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.9 })
  );
  lago.rotation.x = -Math.PI / 2;
  lago.position.set(8.5, 0.03, 7);
  lago.receiveShadow = true;
  lago.userData = { tipo: 'lago' };   // tocar aqui enche o regador
  mundo.add(lago);
  // borda de terra
  const borda = new THREE.Mesh(new THREE.RingGeometry(4.0, 4.4, 40), mat(PALETA.terraEsc, { roughness: 1 }));
  borda.rotation.x = -Math.PI / 2;
  borda.position.set(8.5, 0.02, 7);
  mundo.add(borda);
}

// ── Peixinhos nadando no lago ──────────────────────────────────
// Peixes 3D simples: corpo alongado + barbatanas. Nadam em círculos sob
// a superfície, em raios e velocidades diferentes — o que dá a
// impressão de um cardume vivo sem precisar de IA complexa.
const LAGO_CENTRO = new THREE.Vector3(8.5, 0, 7);
const PEIXE_CORES = [0xf07028, 0xe8c020, 0xd83030, 0x28a0d8, 0xf0a020];
const peixesLago = [];

/**
 * Corpo do peixe, compartilhado entre quem nada no lago e quem é fisgado
 * na pescaria. Peixe de verdade é achatado dos LADOS (fino em X, alto em
 * Y) — a versão anterior fazia o oposto: `esfera(..., achatamento)`
 * esmagava a altura (Y) e as barbatanas tinham `scale.y` quase zero, o
 * que deixava tudo com cara de disco boiando na superfície em vez de
 * peixe nadando de pé.
 */
function criarModeloPeixe(cor, escala = 1) {
  const g = new THREE.Group();
  const mCorpo = mat(cor, { roughness: 0.35, metalness: 0.3 });

  const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.15 * escala, 14, 10), mCorpo);
  corpo.scale.set(0.62, 1.05, 1.85);   // fino nos lados, altura normal, comprido
  corpo.castShadow = true;
  g.add(corpo);

  // barbatana caudal: leque VERTICAL atrás do corpo (alto em Y, fino em X)
  const barba = new THREE.Mesh(new THREE.ConeGeometry(0.15 * escala, 0.26 * escala, 4), mCorpo);
  barba.rotation.x = Math.PI / 2;      // deita o eixo do cone para trás (Z)
  barba.scale.set(0.16, 1.15, 0.75);   // fino em X, ALTO em Y — antes era o inverso
  barba.position.z = -0.30 * escala;
  g.add(barba);

  // barbatana dorsal: espinha vertical no topo, não um caroço achatado
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.055 * escala, 0.16 * escala, 4), mCorpo);
  dorsal.scale.set(0.35, 1, 0.7);
  dorsal.position.set(0, 0.155 * escala, -0.02);
  g.add(dorsal);

  // nadadeiras peitorais, uma de cada lado
  for (const lado of [-1, 1]) {
    const peit = new THREE.Mesh(new THREE.ConeGeometry(0.04 * escala, 0.09 * escala, 4), mCorpo);
    peit.rotation.z = lado * (Math.PI / 2.3);
    peit.position.set(lado * 0.13 * escala, -0.01, 0.10 * escala);
    g.add(peit);
  }

  const olho = esfera(0.026 * escala, mat(0x1a1a1a, { roughness: 0.2 }), 1);
  olho.position.set(0.065 * escala, 0.05 * escala, 0.17 * escala);
  g.add(olho);

  return { grupo: g, corpo, barba };
}

function criarPeixe(cor, raioCirc, velocidade, yNivel, faseIni) {
  const { grupo: g, corpo, barba } = criarModeloPeixe(cor);
  g.position.set(LAGO_CENTRO.x + raioCirc, yNivel, LAGO_CENTRO.z);
  mundo.add(g);
  peixesLago.push({
    node: g, corpo, barba,
    raio: raioCirc, vel: velocidade, angulo: faseIni, y: yNivel,
  });
  return g;
}
// nadam alguns centímetros ABAIXO da superfície (y=0.03) — visíveis
// através da água, mas claramente submersos, não boiando em cima
for (let i = 0; i < 5; i++) {
  criarPeixe(
    PEIXE_CORES[i % PEIXE_CORES.length],
    0.6 + Math.random() * 2.6,
    0.4 + Math.random() * 0.5,
    -0.05 - Math.random() * 0.30,
    Math.random() * Math.PI * 2,
  );
}

function atualizarPeixes(dt, t) {
  for (const p of peixesLago) {
    p.angulo += p.vel * dt;
    p.node.position.x = LAGO_CENTRO.x + Math.cos(p.angulo) * p.raio;
    p.node.position.z = LAGO_CENTRO.z + Math.sin(p.angulo) * p.raio;
    p.node.position.y = p.y + Math.sin(t * 2 + p.angulo * 3) * 0.03;
    // olha para onde nada
    p.node.rotation.y = -p.angulo + Math.PI / 2;
    // barbatana balança
    p.barba.rotation.z = Math.sin(t * 8 + p.angulo * 2) * 0.3;
  }
}

// ── Pier (deck de madeira) no lago ─────────────────────────────
// Pontezinha de tábuas que avança sobre a água. A ponta é o ponto
// de pesca — tocar no deck leva o personagem até lá.
//
// Coordenadas recalculadas para o lago maior (raio 4.0, centro em
// x=8.5): a entrada fica 0.5 além da margem (em terra) e a ponta entra
// 1.4 unidade dentro d'água — antes a ponta mal encostava na beira.
const PIER_INICIO = new THREE.Vector3(4.0, 0, 7);
const PIER_PONTA = new THREE.Vector3(5.9, 0, 7);
{
  const g = new THREE.Group();
  const mTabua = new THREE.MeshStandardMaterial({ map: TEX_MADEIRA, roughness: 0.9 });
  const compr = PIER_PONTA.x - PIER_INICIO.x;
  // deck: ripas paralelas ao longo do pier
  for (let i = 0; i < 7; i++) {
    const ripa = caixa(compr, 0.06, 0.22, mTabua);
    ripa.position.set(PIER_INICIO.x + compr / 2, 0.18, -0.66 + i * 0.22);
    g.add(ripa);
  }
  // postes de sustentação descendo até o fundo
  for (const px of [PIER_INICIO.x + 0.3, PIER_INICIO.x + compr * 0.5, PIER_PONTA.x - 0.2]) {
    for (const sz of [-0.55, 0.55]) {
      const poste = cilindro(0.05, 0.05, 0.5, mat(PALETA.madeiraEsc, { roughness: 0.95 }), 8);
      poste.position.set(px, 0.0, sz);
      g.add(poste);
    }
  }
  // borda lateral
  for (const sz of [-0.72, 0.72]) {
    const bordaPier = caixa(compr, 0.08, 0.06, mat(PALETA.madeiraEsc, { roughness: 0.9 }));
    bordaPier.position.set(PIER_INICIO.x + compr / 2, 0.22, sz);
    g.add(bordaPier);
  }
  g.userData = { tipo: 'pier' };
  mundo.add(g);
}

// ── Mecânica de pesca ──────────────────────────────────────────
// Estado da pescaria: ociosa → indo (caminha até o pier) → esperando
// (linha na água) → mordeu (espirro) → puxando (peixe sobe) → pronto.
// Depois de pescar, um cooldown impede spam de toques.
const pesca = {
  fase: 'ociosa',
  t: 0,
  cooldownAte: 0,
  vara: null,
  linha: null,
  peixeNaLinha: null,
  tempoMordida: 0,
};

function pedirPescar() {
  if (pesca.fase !== 'ociosa') return;
  if (performance.now() < pesca.cooldownAte) {
    falar('Ainda não tem peixe na isca… espera um pouquinho! 🐟', 2600);
    return;
  }
  if (casa.fase !== 'fora') { falar('Saia do celeiro pra pescar! 🚪', 2200); return; }
  pesca.fase = 'indo';
  pesca.t = 0;
  destino = PIER_PONTA.clone();
  falar('Vou pescar! 🎣', 2200);
}

function iniciarPescaria() {
  pesca.fase = 'esperando';
  pesca.t = 0;
  pesca.tempoMordida = 2 + Math.random() * 2.5;
  // cria a vara de pescar ao lado do personagem
  const ator = ATORES[atorAtivo].node;
  pesca.vara = new THREE.Group();
  const cabo = cilindro(0.018, 0.022, 1.4, mat(0x8a5a2b, { roughness: 0.7 }), 8);
  cabo.position.y = 0.7;
  pesca.vara.add(cabo);
  // linha: cilindro fino que desce até a água
  pesca.linha = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 1.0, 4),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })
  );
  pesca.linha.position.set(0, -0.3, 0.3);
  pesca.vara.add(pesca.linha);
  // posiciona a vara ao lado do personagem, inclinada sobre a água
  pesca.vara.position.copy(ator.position);
  pesca.vara.position.y += 0.6;
  pesca.vara.rotation.set(0, ator.rotation.y, -0.3);
  mundo.add(pesca.vara);
  falar('Lancei a linha… vamos ver se o peixinho morde! 🎣', 3000);
}

function mordidaPeixe() {
  pesca.fase = 'mordeu';
  pesca.t = 0;
  // espirro d'água no ponto da linha
  const ator = ATORES[atorAtivo].node;
  const px = ator.position.x + Math.sin(ator.rotation.y) * 1.2;
  const pz = ator.position.z + Math.cos(ator.rotation.y) * 1.2;
  for (let i = 0; i < 12; i++) {
    const g = esfera(0.04 + Math.random() * 0.03, mat(0x8fd4f0, { roughness: 0.2 }), 1.2);
    const a = Math.random() * Math.PI * 2;
    g.position.set(px + Math.cos(a) * 0.3, 0.15, pz + Math.sin(a) * 0.3);
    g.userData = { vy: 1.2 + Math.random() * 1.0 };
    mundo.add(g);
    respingos.push({ node: g, vida: 0.9 });
  }
  falar('Mordeu! Puxa, puxa! 🐟', 2000);
}

function puxarPeixe() {
  pesca.fase = 'puxando';
  pesca.t = 0;
  // cria o peixe na ponta da linha, com o mesmo corpo vertical dos que
  // nadam no lago (mesma correção: barbatanas de pé, não deitadas)
  const cor = PEIXE_CORES[Math.floor(Math.random() * PEIXE_CORES.length)];
  const { grupo } = criarModeloPeixe(cor, 0.9);
  pesca.peixeNaLinha = grupo;
  // começa na água e vai subir
  const ator = ATORES[atorAtivo].node;
  pesca.peixeNaLinha.position.set(
    ator.position.x + Math.sin(ator.rotation.y) * 1.2,
    0.1,
    ator.position.z + Math.cos(ator.rotation.y) * 1.2
  );
  pesca.peixeNaLinha.userData = { yAlvo: ator.position.y + 0.8, yInicio: 0.1 };
  mundo.add(pesca.peixeNaLinha);
}

function finalizarPesca() {
  estado.peixesPescados = (estado.peixesPescados || 0) + 1;
  estado.cesta++;
  estado.estrelas += 2;
  salvar(); atualizarHUD();
  falar('Pesquei um peixinho! 🐟✨', 2800);
  avancar('pescou');
  // remove os elementos da pescaria
  if (pesca.vara) { mundo.remove(pesca.vara); pesca.vara = null; }
  if (pesca.peixeNaLinha) { mundo.remove(pesca.peixeNaLinha); pesca.peixeNaLinha = null; }
  pesca.linha = null;
  pesca.fase = 'ociosa';
  pesca.cooldownAte = performance.now() + 8000;
  // confete pequeno
  festa();
}

function atualizarPesca(dt, t) {
  if (pesca.fase === 'ociosa') return;
  const ator = ATORES[atorAtivo].node;

  switch (pesca.fase) {
    case 'indo': {
      pesca.t += dt;
      const d = Math.hypot(ator.position.x - PIER_PONTA.x, ator.position.z - PIER_PONTA.z);
      if (d < 0.5) {
        destino = null;
        // vira de frente pro lago (olhando para +X)
        ator.rotation.y = Math.PI / 2;
        iniciarPescaria();
      } else if (pesca.t > 10) {
        pesca.fase = 'ociosa';
      }
      break;
    }
    case 'esperando': {
      pesca.t += dt;
      // linha balança de leve na água
      if (pesca.linha) {
        pesca.linha.scale.y = 1 + Math.sin(t * 3) * 0.04;
      }
      if (pesca.t >= pesca.tempoMordida) mordidaPeixe();
      break;
    }
    case 'mordeu': {
      pesca.t += dt;
      // linha puxa para baixo (o peixe puxa!)
      if (pesca.linha) {
        pesca.linha.scale.y = 1 + Math.sin(pesca.t * 20) * 0.12;
      }
      if (pesca.t > 0.6) puxarPeixe();
      break;
    }
    case 'puxando': {
      pesca.t += dt;
      // peixe sobe da água até a altura da vara
      if (pesca.peixeNaLinha) {
        const ud = pesca.peixeNaLinha.userData;
        const p = Math.min(pesca.t / 0.8, 1);
        pesca.peixeNaLinha.position.y = ud.yInicio + (ud.yAlvo - ud.yInicio) * p;
        // balança na linha
        pesca.peixeNaLinha.rotation.z = Math.sin(pesca.t * 12) * 0.4;
        pesca.peixeNaLinha.rotation.x = Math.sin(pesca.t * 8) * 0.2;
      }
      if (pesca.t > 0.9) finalizarPesca();
      break;
    }
  }

  // a vara acompanha o personagem
  if (pesca.vara) {
    pesca.vara.position.copy(ator.position);
    pesca.vara.position.y += 0.6;
    pesca.vara.rotation.y = ator.rotation.y;
  }
}

// ── Cercas ────────────────────────────────────────────────────
/**
 * Segmento de cerca acompanhando o relevo: a altura vem do terreno nas
 * duas pontas e o segmento inclina entre elas. Sem isso, com o chão
 * ondulado, a cerca afunda de um lado e decola do outro.
 */
function cerca(x, z, rotY, comp = 3) {
  const g = new THREE.Group();
  const m = mat(PALETA.madeira, { roughness: 0.9 });

  // pontas do segmento no espaço do mundo, para amostrar o terreno
  const dx = Math.cos(rotY) * (comp / 2);
  const dz = -Math.sin(rotY) * (comp / 2);
  const yA = alturaTerreno(x - dx, z - dz);
  const yB = alturaTerreno(x + dx, z + dz);
  const yMeio = (yA + yB) / 2;
  const inclinacao = Math.atan2(yB - yA, comp);

  for (let i = 0; i <= 1; i++) {
    const trave = caixa(comp, 0.1, 0.07, m);
    trave.position.set(0, 0.45 + i * 0.35, 0);
    g.add(trave);
  }
  // postes descem até o chão de cada ponto, então nenhum fica no ar
  for (const px of [-comp / 2, 0, comp / 2]) {
    const yLocal = alturaTerreno(x + Math.cos(rotY) * px, z - Math.sin(rotY) * px);
    const enterrar = 0.35;                      // some um pouco no chão
    const alturaPoste = 1.0 + (yLocal - yMeio) * -1 + enterrar;
    const poste = caixa(0.11, alturaPoste, 0.11, m);
    // compensa a inclinação do grupo para o poste ficar de pé
    poste.position.set(px, 0.5 - enterrar / 2 - px * Math.tan(inclinacao), 0);
    g.add(poste);
  }

  g.position.set(x, yMeio, z);
  g.rotation.y = rotY;
  g.rotation.z = inclinacao;
  mundo.add(g);
}
// cerca acompanhando os limites do mapa ampliado
for (let i = -9; i <= 9; i++) cerca(i * 3, 19.5, 0);        // sul
for (let i = -9; i <= 9; i++) cerca(i * 3, -27.5, 0);       // norte
for (let i = -9; i <= 6; i++) cerca(-27.5, i * 3, Math.PI / 2);  // oeste
for (let i = -9; i <= 6; i++) cerca(27.5, i * 3, Math.PI / 2);   // leste

// ══════════════════════════════════════════════════════════════
//  Canteiros 3×3
// ══════════════════════════════════════════════════════════════
const canteirosMesh = [];
const gruposPlanta = [];
{
  for (let i = 0; i < 9; i++) {
    const cx = (i % 3 - 1) * 2.1;
    const cz = (Math.floor(i / 3) - 1) * 2.1 - 1;

    const solo = caixa(1.7, 0.22, 1.7, mat(PALETA.terra, { roughness: 1 }));
    solo.position.set(cx, 0.11, cz);
    solo.userData = { tipo: 'canteiro', id: i };
    mundo.add(solo);
    canteirosMesh.push(solo);

    // sulcos, só decorativo
    for (const dz of [-0.45, 0, 0.45]) {
      const s = caixa(1.5, 0.05, 0.16, mat(PALETA.terraEsc, { roughness: 1 }));
      s.position.set(cx, 0.23, cz + dz);
      mundo.add(s);
    }

    const gp = new THREE.Group();
    gp.position.set(cx, 0.22, cz);
    mundo.add(gp);
    gruposPlanta.push(gp);
  }
}

/** Constrói a planta conforme cultura e estágio. */
function construirPlanta(cultura, estagio) {
  const g = new THREE.Group();
  const c = CULTURAS[cultura];
  if (estagio === 'semente') {
    for (const [dx, dz] of [[-0.4, -0.3], [0.35, 0.1], [-0.1, 0.4]]) {
      const b = esfera(0.05, mat(0x4a3520), 0.7);
      b.position.set(dx, 0.05, dz);
      g.add(b);
    }
    return g;
  }
  const alturas = { broto: 0.22, crescendo: 0.5, pronto: 0.78 };
  const h = alturas[estagio];
  for (const [dx, dz] of [[-0.4, -0.25], [0.35, 0.15], [-0.05, 0.42]]) {
    const haste = cilindro(0.035, 0.05, h, mat(c.topo, { roughness: 0.85 }), 8);
    haste.position.set(dx, h / 2, dz);
    g.add(haste);
    // folhinhas
    for (const lado of [-1, 1]) {
      const f = esfera(0.11, mat(PALETA.folhaClara), 0.35);
      f.position.set(dx + lado * 0.12, h * 0.6, dz);
      f.rotation.z = lado * 0.5;
      g.add(f);
    }
    if (estagio === 'pronto') {
      let fruto;
      if (cultura === 'cenoura') {
        fruto = cilindro(0.02, 0.12, 0.34, mat(c.cor), 10);
        fruto.position.set(dx, h * 0.42, dz);
        fruto.rotation.x = Math.PI; // ponta pra baixo
      } else if (cultura === 'girassol') {
        fruto = new THREE.Group();
        const miolo = esfera(0.13, mat(0x6b4426), 0.5);
        fruto.add(miolo);
        for (let p = 0; p < 10; p++) {
          const a = (p / 10) * Math.PI * 2;
          const pet = esfera(0.09, mat(c.cor), 0.3);
          pet.position.set(Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17);
          pet.scale.x = 1.6;
          pet.rotation.y = -a;
          fruto.add(pet);
        }
        fruto.position.set(dx, h + 0.05, dz);
        fruto.rotation.x = -0.5;
      } else {
        fruto = esfera(cultura === 'abobora' ? 0.2 : 0.11, mat(c.cor), cultura === 'abobora' ? 0.8 : 1);
        fruto.position.set(dx, cultura === 'abobora' ? 0.2 : h * 0.75, dz);
      }
      g.add(fruto);
    }
  }
  return g;
}

// ══════════════════════════════════════════════════════════════
//  Colisão
// ══════════════════════════════════════════════════════════════
// Física completa seria exagero para o que o jogo precisa: basta o
// personagem não atravessar objetos. Cada obstáculo é um círculo no
// plano XZ; ao empurrar contra um, o movimento desliza pela borda em
// vez de travar, que é o que evita a sensação de "grudar na parede".
const obstaculos = [];
const addObstaculo = (x, z, r) => obstaculos.push({ x, z, r });

// cercado: limites externos da área jogável
const LIMITE = { minX: -27, maxX: 27, minZ: -27, maxZ: 19 };

/** Ajusta um deslocamento para não entrar em nenhum obstáculo. */
function resolverColisao(px, pz, nx, nz, raioCorpo) {
  let x = nx, z = nz;

  // dentro do celeiro valem as paredes do cômodo, não o cercado da fazenda
  if (typeof casa !== 'undefined' && casa.fase === 'dentro') {
    return {
      x: Math.max(INTERIOR_CENTRO.x + LIMITE_INTERIOR.minX, Math.min(INTERIOR_CENTRO.x + LIMITE_INTERIOR.maxX, x)),
      z: Math.max(INTERIOR_CENTRO.z + LIMITE_INTERIOR.minZ, Math.min(INTERIOR_CENTRO.z + LIMITE_INTERIOR.maxZ, z)),
    };
  }

  for (const o of obstaculos) {
    const dx = x - o.x, dz = z - o.z;
    const alcance = o.r + raioCorpo;
    const d2 = dx * dx + dz * dz;
    if (d2 >= alcance * alcance || d2 === 0) continue;
    const d = Math.sqrt(d2);
    // empurra para fora, exatamente até a borda
    x = o.x + (dx / d) * alcance;
    z = o.z + (dz / d) * alcance;
  }
  x = Math.max(LIMITE.minX, Math.min(LIMITE.maxX, x));
  z = Math.max(LIMITE.minZ, Math.min(LIMITE.maxZ, z));
  return { x, z };
}

// ══════════════════════════════════════════════════════════════
//  Personagens
// ══════════════════════════════════════════════════════════════

/**
 * A Manu. Cada membro vive num grupo-pivô posicionado na articulação,
 * com a geometria pendurada abaixo — assim rotacionar o pivô dobra o
 * membro a partir do ombro/quadril, em vez de girar no meio.
 */
function criarManu() {
  const g = new THREE.Group();
  const matPele = mat(PALETA.pele, { roughness: 0.55 });
  const matVestido = mat(PALETA.vestido, { roughness: 0.62 });
  const matVestidoEsc = mat(0xc7346f, { roughness: 0.62 });
  const matCabelo = mat(PALETA.cabelo, { roughness: 0.72 });
  const matSapato = mat(0x8d2be2, { roughness: 0.35 });

  // ── Tronco: torso justo + saia rodada, com cintura marcada ──
  const torso = torneado([
    [0.0, 0.0], [0.115, 0.005], [0.132, 0.10], [0.125, 0.20], [0.112, 0.28], [0.128, 0.34],
    [0.115, 0.40], [0.0, 0.415],
  ], matVestido, 28);
  torso.position.y = 0.52;
  g.add(torso);

  // Saia: cai em curva e fecha por baixo. O perfil termina voltando ao
  // eixo para não deixar a borda aberta virando um disco visível.
  const saia = torneado([
    [0.0, 0.0], [0.118, 0.0], [0.152, -0.075], [0.185, -0.155], [0.205, -0.215],
    [0.208, -0.235], [0.185, -0.243], [0.10, -0.248], [0.0, -0.25],
  ], matVestido, 28);
  saia.position.y = 0.60;
  g.add(saia);

  // pregas: leves vincos verticais, em vez de barra horizontal
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const prega = esfera(0.030, matVestidoEsc, 1);
    prega.scale.set(0.5, 3.4, 0.5);
    prega.position.set(Math.cos(a) * 0.185, 0.435, Math.sin(a) * 0.185);
    g.add(prega);
  }

  // alcinhas
  for (const lado of [-1, 1]) {
    const alca = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14, Math.PI), matVestido);
    alca.position.set(lado * 0.075, 0.925, 0);
    alca.rotation.y = Math.PI / 2;
    alca.castShadow = true;
    g.add(alca);
  }

  // ── Cabeça ──
  const pescoco = cilindro(0.048, 0.055, 0.075, matPele, 12);
  pescoco.position.y = 0.955;
  g.add(pescoco);

  const cabeca = new THREE.Group();
  const cranio = esfera(0.175, matPele, 1.08);
  cabeca.add(cranio);
  // bochechas, para o rosto não ser uma bola lisa
  for (const lado of [-1, 1]) {
    const bo = esfera(0.062, matPele, 0.85);
    bo.position.set(lado * 0.105, -0.045, 0.115);
    cabeca.add(bo);
    const cor = esfera(0.038, mat(0xef9a9a, { roughness: 0.7 }), 0.5);
    cor.position.set(lado * 0.115, -0.045, 0.135);
    cabeca.add(cor);
  }
  const queixo = esfera(0.085, matPele, 0.75);
  queixo.position.set(0, -0.105, 0.055);
  cabeca.add(queixo);

  // olhos: esclera + íris + pupila + brilho
  for (const lado of [-1, 1]) {
    const esclera = esfera(0.042, mat(0xffffff, { roughness: 0.25 }), 1.1);
    esclera.position.set(lado * 0.068, 0.012, 0.142);
    esclera.scale.x = 0.85;
    cabeca.add(esclera);
    const iris = esfera(0.026, mat(0x4a2c12, { roughness: 0.25 }), 1);
    iris.position.set(lado * 0.070, 0.008, 0.175);
    cabeca.add(iris);
    const pupila = esfera(0.013, mat(0x120c06, { roughness: 0.2 }));
    pupila.position.set(lado * 0.071, 0.006, 0.192);
    cabeca.add(pupila);
    const brilho = esfera(0.008, mat(0xffffff, { roughness: 0.1 }));
    brilho.position.set(lado * 0.080, 0.028, 0.196);
    cabeca.add(brilho);
    // cílio: casquinha escura acima do olho
    const cilio = new THREE.Mesh(new THREE.TorusGeometry(0.040, 0.006, 5, 12, Math.PI), matCabelo);
    cilio.position.set(lado * 0.068, 0.030, 0.150);
    cilio.rotation.set(-0.25, 0, 0);
    cabeca.add(cilio);
  }

  const nariz = esfera(0.022, matPele, 0.9);
  nariz.position.set(0, -0.032, 0.178);
  cabeca.add(nariz);

  // boca sorrindo: arco de toro
  const boca = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 6, 14, Math.PI), mat(0xb5384f, { roughness: 0.4 }));
  boca.position.set(0, -0.062, 0.162);
  boca.rotation.set(0, 0, Math.PI);
  cabeca.add(boca);

  cabeca.position.y = 1.115;
  g.add(cabeca);

  // ── Cabelo cacheado ──
  // Duas restrições brigam aqui: cobrir o topo do crânio (raio 0.175 com
  // escala Y 1.08, topo em ~0.189) sem fechar o rosto. A calota por isso
  // para na altura da testa, e a nuca é uma peça separada atrás.
  const ALTURA_TESTA = 0.075;

  const calota = torneado([
    [0.0, 0.212], [0.075, 0.206], [0.135, 0.182], [0.178, 0.130],
    [0.196, ALTURA_TESTA],
  ], matCabelo, 28);
  cabeca.add(calota);

  // volume da nuca, só atrás
  const nuca = esfera(0.185, matCabelo, 1.0);
  nuca.scale.z = 0.72;
  nuca.position.set(0, 0.01, -0.075);
  cabeca.add(nuca);

  // cachos por espiral de Fibonacci, pulando a janela do rosto
  const cachos = [];
  const N = 60;
  for (let i = 0; i < N; i++) {
    const k = (i + 0.5) / N;
    const phi = Math.acos(1 - k);            // 0 = topo
    const theta = i * 2.399963;              // ângulo de ouro
    const r = 0.198;
    const x = Math.sin(phi) * Math.cos(theta) * r;
    const z = Math.sin(phi) * Math.sin(theta) * r * 0.96;
    const y = Math.cos(phi) * r * 1.06;

    // janela do rosto: nada de cacho à frente abaixo da testa
    const naFrente = z > 0.02;
    const abaixoDaTesta = y < ALTURA_TESTA + 0.03;
    if (naFrente && abaixoDaTesta) continue;

    const c = esfera(0.050 + (i % 4) * 0.007, matCabelo, 0.95);
    c.position.set(x, y, z);
    cabeca.add(c);
    cachos.push(c);
  }
  // marias-chiquinhas laterais
  const trancas = [];
  for (const lado of [-1, 1]) {
    const t = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const b = esfera(0.058 - i * 0.009, matCabelo, 0.95);
      b.position.y = -i * 0.075;
      t.add(b);
    }
    // lacinho
    for (const s of [-1, 1]) {
      const l = esfera(0.032, mat(0xffe14d, { roughness: 0.45 }), 0.6);
      l.position.set(s * 0.03, 0.05, 0);
      l.scale.x = 1.4;
      t.add(l);
    }
    t.position.set(lado * 0.185, 0.02, -0.03);
    t.rotation.z = lado * 0.35;
    cabeca.add(t);
    trancas.push(t);
  }

  // ── Braços: pivô no ombro ──
  const bracos = [];
  for (const lado of [-1, 1]) {
    const pivo = new THREE.Group();          // ombro
    const sup = cilindro(0.040, 0.034, 0.19, matPele, 12);
    sup.position.y = -0.095;
    pivo.add(sup);

    const cotovelo = new THREE.Group();      // antebraço pendurado no cotovelo
    const inf = cilindro(0.034, 0.030, 0.18, matPele, 12);
    inf.position.y = -0.09;
    cotovelo.add(inf);
    const mao = esfera(0.046, matPele, 0.9);
    mao.position.y = -0.195;
    cotovelo.add(mao);
    cotovelo.position.y = -0.19;
    pivo.add(cotovelo);

    pivo.position.set(lado * 0.135, 0.90, 0);
    pivo.rotation.z = lado * 0.14;
    g.add(pivo);
    bracos.push({ pivo, cotovelo });
  }

  // ── Pernas: pivô no quadril ──
  const pernas = [];
  for (const lado of [-1, 1]) {
    const pivo = new THREE.Group();
    const coxa = cilindro(0.052, 0.044, 0.20, matPele, 12);
    coxa.position.y = -0.10;
    pivo.add(coxa);

    const joelho = new THREE.Group();
    const canela = cilindro(0.043, 0.038, 0.19, matPele, 12);
    canela.position.y = -0.095;
    joelho.add(canela);

    // sapatinho
    const sapato = esfera(0.058, matSapato, 0.62);
    sapato.scale.z = 1.55;
    sapato.position.set(0, -0.198, 0.022);
    joelho.add(sapato);
    const solado = esfera(0.056, mat(0x5c1a99, { roughness: 0.5 }), 0.3);
    solado.scale.z = 1.55;
    solado.position.set(0, -0.222, 0.022);
    joelho.add(solado);

    joelho.position.y = -0.20;
    pivo.add(joelho);

    pivo.position.set(lado * 0.072, 0.375, 0);
    g.add(pivo);
    pernas.push({ pivo, joelho });
  }

  g.userData = { bracos, pernas, trancas, cachos, cabeca, torso };
  return g;
}

/** Nenão: urso de pelúcia de camisa verde, com pelo em várias tonalidades. */
function criarNenao() {
  const g = new THREE.Group();
  // Tronco, cabeça e braços vivem num grupo erguido do chão: sem isso
  // as pernas nascem dentro da barriga e o urso vira uma bola.
  const ELEVACAO = 0.378;   // calibrado para a sola encostar no chão
  const alto = new THREE.Group();
  alto.position.y = ELEVACAO;
  g.add(alto);
  const mUrso = matPelo(PALETA.urso, 0x5a3618, 0xc08a4e);
  const mClaro = matPelo(PALETA.ursoClaro, 0x8a6438, 0xdcb98a, { roughness: 0.88 });
  const mFocinho = mat(0xc9a173, { roughness: 0.7 });

  // Tronco atarracado e bojudo. Pelúcia tem barriga estufada e ombros
  // estreitos — é o que dá a silhueta de brinquedo em vez de urso real.
  const corpo = torneado([
    [0.0, 0.0], [0.21, 0.005], [0.29, 0.06], [0.325, 0.16],
    [0.335, 0.26], [0.315, 0.36], [0.26, 0.46], [0.18, 0.53], [0.0, 0.55],
  ], mUrso, 28);
  alto.add(corpo);

  // barriga clara em relevo, o "avental" costurado
  const barriga = esfera(0.235, mClaro, 1.08);
  barriga.scale.z = 0.6;
  barriga.position.set(0, 0.245, 0.19);
  alto.add(barriga);

  const camisa = torneado([
    [0.0, 0.0], [0.315, 0.005], [0.325, 0.10], [0.315, 0.20], [0.28, 0.27], [0.0, 0.285],
  ], mat(PALETA.camisa, { roughness: 0.72 }), 26);
  camisa.position.y = 0.155;
  alto.add(camisa);
  // gola e barra em tom mais escuro dão acabamento de roupa
  for (const [y, r] of [[0.44, 0.20], [0.155, 0.317]]) {
    const faixa = new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 8, 26), mat(0x2c9c52, { roughness: 0.7 }));
    faixa.rotation.x = Math.PI / 2;
    faixa.position.y = y;
    faixa.castShadow = true;
    alto.add(faixa);
  }

  // ── Cabeça ──
  // Proporcionalmente grande: cabeça pequena lê como animal, cabeça
  // grande lê como brinquedo.
  const cabeca = new THREE.Group();
  const cranio = esfera(0.265, mUrso, 0.97);
  cabeca.add(cranio);
  // bochechas
  for (const lado of [-1, 1]) {
    const bo = esfera(0.105, mUrso, 0.9);
    bo.position.set(lado * 0.135, -0.045, 0.075);
    cabeca.add(bo);
  }
  // focinho saliente, com ponte até a testa
  const focinho = esfera(0.125, mFocinho, 0.82);
  focinho.scale.z = 1.25;
  focinho.position.set(0, -0.045, 0.185);
  cabeca.add(focinho);
  const ponte = esfera(0.075, mFocinho, 0.7);
  ponte.scale.z = 1.5;
  ponte.position.set(0, 0.02, 0.15);
  cabeca.add(ponte);

  const nariz = esfera(0.052, mat(0x2b2b2b, { roughness: 0.35 }), 0.72);
  nariz.scale.x = 1.25;
  nariz.position.set(0, 0.005, 0.30);
  cabeca.add(nariz);
  // boca: sulco abaixo do nariz
  const boca = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 6, 14, Math.PI), mat(0x5a3a22, { roughness: 0.6 }));
  boca.position.set(0, -0.085, 0.275);
  boca.rotation.z = Math.PI;
  cabeca.add(boca);

  for (const lado of [-1, 1]) {
    // orelhas grandes e chapadas, costuradas na lateral do crânio
    const orelha = esfera(0.115, mUrso, 0.98);
    orelha.scale.z = 0.42;
    orelha.position.set(lado * 0.205, 0.20, -0.01);
    cabeca.add(orelha);
    const dentro = esfera(0.070, mClaro, 0.92);
    dentro.scale.z = 0.35;
    dentro.position.set(lado * 0.208, 0.198, 0.045);
    cabeca.add(dentro);

    // olho com brilho
    const olho = esfera(0.036, mat(0x140f0a, { roughness: 0.22 }), 1.08);
    olho.position.set(lado * 0.095, 0.045, 0.196);
    cabeca.add(olho);
    const brilho = esfera(0.012, mat(0xffffff, { roughness: 0.1 }));
    brilho.position.set(lado * 0.105, 0.065, 0.218);
    cabeca.add(brilho);
    // sobrancelha, dá expressão
    const sob = esfera(0.045, matPelo(0x5a3618, 0x3d2410, 0x7a4d24), 0.35);
    sob.scale.z = 0.5;
    sob.position.set(lado * 0.095, 0.105, 0.185);
    sob.rotation.z = lado * 0.25;
    cabeca.add(sob);
  }

  cabeca.position.y = 0.735;
  alto.add(cabeca);

  // ── Braços com cotovelo ──
  const bracos = [];
  for (const lado of [-1, 1]) {
    const b = new THREE.Group();
    const sup = cilindro(0.072, 0.062, 0.19, mUrso, 12);
    sup.position.y = -0.095;
    b.add(sup);
    const cot = new THREE.Group();
    const inf = cilindro(0.062, 0.055, 0.17, mUrso, 12);
    inf.position.y = -0.085;
    cot.add(inf);
    const pata = esfera(0.078, mUrso, 0.92);
    pata.position.y = -0.185;
    cot.add(pata);
    const palma = esfera(0.05, mClaro, 0.55);
    palma.position.set(0, -0.20, 0.045);
    cot.add(palma);
    cot.position.y = -0.19;
    b.add(cot);

    b.position.set(lado * 0.285, 0.44, 0);
    // guarda a abertura de repouso: animar precisa somar a ela, nunca
    // sobrescrever, senão o braço gira para dentro do tronco
    b.userData.abertura = lado * 0.28;
    b.rotation.z = b.userData.abertura;
    alto.add(b);
    bracos.push(b);
  }

  // ── Pernas roliças, com pivô no quadril ──
  // Perna de pelúcia é curta e grossa, com o pé virado para frente e a
  // sola clara à mostra quando ele anda.
  const pernas = [];
  for (const lado of [-1, 1]) {
    const pivo = new THREE.Group();

    const coxa = esfera(0.115, mUrso, 1);
    coxa.scale.set(1, 1.15, 1);
    coxa.position.y = -0.10;
    pivo.add(coxa);

    const joelho = new THREE.Group();
    const canela = esfera(0.098, mUrso, 1);
    canela.scale.set(1, 1.05, 1);
    canela.position.y = -0.075;
    joelho.add(canela);

    // pé: sola clara virada para frente, como pelúcia costurada
    const pe = esfera(0.105, mUrso, 0.68);
    pe.scale.z = 1.5;
    pe.position.set(0, -0.16, 0.055);
    joelho.add(pe);
    const sola = esfera(0.072, mClaro, 0.4);
    sola.scale.z = 1.35;
    sola.position.set(0, -0.175, 0.085);
    joelho.add(sola);
    // almofadinhas dos dedos
    for (let d = -1; d <= 1; d++) {
      const dedo = esfera(0.024, mClaro, 0.75);
      dedo.position.set(d * 0.038, -0.155, 0.145);
      joelho.add(dedo);
    }

    joelho.position.y = -0.185;
    pivo.add(joelho);

    pivo.position.set(lado * 0.135, ELEVACAO + 0.04, 0);
    g.add(pivo);
    pernas.push({ pivo, joelho });
  }

  // ── Detalhes de pelúcia ──
  const mCostura = mat(0x6b4526, { roughness: 0.9 });

  // costura central do peito, marca de brinquedo de pano
  for (let i = 0; i < 7; i++) {
    const ponto = esfera(0.013, mCostura, 0.7);
    ponto.scale.z = 0.5;
    ponto.position.set(0, 0.14 + i * 0.052, 0.285 - i * 0.006);
    alto.add(ponto);
  }
  // costura de cada orelha e das juntas
  for (const lado of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const p = esfera(0.011, mCostura, 0.7);
      p.position.set(lado * (0.24 + i * 0.006), 0.735 + 0.185 + Math.cos(i * 0.7) * 0.03, -0.02 + i * 0.018);
      alto.add(p);
    }
  }
  // remendo quadrado na perna, com pontinhos em volta
  const remendo = caixa(0.13, 0.13, 0.02, mat(0xa9743d, { roughness: 0.95 }));
  remendo.position.set(-0.135, 0.22, 0.105);
  alto.add(remendo);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = esfera(0.010, mCostura, 0.7);
    p.position.set(-0.135 + Math.cos(a) * 0.078, 0.22 + Math.sin(a) * 0.078, 0.115);
    alto.add(p);
  }
  // etiqueta na lateral, aquele detalhe de bichinho de pelúcia
  const etiqueta = caixa(0.075, 0.05, 0.008, mat(0xf0ece0, { roughness: 0.85 }));
  etiqueta.position.set(0.30, 0.20, 0.06);
  etiqueta.rotation.z = 0.4;
  alto.add(etiqueta);

  g.userData = { bracos, pernas, cabeca };
  return g;
}

/** Dálmata bombeiro, com pelo texturizado e manchas em relevo. */
function criarDalmata() {
  const g = new THREE.Group();
  const mBranco = matPelo(PALETA.cao, 0xd6d0c4, 0xffffff, { roughness: 0.86 });
  const mPreto = matPelo(PALETA.caoMancha, 0x121212, 0x4a4a4a, { roughness: 0.88 });

  const corpo = esfera(0.19, mBranco, 0.85);
  corpo.scale.z = 1.5;
  corpo.position.y = 0.28;
  g.add(corpo);

  // peito e ombros, para o tronco não ser uma cápsula lisa
  const peito = esfera(0.155, mBranco, 0.95);
  peito.scale.z = 0.9;
  peito.position.set(0, 0.30, 0.16);
  g.add(peito);
  const garupa = esfera(0.16, mBranco, 0.92);
  garupa.position.set(0, 0.30, -0.20);
  g.add(garupa);

  // Manchas de dálmata: precisam ser muitas e bem distribuídas, senão
  // de longe ele lê como um cachorro branco qualquer. Cada uma é
  // achatada contra o corpo para parecer pintada, não colada.
  const MANCHAS = [
    // lombo e laterais
    [0.13, 0.36, 0.02, 0.062], [-0.12, 0.34, 0.10, 0.055], [0.09, 0.30, -0.14, 0.050],
    [-0.14, 0.28, -0.06, 0.058], [0.15, 0.24, 0.14, 0.045], [-0.10, 0.38, -0.16, 0.042],
    [0.02, 0.41, 0.12, 0.048], [-0.05, 0.20, 0.18, 0.040], [0.06, 0.19, -0.22, 0.044],
    [-0.16, 0.33, 0.20, 0.038],
  ];
  for (const [dx, dy, dz, r] of MANCHAS) {
    const m = esfera(r, mPreto, 0.55);
    m.position.set(dx, dy, dz);
    g.add(m);
  }
  // manchinha no rosto, marca registrada do dálmata
  const olhoMancha = esfera(0.055, mPreto, 0.6);
  olhoMancha.position.set(-0.085, 0.47, 0.255);
  g.add(olhoMancha);
  // manchas nas patas
  for (const [dx, dz] of [[-0.11, 0.14], [0.11, -0.14]]) {
    const p = esfera(0.048, mPreto, 0.7);
    p.position.set(dx, 0.16, dz);
    g.add(p);
  }

  const cabeca = esfera(0.145, mBranco, 0.95);
  cabeca.position.set(0, 0.44, 0.20);
  g.add(cabeca);
  // testa e maçãs do rosto
  const testa = esfera(0.115, mBranco, 0.85);
  testa.position.set(0, 0.50, 0.22);
  g.add(testa);

  // focinho em dois volumes: cana + bochechas
  const focinho = esfera(0.072, mBranco, 0.78);
  focinho.scale.z = 1.45;
  focinho.position.set(0, 0.405, 0.335);
  g.add(focinho);
  for (const lado of [-1, 1]) {
    const bochecha = esfera(0.052, mBranco, 0.85);
    bochecha.position.set(lado * 0.045, 0.385, 0.30);
    g.add(bochecha);
  }
  const nariz = esfera(0.036, mPreto, 0.78);
  nariz.scale.x = 1.2;
  nariz.position.set(0, 0.425, 0.415);
  g.add(nariz);
  // boca
  const boca = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 6, 12, Math.PI), mat(0x3a3a3a, { roughness: 0.6 }));
  boca.position.set(0, 0.365, 0.375);
  boca.rotation.z = Math.PI;
  g.add(boca);

  for (const lado of [-1, 1]) {
    // orelha caída, com espessura e interior rosado
    const orelha = esfera(0.062, mPreto, 1);
    orelha.scale.set(0.42, 1.55, 0.95);
    orelha.position.set(lado * 0.135, 0.44, 0.16);
    orelha.rotation.z = lado * 0.22;
    g.add(orelha);
    const dentro = esfera(0.032, mat(0xc98a90, { roughness: 0.75 }), 1);
    dentro.scale.set(0.3, 1.3, 0.7);
    dentro.position.set(lado * 0.152, 0.44, 0.175);
    g.add(dentro);

    // olho com íris e brilho
    const olho = esfera(0.028, mat(0x120d08, { roughness: 0.2 }), 1.05);
    olho.position.set(lado * 0.058, 0.472, 0.305);
    g.add(olho);
    const brilho = esfera(0.009, mat(0xffffff, { roughness: 0.1 }));
    brilho.position.set(lado * 0.066, 0.486, 0.322);
    g.add(brilho);
    // sobrancelha clara sobre a mancha do olho
    const sob = esfera(0.032, mBranco, 0.4);
    sob.scale.z = 0.55;
    sob.position.set(lado * 0.058, 0.508, 0.295);
    g.add(sob);
  }

  // capacete de bombeiro
  const capacete = torneado([[0.0, 0.0], [0.15, 0.01], [0.14, 0.06], [0.10, 0.11], [0.0, 0.12]], mat(PALETA.capacete, { roughness: 0.5 }), 18);
  capacete.position.set(0, 0.53, 0.19);
  g.add(capacete);
  const aba = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.20, 18, 1, 0, Math.PI), mat(PALETA.capacete, { roughness: 0.5, side: THREE.DoubleSide }));
  aba.rotation.x = -Math.PI / 2;
  aba.position.set(0, 0.535, 0.13);
  g.add(aba);

  // patas: coxa, canela e pé com dedinhos
  for (const [dx, dz] of [[-0.11, 0.14], [0.11, 0.14], [-0.11, -0.14], [0.11, -0.14]]) {
    const coxa = esfera(0.072, mBranco, 1);
    coxa.scale.set(0.85, 1.0, 0.85);
    coxa.position.set(dx, 0.20, dz);
    g.add(coxa);
    const canela = cilindro(0.040, 0.046, 0.17, mBranco, 10);
    canela.position.set(dx, 0.095, dz);
    g.add(canela);
    const pe = esfera(0.055, mBranco, 0.62);
    pe.scale.z = 1.25;
    pe.position.set(dx, 0.03, dz + 0.02);
    g.add(pe);
    for (let d = -1; d <= 1; d++) {
      const dedo = esfera(0.017, mBranco, 0.8);
      dedo.position.set(dx + d * 0.024, 0.028, dz + 0.062);
      g.add(dedo);
    }
  }

  const cauda = new THREE.Group();
  const c = cilindro(0.025, 0.04, 0.20, mBranco, 8);
  c.position.y = 0.10;
  cauda.add(c);
  cauda.position.set(0, 0.34, -0.26);
  cauda.rotation.x = -0.7;
  g.add(cauda);

  g.userData = { cauda };
  return g;
}

// A frente do personagem é +Z local, então rotation.y = PI faz olhar
// para -Z, que é onde ficam canteiros, celeiro e moinho. Sem isso eles
// nascem de costas para a fazenda e a câmera cai dentro do cenário.
const OLHANDO_PRA_FAZENDA = Math.PI;

const manu = criarManu();
manu.position.set(0, 0, 6.0);
manu.rotation.y = OLHANDO_PRA_FAZENDA;
mundo.add(manu);

const nenao = criarNenao();
nenao.position.set(-4.6, 0, 3.2);
nenao.rotation.y = OLHANDO_PRA_FAZENDA - 0.5;
mundo.add(nenao);

const dalmata = criarDalmata();
dalmata.position.set(2.2, 0, 6.6);
dalmata.rotation.y = OLHANDO_PRA_FAZENDA + 0.4;
mundo.add(dalmata);

// ── Obstáculos sólidos ────────────────────────────────────────
// Registrados depois que tudo existe, para bater com as posições reais.
addObstaculo(-7.5, -5.5, 2.6);      // celeiro
addObstaculo(-2.5, -11.5, 1.9);     // moinho
// raio de colisão menor que o raio visual (4.0) e menor que a distância
// até a ponta do pier (2.6), senão ela nunca conseguiria chegar lá
addObstaculo(8.5, 7, 2.3);          // lago
for (const [x, z, s] of [[-11, -1, 1.1], [-9.5, 5, 0.9], [10.5, -3, 1.15],
                         [12, 4, 0.95], [6, -9, 1.0], [-4, -11, 1.05], [-13, -8, 0.85]]) {
  addObstaculo(x, z, 0.5 * s);      // troncos das árvores
}
for (let i = 0; i < 9; i++) {
  addObstaculo(6.2 + (i % 3) * 0.95, -6.5 + Math.floor(i / 3) * 1.0, 0.28); // milharal
}
// as colinas são maciças: sem isso dá para caminhar para dentro delas
for (const [x, z, r] of COLINAS) addObstaculo(x, z, r * 0.62);
addObstaculo(SILO_POS.x, SILO_POS.z, 0.85);

// ── Elenco jogável ────────────────────────────────────────────
// Cada um anda a seu jeito: a Manu tem articulações completas, o
// cachorro é rápido e saltitante, o urso é lento e pesado.
let passoDoAtor = 0;

const ATORES = [
  {
    nome: 'Manu', emoji: '👧', node: manu, velocidade: 2.9, raio: 0.34, alturaCam: 1.15, dist: 7.4,
    animar(t, dt, andando) {
      const u = manu.userData;
      if (andando) {
        passoDoAtor += dt * 8.5;
        const s = Math.sin(passoDoAtor), c = Math.cos(passoDoAtor);
        u.bracos[0].pivo.rotation.x = s * 0.62;
        u.bracos[1].pivo.rotation.x = -s * 0.62;
        u.bracos[0].cotovelo.rotation.x = -Math.max(0, s) * 0.5 - 0.12;
        u.bracos[1].cotovelo.rotation.x = -Math.max(0, -s) * 0.5 - 0.12;
        u.pernas[0].pivo.rotation.x = -s * 0.55;
        u.pernas[1].pivo.rotation.x = s * 0.55;
        u.pernas[0].joelho.rotation.x = Math.max(0, s) * 0.7;
        u.pernas[1].joelho.rotation.x = Math.max(0, -s) * 0.7;
        this.bobY = Math.abs(s) * 0.045;
        u.torso.rotation.z = c * 0.035;
        for (const tr of u.trancas) tr.rotation.x = s * 0.32;
      } else {
        const r = Math.sin(t * 1.7) * 0.05;
        for (const b of u.bracos) {
          b.pivo.rotation.x += (r * 0.4 - b.pivo.rotation.x) * Math.min(1, dt * 5);
          b.cotovelo.rotation.x += (-0.18 - b.cotovelo.rotation.x) * Math.min(1, dt * 5);
        }
        for (const p of u.pernas) {
          p.pivo.rotation.x += (0 - p.pivo.rotation.x) * Math.min(1, dt * 5);
          p.joelho.rotation.x += (0 - p.joelho.rotation.x) * Math.min(1, dt * 5);
        }
        this.bobY += (0 - this.bobY) * Math.min(1, dt * 6);
        u.torso.scale.y = 1 + Math.sin(t * 1.7) * 0.018;
        u.torso.rotation.z += (0 - u.torso.rotation.z) * Math.min(1, dt * 5);
        for (const tr of u.trancas) tr.rotation.x = r * 0.6;
      }
      u.cabeca.rotation.z = Math.sin(t * 1.1) * 0.045;
    },
  },
  {
    nome: 'Bombeiro', emoji: '🐶', node: dalmata, velocidade: 3.8, raio: 0.30, alturaCam: 0.85, dist: 6.2,
    animar(t, dt, andando) {
      // trote: saltinho curto e rápido, rabo acelera quando corre
      if (andando) {
        passoDoAtor += dt * 13;
        this.bobY = Math.abs(Math.sin(passoDoAtor)) * 0.075;
        dalmata.rotation.z = Math.sin(passoDoAtor * 0.5) * 0.05;
      } else {
        this.bobY += (0 - this.bobY) * Math.min(1, dt * 8);
        dalmata.rotation.z += (0 - dalmata.rotation.z) * Math.min(1, dt * 8);
      }
      dalmata.userData.cauda.rotation.z = Math.sin(t * (andando ? 20 : 11)) * 0.5;
    },
  },
  {
    nome: 'Nenão', emoji: '🐻', node: nenao, velocidade: 2.0, raio: 0.42, alturaCam: 1.05, dist: 7.0,
    animar(t, dt, andando) {
      // gingado pesado de urso. O balanço vai em X (frente e trás); o Z
      // só oscila em torno da abertura de repouso, para os braços não
      // atravessarem o tronco.
      const [bE, bD] = nenao.userData.bracos;
      const [pE, pD] = nenao.userData.pernas;
      if (andando) {
        passoDoAtor += dt * 6.5;
        const s = Math.sin(passoDoAtor);
        this.bobY = Math.abs(s) * 0.05;
        nenao.rotation.z = s * 0.08;
        bE.rotation.x = s * 0.5;
        bD.rotation.x = -s * 0.5;
        bE.rotation.z = bE.userData.abertura + Math.abs(s) * 0.10;
        bD.rotation.z = bD.userData.abertura - Math.abs(s) * 0.10;
        // passada curta e pesada, com o joelho dobrando no recuo
        pE.pivo.rotation.x = -s * 0.42;
        pD.pivo.rotation.x = s * 0.42;
        pE.joelho.rotation.x = Math.max(0, s) * 0.55;
        pD.joelho.rotation.x = Math.max(0, -s) * 0.55;
      } else {
        this.bobY += (0 - this.bobY) * Math.min(1, dt * 6);
        nenao.rotation.z += (0 - nenao.rotation.z) * Math.min(1, dt * 6);
        bE.rotation.x += (0 - bE.rotation.x) * Math.min(1, dt * 4);
        bE.rotation.z += (bE.userData.abertura - bE.rotation.z) * Math.min(1, dt * 4);
        // aceno do braço direito: abre para fora, nunca para dentro
        bD.rotation.x = -0.55 + Math.sin(t * 3.4) * 0.28;
        bD.rotation.z = bD.userData.abertura + 0.45 + Math.sin(t * 3.4) * 0.22;
        for (const p of [pE, pD]) {
          p.pivo.rotation.x += (0 - p.pivo.rotation.x) * Math.min(1, dt * 4);
          p.joelho.rotation.x += (0 - p.joelho.rotation.x) * Math.min(1, dt * 4);
        }
      }
    },
  },
];
let atorAtivo = 0;

function textoTextura(txt, px = 128) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const ctx = cv.getContext('2d');
  ctx.font = `${px * 0.78}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, px / 2, px * 0.55);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── Animais em 3D ─────────────────────────────────────────────
// Emoji num mundo 3D destoa, então cada bicho é modelado com as
// mesmas primitivas do resto da cena.
const CORES_BICHO = {
  galinha: { corpo: 0xfaf6ef, bico: 0xf5a623, crista: 0xd83a2f, pata: 0xe09020 },
  vaca:    { corpo: 0xfbfbfb, mancha: 0x2e2e2e, chifre: 0xe8d9b5, ubere: 0xeda3a8 },
  ovelha:  { corpo: 0xf6f4ef, rosto: 0x4a4a4a },
  porco:   { corpo: 0xf2a3ad, focinho: 0xe0838f },
};

function criarQuadrupede({ corpo, altura, compr, larg, cabecaR, corCorpo, corCabeca, orelhas, manchas, chifres, rabo }) {
  const g = new THREE.Group();
  const mC = mat(corCorpo, { roughness: 0.85 });
  const mH = mat(corCabeca ?? corCorpo, { roughness: 0.85 });

  const tronco = esfera(corpo, mC, 0.82);
  tronco.scale.z = compr;
  tronco.scale.x = larg;
  tronco.position.y = altura;
  g.add(tronco);

  const cabeca = esfera(cabecaR, mH, 0.95);
  cabeca.position.set(0, altura + corpo * 0.42, corpo * compr * 0.92);
  g.add(cabeca);

  if (manchas) {
    for (const [dx, dy, dz, r] of manchas) {
      const m = esfera(r, mat(manchas.cor ?? 0x2e2e2e, { roughness: 0.85 }), 0.55);
      m.position.set(dx, altura + dy, dz);
      g.add(m);
    }
  }

  // olhos
  for (const lado of [-1, 1]) {
    const o = esfera(cabecaR * 0.17, mat(0x1a1a1a, { roughness: 0.3 }), 1.1);
    o.position.set(lado * cabecaR * 0.44, altura + corpo * 0.5, corpo * compr * 0.92 + cabecaR * 0.78);
    g.add(o);
  }

  if (orelhas) {
    for (const lado of [-1, 1]) {
      const or = esfera(cabecaR * 0.34, mH, 0.5);
      or.scale.set(0.7, 1, 1.1);
      or.position.set(lado * cabecaR * 0.82, altura + corpo * 0.62, corpo * compr * 0.86);
      or.rotation.z = lado * 0.5;
      g.add(or);
    }
  }

  if (chifres) {
    for (const lado of [-1, 1]) {
      const ch = cilindro(0.012, 0.03, cabecaR * 0.5, mat(chifres, { roughness: 0.6 }), 8);
      ch.position.set(lado * cabecaR * 0.5, altura + corpo * 0.78, corpo * compr * 0.86);
      ch.rotation.z = lado * 0.7;
      g.add(ch);
    }
  }

  // pernas
  const pernas = [];
  const px = corpo * larg * 0.56, pz = corpo * compr * 0.5;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const p = cilindro(corpo * 0.13, corpo * 0.15, altura, mC, 8);
    p.position.set(sx * px, altura / 2, sz * pz);
    g.add(p);
    pernas.push(p);
  }

  if (rabo) {
    const r = cilindro(0.012, 0.022, corpo * 0.7, mC, 6);
    r.position.set(0, altura + corpo * 0.3, -corpo * compr - 0.02);
    r.rotation.x = 0.6;
    g.add(r);
  }

  g.userData.pernas = pernas;
  return g;
}

function criarGalinha() {
  const c = CORES_BICHO.galinha;
  const g = new THREE.Group();
  const mC = mat(c.corpo, { roughness: 0.8 });

  const corpo = esfera(0.19, mC, 0.95);
  corpo.scale.z = 1.25;
  corpo.position.y = 0.26;
  g.add(corpo);

  const cabeca = esfera(0.105, mC, 1.05);
  cabeca.position.set(0, 0.45, 0.13);
  g.add(cabeca);

  const crista = esfera(0.05, mat(c.crista, { roughness: 0.7 }), 1.1);
  crista.scale.x = 0.45;
  crista.position.set(0, 0.54, 0.13);
  g.add(crista);

  const bico = cilindro(0.001, 0.038, 0.09, mat(c.bico, { roughness: 0.6 }), 8);
  bico.rotation.x = Math.PI / 2;
  bico.position.set(0, 0.44, 0.235);
  g.add(bico);

  for (const lado of [-1, 1]) {
    const o = esfera(0.019, mat(0x1a1a1a, { roughness: 0.3 }));
    o.position.set(lado * 0.048, 0.47, 0.205);
    g.add(o);
    // asa
    const asa = esfera(0.10, mC, 0.6);
    asa.scale.z = 1.5;
    asa.position.set(lado * 0.17, 0.28, 0.0);
    asa.rotation.z = lado * 0.3;
    g.add(asa);
    // pata
    const p = cilindro(0.014, 0.016, 0.16, mat(c.pata, { roughness: 0.6 }), 6);
    p.position.set(lado * 0.07, 0.08, 0.02);
    g.add(p);
  }

  // cauda
  const cauda = esfera(0.11, mC, 0.75);
  cauda.scale.z = 0.6;
  cauda.position.set(0, 0.34, -0.22);
  cauda.rotation.x = -0.6;
  g.add(cauda);

  return g;
}

function criarOvelha() {
  const c = CORES_BICHO.ovelha;
  const g = new THREE.Group();
  const mLa = mat(c.corpo, { roughness: 1.0 });
  const mRosto = mat(c.rosto, { roughness: 0.7 });

  // lã: aglomerado de esferas, o que dá a silhueta fofa
  for (const [dx, dy, dz, r] of [
    [0, 0.42, 0, 0.24], [0.14, 0.44, 0.10, 0.16], [-0.14, 0.44, 0.10, 0.16],
    [0.14, 0.42, -0.12, 0.16], [-0.14, 0.42, -0.12, 0.16], [0, 0.52, -0.02, 0.17],
  ]) {
    const b = esfera(r, mLa, 0.92);
    b.position.set(dx, dy, dz);
    g.add(b);
  }

  const cabeca = esfera(0.115, mRosto, 1.05);
  cabeca.position.set(0, 0.46, 0.28);
  g.add(cabeca);
  const testa = esfera(0.10, mLa, 0.7);
  testa.position.set(0, 0.55, 0.24);
  g.add(testa);

  for (const lado of [-1, 1]) {
    const o = esfera(0.02, mat(0x1a1a1a, { roughness: 0.3 }));
    o.position.set(lado * 0.05, 0.48, 0.375);
    g.add(o);
    const or = esfera(0.055, mRosto, 0.45);
    or.scale.z = 1.4;
    or.position.set(lado * 0.13, 0.50, 0.25);
    or.rotation.z = lado * 0.6;
    g.add(or);
    for (const sz of [1, -1]) {
      const p = cilindro(0.024, 0.026, 0.24, mRosto, 8);
      p.position.set(lado * 0.11, 0.12, sz * 0.12);
      g.add(p);
    }
  }
  return g;
}

function criarVaca() {
  const c = CORES_BICHO.vaca;
  const g = criarQuadrupede({
    corpo: 0.30, altura: 0.36, compr: 1.35, larg: 0.92, cabecaR: 0.17,
    corCorpo: c.corpo, orelhas: true, chifres: c.chifre, rabo: true,
  });
  // manchas pretas
  for (const [dx, dy, dz, r] of [[0.16, 0.10, 0.10, 0.13], [-0.14, 0.06, -0.14, 0.11], [0.05, 0.20, -0.05, 0.10], [-0.18, 0.14, 0.16, 0.09]]) {
    const m = esfera(r, mat(c.mancha, { roughness: 0.85 }), 0.5);
    m.position.set(dx, 0.36 + dy, dz);
    g.add(m);
  }
  // focinho
  const foc = esfera(0.10, mat(c.ubere, { roughness: 0.75 }), 0.8);
  foc.position.set(0, 0.46, 0.53);
  g.add(foc);
  return g;
}

function criarPorco() {
  const c = CORES_BICHO.porco;
  const g = criarQuadrupede({
    corpo: 0.24, altura: 0.24, compr: 1.30, larg: 0.95, cabecaR: 0.145,
    corCorpo: c.corpo, orelhas: true, rabo: false,
  });
  // focinho achatado
  const foc = cilindro(0.062, 0.062, 0.05, mat(c.focinho, { roughness: 0.7 }), 12);
  foc.rotation.x = Math.PI / 2;
  foc.position.set(0, 0.32, 0.44);
  g.add(foc);
  // rabinho enrolado
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 6, 12, Math.PI * 1.6), mat(c.corpo, { roughness: 0.85 }));
  r.position.set(0, 0.34, -0.33);
  r.rotation.y = Math.PI / 2;
  g.add(r);
  return g;
}

const FABRICA_BICHO = { galinha: criarGalinha, vaca: criarVaca, ovelha: criarOvelha, porco: criarPorco };

const animaisMesh = [];
for (const a of ANIMAIS) {
  const g = new THREE.Group();
  const corpo = FABRICA_BICHO[a.tipo]();
  g.add(corpo);
  g.position.set(...a.pos);
  g.rotation.y = Math.PI + (Math.random() - 0.5) * 0.6;
  g.userData = { tipo: 'animal', animal: a.tipo };
  mundo.add(g);
  animaisMesh.push({
    grupo: g, corpo, tipo: a.tipo, fase: Math.random() * 6,
    // estado da IA: pastando (parado), andando, ou indo comer
    estado: 'pastando',
    espera: 1 + Math.random() * 3,
    destino: null,
    velocidade: a.tipo === 'galinha' ? 1.5 : a.tipo === 'porco' ? 1.1 : 0.95,
    raio: a.tipo === 'galinha' ? 0.30 : a.tipo === 'vaca' ? 0.55 : 0.42,
    casa: new THREE.Vector3(...a.pos),   // fica pelas redondezas de onde nasceu
  });
}

// ══════════════════════════════════════════════════════════════
//  IA dos animais
// ══════════════════════════════════════════════════════════════
// Cada bicho alterna entre pastar parado e caminhar até um ponto perto
// de casa. Com o cocho cheio, todos largam a rotina e vão comer — é o
// que dá a sensação de que reagiram ao que a criança fez.
const RAIO_PASSEIO = 7.5;

function pontoPertoDeCasa(casa) {
  const a = Math.random() * Math.PI * 2;
  const r = 1.5 + Math.random() * RAIO_PASSEIO;
  return new THREE.Vector3(
    Math.max(LIMITE.minX + 1, Math.min(LIMITE.maxX - 1, casa.x + Math.cos(a) * r)),
    0,
    Math.max(LIMITE.minZ + 1, Math.min(LIMITE.maxZ - 1, casa.z + Math.sin(a) * r))
  );
}

function moverBicho(b, alvo, dt) {
  const dir = new THREE.Vector3().subVectors(alvo, b.grupo.position);
  dir.y = 0;
  const d = dir.length();
  if (d < 0.35) return true;                       // chegou
  dir.normalize();
  const passo = dt * b.velocidade;
  const novo = resolverColisao(
    b.grupo.position.x, b.grupo.position.z,
    b.grupo.position.x + dir.x * passo,
    b.grupo.position.z + dir.z * passo,
    b.raio
  );
  const avancou = Math.hypot(novo.x - b.grupo.position.x, novo.z - b.grupo.position.z);
  b.grupo.position.x = novo.x;
  b.grupo.position.z = novo.z;

  let da = Math.atan2(dir.x, dir.z) - b.grupo.rotation.y;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  b.grupo.rotation.y += da * Math.min(1, dt * 4);

  // esbarrou em algo: desiste deste destino em vez de empurrar a parede
  return avancou < passo * 0.2;
}

function atualizarIA(dt, t) {
  const cochoCheio = cochoRacao && cochoRacao.visible;
  for (const b of animaisMesh) {
    if (cochoCheio && b.estado !== 'comendo') {
      b.estado = 'indoComer';
      // cada um para num ponto diferente em volta do cocho, sem empilhar
      const a = (animaisMesh.indexOf(b) / animaisMesh.length) * Math.PI * 2;
      b.destino = new THREE.Vector3(
        COCHO_POS.x + Math.cos(a) * 1.5, 0, COCHO_POS.z + Math.sin(a) * 1.5
      );
    }

    switch (b.estado) {
      case 'pastando':
        b.espera -= dt;
        if (b.espera <= 0) {
          b.estado = 'andando';
          b.destino = pontoPertoDeCasa(b.casa);
        }
        // mastiga: abaixa e levanta a cabeça
        b.corpo.rotation.x = Math.sin(t * 2.2 + b.fase) * 0.05;
        break;

      case 'andando': {
        const acabou = moverBicho(b, b.destino, dt);
        // bamboleio de caminhada
        b.corpo.position.y = Math.abs(Math.sin(t * 7 + b.fase)) * 0.05;
        b.corpo.rotation.z = Math.sin(t * 7 + b.fase) * 0.04;
        if (acabou) {
          b.estado = 'pastando';
          b.espera = 2 + Math.random() * 5;
          b.corpo.position.y = 0;
          b.corpo.rotation.z = 0;
        }
        break;
      }

      case 'indoComer': {
        const chegou = moverBicho(b, b.destino, dt);
        b.corpo.position.y = Math.abs(Math.sin(t * 8 + b.fase)) * 0.06;
        if (chegou) {
          b.estado = 'comendo';
          b.tempoComendo = 6 + Math.random() * 4;
          b.grupo.lookAt(COCHO_POS.x, 0, COCHO_POS.z);
        }
        break;
      }

      case 'comendo':
        b.tempoComendo -= dt;
        b.corpo.rotation.x = 0.22 + Math.sin(t * 8 + b.fase) * 0.1;  // cabeça no cocho
        if (b.tempoComendo <= 0 || !cochoCheio) {
          b.estado = 'pastando';
          b.espera = 1 + Math.random() * 3;
          b.corpo.rotation.x = 0;
        }
        break;
    }
  }
}

// ── Cocho de comida ───────────────────────────────────────────
// Encher o cocho é o que faz os bichos largarem o passeio e virem comer.
const COCHO_POS = new THREE.Vector3(-2.2, 0, 9.5);
let cochoRacao = null;
{
  const g = new THREE.Group();
  const m = mat(PALETA.madeira, { roughness: 0.9 });
  const fundo = caixa(2.0, 0.12, 0.8, m);
  fundo.position.y = 0.34;
  g.add(fundo);
  for (const lado of [-1, 1]) {
    const parede = caixa(2.0, 0.34, 0.1, m);
    parede.position.set(0, 0.5, lado * 0.35);
    parede.rotation.x = lado * 0.22;
    g.add(parede);
    const pe = caixa(0.16, 0.4, 0.7, mat(PALETA.madeiraEsc, { roughness: 0.9 }));
    pe.position.set(lado * 0.85, 0.2, 0);
    g.add(pe);
  }
  // ração: só aparece quando o cocho está cheio
  cochoRacao = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const gr = esfera(0.055 + Math.random() * 0.03, mat(0xe0b64a, { roughness: 0.9 }), 0.8);
    gr.position.set((Math.random() - 0.5) * 1.7, 0.44 + Math.random() * 0.05, (Math.random() - 0.5) * 0.55);
    cochoRacao.add(gr);
  }
  cochoRacao.visible = false;
  g.add(cochoRacao);

  g.position.copy(COCHO_POS);
  g.userData = { tipo: 'cocho' };
  mundo.add(g);
}
addObstaculo(COCHO_POS.x, COCHO_POS.z, 1.0);

// ── Ninho da galinha ──────────────────────────────────────────
// Lugar fixo e reconhecível: sem isso o ovo cai onde a galinha estiver e
// a criança tem de vasculhar o mapa inteiro.
const NINHO_POS = new THREE.Vector3(-4.6, 0, 8.2);
{
  const g = new THREE.Group();
  const mPalha = mat(0xd9b44a, { roughness: 0.95 });
  // cesto de palha: anel de gravetos
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const gr = cilindro(0.045, 0.045, 0.5, mPalha, 6);
    gr.position.set(Math.cos(a) * 0.52, 0.13, Math.sin(a) * 0.52);
    gr.rotation.set(Math.PI / 2, 0, -a);
    gr.rotation.z += 0.3;
    g.add(gr);
  }
  const forro = esfera(0.44, mat(0xc79a3a, { roughness: 1 }), 0.34);
  forro.position.y = 0.09;
  g.add(forro);
  g.position.copy(NINHO_POS);
  g.userData = { tipo: 'ninho' };
  mundo.add(g);
}

// ── Ovos no chão ──────────────────────────────────────────────
// Quando a galinha bota, o ovo aparece de verdade no lugar dela.
const ovosNoChao = [];
function porOvoNoChao(x, z) {
  const g = new THREE.Group();
  const ovo = esfera(0.13, mat(0xfff6e3, { roughness: 0.45 }), 1.3);
  ovo.position.y = 0.14;
  ovo.rotation.z = 0.3;
  g.add(ovo);
  // brilho para a criança achar o ovo de longe
  const marca = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.32, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe45c, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  marca.rotation.x = -Math.PI / 2;
  marca.position.y = 0.02;
  g.add(marca);
  g.position.set(x, 0, z);
  g.userData = { tipo: 'ovo' };
  mundo.add(g);
  ovosNoChao.push({ node: g, marca, nascido: performance.now() });
  return g;
}

// ══════════════════════════════════════════════════════════════
//  Interior do celeiro
// ══════════════════════════════════════════════════════════════
// Construído longe do mapa, não dentro da casinha: assim o cômodo pode
// ser maior e mais aconchegante que a caixa vista de fora, sem que as
// paredes de lá apareçam aqui.
const INTERIOR_CENTRO = new THREE.Vector3(0, -60, 0);
const interiorCeleiro = new THREE.Group();
const LIMITE_INTERIOR = { minX: -5.2, maxX: 5.2, minZ: -4.0, maxZ: 4.2 };
{
  const mTabua = new THREE.MeshStandardMaterial({ map: TEX_MADEIRA, roughness: 0.94 });
  const mParede = new THREE.MeshStandardMaterial({ map: TEX_CELEIRO, roughness: 0.95 });
  const mPalha = mat(0xd9b44a, { roughness: 0.98 });

  // piso de tábuas
  const piso = caixa(12, 0.2, 10, mTabua);
  piso.position.y = -0.1;
  piso.receiveShadow = true;
  interiorCeleiro.add(piso);

  // paredes e teto
  for (const [x, z, l, p] of [[0, -5, 12, 0.3], [-6, 0, 0.3, 10], [6, 0, 0.3, 10]]) {
    const par = caixa(l, 4.2, p, mParede);
    par.position.set(x, 2.1, z);
    interiorCeleiro.add(par);
  }
  const teto = caixa(12, 0.3, 10, mat(0x5c3a22, { roughness: 0.95 }));
  teto.position.y = 4.2;
  interiorCeleiro.add(teto);
  // vigas do telhado
  for (let i = -2; i <= 2; i++) {
    const viga = caixa(12, 0.22, 0.22, mat(0x6b4526, { roughness: 0.9 }));
    viga.position.set(0, 3.9, i * 2);
    interiorCeleiro.add(viga);
  }

  // porta de saída, na parede da frente
  const vaoLuz = caixa(1.6, 2.2, 0.12, mat(0xffe9b0, { roughness: 0.5 }));
  vaoLuz.position.set(0, 1.1, 4.9);
  interiorCeleiro.add(vaoLuz);

  // fardos de feno empilhados
  for (const [x, y, z, rot] of [[-4.2, 0.35, -3.6, 0.2], [-4.2, 1.05, -3.6, -0.15],
                                [-3.3, 0.35, -3.8, 0.5], [4.3, 0.35, -3.5, -0.3]]) {
    const fardo = cilindro(0.36, 0.36, 0.66, mPalha, 14);
    fardo.rotation.z = Math.PI / 2;
    fardo.rotation.y = rot;
    fardo.position.set(x, y, z);
    interiorCeleiro.add(fardo);
    // cordas do fardo
    for (const off of [-0.16, 0.16]) {
      const corda = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.022, 6, 18), mat(0x8a6a2a, { roughness: 0.9 }));
      corda.position.set(x + off, y, z);
      corda.rotation.y = Math.PI / 2;
      corda.rotation.x = rot;
      interiorCeleiro.add(corda);
    }
  }
  // palha solta no chão
  for (let i = 0; i < 40; i++) {
    const p = caixa(0.22 + Math.random() * 0.2, 0.02, 0.03, mPalha);
    p.position.set((Math.random() - 0.5) * 9, 0.01, (Math.random() - 0.5) * 7.5);
    p.rotation.y = Math.random() * Math.PI;
    interiorCeleiro.add(p);
  }

  // bancada com ferramentas na parede do fundo
  const bancada = caixa(3.4, 0.16, 0.8, mTabua);
  bancada.position.set(1.6, 0.95, -4.4);
  interiorCeleiro.add(bancada);
  for (const px of [0.2, 3.0]) {
    const pe = caixa(0.14, 0.95, 0.7, mTabua);
    pe.position.set(px, 0.47, -4.4);
    interiorCeleiro.add(pe);
  }
  // pá, ancinho e forcado pendurados
  const ferramentas = [
    { x: -1.0, cabo: 0x9c6b3f, ponta: 0xb9bcc4, forma: 'pa' },
    { x: -2.0, cabo: 0x9c6b3f, ponta: 0xb9bcc4, forma: 'ancinho' },
    { x: -3.0, cabo: 0x9c6b3f, ponta: 0xb9bcc4, forma: 'forcado' },
  ];
  for (const f of ferramentas) {
    const cabo = cilindro(0.035, 0.035, 1.7, mat(f.cabo, { roughness: 0.9 }), 8);
    cabo.position.set(f.x, 1.9, -4.72);
    interiorCeleiro.add(cabo);
    if (f.forma === 'pa') {
      const pa = caixa(0.3, 0.36, 0.04, mat(f.ponta, { roughness: 0.4, metalness: 0.5 }));
      pa.position.set(f.x, 1.0, -4.72);
      interiorCeleiro.add(pa);
    } else {
      const trav = caixa(0.42, 0.05, 0.05, mat(f.ponta, { roughness: 0.4, metalness: 0.5 }));
      trav.position.set(f.x, 1.12, -4.72);
      interiorCeleiro.add(trav);
      const dentes = f.forma === 'ancinho' ? 5 : 3;
      for (let d = 0; d < dentes; d++) {
        const dente = cilindro(0.02, 0.02, 0.26, mat(f.ponta, { roughness: 0.4, metalness: 0.5 }), 6);
        dente.position.set(f.x - 0.18 + d * (0.36 / (dentes - 1)), 0.99, -4.72);
        interiorCeleiro.add(dente);
      }
    }
  }

  // baú da colheita: guarda o que ela juntou
  const bau = new THREE.Group();
  const corpoBau = caixa(1.3, 0.7, 0.85, mTabua);
  corpoBau.position.y = 0.35;
  bau.add(corpoBau);
  const tampa = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.44, 1.3, 16, 1, false, 0, Math.PI),
    mat(0x8a5a2b, { roughness: 0.9 })
  );
  tampa.rotation.z = Math.PI / 2;
  tampa.position.y = 0.7;
  bau.add(tampa);
  for (const px of [-0.5, 0.5]) {
    const cinta = caixa(0.09, 0.74, 0.88, mat(0x6b4526, { roughness: 0.7, metalness: 0.3 }));
    cinta.position.set(px, 0.36, 0);
    bau.add(cinta);
  }
  const fecho = esfera(0.07, mat(0xd9b44a, { roughness: 0.35, metalness: 0.6 }), 0.8);
  fecho.position.set(0, 0.62, 0.44);
  bau.add(fecho);
  bau.position.set(-2.6, 0, 2.4);
  bau.userData = { tipo: 'bau' };
  interiorCeleiro.add(bau);

  // lampião pendurado, dá o aconchego
  const lampiao = new THREE.Group();
  const vidro = esfera(0.16, new THREE.MeshBasicMaterial({ color: 0xffdf8a }), 1.2);
  lampiao.add(vidro);
  const alca = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12), mat(0x5a5a5a, { roughness: 0.5 }));
  alca.position.y = 0.2;
  lampiao.add(alca);
  lampiao.position.set(2.4, 3.1, 1.0);
  interiorCeleiro.add(lampiao);
  const luzLampiao = new THREE.PointLight(0xffcf6a, 12, 9, 2);
  luzLampiao.position.set(2.4, 3.0, 1.0);
  interiorCeleiro.add(luzLampiao);

  // luz geral suave, senão o cômodo fica escuro demais
  interiorCeleiro.add(new THREE.HemisphereLight(0xffe0b0, 0x6b4526, 1.5));

  interiorCeleiro.position.copy(INTERIOR_CENTRO);
  interiorCeleiro.visible = false;
  cena.add(interiorCeleiro);
}

// ── Entrar e sair do celeiro ──────────────────────────────────
// A porta só abre quando o personagem chega perto; ele então caminha
// para dentro e some. Fica lá até o jogador mandar sair — nada de timer,
// como pedido.
const casa = {
  fase: 'fora',          // fora | indo | entrando | dentro | saindo
  quem: null,
  portasAlvo: 0,         // 0 fechadas, 1 abertas
  t: 0,
};

/** Baú: mostra o que ela já juntou, sem tirar nada dela. */
function abrirBau() {
  const c = estado.cesta || 0;
  const e = estado.estrelas || 0;
  if (c === 0) {
    falar('O baú tá vazio! Colhe umas plantinhas pra guardar 🧺', 3400);
    return;
  }
  falar(`No meu baú tem ${c} colheita${c > 1 ? 's' : ''} e ${e} estrelinha${e > 1 ? 's' : ''}! 🧺✨`, 4000);
}

function pedirEntrarNaCasa() {
  if (casa.fase !== 'fora') return;
  casa.fase = 'indo';
  casa.quem = atorAtivo;
  destino = entradaCeleiro.clone();
  falar('Vou entrar no celeiro! 🚪', 2200);
}

function sairDaCasa() {
  if (casa.fase !== 'dentro') return;
  casa.fase = 'saindo';
  casa.t = 0;
  casa.portasAlvo = 1;
  el('sairCasa').style.display = 'none';
}

function atualizarCasa(dt) {
  const ator = ATORES[casa.quem ?? atorAtivo];
  const node = ator?.node;

  switch (casa.fase) {
    case 'indo': {
      if (!node) { casa.fase = 'fora'; break; }
      const d = Math.hypot(node.position.x - entradaCeleiro.x, node.position.z - entradaCeleiro.z);
      casa.portasAlvo = d < 3.2 ? 1 : 0;     // abre ao se aproximar
      if (d < 0.6) {
        casa.fase = 'entrando';
        casa.t = 0;
        destino = null;
      }
      break;
    }
    case 'entrando': {
      casa.t += dt;
      casa.portasAlvo = 1;
      // caminha para dentro do vão e some atrás da porta
      const p = Math.min(casa.t / 1.0, 1);
      node.position.x = entradaCeleiro.x + (CELEIRO_POS.x - entradaCeleiro.x) * p;
      node.position.z = entradaCeleiro.z + (CELEIRO_POS.z - entradaCeleiro.z) * p;
      node.rotation.y = Math.atan2(CELEIRO_POS.x - entradaCeleiro.x, CELEIRO_POS.z - entradaCeleiro.z);
      node.scale.setScalar(1 - p * 0.3);
      if (p >= 1) {
        // aparece de verdade no cômodo, junto à porta interna
        node.scale.setScalar(1);
        // mais para o meio do cômodo: colada na porta, a câmera de trás
        // atravessaria a parede dos fundos
        node.position.set(INTERIOR_CENTRO.x, INTERIOR_CENTRO.y, INTERIOR_CENTRO.z + 0.8);
        node.rotation.y = 0;
        interiorCeleiro.visible = true;
        // o mundo continua visível: os personagens vivem nele, e esconder
        // tudo escondia também quem entrou. O cômodo fica 60 unidades
        // abaixo, então o campo não aparece no enquadramento.
        cena.fog = null;               // névoa de campo aberto não cabe aqui
        cena.background = new THREE.Color(0x2a1c12);
        casa.fase = 'dentro';
        casa.portasAlvo = 0;
        // corte seco de câmera: interpolar 60 unidades faria ela voar
        // atravessando o mundo até chegar no cômodo
        camPosicionada = false;
        el('sairCasa').style.display = 'flex';
        falar('Olha o celeiro por dentro! 🏠', 3000);
      }
      break;
    }
    case 'dentro':
      casa.portasAlvo = 0;
      break;
    case 'saindo': {
      casa.t += dt;
      if (casa.t > 0.35 && interiorCeleiro.visible) {
        // volta ao mundo, saindo pela porta
        interiorCeleiro.visible = false;
        cena.fog = nevoaOriginal;
        cena.background = new THREE.Color(PALETA.ceu);
        node.position.set(CELEIRO_POS.x, 0, CELEIRO_POS.z);
        node.scale.setScalar(0.7);
        camPosicionada = false;   // corta de volta para o campo
      }
      if (casa.t > 0.45) {
        node.visible = true;
        const p = Math.min((casa.t - 0.45) / 1.0, 1);
        node.position.x = CELEIRO_POS.x + (entradaCeleiro.x - CELEIRO_POS.x) * p;
        node.position.z = CELEIRO_POS.z + (entradaCeleiro.z - CELEIRO_POS.z) * p;
        node.rotation.y = Math.atan2(entradaCeleiro.x - CELEIRO_POS.x, entradaCeleiro.z - CELEIRO_POS.z);
        node.scale.setScalar(0.7 + p * 0.3);
        if (p >= 1) {
          node.scale.setScalar(1);
          casa.fase = 'fora';
          casa.quem = null;
          casa.portasAlvo = 0;
          falar('Voltei pro sol! ☀️', 2200);
        }
      }
      break;
    }
  }

  // porta acompanha o alvo com suavização
  for (const p of portasCeleiro) {
    p.aberto += (casa.portasAlvo - p.aberto) * Math.min(1, dt * 3.4);
    p.pivo.rotation.y = -p.lado * p.aberto * 1.9;
  }
}

// ══════════════════════════════════════════════════════════════
//  Regador
// ══════════════════════════════════════════════════════════════
// Regar deixa de ser um toque solto: a água acaba e precisa ser buscada
// no lago. Vira um ciclo de ida e volta, e o lago passa a ter função.

const CAPACIDADE_REGADOR = 3;
const LAGO_POS = new THREE.Vector3(8.5, 0, 7);
const LAGO_RAIO = 4.0;   // acompanha o raio visual do lago

function aguaNoRegador() {
  if (estado.agua === undefined) estado.agua = CAPACIDADE_REGADOR;
  return estado.agua;
}

function encherRegador() {
  if (aguaNoRegador() >= CAPACIDADE_REGADOR) {
    falar('O regador já tá cheinho! 💧', 2200);
    return;
  }
  estado.agua = CAPACIDADE_REGADOR;
  salvar(); atualizarHUD();
  falar('Enchi o regador no lago! 💧💧💧', 2600);
  // respinguinhos na beira
  for (let i = 0; i < 14; i++) {
    const g = esfera(0.05 + Math.random() * 0.03, mat(0x8fd4f0, { roughness: 0.2 }), 1.2);
    const a = Math.random() * Math.PI * 2;
    g.position.set(LAGO_POS.x + Math.cos(a) * 1.2, 0.3, LAGO_POS.z + Math.sin(a) * 1.2);
    g.userData = { vy: 1.6 + Math.random() * 1.4 };
    mundo.add(g);
    respingos.push({ node: g, vida: 1.1 });
  }
}

const respingos = [];
function atualizarRespingos(dt) {
  for (let i = respingos.length - 1; i >= 0; i--) {
    const r = respingos[i];
    r.vida -= dt;
    r.node.userData.vy -= 7 * dt;
    r.node.position.y += r.node.userData.vy * dt;
    if (r.vida <= 0 || r.node.position.y < 0) { mundo.remove(r.node); respingos.splice(i, 1); }
  }
}

// ── Nuvem de chuva ────────────────────────────────────────────
// De vez em quando chove e a horta inteira é regada. É a lição de que a
// chuva ajuda, sem nenhuma punição envolvida.
let chuva = null;
const pingosChuva = [];

function comecarChuva() {
  if (chuva) return;
  chuva = { tempo: 0, duracao: 22 };
  falar('Olha, começou a chover! ☔ A chuva rega as plantinhas!', 3600, 'narrador');
  // escurece o céu de leve enquanto chove
  cena.fog.color.setHex(0x9db8c9);
  cena.background = new THREE.Color(0x7fa8c4);
}

function pararChuva() {
  chuva = null;
  cena.fog.color.setHex(PALETA.ceuBaixo);
  cena.background = new THREE.Color(PALETA.ceu);
  for (const p of pingosChuva) mundo.remove(p.node);
  pingosChuva.length = 0;
  falar('Parou de chover! O sol voltou! ☀️', 2800, 'narrador');
}

function atualizarChuva(dt, t) {
  // sorteia uma chuva de tempos em tempos
  if (!chuva && Math.random() < dt * 0.006) comecarChuva();
  if (!chuva) return;

  chuva.tempo += dt;
  if (chuva.tempo > chuva.duracao) {
    // ao terminar, rega tudo o que estava plantado
    let regou = 0;
    for (const c of estado.canteiros) {
      if (c.cultura && !c.regado) { c.regado = true; regou++; }
    }
    if (regou) { salvar(); desenharCanteiros(); }
    pararChuva();
    return;
  }

  // pingos caindo em volta de quem está jogando
  const centro = ATORES[atorAtivo].node.position;
  if (pingosChuva.length < 90) {
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.28, 5),
        new THREE.MeshBasicMaterial({ color: 0xb8e4f5, transparent: true, opacity: 0.7 })
      );
      g.position.set(centro.x + (Math.random() - 0.5) * 26, 9 + Math.random() * 4, centro.z + (Math.random() - 0.5) * 26);
      g.castShadow = false;
      mundo.add(g);
      pingosChuva.push({ node: g, v: 11 + Math.random() * 5 });
    }
  }
  for (let i = pingosChuva.length - 1; i >= 0; i--) {
    const p = pingosChuva[i];
    p.node.position.y -= p.v * dt;
    if (p.node.position.y < alturaTerreno(p.node.position.x, p.node.position.z)) {
      mundo.remove(p.node);
      pingosChuva.splice(i, 1);
    }
  }
}

// ── Borboletas ────────────────────────────────────────────────
// Fogem quando alguém chega perto: dá a sensação de bicho vivo, e a
// criança tenta alcançar sem nunca conseguir — o que diverte sozinho.
const borboletas = [];
function criarBorboleta(x, z) {
  const g = new THREE.Group();
  const cor = [0xffd21e, 0xff8fc0, 0x8fd4f0, 0xffffff][Math.floor(Math.random() * 4)];
  const m = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6, side: THREE.DoubleSide });
  const asas = [];
  for (const lado of [-1, 1]) {
    const asa = new THREE.Mesh(new THREE.CircleGeometry(0.11, 10), m);
    asa.position.x = lado * 0.06;
    asa.rotation.y = lado * 0.6;
    g.add(asa);
    asas.push(asa);
  }
  const corpo = cilindro(0.014, 0.014, 0.13, mat(0x3a2a1a), 6);
  corpo.rotation.x = Math.PI / 2;
  g.add(corpo);
  g.position.set(x, 1.2, z);
  mundo.add(g);
  borboletas.push({
    node: g, asas, fase: Math.random() * 6,
    alvo: new THREE.Vector3(x, 1.2, z), fugindo: 0,
  });
}
for (let i = 0; i < 7; i++) {
  criarBorboleta((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 22);
}

function atualizarBorboletas(dt, t) {
  const perseguidor = ATORES[atorAtivo].node.position;
  for (const b of borboletas) {
    const d = Math.hypot(b.node.position.x - perseguidor.x, b.node.position.z - perseguidor.z);
    if (d < 2.6) {
      // foge na direção oposta
      b.fugindo = 1.2;
      const fx = b.node.position.x - perseguidor.x, fz = b.node.position.z - perseguidor.z;
      const n = Math.hypot(fx, fz) || 1;
      b.alvo.set(
        Math.max(LIMITE.minX, Math.min(LIMITE.maxX, b.node.position.x + (fx / n) * 5)),
        1.3 + Math.random() * 0.7,
        Math.max(LIMITE.minZ, Math.min(LIMITE.maxZ, b.node.position.z + (fz / n) * 5))
      );
    } else if (b.node.position.distanceTo(b.alvo) < 0.4 || Math.random() < dt * 0.35) {
      b.alvo.set(
        Math.max(LIMITE.minX, Math.min(LIMITE.maxX, b.node.position.x + (Math.random() - 0.5) * 6)),
        1.0 + Math.random() * 0.9,
        Math.max(LIMITE.minZ, Math.min(LIMITE.maxZ, b.node.position.z + (Math.random() - 0.5) * 6))
      );
    }
    b.fugindo = Math.max(0, b.fugindo - dt);
    const vel = b.fugindo > 0 ? 3.4 : 1.1;
    b.node.position.lerp(b.alvo, Math.min(1, dt * vel));
    // voo ondulado e bater de asas
    b.node.position.y += Math.sin(t * 3 + b.fase) * dt * 0.5;
    const bater = Math.sin(t * 16 + b.fase) * 0.8;
    b.asas[0].rotation.y = 0.6 + bater;
    b.asas[1].rotation.y = -0.6 - bater;
    b.node.rotation.y = Math.atan2(b.alvo.x - b.node.position.x, b.alvo.z - b.node.position.z);
  }
}

// ══════════════════════════════════════════════════════════════
//  Ajudantes: o cachorro busca, o Nenão trabalha na horta
// ══════════════════════════════════════════════════════════════
// Cada ajudante executa uma tarefa por vez em etapas: vai até o alvo,
// faz o serviço, volta para perto da Manu. Enquanto trabalha, sai do
// modo "pet" — senão ele tentaria seguir e trabalhar ao mesmo tempo.

const tarefas = { cachorro: null, nenao: null };

const NOMES_AJUDANTE = { cachorro: 'Bombeiro', nenao: 'Nenão' };
const IDX_ATOR = { cachorro: 1, nenao: 2 };

function ajudanteOcupado(quem) {
  return !!tarefas[quem];
}

/** Aponta o alvo mais próximo de um tipo, ou null se não houver. */
function alvoMaisProximo(de, lista) {
  let melhor = null, menor = Infinity;
  for (const item of lista) {
    const p = item.position || item.node?.position;
    if (!p) continue;
    const d = Math.hypot(p.x - de.x, p.z - de.z);
    if (d < menor) { menor = d; melhor = item; }
  }
  return melhor;
}

function mandarBuscar(quem = 'cachorro') {
  const p = PERSONAS[quem];
  if (ajudanteOcupado(quem)) { falar(`${p.nome}: Já tô indo! Au!`, 2200, p.timbre); return; }
  if (atorAtivo === IDX_ATOR[quem]) {
    falar('Troca pra Manu pra mandar ele buscar! 👧', 2600, 'narrador');
    return;
  }
  const node = ATORES[IDX_ATOR[quem]].node;
  // ovo primeiro: some sozinho se ela demorar, fruta espera
  const alvo = alvoMaisProximo(node.position, ovosNoChao) || alvoMaisProximo(node.position, frutasNoChao);
  if (!alvo) {
    falar(`${p.nome}: Não achei nada no chão pra buscar! Au?`, 2800, p.timbre);
    return;
  }
  tarefas[quem] = { tipo: 'buscar', alvo, fase: 'indo' };
  falar(`${p.nome}: Au au! Já vou buscar! 🐶`, 2400, p.timbre);
}

function mandarRegar(quem = 'nenao') {
  const p = PERSONAS[quem];
  if (ajudanteOcupado(quem)) { falar(`${p.nome}: Já tô regando, calma…`, 2200, p.timbre); return; }
  if (atorAtivo === IDX_ATOR[quem]) {
    falar('Troca pra Manu pra mandar o Nenão! 👧', 2600, 'narrador');
    return;
  }
  const secos = estado.canteiros.filter(c => c.cultura && !c.regado).map(c => c.id);
  if (!secos.length) {
    falar(`${p.nome}: Tá tudo reguadinho! 💧`, 2600, p.timbre);
    return;
  }
  tarefas[quem] = { tipo: 'regar', fila: secos, fase: 'indo' };
  falar(`${p.nome}: Deixa comigo! Vou regar tudo! 💧`, 2800, p.timbre);
}

function mandarColher(quem = 'nenao') {
  const p = PERSONAS[quem];
  if (ajudanteOcupado(quem)) { falar(`${p.nome}: Tô ocupado ainda…`, 2200, p.timbre); return; }
  if (atorAtivo === IDX_ATOR[quem]) {
    falar('Troca pra Manu pra mandar o Nenão! 👧', 2600, 'narrador');
    return;
  }
  const prontos = estado.canteiros.filter(c => estagio(c) === 'pronto').map(c => c.id);
  if (!prontos.length) {
    falar(`${p.nome}:Nada pronto ainda! Espera crescer 🌱`, 2800, p.timbre);
    return;
  }
  tarefas[quem] = { tipo: 'colher', fila: prontos, fase: 'indo' };
  falar(`${p.nome}: Vou colher pra você! 🧺`, 2800, p.timbre);
}

/** Move o ajudante até um ponto; devolve true quando chega. */
function levarAjudante(quem, alvoX, alvoZ, dt, velocidade) {
  const node = ATORES[IDX_ATOR[quem]].node;
  const dx = alvoX - node.position.x, dz = alvoZ - node.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.7) return true;
  const passo = dt * velocidade;
  const novo = resolverColisao(node.position.x, node.position.z,
    node.position.x + (dx / d) * passo, node.position.z + (dz / d) * passo,
    ATORES[IDX_ATOR[quem]].raio);
  const avancou = Math.hypot(novo.x - node.position.x, novo.z - node.position.z);
  node.position.x = novo.x;
  node.position.z = novo.z;
  let da = Math.atan2(dx, dz) - node.rotation.y;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  node.rotation.y += da * Math.min(1, dt * 6);
  ATORES[IDX_ATOR[quem]].bobY = Math.abs(Math.sin(performance.now() / 90)) * 0.06;
  return avancou < passo * 0.2;   // travou: considera que chegou ao possível
}

function atualizarAjudantes(dt) {
  for (const quem of ['cachorro', 'nenao']) {
    const t = tarefas[quem];
    if (!t) continue;
    // se ela assumir o controle dele, a tarefa é cancelada
    if (atorAtivo === IDX_ATOR[quem]) { tarefas[quem] = null; continue; }

    const p = PERSONAS[quem];
    const node = ATORES[IDX_ATOR[quem]].node;
    const vel = quem === 'cachorro' ? 4.6 : 2.6;

    if (t.tipo === 'buscar') {
      const alvoNode = t.alvo.node;
      // o alvo pode ter sumido (ela pegou antes, ou o ovo expirou)
      if (!alvoNode || !alvoNode.parent) { tarefas[quem] = null; continue; }
      if (t.fase === 'indo') {
        if (levarAjudante(quem, alvoNode.position.x, alvoNode.position.z, dt, vel)) {
          // pega o item de fato, usando as mesmas funções do jogo
          if (ovosNoChao.some(o => o.node === alvoNode)) pegarOvo(alvoNode);
          else colherFruta(alvoNode);
          t.fase = 'voltando';
          falar(`${p.nome}: Peguei! Tô levando! 🐾`, 2200, p.timbre);
        }
      } else {
        const dono = ATORES[atorAtivo].node.position;
        if (levarAjudante(quem, dono.x, dono.z, dt, vel)) {
          tarefas[quem] = null;
          falar(`${p.nome}: Pronto! Toma! 🎁`, 2400, p.timbre);
        }
      }
      continue;
    }

    // regar e colher percorrem uma fila de canteiros
    if (!t.fila.length) {
      tarefas[quem] = null;
      falar(`${p.nome}: Terminei! 😊`, 2400, p.timbre);
      continue;
    }
    const id = t.fila[0];
    const cant = canteirosMesh[id];
    if (levarAjudante(quem, cant.position.x, cant.position.z + 1.1, dt, vel)) {
      // o Nenão tem o próprio balde: não consome a água dela
      if (t.tipo === 'regar') regar(id, false);
      else colher(id);
      t.fila.shift();
    }
  }
}

// ── Frutas que caem das árvores ───────────────────────────────
// A árvore solta uma das frutinhas penduradas; ela cai com gravidade,
// quica uma vez e fica no chão para ser recolhida.
const frutasNoChao = [];

function derrubarFruta(arv) {
  const disponiveis = arv.penduradas.filter(f => f.visible);
  if (!disponiveis.length) {
    // repõe o galho depois de um tempo, senão a árvore seca de vez
    arv.penduradas.forEach(f => (f.visible = true));
    return;
  }
  const escolhida = disponiveis[Math.floor(Math.random() * disponiveis.length)];
  escolhida.visible = false;

  const cor = FRUTAS[arv.tipo].cor;
  const mundoPos = escolhida.getWorldPosition(new THREE.Vector3());

  const g = new THREE.Group();
  const corpo = esfera(0.135, mat(cor, { roughness: 0.42 }), 0.94);
  g.add(corpo);
  const cabinho = cilindro(0.014, 0.016, 0.1, mat(0x5b3a1c, { roughness: 0.8 }), 6);
  cabinho.position.y = 0.13;
  g.add(cabinho);
  const folhinha = esfera(0.06, mat(0x4f9e2f, { roughness: 0.8 }), 0.3);
  folhinha.scale.z = 1.6;
  folhinha.position.set(0.05, 0.15, 0);
  folhinha.rotation.z = -0.6;
  g.add(folhinha);

  g.position.copy(mundoPos);
  g.userData = { tipo: 'fruta', fruta: arv.tipo };
  mundo.add(g);

  frutasNoChao.push({
    node: g, corpo, tipo: arv.tipo,
    vy: 0, quicou: false,
    chao: alturaTerreno(mundoPos.x, mundoPos.z) + 0.135,
  });
  // sem fala aqui: as frutas caem o tempo todo e o aviso repetido cansa.
  // A fruta quicando e balançando no chão já chama atenção sozinha.
}

/**
 * Sacudir a árvore derruba uma fruta na hora, em vez de esperar o ciclo.
 * `nodeTronco` é o cilindro tocado; subimos até o grupo da árvore.
 */
function sacudirArvore(nodeTronco) {
  const grupo = nodeTronco.parent;
  const arv = arvoresFrutiferas.find(a => a.grupo === grupo);
  if (!arv) {
    falar('Essa árvore não tem frutinha 🌳', 2400);
    return;
  }
  if (!arv.penduradas.some(f => f.visible)) {
    falar('Já peguei todas dessa árvore! Espera nascer mais 🌳', 3000);
    return;
  }
  arv.balanco = 0.5;            // animação de tremida
  derrubarFruta(arv);
  arv.proxima = performance.now() + 14000 + Math.random() * 16000;
  falar('Sacudi a árvore! Caiu fruta! 🍎', 2400);
}

function atualizarFrutas(dt, t) {
  // tremida da árvore sacudida
  for (const arv of arvoresFrutiferas) {
    if (!arv.balanco) continue;
    arv.balanco = Math.max(0, arv.balanco - dt * 1.6);
    arv.grupo.rotation.z = Math.sin(performance.now() / 45) * arv.balanco * 0.09;
    if (arv.balanco === 0) arv.grupo.rotation.z = 0;
  }
  const agora = performance.now();
  for (const arv of arvoresFrutiferas) {
    if (agora >= arv.proxima) {
      derrubarFruta(arv);
      arv.proxima = agora + (14000 + Math.random() * 16000);
    }
  }
  for (const f of frutasNoChao) {
    if (f.node.position.y > f.chao) {
      f.vy -= 9.8 * dt;
      f.node.position.y = Math.max(f.chao, f.node.position.y + f.vy * dt);
      f.node.rotation.x += dt * 3;
      f.node.rotation.z += dt * 2;
    } else if (!f.quicou) {
      f.quicou = true;
      f.vy = 2.1;                       // quica uma vez
      f.node.position.y = f.chao + 0.001;
    } else {
      // parada no chão, com balancinho para chamar atenção
      f.node.rotation.set(0, f.node.rotation.y + dt * 0.6, 0);
      f.node.position.y = f.chao + Math.sin(t * 3) * 0.02;
    }
  }
}

function colherFruta(node) {
  const i = frutasNoChao.findIndex(f => f.node === node);
  if (i < 0) return false;
  const f = frutasNoChao[i];
  const info = FRUTAS[f.tipo];
  mundo.remove(f.node);
  frutasNoChao.splice(i, 1);
  estado.cesta++;
  estado.estrelas += info.estrelas;
  estado.frutasColhidas = (estado.frutasColhidas || 0) + 1;
  salvar(); atualizarHUD();
  falar(`Peguei uma ${info.nome.toLowerCase()}! ${info.emoji}`, 2200);
  avancar('colheuFruta');
  return true;
}

// ── Marcador da missão ────────────────────────────────────────
// Seta flutuante sobre o objetivo atual: num mapa grande, sem isso a
// criança não sabe para onde ir.
const marcadorMissao = new THREE.Group();
{
  const seta = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.7, 4),
    new THREE.MeshBasicMaterial({ color: 0xffd21e })
  );
  seta.rotation.x = Math.PI;      // ponta para baixo
  marcadorMissao.add(seta);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.42, 20),
    new THREE.MeshBasicMaterial({ color: 0xffd21e, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -1.6;
  marcadorMissao.add(halo);
  marcadorMissao.visible = false;
  mundo.add(marcadorMissao);
}

/** Onde fica o objetivo da missão atual, ou null se não houver ponto fixo. */
function alvoDaMissao() {
  const m = MISSOES[estado.missao];
  if (!m) return null;
  switch (m.onde) {
    case 'canteiros': return new THREE.Vector3(0, 0, -1);
    case 'cocho':     return COCHO_POS;
    case 'animais': {
      const b = animaisMesh[0];
      return b ? b.grupo.position : null;
    }
    case 'ovo':       return ovosNoChao.length ? ovosNoChao[0].node.position : null;
    case 'fruta':     return frutasNoChao.length ? frutasNoChao[0].node.position : null;
    case 'pesca':     return PIER_PONTA;
    case 'camisa':    return camisaMesh ? camisaMesh.position : null;
    default: return null;
  }
}

// ── Camisa escondida ──────────────────────────────────────────
const LOCAIS_CAMISA = [[-7.0, -4.2], [9.0, -3.0], [-9.8, 4.6], [7.0, 6.4], [4.6, -8.4], [-4.2, -10.4]];
let camisaMesh = null;
function porCamisa(local) {
  if (camisaMesh) mundo.remove(camisaMesh);
  const [x, z] = LOCAIS_CAMISA[local];
  const g = new THREE.Group();
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: textoTextura('👕'), transparent: true }));
  sp.scale.setScalar(0.8);
  sp.position.y = 0.5;
  g.add(sp);
  g.position.set(x, 0, z);
  g.userData = { tipo: 'camisa' };
  mundo.add(g);
  camisaMesh = g;
}

// ══════════════════════════════════════════════════════════════
//  HUD
// ══════════════════════════════════════════════════════════════
const el = id => document.getElementById(id);
const hudEstrelas = el('estrelas'), hudCesta = el('cesta');
const hudMissaoIcone = el('missaoIcone'), hudMissaoTitulo = el('missaoTitulo'), hudMissaoProg = el('missaoProg');
const balao = el('balao'), seletor = el('seletor');

let canteiroAlvo = null;

// ══════════════════════════════════════════════════════════════
//  Conversa
// ══════════════════════════════════════════════════════════════
// Cada personagem tem uma persona: jeito de falar, timbre e um repertório
// próprio por intenção. É a mesma estrutura de "um prompt por
// personagem" — só que as respostas são escritas, não geradas. Isso
// mantém o jogo funcionando sem internet, sem custo e sem mandar a voz
// da criança para lugar nenhum.
//
// Para trocar por um modelo de verdade um dia, basta `responder()`
// consultar um servidor em vez das listas abaixo.

const PERSONAS = {
  manu: {
    nome: 'Manu', timbre: 'manu',
    // "prompt": menina de 4 anos, animada, fala de plantinhas e dos bichos
    fala: {
      saudacao: ['Oi! Que bom te ver! 🌻', 'Oii! Vamos cuidar da fazenda?', 'Olá! Tô plantando aqui!'],
      quemEhVoce: ['Eu sou a Manu! Essa fazenda é minha!', 'Sou a Manu, e esses são meus amiguinhos!'],
      brincar: ['Vamos! Corre comigo! 🏃', 'Oba! Vamos brincar de pega-pega!'],
      fome: ['Vamos colher uma frutinha! 🍎', 'Tem morango maduro ali!'],
      elogio: ['Ai, obrigada! 💕', 'Você também é legal!'],
      ondeEsta: ['Deixa eu procurar… acho que tá por ali!', 'Olha em volta, tá pertinho!'],
      ajuda: ['Toca no chão que eu ando! E arrasta pra girar!', 'Toca nos canteiros pra plantar!'],
      tchau: ['Tchauzinho! Volta logo! 👋', 'Até depois!'],
      sim: ['Oba!', 'Que legal!'],
      nao: ['Tá bom então…', 'Tudo bem!'],
      naoEntendi: ['Fala de novo? Não escutei direito!', 'Hein? Repete pra mim!'],
    },
  },
  nenao: {
    nome: 'Nenão', timbre: 'nenao',
    // urso de pelúcia grandalhão, lento, carinhoso, meio dorminhoco
    fala: {
      saudacao: ['Grrr… oi, amiguinha! 🐻', 'Oi! Quer um abraço de urso?'],
      quemEhVoce: ['Eu sou o Nenão! Sou de pelúcia!', 'Nenão! O urso mais fofo da fazenda!'],
      brincar: ['Vamos! Mas devagarinho, tá? 🐾', 'Brincar? Eu adoro! Só não corre muito!'],
      fome: ['Eu queria mel… 🍯', 'Tem frutinha? Urso gosta de frutinha!'],
      elogio: ['Ahh, que fofa! Vem cá! 🤗', 'Obrigado! Você é meu amor!'],
      ondeEsta: ['Hmmm… deixa eu cheirar… por ali!', 'Tá escondidinho, procura bem!'],
      ajuda: ['Toca em mim que eu falo com você!', 'Vamos ver a fazendinha juntos?'],
      tchau: ['Tchau… volta pro Nenão, tá? 🐻', 'Até logo, amiguinha!'],
      sim: ['Que bom!', 'Ehhh!'],
      nao: ['Ah… tudo bem.', 'Tá bom.'],
      naoEntendi: ['Hmmm? Não entendi, fala de novo!', 'Repete devagarinho pro Nenão?'],
    },
  },
  cachorro: {
    nome: 'Bombeiro', timbre: 'cachorro',
    // filhote elétrico, fala em frases curtas, late no meio
    fala: {
      saudacao: ['Au au! Oi oi oi! 🐶', 'Au! Você chegou! Que alegria!'],
      quemEhVoce: ['Au! Sou o Bombeiro! Apago fogo!', 'Eu sou o dálmata bombeiro! Au au!'],
      brincar: ['AU AU! Corre! Corre! 🎾', 'Sim sim sim! Joga a bolinha!'],
      fome: ['Au! Tem ossinho? 🦴', 'Comidinha? Eu quero!'],
      elogio: ['Au au! *abana o rabo* 🐕', 'Aaau! Faz cafuné!'],
      ondeEsta: ['Au! Deixa eu farejar! Por aqui!', 'Au au! Segue eu!'],
      ajuda: ['Au! Eu te sigo pra todo lado!', 'Au au! Toca no meu botão pra me controlar!'],
      tchau: ['Auuu… tchau! 🐾', 'Au! Volta logo!'],
      sim: ['Au au!', 'Isso!'],
      nao: ['Auuu…', 'Ah…'],
      naoEntendi: ['Au? Não entendi!', 'Hein? Au au!'],
    },
  },
  galinha: {
    nome: 'Galinha', timbre: 'cachorro',
    fala: {
      saudacao: ['Có có có! Oi! 🐔', 'Cocóóó! Bom dia!'],
      quemEhVoce: ['Có! Eu sou a galinha! Boto ovinho!', 'Có có! Galinha da fazenda!'],
      brincar: ['Có! Eu ciscar é minha brincadeira!', 'Có có! Vem ciscar comigo!'],
      fome: ['Có! Milho! Milho! 🌽', 'Có có! Põe milho no cocho!'],
      elogio: ['Có! Que carinho gostoso!', 'Cocóóó! 💛'],
      ondeEsta: ['Có? Procura no ninho!', 'Có có! Olha no chão!'],
      ajuda: ['Có! Eu boto ovinho, procura no chão!', 'Có! Me dá comida no cocho!'],
      tchau: ['Có có! Tchau!', 'Cocóóó!'],
      sim: ['Có!'], nao: ['Có…'],
      naoEntendi: ['Có? Có có?', 'Não entendi! Có!'],
    },
  },
  vaca: {
    nome: 'Vaca', timbre: 'nenao',
    fala: {
      saudacao: ['Muuuu! Oi! 🐄', 'Muuu! Que bom te ver!'],
      quemEhVoce: ['Muu! Sou a vaca! Dou leitinho!', 'Muuuu! A vaca da fazenda!'],
      brincar: ['Muu… eu prefiro pastar devagarinho.', 'Muuu! Fica aqui comigo!'],
      fome: ['Muuuu! Capim! Quero capim! 🌾', 'Muu! Põe comida no cocho!'],
      elogio: ['Muuu! Que carinho bom! 💗', 'Muu muu!'],
      ondeEsta: ['Muu? Olha lá longe…', 'Muuu! Tá por aí!'],
      ajuda: ['Muu! Faz carinho em mim!', 'Muuu! Me dá comidinha!'],
      tchau: ['Muuu! Tchau!', 'Muu! Volta!'],
      sim: ['Muu!'], nao: ['Muuu…'],
      naoEntendi: ['Muu? Não entendi!', 'Muuu?'],
    },
  },
  ovelha: {
    nome: 'Ovelha', timbre: 'manu',
    fala: {
      saudacao: ['Bééé! Oi! 🐑', 'Béé béé! Olá!'],
      quemEhVoce: ['Bééé! Sou a ovelha! Sou fofinha!', 'Béé! Minha lã é macia!'],
      brincar: ['Bééé! Vamos pular! 🐑', 'Béé! Corre comigo!'],
      fome: ['Bééé! Quero comidinha!', 'Béé! Capim no cocho!'],
      elogio: ['Bééé! Que carinho macio! 💕', 'Béé béé!'],
      ondeEsta: ['Bééé? Procura ali!', 'Béé! Tá pertinho!'],
      ajuda: ['Béé! Me faz carinho!', 'Bééé! Toca em mim!'],
      tchau: ['Bééé! Tchau!', 'Béé!'],
      sim: ['Béé!'], nao: ['Bééé…'],
      naoEntendi: ['Béé? Não entendi!', 'Bééé?'],
    },
  },
  porco: {
    nome: 'Porquinho', timbre: 'nenao',
    fala: {
      saudacao: ['Oinc oinc! Oi! 🐖', 'Oinc! Olá!'],
      quemEhVoce: ['Oinc! Sou o porquinho! Adoro lama!', 'Oinc oinc! O porquinho rosa!'],
      brincar: ['Oinc! Vamos rolar na lama! 🐷', 'Oinc oinc! Brincar!'],
      fome: ['OINC! Comida! Eu quero tudo! 🍽️', 'Oinc oinc! Enche o cocho!'],
      elogio: ['Oinc! Que gostoso! 💗', 'Oinc oinc!'],
      ondeEsta: ['Oinc? Cheirei… é por ali!', 'Oinc! Procura!'],
      ajuda: ['Oinc! Me dá comida no cocho!', 'Oinc oinc! Faz carinho!'],
      tchau: ['Oinc! Tchau!', 'Oinc oinc!'],
      sim: ['Oinc!'], nao: ['Oinc…'],
      naoEntendi: ['Oinc? Não entendi!', 'Oinc oinc?'],
    },
  },
};

/**
 * Tira acentos e baixa a caixa. `\b` do regex em JS só considera
 * [A-Za-z0-9_], então "você" (terminado em ê) nunca casava com \b no
 * fim — normalizar resolve isso e ainda absorve erro de digitação.
 */
function normalizar(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim();
}

// Intenções por palavra-chave, já sem acento. A primeira que casar vence,
// então as mais específicas vêm antes das genéricas.
const INTENCOES = [
  ['quemEhVoce', /\b(quem (e|eh) (voce|vc|tu)|qual (o )?seu nome|como (voce|vc) se chama|quem e essa|quem e esse)\b/],
  ['elogio',     /\b(te amo|amo (voce|vc)|linda|lindo|bonita|bonito|fofa|fofo|legal|gosto de (voce|vc)|querida|querido|amiga|amigo)\b/],
  ['brincar',    /\b(brincar|brinca|jogar|joga|correr|corre|pega.?pega|esconde|pular|pula)\b/],
  ['fome',       /\b(fome|comer|comida|comidinha|lanche|faminto|faminta|papa|to com fome)\b/],
  ['ondeEsta',   /\b(cade|onde|procura|achar|encontrar|perdi|sumiu)\b/],
  ['ajuda',      /\b(ajuda|me ajuda|nao sei|o que faz|o que fazer|me ensina|como joga|como brinca)\b/],
  ['tchau',      /\b(tchau|adeus|ate logo|xau|falou|boa noite|vou embora)\b/],
  ['saudacao',   /\b(oi|ola|bom dia|boa tarde|e ai|eae|opa|alo)\b/],
  ['sim',        /\b(sim|claro|quero|vamos|bora|isso|uhum|ta bom)\b/],
  ['nao',        /\b(nao|nunca|nem|negativo)\b/],
];

/** Descobre a intenção da frase e devolve a resposta daquela persona. */
function responder(quem, frase) {
  const p = PERSONAS[quem] || PERSONAS.manu;
  const texto = normalizar(frase);
  let chave = 'naoEntendi';
  for (const [nome, padrao] of INTENCOES) {
    if (padrao.test(texto)) { chave = nome; break; }
  }
  const opcoes = p.fala[chave] || p.fala.naoEntendi;
  return { texto: opcoes[Math.floor(Math.random() * opcoes.length)], timbre: p.timbre, nome: p.nome };
}

// ══════════════════════════════════════════════════════════════
//  Pedidos dos bichinhos
// ══════════════════════════════════════════════════════════════
// O que faz o bichinho parecer esperto não é vocabulário: é ter vontade
// própria, lembrar do que pediu e reagir a ter sido atendido. Cada um
// pede uma coisa, cobra se ela demora e agradece quando ela faz.

const PEDIDOS = {
  galinha: [
    { id: 'comida', evento: 'alimentou',   pede: 'Có có! Tô com fominha… põe milho no cocho pra mim?', cobra: 'Có! Você esqueceu do meu milho…', agradece: 'Cocóóó! Que delícia! Obrigada! 💛', premio: 3 },
    { id: 'carinho', evento: 'carinho',    pede: 'Có! Faz um cafuné na minha peninha?',                cobra: 'Có… cadê meu cafuné?',            agradece: 'Có có! Que gostoso! 💕', premio: 2 },
  ],
  vaca: [
    { id: 'comida', evento: 'alimentou',   pede: 'Muuu… tô com fome. Enche o cocho pra mim?',          cobra: 'Muuu… ainda tô com fome…',        agradece: 'Muuuu! Obrigada, amiguinha! 💗', premio: 3 },
    { id: 'planta', evento: 'colheu',      pede: 'Muu! Colhe uma plantinha pra eu ver?',               cobra: 'Muu? Cadê a plantinha?',          agradece: 'Muuu! Que plantinha linda! 🌱', premio: 3 },
  ],
  ovelha: [
    { id: 'carinho', evento: 'carinho',    pede: 'Bééé! Você faz carinho na minha lã?',                cobra: 'Béé… tô esperando o carinho…',    agradece: 'Bééé! Que delícia! 💕', premio: 2 },
    { id: 'fruta',  evento: 'colheuFruta', pede: 'Béé! Pega uma frutinha que caiu pra mim?',           cobra: 'Bééé? E a frutinha?',             agradece: 'Béé béé! Obrigada! 🍎', premio: 3 },
  ],
  porco: [
    { id: 'comida', evento: 'alimentou',   pede: 'OINC! Eu quero comer! Enche o cocho!',               cobra: 'Oinc… meu pote tá vazio…',        agradece: 'OINC OINC! Que banquete! 🍽️', premio: 3 },
    { id: 'fruta',  evento: 'colheuFruta', pede: 'Oinc! Me traz uma frutinha do chão?',                cobra: 'Oinc? Cadê minha frutinha?',      agradece: 'Oinc oinc! Delícia! 🍎', premio: 3 },
  ],
  nenao: [
    { id: 'fruta',  evento: 'colheuFruta', pede: 'Urso gosta de fruta… pega uma pra mim? 🍎',          cobra: 'Hmmm… cadê minha frutinha?',      agradece: 'Ahhh! Obrigado! Urso feliz! 🐻', premio: 4 },
    { id: 'planta', evento: 'colheu',      pede: 'Você colhe uma plantinha pra mostrar pro Nenão?',    cobra: 'Ainda quero ver a plantinha…',    agradece: 'Que plantinha bonita! Você é demais! 🌻', premio: 4 },
    { id: 'peixe',  evento: 'pescou',      pede: 'Urso gosta de peixe! Pesca um pra mim? 🐟',          cobra: 'Hmmm… cadê meu peixinho?',        agradece: 'Grrr! Que peixe gostoso! Obrigado! 🐻', premio: 4 },
  ],
  cachorro: [
    { id: 'carinho', evento: 'carinho',    pede: 'Au au! Faz carinho em algum bichinho? Eu quero ver!', cobra: 'Au? Cadê o carinho?', agradece: 'AU AU! Você é boazinha! 🐶', premio: 3 },
    { id: 'ovo',    evento: 'pegouOvo',    pede: 'Au! Acha um ovinho no chão pra mim?',                cobra: 'Au au! E o ovinho?',              agradece: 'Au au au! Achou! Que esperta! 🥚', premio: 4 },
  ],
};

// pedido em aberto por bichinho: { def, feitoEm }
const pedidosAtivos = {};

/** Sorteia um pedido para o bicho, evitando repetir o último. */
function novoPedido(quem) {
  const lista = PEDIDOS[quem];
  if (!lista) return null;
  const anterior = pedidosAtivos[quem]?.def?.id;
  const opcoes = lista.filter(p => p.id !== anterior);
  const def = (opcoes.length ? opcoes : lista)[Math.floor(Math.random() * (opcoes.length || lista.length))];
  pedidosAtivos[quem] = { def, cobrado: 0 };
  return def;
}

/**
 * Chamado a cada ação da criança. Quem estava esperando aquilo agradece
 * e paga a recompensa — é o que dá a sensação de que ele percebeu.
 */
function verificarPedidos(evento) {
  for (const [quem, ativo] of Object.entries(pedidosAtivos)) {
    if (!ativo || ativo.def.evento !== evento) continue;
    const p = PERSONAS[quem];
    estado.estrelas += ativo.def.premio;
    estado.pedidosFeitos = (estado.pedidosFeitos || 0) + 1;
    estado.amizade = estado.amizade || {};
    estado.amizade[quem] = (estado.amizade[quem] || 0) + 1;
    pedidosAtivos[quem] = null;
    salvar(); atualizarHUD();
    falar(`${p.nome}: ${ativo.def.agradece}`, 3200, p.timbre);
    return true;   // um agradecimento por vez, senão viram todos falando junto
  }
  return false;
}

/** Nível de amizade muda o jeito de cumprimentar. */
function nivelAmizade(quem) {
  const n = (estado.amizade && estado.amizade[quem]) || 0;
  return n >= 5 ? 'melhorAmigo' : n >= 2 ? 'amigo' : 'novo';
}

// Convites: o bichinho puxa assunto para a criança ter o que responder.
// Terminam em pergunta de propósito — pergunta convida resposta.
const CONVITES = {
  manu:     ['Oi! Como você tá hoje?', 'Vamos brincar? Fala comigo!', 'Você gosta da minha fazenda?'],
  nenao:    ['Oi amiguinha! Quer um abraço?', 'Grrr… você quer brincar comigo?', 'Eu sou fofo, né? Fala pro Nenão!'],
  cachorro: ['Au au! Você quer correr comigo?', 'Au! Fala meu nome! Fala!', 'Au au! Quer jogar a bolinha?'],
  galinha:  ['Có có! Você viu meu ovinho?', 'Có! Você quer me dar milho?', 'Cocóóó! Fala comigo!'],
  vaca:     ['Muuu! Você me faz carinho?', 'Muu! Você gosta de leitinho?', 'Muuuu! Conversa comigo!'],
  ovelha:   ['Bééé! Minha lã é macia, quer sentir?', 'Béé! Você quer pular comigo?', 'Bééé! Fala comigo!'],
  porco:    ['Oinc! Você tem comidinha pra mim?', 'Oinc oinc! Vamos rolar na lama?', 'Oinc! Fala comigo!'],
};

/** Com quem ela está conversando: o bicho tocado, ou o personagem ativo. */
let interlocutor = null;
// declarado aqui porque `falar()` precisa consultar antes da seção do
// microfone existir no arquivo
let ouvindo = false;

// Quantas trocas seguidas já houve. Depois de algumas, a conversa
// encerra sozinha em vez de deixar o microfone reabrindo sem fim.
let rodadasDeConversa = 0;
const MAX_RODADAS = 4;

/**
 * Responde ao que ela falou e reabre o microfone para ela continuar.
 * Antes da resposta genérica, checa o contexto: um bicho que acabou de
 * pedir comida deve falar da comida, não dar uma resposta qualquer.
 */
// Ordens ditas em voz alta valem tanto quanto o botão. Ficam antes de
// tudo: "busca a bolinha" é um comando, não conversa fiada.
const ORDENS_FALADAS = [
  [/\b(busca|buscar|pega|pegar|traz|trazer|procura)\b/, () => mandarBuscar('cachorro')],
  [/\b(rega|regar|molha|molhar|agua|aguar)\b/,           () => mandarRegar('nenao')],
  [/\b(colhe|colher|colheita|apanha)\b/,                 () => mandarColher('nenao')],
];

function conversarCom(quem, frase) {
  rodadasDeConversa++;
  const continua = rodadasDeConversa < MAX_RODADAS;
  const p = PERSONAS[quem] || PERSONAS.manu;
  const texto = normalizar(frase);
  const ativo = pedidosAtivos[quem];

  for (const [padrao, acao] of ORDENS_FALADAS) {
    if (padrao.test(texto)) { acao(); return; }
  }

  let resposta = null;

  // "sim/quero" com pedido em aberto = ela topou. Repetir o pedido
  // inteiro soaria robótico; melhor confirmar e ficar esperando.
  if (ativo && ativo.def && /\b(sim|claro|quero|vamos|bora|isso|uhum|ta bom|pode deixar)\b/.test(texto)) {
    const confirmacoes = [
      'Oba! Vou esperar bem aqui! 😊',
      'Que bom! Obrigado, viu?',
      'Ebaaa! Você é a melhor!',
      'Oba! Tô contando com você!',
    ];
    resposta = confirmacoes[Math.floor(Math.random() * confirmacoes.length)];
  }
  // pergunta sobre fome quando o cocho está vazio
  else if (/\b(fome|comida|comer)\b/.test(texto) && cochoRacao && !cochoRacao.visible) {
    resposta = 'Tô com fominha sim! O cocho tá vazio…';
  }
  // ela pergunta o que fazer e há pedido pendente
  else if (/\b(ajuda|o que faz|o que fazer|nao sei)\b/.test(texto) && ativo && ativo.def) {
    resposta = ativo.def.pede;
  }

  if (resposta) {
    falar(`${p.nome}: ${resposta}`, 3600, p.timbre, continua ? () => ouvir() : null);
    return;
  }

  const r = responder(quem, frase);
  falar(`${r.nome}: ${r.texto}`, 3400, r.timbre, continua ? () => ouvir() : null);
}

/**
 * Toque no bichinho: ele fala primeiro e só então abre o microfone.
 * Abrir junto com a fala faria o jogo ouvir a própria voz.
 *
 * O que ele diz depende do momento: se já pediu algo e ainda não foi
 * atendido, cobra; senão faz um pedido novo de vez em quando; e o
 * cumprimento muda conforme a amizade.
 */
function puxarConversa(quem) {
  interlocutor = quem;
  rodadasDeConversa = 0;
  const p = PERSONAS[quem] || PERSONAS.manu;
  const ativo = pedidosAtivos[quem];
  let fala;

  if (ativo && ativo.def) {
    // já tem pedido em aberto: cobra, mas com jeitinho
    ativo.cobrado++;
    fala = ativo.cobrado > 1 ? ativo.def.cobra : ativo.def.pede;
  } else if (PEDIDOS[quem] && Math.random() < 0.65) {
    const def = novoPedido(quem);
    fala = def ? def.pede : null;
  }

  if (!fala) {
    const nivel = nivelAmizade(quem);
    const lista = CONVITES[quem] || CONVITES.manu;
    fala = lista[Math.floor(Math.random() * lista.length)];
    if (nivel === 'melhorAmigo') fala = `Você é minha melhor amiga! ${fala}`;
    else if (nivel === 'amigo') fala = `Que bom que você voltou! ${fala}`;
  }

  falar(`${p.nome}: ${fala}`, 4000, p.timbre, () => ouvir());
}

// ── Voz ───────────────────────────────────────────────────────
// Sem escolher a voz, o navegador usa a padrão de pt-BR, que no Windows
// é o "Daniel" (masculino). Preferimos uma voz feminina e subimos o tom
// para soar como uma menina.
const VOZES_FEMININAS = [
  'maria', 'luciana', 'francisca', 'fernanda', 'helena', 'joana',
  'camila', 'vitoria', 'vitória', 'female', 'mulher',
];
let vozEscolhida = null;

function escolherVoz() {
  const vozes = speechSynthesis.getVoices();
  if (!vozes.length) return null;
  const ptbr = vozes.filter(v => /^pt[-_]?BR/i.test(v.lang));
  const pt = ptbr.length ? ptbr : vozes.filter(v => /^pt/i.test(v.lang));
  if (!pt.length) return null;
  // 1ª escolha: nome conhecidamente feminino
  const fem = pt.find(v => VOZES_FEMININAS.some(n => v.name.toLowerCase().includes(n)));
  if (fem) return fem;
  // 2ª: qualquer uma que não seja a masculina padrão
  const naoMasc = pt.find(v => !/daniel|ricardo|felipe|male/i.test(v.name));
  return naoMasc || pt[0];
}

vozEscolhida = escolherVoz();
if (window.speechSynthesis) {
  // a lista costuma chegar vazia no primeiro acesso e preencher depois
  speechSynthesis.onvoiceschanged = () => { vozEscolhida = escolherVoz(); };
}

/** Escolhe a voz masculina disponível, para o Nenão soar diferente. */
function escolherVozGrave() {
  const vozes = speechSynthesis.getVoices();
  const pt = vozes.filter(v => /^pt/i.test(v.lang));
  if (!pt.length) return null;
  const masc = pt.find(v => /daniel|ricardo|felipe|male|antonio|joão|joao/i.test(v.name));
  return masc || pt[0];
}
let vozGrave = null;

// Timbre de cada personagem. O Windows tem só duas vozes em pt-BR, então
// a diferença real vem de tom e ritmo: o urso fala grave e devagar, o
// cachorro agudo e rápido, a Manu no meio, aguda de criança.
const TIMBRES = {
  manu:    { pitch: 1.8,  rate: 1.05, grave: false },
  nenao:   { pitch: 0.55, rate: 0.85, grave: true  },
  cachorro:{ pitch: 2.0,  rate: 1.25, grave: false },
  narrador:{ pitch: 1.5,  rate: 1.02, grave: false },
};

/**
 * `quem` escolhe o timbre. Falas de bichos e de missão usam o narrador,
 * que é a própria Manu contando o que aconteceu.
 */
function falar(txt, ms = 2600, quem = null, aoTerminar = null) {
  balao.textContent = txt;
  balao.style.display = 'block';
  // a dica cede lugar ao balão: em tela estreita o texto quebra em mais
  // linhas e os dois se encavalavam
  const dica = document.getElementById('dica');
  if (dica) { dica.style.opacity = '0'; setTimeout(() => dica.remove(), 700); }
  clearTimeout(falar._t);
  falar._t = setTimeout(() => (balao.style.display = 'none'), ms);
  if (!vozAtiva || !window.speechSynthesis) {
    // sem voz, o "fim da fala" é o fim do balão
    if (aoTerminar) setTimeout(aoTerminar, Math.min(ms, 1800));
    return;
  }

  // Se o microfone estiver aberto, fecha antes de falar. Um bichinho
  // respondendo com o microfone ligado vira laço: ele se escuta e
  // responde a si mesmo.
  if (typeof pararDeOuvir === 'function' && ouvindo) pararDeOuvir();

  // sem `quem`, herda de quem está sendo controlado
  const porAtor = ['manu', 'cachorro', 'nenao'];
  const chave = quem || porAtor[atorAtivo] || 'narrador';
  const timbre = TIMBRES[chave] || TIMBRES.narrador;

  const u = new SpeechSynthesisUtterance(txt.replace(/[^\p{L}\p{N}\s,!?.]/gu, ''));
  if (!vozEscolhida) vozEscolhida = escolherVoz();
  if (timbre.grave && !vozGrave) vozGrave = escolherVozGrave();
  const voz = timbre.grave ? (vozGrave || vozEscolhida) : vozEscolhida;
  if (voz) u.voice = voz;
  u.lang = 'pt-BR';
  u.rate = timbre.rate;
  u.pitch = timbre.pitch;
  if (aoTerminar) {
    // rede de segurança: se onend não vier (acontece no Safari), o
    // callback ainda dispara pelo tempo estimado da frase
    let disparou = false;
    const uma = () => { if (!disparou) { disparou = true; aoTerminar(); } };
    u.onend = uma;
    u.onerror = uma;
    setTimeout(uma, Math.max(1500, txt.length * 90));
  }
  speechSynthesis.cancel();   // não empilha falas por cima da anterior
  speechSynthesis.speak(u);
}

function atualizarHUD() {
  hudEstrelas.textContent = estado.estrelas;
  hudCesta.textContent = estado.cesta;
  const hudAgua = el('agua');
  if (hudAgua) {
    hudAgua.textContent = aguaNoRegador();
    // vazio fica em destaque para ela perceber que precisa ir ao lago
    el('seloAgua').classList.toggle('vazio', aguaNoRegador() === 0);
  }
  const m = MISSOES[estado.missao];
  if (m) {
    hudMissaoIcone.textContent = m.icone;
    hudMissaoTitulo.textContent = m.titulo;
    hudMissaoProg.textContent = `${estado.progresso}/${m.alvo}`;
  } else {
    hudMissaoIcone.textContent = '🎉';
    hudMissaoTitulo.textContent = 'Parabéns! Tudo completo!';
    hudMissaoProg.textContent = '';
  }
}

// ── Troca de personagem ───────────────────────────────────────
function trocarAtor(i) {
  if (i === atorAtivo) return;
  if (casa.fase !== 'fora') { falar('Saia do celeiro primeiro! 🚪', 2000); return; }
  atorAtivo = i;
  destino = null;          // cancela o caminho do anterior
  passoDoAtor = 0;
  for (const b of document.querySelectorAll('#elenco button')) {
    b.classList.toggle('ativo', +b.dataset.i === i);
  }
  // quem assume se apresenta com a própria voz
  const a = ATORES[i];
  const saudacao = ['Oi! Sou a Manu! 👧', 'Au au! Vamos brincar! 🐶', 'Grrr… Oi, sou o Nenão! 🐻'][i];
  falar(saudacao, 2400, ['manu', 'cachorro', 'nenao'][i]);
}
for (const btn of document.querySelectorAll('#elenco button')) {
  btn.addEventListener('click', () => trocarAtor(+btn.dataset.i));
}
el('sairCasa').addEventListener('click', sairDaCasa);

// ══════════════════════════════════════════════════════════════
//  Microfone
// ══════════════════════════════════════════════════════════════
// O reconhecimento do Safari no iPad é irregular, então os botões de
// figura continuam sempre disponíveis — quem ainda não fala direito
// consegue conversar do mesmo jeito.
const ReconhecimentoVoz = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconhecedor = null;
let microfoneIndisponivel = false;   // permissão negada, não insiste
let avisouDoMicrofone = false;       // o aviso sai uma vez, não a cada toque

function alvoDaConversa() {
  return interlocutor || ['manu', 'cachorro', 'nenao'][atorAtivo] || 'manu';
}

let timerMicrofone = null;

function pararDeOuvir() {
  ouvindo = false;
  el('microfone').classList.remove('ouvindo');
  clearTimeout(timerMicrofone);
  timerMicrofone = null;
  if (reconhecedor) {
    // solta os handlers antes de parar: sem isso o onend dispara depois
    // e reacende o estado que acabamos de limpar
    reconhecedor.onresult = null;
    reconhecedor.onerror = null;
    reconhecedor.onend = null;
    try { reconhecedor.abort(); } catch (e) {}
    try { reconhecedor.stop(); } catch (e) {}
    reconhecedor = null;
  }
}

/**
 * Escuta uma frase e desliga. É "aperta e fala", não microfone aberto:
 * deixá-lo ligado fazia o jogo ouvir a própria voz dos personagens e
 * responder a si mesmo em laço, além de captar tudo o que a criança
 * falasse na sala.
 */
function ouvir() {
  // sem suporte ou permissão negada: segue no silêncio, os botões de
  // figura continuam ali
  if (!ReconhecimentoVoz || microfoneIndisponivel) {
    if (!avisouDoMicrofone) {
      avisouDoMicrofone = true;
      falar('Pode falar comigo pelos botõezinhos! 💬', 2800, 'narrador');
    }
    return;
  }
  if (ouvindo) { pararDeOuvir(); return; }

  // não abre o microfone enquanto o jogo está falando, senão ele se ouve
  if (window.speechSynthesis && speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }

  reconhecedor = new ReconhecimentoVoz();
  reconhecedor.lang = 'pt-BR';
  reconhecedor.continuous = false;     // uma frase por toque
  reconhecedor.interimResults = false;
  reconhecedor.maxAlternatives = 1;

  reconhecedor.onresult = (ev) => {
    const frase = ev.results[0][0].transcript;
    pararDeOuvir();                    // desliga ANTES de responder
    conversarCom(alvoDaConversa(), frase);
  };
  reconhecedor.onerror = (ev) => {
    const negado = ev.error === 'not-allowed' || ev.error === 'service-not-allowed';
    pararDeOuvir();
    if (negado) {
      // uma vez só: repetir isso a cada toque num bicho vira ruído
      microfoneIndisponivel = true;
      if (!avisouDoMicrofone) {
        avisouDoMicrofone = true;
        falar('Pode falar comigo pelos botõezinhos! 💬', 3200, 'narrador');
      }
    }
  };
  reconhecedor.onend = () => pararDeOuvir();

  try {
    reconhecedor.start();
    ouvindo = true;
    el('microfone').classList.add('ouvindo');
    // rede de segurança: se ninguém falar, o microfone não fica aberto
    timerMicrofone = setTimeout(pararDeOuvir, 6000);
  } catch (e) {
    pararDeOuvir();
  }
}

el('microfone').addEventListener('click', () => {
  rodadasDeConversa = 0;   // toque manual recomeça o papo
  ouvir();
});

// botões de figura: cada um manda uma frase pronta pela mesma via
for (const btn of document.querySelectorAll('#papo button')) {
  btn.addEventListener('click', () => conversarCom(alvoDaConversa(), btn.dataset.frase));
}

// ── Ordens ────────────────────────────────────────────────────
const ACOES_ORDEM = {
  buscar: () => mandarBuscar('cachorro'),
  regar:  () => mandarRegar('nenao'),
  colher: () => mandarColher('nenao'),
};
for (const btn of document.querySelectorAll('#ordens button')) {
  btn.addEventListener('click', () => ACOES_ORDEM[btn.dataset.ordem]?.());
}

let vozAtiva = true;
el('somBtn').addEventListener('click', () => {
  vozAtiva = !vozAtiva;
  el('somBtn').textContent = vozAtiva ? '🔊' : '🔇';
  if (!vozAtiva && window.speechSynthesis) speechSynthesis.cancel();
});

// ══════════════════════════════════════════════════════════════
//  Mecânicas
// ══════════════════════════════════════════════════════════════
function estagio(c) {
  if (!c.cultura || !c.plantadoEm) return 'vazio';
  const cul = CULTURAS[c.cultura];
  const s = (Date.now() - c.plantadoEm) / 1000;
  const passo = cul.cresce / 3;
  let e;
  if (s < passo) e = 'semente';
  else if (s < passo * 2) e = 'broto';
  else if (s < cul.cresce) e = 'crescendo';
  else e = 'pronto';
  if (!c.regado && (e === 'crescendo' || e === 'pronto')) e = 'broto';
  return e;
}

function desenharCanteiros() {
  for (let i = 0; i < 9; i++) {
    const gp = gruposPlanta[i];
    gp.clear();
    const c = estado.canteiros[i];
    const e = estagio(c);
    if (e === 'vazio') continue;
    gp.add(construirPlanta(c.cultura, e));
    if (c.regado) {
      const gota = new THREE.Sprite(new THREE.SpriteMaterial({ map: textoTextura('💧'), transparent: true }));
      gota.scale.setScalar(0.34);
      gota.position.set(0.62, 0.5, -0.62);
      gp.add(gota);
    }
  }
}

function plantar(id, tipo) {
  const c = estado.canteiros[id];
  if (!c || c.cultura) return;
  c.cultura = tipo;
  c.plantadoEm = Date.now();
  c.regado = false;
  salvar(); desenharCanteiros();
  falar('Plantando sementinha! 🌱');
}

/** `daChuva` e o trabalho do Nenão não gastam a água do regador dela. */
function regar(id, gastaAgua = true) {
  const c = estado.canteiros[id];
  if (!c || !c.cultura || c.regado) return;

  if (gastaAgua) {
    if (aguaNoRegador() <= 0) {
      falar('Acabou a água! Vai encher no lago 💧', 3000);
      // aponta o lago para ela saber onde é
      marcadorMissao.visible = true;
      marcadorMissao.position.set(LAGO_POS.x, 2.6, LAGO_POS.z);
      return;
    }
    estado.agua--;
  }

  c.regado = true;
  estado.regasFeitas++;
  salvar(); desenharCanteiros(); atualizarHUD();
  falar(gastaAgua && estado.agua === 0 ? 'Reguei! A água acabou… 💧' : 'Que delícia, água! 💧');
  avancar('regou');
}

function colher(id) {
  const c = estado.canteiros[id];
  if (!c || estagio(c) !== 'pronto') return;
  const cul = CULTURAS[c.cultura];
  const era = c.cultura;
  c.cultura = null; c.plantadoEm = null; c.regado = false;
  estado.totalColheitas++;
  estado.cesta++;
  estado.estrelas += cul.estrelas;
  salvar(); desenharCanteiros(); atualizarHUD();
  falar(`Colhi ${cul.nome}! ${cul.emoji}`);
  if (era === 'cenoura') avancar('colheuCenoura');
  avancar('colheu');
}

/** `calado` evita duas falas seguidas quando o toque também puxa conversa. */
function carinho(tipo, calado = false) {
  const a = estado.animais.find(x => x.tipo === tipo);
  if (!a) return;
  const agora = Date.now();
  const passou = !a.ultimoCarinho || (agora - a.ultimoCarinho) / 1000 > 30;
  if (a.coracoes < 3) a.coracoes++;
  if (passou) { estado.estrelas++; a.ultimoCarinho = agora; }
  estado.carinhosFeitos++;
  const info = ANIMAIS.find(x => x.tipo === tipo);
  const falas = { galinha: 'Có có có! 🐔', vaca: 'Muuuu! 🐄', ovelha: 'Béééé! 🐑', porco: 'Oinc oinc! 🐖' };
  // cada bicho no seu tom: a vaca grave, a galinha esganiçada
  const tomBicho = { galinha: 'cachorro', vaca: 'nenao', ovelha: 'manu', porco: 'nenao' };
  salvar(); atualizarHUD();

  // Carinho vira afeto visível: o bicho fecha os olhinhos e solta
  // coraçõezinhos. É o retorno que a criança entende sem ler nada.
  const bicho = animaisMesh.find(b => b.tipo === tipo);
  if (bicho) {
    bicho.carinhoAte = performance.now() + 1600;
    for (let i = 0; i < 6; i++) soltarCoracao(bicho.grupo.position);
  }
  if (!calado) falar(`${info.nome}: ${falas[tipo]}`, 2600, tomBicho[tipo]);
  avancar('carinho');
}

function pegarOvo(nodeOvo) {
  const g = estado.animais.find(x => x.tipo === 'galinha');
  if (!g || g.ovos <= 0) return false;
  g.ovos--;
  estado.cesta++;
  estado.estrelas++;
  if (nodeOvo) {
    const i = ovosNoChao.findIndex(o => o.node === nodeOvo);
    if (i >= 0) { mundo.remove(ovosNoChao[i].node); ovosNoChao.splice(i, 1); }
  }
  salvar(); atualizarHUD();
  falar('Ovinho! 🥚');
  avancar('pegouOvo');
  return true;
}

// ── Alimentar os bichos ───────────────────────────────────────
function encherCocho() {
  if (cochoRacao.visible) { falar('O cocho já está cheinho! 🌾'); return; }
  cochoRacao.visible = true;
  estado.vezesAlimentou = (estado.vezesAlimentou || 0) + 1;
  estado.estrelas += 2;
  salvar(); atualizarHUD();
  falar('Comidinha no cocho! Os bichinhos vêm comer 🌾');
  avancar('alimentou');
  // a ração acaba depois de um tempo
  clearTimeout(encherCocho._t);
  encherCocho._t = setTimeout(() => {
    cochoRacao.visible = false;
    falar('A comidinha acabou! 🍽️');
  }, 26000);
}

function acharCamisa() {
  if (estado.camisaAchada) return;
  estado.camisaAchada = true;
  estado.estrelas += 5;
  if (camisaMesh) { mundo.remove(camisaMesh); camisaMesh = null; }
  salvar(); atualizarHUD();
  falar('Achei a camisa do Nenão! 👕');
  avancar('achouCamisa');
}

function avancar(evento) {
  // quem estava esperando essa ação agradece antes de tudo
  verificarPedidos(evento);

  const m = MISSOES[estado.missao];
  if (!m || m.evento !== evento) return;
  estado.progresso++;
  if (estado.progresso >= m.alvo) {
    estado.estrelas += m.premio;
    estado.missao++;
    estado.progresso = 0;
    falar(`Missão completa! +${m.premio} ⭐`);
    festa();
  }
  salvar(); atualizarHUD();
}

// ── Coraçõezinhos do carinho ──────────────────────────────────
const coracoes = [];
function soltarCoracao(pos) {
  // dois lóbulos e uma ponta: coração legível mesmo bem pequeno
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: 0xff6b9d, transparent: true, opacity: 0.95 });
  for (const lado of [-1, 1]) {
    const lobo = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12), m);
    lobo.position.set(lado * 0.06, 0.05, 0);
    g.add(lobo);
  }
  const ponta = new THREE.Mesh(new THREE.CircleGeometry(0.105, 3), m);
  ponta.rotation.z = Math.PI;
  ponta.position.y = -0.055;
  g.add(ponta);
  g.position.set(
    pos.x + (Math.random() - 0.5) * 0.5,
    pos.y + 0.7 + Math.random() * 0.3,
    pos.z + (Math.random() - 0.5) * 0.5
  );
  mundo.add(g);
  coracoes.push({ node: g, vida: 1.6, giro: (Math.random() - 0.5) * 2, mat: m });
}

function atualizarCoracoes(dt) {
  for (let i = coracoes.length - 1; i >= 0; i--) {
    const c = coracoes[i];
    c.vida -= dt;
    c.node.position.y += dt * 0.85;
    c.node.rotation.z += c.giro * dt;
    c.node.scale.setScalar(0.7 + (1.6 - c.vida) * 0.35);
    c.mat.opacity = Math.max(0, c.vida / 1.6);
    // sempre de frente para a câmera, senão somem de perfil
    c.node.quaternion.copy(camera.quaternion);
    if (c.vida <= 0) { mundo.remove(c.node); coracoes.splice(i, 1); }
  }
}

const confetes = [];
function festa() {
  for (let i = 0; i < 40; i++) {
    const c = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.85, 0.6), side: THREE.DoubleSide })
    );
    const p = ATORES[atorAtivo].node.position;   // confete cai sobre quem joga
    c.position.set(p.x + (Math.random() - 0.5) * 2, 2.4 + Math.random() * 1.4, p.z + (Math.random() - 0.5) * 2);
    c.userData = { vy: -1.1 - Math.random(), rx: Math.random() * 6, ry: Math.random() * 6 };
    mundo.add(c);
    confetes.push(c);
  }
}

// ── Save ──────────────────────────────────────────────────────
function salvar() {
  try { localStorage.setItem(CHAVE_SAVE, JSON.stringify(estado)); } catch (e) {}
}
function carregar() {
  try {
    const raw = localStorage.getItem(CHAVE_SAVE);
    if (!raw) return;
    Object.assign(estado, JSON.parse(raw));
  } catch (e) {}
}

// ══════════════════════════════════════════════════════════════
//  Interação (raycast) + movimento
// ══════════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const ponteiro = new THREE.Vector2();
let destino = null;

function aoTocar(cx, cy) {
  // durante as transições o toque não vale; dentro do celeiro ele vale,
  // mas sobre o cômodo, não sobre o mundo lá fora
  if (casa.fase === 'entrando' || casa.fase === 'saindo') return;
  ponteiro.x = (cx / innerWidth) * 2 - 1;
  ponteiro.y = -(cy / innerHeight) * 2 + 1;
  raycaster.setFromCamera(ponteiro, camera);

  if (casa.fase === 'dentro') {
    const dentroHits = raycaster.intersectObjects(interiorCeleiro.children, true);
    if (!dentroHits.length) return;
    for (const h of dentroHits) {
      let o = h.object;
      while (o && o !== interiorCeleiro) {
        if (o.userData?.tipo === 'bau') { abrirBau(); return; }
        o = o.parent;
      }
    }
    // senão, anda até o ponto tocado do piso
    const piso = dentroHits.find(h => h.object.geometry?.type === 'BoxGeometry' && h.point.y < 0.4);
    if (piso) destino = new THREE.Vector3(piso.point.x, INTERIOR_CENTRO.y, piso.point.z);
    return;
  }

  const hits = raycaster.intersectObjects(mundo.children, true);
  if (!hits.length) return;

  // sobe a hierarquia procurando algo interativo
  for (const h of hits) {
    let o = h.object;
    while (o && o !== mundo) {
      const d = o.userData || {};
      if (d.tipo === 'canteiro') { tocarCanteiro(d.id); return; }
      if (d.tipo === 'animal') {
        carinho(d.animal, true);   // ganha o coração, mas quem fala é o convite
        puxarConversa(d.animal);   // ele chama a conversa e abre o microfone
        return;
      }
      if (d.tipo === 'camisa') { acharCamisa(); return; }
      if (d.tipo === 'cocho') { encherCocho(); return; }
      if (d.tipo === 'ovo') { pegarOvo(o); return; }
      if (d.tipo === 'fruta') { colherFruta(o); return; }
      if (d.tipo === 'portaCeleiro') { pedirEntrarNaCasa(); return; }
      if (d.tipo === 'lago') { encherRegador(); return; }
      if (d.tipo === 'pier') { pedirPescar(); return; }
      if (d.tipo === 'tronco') { sacudirArvore(o); return; }
      if (d.tipo === 'ninho') { falar('É o ninho da galinha! Ela bota os ovinhos aqui 🥚', 3000); return; }
      o = o.parent;
    }
  }
  // senão, anda até o ponto do chão
  const chao = hits.find(h => h.object.geometry?.type === 'PlaneGeometry' && h.object.rotation.x < -1);
  if (chao) destino = new THREE.Vector3(chao.point.x, 0, chao.point.z);
}

function tocarCanteiro(id) {
  const c = estado.canteiros[id];
  const e = estagio(c);
  if (e === 'vazio') { canteiroAlvo = id; seletor.style.display = 'flex'; return; }
  if (e === 'pronto') colher(id);
  else if (!c.regado) regar(id);
  else falar('Já reguei, agora é esperar! ⏳');
  // caminha até o canteiro
  destino = new THREE.Vector3(canteirosMesh[id].position.x, 0, canteirosMesh[id].position.z + 1.3);
}

for (const btn of seletor.querySelectorAll('button')) {
  btn.addEventListener('click', () => {
    if (canteiroAlvo !== null) plantar(canteiroAlvo, btn.dataset.c);
    seletor.style.display = 'none';
    canteiroAlvo = null;
  });
}

// ── Toque vs arrasto ──────────────────────────────────────────
// Um arrasto gira a câmera; só conta como toque se o dedo quase não
// andou, senão girar a câmera mandaria a Manu andar sem querer.
// ?orbita=3.14 abre com a câmera de frente — atalho para inspecionar o
// rosto sem precisar arrastar
let orbita = parseFloat(new URLSearchParams(location.search).get('orbita')) || 0;
const LIMITE_TOQUE = 12; // px
let pressionado = null;

renderer.domElement.addEventListener('pointerdown', e => {
  pressionado = { x: e.clientX, y: e.clientY, x0: e.clientX, orbita0: orbita, arrastou: false };
  renderer.domElement.setPointerCapture?.(e.pointerId);
});

renderer.domElement.addEventListener('pointermove', e => {
  if (!pressionado) return;
  const dx = e.clientX - pressionado.x0;
  if (Math.abs(dx) > LIMITE_TOQUE) pressionado.arrastou = true;
  if (pressionado.arrastou) orbita = pressionado.orbita0 - dx * 0.006;
});

function soltar(e) {
  if (!pressionado) return;
  const movX = Math.abs(e.clientX - pressionado.x0);
  const movY = Math.abs(e.clientY - pressionado.y);
  if (!pressionado.arrastou && movX < LIMITE_TOQUE && movY < LIMITE_TOQUE) {
    aoTocar(e.clientX, e.clientY);
  }
  pressionado = null;
}
renderer.domElement.addEventListener('pointerup', soltar);
renderer.domElement.addEventListener('pointercancel', () => (pressionado = null));

// ══════════════════════════════════════════════════════════════
//  Loop
// ══════════════════════════════════════════════════════════════
const relogio = new THREE.Clock();
let passoAndar = 0;
const alvoCam = new THREE.Vector3();
const miraCam = new THREE.Vector3(0, 1.15, 4.5);

// Enquadramento: câmera mais baixa e mira acima da linha do horizonte,
// para o céu com sol e nuvens entrar no quadro em vez de só o gramado.
const DIST_CAM = 7.4;
const ALT_CAM = 4.1;
const ALTURA_MIRA_EXTRA = 1.5;
let camPosicionada = false;   // evita a interpolação a partir da origem

function tick() {
  const dt = Math.min(relogio.getDelta(), 0.05);
  const t = relogio.elapsedTime;

  // movimento do personagem ativo, com colisão
  const ator = ATORES[atorAtivo];
  const corpoAtor = ator.node;
  let andando = false;
  if (destino) {
    const dir = new THREE.Vector3().subVectors(destino, corpoAtor.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist > 0.14) {
      dir.normalize();
      const passo = dt * ator.velocidade;
      const alvo = resolverColisao(
        corpoAtor.position.x, corpoAtor.position.z,
        corpoAtor.position.x + dir.x * passo,
        corpoAtor.position.z + dir.z * passo,
        ator.raio
      );
      // se a colisão zerou o avanço, desiste do destino em vez de patinar
      const avancou = Math.hypot(alvo.x - corpoAtor.position.x, alvo.z - corpoAtor.position.z);
      corpoAtor.position.x = alvo.x;
      corpoAtor.position.z = alvo.z;
      if (avancou < passo * 0.15) destino = null;

      const alvoRot = Math.atan2(dir.x, dir.z);
      let d = alvoRot - corpoAtor.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      corpoAtor.rotation.y += d * Math.min(1, dt * 9);
      andando = avancou > 0.0005;
    } else destino = null;
  }

  // anima o ator ativo com seu próprio andar; os outros ficam ociosos
  if (!andando) passoDoAtor = 0;
  ator.animar(t, dt, andando);
  for (let i = 0; i < ATORES.length; i++) {
    if (i !== atorAtivo) ATORES[i].animar(t, dt, false);
  }

  // Apoia todo mundo no relevo. As animações escrevem só o saltinho em
  // `bobY`; a altura final é terreno + salto, senão o personagem afunda
  // ao sair da parte plana do mapa.
  for (const a of ATORES) {
    // no celeiro o piso é plano e fica lá embaixo, fora do relevo do campo
    const base = (casa.fase === 'dentro' && a === ator) ? INTERIOR_CENTRO.y
               : alturaTerreno(a.node.position.x, a.node.position.z);
    a.node.position.y = base + (a.bobY || 0);
  }
  for (const b of animaisMesh) {
    b.grupo.position.y = alturaTerreno(b.grupo.position.x, b.grupo.position.z);
  }
  for (const o of ovosNoChao) {
    o.node.position.y = alturaTerreno(o.node.position.x, o.node.position.z);
  }

  // pás do moinho girando
  if (pasMoinho) pasMoinho.rotation.z += dt * 0.55;

  // botão de ordem marcado enquanto aquele ajudante está trabalhando
  for (const btn of document.querySelectorAll('#ordens button')) {
    const quem = btn.dataset.ordem === 'buscar' ? 'cachorro' : 'nenao';
    btn.classList.toggle('ocupado', !!tarefas[quem]);
  }

  // marcador da missão pairando sobre o objetivo
  const alvoM = alvoDaMissao();
  if (alvoM) {
    marcadorMissao.visible = true;
    marcadorMissao.position.set(alvoM.x, 2.5 + Math.sin(t * 2.2) * 0.22, alvoM.z);
    marcadorMissao.rotation.y = t * 1.1;
  } else {
    marcadorMissao.visible = false;
  }

  // nuvens andando devagar, reaparecendo do outro lado
  for (const n of nuvens) {
    n.grupo.position.x += n.vx * dt;
    if (n.grupo.position.x > 46) n.grupo.position.x = -46;
  }

  // animais respiram e balançam de leve; ao receber carinho, encolhem os
  // olhinhos e balançam mais, como quem gosta
  const agoraMs = performance.now();
  for (const a of animaisMesh) {
    const mimado = a.carinhoAte && agoraMs < a.carinhoAte;
    a.corpo.position.y = Math.sin(t * (mimado ? 6 : 1.9) + a.fase) * (mimado ? 0.05 : 0.022);
    a.corpo.rotation.z = Math.sin(t * (mimado ? 4 : 1.1) + a.fase) * (mimado ? 0.09 : 0.03);
    if (a.olhos === undefined) {
      a.olhos = [];
      a.corpo.traverse(o => {
        // olhos são as esferas pretas pequenas
        if (o.isMesh && o.material?.color?.getHex() === 0x1a1a1a && o.geometry?.parameters?.radius < 0.04) {
          a.olhos.push({ mesh: o, escalaY: o.scale.y });
        }
      });
    }
    for (const olho of a.olhos) {
      olho.mesh.scale.y = mimado ? olho.escalaY * 0.18 : olho.escalaY;   // fecha
    }
  }

  // IA dos bichos: passeiam sozinhos e vêm ao cocho quando tem comida
  atualizarIA(dt, t);
  atualizarFrutas(dt, t);
  atualizarCasa(dt);
  atualizarAjudantes(dt);
  atualizarCoracoes(dt);
  atualizarRespingos(dt);
  atualizarChuva(dt, t);
  atualizarBorboletas(dt, t);
  atualizarPeixes(dt, t);
  atualizarPesca(dt, t);

  // Ovos: a galinha bota onde ela estiver, e o ovo fica no chão para
  // ser recolhido — em vez de virar só um número no HUD.
  const gal = estado.animais.find(a => a.tipo === 'galinha');
  if (gal) {
    if (!gal.proximoOvo) gal.proximoOvo = Date.now() + 45000;
    else if (Date.now() >= gal.proximoOvo && gal.ovos < 4) {
      gal.ovos++;
      gal.proximoOvo = Date.now() + 45000;
      // sempre no ninho: lugar fixo é o que torna possível "ir buscar"
      porOvoNoChao(
        NINHO_POS.x + (Math.random() - 0.5) * 0.35,
        NINHO_POS.z + (Math.random() - 0.5) * 0.35
      );
      falar('A galinha botou um ovinho no ninho! 🥚');
      salvar();
    }
  }
  // pulsa o anel do ovo para chamar atenção
  for (const o of ovosNoChao) {
    const k = 1 + Math.sin(t * 4) * 0.15;
    o.marca.scale.set(k, k, 1);
    o.node.children[0].position.y = 0.14 + Math.sin(t * 3) * 0.02;
  }

  // Cachorro como pet: quando não está sendo controlado, segue quem
  // está, mantendo distância para não empurrar nem colar.
  // o cachorro só faz o papel de pet quando não está numa tarefa
  if (atorAtivo !== 1 && !tarefas.cachorro) {
    const alvoPet = ATORES[atorAtivo].node.position;
    const d = Math.hypot(dalmata.position.x - alvoPet.x, dalmata.position.z - alvoPet.z);
    if (d > 2.2) {
      const dir = new THREE.Vector3(alvoPet.x - dalmata.position.x, 0, alvoPet.z - dalmata.position.z).normalize();
      const passo = dt * Math.min(4.2, 1.6 + d * 0.45);   // corre mais se ficou longe
      const novo = resolverColisao(
        dalmata.position.x, dalmata.position.z,
        dalmata.position.x + dir.x * passo, dalmata.position.z + dir.z * passo, 0.30
      );
      dalmata.position.x = novo.x;
      dalmata.position.z = novo.z;
      let da = Math.atan2(dir.x, dir.z) - dalmata.rotation.y;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      dalmata.rotation.y += da * Math.min(1, dt * 6);
      ATORES[1].bobY = Math.abs(Math.sin(t * 13)) * 0.07;
    } else {
      ATORES[1].bobY = (ATORES[1].bobY || 0) * 0.85;
      // olha para o dono quando alcança
      let da = Math.atan2(alvoPet.x - dalmata.position.x, alvoPet.z - dalmata.position.z) - dalmata.rotation.y;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      dalmata.rotation.y += da * Math.min(1, dt * 3);
    }
  }

  // esconde a camisa quando a missão dela chega
  const m = MISSOES[estado.missao];
  if (m && m.id === 'camisa' && estado.camisaLocal === null) {
    estado.camisaLocal = Math.floor(Math.random() * LOCAIS_CAMISA.length);
    estado.camisaAchada = false;
    porCamisa(estado.camisaLocal);
    falar('O Nenão perdeu a camisa! Procura por aí 👕');
    salvar();
  }

  // confetes
  for (let i = confetes.length - 1; i >= 0; i--) {
    const c = confetes[i];
    c.position.y += c.userData.vy * dt;
    c.rotation.x += c.userData.rx * dt;
    c.rotation.y += c.userData.ry * dt;
    if (c.position.y < 0) { mundo.remove(c); confetes.splice(i, 1); }
  }

  // Câmera de terceira pessoa seguindo quem está sendo controlado.
  // Cada ator tem sua distância: o cachorro é baixo, então a câmera
  // chega mais perto; o urso é largo e pede mais recuo.
  // Com o personagem escondido dentro do celeiro, seguir a posição dele
  // colocaria a câmera dentro da parede — então ela olha a fachada.
  // 'dentro' segue o personagem normalmente — ele está no cômodo. Só nas
  // transições a câmera fica na fachada, porque ali ele some atrás da porta.
  const naTransicao = casa.fase === 'entrando' || casa.fase === 'saindo';
  const foco = naTransicao ? entradaCeleiro : corpoAtor.position;
  // no cômodo a câmera fica perto e mais alta, olhando de cima para não
  // furar as paredes, que são bem mais próximas que no campo aberto
  const distFoco = naTransicao ? 8.2 : (casa.fase === 'dentro' ? 3.6 : ator.dist);

  // A vista padrão é atrás do personagem. Girar com o dedo é permitido,
  // mas assim que ele volta a andar a câmera retorna para trás — senão
  // se caminha de lado sem enxergar para onde vai.
  if (andando && !pressionado && Math.abs(orbita) > 0.001) {
    orbita += (0 - orbita) * Math.min(1, dt * 1.8);
    if (Math.abs(orbita) < 0.01) orbita = 0;
  }

  const dentro = casa.fase === 'dentro';
  const ang = corpoAtor.rotation.y + orbita;
  alvoCam.set(
    foco.x - Math.sin(naTransicao ? CELEIRO_ROT + Math.PI : ang) * distFoco,
    naTransicao ? 4.8 : (dentro ? foco.y + 2.9 : ALT_CAM),
    foco.z - Math.cos(naTransicao ? CELEIRO_ROT + Math.PI : ang) * distFoco
  );
  // No primeiro quadro a câmera é colocada direto no lugar. Interpolar a
  // partir da origem fazia o jogo abrir com a câmera atravessando o
  // cenário até se acomodar atrás do personagem.
  if (!camPosicionada) {
    camera.position.copy(alvoCam);
    miraCam.set(foco.x, (naTransicao ? 1.4 : foco.y + ator.alturaCam) + (dentro ? 0.2 : ALTURA_MIRA_EXTRA), foco.z);
    camPosicionada = true;
  }
  camera.position.lerp(alvoCam, 1 - Math.pow(0.0015, dt));
  miraCam.lerp(
    new THREE.Vector3(
      foco.x,
      (naTransicao ? 1.4 : corpoAtor.position.y + ator.alturaCam) + (dentro ? 0.2 : ALTURA_MIRA_EXTRA),
      foco.z
    ),
    1 - Math.pow(0.002, dt)
  );
  camera.lookAt(miraCam);

  // o sol acompanha quem joga, para a sombra não sair do mapa
  sol.position.set(corpoAtor.position.x + 9, 14, corpoAtor.position.z + 7);
  sol.target.position.copy(corpoAtor.position);
  sol.target.updateMatrixWorld();

  renderer.render(cena, camera);
  requestAnimationFrame(tick);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Início ────────────────────────────────────────────────────
// exposto para inspeção no console durante o desenvolvimento
window.__jogo = {
  cena, mundo, animaisMesh, manu, estado, THREE,
  ATORES, obstaculos, resolver: resolverColisao,
  camera, renderer, tick,
  entradaCeleiro, portasCeleiro, casa, entrarNaCasa: pedirEntrarNaCasa, sairDaCasa,
  get atorAtivo() { return atorAtivo; },
  get orbita() { return orbita; },
  conversarCom, responder, PERSONAS, puxarConversa, CONVITES,
  PEDIDOS, pedidosAtivos, verificarPedidos, nivelAmizade,
  tarefas, mandarBuscar, mandarRegar, mandarColher,
  regar, encherRegador, sacudirArvore, arvoresFrutiferas, carinho,
  comecarChuva, borboletas, coracoes, NINHO_POS, LAGO_POS,
  peixesLago, PIER_INICIO, PIER_PONTA, LAGO_CENTRO, pedirPescar, pesca,
  get chuva() { return chuva; },
  get ouvindo() { return ouvindo; },
  irPara: (x, z) => { destino = new THREE.Vector3(x, 0, z); },
};

cena.add(sol.target);
carregar();
if (estado.camisaLocal !== null && !estado.camisaAchada) porCamisa(estado.camisaLocal);
desenharCanteiros();
atualizarHUD();
el('carregando').style.display = 'none';
tick();
setTimeout(() => falar('Oi! Eu sou a Manu! Vamos cuidar da fazenda? 🌻', 4000), 600);
