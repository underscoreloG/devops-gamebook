/* Chapitre 4 : le backup jamais restauré. PostgreSQL, restauration, fatigue. */
(function (racine) {
  'use strict';

  const { code, capot, msg, hm, a } = racine.RECIT;

  /* Théo a lancé sa requête à 11 h 17 et a mis trois minutes à oser le dire */
  const heure = (repli) => (s) => (s.horloge != null ? hm(11, 17 + s.horloge) : repli);

  const noeuds = {

    debut: {
      heure: heure('11 h 20'),
      entree: (s) => (s.depart.codes.includes('UPLOADS_LOST')
        ? { prod: -2, energie: -1, retire: ['UPLOADS_LOST'], horlogeFixe: 3 }
        : { prod: -1, horlogeFixe: 3 }),
      texte: (s) => `
${s.depart.codes.includes('UPLOADS_LOST')
    ? '<p>Tu as passé la matinée à restaurer les photos. L\'archive de cette nuit n\'existe pas : sous le compte <code>deploy</code>, le script de backup n\'avait pas les credentials du stockage. Celle de la nuit d\'avant a fait l\'affaire. 61 000 fichiers en deux heures, moins les justificatifs envoyés hier, perdus pour de bon.</p><p>Tu n\'as pas encore eu le temps de regarder ce que ce script fait de la base.</p>'
    : '<p>Deux jours calmes. Tu commençais à ranger le wiki.</p>'}
<p>Théo, le développeur arrivé le mois dernier, s'approche de ton bureau. Il est blanc.</p>
<p>« Je voulais corriger le prix d'un produit en staging. Je crois que j'étais sur la prod. »</p>
<p>Il tourne son écran vers toi :</p>
${code(`
UPDATE products SET price_cents = 99
WHERE id = 20481;

UPDATE 14012
`)}
<p>Il avait sélectionné la première ligne seulement avant de lancer. Les 14 012 produits du catalogue coûtent 0,99 euro. Depuis trois minutes, les clients commandent à ce prix-là.</p>`,
      choix: [
        { t: 'Passer tout le site en maintenance', vers: 'reunion', fx: { prod: -2, f: { STOP: 'maintenance' } } },
        { t: 'Désactiver seulement le paiement avec le feature flag CHECKOUT_ENABLED', vers: 'reunion', fx: { prod: -1, horloge: 2, f: { STOP: 'paiement' } } },
        { t: 'Laisser le site ouvert et remettre les bons prix le plus vite possible', vers: 'reunion', fx: { f: { STOP: 'ouvert' } } },
      ],
    },

    reunion: {
      heure: heure('11 h 25'),
      entree: () => ({ horloge: 3 }),
      texte: (s) => `
<p>${s.f.STOP === 'maintenance'
    ? 'La page de maintenance s\'affiche. Plus personne ne commande à 0,99 euro. Plus personne ne commande du tout.'
    : s.f.STOP === 'paiement'
      ? 'Les clients peuvent toujours remplir leur panier. Au moment de payer, un bandeau leur demande de revenir dans une heure. Plus aucune commande ne part à 0,99 euro.'
      : 'Le site reste ouvert. Chaque minute, quatre ou cinq commandes partent à 0,99 euro l\'article. Tu te dis que tu iras vite.'}</p>
<p>Hugo, le fondateur, a appris la nouvelle. Il écrit dans #incident : « Je veux un point en visio toutes les trente minutes jusqu'à la fin. Tout le monde. »</p>`,
      choix: [
        { t: 'Accepter les points en visio toutes les trente minutes', vers: 'source', fx: { horloge: 20, energie: -1, f: { POINTS: 'visio' } } },
        { t: 'Proposer à la place un message écrit dans #incident toutes les trente minutes', vers: 'source', fx: { confiance: 1, f: { POINTS: 'ecrit' } } },
        { t: 'Demander à Malik d\'être le seul interlocuteur de Hugo pendant que tu travailles', vers: 'source', fx: { confiance: 1, f: { POINTS: 'malik' } } },
      ],
    },

    source: {
      heure: heure('11 h 30'),
      entree: () => ({ horloge: 5 }),
      texte: (s) => `
${s.f.POINTS === 'visio'
    ? '<p>Deux points en visio ont déjà eu lieu. Dix minutes chacun, six personnes, les mêmes questions. Tu as répondu deux fois « je cherche ».</p>'
    : s.f.POINTS === 'ecrit'
      ? '<p>Hugo accepte. Tu postes le premier message :</p>' + msg('Tous les prix sont faux depuis 11 h 17. Cause connue. Je cherche la bonne source pour les rétablir. Prochain message à 12 h.')
      : '<p>Malik prend Hugo à part. « Je te tiens au courant. Laisse-les travailler. » Tu ne reçois plus aucune notification.</p>'}
<p>Il te faut les prix d'avant 11 h 17. Le backup de la base tourne chaque nuit à 2 h 30.</p>
${a(s, 'BACKUP_OK')
    ? '<p>Tu as réparé ce script il y a deux jours, en lisant la boîte de Bastien. Le fichier de cette nuit pèse 3,1 Go et <code>gunzip -t</code> le valide. C\'est le deuxième backup utilisable de l\'histoire de Panier Vif.</p>'
    : '<p>Tu ouvres le dossier. Le fichier de cette nuit pèse 20 octets. Celui d\'hier aussi. Tu remontes : 20 octets, 20 octets, 20 octets. Le dernier fichier de taille normale date du 24 juin.</p>' + code(`
$ pg_dump paniervif > /dev/null
pg_dump: error: aborting because of server version mismatch
pg_dump: detail: server version: 16.4; pg_dump version: 15.8
`) + '<p>Depuis la montée de version de juin, <code>pg_dump</code> échoue chaque nuit. Le script enchaîne <code>pg_dump | gzip</code> sans <code>pipefail</code> : <code>gzip</code> compresse du vide, renvoie zéro, et tout le monde croit que ça marche.</p>'}`,
      choix: (s) => (a(s, 'BACKUP_OK') ? [
        { t: 'Restaurer le backup de cette nuit directement sur la base de prod', vers: 'ecrase' },
        { t: 'Restaurer le backup à côté, dans une base temporaire, et ne recopier que les prix', vers: 'a_cote' },
        { t: 'Ne pas toucher à la base : faire ressaisir les prix par l\'équipe catalogue', vers: 'manuel' },
      ] : [
        { t: 'Restaurer à côté le backup de juin et reprendre ses prix', vers: 'juin' },
        { t: 'Reconstruire les prix à partir des lignes de commande', vers: 'reconstruire' },
        { t: 'Faire ressaisir les prix par l\'équipe catalogue', vers: 'manuel' },
      ]),
    },

    ecrase: {
      heure: heure('12 h 15'),
      entree: () => ({ prod: -4, confiance: -2, horloge: 40, f: { ISSUE: 'ecrase' } }),
      texte: () => `
${code(`
$ dropdb paniervif && createdb paniervif
$ gunzip -c "$DUMP" | psql -q paniervif
`)}
<p>Quarante minutes plus tard, les prix sont justes. Tous. La base est exactement dans l'état de 2 h 30 cette nuit.</p>
<p>Il te faut quelques secondes pour comprendre ce que ça veut dire. Les 312 commandes passées ce matin n'existent plus. Ni les 28 comptes créés depuis l'aube, ni les créneaux de livraison réservés pour cet après-midi. Les camions sont déjà chargés, pour des commandes dont la base n'a plus aucune trace.</p>
<p>Tu as réparé une colonne en effaçant neuf heures d'activité.</p>
${capot('Un backup remet toute la base à une date, pas une table ni une colonne. Restaurer par-dessus la prod, c\'est choisir de perdre tout ce qui s\'est écrit depuis. La règle : on restaure toujours à côté, puis on ne recopie que ce dont on a besoin.')}`,
      choix: [{ t: 'Reconstituer ce qui peut l\'être', vers: 'apres' }],
    },

    a_cote: {
      heure: heure('12 h 20'),
      entree: () => ({ horloge: 45, confiance: 1, f: { ISSUE: 'restaure' } }),
      texte: () => `
<p>Tu restaures dans une base à part, sans toucher à la prod :</p>
${code(`
$ createdb paniervif_restore
$ gunzip -c "$DUMP" | psql -q paniervif_restore
$ psql paniervif_restore -c "\\copy (SELECT id, price_cents FROM products) TO 'prix.csv' CSV"
COPY 14009
`)}
<p>Vingt-cinq minutes de restauration. Puis, sur la prod, dans une transaction :</p>
${code(`
BEGIN;
CREATE TEMP TABLE prix_ok (id bigint PRIMARY KEY, price_cents integer);
\\copy prix_ok FROM 'prix.csv' CSV
UPDATE products p SET price_cents = o.price_cents
FROM prix_ok o WHERE p.id = o.id;
-- UPDATE 14009
SELECT id, name FROM products WHERE id NOT IN (SELECT id FROM prix_ok);
-- 3 lignes
COMMIT;
`)}
<p>14 009 prix rétablis. Les trois produits restants ont été créés ce matin : ils n'existaient pas à 2 h 30. Tu demandes leurs prix à l'équipe catalogue, qui te les donne en deux minutes.</p>
<p>Aucune commande de la matinée n'a été touchée.</p>
${capot('Restaurer à côté coûte vingt-cinq minutes et ne risque rien. La transaction te laisse vérifier le résultat avant de valider : tant que tu n\'as pas écrit <code>COMMIT</code>, un <code>ROLLBACK</code> efface tout. C\'est exactement ce qui manquait à Théo.')}`,
      choix: [{ t: 'Rouvrir et faire le point', vers: 'apres' }],
    },

    manuel: {
      heure: '16 h 30',
      entree: (s) => ({ prod: s.f.STOP === 'ouvert' ? 0 : -2, energie: -1, horlogeFixe: 313, f: { ISSUE: 'manuel' } }),
      texte: (s) => `
<p>L'équipe catalogue a un export Excel de la semaine dernière. Quatre personnes s'y mettent : charger le fichier, corriger les 200 prix qui ont bougé depuis, vérifier les promotions une par une.</p>
<p>À 16 h 30, les prix sont justes. Tu n'as pris aucun risque sur la base. ${s.f.STOP === 'ouvert'
    ? 'Le site est resté ouvert pendant ces cinq heures.'
    : 'Le site, lui, n\'a rien vendu pendant cinq heures, un jour de semaine.'}</p>
${capot('Ne pas restaurer est un vrai choix quand on n\'a pas confiance dans ses backups. Il coûte du temps humain et des heures de fermeture, pas des données. La question qu\'il laisse ouverte : pourquoi n\'a-t-on pas confiance dans ses backups ?')}`,
      choix: [{ t: 'Rouvrir et faire le point', vers: 'apres' }],
    },

    juin: {
      heure: heure('12 h 30'),
      entree: () => ({ horloge: 50, f: { ISSUE: 'juin' } }),
      texte: () => `
<p>Tu restaures le backup du 24 juin dans une base à part, tu en extrais les prix, tu les recopies sur la prod. Cinquante minutes, proprement, dans une transaction.</p>
<p>Les prix ont de nouveau l'air de prix. Le site rouvre.</p>
<p>À 15 h, l'équipe catalogue t'appelle. 2 300 produits ont changé de prix depuis juin, et 900 n'existaient pas encore : ceux-là sont restés à 0,99 euro. Depuis deux heures, Panier Vif vend le beurre au prix de l'été et les nouveautés pour presque rien.</p>
${capot('Un backup vieux de trois mois répond à une question : à quoi ressemblait la base il y a trois mois ? Ce n\'était pas la question. La technique était la bonne, restaurer à côté et ne recopier qu\'une colonne. La source ne l\'était pas.')}`,
      choix: [{ t: 'Refermer le paiement et reprendre proprement', vers: 'reconstruire', fx: { prod: -1, confiance: -2 } }],
    },

    reconstruire: {
      heure: (s) => (s.f.ISSUE === 'juin' ? '15 h 20' : heure('12 h 00')(s)),
      entree: () => ({ horloge: 30, f: { RECONSTRUIT: true } }),
      texte: (s) => `
<p>${s.f.ISSUE === 'juin' ? 'Cette fois, tu cherches une source récente.' : 'Pas de backup utilisable. Il te faut une autre source.'} Chaque ligne de commande garde le prix unitaire au moment de l'achat. Le dernier prix vendu de chaque produit, avant 11 h 17, est donc le bon :</p>
${code(`
SELECT DISTINCT ON (product_id) product_id, unit_price_cents
FROM order_lines
WHERE created_at < :debut_incident
ORDER BY product_id, created_at DESC;
-- 11 204 lignes
`)}
<p>11 204 produits sur 14 012 retrouvent leur prix. Il en reste 2 808 qui ne se sont pas vendus récemment. Pour ceux-là, tu as une copie de la prod faite en staging il y a neuf jours, et l'équipe catalogue pour vérifier les écarts.</p>
<p>Croiser, vérifier, appliquer : c'est long. La journée y passe.</p>`,
      choix: [{ t: 'Continuer', vers: 'soir' }],
    },

    soir: {
      heure: '21 h 30',
      entree: () => ({ energie: -1, horlogeFin: true }),
      texte: (s) => `
<p>Les 11 204 prix sûrs sont prêts à être appliqués. Les 2 808 autres sont dans un tableur à moitié vérifié. Le bureau est vide, à part Inès qui rassemble ses affaires.</p>
<p>Tu es debout depuis ${s.depart.codes.includes('UPLOADS_LOST') ? '7 h 40, et c\'est ton deuxième incident de la journée' : '7 h'}. Tu relis la même requête pour la troisième fois sans la comprendre.</p>
<p>Malik t'écrit : « On rouvre ce soir ? »</p>`,
      choix: [
        {
          t: 'Finir ce soir : appliquer les 14 012 prix, en relisant chaque requête trois fois',
          vers: 'finir_net',
          verrou: (s) => (s.energie >= 3 ? null : 'Il te faut au moins 3 d\'ÉNERGIE pour relire quoi que ce soit correctement.'),
        },
        { t: 'Finir ce soir, vite : tout appliquer et rouvrir', vers: 'finir_vite' },
        { t: 'Appliquer les 11 204 prix sûrs, masquer les autres produits, rouvrir et aller dormir', vers: 'partiel' },
        { t: 'Passer la main à Inès avec des notes', vers: 'main' },
      ],
    },

    finir_net: {
      heure: '23 h 40',
      entree: () => ({ energie: -2, f: { ISSUE: 'reconstruit' } }),
      texte: () => `
<p>Tu te forces à ralentir. Chaque requête dans une transaction, un <code>SELECT</code> de contrôle avant chaque <code>COMMIT</code>, dix produits vérifiés à la main sur le site.</p>
<p>À 23 h 40, les 14 012 prix sont en place et le paiement rouvre. Tu rentres chez toi sans te souvenir du trajet.</p>
${capot('Ça a tenu parce qu\'il te restait de quoi relire. Ce n\'est pas une méthode : la prochaine fois, il ne te restera peut-être rien, et tu ne le sauras qu\'après.')}`,
      choix: [{ t: 'Faire le point le lendemain', vers: 'apres' }],
    },

    finir_vite: {
      heure: '22 h 10',
      entree: () => ({ energie: -1, prod: -1, confiance: -1, f: { ISSUE: 'reconstruit' } }),
      texte: () => `
<p>Tu appliques tout d'un bloc. Dans ta dernière requête, tu joins le tableur sur la référence fournisseur au lieu de l'identifiant du produit. Les deux colonnes se ressemblent, à 22 h.</p>
<p>Le paiement rouvre. Le lendemain matin, 140 produits sont au prix d'un autre : la lessive au prix des yaourts, le saumon au prix du sel.</p>
<p>Quatorze heures après le premier <code>UPDATE</code> raté, tu viens d'en lancer un deuxième.</p>
${capot('La fatigue ne se sent pas de l\'intérieur. On ne se dit pas « je vais me tromper », on se dit « c\'est bientôt fini ». Passé un certain nombre d\'heures, la décision prudente est celle qui ne demande plus de précision.')}`,
      choix: [{ t: 'Corriger, puis faire le point', vers: 'apres' }],
    },

    partiel: {
      heure: '22 h 00',
      entree: () => ({ confiance: 1, f: { ISSUE: 'reconstruit' } }),
      texte: () => `
<p>Tu appliques les 11 204 prix dont tu ne doutes pas. Inès ajoute en dix minutes un filtre qui masque du catalogue les 2 808 produits restants.</p>
<p>À 22 h, le paiement rouvre sur 80 % du catalogue, les 80 % qui font presque toutes les ventes. Tu réponds à Malik : « Oui, sauf les produits qu'on finit demain matin. »</p>
<p>Le lendemain à 10 h, à tête reposée et avec l'équipe catalogue, les derniers prix sont vérifiés et remis en ligne.</p>
${capot('Entre tout fermer et tout rouvrir, il y a presque toujours un service dégradé acceptable. Le chercher fait partie du travail, surtout quand la personne qui répare n\'est plus en état de finir.')}`,
      choix: [{ t: 'Faire le point', vers: 'apres' }],
    },

    main: {
      heure: '21 h 50',
      entree: (s) => (a(s, 'RUNBOOK')
        ? { confiance: 1, f: { ISSUE: 'reconstruit' } }
        : { energie: -1, f: { ISSUE: 'reconstruit' } }),
      texte: (s) => `
<p>« Inès, je ne suis plus en état. Tu peux finir ? »</p>
${a(s, 'RUNBOOK')
    ? '<p>Elle pose son sac. Depuis le vendredi de la pub, vous avez pris l\'habitude d\'écrire les étapes avant de les faire. Tu lui laisses dix lignes : ce qui est fait, ce qui reste, la requête de contrôle, quand s\'arrêter. Elle applique les prix sûrs, rouvre à 22 h 30 et laisse le reste pour demain.</p><p>Tu dors neuf heures.</p>'
    : '<p>Elle pose son sac. Tu lui expliques à l\'oral, en vrac, où tu en es. Elle t\'appelle à 22 h 15 pour savoir quel fichier est le bon. Puis à 23 h, pour une requête qu\'elle n\'ose pas lancer sans toi. Le paiement rouvre à 23 h 30.</p><p>Tu n\'as ni travaillé ni dormi.</p>'}
${capot('Passer la main n\'est pas abandonner, à condition que la main passe vraiment. Sans notes écrites, l\'autre personne hérite du problème et de ton téléphone.')}`,
      choix: [{ t: 'Faire le point le lendemain', vers: 'apres' }],
    },

    apres: {
      jour: 'Le lendemain',
      heure: '10 h 00',
      entree: (s) => {
        const fx = { horlogeFin: true };
        if (s.f.STOP === 'ouvert') { fx.prod = -2; fx.confiance = -2; }
        return fx;
      },
      texte: (s) => `
${s.f.STOP === 'ouvert'
    ? '<p>Le site est resté ouvert pendant toute la correction. La compta a fait le total : des centaines de commandes à 0,99 euro l\'article. Hugo a dû choisir entre les honorer à perte et les annuler une par une. Il a annulé. Les avis clients de la semaine sont illisibles.</p>'
    : ''}
<p>Malik a réuni tout le monde. Théo est assis au bout de la table et ne dit rien.</p>
<p>« Deux sujets, dit Malik. Comment un développeur arrivé le mois dernier peut-il écrire dans la base de prod depuis son poste. Et pourquoi, le jour où on a eu besoin d'un backup, ${a(s, 'BACKUP_OK') ? 'on n\'en avait qu\'un seul de valide, par chance, depuis deux jours' : 'on n\'en avait pas'}. »</p>
<p>Il se tourne vers toi. « Tu as une demi-journée. Tu en fais quoi ? »</p>`,
      choix: [
        { t: 'Un test de restauration automatique chaque semaine, et des accès prod en lecture seule par défaut', vers: 'cloture', fx: { codes: ['RESTORE_TEST', 'BACKUP_OK'], confiance: 1, energie: -1, f: { SUITE: 'test' } } },
        { t: 'Réparer le script de backup et passer à la suite', vers: 'cloture', fx: { codes: ['BACKUP_OK'], dette: 2, f: { SUITE: 'script' } } },
        { t: 'Retirer ses accès à Théo : le problème, c\'est lui', vers: 'cloture', fx: { codes: ['BACKUP_OK'], dette: 2, confiance: -1, f: { SUITE: 'theo' } } },
      ],
    },

    cloture: {
      jour: 'Le lendemain',
      heure: '17 h 00',
      fin: (s) => (s.f.ISSUE === 'ecrase' ? 'ecrase' : s.f.ISSUE === 'restaure' ? 'restaure' : 'sans_filet'),
      texte: (s) => (s.f.SUITE === 'test' ? `
<p>Tu écris un job qui, chaque dimanche à 4 h, restaure le dernier backup dans une base jetable, compte les lignes des dix plus grosses tables et t'alerte si un chiffre est à zéro ou si la restauration échoue.</p>
<p>Puis tu crées deux rôles : lecture seule pour tout le monde, écriture réservée aux migrations qui passent par le pipeline. Théo est le premier à te remercier.</p>
${capot('Un backup qu\'on n\'a jamais restauré est une hypothèse. Le seul test qui vaille est de le restaurer, régulièrement, sans qu\'un humain ait à y penser.')}`
        : s.f.SUITE === 'script' ? `
<p>Tu installes le bon client PostgreSQL, tu ajoutes <code>set -euo pipefail</code>, tu vérifies que le fichier de cette nuit fait plus de 20 octets. Il fait 3,1 Go.</p>
<p>Personne ne l'a restauré pour voir. Et Théo, comme tout le monde, peut toujours lancer un <code>UPDATE</code> sur la prod depuis son poste.</p>`
          : `
<p>Théo perd ses accès à la prod. Il passe la semaine à s'excuser auprès de tout le monde, puis ne propose plus rien en réunion.</p>
<p>Inès, Malik et toi gardez les vôtres, avec le même client SQL, les mêmes onglets ouverts côte à côte sur staging et sur prod. Le backup, lui, est réparé : tu l'as fait en passant.</p>
${capot('Si n\'importe quel membre de l\'équipe aurait pu faire la même erreur, la retirer à un seul ne supprime qu\'un candidat sur quatre. La question utile n\'est pas qui a lancé la requête, mais pourquoi rien ne l\'en empêchait.')}`),
    },
  };

  racine.CHAPITRES.push({
    id: 'ch4',
    numero: 4,
    titre: 'Le backup jamais restauré',
    techno: 'Backups',
    jour: (s) => (s.depart.codes.includes('UPLOADS_LOST') ? 'Mercredi, semaine 6' : 'Jeudi, semaine 6'),
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['UPLOADS_LOST'], energie: 3, confiance: 2 },
      { codes: ['BACKUP_OK', 'RUNBOOK'] },
      { codes: ['RUNBOOK'], energie: 2 },
    ],
    fins: {
      restaure: {
        titre: 'À côté, puis une colonne',
        texte: 'Le backup existait, il était valide, et tu ne l\'as pas laissé écraser la matinée. Trois conditions réunies pour la première fois.',
      },
      sans_filet: {
        titre: 'Sans filet',
        texte: 'Les prix sont revenus sans l\'aide d\'un backup. Ça a marché parce que la base gardait par hasard une trace ailleurs. La prochaine table abîmée n\'en aura peut-être pas.',
      },
      ecrase: {
        titre: 'Neuf heures effacées',
        texte: 'Le backup était bon. C\'est la façon de le restaurer qui a transformé une colonne fausse en matinée disparue.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
