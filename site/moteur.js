/* Moteur du livre-jeu : état, effets, enchaînement des chapitres, affichage, langue.
   Le récit vit dans les fichiers de chapitres (site/chapitre-N.js en français, site/en/chapter-N.js en anglais),
   les outils communs dans commun.js. Les deux langues partagent le même état : on peut changer de langue en cours de partie. */
(function (racine) {
  'use strict';

  const trier = (liste) => liste.slice().sort((x, y) => x.numero - y.numero);
  const LIVRES = { fr: trier(racine.CHAPITRES.fr), en: trier(racine.CHAPITRES.en) };
  const LANGUES = ['en', 'fr'].filter((l) => LIVRES[l].length);
  const TOTAL = 12;
  const VERSION = 3;
  /* Entre deux chapitres, quelques semaines passent : les clients reviennent, on récupère */
  const TRANSITION = { prod: 3, energie: 2 };

  let langue = LANGUES[0];
  const LIVRE = () => LIVRES[langue];

  const JAUGES = [
    { k: 'prod', nom: { fr: 'PROD', en: 'PROD' }, max: 10, etat: (v) => (v >= 7 ? 'ok' : v >= 4 ? 'alerte' : 'crit') },
    { k: 'confiance', nom: { fr: 'CONFIANCE', en: 'TRUST' }, max: 10, etat: (v) => (v >= 4 ? 'ok' : v >= 2 ? 'alerte' : 'crit') },
    { k: 'dette', nom: { fr: 'DETTE', en: 'DEBT' }, max: 10, inverse: true, etat: (v) => (v <= 1 ? 'ok' : v <= 4 ? 'alerte' : 'crit') },
    { k: 'energie', nom: { fr: 'ÉNERGIE', en: 'ENERGY' }, max: 5, etat: (v) => (v >= 3 ? 'ok' : v === 2 ? 'alerte' : 'crit') },
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

  /* Les effets sont gardés sous forme de données, pour être affichés dans la langue du moment */
  function resumer(d) {
    const liste = [];
    JAUGES.forEach((j) => { if (d.jauges[j.k]) liste.push({ k: j.k, v: d.jauges[j.k] }); });
    d.plus.forEach((c) => liste.push({ c: c, plus: true }));
    d.moins.forEach((c) => liste.push({ c: c, plus: false }));
    return liste;
  }

  const brute = (n, s) => (typeof n.choix === 'function' ? n.choix(s) : n.choix || []);

  function choixDe(s) {
    if (s.ch == null || s.fin || s.perdu) return [];
    const n = LIVRE()[s.ch].noeuds[s.noeud];
    if (!n) return [];
    return brute(n, s)
      .map((c, rang) => ({ c: c, rang: rang }))
      .filter((x) => !x.c.si || x.c.si(s))
      .map((x) => ({ c: x.c, rang: x.rang, raison: x.c.verrou ? x.c.verrou(s) : null }));
  }

  /* Le libellé d'un choix dans chaque langue disponible, pour que le journal suive un changement de langue */
  function libelles(s, rang) {
    const sortie = {};
    LANGUES.forEach((l) => {
      const C = LIVRES[l][s.ch];
      const n = C && C.noeuds[s.noeud];
      const c = n && brute(n, s)[rang];
      if (c) sortie[l] = c.t;
    });
    return sortie;
  }

  function entrer(s, id, d) {
    d = d || vide();
    const n = LIVRE()[s.ch].noeuds[id];
    if (!n) throw new Error('Paragraphe inconnu : ' + id);
    s.noeud = id;
    if (n.entree) appliquer(s, n.entree(s), d);
    s.deltas = resumer(d);
    if (n.fin) s.fin = typeof n.fin === 'function' ? n.fin(s) : n.fin;
    if (s.prod <= 0) { s.perdu = true; s.fin = null; }
    return s;
  }

  /* Les effets du choix s'appliquent avant de calculer la destination : un aiguillage voit donc le choix qui vient d'être fait */
  function suivre(s, x) {
    const d = vide();
    s.journal.push(libelles(s, x.rang));
    appliquer(s, x.c.fx, d);
    const cible = typeof x.c.vers === 'function' ? x.c.vers(s) : x.c.vers;
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
    if (mode === 'suite') appliquer(s, LIVRE()[index].transition || TRANSITION, d);
    s.depart = feuilleDe(s);
    return entrer(s, LIVRE()[index].debut, d);
  }

  racine.MOTEUR = {
    LIVRES: LIVRES,
    get LIVRE() { return LIVRE(); },
    langue: (l) => { if (l) langue = l; return langue; },
    etatNeuf: etatNeuf,
    ouvrir: ouvrir,
    suivre: suivre,
    choixDe: choixDe,
  };

  if (typeof document === 'undefined') return;

  /* ---------- Textes de l'interface ---------- */

  const UI = {
    fr: {
      titre: 'Vendredi, 16 h 42',
      langue: 'Langue',
      sommaire: 'Sommaire',
      chapitre: (n, t) => 'Chapitre ' + n + ' · ' + t,
      feuille: 'Feuille d\'astreinte',
      calme: 'Aucun incident en cours',
      incident: (m) => 'Incident : ' + m + ' min',
      chrono: (m) => 'Incident en cours depuis ' + m + ' min',
      extra: 'Tools et flags',
      aucun: 'aucun',
      effets: 'Effets de ton choix',
      tesChoix: 'Tes choix',
      queFaire: 'Que fais-tu ?',
      sur: (v, m) => v + ' sur ' + m,
      decisions: 'Tes décisions',
      finChapitre: (n) => 'Fin du chapitre ' + n,
      finsVues: (a, b) => 'Fins découvertes pour ce chapitre : ' + a + ' sur ' + b,
      emportes: 'Ce que tu emportes au chapitre suivant',
      sixMois: 'Ta feuille d\'astreinte, six mois plus tard',
      chapitreSuivant: (n, t) => 'Chapitre ' + n + ' : ' + t,
      rejouer: 'Rejouer ce chapitre',
      retour: 'Retour au sommaire',
      perduEtiquette: 'PROD à zéro',
      perduTitre: 'Écran noir',
      perduTexte: 'Les clients ne reviennent pas. Ils ont essayé une fois de trop, et un concurrent livrait le même panier sans page d\'erreur. Panier Vif n\'a plus de quoi payer la prochaine pub, ni ton poste.',
      genre: 'Un livre dont vous êtes le héros',
      heroHeure: '16 h 42',
      sousTitre: 'DevOps, ' + TOTAL + ' chapitres',
      reprendre: (n) => 'Reprendre le chapitre ' + n,
      commencer: 'Commencer',
      confirmer: 'Confirmer : la partie en cours sera remplacée',
      finsCourt: (a, b) => 'fins ' + a + '/' + b,
      note: 'Commencer par un autre chapitre que le premier te donne une feuille d\'astreinte vierge : aucune conséquence des chapitres précédents.',
      piedSommaire: (n) => n + ' chapitres jouables sur ' + TOTAL,
      piedChapitre: (n) => 'Chapitre ' + n + ' sur ' + TOTAL,
      intro: () => racine.RECIT.intro,
    },
    en: {
      titre: 'Friday, 4:42 PM',
      langue: 'Language',
      sommaire: 'Contents',
      chapitre: (n, t) => 'Chapter ' + n + ' · ' + t,
      feuille: 'On-call sheet',
      calme: 'No incident in progress',
      incident: (m) => 'Incident: ' + m + ' min',
      chrono: (m) => 'Incident in progress for ' + m + ' min',
      extra: 'Tools and flags',
      aucun: 'none',
      effets: 'Effects of your choice',
      tesChoix: 'Your choices',
      queFaire: 'What do you do?',
      sur: (v, m) => v + ' of ' + m,
      decisions: 'Your decisions',
      finChapitre: (n) => 'End of chapter ' + n,
      finsVues: (a, b) => 'Endings found for this chapter: ' + a + ' of ' + b,
      emportes: 'What you carry into the next chapter',
      sixMois: 'Your on-call sheet, six months later',
      chapitreSuivant: (n, t) => 'Chapter ' + n + ': ' + t,
      rejouer: 'Replay this chapter',
      retour: 'Back to contents',
      perduEtiquette: 'PROD at zero',
      perduTitre: 'Blackout',
      perduTexte: 'The customers do not come back. They tried one time too many, and a competitor delivered the same basket without an error page. Panier Vif can no longer pay for the next ad, or for your job.',
      genre: 'A choose-your-own-adventure book',
      heroHeure: '4:42 PM',
      sousTitre: 'DevOps, ' + TOTAL + ' chapters',
      reprendre: (n) => 'Resume chapter ' + n,
      commencer: 'Start',
      confirmer: 'Confirm: this replaces your current game',
      finsCourt: (a, b) => 'endings ' + a + '/' + b,
      note: 'Starting from a chapter other than the first gives you a blank on-call sheet: no consequences from earlier chapters.',
      piedSommaire: (n) => n + ' of ' + TOTAL + ' chapters playable',
      piedChapitre: (n) => 'Chapter ' + n + ' of ' + TOTAL,
      intro: () => racine.RECIT_EN.intro,
    },
  };
  const T = () => UI[langue];

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

  /* Espaces insécables de la typographie française, hors blocs de code. L'anglais n'en a pas besoin. */
  function typo(html) {
    if (langue !== 'fr') return html;
    return html.split(/(<pre[\s\S]*?<\/pre>)/).map((bout, i) => (i % 2 ? bout
      : bout.replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« ')
        .replace(/(\d) (\d{3})\b/g, '$1 $2')
        .replace(/(\d) h (\d)/g, '$1 h $2'))).join('');
  }

  const libelle = (entree) => (typeof entree === 'string' ? entree : entree[langue] || entree.fr || entree.en || '');

  function jaugeHtml(j) {
    const v = s[j.k];
    const nom = j.nom[langue];
    let segs = '';
    for (let i = 0; i < j.max; i += 1) segs += '<span class="seg' + (i < v ? ' plein' : '') + '"></span>';
    return '<div class="jauge" data-etat="' + j.etat(v) + '" role="img" aria-label="' + nom + ' : ' + T().sur(v, j.max) + '">'
      + '<p class="jauge-tete"><span class="nom">' + nom + '</span><span class="val">' + v + '</span></p>'
      + '<div class="barre">' + segs + '</div></div>';
  }

  function feuilleHtml() {
    const incident = s.horloge != null && !auSommaire();
    const ouvert = extraOuvert == null ? large.matches : extraOuvert;
    const instruments = INSTRUMENTS.map((i) => '<li class="' + (s.instruments.includes(i) ? 'coche' : '') + '">' + i + '</li>').join('');
    const codes = s.codes.length
      ? s.codes.map((c) => '<li>' + c + '</li>').join('')
      : '<li class="vide">' + T().aucun + '</li>';
    return '<aside class="feuille' + (incident ? ' incident' : '') + '" aria-label="' + T().feuille + '">'
      + '<h2>' + T().feuille + '</h2>'
      + '<div class="jauges">' + JAUGES.map(jaugeHtml).join('') + '</div>'
      + '<p class="horloge">' + (incident
        ? '<span class="point"></span>' + T().incident(s.horloge)
        : T().calme) + '</p>'
      + '<details class="extra"' + (ouvert ? ' open' : '') + '><summary>' + T().extra + '</summary>'
      + '<p class="extra-titre">Tools</p><ul class="instruments">' + instruments + '</ul>'
      + '<p class="extra-titre">Flags</p><ul class="codes">' + codes + '</ul>'
      + '</details></aside>';
  }

  function deltasHtml() {
    if (!s.deltas.length) return '';
    return '<ul class="deltas" aria-label="' + T().effets + '">'
      + s.deltas.map((d) => {
        if (d.c) return '<li class="neutre">' + (d.plus ? '+ ' : '- ') + d.c + '</li>';
        const j = JAUGES.find((x) => x.k === d.k);
        const bon = j.inverse ? d.v < 0 : d.v > 0;
        return '<li class="' + (bon ? 'bon' : 'mauvais') + '">' + j.nom[langue] + ' ' + (d.v > 0 ? '+' : '-') + ' ' + Math.abs(d.v) + '</li>';
      }).join('') + '</ul>';
  }

  function choixHtml() {
    let h = '<nav class="choix-liste" aria-label="' + T().tesChoix + '"><p class="choix-titre">' + T().queFaire + '</p>';
    choixDe(s).forEach((x, i) => {
      if (x.raison) {
        h += '<div class="choix-bloc"><button type="button" class="choix" disabled>' + typo(x.c.t) + '</button>'
          + '<p class="raison">' + typo(x.raison) + '</p></div>';
      } else {
        h += '<button type="button" class="choix" data-choix="' + i + '">' + typo(x.c.t) + '</button>';
      }
    });
    return h + '</nav>';
  }

  function bilanHtml() {
    return '<ul class="bilan">'
      + JAUGES.map((j) => '<li><span>' + j.nom[langue] + '</span><span>' + T().sur(s[j.k], j.max) + '</span></li>').join('')
      + '<li><span>Tools</span><span>' + (s.instruments.join(', ') || T().aucun) + '</span></li>'
      + '<li><span>Flags</span><span>' + (s.codes.join(', ') || T().aucun) + '</span></li></ul>';
  }

  function journalHtml() {
    return '<h4>' + T().decisions + '</h4><ol class="journal">' + s.journal.map((t) => '<li>' + typo(libelle(t)) + '</li>').join('') + '</ol>';
  }

  function finHtml(C) {
    const F = C.fins[s.fin];
    const total = Object.keys(C.fins).length;
    const vues = (fins[C.id] || []).length;
    const suivant = LIVRE()[s.ch + 1];
    return '<section class="fin">'
      + '<p class="fin-etiquette">' + T().finChapitre(C.numero) + '</p>'
      + '<h3>' + typo(F.titre) + '</h3>'
      + '<p>' + typo(val(F.texte)) + '</p>'
      + '<p class="fin-compte">' + T().finsVues(vues, total) + '</p>'
      + '<h4>' + (suivant ? T().emportes : T().sixMois) + '</h4>' + bilanHtml()
      + journalHtml()
      + '<div class="fin-actions">'
      + (suivant ? '<button type="button" class="bouton" data-action="suite">' + typo(T().chapitreSuivant(suivant.numero, suivant.titre)) + '</button>' : '')
      + '<button type="button" class="secondaire" data-action="rejouer">' + T().rejouer + '</button>'
      + (suivant ? '' : '<button type="button" class="secondaire" data-action="sommaire">' + T().retour + '</button>')
      + '</div></section>';
  }

  function perduHtml() {
    return '<section class="fin">'
      + '<p class="fin-etiquette">' + T().perduEtiquette + '</p>'
      + '<h3>' + T().perduTitre + '</h3>'
      + '<p>' + typo(T().perduTexte) + '</p>'
      + journalHtml()
      + '<div class="fin-actions">'
      + '<button type="button" class="bouton" data-action="rejouer">' + T().rejouer + '</button>'
      + '<button type="button" class="secondaire" data-action="sommaire">' + T().retour + '</button>'
      + '</div></section>';
  }

  function passageHtml() {
    const C = LIVRE()[s.ch];
    const n = C.noeuds[s.noeud];
    const incident = s.horloge != null;
    return '<article class="passage' + (incident ? ' incident' : '') + '">'
      + '<header class="quand"><p class="jour">' + (val(n.jour) || val(C.jour) || '') + '</p>'
      + '<h2 id="titre" tabindex="-1">' + typo(String(val(n.heure))) + '</h2>'
      + (incident ? '<p class="chrono">' + T().chrono(s.horloge) + '</p>' : '')
      + '</header>'
      + deltasHtml()
      + '<div class="texte">' + typo(n.texte(s)) + '</div>'
      + (s.perdu ? perduHtml() : s.fin ? finHtml(C) : choixHtml())
      + '</article>';
  }

  function sommaireHtml() {
    let h = '<article class="passage accueil">'
      + '<header class="quand"><p class="jour">' + T().genre + '</p>'
      + '<h2 id="titre" tabindex="-1">' + typo(T().heroHeure) + '</h2>'
      + '<p class="chrono calme">' + T().sousTitre + '</p></header>'
      + '<div class="texte">' + typo(T().intro()) + '</div>'
      + '<nav class="choix-liste">'
      + (enCours()
        ? '<button type="button" class="bouton" data-action="reprendre">' + T().reprendre(LIVRE()[s.ch].numero) + '</button>'
        : '<button type="button" class="bouton" data-chap="0">' + T().commencer + '</button>')
      + '</nav>'
      + '<nav class="choix-liste sommaire" aria-label="' + T().sommaire + '"><p class="choix-titre">' + T().sommaire + '</p>';
    LIVRE().forEach((C, i) => {
      const vues = (fins[C.id] || []).length;
      const total = Object.keys(C.fins).length;
      const titre = attente === i ? T().confirmer : C.numero + '. ' + C.titre;
      h += '<button type="button" class="choix" data-chap="' + i + '"><span>' + typo(titre) + '</span>'
        + '<span class="techno">' + C.techno + (vues ? ' · ' + T().finsCourt(vues, total) : '') + '</span></button>';
    });
    h += '</nav><p class="note">' + typo(T().note) + '</p></article>';
    return h;
  }

  function langueHtml() {
    if (LANGUES.length < 2) return '';
    return '<div class="langues" role="group" aria-label="' + T().langue + '">'
      + LANGUES.map((l) => '<button type="button" class="langue" data-langue="' + l + '" aria-pressed="' + (l === langue) + '" lang="' + l + '">' + l.toUpperCase() + '</button>').join('')
      + '</div>';
  }

  function rendre(deplacer) {
    const C = enCours() ? LIVRE()[s.ch] : null;
    const sommaire = auSommaire();
    document.documentElement.lang = langue;
    document.title = T().titre;
    app.innerHTML = '<header class="entete">'
      + '<h1 class="marque">' + typo(T().titre) + '</h1>'
      + '<p class="chapitre">' + (sommaire ? T().sommaire : typo(T().chapitre(C.numero, C.titre))) + '</p>'
      + '<div class="entete-actions">'
      + (sommaire ? '' : '<button type="button" class="discret" data-action="sommaire">' + T().sommaire + '</button>')
      + langueHtml()
      + '</div></header>'
      + '<div class="plan">' + feuilleHtml()
      + '<main class="recit">' + (sommaire ? sommaireHtml() : passageHtml()) + '</main></div>'
      + '<footer class="pied">' + (sommaire ? T().piedSommaire(LIVRE().length) : T().piedChapitre(C.numero)) + '</footer>';
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
      const id = LIVRE()[s.ch].id;
      fins[id] = fins[id] || [];
      if (!fins[id].includes(s.fin)) fins[id].push(s.fin);
    }
    sauver();
    rendre(true);
  }

  app.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.langue) {
      langue = b.dataset.langue;
      ecrire(CLE + '-langue', langue);
      rendre(false);
      return;
    }
    if (b.dataset.choix != null) {
      const x = choixDe(s)[Number(b.dataset.choix)];
      if (x && !x.raison) { suivre(s, x); apres(); }
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
    const prefere = (donnees && donnees.langue) || lire(CLE + '-langue');
    if (LANGUES.includes(prefere)) langue = prefere;
    const repris = (donnees && donnees.s) || lire(CLE);
    const valide = repris && repris.v === VERSION
      && (repris.ch == null || (LIVRE()[repris.ch] && LIVRE()[repris.ch].noeuds[repris.noeud]));
    if (valide) s = repris;
    fins = (donnees && donnees.fins) || lire(CLE + '-fins') || {};
    if (Array.isArray(fins)) fins = {};
    rendre(false);
  }

  const chaud = racine.claude && racine.claude.hot;
  if (chaud && chaud.snapshot) chaud.snapshot(() => ({ s: s, fins: fins, langue: langue }));
  if (chaud && chaud.ready) chaud.ready(demarrer); else demarrer((chaud && chaud.data) || {});
})(typeof window !== 'undefined' ? window : globalThis);
