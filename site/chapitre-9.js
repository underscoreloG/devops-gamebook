/* Chapitre 9 : c'est toujours le DNS. TTL, bascule de domaine, certificats. */
(function (racine) {
  'use strict';

  const { code, capot, a, outil } = racine.RECIT;

  const apresCert = (s) => (s.f.DNS === 'casse' ? 'vendredi_casse' : 'vendredi_ok');
  const dimanche = (s) => (s.f.CERT === 'copie' ? 'dimanche_expire' : 'dimanche_calme');

  const noeuds = {

    debut: {
      heure: '9 h 30',
      texte: () => `
<p>Tout le trafic passe par le cluster depuis deux semaines. Les anciens serveurs ne servent plus à rien, sauf à une chose : le domaine <code>www.paniervif.fr</code> pointe toujours vers l'ancien load balancer, qui renvoie tout vers le cluster.</p>
<p>Malik veut les éteindre. « 900 euros par mois pour faire suivre du courrier. Demain soir, dernier délai. »</p>
<p>Pour ça, il faut que le domaine pointe directement vers le cluster. Donc modifier la zone DNS. Et là, un détail : personne dans l'équipe ne sait qui y a accès.</p>
<p>« Je monte une réunion cet après-midi, dit Malik. Tout le monde, une heure. On va bien finir par retrouver ces accès. »</p>
<p>Tu as autre chose en tête : samedi, tu es témoin à un mariage, à 400 kilomètres d'ici. Ton train part demain à 18 h 10.</p>`,
      choix: [
        { t: 'Accepter la réunion de cet après-midi', vers: 'reunion_acces' },
        { t: 'Chercher toi-même : dig, whois, le gestionnaire de mots de passe', vers: 'chercher' },
        { t: 'Aller voir Bastien, qui est rentré de congé', vers: 'bastien' },
      ],
    },

    reunion_acces: {
      heure: '16 h 00',
      entree: () => ({ energie: -1, f: { TARD: true } }),
      texte: () => `
<p>Sept personnes autour de la table. Hugo pense que c'est l'agence web d'il y a quatre ans. Karim retrouve une facture annuelle de 14 euros, payée avec une carte qui n'existe plus. Yasmine se souvient d'un mail « de renouvellement » qu'elle a classé en spam.</p>
<p>Au bout de cinquante minutes, quelqu'un dit : « Il faudrait demander à Bastien. » Bastien est à son bureau, à dix mètres. Personne ne l'avait invité.</p>
<p>Il lui faut trente secondes : le domaine est sur son compte personnel chez l'hébergeur, depuis le premier jour.</p>
${capot('La réunion a mobilisé sept personnes pendant une heure pour trouver une information qu\'une seule détenait. Avant de réunir, on se demande qui sait. Si la réponse est « une personne », on va la voir.')}`,
      choix: [{ t: 'Ouvrir la zone DNS', vers: 'zone' }],
    },

    chercher: {
      heure: '9 h 50',
      texte: () => `
${code(`
$ dig +short NS paniervif.fr
ns1.hebergeur-ouest.example.
ns2.hebergeur-ouest.example.
`)}
<p>La zone est chez l'hébergeur historique. Dans le gestionnaire de mots de passe, tu trouves une entrée « domaine (compte perso Bastien) ». Le mot de passe fonctionne. La double authentification envoie un code sur le téléphone de Bastien.</p>
<p>Il est à son bureau. Il te lit le code, un peu gêné. « Il faudrait vraiment sortir ça de mon compte. »</p>
<p>Tu notes de transférer le domaine sur un compte de l'entreprise. Vingt minutes en tout.</p>`,
      choix: [{ t: 'Ouvrir la zone DNS', vers: 'zone' }],
    },

    bastien: {
      heure: '9 h 40',
      entree: () => ({ confiance: 1, f: { AVERTI: true } }),
      texte: () => `
<p>Bastien lève les yeux de son écran. « Le domaine ? Il est sur mon compte perso, depuis le début. Je te donne l'accès. Il faudrait le sortir de là, d'ailleurs. »</p>
<p>Puis, pendant que tu te connectes : « Fais attention à un truc. J'avais monté le TTL à vingt-quatre heures, à l'époque, pour faire moins de requêtes. Si tu changes l'adresse, ça mettra une journée à se voir partout. »</p>
<p>Dix minutes, accès compris.</p>`,
      choix: [{ t: 'Ouvrir la zone DNS', vers: 'zone' }],
    },

    zone: {
      heure: (s) => (s.f.TARD ? '16 h 15' : '10 h 15'),
      texte: (s) => `
${code(`
$ dig +noall +answer www.paniervif.fr
www.paniervif.fr.    86400    IN    A    203.0.113.10
`)}
<p>L'ancien load balancer est en <code>203.0.113.10</code>. L'entrée du cluster est en <code>198.51.100.20</code>. Il suffit de remplacer l'une par l'autre.</p>
<p>Le nombre du milieu est le TTL : 86 400 secondes. ${s.f.AVERTI ? 'Les vingt-quatre heures dont parlait Bastien.' : 'Vingt-quatre heures.'}</p>
<p>${s.f.TARD ? 'Il est déjà 16 h passées, et Malik veut les serveurs éteints demain soir.' : 'Malik veut les serveurs éteints demain soir.'}</p>`,
      choix: [
        { t: 'Changer l\'adresse maintenant et éteindre les anciens serveurs ce soir', vers: 'cert', fx: { f: { DNS: 'casse' } } },
        { t: 'Baisser le TTL à 300 aujourd\'hui, basculer demain, et garder les anciens serveurs jusqu\'à lundi', vers: 'cert', fx: { confiance: -1, f: { DNS: 'bas' } } },
        { t: 'Changer l\'adresse maintenant, mais garder les anciens serveurs allumés jusqu\'à lundi', vers: 'cert', fx: { confiance: -1, f: { DNS: 'garde' } } },
      ],
    },

    cert: {
      heure: (s) => (s.f.TARD ? '16 h 40' : '10 h 45'),
      texte: (s) => `
${s.f.VU
    ? ''
    : (s.f.DNS === 'casse'
      ? '<p>Tu prépares le changement pour ce soir.</p>'
      : '<p>« Lundi ? » Malik fait la grimace. Tu lui expliques les vingt-quatre heures. Il compte sur ses doigts : trois jours de serveurs en plus, 90 euros. « Bon. Lundi. »</p>')}
<p>${s.f.VU ? 'Reste à décider d\'où viendra le certificat du cluster.' : 'Reste un détail. Quand le domaine pointera vers le cluster, c\'est le cluster qui devra présenter le certificat HTTPS de <code>www.paniervif.fr</code>. Aujourd\'hui, il est sur l\'ancien load balancer, renouvelé par un cron de Bastien.'}</p>`,
      choix: [
        { t: 'Regarder d\'abord l\'état du certificat actuel', vers: 'cert_vu', si: (s) => !s.f.VU },
        { t: 'Copier le certificat actuel et sa clé dans le cluster : il marche déjà', vers: apresCert, si: (s) => !s.f.VU, fx: { f: { CERT: 'copie' } } },
        { t: 'Renouveler le certificat à la main, cette fois, et le copier dans le cluster', vers: apresCert, si: (s) => !!s.f.VU, fx: { codes: ['MANUAL_CERT'], dette: 1, f: { CERT: 'manuel' } } },
        { t: 'Installer cert-manager avec une validation HTTP, qui émettra le certificat après la bascule', vers: apresCert, fx: { f: { CERT: 'http' } } },
        { t: 'Installer cert-manager avec une validation DNS, pour avoir le certificat avant la bascule (une heure)', vers: apresCert, fx: { energie: -1, f: { CERT: 'dns' } } },
      ],
    },

    cert_vu: {
      heure: (s) => (s.f.TARD ? '16 h 50' : '10 h 55'),
      entree: () => ({ f: { VU: true } }),
      texte: () => `
${code(`
$ echo | openssl s_client -connect www.paniervif.fr:443 2>/dev/null \\
    | openssl x509 -noout -enddate
notAfter=Jan 18 14:02:11 2026 GMT
`)}
<p>Dimanche, 15 h 02, heure de Paris. Dans trois jours.</p>
<p>Un certificat Let's Encrypt se renouvelle un mois avant sa fin. Celui-ci aurait dû l'être depuis quatre semaines. Tu vas voir le cron de Bastien : il échoue chaque nuit depuis la migration. Pour prouver qu'il contrôle le domaine, <code>certbot</code> dépose un fichier sur l'ancien serveur. Mais l'ancien load balancer envoie désormais toutes les requêtes au cluster, y compris celle de Let's Encrypt qui vient chercher ce fichier.</p>
<p>Personne n'a rien vu. Rien ne regarde ce certificat de l'extérieur.</p>
${capot('Un certificat qui expire est la panne la plus prévisible qui soit : la date est écrite dedans. Elle arrive quand même, parce que le renouvellement est automatique jusqu\'au jour où une migration casse l\'automatisme sans faire de bruit.')}`,
      choix: [{ t: 'Décider quoi faire du certificat', vers: 'cert' }],
    },

    vendredi_casse: {
      jour: 'Vendredi, semaine 20',
      heure: '8 h 20',
      entree: () => ({ prod: -3, horlogeFixe: 0 }),
      texte: (s) => `
<p>Hier à 19 h, tu as changé l'adresse et arrêté les anciens serveurs. Tu as vérifié depuis ton téléphone : le site s'affichait. Tu as quitté le bureau l'esprit tranquille.</p>
<p>Ce matin, Yasmine a quarante messages. « Site inaccessible. » « Ça tourne dans le vide. » Chez toi, en 4G, tout marche. Sur le wifi du bureau, rien.</p>
${code(`
$ dig +noall +answer www.paniervif.fr @8.8.8.8
www.paniervif.fr.    38211    IN    A    203.0.113.10
`)}
<p>Ce résolveur a encore l'ancienne adresse en mémoire, pour 38 211 secondes. Des milliers d'autres aussi, chez les opérateurs, dans les box, dans les entreprises. Tous envoient leurs utilisateurs vers un serveur éteint.</p>
<p>${outil(s, 'METRICS') ? 'Tes alertes n\'ont rien dit : vues du cluster, les requêtes qui arrivent sont servies sans erreur. Celles qui n\'arrivent pas ne laissent aucune trace.' : 'Aucune alerte, bien sûr.'}</p>`,
      choix: [
        { t: 'Rallumer les anciens serveurs', vers: 'rallumer' },
        { t: 'Remettre l\'ancienne adresse dans la zone DNS', vers: 'flipflop' },
        { t: 'Attendre : ce soir à 19 h, tous les caches auront expiré', vers: 'attendre' },
      ],
    },

    flipflop: {
      jour: 'Vendredi, semaine 20',
      heure: '8 h 40',
      entree: () => ({ prod: -1, horloge: 20 }),
      texte: () => `
<p>Tu remets <code>203.0.113.10</code> dans la zone. Vingt minutes plus tard, les plaintes ont doublé.</p>
<p>Ceux qui avaient déjà reçu la nouvelle adresse allaient bien. Ceux dont le cache vient d'expirer reçoivent maintenant l'ancienne, celle du serveur éteint, et la garderont vingt-quatre heures. Tu viens de casser le site pour une deuxième population, sans le réparer pour la première.</p>
<p>Tu remets la nouvelle adresse. Il n'y a qu'une façon de servir tout le monde : que les deux adresses répondent.</p>`,
      choix: [{ t: 'Rallumer les anciens serveurs', vers: 'rallumer' }],
    },

    rallumer: {
      jour: 'Vendredi, semaine 20',
      heure: (s) => (s.horloge >= 20 ? '8 h 55' : '8 h 35'),
      entree: () => ({ horloge: 12, horlogeFin: true, confiance: -1 }),
      texte: () => `
<p>Les serveurs étaient arrêtés, pas supprimés. Tu les redémarres. Douze minutes plus tard, l'ancien load balancer renvoie de nouveau le trafic vers le cluster, et les quarante clients de Yasmine retrouvent le site.</p>
<p>Les deux adresses répondent. Peu importe désormais ce que chaque résolveur a en mémoire.</p>
<p>« Donc ils restent allumés, constate Malik. Jusqu'à quand ? » Jusqu'à lundi, au moins. Ce que tu aurais pu lui dire hier.</p>
${capot('On ne vide pas le cache des autres. Une fois une réponse DNS partie avec un TTL de 24 heures, elle vit 24 heures chez tous ceux qui l\'ont reçue. La seule marge de manœuvre se prend avant : baisser le TTL, attendre que l\'ancien expire, puis basculer. Et l\'ancienne adresse doit répondre tant qu\'un cache peut encore y envoyer quelqu\'un.')}`,
      choix: [{ t: 'Finir la semaine', vers: 'depart' }],
    },

    attendre: {
      jour: 'Vendredi, semaine 20',
      heure: '19 h 00',
      entree: () => ({ prod: -3, confiance: -2, horlogeFin: true }),
      texte: () => `
<p>« Ça va se résorber tout seul d'ici ce soir. »</p>
<p>C'est exact. Toute la journée, heure après heure, des caches expirent et des clients reviennent. Toute la journée aussi, une part des habitués de Panier Vif tombe sur une page qui ne charge pas, un vendredi, jour des courses du week-end.</p>
<p>À 19 h, c'est fini. Hugo a passé l'après-midi à répondre lui-même à des clients. Il n'a pas compris pourquoi il suffisait de rallumer trois serveurs et que personne ne l'a fait.</p>`,
      choix: [{ t: 'Finir la semaine', vers: 'depart' }],
    },

    vendredi_ok: {
      jour: 'Vendredi, semaine 20',
      heure: '10 h 30',
      texte: (s) => `
${s.f.DNS === 'bas'
    ? '<p>Le TTL est à 300 depuis hier matin. Les vingt-quatre heures de l\'ancien sont écoulées : plus aucun cache ne garde l\'adresse plus de cinq minutes. Tu changes l\'enregistrement.</p><p>Cinq minutes plus tard, l\'ancien load balancer ne reçoit presque plus rien. Si quelque chose avait mal tourné, revenir en arrière aurait pris cinq minutes aussi.</p>'
    : '<p>Tu as changé l\'adresse hier. Depuis, les caches expirent au fil des heures, et le trafic glisse de l\'ancien load balancer vers le cluster. Les deux répondent, donc personne ne voit la différence.</p><p>Ça marche. Tu notes quand même que, pendant ces vingt-quatre heures, tu n\'aurais eu aucun moyen de revenir en arrière rapidement si l\'entrée du cluster avait eu un problème.</p>'}
${s.f.CERT === 'http'
    ? '<p>cert-manager demande son certificat dès que le domaine pointe vers le cluster. Let\'s Encrypt interroge directement les serveurs de la zone, voit la nouvelle adresse, et valide en une minute. Pendant cette minute, les tout premiers visiteurs du cluster ont reçu un certificat provisoire que leur navigateur a refusé. Ensuite, le renouvellement se fera tout seul.</p>'
    : s.f.CERT === 'dns'
      ? '<p>Le certificat attendait déjà dans le cluster : avec la validation DNS, cert-manager prouve qu\'il contrôle le domaine en écrivant un enregistrement dans la zone, sans avoir besoin que le trafic arrive. Aucun visiteur n\'a vu d\'avertissement. Le renouvellement se fera tout seul.</p>'
      : s.f.CERT === 'manuel'
        ? '<p>Hier, tu as lancé <code>certbot</code> en mode manuel, ajouté l\'enregistrement de validation à la main dans la zone, et copié le résultat dans un Secret. Le certificat est valable 90 jours. Dans 60 jours, quelqu\'un devra s\'en souvenir.</p>'
        : '<p>Le certificat et sa clé, copiés depuis l\'ancien serveur, sont dans un Secret du cluster. Le cadenas s\'affiche. Rien à signaler.</p>'}`,
      choix: [{ t: 'Finir la semaine', vers: 'depart' }],
    },

    depart: {
      jour: 'Vendredi, semaine 20',
      heure: '17 h 10',
      texte: (s) => `
<p>Ton sac est prêt, ta tenue dans sa housse. Le train est à 18 h 10.</p>
<p>${s.f.DNS === 'casse'
    ? 'Ce matin t\'a appris une chose : vu de l\'intérieur, tout allait bien. C\'est de l\'extérieur que le site était cassé, et rien ne regarde le site de l\'extérieur.'
    : 'Une idée te retient. Toutes tes alertes regardent le cluster de l\'intérieur. Rien ne vérifie ce que voit un client depuis chez lui : le nom de domaine, le certificat, la page.'}</p>
<p>Poser une sonde externe, chez un autre hébergeur, avec une alerte sur la date du certificat : une demi-heure. Tu arriverais à la gare en courant.</p>`,
      choix: [
        { t: 'Poser la sonde externe avant de partir', vers: (s) => (s.f.CERT === 'copie' ? 'alerte_exp' : 'dimanche_calme'), fx: { instruments: ['METRICS'], f: { SONDE: true } } },
        { t: 'Partir : ça attendra lundi', vers: dimanche },
      ],
    },

    alerte_exp: {
      jour: 'Vendredi, semaine 20',
      heure: '17 h 40',
      texte: () => `
${code(`
- alert: CertificatBientotExpire
  expr: probe_ssl_earliest_cert_expiry - time() < 14 * 86400
`)}
<p>Tu enregistres la règle. Elle sonne dans la seconde.</p>
<p>Le certificat que tu as copié hier dans le cluster expire dimanche à 15 h 02. Il aurait dû être renouvelé depuis quatre semaines : le cron de Bastien échoue chaque nuit depuis la migration, sans que personne le sache.</p>
<p>Dimanche à 15 h, tu seras en train de tenir les alliances.</p>
<p>Il est 17 h 40. Ton train part dans une demi-heure.</p>`,
      choix: [
        { t: 'Installer cert-manager avec une validation DNS, maintenant, et prendre le train suivant', vers: 'dimanche_calme', fx: { energie: -1, confiance: 1, f: { CERT: 'dns' } } },
        { t: 'Renouveler à la main en vingt minutes et courir à la gare', vers: 'dimanche_calme', fx: { codes: ['MANUAL_CERT'], dette: 1, f: { CERT: 'manuel' } } },
      ],
    },

    dimanche_calme: {
      jour: 'Dimanche, semaine 20',
      heure: '15 h 02',
      fin: (s) => (s.f.DNS === 'casse' ? 'ttl' : 'bascule'),
      texte: (s) => `
<p>Le vin d'honneur. Quelqu'un te tend une coupe. Ton téléphone est dans ta poche intérieure, et il n'a pas vibré depuis vendredi.</p>
<p>${s.f.SONDE
    ? 'Quelque part chez un autre hébergeur, une sonde charge la page d\'accueil de Panier Vif toutes les minutes et vérifie la date du certificat. Si elle se taisait, tu le saurais aussi.'
    : 'Tu supposes que tout va bien. Personne ne t\'a appelé, et c\'est le seul indicateur que tu aies.'}</p>
<p>${a(s, 'MANUAL_CERT')
    ? 'Le certificat tient jusqu\'au printemps. Tu as mis un rappel dans ton agenda, entre deux autres rappels.'
    : 'Le certificat se renouvellera sans toi dans soixante jours, et les fois suivantes.'}</p>`,
    },

    dimanche_expire: {
      jour: 'Dimanche, semaine 20',
      heure: '15 h 40',
      entree: () => ({ prod: -3, horlogeFixe: 38 }),
      texte: () => `
<p>Le vin d'honneur. Ton téléphone vibre. Malik. Tu laisses sonner. Il rappelle. Tu t'écartes.</p>
<p>« Le site affiche une page rouge. Connexion non sécurisée. Chez tout le monde. Depuis une demi-heure. »</p>
<p>Tu ouvres le site sur ton téléphone. Le certificat a expiré à 15 h 02. Celui que tu as copié jeudi dans le cluster, sans regarder sa date. Il aurait dû être renouvelé depuis quatre semaines : le cron de Bastien échoue chaque nuit depuis la migration.</p>
<p>Les navigateurs ne proposent même pas de continuer. Panier Vif est fermé, un dimanche après-midi, et tu es à 400 kilomètres avec une fleur à la boutonnière.</p>`,
      choix: [
        { t: 'T\'enfermer dans la voiture avec ton ordinateur', vers: 'voiture' },
        { t: 'Appeler Inès et la guider par téléphone', vers: 'ines' },
        { t: 'Répondre que tu t\'en occupes ce soir, après la cérémonie', vers: 'ce_soir' },
      ],
    },

    voiture: {
      jour: 'Dimanche, semaine 20',
      heure: '16 h 30',
      fin: 'expire',
      entree: () => ({ energie: -2, codes: ['MANUAL_CERT'], horloge: 50, dette: 1 }),
      texte: () => `
<p>Tu avais pris ton ordinateur, « au cas où ». Sur le siège passager, en partage de connexion, tu lances <code>certbot</code> en mode manuel, tu ajoutes l'enregistrement de validation dans la zone, tu copies le nouveau certificat dans le cluster.</p>
<p>Cinquante minutes. Le cadenas revient à 16 h 30.</p>
<p>Quand tu retournes dans la salle, les discours sont finis. Le tien, tu devais le prononcer en deuxième. Quelqu'un l'a lu à ta place, sur une feuille.</p>
${capot('Tu as réparé, à la main et à tes frais. Rien n\'a changé pour autant : dans 90 jours, ce certificat expirera de nouveau, et il dépendra encore de ta mémoire et de ta présence.')}`,
    },

    ines: {
      jour: 'Dimanche, semaine 20',
      heure: (s) => (a(s, 'RUNBOOK') ? '16 h 05' : '16 h 40'),
      fin: 'expire',
      entree: (s) => (a(s, 'RUNBOOK')
        ? { codes: ['MANUAL_CERT'], horloge: 25, confiance: 1, dette: 1 }
        : { codes: ['MANUAL_CERT'], horloge: 60, prod: -1, energie: -1, dette: 1 }),
      texte: (s) => `
<p>Inès décroche tout de suite. Elle a vu les messages.</p>
${a(s, 'RUNBOOK')
    ? '<p>« Dis-moi juste où c\'est écrit. » Depuis le premier vendredi, vous notez les procédures. Tu lui indiques celle du certificat, rédigée jeudi. Elle la suit ligne à ligne, te rappelle une seule fois pour confirmer une commande. À 16 h 05, le cadenas est revenu.</p><p>Tu n\'as raté que dix minutes de la fête.</p>'
    : '<p>Rien n\'est écrit nulle part. Tu lui dictes les commandes de mémoire, dans le bruit, un doigt dans l\'oreille. Elle se trompe de domaine une fois, toi d\'option une autre. À 16 h 40, le cadenas revient.</p><p>Tu as passé une heure au téléphone sur un parking. Elle a passé son dimanche à avoir peur de tout casser.</p>'}
${capot('Ce qui a décidé de la durée de la panne n\'est pas la compétence d\'Inès. C\'est l\'existence, ou non, d\'une procédure écrite avant le jour où on en a besoin.')}`,
    },

    ce_soir: {
      jour: 'Dimanche, semaine 20',
      heure: '22 h 30',
      fin: 'expire',
      entree: () => ({ prod: -3, confiance: -3, codes: ['MANUAL_CERT'], energie: -1, horlogeFin: true, dette: 1 }),
      texte: () => `
<p>« Je suis à un mariage. Je regarde ce soir. »</p>
<p>Un silence. « Ce soir. D'accord. »</p>
<p>Tu ranges ton téléphone. Tu n'entends rien du discours suivant.</p>
<p>À 22 h 30, depuis ta chambre d'hôtel, tu renouvelles le certificat à la main. Le site a été inaccessible sept heures et demie, un dimanche. Hugo t'a écrit trois fois. Le dernier message tient en un mot : « Lundi. »</p>
${capot('Ton week-end était légitime. Mais personne d\'autre ne savait renouveler ce certificat, et tu le savais en partant. Le problème n\'est pas d\'avoir refusé de quitter la fête. C\'est d\'être la seule personne capable de réparer.')}`,
    },
  };

  racine.CHAPITRES.fr.push({
    id: 'ch9',
    numero: 9,
    titre: 'C\'est toujours le DNS',
    techno: 'DNS et TLS',
    jour: 'Jeudi, semaine 20',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['RUNBOOK'], instruments: ['METRICS'] },
      { energie: 2, confiance: 2 },
    ],
    fins: {
      bascule: {
        titre: 'Personne n\'a rien vu',
        texte: 'Le domaine pointe au bon endroit, le certificat est valide, et tu as dansé sans regarder ton téléphone.',
      },
      ttl: {
        titre: 'Vingt-quatre heures',
        texte: 'Le changement était juste. C\'est l\'ancien serveur, éteint trop tôt, qui manquait à tous ceux dont le cache n\'avait pas encore expiré.',
      },
      expire: {
        titre: 'Notre invité s\'excuse',
        texte: 'La date était écrite dans le certificat. Personne ne l\'a lue, et elle est tombée pendant les discours.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
