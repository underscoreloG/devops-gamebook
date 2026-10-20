/* Chapitre 2 : disque plein. Linux, post-mortem, première alerte disque. */
(function (racine) {
  'use strict';

  const { code, capot, hm, a, outil } = racine.RECIT;

  /* L'incident a commencé à 9 h 43. Avec une alerte, on le voit 2 minutes après ; sans, c'est le support qui prévient à 9 h 52. */
  const heure = (repli) => (s) => (s.horloge != null ? hm(9, 43 + s.horloge) : repli);
  const finDeJournee = (s) => (s.f.FERME ? 'jeudi' : 'fin_lundi');
  const apresVeille = (s) => (s.f.CASSE ? 'casse' : 'postmortem');

  const noeuds = {

    debut: {
      heure: heure('9 h 52'),
      entree: (s) => ({ prod: -1, horlogeFixe: outil(s, 'METRICS') ? 2 : 9 }),
      texte: (s) => `
<p>${a(s, 'POSTMORTEM')
    ? 'Le post-mortem de vendredi est prévu à 14 h. Tu prépares la chronologie, minute par minute.'
    : 'Le week-end s\'est bien passé. Tu commences à croire aux lundis calmes.'}</p>
${outil(s, 'METRICS')
    ? '<p>Ton téléphone sonne : « Plus de 5 % des paiements échouent ». L\'alerte que tu as posée vendredi soir vient de servir pour la première fois, deux minutes après le début.</p>'
    : '<p>Yasmine, du support, apparaît à ton bureau. « J\'ai des clients qui disent qu\'une page sur trois plante. Pas toutes. Une sur trois. Depuis dix minutes. »</p>'}
<p>Une sur trois. Panier Vif a trois serveurs d'application derrière son load balancer. Tu regardes les logs du plus ancien, <code>vif-app-01</code> :</p>
${code(`
OSError: [Errno 28] No space left on device
OSError: [Errno 28] No space left on device
OSError: [Errno 28] No space left on device
`)}
<p>Le load balancer, lui, voit trois serveurs en bonne santé : <code>/health</code> répond, puisqu'il n'a rien à écrire.</p>`,
      choix: [
        { t: 'Te connecter à vif-app-01 et regarder le disque', vers: 'df' },
        { t: 'Sortir vif-app-01 du load balancer, puis enquêter', vers: 'sortir' },
        { t: 'Redémarrer vif-app-01 : ça libérera sûrement quelque chose', vers: 'reboot' },
      ],
    },

    sortir: {
      heure: '9 h 54',
      entree: () => ({ confiance: 1, horlogeFin: true, f: { SORTI: true } }),
      texte: () => `
<p>Tu décoches <code>vif-app-01</code> dans la console du load balancer. Il ne reçoit plus de trafic. Deux serveurs suffisent largement un lundi matin.</p>
<p>Les erreurs s'arrêtent. Yasmine lève le pouce depuis l'autre bout de l'open space.</p>
<p>Le serveur est toujours malade, mais plus aucun client ne le sait. Tu as tout ton temps.</p>
${capot('Un serveur à moitié cassé fait plus de dégâts qu\'un serveur éteint : le load balancer continue de lui envoyer un tiers des clients. Le retirer ne répare rien, mais ça transforme une urgence en chantier.')}`,
      choix: [{ t: 'Te connecter à vif-app-01 et regarder le disque', vers: 'df' }],
    },

    reboot: {
      heure: heure('9 h 58'),
      entree: () => ({ horloge: 5 }),
      texte: () => `
<p>Tu lances le redémarrage. Quatre minutes plus tard, le serveur est de retour, et l'application refuse de démarrer : elle n'arrive même pas à écrire son fichier de PID.</p>
<p>Cette fois, <code>/health</code> ne répond plus. Le load balancer retire <code>vif-app-01</code> de lui-même.</p>
<p>Les erreurs s'arrêtent. Tu n'as rien réparé : tu as cassé le serveur assez franchement pour que le load balancer s'en aperçoive.</p>
${capot('Un redémarrage vide la mémoire et <code>/tmp</code>, pas <code>/var/log</code>. Tu as eu de la chance : le résultat utile, sortir le serveur du trafic, s\'obtenait en un clic et sans rien éteindre.')}`,
      choix: [{ t: 'Te connecter à vif-app-01 et regarder le disque', vers: 'df', fx: { horlogeFin: true, f: { SORTI: true } } }],
    },

    df: {
      heure: heure('10 h 00'),
      entree: () => ({ horloge: 3 }),
      texte: () => `
${code(`
$ df -h /
Sys. de fichiers Taille Utilisé Dispo Uti% Monté sur
/dev/sda1           50G     50G     0 100% /

$ sudo du -xh --max-depth=2 /var | sort -h | tail -4
1,1G    /var/lib
2,3G    /var/log/nginx
44G     /var/log/paniervif
47G     /var/log

$ ls -lh /var/log/paniervif/
-rw-r--r-- 1 deploy deploy 44G sept. 22 09:55 app.log
`)}
<p>Un seul fichier de 44 Go. Tu en lis la fin : des milliers de lignes par minute, toutes marquées <code>DEBUG</code>, avec le détail de chaque requête SQL.</p>`,
      choix: [
        { t: 'Supprimer le fichier : rm app.log', vers: 'rm' },
        { t: 'Vider le fichier sans le supprimer : truncate -s 0 app.log', vers: 'tronquer' },
        { t: 'Agrandir le disque à 100 Go depuis la console du cloud', vers: 'agrandir' },
      ],
    },

    rm: {
      heure: heure('10 h 05'),
      entree: () => ({ horloge: 5 }),
      texte: () => `
${code(`
$ sudo rm /var/log/paniervif/app.log
$ df -h /
Sys. de fichiers Taille Utilisé Dispo Uti% Monté sur
/dev/sda1           50G     50G     0 100% /
`)}
<p>Le fichier a disparu. Le disque est toujours plein.</p>
<p>Tu relances <code>df</code> trois fois. Puis tu cherches, et tu finis par trouver la commande qui montre les fichiers supprimés mais encore ouverts :</p>
${code(`
$ sudo lsof +L1
COMMAND   PID   USER  FD   TYPE DEVICE    SIZE/OFF NLINK    NODE NAME
gunicorn 2714 deploy  5w    REG    8,1 47244640256     0 1048611 /var/log/paniervif/app.log (deleted)
`)}
${capot('<code>rm</code> retire un nom, pas des données. Tant qu\'un processus garde le fichier ouvert, le noyau garde ses blocs. Tu as maintenant 44 Go occupés par un fichier que plus personne ne peut voir avec <code>ls</code>.')}`,
      choix: [
        { t: 'Redémarrer l\'application pour qu\'elle lâche le fichier', vers: 'relancer' },
        { t: 'Vider le fichier à travers /proc : : > /proc/2714/fd/5', vers: 'proc' },
        { t: 'Faire de la place autrement : rm -rf /var/log/*', vers: 'rm_tout' },
      ],
    },

    rm_tout: {
      heure: heure('10 h 08'),
      entree: () => ({ horloge: 2, f: { CASSE: true } }),
      texte: () => `
${code(`
$ sudo rm -rf /var/log/*
$ df -h /
Sys. de fichiers Taille Utilisé Dispo Uti% Monté sur
/dev/sda1           50G     47G  2,6G  95% /
`)}
<p>2,6 Go de libres. L'application recommence à écrire. Les erreurs s'arrêtent.</p>
<p>Tu viens aussi de supprimer les logs de nginx, ceux du système, et les dossiers qui les contenaient. Rien ne se plaint. Pour l'instant.</p>
<p>Et le fichier fantôme de 44 Go est toujours là. Tu redémarres l'application pour qu'elle le lâche enfin.</p>`,
      choix: [{ t: 'Chercher ce qui a rempli ce disque', vers: 'cause' }],
    },

    relancer: {
      heure: heure('10 h 08'),
      entree: () => ({ horloge: 2 }),
      texte: () => `
${code(`
$ sudo systemctl restart paniervif
$ df -h /
Sys. de fichiers Taille Utilisé Dispo Uti% Monté sur
/dev/sda1           50G    5,8G   42G  13% /
`)}
<p>L'application redémarre, lâche le fichier fantôme, et le noyau rend enfin les 44 Go. Les requêtes en cours sur ce serveur ont été coupées net, mais plus rien ne plante ensuite.</p>`,
      choix: [{ t: 'Chercher ce qui a rempli ce disque', vers: 'cause' }],
    },

    proc: {
      heure: heure('10 h 07'),
      entree: () => ({ horloge: 1, confiance: 1 }),
      texte: () => `
${code(`
$ sudo sh -c ': > /proc/2714/fd/5'
$ df -h /
Sys. de fichiers Taille Utilisé Dispo Uti% Monté sur
/dev/sda1           50G    5,8G   42G  13% /
`)}
<p>Le fichier n'a plus de nom, mais le processus qui le tient ouvert en garde un file descriptor dans <code>/proc</code>. Tu le vides à travers lui. 44 Go rendus, sans rien redémarrer.</p>
<p>Inès, qui regardait par-dessus ton épaule, note la commande dans un coin.</p>`,
      choix: [{ t: 'Chercher ce qui a rempli ce disque', vers: 'cause' }],
    },

    tronquer: {
      heure: heure('10 h 01'),
      entree: () => ({ horloge: 1 }),
      texte: () => `
${code(`
$ sudo truncate -s 0 /var/log/paniervif/app.log
$ df -h /
Sys. de fichiers Taille Utilisé Dispo Uti% Monté sur
/dev/sda1           50G    5,8G   42G  13% /
`)}
<p>Le fichier existe toujours, il pèse zéro octet, et l'application continue d'écrire dedans sans avoir rien remarqué. Les erreurs s'arrêtent.</p>
${capot('Vider un fichier rend l\'espace tout de suite, même s\'il est ouvert. Le supprimer ne rend rien tant qu\'un processus le tient. Ça marche ici parce que l\'application écrit en mode ajout : après la troncature, elle reprend au début.')}`,
      choix: [{ t: 'Chercher ce qui a rempli ce disque', vers: 'cause' }],
    },

    agrandir: {
      heure: heure('10 h 12'),
      entree: () => ({ horloge: 10, dette: 2, codes: ['QUICK_FIX'] }),
      texte: () => `
<p>Dans la console du cloud, tu passes le volume de 50 à 100 Go. Puis, sur le serveur :</p>
${code(`
$ sudo growpart /dev/sda 1
$ sudo resize2fs /dev/sda1
$ df -h /
Sys. de fichiers Taille Utilisé Dispo Uti% Monté sur
/dev/sda1           99G     50G   45G  53% /
`)}
<p>Dix minutes, sans rien redémarrer. Les erreurs s'arrêtent. Le fichier de 44 Go est toujours là, et il grossit.</p>
<p>Malik passe la tête. « C'est réglé ? »</p>`,
      choix: [
        { t: 'Répondre « pas encore » et chercher ce qui a rempli le disque', vers: 'cause' },
        { t: 'Répondre « réglé » et fermer le ticket : le disque a de la marge', vers: 'veille', fx: { horlogeFin: true, f: { FERME: true } } },
      ],
    },

    cause: {
      heure: '10 h 40',
      entree: (s) => (s.horloge != null && s.horloge >= 20
        ? { prod: -1, horlogeFin: true, f: { LONG: true } }
        : { horlogeFin: true }),
      texte: (s) => `
${s.f.LONG ? '<p>L\'incident a duré plus de vingt minutes, en pleine heure des commandes de la semaine. Yasmine a déjà une pile de réclamations.</p>' : ''}
<p>44 Go ne s'écrivent pas tout seuls. Tu remontes le fil :</p>
${code(`
$ grep LOG_LEVEL /etc/paniervif/app.env
LOG_LEVEL=DEBUG

$ ls -l /etc/paniervif/app.env
-rw-r----- 1 ines deploy 412 sept. 19 17:03 /etc/paniervif/app.env

$ ls /etc/logrotate.d/ | grep -c paniervif
0
`)}
<p>Vendredi à 17 h 03, Inès a passé les logs en <code>DEBUG</code> pour suivre le code promo. Personne ne les a remis en <code>INFO</code>. Et rien, sur ce serveur, ne fait tourner ni ne compresse ce fichier : il grossit depuis l'installation.</p>
${s.f.CASSE ? '<p>Tu repenses à ton <code>rm -rf /var/log/*</code>. Tu te dis que tu vérifieras nginx plus tard.</p>' : ''}`,
      choix: [
        { t: 'Remettre INFO et écrire une rotation des logs', vers: 'rotation' },
        { t: 'Remettre INFO et passer à la suite : la cause est corrigée', vers: 'info_seul' },
      ],
    },

    rotation: {
      heure: '11 h 10',
      entree: () => ({ retire: ['QUICK_FIX'], dette: -1 }),
      texte: () => `
<p>Tu remets <code>LOG_LEVEL=INFO</code>, puis tu écris <code>/etc/logrotate.d/paniervif</code> :</p>
${code(`
/var/log/paniervif/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
`)}
<p>Tu le testes en dry-run avec <code>sudo logrotate --debug /etc/logrotate.d/paniervif</code>, puis pour de vrai avec <code>--force</code>. Un fichier <code>app.log.1</code> apparaît. Tu recopies la configuration sur les deux autres serveurs.</p>
${capot('<code>copytruncate</code> copie le fichier puis le vide, sans rien demander à l\'application. On peut perdre quelques lignes pendant la copie. L\'autre voie, plus propre, est de renommer le fichier et d\'envoyer un signal à l\'application pour qu\'elle le rouvre.')}`,
      choix: [{ t: 'Passer à la suite', vers: 'veille' }],
    },

    info_seul: {
      heure: '10 h 50',
      entree: (s) => (a(s, 'QUICK_FIX') ? { dette: 1 } : { dette: 1, codes: ['QUICK_FIX'] }),
      texte: () => `
<p>Tu remets <code>LOG_LEVEL=INFO</code> et tu redémarres l'application. Le fichier grossit maintenant cent fois moins vite.</p>
<p>Cent fois moins vite, ce n'est pas zéro. Sans rotation, il lui faudra quelques mois au lieu de trois jours. Tu ne seras peut-être pas en train de regarder ce jour-là.</p>`,
      choix: [{ t: 'Passer à la suite', vers: 'veille' }],
    },

    veille: {
      heure: '11 h 30',
      texte: (s) => `
<p>Reste une question. Ce disque a mis trois jours à se remplir, et personne ne l'a vu venir.</p>
<p>${outil(s, 'METRICS')
    ? 'Ton alerte de paiement a sonné, mais une fois le mal fait. Le Prometheus de Bastien connaît pourtant le taux de remplissage de chaque disque, minute par minute.'
    : 'Le Prometheus que Bastien a installé il y a deux ans connaît le taux de remplissage de chaque disque, minute par minute. Il n\'a jamais prévenu personne.'}</p>`,
      choix: [
        { t: 'Poser une alerte sur les disques (20 minutes)', vers: 'alerte_disque' },
        { t: 'Passer à la suite : tu as déjà perdu ta matinée', vers: apresVeille },
      ],
    },

    alerte_disque: {
      heure: '11 h 50',
      entree: () => ({ instruments: ['METRICS'] }),
      texte: (s) => `
<p>Tu écris deux règles${s.depart.instruments.includes('METRICS') ? ', à côté de celle du paiement' : ''} :</p>
${code(`
- alert: DisquePresquePlein
  expr: node_filesystem_avail_bytes{mountpoint="/"}
      / node_filesystem_size_bytes{mountpoint="/"} < 0.15
  for: 10m

- alert: DisquePleinDansUnJour
  expr: predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 24 * 3600) < 0
  for: 30m
`)}
<p>Tu rejoues la seconde sur les données de vendredi soir. Elle aurait sonné samedi à 2 h du matin, deux jours avant la panne.</p>
${capot('Un seuil fixe prévient quand il est presque trop tard. <code>predict_linear</code> prolonge la tendance des six dernières heures et répond à la seule question utile : à ce rythme, quand est-ce que ça casse ?')}`,
      choix: [{ t: 'Passer à la suite', vers: apresVeille }],
    },

    casse: {
      heure: '13 h 10',
      entree: () => ({ prod: -2, confiance: -1 }),
      texte: () => `
<p>Inès déploie un fix sans rapport. Le pipeline recharge nginx sur chaque serveur, l'un après l'autre. Sur <code>vif-app-01</code> :</p>
${code(`
nginx: [emerg] open() "/var/log/nginx/error.log" failed (2: No such file or directory)
`)}
<p>nginx refuse de redémarrer : le dossier où il écrit ses logs n'existe plus. Le pipeline, lui, continue sur les deux autres serveurs. Pendant six minutes, le temps que tu comprennes et que tu recrées le dossier, un client sur trois tombe sur une erreur.</p>
<p>« C'est le même serveur que ce matin ? » demande Malik.</p>
${capot('<code>rm -rf /var/log/*</code> ne casse rien sur le moment : les processus gardent leurs fichiers ouverts. La panne arrive au prochain redémarrage, des heures plus tard, quand plus personne ne fait le lien.')}`,
      choix: [{ t: 'Aller au post-mortem', vers: 'postmortem' }],
    },

    postmortem: {
      heure: '14 h 00',
      entree: (s) => ({ retire: ['POSTMORTEM', 'LOST_ORDERS'], confiance: a(s, 'LOST_ORDERS') ? -1 : 0 }),
      texte: (s) => `
<p>Salle de réunion. Malik, Inès, Yasmine, et Hugo, le fondateur, qui ne vient jamais à ce genre de réunion.</p>
${s.depart.codes.includes('POSTMORTEM')
    ? '<p>Tu déroules d\'abord vendredi : la migration, le lock, les minutes.' + (s.depart.codes.includes('LOST_ORDERS') ? ' Hugo n\'a retenu qu\'un chiffre. « Quarante et une commandes perdues. »' : ' Hugo hoche la tête : c\'était court.') + '</p>'
    : '<p>Il n\'y avait rien à dire sur vendredi. La réunion porte sur ce matin.</p>'}
<p>Puis tu racontes le disque. Malik t'interrompt.</p>
<p>« Attends. Qui a passé les logs en DEBUG vendredi ? »</p>
<p>Silence. Tu connais la réponse : le fichier porte le nom d'Inès. Elle regarde la table.</p>`,
      choix: [
        { t: 'Répondre : c\'est Inès, vendredi à 17 h 03', vers: 'coupable' },
        { t: 'Répondre que la vraie question est ailleurs : pourquoi un seul réglage peut remplir un disque sans que personne le sache', vers: 'cause_sys' },
        { t: 'Répondre que c\'est ta faute : tu aurais dû le voir', vers: 'ma_faute' },
      ],
    },

    coupable: {
      heure: '14 h 20',
      entree: () => ({ codes: ['BLAME'] }),
      texte: () => `
<p>« C'est Inès. Vendredi, 17 h 03. »</p>
<p>C'est exact. Malik se tourne vers elle. « Tu pensais le remettre quand ? »</p>
<p>Inès explique, s'excuse, promet de faire attention. La réunion se termine sur une seule action : « Inès fera attention. »</p>
<p>En sortant, elle ne te regarde pas.</p>
${capot('Un nom n\'est pas une cause. « Inès fera attention » ne change rien au système : la prochaine personne pressée fera la même chose. Et celle qui vient d\'être désignée a appris une leçon précise : moins elle en dit, moins elle risque.')}`,
      choix: [{ t: 'Finir la journée', vers: finDeJournee }],
    },

    cause_sys: {
      heure: '14 h 20',
      entree: () => ({ confiance: 1 }),
      texte: (s) => `
<p>« N'importe lequel d'entre nous l'aurait fait vendredi soir. La question, c'est pourquoi un seul réglage peut remplir un disque en trois jours sans qu'aucun de nous le sache. »</p>
<p>Malik fronce les sourcils, puis prend un feutre. Trois lignes au tableau : le niveau de log revient tout seul à INFO au bout de 24 heures, tous les logs ont une rotation, tous les disques ont une alerte.</p>
<p>Inès relève la tête. « Le retour automatique à INFO, je peux le faire cette semaine. »</p>
${a(s, 'RUNBOOK') ? '<p>« Et j\'écris le runbook pour un disque plein, ajoute-t-elle. Comme celle que tu m\'as laissée vendredi. »</p>' : ''}
${capot('Un post-mortem sans coupable n\'est pas de la gentillesse. C\'est le seul format où les gens disent ce qui s\'est vraiment passé, et où les actions portent sur le système plutôt que sur la mémoire de quelqu\'un.')}`,
      choix: [{ t: 'Finir la journée', vers: finDeJournee }],
    },

    ma_faute: {
      heure: '14 h 20',
      entree: () => ({ confiance: -1, dette: 1 }),
      texte: () => `
<p>« C'est moi. J'aurais dû le voir. »</p>
<p>Inès te jette un regard surpris, puis reconnaissant. Malik soupire. « Bon. Tu feras attention. »</p>
<p>La réunion est finie en dix minutes. Personne n'a écrit d'action au tableau. Hugo sort en se demandant, à voix haute, si ce poste était une bonne idée.</p>
${capot('Prendre la faute sur soi protège un collègue et tue la discussion. Le résultat est le même qu\'avec un coupable désigné : une promesse de vigilance, et un système inchangé.')}`,
      choix: [{ t: 'Finir la journée', vers: finDeJournee }],
    },

    fin_lundi: {
      heure: '18 h 00',
      fin: (s) => (s.f.CASSE ? 'casse' : a(s, 'QUICK_FIX') ? 'bouchetrou' : 'propre'),
      texte: (s) => `
<p>Tu fermes le ticket. ${a(s, 'QUICK_FIX')
    ? 'Le serveur tourne. Le fichier, lui, continue de grossir, plus lentement.'
    : 'Trois serveurs, trois rotations, un niveau de log raisonnable.'}</p>
<p>${outil(s, 'METRICS')
    ? 'Et la prochaine fois qu\'un disque se remplira, tu le sauras avant le support.'
    : 'La prochaine fois qu\'un disque se remplira, c\'est encore Yasmine qui te l\'apprendra.'}</p>`,
    },

    jeudi: {
      jour: 'Jeudi, semaine 4',
      heure: '22 h 40',
      fin: 'bouchetrou',
      entree: () => ({ prod: -2, energie: -1 }),
      texte: (s) => `
<p>${outil(s, 'METRICS')
    ? 'Ton téléphone sonne sur le canapé : « DisquePleinDansUnJour ». Tu regardes l\'heure, tu te dis que ça attendra demain matin. À 22 h 40, il sonne de nouveau, pour le paiement cette fois.'
    : 'Ton téléphone sonne sur le canapé. Malik. « Le site plante une fois sur trois. Encore. »'}</p>
<p>Le disque de 100 Go est plein. Les logs étaient toujours en <code>DEBUG</code> : tu n'avais jamais cherché ce qui les remplissait. Doubler le disque t'avait acheté trois jours et demi.</p>
<p>Depuis ton salon, tu vides le fichier, tu remets <code>INFO</code>. Il est 23 h 30.</p>
${capot('Agrandir un disque est une vraie réponse quand on sait pourquoi il est plein. Sans la cause, c\'est un compte à rebours remis à zéro.')}`,
    },
  };

  racine.CHAPITRES.push({
    id: 'ch2',
    numero: 2,
    titre: 'Disque plein',
    techno: 'Linux',
    jour: 'Lundi, semaine 4',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['POSTMORTEM', 'LOST_ORDERS'], confiance: 2, energie: 3 },
      { codes: ['RUNBOOK'], instruments: ['METRICS'] },
    ],
    fins: {
      propre: {
        titre: 'Une rotation et trois lignes au tableau',
        texte: 'Le disque est vide, la cause est traitée, et le fichier ne pourra plus grossir sans fin.',
      },
      bouchetrou: {
        titre: 'Le compte à rebours',
        texte: 'Le service tourne, mais rien n\'empêche ce disque de se remplir à nouveau. Tu as gagné du temps, pas réglé le problème.',
      },
      casse: {
        titre: 'Deux pannes pour le prix d\'une',
        texte: 'Le disque plein a été réglé le matin. Le dossier supprimé a cassé le même serveur l\'après-midi.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
