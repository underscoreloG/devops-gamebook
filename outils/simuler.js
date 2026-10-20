/* Parcourt tous les chemins de chaque chapitre et vérifie le graphe.
   Usage : node outils/simuler.js [numéro de chapitre]
   Chaque chapitre est joué depuis une feuille vierge, puis depuis les feuilles déclarées dans son champ "essais". */
'use strict';
const fs = require('fs');
const path = require('path');

const site = path.join(__dirname, '..', 'site');
require(path.join(site, 'commun.js'));
fs.readdirSync(site).filter((f) => /^chapitre-\d+\.js$/.test(f)).forEach((f) => require(path.join(site, f)));
require(path.join(site, 'moteur.js'));

const M = globalThis.MOTEUR;
const seul = process.argv[2] ? Number(process.argv[2]) : null;
const LIMITE = 400000;
let echec = false;

M.LIVRE.forEach((C, index) => {
  if (seul && C.numero !== seul) return;
  const vus = new Set();
  const fins = {};
  const verrous = {};
  const erreurs = new Set();
  const bornes = {};
  let chemins = 0;
  let perdus = 0;

  const noter = (cle, v) => {
    if (!bornes[cle]) bornes[cle] = [v, v];
    bornes[cle][0] = Math.min(bornes[cle][0], v);
    bornes[cle][1] = Math.max(bornes[cle][1], v);
  };

  function explorer(s, profondeur) {
    if (chemins > LIMITE) return;
    vus.add(s.noeud);
    if (profondeur > 80) { erreurs.add('Boucle probable vers ' + s.noeud); return; }
    try {
      const n = C.noeuds[s.noeud];
      n.texte(s);
      if (typeof n.heure === 'function') n.heure(s);
      if (n.heure == null) erreurs.add('Heure manquante : ' + s.noeud);
    } catch (e) { erreurs.add('Texte en erreur dans ' + s.noeud + ' : ' + e.message); }
    if (s.perdu) { chemins += 1; perdus += 1; return; }
    if (s.fin) {
      chemins += 1;
      if (!C.fins[s.fin]) erreurs.add('Fin inconnue : ' + s.fin);
      fins[s.fin] = (fins[s.fin] || 0) + 1;
      ['prod', 'confiance', 'dette', 'energie'].forEach((k) => noter(k, s[k]));
      return;
    }
    const liste = M.choixDe(s);
    if (!liste.some((x) => !x.raison)) { erreurs.add('Impasse : ' + s.noeud); return; }
    liste.forEach((x) => {
      if (x.raison) { verrous[s.noeud] = (verrous[s.noeud] || 0) + 1; return; }
      const copie = JSON.parse(JSON.stringify(s));
      try { M.suivre(copie, x.c); } catch (e) { erreurs.add(s.noeud + ' -> ' + e.message); return; }
      explorer(copie, profondeur + 1);
    });
  }

  [{}].concat(C.essais || []).forEach((feuille) => {
    const s = M.etatNeuf();
    Object.assign(s, JSON.parse(JSON.stringify(feuille)));
    s.depart = JSON.parse(JSON.stringify({ prod: s.prod, confiance: s.confiance, dette: s.dette, energie: s.energie, codes: s.codes, instruments: s.instruments }));
    M.ouvrir(s, index, 'rejouer');
    explorer(s, 0);
  });

  const orphelins = Object.keys(C.noeuds).filter((id) => !vus.has(id));
  const finsJamais = Object.keys(C.fins).filter((id) => !fins[id]);
  const ok = !erreurs.size && !orphelins.length && !finsJamais.length && chemins <= LIMITE;
  if (!ok) echec = true;

  console.log((ok ? 'OK ' : 'KO ') + 'Chapitre ' + C.numero + ' : ' + C.titre
    + ' | ' + Object.keys(C.noeuds).length + ' paragraphes, ' + chemins + ' chemins, ' + perdus + ' écrans noirs');
  console.log('   fins ' + JSON.stringify(fins) + ' | jauges ' + JSON.stringify(bornes) + ' | verrous ' + JSON.stringify(verrous));
  if (orphelins.length) console.log('   INATTEIGNABLES : ' + orphelins.join(', '));
  if (finsJamais.length) console.log('   FINS INATTEIGNABLES : ' + finsJamais.join(', '));
  if (chemins > LIMITE) console.log('   TROP DE CHEMINS : graphe à simplifier');
  erreurs.forEach((e) => console.log('   ERREUR : ' + e));
});

process.exit(echec ? 1 : 0);
