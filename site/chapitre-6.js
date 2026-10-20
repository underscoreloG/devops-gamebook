/* Chapitre 6 : le pipeline. CI/CD, test instable, rollback jamais testé. */
(function (racine) {
  'use strict';

  const { code, capot, hm, a } = racine.RECIT;

  /* L'horloge compte les minutes depuis 17 h 20 : chaque minute coûte environ 10 euros de livraisons offertes */
  const heure = (s) => hm(17, 20 + (s.horloge || 0));
  const euros = (s) => (s.f.COUT || 0) * 10;
  const suite = (s) => (s.f.SKIP ? 'samedi' : 'bilan');

  const ECHEC = `
FAILED tests/test_creneaux.py::test_creneau_reservable - AssertionError
=========== 1 failed, 412 passed in 7m41s ===========
`;

  const noeuds = {

    debut: {
      heure: heure,
      entree: () => ({ horlogeFixe: 0 }),
      texte: () => `
<p>Depuis la mise en prod de 9 h, la livraison est gratuite pour tout le monde. Une comparaison entre des centimes et des euros : le seuil de gratuité, prévu à 60 euros, s'applique dès 60 centimes.</p>
<p>Karim, à la compta, a fait le calcul : 4,90 euros par commande, deux commandes par minute. Environ dix euros qui s'envolent à chaque minute.</p>
<p>Inès a écrit le fix en un quart d'heure. Il est prêt. Le pipeline, lui, est rouge :</p>
${code(ECHEC)}
<p>« C'est le test flaky, dit Inès. Il plante de temps en temps, tout le monde le sait. D'habitude, on relance. »</p>
<p>Il est 17 h 20. À 18 h 30, tu dois récupérer ta nièce à la crèche, à vingt-cinq minutes d'ici. Tu l'as promis à ta sœur.</p>`,
      choix: [
        { t: 'Relancer le pipeline', vers: 'relance1' },
        { t: 'Lire pourquoi ce test échoue', vers: 'lire_test' },
        { t: 'Désactiver le test et livrer le fix', vers: 'livraison', fx: { horloge: 16, dette: 2, f: { SKIP: true, COUT: 16 } } },
      ],
    },

    relance1: {
      heure: heure,
      entree: () => ({ horloge: 8 }),
      texte: () => `
<p>Huit minutes. Tu regardes les étapes passer une à une.</p>
${code(ECHEC)}
<p>Le même test, la même ligne. Quatre-vingts euros de livraisons offertes pendant que tu attendais.</p>`,
      choix: [
        { t: 'Relancer encore : la troisième fois sera la bonne', vers: 'relance2' },
        { t: 'Lire pourquoi ce test échoue', vers: 'lire_test' },
        { t: 'Désactiver le test et livrer le fix', vers: 'livraison', fx: { horloge: 16, dette: 2, f: { SKIP: true } } },
      ],
    },

    relance2: {
      heure: heure,
      entree: () => ({ horloge: 8 }),
      texte: () => `
<p>Huit minutes de plus.</p>
${code(ECHEC)}
<p>Trois échecs identiques d'affilée. Un test qui échoue au hasard ne fait pas ça. Malik s'est approché et regarde l'écran par-dessus ton épaule, sans rien dire.</p>
${capot('Relancer est une réponse raisonnable à un échec dû au hasard, une seule fois. Au deuxième échec identique, ce n\'est plus du hasard, et chaque relance supplémentaire coûte huit minutes sans rien apprendre.')}`,
      choix: [
        { t: 'Lire pourquoi ce test échoue', vers: 'lire_test' },
        { t: 'Désactiver le test et livrer le fix', vers: 'livraison', fx: { horloge: 16, dette: 2, f: { SKIP: true } } },
      ],
    },

    lire_test: {
      heure: heure,
      entree: () => ({ horloge: 4 }),
      texte: () => `
<p>Tu ouvres le test. Il tient en trois lignes :</p>
${code(`
def test_creneau_reservable():
    creneau = Creneau(debut=datetime.now().replace(hour=17, minute=0))
    assert creneau.est_reservable()
`)}
<p>Un créneau de livraison n'est réservable que s'il commence dans le futur. Le test fabrique un créneau « aujourd'hui à 17 h ».</p>
<p>Il passe toute la matinée. Il échoue tous les jours après 17 h. Ce test n'est pas flaky : il est faux à heures fixes, et personne ne l'avait remarqué parce que personne ne livrait le soir.</p>
<p>Relancer ne servira à rien avant demain matin.</p>`,
      choix: [
        { t: 'Corriger le test maintenant, en figeant l\'heure', vers: 'corriger' },
        { t: 'Désactiver le test, avec un ticket à ton nom pour demain 10 h', vers: 'livraison', fx: { horloge: 17, f: { SKIP_DATE: true } } },
        { t: 'Désactiver le test, tout court', vers: 'livraison', fx: { horloge: 16, dette: 2, f: { SKIP: true } } },
      ],
    },

    corriger: {
      heure: heure,
      entree: () => ({ horloge: 10, confiance: 1, f: { CORRIGE: true } }),
      texte: () => `
<p>Dix minutes. Le test ne dépend plus de l'heure à laquelle on le lance :</p>
${code(`
@freeze_time("2025-01-15 12:00:00")
def test_creneau_reservable():
    creneau = Creneau(debut=datetime(2025, 1, 15, 17, 0))
    assert creneau.est_reservable()
`)}
<p>Tu ajoutes son contraire, un créneau à 11 h qui ne doit plus être réservable, et tu pousses le tout avec le fix d'Inès.</p>
${capot('Un test qui lit l\'horloge teste aussi le moment où on le lance. Figer l\'heure le rend identique à 9 h, à 17 h et dans trois ans. La plupart des tests dits flaky ont une cause aussi précise que celle-ci, qu\'on ne trouve qu\'en les lisant.')}`,
      choix: [{ t: 'Lancer le pipeline et livrer', vers: 'livraison', fx: { horloge: 14 } }],
    },

    livraison: {
      heure: heure,
      entree: (s) => ({ confiance: s.horloge > 40 ? -1 : 0, f: { COUT: s.horloge }, horlogeFin: true }),
      texte: (s) => `
<p>${s.f.SKIP
    ? 'Tu ajoutes une ligne au-dessus du test : <code>@pytest.mark.skip(reason="flaky")</code>. Le pipeline passe au vert.'
    : s.f.SKIP_DATE
      ? 'Tu ajoutes <code>@pytest.mark.skip(reason="faux après 17 h, ticket 482")</code>, et tu crées le ticket 482 : à ton nom, pour demain 10 h, avec la cause déjà écrite dedans. Le pipeline passe au vert.'
      : 'Le pipeline passe au vert, les 414 tests compris.'} Six minutes de déploiement, serveur par serveur.</p>
<p>Le fix est en prod. La livraison redevient payante sous 60 euros. Karim fait le total de la fin de journée : environ ${euros(s)} euros de plus depuis 17 h 20.</p>
${s.f.COUT > 40 ? '<p>« Quarante minutes pour livrer un fix qui était prêt », lâche Malik. Il n\'attend pas de réponse.</p>' : ''}
<p>Malik tape dans ses mains. « Bon. Tant que tout le monde est là, on fait la rétro de cette journée. Maintenant, à chaud. Une heure. »</p>
<p>Tu regardes l'heure. La crèche ferme à 18 h 30.</p>`,
      choix: [
        { t: 'Rester pour la rétro et appeler ta sœur pour qu\'elle se débrouille', vers: 'retro', fx: { energie: -1, f: { QUAND: 'soir' } } },
        { t: 'Dire que tu as un engagement et proposer demain à 9 h 30', vers: 'retro', fx: { f: { QUAND: 'demain' } } },
        { t: 'Filer discrètement : ils feront la rétro sans toi', vers: 'sans_toi' },
      ],
    },

    retro: {
      jour: (s) => (s.f.QUAND === 'demain' ? 'Vendredi, semaine 14' : null),
      heure: (s) => (s.f.QUAND === 'demain' ? '9 h 30' : '18 h 15'),
      texte: (s) => `
${s.f.QUAND === 'demain'
    ? '<p>« Demain 9 h 30. J\'ai un engagement ce soir, et on réfléchira mieux reposés. » Malik hausse les épaules. « Demain, alors. »</p><p>Ta nièce t\'a raconté sa journée pendant tout le trajet. Ce matin, tout le monde a dormi et la colère de la veille est retombée.</p>'
    : '<p>Tu sors dans le couloir. Ta sœur décroche, soupire, dit qu\'elle va s\'arranger. Elle ne dit pas « comme d\'habitude », mais tu l\'entends.</p><p>Dans la salle, tout le monde est fatigué et un peu vexé. C\'est Malik qui parle le plus.</p>'}
<p>« Ce bug a coûté une journée de frais de livraison. Je ne veux plus de ça. Ma proposition : à partir de lundi, chaque mise en prod est validée à la main par deux personnes, et on ne livre plus que le mardi et le jeudi. »</p>
<p>Inès regarde ses mains. Aujourd'hui, l'équipe livre cinq ou six fois par jour.</p>`,
      choix: [
        { t: 'Accepter : deux validations manuelles, deux jours de livraison par semaine', vers: 'valide' },
        { t: 'Proposer autre chose : tester le rollback pour de vrai, et afficher la version déployée', vers: 'rollback_test' },
        { t: 'Défendre le statu quo : c\'était un bug, pas un problème de process', vers: 'rien' },
      ],
    },

    sans_toi: {
      heure: '18 h 05',
      entree: () => ({ confiance: -1, dette: 2, codes: ['NO_ROLLBACK'], f: { VALIDE: true } }),
      texte: () => `
<p>Tu prends ton sac pendant que tout le monde cherche une salle. Tu arrives à la crèche à 18 h 28. Ta nièce te montre un dessin.</p>
<p>Le lendemain, tu découvres le compte rendu dans ta boîte. En ton absence, la rétro a décidé : chaque mise en prod sera validée à la main par deux personnes, et on ne livrera plus que le mardi et le jeudi.</p>
<p>Malik a ajouté une ligne : « Dommage que tu n'aies pas pu rester. »</p>
${capot('Partir à l\'heure était légitime. Partir sans le dire a laissé la décision se prendre sans la seule personne dont c\'est le métier. Une phrase suffisait : « pas ce soir, demain matin ».')}`,
      choix: [{ t: 'Deux semaines plus tard', vers: suite }],
    },

    valide: {
      jour: 'Deux semaines plus tard',
      heure: '15 h 00',
      entree: () => ({ confiance: 1, dette: 2, codes: ['NO_ROLLBACK'], f: { VALIDE: true } }),
      texte: () => `
<p>« D'accord. » Malik est soulagé : il a une règle.</p>
<p>Deux semaines plus tard, la mise en prod du jeudi contient 43 commits de six personnes. Les deux validateurs ont cliqué sur « approuver » après avoir fait défiler la liste. Personne ne peut relire 43 commits.</p>
<p>Un bug d'affichage apparaît dans le panier. Il faut trois heures pour trouver lequel des 43 commits l'a introduit.</p>
${capot('Une validation manuelle rassure sans rien vérifier que les tests ne vérifient déjà. Et livrer moins souvent, c\'est livrer plus gros : chaque mise en prod devient plus risquée et plus dure à démêler. Le contraire de ce qu\'on voulait.')}`,
      choix: [{ t: 'Continuer', vers: suite }],
    },

    rollback_test: {
      jour: (s) => (s.f.QUAND === 'demain' ? 'Vendredi, semaine 14' : 'Vendredi, semaine 14'),
      heure: '15 h 00',
      entree: () => ({ confiance: 1, energie: -1 }),
      texte: () => `
<p>« Le bug d'hier n'aurait pas été arrêté par deux signatures. Ce qui nous a manqué, c'est de pouvoir revenir en arrière en deux minutes. On a un bouton rollback depuis deux ans. Qui a déjà cliqué dessus ? »</p>
<p>Silence. Malik te donne la journée.</p>
<p>En staging, tu déploies la version d'hier matin, puis tu cliques sur rollback. L'ancienne image redémarre, et plante :</p>
${code(`
psycopg.errors.UndefinedColumn: column orders.delivery_fee does not exist
`)}
<p>La version d'hier avait renommé une colonne. L'ancien code ne sait pas lire le nouveau schéma. Si tu avais cliqué sur ce bouton jeudi, en prod, plus aucune commande ne passait.</p>
<p>Tu écris la règle avec Inès : un changement de schéma se fait en trois mises en prod. On ajoute la nouvelle colonne et on écrit dans les deux. On bascule les lectures. On supprime l'ancienne, plus tard. À chaque étape, la version précédente fonctionne encore.</p>
<p>Tu ajoutes une route <code>/version</code> et un trait vertical sur le dashboard à chaque déploiement.</p>
${capot('Un rollback qu\'on n\'a jamais essayé est une hypothèse, comme un backup jamais restauré. Le code revient en arrière en une minute ; la base, non. Tant que les migrations ne sont pas compatibles avec la version précédente, le bouton est un piège.')}`,
      choix: [{ t: 'Continuer', vers: suite }],
    },

    rien: {
      jour: 'Deux semaines plus tard',
      heure: '15 h 00',
      entree: () => ({ confiance: -1, codes: ['NO_ROLLBACK'] }),
      texte: () => `
<p>« C'était un bug. Ça arrive. On l'a corrigé dans la journée. Ajouter des signatures ne l'aurait pas empêché. »</p>
<p>Tu as raison sur les signatures. Malik le sait, et ça l'agace. « Donc on ne change rien ? »</p>
<p>La rétro se termine sans action. Tout le monde retourne livrer cinq fois par jour, avec un bouton rollback sur lequel personne n'a jamais cliqué.</p>
${capot('Refuser une mauvaise mesure ne suffit pas quand l\'inquiétude derrière elle est fondée. Malik voulait une réponse à « que fait-on la prochaine fois ? ». Sans proposition en face, sa règle reviendra au prochain incident, et elle passera.')}`,
      choix: [{ t: 'Continuer', vers: suite }],
    },

    bilan: {
      jour: 'Deux semaines plus tard',
      heure: '17 h 00',
      fin: (s) => (a(s, 'NO_ROLLBACK') ? 'process' : 'livre'),
      texte: (s) => `
${s.f.SKIP_DATE
    ? '<p>Le lendemain du bug, à 10 h, tu as rouvert le ticket 482. Dix minutes pour figer l\'heure dans le test, une ligne supprimée pour le réactiver. Le ticket n\'a pas vécu vingt-quatre heures.</p>'
    : s.f.CORRIGE
      ? '<p>Le test que tout le monde appelait flaky n\'a plus échoué une seule fois depuis que tu l\'as lu.</p>'
      : ''}
<p>${a(s, 'NO_ROLLBACK')
    ? 'L\'équipe livre, d\'une façon ou d\'une autre. Le jour où une mise en prod tournera mal, il faudra revenir en arrière avec un bouton que personne n\'a essayé.'
    : 'L\'équipe livre toujours cinq fois par jour. Chaque déploiement laisse un trait sur le dashboard, et le rollback a été essayé pour de vrai, deux fois, en staging.'}</p>`,
    },

    samedi: {
      jour: 'Samedi, semaine 16',
      heure: '8 h 10',
      fin: 'saute',
      entree: () => ({ prod: -3, energie: -1 }),
      texte: () => `
<p>Le test désactivé l'est toujours. Personne n'avait de raison de s'en souvenir : il n'y avait ni ticket, ni date, ni nom.</p>
<p>Mercredi, Théo a modifié la gestion des fuseaux horaires. Les 412 autres tests sont passés. Le seul qui vérifiait qu'un créneau passé n'est plus réservable dormait sous sa ligne <code>skip</code>.</p>
<p>Samedi, 8 h 10. Yasmine t'appelle : soixante clients ont réservé hier soir une livraison « ce matin à 7 h », un créneau déjà passé au moment où ils payaient. Les camions sont pleins. Soixante paniers n'ont aucune place dedans.</p>
${capot('Le test était faux, pas inutile. Il gardait une vraie règle, mal. Désactiver un test « le temps de livrer » sans date ni responsable, c\'est le supprimer en gardant l\'illusion qu\'il existe encore.')}`,
    },
  };

  racine.CHAPITRES.push({
    id: 'ch6',
    numero: 6,
    titre: 'Le pipeline',
    techno: 'CI/CD',
    jour: 'Jeudi, semaine 14',
    debut: 'debut',
    noeuds: noeuds,
    essais: [{ energie: 2, confiance: 2 }],
    fins: {
      livre: {
        titre: 'Un bouton sur lequel on a cliqué',
        texte: 'Le fix est parti, le test dit enfin la vérité, et le rollback a cessé d\'être une légende.',
      },
      process: {
        titre: 'Une règle de plus',
        texte: 'Le bug est corrigé. Ce qui aurait permis de le rattraper en deux minutes n\'existe toujours pas.',
      },
      saute: {
        titre: 'Le test qui dormait',
        texte: 'Le fix est parti vite. Le garde-fou retiré pour aller vite n\'est jamais revenu, et il a manqué le seul jour où il aurait servi.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
