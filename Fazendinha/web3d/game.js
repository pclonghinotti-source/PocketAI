import * as THREE from './lib/three.module.js';

// ══════════════════════════════════════════════════════════════
//  A FAZENDA DA MANU — versão 3D (Three.js)
//  Personagens torneados por lathe/extrusão em vez de primitivas
//  soltas, luz com sombra suave e câmera de terceira pessoa.
// ══════════════════════════════════════════════════════════════

const PALETA = {
  ceu: 0x8fc9f5,
  ceuAlto: 0x4a90d9,
  grama: 0x6fbf4a,
  gramaEsc: 0x4f9a33,
  terra: 0x8a5a35,
  terraEsc: 0x6b4426,
  pele: 0xf3c9a0,
  cabelo: 0x5a2d10,
  vestido: 0xe8478f,
  celeiro: 0xc8352f,
  telhado: 0x7d2420,
  madeira: 0x9c6b3f,
  agua: 0x4a9fd4,
  urso: 0x8b5a2b,
  ursoClaro: 0xb98a5e,
  camisa: 0x3fbf6a,
  cao: 0xf2f0eb,
  caoMancha: 0x2a2a2a,
  capacete: 0xd81f1f,
  folha: 0x3f8f37,
  folhaClara: 0x5cae4a,
  tronco: 0x6b4a2a,
};

// ── Culturas ──────────────────────────────────────────────────
const CULTURAS = {
  cenoura:  { nome: 'Cenoura',  emoji: '🥕', cresce: 45, estrelas: 1, cor: 0xf07316, topo: 0x4a9a30 },
  girassol: { nome: 'Girassol', emoji: '🌻', cresce: 60, estrelas: 2, cor: 0xffd400, topo: 0x6b4426 },
  morango:  { nome: 'Morango',  emoji: '🍓', cresce: 75, estrelas: 3, cor: 0xd92626, topo: 0x3f8f37 },
  abobora:  { nome: 'Abóbora',  emoji: '🎃', cresce: 90, estrelas: 4, cor: 0xef911f, topo: 0x4a9a30 },
};

const MISSOES = [
  { id: 'colheita', icone: '🥕', titulo: 'Colha 1 cenourinha!', alvo: 1, evento: 'colheuCenoura', premio: 3 },
  { id: 'regar',    icone: '💧', titulo: 'Regue 3 canteiros',   alvo: 3, evento: 'regou',          premio: 3 },
  { id: 'carinho',  icone: '🐄', titulo: 'Faça carinho em 3 bichinhos', alvo: 3, evento: 'carinho', premio: 4 },
  { id: 'ovo',      icone: '🥚', titulo: 'Pegue um ovinho',     alvo: 1, evento: 'pegouOvo',       premio: 3 },
  { id: 'camisa',   icone: '👕', titulo: 'Ache a camisa do Nenão', alvo: 1, evento: 'achouCamisa', premio: 5 },
  { id: 'colher5',  icone: '🧺', titulo: 'Colha 5 plantinhas',  alvo: 5, evento: 'colheu',         premio: 5 },
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
};

// ══════════════════════════════════════════════════════════════
//  Cena, luz e câmera
// ══════════════════════════════════════════════════════════════
const cena = new THREE.Scene();
cena.background = new THREE.Color(PALETA.ceu);
cena.fog = new THREE.Fog(PALETA.ceu, 26, 52);

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

/** Sólido de revolução: dá volume orgânico onde uma esfera ficaria "de bloco". */
function torneado(perfil, material, segmentos = 20) {
  const pontos = perfil.map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pontos, segmentos);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
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
//  Mundo
// ══════════════════════════════════════════════════════════════
const mundo = new THREE.Group();
cena.add(mundo);

// Chão com relevo suave (não um plano chapado)
{
  const g = new THREE.PlaneGeometry(80, 80, 48, 48);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const d = Math.hypot(x, y);
    // mantém o centro plano (área jogável) e ondula as bordas
    const ondula = Math.sin(x * 0.16) * Math.cos(y * 0.14) * 0.9;
    pos.setZ(i, d > 11 ? ondula * ((d - 11) / 9) : 0);
  }
  g.computeVertexNormals();
  const chao = new THREE.Mesh(g, mat(PALETA.grama, { roughness: 0.95 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  mundo.add(chao);
}

// Colinas ao fundo, para dar profundidade
for (const [x, z, r] of [[-22, -20, 9], [16, -24, 11], [30, -8, 8], [-30, -4, 7]]) {
  const h = esfera(r, mat(PALETA.gramaEsc, { roughness: 1 }), 0.42);
  h.position.set(x, -0.6, z);
  h.receiveShadow = false;
  mundo.add(h);
}

// ── Celeiro ───────────────────────────────────────────────────
{
  const celeiro = new THREE.Group();
  const corpo = caixa(3.4, 2.3, 2.6, mat(PALETA.celeiro));
  corpo.position.y = 1.15;
  celeiro.add(corpo);

  // Telhado de duas águas via prisma extrudado
  const forma = new THREE.Shape();
  forma.moveTo(-1.95, 0);
  forma.lineTo(0, 1.35);
  forma.lineTo(1.95, 0);
  forma.lineTo(-1.95, 0);
  const telhado = new THREE.Mesh(
    new THREE.ExtrudeGeometry(forma, { depth: 2.9, bevelEnabled: false }),
    mat(PALETA.telhado)
  );
  telhado.rotation.y = Math.PI / 2;
  telhado.position.set(1.45, 2.3, 0);
  telhado.castShadow = true;
  celeiro.add(telhado);

  const porta = caixa(1.1, 1.5, 0.08, mat(PALETA.madeira));
  porta.position.set(0, 0.75, 1.32);
  celeiro.add(porta);

  celeiro.position.set(-7.5, 0, -5.5);
  celeiro.rotation.y = 0.35;
  mundo.add(celeiro);
}

// ── Árvores (copa em 3 camadas, dá silhueta melhor que 1 esfera) ──
function arvore(x, z, escala = 1) {
  const g = new THREE.Group();
  const tronco = cilindro(0.16, 0.22, 1.3, mat(PALETA.tronco, { roughness: 0.9 }));
  tronco.position.y = 0.65;
  g.add(tronco);
  const camadas = [[0.95, 1.45, PALETA.folha], [0.75, 2.05, PALETA.folhaClara], [0.5, 2.55, PALETA.folha]];
  for (const [r, y, cor] of camadas) {
    const c = esfera(r, mat(cor, { roughness: 0.88 }), 0.85);
    c.position.y = y;
    g.add(c);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(escala);
  g.rotation.y = Math.random() * Math.PI;
  mundo.add(g);
  return g;
}
for (const [x, z, s] of [[-11, -1, 1.1], [-9.5, 5, 0.9], [10.5, -3, 1.15], [12, 4, 0.95], [6, -9, 1.0], [-4, -11, 1.05], [-13, -8, 0.85]]) {
  arvore(x, z, s);
}

// ── Lago ──────────────────────────────────────────────────────
{
  const lago = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 32),
    mat(PALETA.agua, { roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.9 })
  );
  lago.rotation.x = -Math.PI / 2;
  lago.position.set(8.5, 0.03, 7);
  lago.receiveShadow = true;
  mundo.add(lago);
  // borda de terra
  const borda = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 32), mat(PALETA.terraEsc, { roughness: 1 }));
  borda.rotation.x = -Math.PI / 2;
  borda.position.set(8.5, 0.02, 7);
  mundo.add(borda);
}

// ── Cercas ────────────────────────────────────────────────────
function cerca(x, z, rotY, comp = 3) {
  const g = new THREE.Group();
  const m = mat(PALETA.madeira, { roughness: 0.9 });
  for (let i = 0; i <= 1; i++) {
    const trave = caixa(comp, 0.1, 0.07, m);
    trave.position.set(0, 0.45 + i * 0.35, 0);
    g.add(trave);
  }
  for (const px of [-comp / 2, 0, comp / 2]) {
    const poste = caixa(0.11, 1.0, 0.11, m);
    poste.position.set(px, 0.5, 0);
    g.add(poste);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  mundo.add(g);
}
for (let i = -2; i <= 2; i++) cerca(i * 3, 8.6, 0);
for (let i = -1; i <= 2; i++) cerca(-7.6, i * 3 + 1, Math.PI / 2);
for (let i = -1; i <= 2; i++) cerca(7.6, i * 3 + 1, Math.PI / 2);

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

  // ── Cabelo cacheado: calota + cachos em volta ──
  const calota = torneado([
    [0.0, 0.0], [0.186, 0.008], [0.192, 0.075], [0.170, 0.145], [0.105, 0.19], [0.0, 0.20],
  ], matCabelo, 26);
  calota.position.y = 1.10;
  cabeca.add(calota);
  calota.position.set(0, -0.015, 0);

  // cachos: esferas ao redor do crânio dão volume de cabelo crespo
  const cachos = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const raio = 0.175 + Math.sin(i * 2.7) * 0.012;
    const alt = 0.055 + Math.cos(i * 1.9) * 0.075;
    const c = esfera(0.052 + (i % 3) * 0.008, matCabelo, 0.95);
    c.position.set(Math.cos(a) * raio, alt, Math.sin(a) * raio * 0.94);
    // afina na frente para não cobrir o rosto
    if (c.position.z > 0.08 && Math.abs(c.position.x) < 0.10) c.position.y += 0.075;
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

/** Nenão: urso de camisa verde. */
function criarNenao() {
  const g = new THREE.Group();
  const mUrso = mat(PALETA.urso, { roughness: 0.85 });
  const mClaro = mat(PALETA.ursoClaro, { roughness: 0.8 });

  const corpo = torneado([
    [0.0, 0.0], [0.26, 0.03], [0.30, 0.22], [0.26, 0.44], [0.0, 0.48],
  ], mUrso, 22);
  g.add(corpo);

  const camisa = torneado([
    [0.0, 0.0], [0.31, 0.01], [0.315, 0.16], [0.28, 0.26], [0.0, 0.27],
  ], mat(PALETA.camisa, { roughness: 0.75 }), 22);
  camisa.position.y = 0.16;
  g.add(camisa);

  const cabeca = esfera(0.24, mUrso, 0.95);
  cabeca.position.y = 0.70;
  g.add(cabeca);

  const focinho = esfera(0.115, mClaro, 0.8);
  focinho.position.set(0, 0.66, 0.20);
  g.add(focinho);
  const nariz = esfera(0.045, mat(0x2b2b2b, { roughness: 0.4 }), 0.7);
  nariz.position.set(0, 0.69, 0.30);
  g.add(nariz);

  for (const lado of [-1, 1]) {
    const orelha = esfera(0.085, mUrso, 0.9);
    orelha.position.set(lado * 0.17, 0.88, -0.01);
    g.add(orelha);
    const dentro = esfera(0.045, mClaro, 0.8);
    dentro.position.set(lado * 0.18, 0.885, 0.045);
    g.add(dentro);
    const olho = esfera(0.032, mat(0x1a1a1a, { roughness: 0.3 }), 1.1);
    olho.position.set(lado * 0.085, 0.745, 0.205);
    g.add(olho);
  }

  const bracos = [];
  for (const lado of [-1, 1]) {
    const b = new THREE.Group();
    const br = cilindro(0.06, 0.055, 0.28, mUrso, 10);
    br.position.y = -0.14;
    b.add(br);
    const pata = esfera(0.07, mClaro);
    pata.position.y = -0.29;
    b.add(pata);
    b.position.set(lado * 0.29, 0.42, 0);
    b.rotation.z = lado * 0.3;
    g.add(b);
    bracos.push(b);
  }
  for (const lado of [-1, 1]) {
    const perna = cilindro(0.075, 0.07, 0.16, mUrso, 10);
    perna.position.set(lado * 0.12, 0.08, 0);
    g.add(perna);
    const pe = esfera(0.085, mClaro, 0.7);
    pe.position.set(lado * 0.12, 0.02, 0.05);
    pe.scale.z = 1.3;
    g.add(pe);
  }

  g.userData = { bracos };
  return g;
}

/** Dálmata bombeiro. */
function criarDalmata() {
  const g = new THREE.Group();
  const mBranco = mat(PALETA.cao, { roughness: 0.8 });
  const mPreto = mat(PALETA.caoMancha, { roughness: 0.8 });

  const corpo = esfera(0.19, mBranco, 0.85);
  corpo.scale.z = 1.5;
  corpo.position.y = 0.28;
  g.add(corpo);

  for (const [dx, dy, dz, r] of [[0.10, 0.34, 0.06, 0.05], [-0.09, 0.30, -0.10, 0.045], [0.05, 0.22, -0.16, 0.04]]) {
    const m = esfera(r, mPreto, 0.6);
    m.position.set(dx, dy, dz);
    g.add(m);
  }

  const cabeca = esfera(0.145, mBranco, 0.95);
  cabeca.position.set(0, 0.44, 0.20);
  g.add(cabeca);
  const focinho = esfera(0.07, mBranco, 0.75);
  focinho.position.set(0, 0.40, 0.33);
  focinho.scale.z = 1.3;
  g.add(focinho);
  const nariz = esfera(0.032, mPreto, 0.8);
  nariz.position.set(0, 0.42, 0.40);
  g.add(nariz);

  for (const lado of [-1, 1]) {
    const orelha = esfera(0.055, mPreto, 1);
    orelha.scale.set(0.6, 1.5, 1);
    orelha.position.set(lado * 0.13, 0.46, 0.16);
    g.add(orelha);
    const olho = esfera(0.024, mat(0x1a1a1a, { roughness: 0.3 }));
    olho.position.set(lado * 0.055, 0.47, 0.30);
    g.add(olho);
  }

  // capacete de bombeiro
  const capacete = torneado([[0.0, 0.0], [0.15, 0.01], [0.14, 0.06], [0.10, 0.11], [0.0, 0.12]], mat(PALETA.capacete, { roughness: 0.5 }), 18);
  capacete.position.set(0, 0.53, 0.19);
  g.add(capacete);
  const aba = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.20, 18, 1, 0, Math.PI), mat(PALETA.capacete, { roughness: 0.5, side: THREE.DoubleSide }));
  aba.rotation.x = -Math.PI / 2;
  aba.position.set(0, 0.535, 0.13);
  g.add(aba);

  for (const [dx, dz] of [[-0.11, 0.14], [0.11, 0.14], [-0.11, -0.14], [0.11, -0.14]]) {
    const pata = cilindro(0.045, 0.05, 0.20, mBranco, 8);
    pata.position.set(dx, 0.10, dz);
    g.add(pata);
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

const manu = criarManu();
manu.position.set(0, 0, 4.5);
mundo.add(manu);

const nenao = criarNenao();
nenao.position.set(-4.6, 0, -0.5);
nenao.rotation.y = 0.7;
mundo.add(nenao);

const dalmata = criarDalmata();
dalmata.position.set(1.6, 0, 5.4);
dalmata.rotation.y = -0.4;
mundo.add(dalmata);

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
  animaisMesh.push({ grupo: g, corpo, tipo: a.tipo, fase: Math.random() * 6 });
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

function falar(txt, ms = 2600) {
  balao.textContent = txt;
  balao.style.display = 'block';
  clearTimeout(falar._t);
  falar._t = setTimeout(() => (balao.style.display = 'none'), ms);
  if (vozAtiva && window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(txt.replace(/[^\p{L}\p{N}\s,!?.]/gu, ''));
    u.lang = 'pt-BR';
    u.rate = 0.95;
    u.pitch = 1.35;
    speechSynthesis.speak(u);
  }
}

function atualizarHUD() {
  hudEstrelas.textContent = estado.estrelas;
  hudCesta.textContent = estado.cesta;
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

function regar(id) {
  const c = estado.canteiros[id];
  if (!c || !c.cultura || c.regado) return;
  c.regado = true;
  estado.regasFeitas++;
  salvar(); desenharCanteiros();
  falar('Que delícia, água! 💧');
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

function carinho(tipo) {
  const a = estado.animais.find(x => x.tipo === tipo);
  if (!a) return;
  const agora = Date.now();
  const passou = !a.ultimoCarinho || (agora - a.ultimoCarinho) / 1000 > 30;
  if (a.coracoes < 3) a.coracoes++;
  if (passou) { estado.estrelas++; a.ultimoCarinho = agora; }
  estado.carinhosFeitos++;
  const info = ANIMAIS.find(x => x.tipo === tipo);
  const falas = { galinha: 'Có có có! 🐔', vaca: 'Muuuu! 🐄', ovelha: 'Béééé! 🐑', porco: 'Oinc oinc! 🐖' };
  salvar(); atualizarHUD();
  falar(`${info.nome}: ${falas[tipo]}`);
  avancar('carinho');
}

function pegarOvo() {
  const g = estado.animais.find(x => x.tipo === 'galinha');
  if (!g || g.ovos <= 0) return false;
  g.ovos--;
  estado.cesta++;
  estado.estrelas++;
  salvar(); atualizarHUD();
  falar('Ovinho! 🥚');
  avancar('pegouOvo');
  return true;
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

const confetes = [];
function festa() {
  for (let i = 0; i < 40; i++) {
    const c = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.85, 0.6), side: THREE.DoubleSide })
    );
    c.position.set(manu.position.x + (Math.random() - 0.5) * 2, 2.4 + Math.random() * 1.4, manu.position.z + (Math.random() - 0.5) * 2);
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
  ponteiro.x = (cx / innerWidth) * 2 - 1;
  ponteiro.y = -(cy / innerHeight) * 2 + 1;
  raycaster.setFromCamera(ponteiro, camera);
  const hits = raycaster.intersectObjects(mundo.children, true);
  if (!hits.length) return;

  // sobe a hierarquia procurando algo interativo
  for (const h of hits) {
    let o = h.object;
    while (o && o !== mundo) {
      const d = o.userData || {};
      if (d.tipo === 'canteiro') { tocarCanteiro(d.id); return; }
      if (d.tipo === 'animal') {
        if (d.animal === 'galinha' && estado.animais.find(a => a.tipo === 'galinha').ovos > 0) pegarOvo();
        else carinho(d.animal);
        return;
      }
      if (d.tipo === 'camisa') { acharCamisa(); return; }
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
let orbita = 0;
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

// Enquadramento: mais afastado e alto que a primeira versão, em que a
// Manu ficava pequena e de costas colada na base da tela.
const DIST_CAM = 7.4;
const ALT_CAM = 5.4;

function tick() {
  const dt = Math.min(relogio.getDelta(), 0.05);
  const t = relogio.elapsedTime;

  // movimento da Manu
  let andando = false;
  if (destino) {
    const dir = new THREE.Vector3().subVectors(destino, manu.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist > 0.12) {
      dir.normalize();
      manu.position.addScaledVector(dir, dt * 2.6);
      const alvoRot = Math.atan2(dir.x, dir.z);
      // interpola o ângulo pelo caminho curto
      let d = alvoRot - manu.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      manu.rotation.y += d * Math.min(1, dt * 9);
      andando = true;
    } else destino = null;
  }

  // animação de caminhada / respiração
  const u = manu.userData;
  if (andando) {
    passoAndar += dt * 8.5;
    const s = Math.sin(passoAndar);
    const c = Math.cos(passoAndar);
    // braços: ombro balança, cotovelo dobra sempre para trás
    u.bracos[0].pivo.rotation.x = s * 0.62;
    u.bracos[1].pivo.rotation.x = -s * 0.62;
    u.bracos[0].cotovelo.rotation.x = -Math.max(0, s) * 0.5 - 0.12;
    u.bracos[1].cotovelo.rotation.x = -Math.max(0, -s) * 0.5 - 0.12;
    // pernas: quadril alterna, joelho dobra na fase de recuo
    u.pernas[0].pivo.rotation.x = -s * 0.55;
    u.pernas[1].pivo.rotation.x = s * 0.55;
    u.pernas[0].joelho.rotation.x = Math.max(0, s) * 0.7;
    u.pernas[1].joelho.rotation.x = Math.max(0, -s) * 0.7;
    // sobe e desce a cada passo, e inclina o tronco de leve
    manu.position.y = Math.abs(Math.sin(passoAndar)) * 0.045;
    u.torso.rotation.z = c * 0.035;
    u.cabeca.position.x = c * 0.012;
    for (const tr of u.trancas) tr.rotation.x = s * 0.32;
  } else {
    passoAndar = 0;
    const r = Math.sin(t * 1.7) * 0.05;
    for (const b of u.bracos) {
      b.pivo.rotation.x += (r * 0.4 - b.pivo.rotation.x) * Math.min(1, dt * 5);
      b.cotovelo.rotation.x += (-0.18 - b.cotovelo.rotation.x) * Math.min(1, dt * 5);
    }
    for (const p of u.pernas) {
      p.pivo.rotation.x += (0 - p.pivo.rotation.x) * Math.min(1, dt * 5);
      p.joelho.rotation.x += (0 - p.joelho.rotation.x) * Math.min(1, dt * 5);
    }
    manu.position.y += (0 - manu.position.y) * Math.min(1, dt * 6);
    // respiração no torso
    u.torso.scale.y = 1 + Math.sin(t * 1.7) * 0.018;
    u.torso.rotation.z += (0 - u.torso.rotation.z) * Math.min(1, dt * 5);
    u.cabeca.position.x += (0 - u.cabeca.position.x) * Math.min(1, dt * 5);
    for (const tr of u.trancas) tr.rotation.x = r * 0.6;
  }
  u.cabeca.rotation.z = Math.sin(t * 1.1) * 0.045;
  u.cabeca.rotation.y = Math.sin(t * 0.6) * 0.10;

  // Nenão acena, cachorro abana o rabo
  nenao.userData.bracos[1].rotation.z = -0.3 + Math.sin(t * 3) * 0.5;
  dalmata.userData.cauda.rotation.z = Math.sin(t * 11) * 0.5;

  // animais respiram e balançam de leve
  for (const a of animaisMesh) {
    a.corpo.position.y = Math.sin(t * 1.9 + a.fase) * 0.022;
    a.corpo.rotation.z = Math.sin(t * 1.1 + a.fase) * 0.03;
  }

  // ovos da galinha
  const gal = estado.animais.find(a => a.tipo === 'galinha');
  if (gal) {
    if (!gal.proximoOvo) gal.proximoOvo = Date.now() + 120000;
    else if (Date.now() >= gal.proximoOvo && gal.ovos < 3) {
      gal.ovos++;
      gal.proximoOvo = Date.now() + 120000;
      falar('A galinha botou um ovinho! 🥚');
      salvar();
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

  // Câmera de terceira pessoa: mais alta e afastada que antes, com o
  // ponto de mira acima da cintura para a Manu não ficar no rodapé.
  // O arrasto horizontal do dedo/mouse gira em torno dela.
  const ang = manu.rotation.y + orbita;
  alvoCam.set(
    manu.position.x - Math.sin(ang) * DIST_CAM,
    ALT_CAM,
    manu.position.z - Math.cos(ang) * DIST_CAM
  );
  camera.position.lerp(alvoCam, 1 - Math.pow(0.0015, dt));
  miraCam.lerp(new THREE.Vector3(manu.position.x, manu.position.y + 1.15, manu.position.z), 1 - Math.pow(0.002, dt));
  camera.lookAt(miraCam);

  // o sol acompanha a personagem para a sombra não sair do mapa
  sol.position.set(manu.position.x + 9, 14, manu.position.z + 7);
  sol.target.position.copy(manu.position);
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
window.__jogo = { cena, mundo, animaisMesh, manu, estado, THREE };

cena.add(sol.target);
carregar();
if (estado.camisaLocal !== null && !estado.camisaAchada) porCamisa(estado.camisaLocal);
desenharCanteiros();
atualizarHUD();
el('carregando').style.display = 'none';
tick();
setTimeout(() => falar('Oi! Eu sou a Manu! Vamos cuidar da fazenda? 🌻', 4000), 600);
