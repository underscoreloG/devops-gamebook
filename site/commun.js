/* Outils partagés par tous les chapitres, en français (RECIT) et en anglais (RECIT_EN).
   À charger avant les fichiers de chapitres. */
(function (racine) {
  'use strict';

  const ech = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  /* Bloc de code : le texte est échappé, les retours à la ligne de début et de fin sont retirés */
  const code = (t) => '<pre class="code"><code>' + ech(t.replace(/^\n/, '').replace(/\s+$/, '')) + '</code></pre>';
  const capot = (titre) => (html) => '<aside class="capot"><p class="capot-titre">' + titre + '</p><p>' + html + '</p></aside>';
  const msg = (html) => '<blockquote class="msg">' + html + '</blockquote>';
  /* Le lecteur a-t-il ce flag, ce tool ? */
  const a = (s, c) => s.codes.includes(c);
  const outil = (s, x) => s.instruments.includes(x);

  /* Chaque fichier de chapitre s'inscrit dans la liste de sa langue */
  racine.CHAPITRES = { fr: [], en: [] };

  racine.RECIT = {
    code, msg, a, outil,
    capot: capot('Sous le capot'),
    /* Heure lisible à la française, les minutes peuvent dépasser 59 : hm(16, 62) donne "17 h 02" */
    hm: (h, m) => { const t = h * 60 + m; return (Math.floor(t / 60) % 24) + ' h ' + String(t % 60).padStart(2, '0'); },
    intro: `
<p>Tu occupes le premier poste DevOps d'une petite boîte de livraison de courses. Le livre couvre tes six premiers mois : douze incidents, de la première pub locale à la campagne nationale.</p>
<p>Chaque décision déplace quatre jauges. Certaines conséquences arrivent tout de suite. D'autres attendent plusieurs chapitres.</p>
<dl class="regles">
<dt>PROD</dt><dd>La santé du service. À zéro, Panier Vif n'a plus de clients et l'histoire s'arrête.</dd>
<dt>CONFIANCE</dt><dd>Ce que l'équipe est prête à te laisser décider.</dd>
<dt>DETTE</dt><dd>Ce que tu repousses à plus tard.</dd>
<dt>ÉNERGIE</dt><dd>Ce qu'il te reste. Quand elle manque, certains choix te sont fermés.</dd>
</dl>
<p>Pendant un incident, une horloge tourne. Chaque action coûte des minutes, les réunions aussi. Les tools que tu poses et les flags que tu gagnes te suivent d'un chapitre à l'autre.</p>`,
  };

  racine.RECIT_EN = {
    code, msg, a, outil,
    capot: capot('Under the hood'),
    /* 12-hour clock, minutes may exceed 59: hm(16, 62) gives "5:02 PM" */
    hm: (h, m) => {
      const t = h * 60 + m;
      const heure = Math.floor(t / 60) % 24;
      return ((heure % 12) || 12) + ':' + String(t % 60).padStart(2, '0') + (heure < 12 ? ' AM' : ' PM');
    },
    intro: `
<p>You are the first DevOps hire at a small grocery delivery company. The book covers your first six months: twelve incidents, from the first local TV ad to the national campaign.</p>
<p>Every decision moves four gauges. Some consequences land right away. Others wait several chapters.</p>
<dl class="regles">
<dt>PROD</dt><dd>The health of the service. At zero, Panier Vif has no customers left and the story ends.</dd>
<dt>TRUST</dt><dd>How much the team is willing to let you decide.</dd>
<dt>DEBT</dt><dd>What you push back to later.</dd>
<dt>ENERGY</dt><dd>What you have left. When it runs low, some choices are closed to you.</dd>
</dl>
<p>During an incident, a clock is running. Every action costs minutes, and so do meetings. The tools you set up and the flags you earn follow you from one chapter to the next.</p>`,
  };
})(typeof window !== 'undefined' ? window : globalThis);
