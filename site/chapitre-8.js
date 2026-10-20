/* Chapitre 8 : la grande migration. Kubernetes, ressources, sondes, contextes. */
(function (racine) {
  'use strict';

  const { code, capot, a, outil } = racine.RECIT;

  const grave = (s) => s.f.RES === 'rien' || s.f.SONDE === 'db';
  const quand = (s) => (s.f.QUAND === 'nuit' ? ['Lundi, semaine 18', '23 h'] : s.f.QUAND === 'matin' ? ['Mardi, semaine 18', '7 h'] : ['Mardi, semaine 18', '14 h']);
  const jourBascule = (s) => quand(s)[0];
  const heureBascule = (suffixe) => (s) => quand(s)[1] + ' ' + suffixe;

  const noeuds = {

    debut: {
      heure: '10 h 00',
      texte: () => `
<p>Le cluster Kubernetes est prêt. Trois nœuds, loués chez le même hébergeur que les anciens serveurs. Cette semaine, l'API y déménage.</p>
<p>Le plan tient en une ligne : les deux mondes tourneront côte à côte, et le load balancer enverra 5 % du trafic vers le cluster, puis 25 %, puis tout.</p>
<p>Tu en parles à Malik. « Très bien. Annonce-le au point hebdo de 11 h, comme ça tout le monde est au courant. »</p>
<p>Le point hebdo, c'est douze personnes pendant une heure. Chacun raconte sa semaine. La moitié de la salle lit ses mails.</p>`,
      choix: [
        { t: 'Annoncer la migration au point hebdo', vers: 'hebdo' },
        { t: 'Organiser à la place un go/no-go de vingt minutes, avec une checklist', vers: 'gonogo' },
        { t: 'Ne rien organiser : c\'est une migration technique, personne ne verra rien', vers: 'm_ressources', fx: { f: { ANNONCE: 'rien' } } },
      ],
    },

    hebdo: {
      heure: '12 h 00',
      entree: () => ({ f: { ANNONCE: 'hebdo' } }),
      texte: () => `
<p>Tu passes en neuvième position, entre le planning des tournées et la refonte de la page d'accueil. « Cette semaine, on migre l'API sur Kubernetes. Ça devrait être transparent. »</p>
<p>Deux personnes hochent la tête. Yasmine, du support, est en train de répondre à un client sur son téléphone. Personne ne pose de question.</p>
<p>Tout le monde est « au courant ». Personne ne sait quel jour, à quelle heure, ni quoi faire si ça se passe mal.</p>`,
      choix: [{ t: 'Écrire les manifests', vers: 'm_ressources' }],
    },

    gonogo: {
      heure: '11 h 40',
      entree: (s) => (a(s, 'NO_ROLLBACK')
        ? { confiance: 1, energie: -1, retire: ['NO_ROLLBACK'], f: { ANNONCE: 'gonogo', PLAN_RETOUR: true } }
        : { confiance: 1, f: { ANNONCE: 'gonogo' } }),
      texte: (s) => `
<p>Vingt minutes, quatre personnes : Malik, Inès, Yasmine et toi. Une checklist à l'écran. Quand ? Qui regarde quoi ? Que dit le support si un client appelle ? Comment revient-on en arrière ?</p>
${s.f.PLAN_RETOUR
    ? '<p>La dernière question laisse un blanc. Personne n\'a jamais testé un retour en arrière ici. Tu écris la réponse séance tenante : les anciens serveurs restent allumés une semaine, et revenir en arrière consiste à remettre leur poids à 100 % dans le load balancer. Tu l\'essaies en staging dans l\'après-midi. Deux minutes, montre en main.</p>'
    : '<p>La dernière question a une réponse depuis le jour où tu as essayé le bouton rollback : les anciens serveurs restent allumés une semaine, et revenir en arrière consiste à remettre leur poids à 100 % dans le load balancer.</p>'}
<p>Yasmine note l'heure de la bascule et une phrase à dire aux clients. Malik dit « go ».</p>
${capot('Un go/no-go n\'est pas une réunion d\'information, c\'est une réunion de décision : peu de monde, une liste de questions fermées, et une seule sortie possible, oui ou non. Celle qui compte le plus est toujours la dernière : comment revient-on en arrière ?')}`,
      choix: [{ t: 'Écrire les manifests', vers: 'm_ressources' }],
    },

    m_ressources: {
      heure: '14 h 00',
      texte: () => `
<p>Tu écris le Deployment de l'API. Première question : combien de mémoire et de CPU chaque pod réclame, et jusqu'où il a le droit d'aller.</p>
<p>Sur le même cluster tournera aussi le worker qui fabrique les factures en PDF. Il est connu pour sa gourmandise.</p>
${code(`
# Option 1
resources: {}

# Option 2
resources:
  requests: { cpu: 250m, memory: 384Mi }
  limits:   { memory: 512Mi }

# Option 3
resources:
  requests: { cpu: 250m, memory: 384Mi }
  limits:   { cpu: 500m, memory: 512Mi }
`)}`,
      choix: [
        { t: 'Option 1 : rien pour l\'instant, on ajustera en regardant la consommation réelle', vers: 'm_sondes', fx: { f: { RES: 'rien' } } },
        { t: 'Option 2 : des requests, une limite mémoire, pas de limite CPU', vers: 'm_sondes', fx: { f: { RES: 'bon' } } },
        { t: 'Option 3 : requests et limites partout, CPU compris', vers: 'm_sondes', fx: { f: { RES: 'cpu' } } },
      ],
    },

    m_sondes: {
      heure: '14 h 30',
      texte: (s) => `
<p>${s.f.RES === 'rien'
    ? 'Tu laisses le bloc vide. Kubernetes placera les pods où il veut, sans rien leur garantir.'
    : s.f.RES === 'bon'
      ? 'Chaque pod a une part réservée, et un plafond mémoire au-delà duquel il sera tué plutôt que d\'étouffer ses voisins.'
      : 'Chaque pod est enfermé dans sa case, mémoire et CPU. Ça a l\'air rigoureux.'}</p>
<p>Deuxième question : comment Kubernetes sait-il qu'un pod va bien ? L'application a déjà une route <code>/health</code>, qui fait un <code>SELECT 1</code> sur la base. Inès peut en ajouter d'autres en dix minutes.</p>
${code(`
# Option 1
livenessProbe:
  httpGet: { path: /health, port: 8000 }

# Option 2
livenessProbe:
  httpGet: { path: /livez, port: 8000 }     # le processus répond
readinessProbe:
  httpGet: { path: /readyz, port: 8000 }    # la base et le cache répondent

# Option 3 : aucune sonde
`)}`,
      choix: [
        { t: 'Option 1 : la liveness sur /health, un pod coupé de la base doit redémarrer', vers: 'bascule', fx: { f: { SONDE: 'db' } } },
        { t: 'Option 2 : /livez pour la liveness, /readyz pour la readiness', vers: 'bascule', fx: { f: { SONDE: 'bon' } } },
        { t: 'Option 3 : pas de sonde pour l\'instant, ça marche sans', vers: 'bascule', fx: { dette: 1, f: { SONDE: 'rien' } } },
      ],
    },

    bascule: {
      heure: '16 h 00',
      texte: (s) => `
<p>${s.f.SONDE === 'db'
    ? 'Tu branches la liveness sur <code>/health</code>. Si un pod ne joint plus la base, Kubernetes le redémarrera.'
    : s.f.SONDE === 'bon'
      ? 'Inès ajoute les deux routes. La liveness ne teste que le processus. La readiness teste les dépendances : un pod qui ne joint plus la base sort du trafic, sans être tué.'
      : 'Pas de sonde. Kubernetes considérera qu\'un pod est prêt dès que son conteneur a démarré.'}</p>
<p>Les manifests passent en staging sans histoire. Reste à choisir le moment de la bascule. Le trafic est au plus bas entre 23 h et 6 h.</p>
<p>« Fais-le cette nuit, propose Malik. Comme ça, si ça casse, personne ne voit rien. »</p>`,
      choix: [
        { t: 'Cette nuit à 23 h, en solo', vers: 'nettoyage', fx: { energie: -2, f: { QUAND: 'nuit' } } },
        { t: 'Demain à 7 h, à deux avec Inès', vers: 'nettoyage', fx: { energie: -1, f: { QUAND: 'matin' } } },
        { t: 'Demain à 14 h, en pleine journée, avec toute l\'équipe devant les dashboards', vers: 'nettoyage', fx: { f: { QUAND: 'jour' } } },
      ],
    },

    nettoyage: {
      jour: jourBascule,
      heure: heureBascule('10'),
      texte: (s) => `
<p>${s.f.QUAND === 'nuit'
    ? 'L\'open space est vide. Une seule lampe allumée, la tienne.'
    : s.f.QUAND === 'matin'
      ? 'Inès a apporté les croissants. Elle s\'installe à côté de toi, son écran sur tes dashboards.'
      : 'Malik, Inès et Yasmine ont tiré leurs chaises. Les dashboards sont projetés au mur.'}</p>
<p>Le load balancer envoie 5 % du trafic vers le cluster. Les premiers clients sont servis par des pods. Tout a l'air normal.</p>
<p>En attendant de passer à 25 %, tu veux faire un peu de ménage : supprimer le déploiement d'essai que tu avais laissé en staging la semaine dernière.</p>
${code(`
$ kubectl delete -f api-essai.yaml
`)}
<p>Tu as deux terminaux ouverts, deux clusters. Ton doigt est au-dessus de la touche Entrée.</p>`,
      choix: [
        { t: 'Lancer la commande : c\'est le terminal de staging', vers: (s) => (s.f.QUAND === 'nuit' ? 'erreur_contexte' : 'canari'), fx: { f: { NET: 'lance' } } },
        {
          t: 'Vérifier d\'abord sur quel cluster pointe ce terminal',
          vers: 'canari',
          verrou: (s) => (s.energie >= 3 ? null : 'Il te faut au moins 3 d\'ÉNERGIE. À cette heure-ci, tu ne vérifies plus rien.'),
          fx: { f: { NET: 'verifie' } },
        },
        { t: 'Réécrire la commande avec --context staging, pour ne plus dépendre du terminal', vers: 'canari', fx: { confiance: 1, f: { NET: 'explicite' } } },
      ],
    },

    erreur_contexte: {
      jour: jourBascule,
      heure: heureBascule('14'),
      entree: () => ({ prod: -2, confiance: -1, horlogeFixe: 4 }),
      texte: () => `
${code(`
$ kubectl delete -f api-essai.yaml
deployment.apps "api" deleted
service "api" deleted

$ kubectl config current-context
paniervif-prod
`)}
<p>Ce n'était pas le terminal de staging. Et ton fichier d'essai portait les mêmes noms que la prod.</p>
<p>Sur le cluster, l'API n'existe plus. Les 5 % de clients qui y étaient envoyés reçoivent des erreurs. Tu réappliques les manifests, les mains moites : images à télécharger, pods à démarrer. Quatre minutes.</p>
<p>Personne n'était là pour te demander « tu es sur quel cluster ? ».</p>
${capot('<code>kubectl</code> agit sur le dernier contexte choisi, sans le rappeler. Seul, tard et fatigué, on ne vérifie pas. Les protections qui marchent ne comptent pas sur la vigilance : un <code>--context</code> écrit dans chaque commande, un prompt qui affiche le cluster en rouge, des droits de suppression retirés en prod.')}`,
      choix: [{ t: 'Reprendre la bascule', vers: 'canari', fx: { horlogeFin: true } }],
    },

    canari: {
      jour: jourBascule,
      heure: heureBascule('30'),
      texte: (s) => `
${s.f.NET === 'lance' && s.f.QUAND !== 'nuit'
    ? '<p>« Attends. » Inès a posé la main sur ton bras. « Tu es sur quel cluster, là ? »</p><p>Tu vérifies. <code>paniervif-prod</code>. Ton fichier d\'essai porte les mêmes noms que la prod : tu allais supprimer l\'API. Tu retires ta main du clavier, lentement.</p>'
    : s.f.NET === 'verifie'
      ? '<p><code>kubectl config current-context</code> répond <code>paniervif-prod</code>. Ce n\'était pas le terminal de staging. Tu changes de fenêtre, et tu respires.</p>'
      : s.f.NET === 'explicite'
        ? '<p>Avec <code>--context staging</code> dans la commande, peu importe le terminal. Le déploiement d\'essai disparaît du bon cluster. Tu ajoutes l\'option à tous tes alias.</p>'
        : ''}
<p>Vingt minutes à 5 %. Sur le dashboard, le temps de réponse moyen du cluster est de 190 ms, contre 180 ms sur les anciens serveurs. Le taux d'erreur est à zéro.</p>
<p>${outil(s, 'METRICS') ? 'Tes alertes sont silencieuses.' : 'Personne ne s\'est plaint.'} Tout indique qu'on peut continuer.</p>`,
      choix: [
        { t: 'Passer à 25 %, puis à 100 % : la moyenne est bonne', vers: 'apres_canari', fx: { f: { OBS: 'moyenne' } } },
        { t: 'Regarder le p99 avant d\'avancer', vers: 'apres_canari', fx: { f: { OBS: 'p99' } } },
        { t: 'Poser du tracing sur le chemin du paiement avant d\'aller plus loin (deux heures)', vers: 'apres_canari', fx: { energie: -1, instruments: ['TRACES'], f: { OBS: 'traces' } } },
      ],
    },

    apres_canari: {
      jour: jourBascule,
      heure: heureBascule('55'),
      entree: (s) => (s.f.RES === 'cpu' && s.f.OBS !== 'moyenne' ? { confiance: 1, f: { RES: 'bon', CPU_VU: true } } : {}),
      texte: (s) => `
${s.f.CPU_VU
    ? (s.f.OBS === 'traces'
      ? '<p>Les premières traces arrivent. Sur une requête de paiement sur cent, une étape qui ne fait rien, aucun appel, aucune requête SQL, dure quatre secondes. Le code attend. Il attend qu\'on lui rende du CPU.</p>'
      : '<p>La moyenne dit 190 ms. Le p99 dit 4,2 secondes : une requête sur cent est vingt fois plus lente que les autres.</p>')
      + code(`
rate(container_cpu_cfs_throttled_periods_total{pod=~"api-.*"}[5m])
  / rate(container_cpu_cfs_periods_total{pod=~"api-.*"}[5m])
= 0.31
`)
      + '<p>Les pods sont bridés un tiers du temps. Ta limite CPU à 500m les coupe net à chaque pic, même quand le nœud a du CPU libre. Tu retires la limite CPU, tu gardes la request. Le p99 retombe à 240 ms. Tu passes à 25 %, puis à 100 %.</p>'
      + capot('Une moyenne à 190 ms peut cacher un client sur cent qui attend quatre secondes. Ce client-là paie, ou abandonne. Quant à la limite CPU, elle ne protège pas le pod : elle le freine. Beaucoup d\'équipes gardent les requests, qui garantissent une part, et se passent des limites CPU. Le débat est réel, et il se tranche en regardant le p99.')
    : s.f.RES === 'cpu'
      ? '<p>Tu passes à 25 %, puis à 100 %. La moyenne reste sage : 195 ms. Tu éteins les dashboards avec le sentiment du travail bien fait.</p><p>Tu n\'as pas regardé au-delà de la moyenne.</p>'
      : (s.f.OBS === 'moyenne'
        ? '<p>Tu passes à 25 %, puis à 100 %. La moyenne reste sage. Tout le trafic de Panier Vif est servi par le cluster.</p>'
        : s.f.OBS === 'p99'
          ? '<p>Le p99 est à 260 ms : la requête la plus lente sur cent ressemble aux autres. Tu passes à 25 %, puis à 100 %.</p>'
          : '<p>Les traces montrent un chemin de paiement sans surprise : la base, PayLoire, le cache, chacun à sa place et dans ses temps. Tu passes à 25 %, puis à 100 %. Et tu sais désormais où chaque requête passe son temps.</p>')}
<p>Tout le trafic est sur Kubernetes. ${a(s, 'NO_ROLLBACK')
    ? 'Malik propose d\'éteindre les anciens serveurs dès mercredi : 900 euros par mois, autant les économiser tout de suite. Personne n\'objecte.'
    : 'Les anciens serveurs restent allumés une semaine, à 0 % du trafic, au cas où.'}</p>`,
      choix: [{ t: 'Vendredi, 18 h : premier pic de la semaine', vers: 'vendredi' }],
    },

    vendredi: {
      jour: 'Vendredi, semaine 18',
      heure: '18 h 05',
      fin: (s) => (grave(s) ? 'evince' : (s.f.RES === 'cpu' || s.f.SONDE === 'rien') ? 'bride' : 'migre'),
      entree: (s) => {
        const fx = { prod: 0, confiance: 0, dette: 0 };
        if (s.f.RES === 'rien') fx.prod -= 3;
        if (s.f.SONDE === 'db') fx.prod -= 3;
        if (s.f.SONDE === 'rien') fx.prod -= 1;
        if (s.f.RES === 'cpu') { fx.prod -= 2; fx.dette += 1; }
        if (grave(s)) {
          fx.prod += a(s, 'NO_ROLLBACK') ? -1 : 1;
          if (s.f.ANNONCE !== 'gonogo') fx.confiance -= 1;
        }
        return fx;
      },
      texte: (s) => `
<p>Le vendredi soir, tout Nantes commande ses courses du week-end.</p>
${s.f.RES === 'rien'
    ? '<p>À 18 h 02, le worker des factures avale 6 Go de mémoire pour un export mensuel. Le nœud suffoque. Kubernetes doit faire de la place, et il commence par ceux à qui il n\'a rien promis : sans requests, les pods de l\'API sont en bas de la liste. Il les expulse, tous ceux de ce nœud, puis ceux du nœud voisin où le worker a été replacé.</p>' + capot('Un pod sans requests ni limits est classé <code>BestEffort</code> : premier évincé quand la mémoire manque. « On ajustera plus tard » revient à dire au cluster que l\'API est ce qu\'il a de moins important.')
    : ''}
${s.f.SONDE === 'db'
    ? '<p>À 18 h 04, une requête lourde occupe la base pendant quarante secondes. <code>/health</code> ne répond plus à temps. Kubernetes en conclut que tous les pods sont morts, et les redémarre tous en même temps. Au redémarrage, ils se ruent ensemble sur la base, qui ralentit encore, et <code>/health</code> échoue de nouveau. La boucle dure neuf minutes.</p>' + capot('Une liveness qui dépend de la base transforme une base lente en application morte. La liveness répond à une seule question : ce processus est-il coincé ? Les dépendances vont dans la readiness, qui retire le pod du trafic sans le tuer.')
    : ''}
${s.f.SONDE === 'rien'
    ? '<p>Jeudi déjà, à chaque déploiement, des clients ont reçu des erreurs 502 pendant quarante secondes : sans readiness, Kubernetes envoie du trafic aux nouveaux pods avant que l\'application ait fini de démarrer. Ce soir, Inès livre un fix à 18 h, et ça recommence en plein pic.</p>'
    : ''}
${s.f.RES === 'cpu'
    ? '<p>Depuis mardi, le support reçoit le même message, toujours formulé pareil : « c\'est lent, parfois ». Ce soir, au pic, une requête sur cent met plus de quatre secondes, et le paiement abandonne au bout de trois. Tes pods sont bridés par leur limite CPU. La moyenne, elle, est toujours excellente.</p>'
    : ''}
${grave(s)
    ? (a(s, 'NO_ROLLBACK')
      ? '<p>« On repasse sur les anciens serveurs ! » crie Malik. Ils sont éteints depuis mercredi. Il faut les rallumer, les redéployer, vérifier. Personne n\'avait essayé. L\'incident dure le temps de comprendre et de corriger sur place.</p>'
      : '<p>Tu remets le poids des anciens serveurs à 100 % dans le load balancer. Deux minutes plus tard, le site répond de nouveau, et tu peux chercher la cause sans personne qui attend.</p>')
      + (s.f.ANNONCE !== 'gonogo' ? '<p>Yasmine découvre la migration en même temps que la panne. « Personne ne m\'a dit que c\'était cette semaine. Je réponds quoi aux clients ? »</p>' : '<p>Yasmine a déjà sa phrase prête pour les clients. Elle l\'avait notée lundi.</p>')
    : ''}
${!grave(s) && s.f.RES !== 'cpu' && s.f.SONDE !== 'rien'
    ? '<p>Le worker des factures avale ses 6 Go habituels, atteint sa propre limite, et se fait redémarrer tout seul. Une requête lourde ralentit la base quarante secondes : les pods sortent du trafic le temps que ça passe, puis y reviennent. Le dashboard ondule à peine.</p><p>Le cluster a encaissé son premier vendredi. Personne ne t\'écrit.</p>'
    : ''}`,
    },
  };

  racine.CHAPITRES.push({
    id: 'ch8',
    numero: 8,
    titre: 'La grande migration',
    techno: 'Kubernetes',
    jour: 'Lundi, semaine 18',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['NO_ROLLBACK'], energie: 3, confiance: 2 },
      { instruments: ['METRICS', 'LOGS'], energie: 2 },
    ],
    fins: {
      migre: {
        titre: 'Le premier vendredi',
        texte: 'Le cluster a pris un pic, un voisin gourmand et une base lente sans que personne s\'en aperçoive. C\'était le but.',
      },
      bride: {
        titre: 'C\'est lent, parfois',
        texte: 'Rien n\'est tombé. Mais une partie des clients paie le prix d\'un réglage que la moyenne ne montre pas.',
      },
      evince: {
        titre: 'En bas de la liste',
        texte: 'Le cluster a fait exactement ce que les manifests lui demandaient. Ce sont les manifests qui ne disaient pas ce que tu voulais.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
