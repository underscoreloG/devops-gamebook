/* Parcourt tous les chemins de chaque chapitre, dans chaque langue, et vérifie le graphe.
   Usage : node outils/simuler.js [numéro de chapitre]
   Chaque chapitre est joué depuis une feuille vierge, puis depuis les feuilles déclarées dans son champ "essais".
   Si un chapitre existe en français et en anglais, les deux versions doivent produire exactement les mêmes chemins. */
'use strict';
const fs = require('fs');
const path = require('path');

const site = path.join(__dirname, '..', 'site');
const charger = (dossier, motif) => {
  if (!fs.existsSync(dossier)) return;
  fs.readdirSync(dossier).filter((f) => motif.test(f)).forEach((f) => require(path.join(dossier, f)));
};
require(path.join(site, 'commun.js'));
charger(site, /^chapitre-\d+\.js$/);
charger(path.join(site, 'en'), /^chapter-\d+\.js$/);
require(path.join(site, 'moteur.js'));

const M = globalThis.MOTEUR;
const seul = process.argv[2] ? Number(process.argv[2]) : null;
const LIMITE = 400000;
const TIRETS = /[–—]/;
let echec = false;

function simuler(langue, index) {
  M.langue(langue);
  const C = M.LIVRES[langue][index];
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
  const verifierTexte = (ou, t) => {
    if (typeof t === 'string' && TIRETS.test(t)) erreurs.add('Tiret long ou demi-cadratin dans ' + ou);
  };

  function explorer(s, profondeur) {
    if (chemins > LIMITE) return;
    vus.add(s.noeud);
    if (profondeur > 80) { erreurs.add('Boucle probable vers ' + s.noeud); return; }
    try {
      const n = C.noeuds[s.noeud];
      verifierTexte(s.noeud, n.texte(s));
      const h = typeof n.heure === 'function' ? n.heure(s) : n.heure;
      if (h == null) erreurs.add('Heure manquante : ' + s.noeud);
      verifierTexte(s.noeud + ' (heure)', h);
    } catch (e) { erreurs.add('Texte en erreur dans ' + s.noeud + ' : ' + e.message); }
    if (s.perdu) { chemins += 1; perdus += 1; return; }
    if (s.fin) {
      chemins += 1;
      const F = C.fins[s.fin];
      if (!F) erreurs.add('Fin inconnue : ' + s.fin);
      else {
        try { verifierTexte('fin ' + s.fin, typeof F.texte === 'function' ? F.texte(s) : F.texte); } catch (e) { erreurs.add('Fin en erreur ' + s.fin + ' : ' + e.message); }
      }
      fins[s.fin] = (fins[s.fin] || 0) + 1;
      ['prod', 'confiance', 'dette', 'energie'].forEach((k) => noter(k, s[k]));
      return;
    }
    const liste = M.choixDe(s);
    if (!liste.some((x) => !x.raison)) { erreurs.add('Impasse : ' + s.noeud); return; }
    liste.forEach((x) => {
      verifierTexte(s.noeud + ' (choix)', x.c.t);
      if (x.raison) { verrous[s.noeud] = (verrous[s.noeud] || 0) + 1; verifierTexte(s.noeud + ' (verrou)', x.raison); return; }
      const copie = JSON.parse(JSON.stringify(s));
      try { M.suivre(copie, x); } catch (e) { erreurs.add(s.noeud + ' -> ' + e.message); return; }
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

  console.log((ok ? 'OK ' : 'KO ') + langue.toUpperCase() + ' ' + C.numero + '. ' + C.titre
    + ' | ' + Object.keys(C.noeuds).length + ' paragraphes, ' + chemins + ' chemins, ' + perdus + ' écrans noirs');
  console.log('   fins ' + JSON.stringify(fins) + ' | jauges ' + JSON.stringify(bornes) + ' | verrous ' + JSON.stringify(verrous));
  if (orphelins.length) console.log('   INATTEIGNABLES : ' + orphelins.join(', '));
  if (finsJamais.length) console.log('   FINS INATTEIGNABLES : ' + finsJamais.join(', '));
  if (chemins > LIMITE) console.log('   TROP DE CHEMINS : graphe à simplifier');
  erreurs.forEach((e) => console.log('   ERREUR : ' + e));

  return JSON.stringify({
    noeuds: Object.keys(C.noeuds).sort(), fins: Object.keys(C.fins).sort(), id: C.id, debut: C.debut,
    chemins, perdus, parFin: fins, bornes, verrous,
  });
}

const numeros = new Set();
['fr', 'en'].forEach((l) => M.LIVRES[l].forEach((C) => numeros.add(C.numero)));

[...numeros].sort((a, b) => a - b).forEach((numero) => {
  if (seul && numero !== seul) return;
  const signatures = {};
  ['fr', 'en'].forEach((l) => {
    const index = M.LIVRES[l].findIndex((C) => C.numero === numero);
    if (index >= 0) signatures[l] = simuler(l, index);
  });
  if (signatures.fr && signatures.en) {
    if (signatures.fr === signatures.en) console.log('   PARITÉ FR/EN : identique');
    else { echec = true; console.log('   PARITÉ FR/EN : DIFFÉRENTE\n     fr ' + signatures.fr + '\n     en ' + signatures.en); }
  } else {
    console.log('   PARITÉ FR/EN : ' + (signatures.fr ? 'version anglaise absente' : 'version française absente'));
  }
});

process.exit(echec ? 1 : 0);
