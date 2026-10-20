/* Chapitre 10 : 3 h 12. Astreinte, bruit des alertes, passation, décisions de nuit. */
(function (racine) {
  'use strict';

  const { code, capot, a, outil } = racine.RECIT;

  const apresAlertes = (s) => (outil(s, 'LOGS') ? 'facture' : 'astreinte');
  const nuit = (s) => {
    if (a(s, 'MUTED_ALERTS')) return 'matin_noir';
    if (s.f.ROTATION) return s.f.PASSATION ? 'theo_ok' : 'theo_appelle';
    return 'reveil';
  };

  const DIAG = `
$ df -h /var/lib/postgresql
Sys. de fichiers Taille Utilisé Dispo Uti% Monté sur
/dev/sdb1          200G    188G   12G  94% /var/lib/postgresql

$ sudo du -sh /var/lib/postgresql/16/main/pg_wal
131G    /var/lib/postgresql/16/main/pg_wal
`;

  const SLOTS = `
SELECT slot_name, active,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retenu
FROM pg_replication_slots;

   slot_name    | active | retenu
----------------+--------+--------
 debezium_essai | f      | 129 GB
`;

  const noeuds = {

    debut: {
      heure: '14 h 00',
      texte: () => `
<p>Tu fais le compte de la semaine dernière. 140 alertes dans le channel #alertes. Ton téléphone a vibré 31 fois entre minuit et 6 h. Une seule fois, c'était vrai.</p>
${code(`
[FIRING]   CPUEleve        vif-db-01   82 %
[RESOLVED] CPUEleve        vif-db-01
[FIRING]   MemoireElevee   api-7d9f    71 %
[FIRING]   CPUEleve        vif-db-01   81 %
[RESOLVED] MemoireElevee   api-7d9f
[FIRING]   CPUEleve        vif-db-01   83 %
`)}
<p>Ce sont les règles par défaut, installées avec le cluster. Personne ne les a choisies. Tu es d'astreinte depuis quatre mois, sans interruption, et tu ne lis plus ce channel : tu le fais défiler.</p>`,
      choix: [
        { t: 'Couper les notifications la nuit : tu dormiras enfin', vers: apresAlertes, fx: { codes: ['MUTED_ALERTS'], energie: 1, f: { BRUIT: 'coupe' } } },
        { t: 'Passer une journée à trier : supprimer ce sur quoi personne n\'agit, garder ce que vit le client', vers: apresAlertes, fx: { confiance: -1, f: { BRUIT: 'tri' } } },
        { t: 'Remonter tous les seuils à 95 % : moins de bruit, sans rien supprimer', vers: apresAlertes, fx: { dette: 1, f: { BRUIT: 'seuils' } } },
      ],
    },

    facture: {
      heure: '16 h 30',
      texte: () => `
<p>Karim passe avec une facture. « Le stockage des logs. 300 euros par mois en novembre, 1 200 ce mois-ci. C'est normal ? »</p>
<p>Tu regardes. Depuis que les logs sont centralisés, tout y part : les logs d'accès de chaque requête, et le <code>DEBUG</code> du worker de factures, que quelqu'un a encore oublié d'éteindre.</p>`,
      choix: [
        { t: 'Ne plus envoyer le DEBUG, échantillonner les logs d\'accès, garder 14 jours', vers: 'astreinte', fx: { confiance: 1 } },
        { t: 'Réduire la conservation à 2 jours : c\'est le plus simple', vers: 'astreinte', fx: { dette: 1 } },
        { t: 'Ne rien changer : l\'observabilité n\'a pas de prix', vers: 'astreinte', fx: { confiance: -1 } },
      ],
    },

    astreinte: {
      jour: 'Vendredi, semaine 22',
      heure: '10 h 00',
      texte: (s) => `
<p>${s.f.BRUIT === 'coupe'
    ? 'Tu as coupé les notifications entre 22 h et 7 h. Cette nuit, tu as dormi d\'une traite, pour la première fois depuis octobre.'
    : s.f.BRUIT === 'tri'
      ? 'Tu as passé la journée d\'hier dans les règles d\'alerte. « Tu en supprimes ? s\'est inquiété Malik. Et si on rate quelque chose ? » Tu en as supprimé 34. Il en reste six : le paiement échoue, le site est lent, la sonde externe ne répond plus, un disque sera plein dans deux heures, un certificat expire, la base ne répond plus. Chacune a une ligne qui dit quoi faire.'
      : 'Tu as remonté tous les seuils à 95 %. Le channel est plus calme. Les mêmes règles regardent toujours le CPU et la mémoire, un peu plus tard qu\'avant.'}</p>
<p>Point hebdomadaire avec Malik. Il te trouve une petite mine.</p>
<p>« Tu es d'astreinte depuis combien de temps, déjà ? »</p>
<p>« Depuis que je suis là. »</p>`,
      choix: [
        {
          t: 'Demander une vraie rotation : Inès et Théo prennent une semaine sur trois, avec une compensation',
          vers: 'passation',
          verrou: (s) => (s.confiance >= 3 ? null : 'Il te faut au moins 3 de CONFIANCE. Malik ne t\'écoute plus assez pour accepter ça.'),
          fx: { f: { ROTATION: true } },
        },
        { t: 'Passer l\'astreinte à Théo dès ce soir : il apprendra sur le tas', vers: nuit, fx: { f: { ROTATION: true, SANSPREP: true } } },
        { t: 'Répondre que ça va, tu tiendras encore un mois', vers: nuit, fx: { energie: -1, f: { SEUL: true } } },
      ],
    },

    passation: {
      jour: 'Vendredi, semaine 22',
      heure: '17 h 45',
      texte: () => `
<p>Malik a dit oui plus vite que prévu. « J'aurais dû le proposer moi-même. » Théo prend la première semaine. Il est volontaire, et un peu pâle.</p>
<p>Il est 17 h 45. Tu as un quart d'heure avant de partir, et trois choses en tête : Inès a déployé à 17 h, le disque de la base est à 78 % et monte doucement depuis dix jours sans que tu saches pourquoi, et une alerte sur le cache sonne à tort une nuit sur trois.</p>`,
      choix: [
        { t: 'Prendre le quart d\'heure : lui dire ces trois choses, et quoi faire pour chacune', vers: nuit, fx: { confiance: 1, f: { PASSATION: true } } },
        { t: 'Lui dire que tout est dans le wiki et filer', vers: nuit },
      ],
    },

    theo_ok: {
      jour: 'Samedi, semaine 22',
      heure: '3 h 12',
      entree: () => ({ f: { THEO_OK: true } }),
      texte: (s) => `
<p>Le téléphone de Théo sonne. Pas le tien.</p>
<p>${s.f.BRUIT === 'tri' ? 'Une seule alerte, lisible : « le disque de vif-db-01 sera plein dans deux heures ».' : 'C\'est la sixième notification de la nuit, mais celle-ci parle du disque de la base, et il se souvient de ce que tu lui as dit.'} Hier à 17 h 45, tu lui avais donné une consigne pour ce cas précis : « si ce disque passe 90 %, agrandis-le d'abord, on cherchera pourquoi au réveil ».</p>
<p>Il ajoute 50 Go au volume, vérifie que le pourcentage redescend, écrit trois lignes dans #incident et retourne se coucher. Vingt minutes en tout.</p>
<p>Tu découvres son message à 8 h, en prenant ton café. Tu as dormi neuf heures.</p>
${capot('Quinze minutes de passation ont remplacé un réveil à 3 h. Une astreinte ne se transmet pas avec un téléphone : elle se transmet avec ce qui a changé cette semaine, ce qui risque de sonner, et ce qu\'on fait dans ce cas.')}`,
      choix: [{ t: 'Chercher la cause, à tête reposée', vers: 'neuf_heures' }],
    },

    theo_appelle: {
      jour: 'Samedi, semaine 22',
      heure: (s) => (s.f.SANSPREP ? '3 h 55' : '3 h 25'),
      entree: (s) => ({ energie: -1, horlogeFixe: s.f.SANSPREP ? 43 : 13 }),
      texte: (s) => `
<p>${s.f.SANSPREP
    ? 'Le téléphone de Théo a sonné à 3 h 12. Il a regardé l\'alerte, ouvert le wiki, rien trouvé, hésité. Il a mis quarante minutes à oser t\'appeler. C\'est sa première nuit, et personne ne lui a dit quand il avait le droit de réveiller quelqu\'un.'
    : 'Le téléphone de Théo a sonné à 3 h 12. Il a ouvert le wiki. La page « base de données » date de Bastien et parle d\'un serveur qui n\'existe plus. Il t\'appelle.'}</p>
<p>« Désolé. Il y a une alerte sur le disque de la base, et je ne sais pas quoi faire. »</p>
<p>Tu es d'astreinte quand même, finalement. Tu ouvres ton ordinateur dans le noir.</p>`,
      choix: [{ t: 'Regarder ce disque', vers: 'diag' }],
    },

    reveil: {
      jour: 'Samedi, semaine 22',
      heure: '3 h 12',
      entree: () => ({ horlogeFixe: 0 }),
      texte: (s) => `
<p>Ton téléphone vibre sur la table de nuit.</p>
<p>${s.f.BRUIT === 'tri'
    ? 'C\'est la première fois de la semaine. Une seule ligne à l\'écran : « le disque de vif-db-01 sera plein dans deux heures ».'
    : 'C\'est la sixième fois cette nuit. Les cinq premières, c\'était le CPU de la base à 96 %, revenu à la normale avant que tu aies déverrouillé l\'écran. Tu vois juste « [FIRING] » et le début d\'un nom de serveur.'}</p>`,
      choix: [
        {
          t: 'Ouvrir les yeux et lire l\'alerte en entier',
          vers: 'diag',
          verrou: (s) => (s.energie >= 2 ? null : 'Il te faut au moins 2 d\'ÉNERGIE. Tes yeux ne s\'ouvrent pas.'),
        },
        { t: 'Acquitter du pouce et te rendormir : c\'est encore le CPU', vers: 'matin_noir', fx: { f: { RENDORMI: true } } },
      ],
    },

    diag: {
      jour: 'Samedi, semaine 22',
      heure: (s) => (s.f.SANSPREP ? '4 h 05' : s.f.ROTATION ? '3 h 35' : '3 h 20'),
      entree: () => ({ horloge: 8 }),
      texte: (s) => `
${code(DIAG)}
<p>Le disque de la base est à 94 %, et ce ne sont pas les données : 131 Go de journaux de transactions, les WAL, que PostgreSQL devrait recycler au fur et à mesure. Quelque chose l'en empêche.</p>
${code(SLOTS)}
<p>Un slot de réplication inactif, <code>debezium_essai</code>. PostgreSQL garde pour lui chaque journal depuis douze jours, au cas où il reviendrait les lire. Tu ne sais pas qui l'a créé.</p>
<p>À ce rythme, le disque sera plein vers 5 h 20, et la base s'arrêtera.${a(s, 'QUICK_FIX') ? ' Tu penses au disque que tu avais doublé, il y a quatre mois, sans chercher pourquoi.' : ''}</p>`,
      choix: [
        { t: 'Supprimer à la main les plus vieux fichiers de pg_wal', vers: 'wal_rm' },
        { t: 'Agrandir le disque de 50 Go et retourner dormir : la cause attendra 9 h', vers: 'agrandir' },
        { t: 'Supprimer le slot inactif tout de suite', vers: 'drop_seul' },
        { t: 'Réveiller Malik pour qu\'il décide', vers: 'malik' },
      ],
    },

    wal_rm: {
      jour: 'Samedi, semaine 22',
      heure: '4 h 10',
      fin: 'wal',
      entree: (s) => (a(s, 'RESTORE_TEST')
        ? { prod: -3, energie: -2, confiance: -1, horlogeFin: true }
        : { prod: -5, energie: -2, confiance: -2, horlogeFin: true }),
      texte: (s) => `
${code(`
$ cd /var/lib/postgresql/16/main/pg_wal
$ sudo rm 0000000100000A1*
`)}
<p>100 Go libérés d'un coup. Le disque retombe à 44 %. Tu fermes ton ordinateur.</p>
<p>À 4 h 02, PostgreSQL cherche un de ces fichiers pour son prochain point de contrôle. Il ne le trouve pas.</p>
${code(`
PANIC:  could not locate a valid checkpoint record
`)}
<p>La base ne redémarre plus. Ce que tu as supprimé n'était pas de l'historique : c'était la seule copie des dernières transactions, pas encore reportées dans les fichiers de données.</p>
<p>${a(s, 'RESTORE_TEST')
    ? 'Il reste le backup de 2 h 30. Celui-là, tu le restaures chaque dimanche depuis des mois, par un job qui n\'a jamais échoué. Cinquante minutes plus tard, la base est de retour, moins les commandes passées entre 2 h 30 et 4 h. Une nuit de semaine, il y en avait onze.'
    : 'Il reste le backup de 2 h 30. Personne ne l\'a restauré depuis le jour des prix à 0,99 euro. La procédure a changé, les versions aussi. Il te faut quatre heures, deux essais ratés, et Inès réveillée à 5 h. La base revient à 8 h 15, en plein début des commandes du samedi.'}</p>
${capot('On ne supprime jamais un fichier de <code>pg_wal</code> à la main. Ces fichiers sont la base, au même titre que les tables. Quand ils s\'accumulent, c\'est que quelque chose les retient, un slot ou un archivage en panne, et c\'est cette cause qu\'on traite.')}`,
    },

    agrandir: {
      jour: 'Samedi, semaine 22',
      heure: (s) => (s.f.SANSPREP ? '4 h 25' : s.f.ROTATION ? '3 h 55' : '3 h 40'),
      entree: () => ({ energie: -1, horloge: 12, horlogeFin: true, f: { ISSUE: 'agrandi' } }),
      texte: (s) => `
<p>Tu ajoutes 50 Go au volume depuis la console, puis <code>growpart</code> et <code>resize2fs</code>. Le disque redescend à 75 %. À ce rythme, tu as acheté quatre jours.</p>
<p>Tu écris trois lignes dans #incident : ce que tu as vu, ce que tu as fait, et « slot <code>debezium_essai</code> inactif depuis 12 jours, à qui est-il ? On regarde à 9 h. »</p>
<p>Puis tu te recouches.</p>
${capot((a(s, 'QUICK_FIX') ? 'Il y a quatre mois, agrandir un disque sans chercher la cause était une fuite. ' : '') + 'À 3 h du matin, agrandir un disque est la bonne décision : elle est réversible, elle ne supprime rien, et elle repousse les choix irréversibles à une heure où tu sauras les prendre. La différence avec un bouche-trou tient en une ligne : le rendez-vous de 9 h.')}`,
      choix: [{ t: 'Chercher la cause à 9 h', vers: 'neuf_heures' }],
    },

    drop_seul: {
      jour: 'Samedi, semaine 22',
      heure: (s) => (s.f.SANSPREP ? '4 h 20' : s.f.ROTATION ? '3 h 50' : '3 h 35'),
      entree: () => ({ energie: -1, horloge: 8, horlogeFin: true, f: { ISSUE: 'drop' } }),
      texte: () => `
${code(`
SELECT pg_drop_replication_slot('debezium_essai');
CHECKPOINT;
`)}
<p>PostgreSQL recycle 129 Go de journaux en quelques secondes. Le disque retombe à 30 %.</p>
<p>Tu te recouches, et tu ne dors pas. Ce slot appartenait à quelqu'un. S'il alimentait un export, un tableau de la compta, une réplication dont tu ignores l'existence, tu viens de le casser, à 3 h 35, sans rien demander à personne.</p>`,
      choix: [{ t: 'Attendre 9 h pour savoir', vers: 'neuf_heures' }],
    },

    malik: {
      jour: 'Samedi, semaine 22',
      heure: (s) => (s.f.SANSPREP ? '4 h 40' : s.f.ROTATION ? '4 h 10' : '3 h 55'),
      entree: () => ({ energie: -1, horloge: 27, horlogeFin: true, f: { ISSUE: 'malik' } }),
      texte: () => `
<p>Malik décroche à la quatrième sonnerie, la voix pâteuse. Il lui faut cinq minutes pour comprendre ce qu'est un slot de réplication, cinq de plus pour retrouver ses lunettes.</p>
<p>« Tu proposes quoi ? »</p>
<p>« Agrandir le disque, et chercher à qui est ce slot demain matin. »</p>
<p>« Alors fais ça. »</p>
<p>Tu agrandis le disque. Vingt minutes de plus ont passé, et deux personnes sont maintenant réveillées pour une décision que tu avais déjà prise.</p>
${capot('Réveiller quelqu\'un est la bonne décision dans deux cas : tu ne sais pas quoi faire, ou la décision ne t\'appartient pas, parce qu\'elle engage de l\'argent ou des données. Ici, la mesure était sûre, réversible, et dans ton périmètre. S\'acharner seul est une faute ; se couvrir aussi.')}`,
      choix: [{ t: 'Chercher la cause à 9 h', vers: 'neuf_heures' }],
    },

    neuf_heures: {
      jour: 'Samedi, semaine 22',
      heure: '9 h 00',
      fin: (s) => (s.f.THEO_OK ? 'dormi' : 'reveil'),
      entree: (s) => (s.f.ISSUE === 'drop' ? {} : { confiance: 1 }),
      texte: (s) => `
<p>Inès répond dans le channel avant même que tu aies posé la question. « C'est moi. Un essai d'export vers l'outil d'analyse, il y a deux semaines. J'ai arrêté le connecteur et oublié le slot. Désolée. »</p>
${s.f.ISSUE === 'drop'
    ? '<p>Ton pari de la nuit était le bon : ce slot ne servait plus à rien. Tu aurais pu tout aussi bien tomber sur l\'export mensuel de la compta.</p>'
    : '<p>Tu supprimes le slot avec elle, en visio, en dix secondes. PostgreSQL recycle 129 Go de journaux d\'un coup.</p>'}
<p>Puis tu ajoutes une ligne à la configuration de la base :</p>
${code(`
max_slot_wal_keep_size = 20GB
`)}
<p>Désormais, un slot abandonné sera invalidé au bout de 20 Go au lieu de remplir le disque. ${s.f.BRUIT === 'tri' ? 'Et tu ajoutes une septième alerte : un slot inactif depuis plus d\'une heure.' : 'Tu te promets d\'ajouter une alerte sur les slots inactifs, un jour.'}</p>`,
    },

    matin_noir: {
      jour: 'Samedi, semaine 22',
      heure: (s) => (s.f.RENDORMI ? '5 h 25' : '7 h 05'),
      fin: 'muet',
      entree: (s) => (s.f.RENDORMI
        ? { prod: -3, energie: -2, confiance: -1, horlogeFin: true }
        : { prod: -4, confiance: -2, horlogeFin: true }),
      texte: (s) => `
${s.f.RENDORMI
    ? '<p>À 5 h 22, le téléphone ne vibre plus : il sonne. « PostgreSQL ne répond plus. » Cette fois, tu lis.</p>'
    : '<p>À 3 h 12, une alerte est partie dans un channel dont les notifications sont coupées jusqu\'à 7 h. À 5 h 20, une deuxième. Personne ne les a vues.</p><p>À 7 h 05, c\'est un client qui écrit au support : « Votre site est en panne ? »</p>'}
${code(DIAG.replace('188G   12G  94%', '200G     0 100%').replace('131G', '143G'))}
<p>Le disque de la base est plein. PostgreSQL s'est arrêté net. Depuis 5 h 20, plus aucune page de Panier Vif ne s'affiche.</p>
<p>Tu trouves la cause en dix minutes : un slot de réplication abandonné par un essai d'Inès, qui retient douze jours de journaux. Tu agrandis le disque, tu redémarres la base, tu supprimes le slot. ${s.f.RENDORMI ? 'À 6 h, le site est de retour.' : 'À 7 h 45, le site est de retour, après deux heures et demie de panne et le début des commandes du samedi.'}</p>
${capot(s.f.RENDORMI
    ? 'Tu n\'as pas ignoré une alerte par négligence. Tu en as ignoré une parce que les cinq précédentes étaient fausses. Une alerte qui sonne pour rien n\'est pas inoffensive : elle apprend à celui qui la reçoit à ne plus lire.'
    : 'Couper le bruit a aussi coupé le signal. Le problème n\'était pas le nombre d\'alertes la nuit, mais le fait que 139 sur 140 ne demandaient aucune action. Celles-là se suppriment. La 140e doit pouvoir réveiller quelqu\'un.')}`,
    },
  };

  racine.CHAPITRES.push({
    id: 'ch10',
    numero: 10,
    titre: '3 h 12',
    techno: 'Astreinte',
    jour: 'Jeudi, semaine 22',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { instruments: ['LOGS', 'METRICS'], codes: ['RESTORE_TEST', 'QUICK_FIX'] },
      { energie: 1, confiance: 2 },
    ],
    fins: {
      dormi: {
        titre: 'Le téléphone d\'un autre',
        texte: 'L\'alerte a sonné, quelqu\'un savait quoi faire, et ce n\'était pas toi. C\'est à ça que ressemble une astreinte qui marche.',
      },
      reveil: {
        titre: 'Une décision de 3 h du matin',
        texte: 'Le téléphone a sonné, tu as lu, et la base a tenu. Reste à faire en sorte que la prochaine fois, ce ne soit pas forcément toi.',
      },
      muet: {
        titre: 'La cent quarantième',
        texte: 'La seule alerte vraie de la semaine est arrivée au milieu des fausses, et personne ne l\'a lue.',
      },
      wal: {
        titre: 'Ce n\'était pas de l\'historique',
        texte: 'Le disque avait de la place. La base, elle, n\'avait plus ses dernières transactions.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
