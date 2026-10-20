/* Chapitre 1 : la migration. Ce fichier ne contient que le récit ; l'affichage est dans moteur.js. */
(function (racine) {
  'use strict';

  const { code, capot, msg, hm } = racine.RECIT;

  /* Heures : le vendredi glisse de 10 minutes si on a pris le temps de lire la PR */
  const retard = (s) => (s.f.LU ? 10 : 0);
  const ven = (s, h, m) => hm(h, m + retard(s));
  const debut = (s) => (s.f.SAMEDI ? [20, 51] : s.f.LOIN ? [19, 6] : [16, 50 + retard(s)]);
  const heureIncident = (s) => { const d = debut(s); return hm(d[0], d[1] + (s.horloge || 0)); };
  const apresIncident = (s, extra) => { const d = debut(s); return hm(d[0], d[1] + (s.f.DUREE || 0) + extra); };

  const ERREUR_TRANSACTION = 'ERROR:  CREATE INDEX CONCURRENTLY cannot run inside a transaction block';

  const choixDepart = [
    { t: 'Approuver et lancer le déploiement', vers: 'deploy' },
    { t: 'Demander à Inès de modifier la migration', vers: 'reecrire' },
    { t: 'Annoncer que rien ne part en prod un vendredi après 16 h', vers: 'refus' },
    { t: 'Lire d\'abord le reste de la PR (10 minutes)', vers: 'lire', si: (s) => !s.f.LU },
  ];

  const apresVendredi = (s) => (s.codes.includes('NO_INDEX') ? 'sam_incident' : 'sam_calme');

  const noeuds = {

    pr: {
      heure: '16 h 42',
      texte: () => `
<p>Tu as rejoint Panier Vif il y a trois semaines. Livraison de courses à Nantes, 22 salariés, et tu y occupes le premier poste DevOps de la boîte.</p>
<p>Malik, le CTO, pose son ordinateur sur ton bureau.</p>
<p>« La pub télé passe demain à 20 h 50. Le code promo RENTREE doit marcher, limité aux 5 000 premières commandes. La PR d'Inès est prête. Il ne manque que ton feu vert. »</p>
<p>Tu ouvres la PR. La migration tient en deux lignes :</p>
${code(`
ALTER TABLE orders ADD COLUMN promo_code text;
CREATE INDEX idx_orders_promo_code ON orders (promo_code);
`)}
<p>Tu vérifies deux chiffres. La table <code>orders</code> contient 9 millions de lignes. Et le vendredi entre 17 h et 20 h, c'est le pic de la semaine : une commande toutes les quatre secondes.</p>
<p>La CI est verte.</p>
<p>Ton train pour Rennes part à 18 h 12. On t'y attend pour un anniversaire que tu as déjà manqué l'an dernier.</p>`,
      choix: choixDepart,
    },

    lire: {
      heure: '16 h 52',
      entree: () => ({ f: { LU: true } }),
      texte: () => `
<p>Tu descends dans le code. La vérification du quota est là :</p>
${code(`
def promo_disponible(code):
    if not settings.PROMO_QUOTA_ENABLED:
        return True
    utilisations = db.scalar(
        "SELECT count(*) FROM orders WHERE promo_code = :code",
        {"code": code},
    )
    return utilisations < 5000
`)}
<p>Elle est appelée à chaque validation de panier. Sans index sur <code>promo_code</code>, cette requête relira les 9 millions de lignes à chaque paiement.</p>
<p>Tu notes aussi le feature flag qu'Inès a prévu, <code>PROMO_QUOTA_ENABLED</code>. Désactivé, le code promo marche toujours, mais plus personne ne compte.</p>
<p>Malik tapote sur le bureau. « Alors ? »</p>`,
      choix: choixDepart,
    },

    refus: {
      heure: (s) => ven(s, 16, 44),
      entree: () => ({ confiance: -2 }),
      texte: () => `
<p>Malik ne hausse pas le ton. C'est pire.</p>
<p>« La pub est payée. 40 000 euros. Elle passe demain, que tu sois d'accord ou non. »</p>
${capot('« Pas de déploiement le vendredi » n\'est pas une règle de sécurité. C\'est un aveu : on ne fait pas assez confiance à ses déploiements pour les faire quand ça compte.')}`,
      choix: [
        { t: 'Maintenir ta position et partir prendre ton train', vers: 'loin' },
        { t: 'Proposer une troisième voie : livrer ce soir, mais autrement', vers: 'reecrire' },
      ],
    },

    loin: {
      heure: '19 h 08',
      entree: () => ({ confiance: -1, f: { LOIN: true } }),
      texte: () => `
<p>Tu tiens bon. À 18 h 12, tu es dans le train.</p>
<p>À 19 h 08, quelque part après Redon, ton téléphone vibre. Puis vibre encore.</p>
<p>Malik a les droits d'administration sur le pipeline. Il a déployé lui-même, à 19 h 06.</p>
${capot('Dire non n\'a pas supprimé le risque. Tu as seulement quitté la pièce où il se prenait.')}`,
      choix: [{ t: 'Ouvrir les messages', vers: 'deploy' }],
    },

    reecrire: {
      heure: (s) => ven(s, 16, 48),
      texte: (s) => `
<p>« Qu'est-ce qui cloche ? demande Inès. La CI est verte. »</p>
<p>« La CI teste sur une table de 200 lignes. »</p>
${s.f.LU ? '<p>Tu repenses à la requête de quota. Elle aura besoin de cet index dès la première commande de samedi soir.</p>' : ''}
<p>Tu vois trois façons de réécrire la migration.</p>
<h3>Option A : deux migrations séparées</h3>
${code(`
-- migration 1
SET lock_timeout = '3s';
ALTER TABLE orders ADD COLUMN promo_code text;

-- migration 2
CREATE INDEX CONCURRENTLY idx_orders_promo_code ON orders (promo_code);
`)}
<h3>Option B : un DEFAULT, pour que ce soit instantané</h3>
${code(`
ALTER TABLE orders ADD COLUMN promo_code text NOT NULL DEFAULT '';
CREATE INDEX idx_orders_promo_code ON orders (promo_code);
`)}
<h3>Option C : la colonne ce soir, l'index plus tard, au calme</h3>
${code(`
ALTER TABLE orders ADD COLUMN promo_code text;
`)}`,
      choix: [
        { t: 'Choisir l\'option A', vers: 'optA' },
        { t: 'Choisir l\'option B', vers: 'deploy', fx: { f: { B: true } } },
        { t: 'Choisir l\'option C', vers: 'optC' },
      ],
    },

    optA: {
      heure: (s) => ven(s, 16, 55),
      texte: (s) => `
<p>L'option A a un prix. Deux migrations au lieu d'une, une nouvelle review, un passage en staging. Inès estime la mise en prod vers ${ven(s, 18, 5)}.</p>
<p>Ton train part à 18 h 12, et la gare est à vingt minutes.</p>
<p>Malik regarde l'heure. « On ne peut pas aller plus vite ? »</p>`,
      choix: [
        { t: 'Rester jusqu\'au bout et laisser partir ton train', vers: 'A_rester' },
        { t: 'Valider le staging, écrire le runbook pour Inès et partir à 17 h 40', vers: 'A_passer' },
        { t: 'Sauter le staging pour livrer avant 17 h 30', vers: 'A_sauter' },
      ],
    },

    A_rester: {
      heure: (s) => ven(s, 18, 5),
      entree: () => ({ energie: -1, confiance: 1 }),
      texte: (s) => `
<p>En staging, la migration 2 échoue :</p>
${code(ERREUR_TRANSACTION)}
<p>L'outil de migration d'Inès enveloppe chaque fichier dans une transaction. Dix minutes pour trouver l'option qui la désactive. C'est exactement à ça que sert le staging.</p>
<p>À ${ven(s, 18, 5)}, tout est en prod. L'index se construit en quatorze minutes pendant que les commandes continuent de s'écrire. Tu vérifies avec <code>\\d orders</code> qu'il n'est pas marqué <code>INVALID</code>. Il ne l'est pas.</p>
<p>Personne ne remarque rien. C'était le but.</p>
<p>Ton train, lui, est parti. Le suivant est à 20 h 12.</p>
${capot('<code>CREATE INDEX</code> classique bloque toutes les écritures sur la table pendant la construction. <code>CONCURRENTLY</code> est plus lent et peut échouer en laissant un index invalide à supprimer, mais il ne bloque personne. Le <code>lock_timeout</code> sert à autre chose : si l\'<code>ALTER TABLE</code> doit attendre derrière une longue transaction, il abandonne au bout de 3 secondes au lieu de faire patienter toute la table derrière lui.')}`,
      choix: [{ t: 'Fermer le ticket', vers: 'soir' }],
    },

    A_passer: {
      heure: '18 h 20',
      entree: () => ({ codes: ['RUNBOOK'] }),
      texte: () => `
<p>Vous passez les migrations en staging ensemble. La seconde échoue :</p>
${code(ERREUR_TRANSACTION)}
<p>L'outil de migration d'Inès enveloppe chaque fichier dans une transaction. Dix minutes pour trouver l'option qui la désactive.</p>
<p>À 17 h 30, le staging est vert. Tu écris la suite dans le ticket :</p>
${code(`
1. Lancer la migration 2 en prod (hors transaction).
2. Pendant la construction : ne rien faire. Les commandes continuent, c'est normal.
3. À la fin : \\d orders
4. Si l'index est marqué INVALID :
   DROP INDEX CONCURRENTLY idx_orders_promo_code;
   puis relancer la migration 2.
5. Ne pas déployer l'application tant que l'index n'est pas valide.
6. Au moindre doute : m'appeler. Je suis dans le train, pas sur la Lune.
`)}
<p>Malik hausse un sourcil. « Tu pars en plein déploiement ? »</p>
<p>« Je pars après avoir écrit comment le finir. »</p>
<p>À 18 h 20, dans le train, ton téléphone vibre. Inès : « Index valide. App déployée. Bon week-end. »</p>
${capot('Une procédure qu\'une autre personne a exécutée sans toi vaut plus qu\'un déploiement que tu as surveillé de bout en bout. La première survit à tes vacances.')}`,
      choix: [{ t: 'Ranger ton téléphone', vers: 'soir' }],
    },

    A_sauter: {
      heure: (s) => ven(s, 18, 10),
      entree: () => ({ energie: -1, dette: 1 }),
      texte: (s) => `
<p>« On gagne quarante minutes », dis-tu. Inès hésite, puis pousse.</p>
<p>En prod, la migration 1 passe : la colonne existe. La migration 2 échoue :</p>
${code(ERREUR_TRANSACTION)}
<p>L'outil de migration d'Inès enveloppe chaque fichier dans une transaction. Le pipeline s'arrête net, avant de déployer l'application. Aucun client n'a rien vu : cette erreur-là a le bon goût d'échouer proprement.</p>
<p>Mais la prod est dans un état intermédiaire, et il faut comprendre, corriger, repousser. À ${ven(s, 18, 10)}, tout est en ligne, index valide. Tu as livré plus tard qu'en passant par le staging, et ton train est parti.</p>
${capot('Sauter le staging ne t\'a pas fait gagner quarante minutes. Il a déplacé la découverte du problème vers la prod. Cette fois, l\'erreur était inoffensive. Tu n\'avais aucun moyen de le savoir avant.')}`,
      choix: [{ t: 'Fermer le ticket', vers: 'soir' }],
    },

    optC: {
      heure: (s) => ven(s, 17, 10),
      entree: () => ({ confiance: 1, dette: 2, codes: ['NO_INDEX'] }),
      texte: (s) => `
<p>La colonne seule passe en quelques millisecondes. À ${ven(s, 17, 10)}, tout est en prod. Malik paie sa tournée. Tu auras ton train.</p>
<p>Reste l'index.</p>`,
      choix: [
        { t: 'Créer un ticket « Ajouter l\'index sur promo_code » et filer à la gare', vers: 'soir' },
        {
          t: 'Mettre un rappel : créer l\'index demain à 8 h, quand le trafic est au plus bas',
          vers: 'C_samedi',
          verrou: (s) => (s.f.LU ? null : 'Tu ne sais pas à quoi sert cet index : tu n\'as pas lu le reste de la PR.'),
        },
      ],
    },

    C_samedi: {
      heure: (s) => ven(s, 17, 15),
      entree: () => ({ retire: ['NO_INDEX'], dette: -2, energie: -1 }),
      texte: () => `
<p>Tu règles le rappel avant même de quitter le bureau.</p>
<p>Demain à 8 h, depuis une cuisine de Rennes, tu lanceras <code>CREATE INDEX CONCURRENTLY</code>. Quatorze minutes, index valide, café froid.</p>
<p>Ce ne sera pas glorieux. Ce sera fait.</p>
${capot('Livrer sans l\'index était défendable : la colonne ne coûtait rien et la pression est retombée. Ce qui rend ce choix sûr, c\'est d\'avoir donné une date à ce qui restait à faire, et que cette date tombe avant la pub.')}`,
      choix: [{ t: 'Filer à la gare', vers: 'soir' }],
    },

    deploy: {
      heure: heureIncident,
      entree: (s) => ({ prod: -3, horlogeFixe: s.f.LOIN ? 5 : 2, energie: s.f.LOIN ? -1 : 0 }),
      texte: (s) => `
${s.f.LOIN
    ? '<p>Le temps de sortir ton ordinateur, de le caler sur tes genoux et de partager la connexion du téléphone : trois minutes. Tu remontes le fil.</p><p>La colonne a été ajoutée en un instant.</p>'
    : '<p>La migration démarre. La colonne est ajoutée en un instant.</p>'}
<p>Puis <code>CREATE INDEX</code> pose son lock sur <code>orders</code> et commence à lire 9 millions de lignes. Les lectures passent. Les écritures attendent.</p>
<p>Le paiement tourne dans le vide. Une minute plus tard, c'est le site entier qui répond 503.</p>
<p>Aucune alerte ne s'est déclenchée. C'est le support qui donne l'alarme : « paiement bloqué », « page blanche », « c'est normal ? ».</p>
${s.f.B ? capot('Le <code>DEFAULT</code> n\'était pas le problème. Depuis PostgreSQL 11, ajouter une colonne avec une valeur par défaut constante est instantané. Tu as corrigé la ligne qui ne posait pas de souci et laissé celle qui en posait.') : ''}
<p>Malik ouvre une visio de crise. Neuf personnes s'y connectent en une minute : le support, la directrice commerciale, le fondateur. Une notification s'affiche : « Rejoins, on a besoin de comprendre. »</p>`,
      choix: [
        { t: 'Rejoindre la visio et expliquer la situation', vers: 'action', fx: { horloge: 10, f: { VISIO: 'rejoint' } } },
        { t: 'Ne pas répondre et te mettre au travail', vers: 'action', fx: { confiance: -1, f: { VISIO: 'ignore' } } },
        { t: 'Écrire trois lignes dans #incident, puis couper les notifications', vers: 'action', fx: { horloge: 1, confiance: 1, f: { VISIO: 'etat' } } },
      ],
    },

    action: {
      heure: heureIncident,
      texte: (s) => {
        const d = debut(s);
        let t = '';
        if (s.f.VISIO === 'rejoint') {
          t += '<p>Tu rejoins. « C\'est lié à la pub ? » « On a perdu des commandes ? » « Ça revient quand ? » Tu n\'as aucune réponse : tu n\'as pas encore regardé. Chacun reformule la question du précédent.</p>';
          t += '<p>Dix minutes plus tard, tu coupes ton micro. Le lock, lui, n\'a pas bougé.</p>';
        } else if (s.f.VISIO === 'ignore') {
          t += '<p>Tu ne réponds pas. ' + (s.f.LOIN ? 'Ton téléphone sonne trois fois de suite. Malik.' : 'Malik vient se planter derrière ta chaise.') + ' « Et je dis quoi au fondateur, moi ? »</p>';
        } else {
          t += '<p>Tu écris :</p>';
          t += msg('Paiement et site en panne depuis ' + hm(d[0], d[1]) + '. Cause probable : la migration en cours. Je regarde la base. Prochain point dans 10 minutes.');
          t += '<p>Dans la visio, Malik lit ton message à voix haute. Les questions s\'arrêtent.</p>';
        }
        t += capot('Une visio de crise répond à un vrai besoin : savoir. Trois lignes écrites y répondent en une minute, sans retirer du problème la seule personne qui peut le résoudre.');
        t += '<p>Maintenant, la migration.</p>';
        return t;
      },
      choix: [
        { t: 'Annuler le job de déploiement dans le pipeline', vers: 'jobtue' },
        { t: 'Ouvrir psql et chercher qui bloque', vers: 'diagnostic' },
        { t: 'Laisser finir : l\'index doit être presque construit', vers: 'attendre' },
      ],
    },

    jobtue: {
      heure: heureIncident,
      entree: () => ({ horloge: 4, f: { JOB: true } }),
      texte: () => `
<p>Tu cliques sur le bouton rouge. Le job passe en « annulé ». Tu recharges la page de paiement.</p>
<p>Toujours 503.</p>
<p>Tu recharges encore. Quatre minutes passent avant que tu l'admettes : rien n'a changé.</p>
${capot('Annuler le job a tué le client, pas la requête. PostgreSQL ne remarque la disparition d\'un client que lorsqu\'il essaie de lui parler, et un <code>CREATE INDEX</code> ne lui dit rien avant d\'avoir fini. Le lock tient toujours. Pire : à la fin, faute de client pour envoyer le <code>COMMIT</code>, tout sera annulé.')}`,
      choix: [{ t: 'Ouvrir psql et chercher qui bloque', vers: 'diagnostic' }],
    },

    diagnostic: {
      heure: heureIncident,
      entree: () => ({ horloge: 3 }),
      texte: () => `
<p>Tu te connectes à la base et tu demandes qui fait quoi :</p>
${code(`
SELECT pid, wait_event_type, left(query, 46) AS requete
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start;

  pid  | wait_event_type | requete
-------+-----------------+------------------------------------------------
 48213 | IO              | CREATE INDEX idx_orders_promo_code ON orders (
 48377 | Lock            | INSERT INTO orders (customer_id, slot_id, tota
 48379 | Lock            | UPDATE orders SET status = 'paid' WHERE id = 7
 48380 | Lock            | INSERT INTO orders (customer_id, slot_id, tota
 ...
(61 lignes)
`)}
<p>Une requête travaille. Soixante autres attendent derrière elle, et avec elles toutes les connexions de l'application.</p>
${capot('Les 60 connexions du pool sont prises par des écritures bloquées. Il n\'en reste aucune pour le reste du site, ni pour <code>/health</code>, que le load balancer interroge avant d\'envoyer du trafic à un serveur. Un lock sur une seule table a éteint tout le site.')}`,
      choix: [
        { t: 'Annuler la requête 48213 avec pg_cancel_backend', vers: 'annuler' },
        { t: 'Laisser finir : annuler maintenant, c\'est tout perdre', vers: 'attendre', si: (s) => !s.f.JOB },
      ],
    },

    annuler: {
      heure: heureIncident,
      entree: (s) => {
        const duree = s.horloge + 1;
        const fx = { horloge: 1, codes: ['POSTMORTEM'], f: { DUREE: duree } };
        if (duree >= 10) { fx.prod = -2; fx.codes.push('LOST_ORDERS'); }
        return fx;
      },
      texte: (s) => `
${code('SELECT pg_cancel_backend(48213);')}
<p>La transaction est annulée. ${s.f.JOB ? 'Le' : 'Colonne et index disparaissent ensemble, le'} lock tombe, les soixante écritures en attente passent d'un coup. Le site revient.</p>
<p>${s.f.DUREE} minutes d'incident.</p>
${s.codes.includes('LOST_ORDERS')
    ? '<p>C\'est trop. Pendant le paiement, Panier Vif retient le créneau de livraison du client pendant dix minutes. Passé ce délai, le créneau est rendu. Ceux qui ont patienté retrouvent leur panier, mais plus leur livraison de samedi matin. Le support compte 41 commandes perdues.</p>'
    : '<p>C\'est assez court. Pendant le paiement, Panier Vif retient le créneau de livraison du client pendant dix minutes, et aucun n\'a eu le temps d\'expirer. Ceux qui ont patienté finissent leur commande.</p>'}
<p>Reste que le code promo n'est toujours pas en prod, et que la pub passe demain.</p>`,
      choix: [
        { t: 'Relivrer ce soir, proprement cette fois', vers: 'relivrer_soir' },
        { t: 'Arrêter là : relivrer demain à 8 h, à tête reposée', vers: 'relivrer_samedi' },
      ],
    },

    attendre: {
      heure: heureIncident,
      entree: (s) => {
        const duree = Math.max(s.horloge, 11) + 3;
        return { horlogeFixe: duree, prod: -2, confiance: -1, energie: s.f.LOIN ? 0 : -1, codes: ['POSTMORTEM', 'LOST_ORDERS'], f: { DUREE: duree } };
      },
      texte: (s) => `
<p>Tu attends. Deux minutes. Cinq. Huit.</p>
<p>À la dixième minute, les créneaux de livraison que Panier Vif retient pendant le paiement expirent. Les clients qui patientaient encore garderont leur panier, mais plus leur livraison de samedi matin.</p>
<p>L'index se termine à la onzième minute. Le lock tombe, soixante écritures passent d'un coup, suivies de tous ceux qui rechargeaient la page. Il faut encore trois minutes pour que le site respire.</p>
<p>Le code promo est en prod, avec son index. Le support compte 41 commandes perdues. ${s.f.LOIN ? 'Par la vitre, la campagne défile sans que tu la voies.' : 'Tu attrapes ton train de justesse, sans avoir dit au revoir à personne.'}</p>
${capot('« C\'est presque fini » est la phrase la plus chère d\'un incident. Tu ne savais pas combien de temps il restait. Quand on ne sait pas, on arrête l\'hémorragie d\'abord et on répare ensuite.')}`,
      choix: [{ t: 'Souffler', vers: 'soir', fx: { horlogeFin: true } }],
    },

    relivrer_soir: {
      heure: (s) => (s.f.LOIN ? '21 h 15' : ven(s, 18, 40)),
      entree: () => ({ energie: -2, horlogeFin: true }),
      texte: (s) => `
${s.f.LOIN
    ? '<p>Tu arrives à Rennes à 19 h 30 et tu t\'installes dans le hall de la gare, l\'ordinateur sur les genoux. Au téléphone, tu guides Inès : la colonne d\'un côté, l\'index de l\'autre, construit avec <code>CONCURRENTLY</code>. Staging, review, prod. À 21 h 15, le code promo est en ligne et personne n\'a rien senti.</p><p>Quand tu arrives à l\'anniversaire, on en est au café.</p>'
    : '<p>Inès et toi réécrivez la migration : la colonne d\'un côté, l\'index de l\'autre, construit avec <code>CONCURRENTLY</code>. Staging, review, prod. À ' + ven(s, 18, 40) + ', le code promo est en ligne et personne n\'a rien senti.</p><p>Ton train est parti depuis une demi-heure. Tu envoies un message : « Commencez sans moi. »</p>'}
${capot('Relivrer juste après un incident, les mains encore tremblantes, est un pari. Il a tenu parce que vous étiez deux et que le staging a servi. En solo et sans staging, c\'est comme ça que naît le deuxième incident de la soirée.')}`,
      choix: [{ t: 'Souffler', vers: 'soir' }],
    },

    relivrer_samedi: {
      heure: (s) => apresIncident(s, 4),
      entree: () => ({ energie: -1, confiance: -1, horlogeFin: true }),
      texte: () => `
<p>« On s'arrête là pour ce soir. Demain 8 h, trafic au plus bas, on relivre proprement. »</p>
<p>Malik te regarde longtemps. « Et si ça recasse demain matin, à douze heures de la pub ? »</p>
<p>Tu n'as pas de bonne réponse. Tu as seulement une certitude : ce soir, tu relirais mal une migration.</p>
<p>Demain à 8 h, avec Inès en visio, ce sera fait en vingt-cinq minutes : deux migrations, un index construit avec <code>CONCURRENTLY</code>, et personne ne sentira rien. Mais ton samedi commencera par un réveil.</p>`,
      choix: [{ t: 'Souffler', vers: 'soir' }],
    },

    soir: {
      heure: 'Plus tard',
      texte: (s) => `
${s.codes.includes('POSTMORTEM')
    ? '<p>Une chose te reste en travers. Ce n\'est pas une alerte qui a donné l\'alarme. C\'est un client mécontent, puis un autre, puis le support.</p>'
    : '<p>Tout s\'est bien passé. Une question te reste pourtant en tête : si ça avait cassé, qui l\'aurait su en premier ?</p><p>Tu connais la réponse. Un client.</p>'}
<p>Bastien, l'ancien de la boîte, a installé un Prometheus il y a deux ans. Il collecte tout. Personne ne le regarde, et il n'a jamais envoyé une alerte à qui que ce soit.</p>`,
      choix: [
        {
          t: 'Poser ce soir une alerte sur le taux d\'erreur du paiement (20 minutes)',
          vers: 'alerte',
          verrou: (s) => (s.energie >= 4 ? null : 'Il te faut au moins 4 d\'ÉNERGIE. Ce soir, tu écrirais cette règle de travers.'),
        },
        { t: 'L\'inscrire au programme de lundi matin', vers: apresVendredi, fx: { dette: 1 } },
        { t: 'Laisser tomber : ça ne se reproduira pas', vers: apresVendredi },
      ],
    },

    alerte: {
      heure: 'Vingt minutes',
      entree: () => ({ instruments: ['METRICS'], energie: -1 }),
      texte: () => `
<p>Tu écris la règle la plus simple possible :</p>
${code(`
- alert: PaiementEnErreur
  expr: |
    sum(rate(http_requests_total{route="/checkout", status=~"5.."}[5m]))
      / sum(rate(http_requests_total{route="/checkout"}[5m])) > 0.05
  for: 2m
  labels:
    severity: page
  annotations:
    summary: "Plus de 5 % des paiements échouent"
`)}
<p>Tu la branches sur ton téléphone et sur le channel #incident. Tu provoques une fausse erreur en staging pour vérifier qu'elle sonne. Elle sonne.</p>
${capot('Cette alerte ne regarde ni le CPU ni la mémoire. Elle regarde ce que vit le client : est-ce qu\'il arrive à payer ? On alerte sur les symptômes, on enquête sur les causes.')}`,
      choix: [{ t: 'Fermer l\'ordinateur', vers: apresVendredi }],
    },

    sam_calme: {
      jour: 'Samedi, semaine 3',
      heure: '20 h 51',
      fin: (s) => (s.codes.includes('POSTMORTEM') ? 'rattrapage' : 'rien'),
      texte: (s) => `
<p>La pub vient de passer. 4 000 visiteurs en 90 secondes.</p>
<p>Tu regardes le dashboard depuis un canapé. Le trafic est multiplié par six. Le temps de réponse du paiement reste à 180 ms.</p>
${s.instruments.includes('METRICS')
    ? '<p>Ton alerte ne sonne pas. Tu sais que c\'est une bonne nouvelle, parce qu\'elle existe.</p>'
    : '<p>Personne ne t\'écrit. Tu supposes que tout va bien. Tu recharges quand même la page de paiement trois fois, pour vérifier.</p>'}
<p>C'est ça, le métier : quand tu le fais bien, il ne se passe rien.</p>`,
    },

    sam_incident: {
      jour: 'Samedi, semaine 3',
      heure: heureIncident,
      entree: (s) => (s.instruments.includes('METRICS')
        ? { prod: -3, horlogeFixe: 2, f: { SAMEDI: true } }
        : { prod: -4, horlogeFixe: 12, f: { SAMEDI: true } }),
      texte: (s) => `
<p>La pub vient de passer. 4 000 visiteurs en 90 secondes.</p>
<p>À chaque validation de panier, l'application vérifie le quota :</p>
${code('SELECT count(*) FROM orders WHERE promo_code = \'RENTREE\';')}
<p>Sans index, PostgreSQL relit les 9 millions de lignes. À chaque commande. Le CPU de la base monte à 100 %, le paiement met 14 secondes à répondre, puis ne répond plus.</p>
${s.instruments.includes('METRICS')
    ? '<p>À 20 h 53, ton téléphone sonne : « Plus de 5 % des paiements échouent ». Tu es devant ton écran deux minutes après le début.</p>'
    : '<p>Tu n\'en sais rien. Tu l\'apprends à 21 h 03, par une capture d\'écran qu\'un client a publiée et que Malik te transfère avec trois points d\'interrogation. Douze minutes de pub sont déjà parties.</p>'}
<p>${s.f.LU ? 'Tu te souviens du feature flag d\'Inès,' : 'Tu ouvres enfin le code d\'Inès et tu y trouves un feature flag,'} <code>PROMO_QUOTA_ENABLED</code>. Désactivé, le code promo marche toujours, mais plus personne ne compte les 5 000.</p>`,
      choix: [
        { t: 'Créer l\'index maintenant, avec CONCURRENTLY', vers: 'sam_index' },
        { t: 'Appeler Malik pour couper le quota, et créer l\'index ensuite', vers: 'sam_coupe' },
        { t: 'Redémarrer la base : ça repart toujours après un redémarrage', vers: 'sam_redemarre' },
      ],
    },

    sam_redemarre: {
      jour: 'Samedi, semaine 3',
      heure: heureIncident,
      entree: () => ({ prod: -2, horloge: 5 }),
      texte: () => `
<p>Tu redémarres PostgreSQL. Toutes les connexions tombent : pendant deux minutes, le site entier est éteint.</p>
<p>Puis la base revient, vidée de son cache, et les mêmes requêtes reviennent avec elle. En trente secondes, le CPU est de nouveau à 100 %.</p>
<p>Tu viens d'ajouter une panne totale à une panne partielle.</p>
${capot('Un redémarrage ne soigne que les problèmes d\'état : une fuite mémoire, un processus coincé. Ici, le problème est la charge, et la charge t\'attendait à la porte.')}`,
      choix: [
        { t: 'Créer l\'index maintenant, avec CONCURRENTLY', vers: 'sam_index' },
        { t: 'Appeler Malik pour couper le quota, et créer l\'index ensuite', vers: 'sam_coupe' },
      ],
    },

    sam_index: {
      jour: 'Samedi, semaine 3',
      heure: heureIncident,
      fin: 'interets',
      entree: () => ({ prod: -2, horloge: 25, retire: ['NO_INDEX'], dette: -2, energie: -1 }),
      texte: () => `
<p>Tu lances la commande sur une base à genoux. <code>CONCURRENTLY</code> ne bloque personne, mais il doit lire toute la table en partageant le disque avec des centaines de requêtes qui font la même chose.</p>
<p>Vingt-cinq minutes. Pendant vingt-cinq minutes, la pub que Panier Vif a payée 40 000 euros envoie des clients vers un paiement qui ne répond pas.</p>
<p>Puis l'index devient valide, et tout se calme en dix secondes.</p>
${capot('Tu as réparé avant d\'arrêter l\'hémorragie. La réparation était la bonne, mais elle a duré vingt-cinq minutes, alors qu\'un feature flag aurait rendu le service en quatre.')}`,
    },

    sam_coupe: {
      jour: 'Samedi, semaine 3',
      heure: heureIncident,
      fin: 'interets',
      entree: () => ({ horloge: 4, confiance: 1, retire: ['NO_INDEX'], dette: -2, energie: -1 }),
      texte: () => `
<p>Malik décroche à la première sonnerie. Tu lui donnes le choix en une phrase : « Soit le paiement reste en panne une demi-heure, soit on arrête de compter et on distribue plus de 5 000 remises. »</p>
<p>Deux secondes de silence. « Coupe. »</p>
<p>Quatre minutes plus tard, les trois serveurs ont redémarré avec le quota désactivé. Le paiement répond en 200 ms. Tu lances l'index au calme. Il est valide à 21 h 40, et tu rallumes le quota.</p>
<p>Lundi, la compta comptera 6 200 remises au lieu de 5 000. À 5 euros la remise, 6 000 euros de trop. Moins cher qu'une demi-heure de panne pendant la pub.</p>
${capot('Arrêter l\'hémorragie d\'abord, réparer ensuite. Et dépasser le quota n\'était pas ta décision : c\'est une décision d\'argent, elle revient à quelqu\'un qui a le droit de la prendre. Ton travail était de la rendre possible en une phrase.')}`,
    },
  };

  racine.CHAPITRES.fr.push({
    id: 'ch1',
    numero: 1,
    titre: 'La migration',
    techno: 'PostgreSQL',
    jour: 'Vendredi, semaine 3',
    debut: 'pr',
    noeuds: noeuds,
    fins: {
      rien: {
        titre: 'Il ne se passe rien',
        texte: 'Ni vendredi ni samedi, aucun client n\'a vu de panne. Personne ne saura ce que tu as évité, et c\'est à ça qu\'on reconnaît le travail bien fait.',
      },
      rattrapage: {
        titre: 'Rattrapage',
        texte: 'Vendredi a cassé, samedi a tenu. Lundi à 10 h, tu animes ton premier post-mortem.',
      },
      interets: {
        titre: 'Avec les intérêts',
        texte: 'L\'index repoussé vendredi a été payé samedi, en pleine pub. Livrer sans lui était défendable. Le laisser sans date ne l\'était pas.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
