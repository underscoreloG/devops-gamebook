/* Chapitre 5 : ça marche sur ma machine. Docker, images, secrets, logs. */
(function (racine) {
  'use strict';

  const { code, capot, hm, a, outil } = racine.RECIT;

  const heure = (s) => hm(16, 4 + (s.horloge || 0));

  /* Le Dockerfile affiché dépend des quatre décisions du lecteur */
  function dockerfile(s) {
    const base = s.f.BASE === 'latest' ? 'python:latest'
      : s.f.BASE === 'tag' ? 'python:3.12-slim'
        : 'python:3.12-slim@sha256:2f1c0e...';
    const secret = s.f.SECRET === 'copy' ? 'COPY .env .\n'
      : s.f.SECRET === 'arg' ? 'ARG PAYLOIRE_SECRET_KEY\nENV PAYLOIRE_SECRET_KEY=$PAYLOIRE_SECRET_KEY\n'
        : '';
    return 'FROM ' + base + '\n'
      + 'WORKDIR /app\n'
      + 'COPY requirements.txt .\n'
      + 'RUN pip install --no-cache-dir -r requirements.txt\n'
      + 'COPY . .\n'
      + secret
      + (s.f.SECRET === 'copy' ? 'RUN python manage.py collectstatic --noinput && rm .env\n' : 'RUN python manage.py collectstatic --noinput\n')
      + (s.f.ROOT ? '' : 'RUN useradd --system app && chown -R app /app\nUSER app\n')
      + 'CMD ["gunicorn", "paniervif.wsgi", "--bind", "0.0.0.0:8000"'
      + (s.f.LOGS === 'fichier' ? ', "--error-logfile", "/app/logs/app.log"]' : ', "--error-logfile", "-"]');
  }

  const noeuds = {

    debut: {
      heure: '9 h 30',
      entree: () => ({ energie: 1 }),
      texte: () => `
<p>Trois semaines sans incident. Tu as dormi, et ça se voit.</p>
<p>Malik veut passer l'API en conteneurs avant la fin du mois : dans deux mois, Panier Vif aura un cluster, et il veut que le terrain soit prêt. Théo a pris les devants. Il te montre son Dockerfile avec une fierté prudente.</p>
${code(`
FROM python:latest
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
`)}
<p>« Ça marche sur ma machine. L'image fait 1,9 Go, mais elle marche. »</p>
<p>Malik, par-dessus la cloison : « Avant de merger quoi que ce soit, on fait un atelier. Cet après-midi, deux heures, toute l'équipe technique. On décide de notre stratégie conteneurs. »</p>`,
      choix: [
        { t: 'Accepter l\'atelier de deux heures', vers: 'atelier' },
        { t: 'Écrire une page avec les quatre décisions à prendre, et proposer trente minutes de review demain', vers: 'page' },
        { t: 'Merger le Dockerfile de Théo tel quel : il marche, on améliorera', vers: 'merge_brut' },
      ],
    },

    atelier: {
      heure: '16 h 00',
      entree: () => ({ energie: -1, f: { ATELIER: true } }),
      texte: () => `
<p>Six personnes, deux heures, un tableau blanc. On parle d'orchestrateurs, de registries privés, d'un article que Hugo a lu sur le serverless. Théo n'ose pas montrer son Dockerfile.</p>
<p>À 16 h, le tableau porte trois lignes : « image de base : à creuser », « secrets : à creuser », « logs : voir avec Bastien à son retour ».</p>
<p>Personne n'a décidé quoi que ce soit. C'est donc toi qui décideras, demain, devant le fichier.</p>
${capot('Un atelier sans document de départ produit des sujets, pas des décisions. Deux heures à six, c\'est une journée et demie de travail. La même discussion, avec une page de propositions lue à l\'avance, tient en trente minutes.')}`,
      choix: [{ t: 'Reprendre le Dockerfile, première décision', vers: 'd_base' }],
    },

    page: {
      heure: '11 h 00',
      entree: () => ({ confiance: 1 }),
      texte: () => `
<p>« Donne-moi jusqu'à demain. J'écris une page : quatre décisions, les options pour chacune, ce que je recommande. Vous la lisez, on tranche en trente minutes. »</p>
<p>Malik réfléchit. « Et si on n'est pas d'accord ? »</p>
<p>« Alors on saura précisément sur quoi. »</p>
<p>Tu ouvres un document. Quatre titres : l'image de base, les secrets, les logs, l'utilisateur. Théo s'assoit à côté de toi.</p>`,
      choix: [{ t: 'Première décision : l\'image de base', vers: 'd_base' }],
    },

    merge_brut: {
      heure: '9 h 45',
      entree: () => ({ dette: 3, codes: ['SECRET_IN_IMAGE'], f: { BASE: 'latest', SECRET: 'copy', LOGS: 'fichier', ROOT: true, BRUT: true } }),
      texte: () => `
<p>« Il marche, on merge. On améliorera en route. »</p>
<p>Théo sourit jusqu'aux oreilles. Malik annule son atelier, soulagé. À 9 h 45, l'image est construite par le pipeline et poussée dans le registry.</p>
<p>Tu n'as pas regardé ce que <code>COPY . /app</code> embarque. Le dossier de Théo contient un fichier <code>.env</code>, avec la clé de l'API de paiement. Elle est maintenant dans une image que tout le pipeline peut télécharger.</p>
<p>L'application tourne en root, écrit ses logs dans le conteneur, et repose sur <code>python:latest</code>.</p>`,
      choix: [{ t: 'Trois semaines plus tard', vers: 'casse' }],
    },

    d_base: {
      heure: (s) => (s.f.ATELIER ? '9 h 30' : '11 h 15'),
      jour: (s) => (s.f.ATELIER ? 'Mardi, semaine 9' : null),
      texte: () => `
<p>Première ligne du fichier : sur quelle image construire. Théo a mis <code>python:latest</code>. « Comme ça, on a toujours la dernière version. »</p>
<p>Trois options sur la table :</p>
${code(`
FROM python:latest
FROM python:3.12-slim
FROM python:3.12-slim@sha256:2f1c0e...
`)}
<p>La troisième épingle l'image à l'octet près. Elle demande de mettre en place un robot qui propose les mises à jour, sans quoi personne ne les fera jamais.</p>`,
      choix: [
        { t: 'Garder python:latest : toujours à jour', vers: 'd_secret', fx: { f: { BASE: 'latest' } } },
        { t: 'Passer à python:3.12-slim : une version choisie', vers: 'd_secret', fx: { f: { BASE: 'tag' } } },
        { t: 'Épingler par digest et installer le robot de mises à jour (une heure)', vers: 'd_secret', fx: { f: { BASE: 'digest' } } },
      ],
    },

    d_secret: {
      heure: (s) => (s.f.ATELIER ? '10 h 00' : '11 h 45'),
      jour: (s) => (s.f.ATELIER ? 'Mardi, semaine 9' : null),
      texte: (s) => `
${s.f.BASE === 'latest'
    ? '<p>Tu gardes <code>latest</code>. Le fichier est plus court, et Théo est content.</p>'
    : s.f.BASE === 'tag'
      ? '<p>Va pour <code>3.12-slim</code>. L\'image tombe à 210 Mo. Le tag peut encore bouger d\'un patch à l\'autre, mais plus d\'une version à l\'autre.</p>'
      : '<p>Tu épingles le digest et tu branches le robot. Sa première proposition arrive dix minutes plus tard, dans une pull request que quelqu\'un devra lire.</p>'}
<p>Deuxième décision. L'application a besoin de la clé de l'API de paiement, <code>PAYLOIRE_SECRET_KEY</code>. Aujourd'hui, elle est dans un fichier <code>.env</code> sur le poste de chaque développeur.</p>
<p>Théo propose de copier le <code>.env</code> dans l'image et de le supprimer à la fin du build. Inès suggère un argument de build, que le pipeline fournirait. Toi, tu as une troisième idée.</p>`,
      choix: [
        { t: 'COPY .env, puis RUN rm .env à la fin : il ne sera plus dans l\'image', vers: 'd_logs', fx: { codes: ['SECRET_IN_IMAGE'], f: { SECRET: 'copy' } } },
        { t: 'ARG et ENV : la clé est fournie par le pipeline au moment du build', vers: 'd_logs', fx: { codes: ['SECRET_IN_IMAGE'], f: { SECRET: 'arg' } } },
        { t: 'Rien dans l\'image : la clé arrive au démarrage du conteneur, avec --env-file sur le serveur', vers: 'd_logs', fx: { f: { SECRET: 'runtime' } } },
      ],
    },

    d_logs: {
      heure: (s) => (s.f.ATELIER ? '10 h 30' : '14 h 00'),
      jour: (s) => (s.f.ATELIER ? 'Mardi, semaine 9' : null),
      texte: (s) => `
${s.f.SECRET === 'copy'
    ? '<p>Le fichier est copié, puis supprimé trois lignes plus bas. Dans le conteneur qui tourne, il n\'y est plus. Tu passes à la suite.</p>' + capot('Une image est un empilement de couches, et chaque instruction en ajoute une. <code>RUN rm .env</code> crée une couche qui masque le fichier ; celle du <code>COPY</code>, juste en dessous, le contient toujours. N\'importe qui ayant l\'image peut l\'extraire.')
    : s.f.SECRET === 'arg'
      ? '<p>Le pipeline passera la clé avec <code>--build-arg</code>. Elle n\'est plus dans le dépôt, c\'est déjà ça. Tu passes à la suite.</p>' + capot('Un <code>ARG</code> recopié dans un <code>ENV</code> est écrit dans la configuration de l\'image. <code>docker inspect</code> l\'affiche en clair à quiconque peut la télécharger. Un secret passé au build reste dans l\'image.')
      : '<p>L\'image ne contient plus aucun secret. La clé vit dans un fichier sur le serveur, lisible par root seul, et Docker la donne au conteneur à son démarrage. La même image peut tourner en staging et en prod.</p>' + capot('Une image se copie, se met en cache et se partage : tout ce qu\'elle contient finit par fuiter. Un secret se donne à l\'exécution. Et si le build lui-même en a besoin, BuildKit sait le monter le temps d\'une instruction, avec <code>RUN --mount=type=secret</code>, sans l\'écrire dans une couche.')}
<p>Troisième décision : les logs. Aujourd'hui, l'application écrit dans <code>/var/log/paniervif/app.log</code>. Tu te souviens de ce fichier.</p>`,
      choix: [
        { t: 'Garder un fichier, dans le conteneur : /app/logs/app.log', vers: 'd_root', fx: { f: { LOGS: 'fichier' } } },
        { t: 'Écrire sur la sortie standard et laisser Docker les garder, avec une taille maximale', vers: 'd_root', fx: { f: { LOGS: 'stdout' } } },
        { t: 'Sortie standard, et collecte vers un endroit central où toute l\'équipe peut chercher (une demi-journée)', vers: 'd_root', fx: { energie: -1, instruments: ['LOGS'], f: { LOGS: 'central' } } },
      ],
    },

    d_root: {
      heure: (s) => (s.f.ATELIER ? '11 h 00' : s.f.LOGS === 'central' ? '18 h 00' : '14 h 30'),
      jour: (s) => (s.f.ATELIER ? 'Mardi, semaine 9' : null),
      texte: (s) => `
${s.f.LOGS === 'fichier'
    ? '<p>Les logs restent dans un fichier, à l\'intérieur du conteneur. Rien ne change pour l\'application.</p>'
    : s.f.LOGS === 'stdout'
      ? '<p>L\'application écrit sur sa sortie standard. Docker conserve les logs sur le serveur, avec <code>--log-opt max-size=50m --log-opt max-file=5</code>. <code>docker logs</code> les affiche, même après un crash.</p>'
      : '<p>Tu installes un collecteur sur chaque serveur. À 18 h, les logs des trois machines arrivent au même endroit, cherchables par tout le monde, gardés quatorze jours. Inès tape le nom d\'un client et retrouve sa commande d\'hier en quatre secondes.</p>'}
<p>Dernière décision. Dans le conteneur, l'application tourne en root. Passer à un utilisateur dédié demande de corriger les droits de deux dossiers. Vingt minutes, peut-être quarante.</p>
<p>« On peut faire ça plus tard, non ? dit Théo. Ça marche déjà. »</p>`,
      choix: [
        { t: 'Laisser root pour l\'instant', vers: 'resultat', fx: { dette: 1, f: { ROOT: true } } },
        { t: 'Créer un utilisateur dédié maintenant', vers: 'resultat' },
      ],
    },

    resultat: {
      heure: (s) => (s.f.ATELIER ? '11 h 45' : '15 h 15'),
      jour: (s) => (s.f.ATELIER || s.f.LOGS === 'central' ? 'Mardi, semaine 9' : null),
      texte: (s) => `
<p>Voici le Dockerfile qui part en review :</p>
${code(dockerfile(s))}
<p>Les dépendances sont installées avant la copie du code : tant que <code>requirements.txt</code> ne change pas, Docker réutilise la couche et le build passe de neuf minutes à quarante secondes. Un <code>.dockerignore</code> écarte le dossier <code>.git</code> et les fichiers locaux.</p>
<p>${a(s, 'SECRET_IN_IMAGE')
    ? 'L\'image est poussée dans le registry. La clé de paiement voyage avec elle, dans chaque copie.'
    : 'L\'image est poussée dans le registry. Elle ne contient rien que tu ne pourrais montrer à un inconnu.'}</p>
<p>Le pipeline la déploie sur les trois serveurs, l'un après l'autre. Personne ne remarque rien.</p>`,
      choix: [{ t: 'Trois semaines plus tard', vers: (s) => (s.f.BASE === 'latest' ? 'casse' : 'calme') }],
    },

    calme: {
      jour: 'Jeudi, semaine 12',
      heure: '16 h 20',
      fin: (s) => (a(s, 'SECRET_IN_IMAGE') || s.f.ROOT || s.f.LOGS === 'fichier' ? 'dette' : 'propre'),
      entree: (s) => (s.f.LOGS === 'fichier' ? { dette: 1 } : {}),
      texte: (s) => `
<p>Un bug de TVA sur les factures : il faut livrer un fix avant 17 h. Le pipeline reconstruit l'image, la déploie. À 16 h 20, c'est en prod.</p>
<p>${s.f.BASE === 'digest'
    ? 'Le robot avait proposé une nouvelle image de base lundi. Inès l\'a relue et mergée mardi, après un passage en staging. Aujourd\'hui, rien n\'a bougé sans que quelqu\'un le décide.'
    : 'Depuis ton choix, le tag <code>3.12-slim</code> a reçu deux mises à jour mineures, que le build a avalées sans prévenir. Rien n\'a cassé. Cette fois.'}</p>
${s.f.LOGS === 'fichier'
    ? '<p>Mardi dernier, un conteneur a redémarré tout seul en pleine nuit. Personne ne sait pourquoi : ses logs étaient dans le conteneur, et ils ont disparu avec lui.</p>'
    : ''}`,
    },

    casse: {
      jour: 'Jeudi, semaine 12',
      heure: heure,
      entree: () => ({ prod: -3, horlogeFixe: 4 }),
      texte: (s) => `
<p>Un bug de TVA sur les factures : il faut livrer un fix avant 17 h. Le pipeline reconstruit l'image, la pousse, et commence à remplacer les conteneurs, serveur par serveur.</p>
<p>Le premier conteneur démarre et s'arrête aussitôt. Le pipeline n'attend pas de savoir s'il va bien : il passe au deuxième serveur. Puis au troisième.</p>
<p>À 16 h 04, plus aucun serveur ne répond. ${outil(s, 'METRICS') ? 'Ton alerte de paiement sonne dans la minute.' : 'Yasmine arrive en courant.'}</p>
<p>Le fix de TVA faisait deux lignes. Tu ne vois pas comment il a pu faire ça.</p>`,
      choix: [
        { t: 'Lire les logs du conteneur qui s\'arrête', vers: 'diag' },
        { t: 'Relancer le pipeline : c\'est peut-être un accident', vers: 'relance' },
        { t: 'Remettre l\'image d\'hier sur les trois serveurs', vers: 'retour_image' },
      ],
    },

    relance: {
      jour: 'Jeudi, semaine 12',
      heure: heure,
      entree: () => ({ horloge: 8 }),
      texte: () => `
<p>Tu relances. Huit minutes de build et de déploiement. Les trois conteneurs démarrent, et s'arrêtent, exactement comme la première fois.</p>
<p>La même image, construite deux fois, casse deux fois de la même façon. Ce n'était pas un accident.</p>`,
      choix: [
        { t: 'Lire les logs du conteneur qui s\'arrête', vers: 'diag' },
        { t: 'Remettre l\'image d\'hier sur les trois serveurs', vers: 'retour_image' },
      ],
    },

    diag: {
      jour: 'Jeudi, semaine 12',
      heure: heure,
      entree: (s) => ({ horloge: s.f.LOGS === 'central' ? 1 : s.f.LOGS === 'stdout' ? 3 : 20, f: { DIAG: true } }),
      texte: (s) => `
${s.f.LOGS === 'central'
    ? '<p>Tu n\'as pas le temps d\'ouvrir un terminal. Inès a déjà collé la ligne dans #incident, trouvée dans les logs centralisés :</p>'
    : s.f.LOGS === 'stdout'
      ? '<p><code>docker logs</code> sur le conteneur arrêté. La réponse est à la dernière ligne :</p>'
      : '<p><code>docker logs</code> ne montre rien : l\'application écrit dans un fichier, à l\'intérieur d\'un conteneur qui s\'arrête et que le pipeline remplace. Chaque tentative efface les traces de la précédente.</p><p>Il te faut vingt minutes pour lancer l\'image à la main, avec un shell à la place de l\'application, et reproduire l\'erreur sous tes yeux :</p>'}
${code(`
  File "/usr/local/lib/python3.13/site-packages/vieuxpdf/compat.py", line 3, in <module>
    import cgi
ModuleNotFoundError: No module named 'cgi'
`)}
<p>Python 3.13. Personne n'a décidé de passer à Python 3.13. <code>python:latest</code> l'a fait tout seul, et la bibliothèque qui fabrique les factures utilise un module que cette version a supprimé.</p>
${capot('<code>latest</code> n\'est pas une version, c\'est une étiquette que l\'éditeur déplace quand il veut. Le même Dockerfile, construit à trois semaines d\'écart, a donné deux images différentes. Le fix de deux lignes n\'y était pour rien : il a seulement déclenché un nouveau build.')}`,
      choix: [
        { t: 'Remettre l\'image d\'hier sur les trois serveurs', vers: 'retour_image' },
        { t: 'Corriger le Dockerfile en python:3.12-slim, reconstruire et redéployer', vers: 'epingle' },
      ],
    },

    retour_image: {
      jour: 'Jeudi, semaine 12',
      heure: heure,
      fin: 'latest',
      entree: (s) => {
        const total = s.horloge + 4;
        return { horloge: 4, prod: total >= 30 ? -1 : 0, confiance: s.f.DIAG ? 1 : 0, dette: s.f.DIAG ? 0 : 1 };
      },
      texte: (s) => `
<p>L'image d'hier est toujours dans le registry, sous son propre numéro. Tu la redéploies telle quelle sur les trois serveurs. Quatre minutes plus tard, le site répond.</p>
<p>${s.horloge} minutes de panne complète.</p>
${s.f.DIAG
    ? '<p>Tu sais pourquoi ça a cassé. Tu épingles l\'image de base dans la foulée, et le fix de TVA repart à 17 h 10, sur Python 3.12.</p>'
    : '<p>Tu ne sais pas encore pourquoi la nouvelle image casse. Le fix de TVA attendra demain, le temps de comprendre. Malik n\'aime pas « demain ».</p>'}
${capot('Une image construite hier fonctionne aujourd\'hui exactement comme hier. C\'est tout l\'intérêt : revenir en arrière ne demande ni de comprendre ni de reconstruire, seulement de garder les anciennes images et de savoir laquelle tournait.')}`,
    },

    epingle: {
      jour: 'Jeudi, semaine 12',
      heure: heure,
      fin: 'latest',
      entree: (s) => ({ horloge: 15, prod: s.horloge + 15 >= 30 ? -1 : 0 }),
      texte: (s) => `
<p>Tu remplaces <code>latest</code> par <code>3.12-slim</code>, tu pousses, tu attends le build, puis le déploiement. Quinze minutes de plus, pendant lesquelles le site reste éteint.</p>
<p>${s.horloge} minutes de panne complète. Le fix de TVA, au moins, est parti avec.</p>
${capot('La correction était la bonne, dans le mauvais ordre. L\'image de la veille était disponible et se remettait en quatre minutes. On rétablit le service d\'abord, on corrige ensuite, sans personne qui attend.')}`,
    },
  };

  racine.CHAPITRES.fr.push({
    id: 'ch5',
    numero: 5,
    titre: 'Ça marche sur ma machine',
    techno: 'Docker',
    jour: 'Lundi, semaine 9',
    debut: 'debut',
    noeuds: noeuds,
    essais: [{ instruments: ['METRICS'], energie: 2 }],
    fins: {
      propre: {
        titre: 'Une image qu\'on peut montrer',
        texte: 'Version choisie, aucun secret, des logs qui survivent au conteneur, pas de root. Le fix de TVA est passé sans que personne retienne son souffle.',
      },
      dette: {
        titre: 'Ça marche, pour l\'instant',
        texte: 'Rien n\'a cassé. Mais l\'image emporte avec elle au moins une décision repoussée, et elle la gardera jusqu\'à ce que quelqu\'un s\'en souvienne.',
      },
      latest: {
        titre: 'Toujours à jour',
        texte: 'Personne n\'avait décidé de changer de version de Python. L\'étiquette l\'a fait à votre place, le jour où il fallait livrer vite.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
