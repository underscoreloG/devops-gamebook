/* Takes the README screenshots by driving a headless Edge or Chrome through the DevTools protocol.
   Usage : node outils/captures.js [url]   (default: the live GitHub Pages site)
   Writes PNG files to docs/screenshots/. Needs Node 22+ (global WebSocket). */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const URL_JEU = process.argv[2] || 'https://underscorelog.github.io/devops-gamebook/';
const SORTIE = path.join(__dirname, '..', 'docs', 'screenshots');
const PORT = 9333;
const NAVIGATEURS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdp() {
  const exe = NAVIGATEURS.find((p) => fs.existsSync(p));
  if (!exe) throw new Error('Aucun navigateur Chromium trouvé');
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'captures-'));
  const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profil, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let cible;
  for (let i = 0; i < 50 && !cible; i += 1) {
    await pause(200);
    try { cible = (await (await fetch('http://127.0.0.1:' + PORT + '/json')).json()).find((t) => t.type === 'page'); } catch (e) { /* pas encore prêt */ }
  }
  if (!cible) throw new Error('Le navigateur ne répond pas');
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const attente = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && attente.has(m.id)) { attente.get(m.id)(m); attente.delete(m.id); }
  });
  const envoyer = (method, params = {}) => new Promise((r) => { id += 1; attente.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const fermer = () => { ws.close(); proc.kill(); };
  return { envoyer, fermer };
}

async function main() {
  fs.mkdirSync(SORTIE, { recursive: true });
  const { envoyer, fermer } = await cdp();
  const js = async (code) => {
    const r = await envoyer('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception.description);
    return r.result.result.value;
  };
  const taille = (largeur, hauteur, mobile) => envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  const theme = (sombre) => envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: sombre ? 'dark' : 'light' }] });
  /* Repart d'une partie vierge, puis clique sur une suite de boutons (sélecteurs CSS) */
  const jouer = async (clics) => {
    await envoyer('Page.navigate', { url: URL_JEU });
    await pause(1500);
    await js('localStorage.clear(); location.reload(); true');
    await pause(2000);
    await js('document.fonts.ready.then(() => true)');
    for (const sel of clics) {
      await js(`(() => { const b = document.querySelector('${sel}'); if (!b) throw new Error('absent : ${sel}'); b.click(); return true; })()`);
      await pause(150);
    }
    await pause(400);
  };
  const capturer = async (nom, avant) => {
    if (avant) await js(avant);
    await pause(300);
    const r = await envoyer('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SORTIE, nom), Buffer.from(r.result.data, 'base64'));
    console.log(nom);
  };
  const choix = (i) => `[data-choix="${i}"]`;
  await envoyer('Page.enable');

  /* 1. Accueil, clair, grand écran */
  await taille(1280, 1000); await theme(false);
  await jouer([]);
  await capturer('accueil.png', 'window.scrollTo(0, 0); true');

  /* 2. Incident en cours, sombre : chapitre 1, on approuve la migration */
  await taille(1280, 860); await theme(true);
  await jouer(['[data-chap="0"]', choix(0)]);
  await capturer('incident.png', 'window.scrollTo(0, 0); true');

  /* 3. Les choix, sombre : le paragraphe de réécriture de la migration, en entier */
  await taille(1280, 1180);
  await jouer(['[data-chap="0"]', choix(1)]);
  await capturer('choix.png', 'window.scrollTo(0, 0); true');

  /* 4. Fin de chapitre, clair : migration en deux temps, runbook, alerte, samedi calme */
  await taille(1280, 860); await theme(false);
  await jouer(['[data-chap="0"]', choix(1), choix(0), choix(1), choix(0), choix(0), choix(0)]);
  await capturer('fin.png', "document.querySelector('.fin').scrollIntoView(); window.scrollBy(0, -24); true");

  /* 5. Téléphone, clair : début du chapitre 1 */
  await taille(390, 844, true);
  await jouer(['[data-chap="0"]']);
  await capturer('mobile.png', 'window.scrollTo(0, 0); true');

  fermer();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
