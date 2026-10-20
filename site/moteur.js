/* Moteur du livre-jeu : état, effets, enchaînement des chapitres, affichage.
   Le récit vit dans les fichiers chapitre-N.js, les outils communs dans commun.js. */
(function (racine) {
  'use strict';

  const LIVRE = racine.CHAPITRES.slice().sort((x, y) => x.numero - y.numero);
  const TOTAL = 12;
  const VERSION = 2;
  /* Entre deux chapitres, quelques semaines passent : les clients reviennent, on récupère */
  const TRANSITION = { prod: 3, energie: 2 };

  const JAUGES = [
    { k: 'prod', nom: 'PROD', max: 10, etat: (v) => (v >= 7 ? 'ok' : v >= 4 ? 'alerte' : 'crit') },
    { k: 'confiance', nom: 'CONFIANCE', max: 10, etat: (v) => (v >= 4 ? 'ok' : v >= 2 ? 'alerte' : 'crit') },
    { k: 'dette', nom: 'DETTE', max: 10, inverse: true, etat: (v) => (v <= 1 ? 'ok' : v <= 4 ? 'alerte' : 'crit') },
    { k: 'energie', nom: 'ÉNERGIE', max: 5, etat: (v) => (v >= 3 ? 'ok' : v === 2 ? 'alerte' : 'crit') },
  ];
  const INSTRUMENTS = ['LOGS', 'METRICS', 'TRACES'];

  /* ---------- Logique pure (utilisée aussi par outils/simuler.js) ---------- */

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const vide = () => ({ jauges: {}, plus: [], moins: [] });

  function feuilleNeuve() {
    return { prod: 10, confiance: 5, dette: 0, energie: 5, codes: [], instruments: [] };
  }

  function feuilleDe(s) {
    return clone({ prod: s.prod, confiance: s.confiance, dette: s.dette, energie: s.energie, codes: s.codes, instruments: s.instruments });
  }

  function etatNeuf() {
    return Object.assign({
      v: VERSION, ch: null, noeud: null, fin: null, perdu: false,
      horloge: null, f: {}, journal: [], deltas: [], depart: null,
    }, feuilleNeuve());
  }

  function appliquer(s, fx, d) {
    if (!fx) return;
    JAUGES.forEach((j) => {
      if (!fx[j.k]) return;
      const avant = s[j.k];
      s[j.k] = Math.max(0, Math.min(j.max, avant + fx[j.k]));
      d.jauges[j.k] = (d.jauges[j.k] || 0) + (s[j.k] - avant);
    });
    if (fx.horlogeFixe != null) s.horloge = fx.horlogeFixe;
    /* On n'ajoute des minutes que si un incident est en cours */
    if (fx.horloge && s.horloge != null) s.horloge += fx.horloge;
    if (fx.horlogeFin) s.horloge = null;
    (fx.codes || []).forEach((c) => { if (!s.codes.includes(c)) { s.codes.push(c); d.plus.push(c); } });
    (fx.retire || []).forEach((c) => {
      const i = s.codes.indexOf(c);
      if (i >= 0) { s.codes.splice(i, 1); d.moins.push(c); }
    });
    (fx.instruments || []).forEach((c) => { if (!s.instruments.includes(c)) { s.instruments.push(c); d.plus.push(c); } });
    if (fx.f) Object.assign(s.f, fx.f);
  }

  function resumer(d) {
    const liste = [];
    JAUGES.forEach((j) => {
      const v = d.jauges[j.k];
      if (!v) return;
      const bon = j.inverse ? v < 0 : v > 0;
      liste.push({ t: j.nom + ' ' + (v > 0 ? '+' : '-') + ' ' + Math.abs(v), ton: bon ? 'bon' : 'mauvais' });
    });
    d.plus.forEach((c) => liste.push({ t: '+ ' + c, ton: 'neutre' }));
    d.moins.forEach((c) => liste.push({ t: '- ' + c, ton: 'neutre' }));
    return liste;
  }

  function choixDe(s) {
    if (s.ch == null || s.fin || s.perdu) return [];
    const n = LIVRE[s.ch].noeuds[s.noeud];
    if (!n) return [];
    const liste = typeof n.choix === 'function' ? n.choix(s) : n.choix || [];
    return liste
      .filter((c) => !c.si || c.si(s))
      .map((c) => ({ c: c, raison: c.verrou ? c.verrou(s) : null }));
  }

  function entrer(s, id, d) {
    d = d || vide();
    const n = LIVRE[s.ch].noeuds[id];
    if (!n) throw new Error('Paragraphe inconnu : ' + id);
    s.noeud = id;
    if (n.entree) appliquer(s, n.entree(s), d);
    s.deltas = resumer(d);
    if (n.fin) s.fin = typeof n.fin === 'function' ? n.fin(s) : n.fin;
    if (s.prod <= 0) { s.perdu = true; s.fin = null; }
    return s;
  }

  /* Les effets du choix s'appliquent avant de calculer la destination : un aiguillage voit donc le choix qui vient d'être fait */
  function suivre(s, choix) {
    const d = vide();
    s.journal.push(choix.t);
    appliquer(s, choix.fx, d);
    const cible = typeof choix.vers === 'function' ? choix.vers(s) : choix.vers;
    return entrer(s, cible, d);
  }

  /* mode : 'neuf' (feuille vierge), 'suite' (on arrive du chapitre précédent), 'rejouer' (feuille du début de chapitre) */
  function ouvrir(s, index, mode) {
    const d = vide();
    if (mode === 'neuf') Object.assign(s, feuilleNeuve());
    if (mode === 'rejouer' && s.depart) Object.assign(s, clone(s.depart));
    s.ch = index;
    s.f = {};
    s.journal = [];
    s.horloge = null;
    s.fin = null;
    s.perdu = false;
    if (mode === 'suite') appliquer(s, LIVRE[index].transition || TRANSITION, d);
    s.depart = feuilleDe(s);
    return entrer(s, LIVRE[index].debut, d);
  }

  racine.MOTEUR = { LIVRE: LIVRE, etatNeuf: etatNeuf, ouvrir: ouvrir, suivre: suivre, choixDe: choixDe };

  if (typeof document === 'undefined') return;

  /* ---------- Affichage ---------- */

  const CLE = 'vendredi-1642';
  const app = document.getElementById('app');
  const large = window.matchMedia('(min-width: 56rem)');
  let s = etatNeuf();
  let fins = {};
  let vue = 'recit';
  let extraOuvert = null;
  let attente = null;
  let minuteur = null;

  function lire(cle) { try { return JSON.parse(localStorage.getItem(cle)); } catch (e) { return null; } }
  function ecrire(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  function sauver() { ecrire(CLE, s); ecrire(CLE + '-fins', fins); }

  const val = (x) => (typeof x === 'function' ? x(s) : x);
  const enCours = () => s.ch != null;
  const auSommaire = () => !enCours() || vue === 'sommaire';

  /* Espaces insécables de la typographie française, hors blocs de code */
  function typo(html) {
    return html.split(/(<pre[\s\S]*?<\/pre>)/).map((bout, i) => (i % 2 ? bout
      : bout.replace(/ ([:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0')
        .replace(/(\d) (\d{3})\b/g, '$1\u00a0$2')
        .replace(/(\d) h (\d)/g, '$1\u00a0h\u00a0$2'))).join('');
  }

  function jaugeHtml(j) {
    const v = s[j.k];
    let segs = '';
    for (let i = 0; i < j.max; i += 1) segs += '<span class="seg' + (i < v ? ' plein' : '') + '"></span>';
    return '<div class="jauge" data-etat="' + j.etat(v) + '" role="img" aria-label="' + j.nom + ' : ' + v + ' sur ' + j.max + '">'
      + '<p class="jauge-tete"><span class="nom">' + j.nom + '</span><span class="val">' + v + '</span></p>'
      + '<div class="barre">' + segs + '</div></div>';
  }

  function feuilleHtml() {
    const incident = s.horloge != null && !auSommaire();
    const ouvert = extraOuvert == null ? large.matches : extraOuvert;
    const instruments = INSTRUMENTS.map((i) => '<li class="' + (s.instruments.includes(i) ? 'coche' : '') + '">' + i + '</li>').join('');
    const codes = s.codes.length
      ? s.codes.map((c) => '<li>' + c + '</li>').join('')
      : '<li class="vide">aucun</li>';
    return '<aside class="feuille' + (incident ? ' incident' : '') + '" aria-label="Feuille d\'astreinte">'
      + '<h2>Feuille d\'astreinte</h2>'
      + '<div class="jauges">' + JAUGES.map(jaugeHtml).join('') + '</div>'
      + '<p class="horloge">' + (incident
        ? '<span class="point"></span>Incident : ' + s.horloge + ' min'
        : 'Aucun incident en cours') + '</p>'
      + '<details class="extra"' + (ouvert ? ' open' : '') + '><summary>Tools et flags</summary>'
      + '<p class="extra-titre">Tools</p><ul class="instruments">' + instruments + '</ul>'
      + '<p class="extra-titre">Flags</p><ul class="codes">' + codes + '</ul>'
      + '</details></aside>';
  }

  function deltasHtml() {
    if (!s.deltas.length) return '';
    return '<ul class="deltas" aria-label="Effets de ton choix">'
      + s.deltas.map((d) => '<li class="' + d.ton + '">' + d.t + '</li>').join('') + '</ul>';
  }

  function choixHtml() {
    let h = '<nav class="choix-liste" aria-label="Tes choix"><p class="choix-titre">Que fais-tu ?</p>';
    choixDe(s).forEach((x, i) => {
      if (x.raison) {
        h += '<div class="choix-bloc"><button type="button" class="choix" disabled>' + x.c.t + '</button>'
          + '<p class="raison">' + x.raison + '</p></div>';
      } else {
        h += '<button type="button" class="choix" data-choix="' + i + '">' + x.c.t + '</button>';
      }
    });
    return h + '</nav>';
  }

  function bilanHtml() {
    return '<ul class="bilan">'
      + JAUGES.map((j) => '<li><span>' + j.nom + '</span><span>' + s[j.k] + ' sur ' + j.max + '</span></li>').join('')
      + '<li><span>Tools</span><span>' + (s.instruments.join(', ') || 'aucun') + '</span></li>'
      + '<li><span>Flags</span><span>' + (s.codes.join(', ') || 'aucun') + '</span></li></ul>';
  }

  function journalHtml() {
    return '<h4>Tes décisions</h4><ol class="journal">' + s.journal.map((t) => '<li>' + t + '</li>').join('') + '</ol>';
  }

  function finHtml(C) {
    const F = C.fins[s.fin];
    const total = Object.keys(C.fins).length;
    const vues = (fins[C.id] || []).length;
    const suivant = LIVRE[s.ch + 1];
    return '<section class="fin">'
      + '<p class="fin-etiquette">Fin du chapitre ' + C.numero + '</p>'
      + '<h3>' + F.titre + '</h3>'
      + '<p>' + typo(val(F.texte)) + '</p>'
      + '<p class="fin-compte">Fins découvertes pour ce chapitre : ' + vues + ' sur ' + total + '</p>'
      + '<h4>' + (suivant ? 'Ce que tu emportes au chapitre suivant' : 'Ta feuille d\'astreinte, six mois plus tard') + '</h4>' + bilanHtml()
      + journalHtml()
      + '<div class="fin-actions">'
      + (suivant ? '<button type="button" class="bouton" data-action="suite">Chapitre ' + suivant.numero + ' : ' + suivant.titre + '</button>' : '')
      + '<button type="button" class="secondaire" data-action="rejouer">Rejouer ce chapitre</button>'
      + (suivant ? '' : '<button type="button" class="secondaire" data-action="sommaire">Retour au sommaire</button>')
      + '</div></section>';
  }

  function perduHtml() {
    return '<section class="fin">'
      + '<p class="fin-etiquette">PROD à zéro</p>'
      + '<h3>Écran noir</h3>'
      + '<p>' + typo('Les clients ne reviennent pas. Ils ont essayé une fois de trop, et un concurrent livrait le même panier sans page d\'erreur. Panier Vif n\'a plus de quoi payer la prochaine pub, ni ton poste.') + '</p>'
      + journalHtml()
      + '<div class="fin-actions">'
      + '<button type="button" class="bouton" data-action="rejouer">Rejouer ce chapitre</button>'
      + '<button type="button" class="secondaire" data-action="sommaire">Retour au sommaire</button>'
      + '</div></section>';
  }

  function passageHtml() {
    const C = LIVRE[s.ch];
    const n = C.noeuds[s.noeud];
    const incident = s.horloge != null;
    return '<article class="passage' + (incident ? ' incident' : '') + '">'
      + '<header class="quand"><p class="jour">' + (val(n.jour) || val(C.jour) || '') + '</p>'
      + '<h2 id="titre" tabindex="-1">' + typo(String(val(n.heure))) + '</h2>'
      + (incident ? '<p class="chrono">Incident en cours depuis ' + s.horloge + ' min</p>' : '')
      + '</header>'
      + deltasHtml()
      + '<div class="texte">' + typo(n.texte(s)) + '</div>'
      + (s.perdu ? perduHtml() : s.fin ? finHtml(C) : choixHtml())
      + '</article>';
  }

  function sommaireHtml() {
    let h = '<article class="passage accueil">'
      + '<header class="quand"><p class="jour">Un livre dont vous êtes le héros</p>'
      + '<h2 id="titre" tabindex="-1">16 h 42</h2>'
      + '<p class="chrono calme">DevOps, ' + TOTAL + ' chapitres</p></header>'
      + '<div class="texte">' + typo(racine.RECIT.intro) + '</div>'
      + '<nav class="choix-liste">'
      + (enCours()
        ? '<button type="button" class="bouton" data-action="reprendre">Reprendre le chapitre ' + LIVRE[s.ch].numero + '</button>'
        : '<button type="button" class="bouton" data-chap="0">Commencer</button>')
      + '</nav>'
      + '<nav class="choix-liste sommaire" aria-label="Sommaire"><p class="choix-titre">Sommaire</p>';
    LIVRE.forEach((C, i) => {
      const vues = (fins[C.id] || []).length;
      const total = Object.keys(C.fins).length;
      const libelle = attente === i
        ? 'Confirmer : la partie en cours sera remplacée'
        : C.numero + '. ' + C.titre;
      h += '<button type="button" class="choix" data-chap="' + i + '"><span>' + libelle + '</span>'
        + '<span class="techno">' + C.techno + (vues ? ' · fins ' + vues + '/' + total : '') + '</span></button>';
    });
    h += '</nav><p class="note">' + typo('Commencer par un autre chapitre que le premier te donne une feuille d\'astreinte vierge : aucune conséquence des chapitres précédents.') + '</p></article>';
    return h;
  }

  function rendre(deplacer) {
    const C = enCours() ? LIVRE[s.ch] : null;
    const sommaire = auSommaire();
    app.innerHTML = '<header class="entete">'
      + '<h1 class="marque">Vendredi, 16 h 42</h1>'
      + '<p class="chapitre">' + (sommaire ? 'Sommaire' : 'Chapitre ' + C.numero + ' · ' + C.titre) + '</p>'
      + (sommaire ? '' : '<button type="button" class="discret" data-action="sommaire">Sommaire</button>')
      + '</header>'
      + '<div class="plan">' + feuilleHtml()
      + '<main class="recit">' + (sommaire ? sommaireHtml() : passageHtml()) + '</main></div>'
      + '<footer class="pied">' + (sommaire ? LIVRE.length + ' chapitres jouables sur ' + TOTAL : 'Chapitre ' + C.numero + ' sur ' + TOTAL) + '</footer>';
    const extra = app.querySelector('.extra');
    extra.addEventListener('toggle', () => { extraOuvert = extra.open; });
    if (deplacer) {
      window.scrollTo(0, 0);
      const titre = document.getElementById('titre');
      if (titre) titre.focus({ preventScroll: true });
    }
  }

  function apres() {
    attente = null;
    vue = 'recit';
    if (s.fin) {
      const id = LIVRE[s.ch].id;
      fins[id] = fins[id] || [];
      if (!fins[id].includes(s.fin)) fins[id].push(s.fin);
    }
    sauver();
    rendre(true);
  }

  app.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.choix != null) {
      const x = choixDe(s)[Number(b.dataset.choix)];
      if (x && !x.raison) { suivre(s, x.c); apres(); }
      return;
    }
    if (b.dataset.chap != null) {
      const index = Number(b.dataset.chap);
      if (enCours() && attente !== index) {
        attente = index;
        rendre(false);
        clearTimeout(minuteur);
        minuteur = setTimeout(() => { attente = null; if (auSommaire()) rendre(false); }, 5000);
        return;
      }
      clearTimeout(minuteur);
      s = etatNeuf();
      ouvrir(s, index, 'neuf');
      apres();
      return;
    }
    const action = b.dataset.action;
    if (action === 'sommaire') { vue = 'sommaire'; attente = null; rendre(true); }
    if (action === 'reprendre') { vue = 'recit'; rendre(true); }
    if (action === 'suite') { ouvrir(s, s.ch + 1, 'suite'); apres(); }
    if (action === 'rejouer') { ouvrir(s, s.ch, 'rejouer'); apres(); }
  });

  function demarrer(donnees) {
    const repris = (donnees && donnees.s) || lire(CLE);
    const valide = repris && repris.v === VERSION
      && (repris.ch == null || (LIVRE[repris.ch] && LIVRE[repris.ch].noeuds[repris.noeud]));
    if (valide) s = repris;
    fins = (donnees && donnees.fins) || lire(CLE + '-fins') || {};
    if (Array.isArray(fins)) fins = {};
    document.documentElement.lang = 'fr';
    rendre(false);
  }

  const chaud = racine.claude && racine.claude.hot;
  if (chaud && chaud.snapshot) chaud.snapshot(() => ({ s: s, fins: fins }));
  if (chaud && chaud.ready) chaud.ready(demarrer); else demarrer((chaud && chaud.data) || {});
})(typeof window !== 'undefined' ? window : globalThis);
