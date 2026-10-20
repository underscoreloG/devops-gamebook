/* Chapitre 12 : samedi, 20 h 50. La campagne nationale : tout ce qui a été semé se récolte ici. */
(function (racine) {
  'use strict';

  const { code, capot, a } = racine.RECIT;

  const apresCharge = (s) => (s.f.CHARGE ? 'test' : 'vacances');
  const apresPub = (s) => (s.f.CHARGE ? 'final' : s.f.VAC === 'prepare' ? 'ines_gere' : 'sature');
  const MINUTES = [25, 12, 6, 3];

  const noeuds = {

    debut: {
      heure: '10 h 00',
      texte: (s) => `
<p>Hugo a réuni toute la boîte. Derrière lui, une diapositive : « Samedi 20 h 50. Une grande chaîne. 4 millions de téléspectateurs. »</p>
<p>La première pub, il y a six mois, avait amené 4 000 visiteurs en 90 secondes. Celle-ci en amènera quarante fois plus.</p>
<p>Malik prend la parole. « Pour ne prendre aucun risque : à partir d'aujourd'hui, on gèle tout. Plus aucune mise en prod jusqu'au lendemain de la pub. Neuf jours, zéro changement. »</p>
<p>Tout le monde se tourne vers toi.</p>`,
      choix: [
        { t: 'Accepter le gel complet : neuf jours sans rien livrer', vers: 'charge', fx: { confiance: 1, f: { GEL: 'total' } } },
        {
          t: 'Proposer mieux qu\'un gel : seulement de petits changements, chacun annulable en deux minutes',
          vers: 'charge',
          verrou: (s) => (a(s, 'NO_ROLLBACK') ? 'Tu n\'as jamais testé un retour en arrière. Tu ne peux pas le promettre devant toute la boîte.' : null),
          fx: { f: { GEL: 'petit' } },
        },
        { t: 'Refuser tout changement d\'habitude : on livre comme toujours', vers: 'charge', fx: { confiance: -1, f: { GEL: 'rien' } } },
      ],
    },

    charge: {
      heure: '11 h 30',
      texte: (s) => `
<p>${s.f.GEL === 'total'
    ? 'Le gel est voté à l\'unanimité. Inès range dans un tiroir trois fix qui attendaient.'
    : s.f.GEL === 'petit'
      ? '« Un gel de neuf jours, c\'est soixante changements qui partiront tous ensemble le lundi d\'après. Je préfère dix petits, que je sais annuler. » Malik se souvient du bouton rollback. Il accepte.'
      : 'Malik n\'insiste pas. Il note quelque chose dans son carnet.'}</p>
<p>Reste la vraie question. Personne n'a jamais envoyé quarante fois le trafic habituel sur ce cluster.</p>
<p>Un test de charge demande une journée de préparation : une copie de la prod, un outil qui simule des clients, une soirée à regarder les courbes. Théo a une autre approche : « Quarante fois plus de trafic, quarante fois plus de pods. L'autoscaling est là pour ça. »</p>`,
      choix: [
        { t: 'Organiser un test de charge mardi soir, sur une copie de la prod', vers: apresCharge, fx: { energie: -1, f: { CHARGE: true } } },
        { t: 'Faire le calcul sur le papier : l\'autoscaling suivra', vers: apresCharge, fx: { f: { CHARGE: false } } },
        { t: 'Doubler le nombre de nœuds du cluster, par sécurité', vers: apresCharge, fx: { f: { CHARGE: false, NOEUDS: true } } },
      ],
    },

    test: {
      jour: 'Mardi, semaine 26',
      heure: '21 h 40',
      texte: () => `
<p>À cinq fois le trafic habituel, tout va bien. À dix fois, tout va bien. À douze fois, le taux d'erreur passe de 0 à 60 % en vingt secondes.</p>
${code(`
FATAL:  sorry, too many clients already
`)}
<p>Ce n'est pas le cluster qui cède. L'autoscaling a fait exactement son travail : il est passé de 6 à 40 pods. Chaque pod garde jusqu'à 20 connexions ouvertes vers la base. 40 fois 20 : 800. PostgreSQL en accepte 200.</p>
<p>Plus on ajoute de pods, plus la base refuse de monde. Samedi, à quarante fois le trafic, ce serait arrivé en direct, deux minutes après la pub.</p>
${capot('Un autoscaling règle le maillon qu\'il surveille, et déplace la charge sur le suivant. Ici, le maillon suivant a un plafond dur. On ne trouve ce genre de plafond qu\'en poussant le système jusqu\'à lui, un soir où personne ne regarde.')}`,
      choix: [
        { t: 'Installer PgBouncer devant la base, en mode transaction', vers: 'vacances', fx: { confiance: 1, f: { POOL: 'bouncer' } } },
        { t: 'Monter max_connections à 1 000', vers: 'vacances', fx: { f: { POOL: 'max' } } },
        { t: 'Plafonner l\'autoscaling à 8 pods', vers: 'vacances', fx: { f: { POOL: 'plafond' } } },
      ],
    },

    vacances: {
      jour: 'Mercredi, semaine 26',
      heure: '9 h 30',
      texte: (s) => `
${s.f.POOL === 'bouncer'
    ? '<p>Tu installes PgBouncer :</p>' + code(`
[databases]
paniervif = host=vif-db-01 port=5432

[pgbouncer]
pool_mode = transaction
max_client_conn = 2000
default_pool_size = 80
`) + '<p>Les pods se connectent à lui, par centaines. Lui ne garde que 80 connexions vers la base, qu\'il prête le temps d\'une transaction. Tu rejoues le test : à quarante fois le trafic, la base ne voit jamais plus de 80 clients.</p>'
    : s.f.POOL === 'max'
      ? '<p>Tu passes <code>max_connections</code> à 1 000 et tu redémarres la base. Le test ne produit plus d\'erreur. Il produit autre chose : avec 800 connexions ouvertes, chacune avec sa mémoire, la base ralentit à mesure qu\'on la sollicite. Les réponses arrivent, de plus en plus tard.</p>'
      : s.f.POOL === 'plafond'
        ? '<p>Tu plafonnes l\'autoscaling à 8 pods : 160 connexions au plus, sous la limite. Le test ne produit plus d\'erreur. À quarante fois le trafic, 8 pods ne suffisent pas : les requêtes font la queue. Le site répond, lentement.</p>'
        : s.f.NOEUDS
          ? '<p>Tu doubles les nœuds. 2 400 euros pour le mois. Le cluster a maintenant de la place pour 80 pods. Personne n\'a vérifié ce que ces 80 pods demanderaient à ce qui se trouve derrière eux.</p>'
          : '<p>Le calcul est vite fait : le cluster peut accueillir 40 pods, l\'autoscaling les créera. Sur le papier, ça tient.</p>'}
<p>Reste une chose que tu repousses depuis une semaine. Tes congés sont posés depuis quatre mois : dix jours, départ vendredi matin. La veille de la pub.</p>
<p>Personne ne t'a demandé de les annuler. Personne ne t'a dit de partir non plus.</p>`,
      choix: [
        { t: 'Annuler tes congés : tu seras là samedi soir', vers: 'samedi', fx: { energie: -2, f: { VAC: 'annule' } } },
        {
          t: 'Partir, après deux jours à préparer Inès : runbooks, répétition jeudi, elle dirige samedi',
          vers: 'samedi',
          fx: { confiance: 1, f: { VAC: 'prepare' } },
        },
        { t: 'Partir comme prévu, en restant joignable', vers: 'samedi', fx: { f: { VAC: 'joignable' } } },
      ],
    },

    samedi: {
      jour: 'Samedi, semaine 26',
      heure: '20 h 50',
      entree: (s) => {
        const fx = { prod: 0, dette: 0, energie: 0, f: {} };
        let n = 0;
        if (s.f.VAC === 'prepare' && !a(s, 'RUNBOOK')) fx.energie -= 1;
        if (a(s, 'MANUAL_CERT')) { fx.prod -= 1; n += 1; }
        if (a(s, 'SECRET_IN_IMAGE')) { fx.prod -= s.f.VAC === 'joignable' ? 3 : 2; n += 1; }
        if (s.f.GEL === 'total') { fx.prod -= 1; fx.dette += 2; n += 1; }
        if (s.f.GEL === 'rien') { fx.prod -= 1; n += 1; }
        if (s.dette >= 5) { fx.prod -= 1; n += 1; fx.f.DETTE_LOURDE = true; }
        if (s.f.POOL === 'max') { fx.prod -= 1; n += 1; }
        if (s.f.POOL === 'plafond') { fx.prod -= 2; n += 1; }
        if (!s.f.CHARGE) n += 1;
        fx.f.EVENEMENTS = n;
        return fx;
      },
      texte: (s) => `
<p>${s.f.VAC === 'annule'
    ? 'Tu es au bureau depuis midi. Ta valise est restée dans l\'entrée, chez toi, pas défaite.'
    : s.f.VAC === 'prepare'
      ? 'Tu es à 800 kilomètres, sur une terrasse. Jeudi, Inès a déroulé toute la soirée à blanc, runbook en main' + (a(s, 'RUNBOOK') ? ', comme vous le faites depuis six mois' : ' : il a fallu en écrire la moitié cette semaine, et tu as attrapé ton train sur les rotules') + '. Ce soir, c\'est elle qui dirige. Ton téléphone est posé face contre la table.'
      : 'Tu es à 800 kilomètres, au restaurant. Ton téléphone est posé à côté de l\'assiette, écran vers le haut.'}</p>
${a(s, 'MANUAL_CERT')
    ? '<p>19 h 10. Le marketing a fait imprimer un QR code dans la pub, vers <code>offre.paniervif.fr</code>. Personne n\'a prévenu l\'équipe technique. Le sous-domaine n\'a pas de certificat, et le tien se fabrique à la main. Les premiers curieux tombent sur un avertissement de sécurité pendant vingt-cinq minutes.</p>'
    : ''}
${a(s, 'SECRET_IN_IMAGE')
    ? '<p>20 h 31. PayLoire désactive automatiquement une clé « détectée dans une image publique ». C\'est la clé de paiement entrée dans l\'image il y a quatre mois, jamais remplacée. Plus aucun paiement ne passe' + (s.f.VAC === 'joignable' ? ', et la seule personne qui sait faire la rotation est au restaurant. Tu la dictes par téléphone, entre le plat et le dessert, pendant trente-cinq minutes.' : '. La rotation prend douze minutes, dix-neuf minutes avant la pub.') + '</p>'
    : ''}
${s.f.GEL === 'total'
    ? '<p>Mercredi, Yasmine a signalé un bug d\'affichage du prix au kilo. Le fix tient en une ligne. Il est gelé, avec soixante autres changements qui partiront tous ensemble lundi. Ce soir, 4 millions de personnes découvrent Panier Vif avec des prix au kilo faux.</p>'
    : s.f.GEL === 'rien'
      ? '<p>Vendredi à 17 h, Théo a livré une refonte du panier, « pour qu\'elle soit prête pour la pub ». Elle a un défaut sur mobile que personne n\'a eu le temps de voir.</p>'
      : ''}
${s.f.DETTE_LOURDE
    ? '<p>Et un des tickets sans date, parmi tous ceux que tu as repoussés depuis six mois, choisit ce soir pour se rappeler à toi : un disque de logs que personne ne fait tourner sur le nouveau worker.</p>'
    : ''}
<p>20 h 50. La pub passe. Trente secondes, une famille, un panier, un logo.</p>
<p>${s.f.CHARGE
    ? (s.f.POOL === 'bouncer'
      ? 'Les visiteurs arrivent par dizaines de milliers. L\'API passe de 6 à 40 pods. PgBouncer encaisse 800 connexions et n\'en montre que 80 à la base.'
      : s.f.POOL === 'max'
        ? 'Les visiteurs arrivent par dizaines de milliers. L\'API passe de 6 à 40 pods, la base accepte leurs 800 connexions, et ralentit sous leur poids. Le paiement met six secondes.'
        : 'Les visiteurs arrivent par dizaines de milliers. L\'autoscaling s\'arrête à 8 pods, comme tu le lui as demandé. Les requêtes font la queue. Le site met huit secondes à répondre, mais il répond.')
    : 'Les visiteurs arrivent par dizaines de milliers. L\'autoscaling fait son travail : 10 pods, 20, 40' + (s.f.NOEUDS ? ', 60' : '') + '.'}</p>`,
      choix: [{ t: '20 h 53', vers: apresPub }],
    },

    sature: {
      jour: 'Samedi, semaine 26',
      heure: (s) => (s.f.VAC === 'joignable' ? '21 h 15' : '20 h 53'),
      entree: (s) => {
        const outils = s.instruments.length;
        return {
          prod: -4 + (outils === 0 ? -1 : 0) + (s.f.VAC === 'joignable' ? -1 : 0),
          confiance: s.f.NOEUDS ? -1 : 0,
          horlogeFixe: MINUTES[outils] + (s.f.VAC === 'joignable' ? 15 : 0),
        };
      },
      texte: (s) => `
<p>Le taux d'erreur passe de 0 à 60 % en vingt secondes. Deux visiteurs sur trois, parmi les dizaines de milliers qui viennent de voir la pub, tombent sur une page d'erreur.</p>
${s.f.VAC === 'joignable'
    ? '<p>Ton téléphone sonne. Malik. Tu sors du restaurant. Il te décrit des courbes que tu ne vois pas, pendant que tu cherches du réseau sur le trottoir. Un quart d\'heure passe avant que tu aies un écran sous les yeux.</p>'
    : ''}
<p>${s.instruments.length === 3
    ? 'Trois minutes suffisent. Les traces montrent que chaque requête attend une connexion à la base. Les logs le disent en toutes lettres. Les metrics affichent 200 connexions sur 200.'
    : s.instruments.length === 2
      ? 'Six minutes pour comprendre, en croisant les deux sources que tu as. Les pods vont bien. C\'est la base qui refuse du monde.'
      : s.instruments.length === 1
        ? 'Douze minutes à tâtonner avec le seul outil que tu aies posé en six mois. Les pods vont bien. C\'est la base qui refuse du monde.'
        : 'Tu n\'as ni logs centralisés, ni metrics, ni traces. Tu ouvres des terminaux un par un, pod par pod. Vingt-cinq minutes avant de tomber sur la ligne qui explique tout.'}</p>
${code(`
FATAL:  sorry, too many clients already
`)}
<p>${s.f.NOEUDS ? '60' : '40'} pods, 20 connexions chacun. PostgreSQL en accepte 200. ${s.f.NOEUDS ? 'Les nœuds ajoutés « par sécurité » ont permis à l\'autoscaling d\'aller encore plus loin dans le mur.' : 'Chaque pod que l\'autoscaling ajoute aggrave les choses.'}</p>`,
      choix: [
        { t: 'Ajouter encore des pods : le site manque de capacité', vers: 'final', fx: { prod: -2, f: { GESTE: 'pods' } } },
        {
          t: 'Plafonner tout de suite l\'autoscaling à 8 pods',
          vers: 'final',
          verrou: (s) => (s.energie >= 2 ? null : 'Il te faut au moins 2 d\'ÉNERGIE. Tu n\'arrives plus à raisonner à l\'envers de ton réflexe.'),
          fx: { confiance: 1, f: { GESTE: 'plafond' } },
        },
        { t: 'Redémarrer la base avec max_connections à 1 000', vers: 'final', fx: { prod: -1, f: { GESTE: 'restart' } } },
      ],
    },

    ines_gere: {
      jour: 'Samedi, semaine 26',
      heure: '20 h 53',
      entree: (s) => ({ prod: -3 + (s.instruments.length === 0 ? -1 : 0), confiance: 1, f: { GESTE: 'ines' } }),
      texte: (s) => `
<p>Le taux d'erreur passe de 0 à 60 % en vingt secondes.</p>
<p>Inès ne t'appelle pas. Elle ouvre le runbook à la page « erreurs en masse après un pic », écrite jeudi. Première ligne : regarder les connexions à la base.</p>
${code(`
FATAL:  sorry, too many clients already
`)}
<p>${s.instruments.length >= 2
    ? 'Elle trouve en quatre minutes, avec les outils que tu as posés au fil des mois.'
    : 'Elle met un quart d\'heure, faute d\'outils pour voir : elle lit les logs pod par pod.'} 40 pods, 20 connexions chacun, une base qui en accepte 200. Elle plafonne l'autoscaling à 8 pods. Le taux d'erreur retombe. Le site est lent, mais il répond.</p>
<p>À 21 h 10, tu reçois un message : « Saturation des connexions à la base. Plafonné à 8 pods, ça tient. Je te raconte à ton retour. Profite. »</p>
<p>Tu reposes le téléphone face contre la table.</p>`,
      choix: [{ t: 'Dimanche matin', vers: 'final' }],
    },

    final: {
      jour: 'Dimanche, semaine 26',
      heure: '9 h 00',
      fin: (s) => (s.f.EVENEMENTS === 0 ? 'rien' : (s.f.VAC === 'annule' && s.energie <= 1) ? 'heros' : 'tenu'),
      entree: (s) => {
        const fx = { horlogeFin: true, prod: 0, energie: 0, confiance: 0 };
        if (a(s, 'MUTED_ALERTS') && s.f.EVENEMENTS > 0) fx.prod -= 1;
        if (s.f.VAC === 'joignable') fx.energie -= s.f.EVENEMENTS > 0 ? 2 : 1;
        if (s.f.VAC === 'prepare') fx.energie += 1;
        if (s.f.VAC === 'annule') fx.confiance += 1;
        return fx;
      },
      texte: (s) => `
${s.f.GESTE === 'pods'
    ? '<p>Hier soir, tu as ajouté des pods. Chacun a pris vingt connexions de plus à une base qui n\'en avait plus une seule à donner. Le taux d\'erreur est monté à 85 %. Il a fallu dix minutes de plus pour faire le geste inverse : plafonner à 8.</p>' + capot('Devant un site qui croule, le réflexe est d\'ajouter de la capacité. Quand le goulot est derrière, chaque serveur ajouté pousse plus fort contre le même mur. Le geste qui sauve consiste à envoyer moins, pas plus.')
    : s.f.GESTE === 'plafond'
      ? '<p>Hier soir, tu as plafonné l\'autoscaling à 8 pods. 160 connexions, sous la limite. Le taux d\'erreur est retombé en une minute. Le site était lent, les clients attendaient huit secondes, mais ils commandaient.</p>' + capot('Un service lent pour tout le monde vaut mieux qu\'un service en erreur pour deux clients sur trois. Dégrader volontairement, c\'est choisir ce qu\'on abandonne avant que le système le choisisse à ta place.')
      : s.f.GESTE === 'restart'
        ? '<p>Hier soir, tu as redémarré la base en plein pic, avec <code>max_connections</code> à 1 000. Deux minutes d\'écran blanc pour tout le monde, au pire moment de l\'histoire de Panier Vif. Puis le site est revenu, lent, avec une base qui portait 800 connexions à bout de bras.</p>'
        : ''}
${a(s, 'MUTED_ALERTS') && s.f.EVENEMENTS > 0
    ? '<p>À 22 h 10, la pub a été rediffusée. Les notifications du channel d\'alertes étaient coupées depuis 22 h, comme toutes les nuits depuis un mois. La deuxième vague a duré vingt minutes avant que quelqu\'un regarde.</p>'
    : ''}
<p>${s.f.EVENEMENTS === 0
    ? 'Hier soir, 160 000 personnes sont venues sur le site en dix minutes. Le dashboard a dessiné une montagne, puis une pente douce. Le temps de réponse du paiement n\'a pas dépassé 220 ms.'
    : 'Dimanche matin, Hugo fait les comptes. Les commandes sont là, moins nombreuses qu\'elles auraient pu l\'être.'}</p>
<p>${s.f.VAC === 'annule'
    ? 'Tu es dans l\'open space vide. Tu as tout vu, tout suivi, tout tenu toi-même. Hugo t\'a écrit « merci » avec trois points d\'exclamation. Tes dix jours de congé, eux, n\'ont pas été reportés : personne n\'y a pensé.'
    : s.f.VAC === 'prepare'
      ? 'Tu prends ton petit-déjeuner face à la montagne. Inès t\'a envoyé une photo du dashboard, avec un seul mot : « Regarde. » Elle a dirigé la soirée la plus importante de l\'histoire de la boîte, et tu n\'y étais pas.'
      : (s.f.EVENEMENTS > 0
        ? 'Tu es à 800 kilomètres, et tu n\'as pas dormi. Tu as passé la soirée au téléphone sur un trottoir. Ce ne sont pas des vacances, et ce n\'était pas non plus du travail bien fait.'
        : 'Tu es à 800 kilomètres. Personne ne t\'a appelé. Tu as quand même rechargé le dashboard sur ton téléphone toute la soirée, jusqu\'au dessert.')}</p>
<p>Il y a six mois, un vendredi à 16 h 42, on te demandait un feu vert pour une migration de deux lignes.</p>`,
    },
  };

  const epilogue = (s) => ' '
    + (s.energie <= 1 ? 'Tu es à bout, et ça finira par se voir dans tes décisions.' : s.energie >= 4 ? 'Il te reste de l\'énergie pour la suite, ce qui est rare dans ce métier.' : 'La fatigue est là, mais tu tiens debout.')
    + ' '
    + (s.dette >= 5 ? 'Une pile de tickets sans date t\'attend lundi.' : s.dette <= 1 ? 'Tu ne traînes presque aucune dette.' : 'Quelques décisions repoussées t\'attendent encore.')
    + ' '
    + (s.confiance >= 7 ? 'L\'équipe te suit sans que tu aies à insister.' : s.confiance <= 2 ? 'On vérifie encore derrière toi.' : 'L\'équipe t\'écoute, la plupart du temps.');

  racine.CHAPITRES.push({
    id: 'ch12',
    numero: 12,
    titre: 'Samedi, 20 h 50',
    techno: 'Tout',
    jour: 'Jeudi, semaine 25',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['MANUAL_CERT', 'SECRET_IN_IMAGE', 'MUTED_ALERTS', 'NO_ROLLBACK'], dette: 6, energie: 2, confiance: 2 },
      { codes: ['RUNBOOK', 'RESTORE_TEST'], instruments: ['LOGS', 'METRICS', 'TRACES'], confiance: 8 },
    ],
    fins: {
      rien: {
        titre: 'Il ne se passe rien',
        texte: (s) => 'Quarante fois le trafic, et pas une alerte. Personne ne saura ce que tu as évité pendant six mois, et c\'est à ça qu\'on reconnaît le travail bien fait.' + epilogue(s),
      },
      tenu: {
        titre: 'Ça a tenu',
        texte: (s) => 'La soirée a eu ses accrocs, chacun venu d\'une décision prise des semaines plus tôt. Panier Vif est toujours debout, avec plus de clients qu\'hier.' + epilogue(s),
      },
      heros: {
        titre: 'Le héros fatigué',
        texte: (s) => 'Tu as tout sauvé toi-même, et tu es la seule personne qui aurait pu le faire. C\'est le problème, pas la récompense : une boîte qui tient sur une personne épuisée ne tient pas.' + epilogue(s),
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
