/* Outils partagés par tous les chapitres. À charger avant les fichiers chapitre-N.js. */
(function (racine) {
  'use strict';

  const ech = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  racine.CHAPITRES = [];

  racine.RECIT = {
    /* Bloc de code : le texte est échappé, les retours à la ligne de début et de fin sont retirés */
    code: (t) => '<pre class="code"><code>' + ech(t.replace(/^\n/, '').replace(/\s+$/, '')) + '</code></pre>',
    capot: (html) => '<aside class="capot"><p class="capot-titre">Sous le capot</p><p>' + html + '</p></aside>',
    msg: (html) => '<blockquote class="msg">' + html + '</blockquote>',
    /* Heure lisible, les minutes peuvent dépasser 59 */
    hm: (h, m) => { const t = h * 60 + m; return (Math.floor(t / 60) % 24) + ' h ' + String(t % 60).padStart(2, '0'); },
    /* Le lecteur a-t-il ce mot-code, cet instrument ? */
    a: (s, c) => s.codes.includes(c),
    outil: (s, x) => s.instruments.includes(x),
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
})(typeof window !== 'undefined' ? window : globalThis);
