/* Chapitre 3 : le script de Bastien. Shell, cron, variables vides. */
(function (racine) {
  'use strict';

  const { code, capot, a, outil } = racine.RECIT;

  const CRONTAB = `
$ sudo crontab -l -u bastien
UPLOAD_DIR=/srv/uploads
TMP_SUBDIR=tmp
MAILTO=bastien
30 2 * * * /opt/scripts/backup.sh
0 3 * * * /opt/scripts/nettoyage.sh
`;

  const SCRIPT = `
$ cat /opt/scripts/nettoyage.sh
#!/bin/bash
# Nettoyage des envois temporaires. Bastien, mars 2022.
# NE PAS TOUCHER.
cd $UPLOAD_DIR/$TMP_SUBDIR
rm -rf *
`;

  const noeuds = {

    debut: {
      heure: '10 h 15',
      texte: (s) => `
<p>Un ticket de Malik t'attend : « Bastien est en congé pour trois semaines depuis ce matin. Ses deux crons tournent sous son compte personnel, et nos comptes se verrouillent après quinze jours sans connexion. Passe-les sous le compte de service <code>deploy</code> avant ce soir. »</p>
<p>Bastien a monté seul toute l'infrastructure de Panier Vif, il y a quatre ans. Ses scripts tournent encore, et personne ne les a relus depuis.</p>
${code(CRONTAB)}
${code(SCRIPT)}
<p>Le dossier <code>/srv/uploads</code> contient 61 000 fichiers : les photos du catalogue et les justificatifs que les clients joignent à leurs réclamations.</p>
${a(s, 'BLAME')
    ? '<p>Inès passe derrière ton écran, regarde le script, ouvre la bouche. Puis elle retourne s\'asseoir sans rien dire. Depuis le post-mortem, elle ne dit plus grand-chose.</p>'
    : '<p>Inès passe derrière ton écran. « Méfie-toi de celui-là. Je me suis fait avoir une fois, il ne marche pas pareil selon qui le lance. Je ne sais plus pourquoi. »</p>'}`,
      choix: [
        { t: 'Essayer le script à la main sous deploy, puis recopier les deux lignes de cron', vers: 'essai_main' },
        { t: 'Lire le script ligne par ligne avant de le déplacer', vers: 'lire' },
        { t: 'Proposer de le réécrire proprement en Python', vers: 'python' },
        { t: 'Appeler Bastien sur son portable personnel', vers: 'bastien' },
      ],
    },

    essai_main: {
      heure: '10 h 30',
      texte: () => `
${code(`
$ sudo -iu deploy /opt/scripts/nettoyage.sh
$ echo $?
0
$ du -sh /srv/uploads/tmp
4,0K    /srv/uploads/tmp
`)}
<p>Le script s'exécute sans un mot, et 12 Go de fichiers temporaires disparaissent de <code>/srv/uploads/tmp</code>. Il fait ce qu'il dit.</p>
<p>Il ne reste qu'à recopier les deux lignes horaires dans la crontab de <code>deploy</code> et à vider celle de Bastien.</p>`,
      choix: [
        { t: 'Installer les deux lignes chez deploy et supprimer la crontab de Bastien', vers: 'nuit' },
        { t: 'Comparer d\'abord les deux crontabs en entier, ligne par ligne', vers: 'lire', fx: { f: { COMPARE: true } } },
      ],
    },

    bastien: {
      heure: '10 h 25',
      entree: () => ({ confiance: -1, f: { APPEL: true } }),
      texte: () => `
<p>Trois sonneries. Un bruit d'aéroport.</p>
<p>« Je suis en vacances depuis quatre heures. »</p>
<p>Tu poses ta question. Il soupire, puis répond quand même. « Le nettoyage ? Fais gaffe. Les variables ne sont pas dans le script, elles sont dans ma crontab. Si tu recopies juste les lignes horaires, il part de la racine. J'ai toujours voulu corriger ça. Bon, j'embarque. »</p>
<p>Il raccroche avant que tu aies dit merci.</p>
${capot('Bastien t\'a donné en trente secondes ce que tu aurais trouvé en lisant sa crontab jusqu\'en haut. Déranger un collègue en congé se justifie quand l\'information n\'existe que dans sa tête. Ici, elle était sous tes yeux.')}`,
      choix: [{ t: 'Reprendre le script, ligne par ligne', vers: 'lire' }],
    },

    lire: {
      heure: '10 h 45',
      texte: (s) => `
<p>${s.f.APPEL ? 'Avec ce que Bastien vient de dire, tout s\'éclaire.' : s.f.COMPARE ? 'Tu mets les deux crontabs côte à côte, et tu vois enfin les trois premières lignes de celle de Bastien.' : 'Tu reprends depuis le haut, crontab comprise.'} Le script ne définit rien lui-même. <code>UPLOAD_DIR</code> et <code>TMP_SUBDIR</code> viennent de la crontab de Bastien.</p>
<p>Tu déroules ce qui se passerait sous un autre compte, sans ces deux lignes :</p>
${code(`
cd $UPLOAD_DIR/$TMP_SUBDIR    ->    cd /
rm -rf *                      ->    tout ce que deploy a le droit de supprimer
`)}
<p>Et <code>deploy</code> est propriétaire de <code>/srv/uploads</code> et du code de l'application.</p>
${s.f.COMPARE ? '<p>Ton essai à la main a marché parce qu\'un shell de connexion charge <code>/etc/profile.d/paniervif.sh</code>, où Bastien a aussi défini ces variables. Cron, lui, ne charge rien.</p>' : ''}
${capot('Cron lance les commandes avec un environnement presque vide : ni profil, ni variables de ton shell. Une variable non définie vaut une chaîne vide, sans erreur. Et si <code>cd</code> échoue ou atterrit ailleurs, le script continue quand même sur la ligne suivante.')}
<p>Tu commences à corriger. Malik s'arrête devant ton bureau. « Tu touches au script de Bastien ? Il y a écrit de ne pas y toucher. On en parle d'abord. Je cale un comité jeudi : une heure, avec Hugo et Inès. »</p>`,
      choix: [
        { t: 'Accepter le comité de jeudi', vers: 'comite' },
        { t: 'Proposer quinze minutes tout de suite, à trois, avec la correction à l\'écran', vers: 'quinze' },
        { t: 'Dire oui pour jeudi, et corriger quand même cet après-midi sans le dire', vers: 'sans_dire' },
      ],
    },

    comite: {
      jour: 'Jeudi, semaine 6',
      heure: '15 h 00',
      entree: () => ({ energie: -1, f: { COMITE: true } }),
      texte: () => `
<p>Jeudi, 14 h. Cinq personnes, une heure. Hugo demande s'il existe « un outil du marché » pour nettoyer des fichiers. Malik voudrait profiter de l'occasion pour revoir tous les scripts de Bastien. Inès regarde l'horloge.</p>
<p>À 15 h, la décision tombe : on garde le script, on ajoute des garde-fous. C'est ce que tu avais à l'écran mardi matin.</p>
<p>Entre-temps, le cron a tourné deux nuits de plus sous le compte de Bastien, sans incident. Tu n'as rien perdu, sauf une heure à cinq et deux jours.</p>
${capot('Le comité répondait à une vraie inquiétude : toucher à un script que personne ne comprend. Mais une décision de cinq lignes se prend devant les cinq lignes. Une heure à cinq personnes, c\'est une demi-journée de travail pour ne rien décider de plus.')}`,
      choix: [{ t: 'Appliquer la correction', vers: 'durcir' }],
    },

    quinze: {
      heure: '11 h 15',
      entree: () => ({ confiance: 1 }),
      texte: () => `
<p>« Jeudi, le compte de Bastien aura deux jours d'inactivité de plus. Donne-moi quinze minutes maintenant, avec Inès. Je vous montre ce que fait le script et ce que je change. »</p>
<p>Malik hésite, puis tire une chaise. Tu affiches les cinq lignes, puis les deux flèches : <code>cd /</code>, <code>rm -rf *</code>.</p>
<p>Il lui faut dix secondes. « Ça tourne comme ça depuis 2022 ? »</p>
<p>« Ça tourne comme ça tant que personne ne le déplace. »</p>
<p>« Corrige. »</p>`,
      choix: [{ t: 'Appliquer la correction', vers: 'durcir' }],
    },

    sans_dire: {
      heure: '14 h 00',
      entree: () => ({ f: { CACHE: true } }),
      texte: () => `
<p>« D'accord pour jeudi. »</p>
<p>Malik repart rassuré. À 14 h, tu ouvres le script.</p>
<p>Tu te dis que c'est la bonne correction, que tu la montreras jeudi comme un fait accompli, et que personne ne te reprochera d'avoir évité un accident.</p>`,
      choix: [{ t: 'Appliquer la correction', vers: 'durcir' }],
    },

    durcir: {
      heure: (s) => (s.f.COMITE ? '15 h 30' : s.f.CACHE ? '14 h 30' : '11 h 45'),
      texte: () => `
<p>Tu réécris le script pour qu'il ne dépende plus de qui le lance :</p>
${code(`
#!/bin/bash
# Supprime les envois temporaires de plus de 2 jours.
set -euo pipefail

UPLOAD_DIR="/srv/uploads"

find "\${UPLOAD_DIR:?}/tmp" -mindepth 1 -type f -mtime +2 -delete
`)}
<p>Avant de l'installer, tu remplaces <code>-delete</code> par <code>-print</code> et tu le lances exactement comme cron le ferait, sans aucun environnement :</p>
${code(`
$ sudo -u deploy env -i /bin/bash /opt/scripts/nettoyage.sh | head -3
/srv/uploads/tmp/envoi-8841.jpg
/srv/uploads/tmp/envoi-8842.jpg
/srv/uploads/tmp/envoi-8850.pdf
`)}
<p>Uniquement des fichiers de <code>tmp</code>. Tu remets <code>-delete</code>, tu déplaces les deux lignes de cron sous <code>deploy</code>, et tu installes pour le backup les credentials dont il a besoin.</p>
${capot('<code>set -u</code> arrête le script sur une variable non définie, <code>set -e</code> sur une commande qui échoue. <code>${VAR:?}</code> refuse aussi une variable vide. Et <code>find</code> avec un chemin complet remplace le couple <code>cd</code> puis <code>*</code>, qui supprime là où il se trouve, où que ce soit. Enfin, on teste un script destructeur en le rendant d\'abord inoffensif.')}`,
      choix: [{ t: 'Vérifier une dernière chose', vers: 'courrier' }],
    },

    python: {
      jour: 'Jeudi, semaine 6',
      heure: '17 h 00',
      entree: () => ({ confiance: -1, energie: -1, f: { PYTHON: true } }),
      texte: () => `
<p>« Deux jours pour remplacer cinq lignes ? » Malik n'est pas convaincu, mais il te laisse faire.</p>
<p>Tu écris un vrai programme : des chemins construits avec <code>pathlib</code>, un mode dry-run qui liste sans supprimer, un refus net si le dossier cible n'est pas sous <code>/srv/uploads</code>, six tests. Jeudi à 17 h, il remplace le script de Bastien, sous le compte <code>deploy</code>.</p>
<p>Il est meilleur que l'original. Pendant deux nuits, pourtant, l'original a continué de tourner tel quel, avec son <code>rm -rf *</code>, sous un compte qui se rapproche de son verrouillage.</p>
${capot('Réécrire n\'était pas faux, c\'était cher. Le danger tenait en deux lignes et se corrigeait en vingt minutes. La réécriture a laissé le risque en place deux jours de plus, pour un gain que personne n\'avait demandé.')}`,
      choix: [{ t: 'Vérifier une dernière chose', vers: 'courrier' }],
    },

    courrier: {
      heure: (s) => (s.f.COMITE ? '15 h 45' : s.f.PYTHON ? '17 h 15' : s.f.CACHE ? '14 h 45' : '12 h 00'),
      texte: () => `
<p>La crontab de Bastien contenait une ligne que tu n'as pas encore regardée : <code>MAILTO=bastien</code>. Tout ce que ses crons affichent part dans sa boîte locale, sur ce serveur.</p>
${code(`
$ sudo ls -lh /var/mail/bastien
-rw-rw---- 1 bastien mail 1,3M oct.   7 02:30 /var/mail/bastien
`)}
<p>1,3 Mo de messages que personne n'a jamais ouverts. Le dernier date de cette nuit, 2 h 30.</p>`,
      choix: [
        { t: 'Ouvrir la boîte et lire les derniers messages', vers: 'courrier_lu' },
        { t: 'Couper ces mails avec MAILTO="" : personne ne les lit de toute façon', vers: 'courrier_coupe' },
        { t: 'Laisser comme ça et fermer le ticket', vers: 'fin_calme' },
      ],
    },

    courrier_lu: {
      heure: (s) => (s.f.COMITE ? '16 h 30' : s.f.PYTHON ? '18 h 00' : s.f.CACHE ? '15 h 30' : '12 h 45'),
      entree: () => ({ codes: ['BACKUP_OK'], confiance: 1 }),
      texte: () => `
${code(`
$ sudo tail -6 /var/mail/bastien
Subject: Cron <bastien@vif-app-01> /opt/scripts/backup.sh

pg_dump: error: aborting because of server version mismatch
pg_dump: detail: server version: 16.4; pg_dump version: 15.8

$ sudo grep -c "server version mismatch" /var/mail/bastien
94
`)}
<p>Quatre-vingt-quatorze nuits. Depuis la montée de version de PostgreSQL en juin, le backup de la base échoue tous les soirs, et le dit tous les soirs à une boîte que personne ne lit.</p>
<p>Tu regardes les fichiers envoyés au stockage : 20 octets chacun. Tu ouvres le script :</p>
${code(`
pg_dump paniervif | gzip > /var/backups/paniervif-$(date +%F).sql.gz
`)}
<p>Tu installes le client PostgreSQL 16, tu ajoutes <code>set -euo pipefail</code> en tête du script, tu diriges les mails vers la liste de l'équipe, et tu lances un backup à la main. 3,1 Go. <code>gunzip -t</code> le valide.</p>
${capot('Dans <code>a | b</code>, le code de retour est celui de <code>b</code>. <code>pg_dump</code> échouait, <code>gzip</code> compressait du vide avec succès, et le script se terminait sur un zéro. <code>pipefail</code> fait échouer la ligne dès qu\'un maillon échoue. Un backup de 20 octets est un fichier, pas un backup.')}`,
      choix: [{ t: 'Fermer le ticket', vers: 'fin_calme' }],
    },

    courrier_coupe: {
      heure: (s) => (s.f.COMITE ? '15 h 50' : s.f.PYTHON ? '17 h 20' : s.f.CACHE ? '14 h 50' : '12 h 05'),
      entree: () => ({ dette: 2 }),
      texte: () => `
<p>Tu ajoutes <code>MAILTO=""</code> en tête de la nouvelle crontab. Plus de boîte qui grossit, plus de bruit.</p>
<p>Tu n'as pas lu un seul des messages. Tu ne sauras donc pas ce que ces crons essayaient de dire, chaque nuit, depuis des mois.</p>
${capot('Un canal que personne n\'écoute ne se répare pas en le coupant. Soit ces messages sont inutiles et il faut corriger ce qui les produit, soit ils sont utiles et il faut les envoyer à quelqu\'un.')}`,
      choix: [{ t: 'Fermer le ticket', vers: 'fin_calme' }],
    },

    fin_calme: {
      jour: (s) => (s.f.CACHE ? 'Jeudi, semaine 6' : null),
      heure: (s) => (s.f.CACHE ? '14 h 10' : '18 h 00'),
      fin: (s) => (s.f.PYTHON ? 'reecrit' : 'durci'),
      entree: (s) => (s.f.CACHE ? { confiance: -2 } : {}),
      texte: (s) => `
${s.f.CACHE
    ? '<p>Jeudi, au comité, tu annonces que c\'est déjà corrigé. Hugo sourit. Malik, non.</p><p>« On avait dit jeudi. Si je ne peux pas compter sur un oui, je vérifie tout derrière toi. »</p><p>Ta correction était la bonne. Ce n\'est pas elle qu\'il te reproche.</p>'
    : '<p>Le nettoyage tourne désormais sous un compte de service, avec un script qui ne dépend plus de qui le lance.</p>'}
<p>${a(s, 'BACKUP_OK')
    ? 'Et pour la première fois depuis juin, Panier Vif a un backup de sa base qui contient quelque chose.'
    : 'À 2 h 30 cette nuit, le backup tournera comme toutes les nuits. Tu n\'as aucune raison de penser qu\'il ne marche pas.'}</p>`,
    },

    nuit: {
      jour: 'Mercredi, semaine 6',
      heure: '3 h 00',
      texte: () => `
<p>Tu dors.</p>
<p>Sur <code>vif-app-01</code>, cron lance le nettoyage sous le compte <code>deploy</code>, avec un environnement presque vide. Les deux lignes qui définissaient <code>UPLOAD_DIR</code> et <code>TMP_SUBDIR</code> étaient dans la crontab de Bastien. Tu n'as recopié que les lignes horaires.</p>
${code(`
cd $UPLOAD_DIR/$TMP_SUBDIR    ->    cd /
rm -rf *
`)}
<p>Le système refuse presque tout : <code>deploy</code> n'est pas administrateur. Mais <code>deploy</code> possède <code>/srv/uploads</code> et le code de l'application.</p>
<p>À 3 h 04, c'est fini. Neuf mille lignes « Permission non accordée » partent dans une boîte aux lettres locale que personne ne lit.</p>`,
      choix: [{ t: 'Te réveiller', vers: 'matin' }],
    },

    matin: {
      jour: 'Mercredi, semaine 6',
      heure: '7 h 40',
      entree: () => ({ prod: -3, energie: -1, horlogeFixe: 0 }),
      texte: (s) => `
<p>Yasmine t'appelle avant ton café. « Le site n'a plus une seule photo. Rien. Des carrés gris partout. »</p>
<p>Tu regardes. <code>vif-app-01</code> ne répond plus : le load balancer l'a retiré dans la nuit. Les deux autres serveurs tiennent le site, mais les photos du catalogue vivaient sur le premier.</p>
<p>${outil(s, 'METRICS')
    ? 'Ton alerte de paiement n\'a pas sonné : les clients paient toujours, ils ne voient simplement plus ce qu\'ils achètent.'
    : 'Aucune alerte, évidemment. Il n\'y en a pas.'}</p>`,
      choix: [
        { t: 'Chercher d\'abord ce qui s\'est passé cette nuit', vers: 'mail_deploy' },
        { t: 'Redéployer vif-app-01 tout de suite', vers: 'redeploy' },
      ],
    },

    redeploy: {
      jour: 'Mercredi, semaine 6',
      heure: '8 h 05',
      entree: () => ({ horloge: 25 }),
      texte: () => `
<p>Tu relances le pipeline sur <code>vif-app-01</code>. Vingt-cinq minutes plus tard, le serveur est de retour dans le load balancer, avec un code tout neuf.</p>
<p>Et toujours des carrés gris. <code>/srv/uploads</code> est vide. Le code se redéploie ; 61 000 fichiers, non.</p>
<p>Tu n'as toujours aucune idée de ce qui les a effacés, ni de ce qui l'empêchera de recommencer la nuit prochaine.</p>`,
      choix: [{ t: 'Chercher ce qui s\'est passé cette nuit', vers: 'mail_deploy' }],
    },

    mail_deploy: {
      jour: 'Mercredi, semaine 6',
      heure: (s) => (s.horloge >= 25 ? '8 h 15' : '7 h 50'),
      entree: () => ({ horloge: 10 }),
      texte: () => `
${code(`
$ sudo tail -3 /var/mail/deploy
rm: impossible de supprimer 'usr/bin/zip': Permission non accordée
rm: impossible de supprimer 'var/lib/dpkg': Permission non accordée
rm: impossible de supprimer 'etc': Permission non accordée
`)}
<p>Des chemins sans barre oblique au début : le script tournait depuis la racine. Tu rouvres la crontab de Bastien, que tu avais sauvegardée avant de la vider, et tu vois enfin ses trois premières lignes.</p>
<p>Tu désactives le cron. Puis tu fais le compte : le code se redéploie, les 12 Go de fichiers temporaires ne manqueront à personne. Les 61 000 photos et justificatifs, eux, n'existent plus que dans un backup.</p>
${capot('Ton essai à la main avait réussi parce qu\'un shell de connexion charge <code>/etc/profile.d</code>, où ces variables étaient aussi définies. Cron ne charge rien. Une variable vide ne provoque aucune erreur : <code>cd $A/$B</code> devient <code>cd /</code>, et la ligne suivante fait le reste.')}`,
      choix: [
        { t: 'Demander à Inès d\'afficher une image de remplacement en attendant', vers: 'efface', fx: { prod: 1, confiance: 1, f: { IMAGE: true } } },
        { t: 'Te lancer tout de suite dans la restauration', vers: 'efface' },
      ],
    },

    efface: {
      jour: 'Mercredi, semaine 6',
      heure: '8 h 40',
      fin: 'efface',
      entree: () => ({ codes: ['UPLOADS_LOST'], horlogeFin: true }),
      texte: (s) => `
${s.f.IMAGE
    ? '<p>Inès pousse en vingt minutes un fix : chaque photo manquante est remplacée par le logo de Panier Vif et le nom du produit. Ce n\'est pas beau, mais on peut de nouveau faire ses courses.</p>'
    : '<p>Le site reste couvert de carrés gris. Les clients commandent à l\'aveugle, ou ne commandent pas.</p>'}
<p>Il faut restaurer. Bastien avait un script de backup, lancé chaque nuit à 2 h 30. Il tourne depuis 2022.</p>
<p>Personne ne l'a jamais restauré.</p>`,
    },
  };

  racine.CHAPITRES.fr.push({
    id: 'ch3',
    numero: 3,
    titre: 'Le script de Bastien',
    techno: 'Shell',
    jour: 'Mardi, semaine 6',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['BLAME', 'QUICK_FIX'], confiance: 2 },
      { instruments: ['METRICS'], codes: ['RUNBOOK'] },
    ],
    fins: {
      durci: {
        titre: 'Sept lignes qui ne dépendent de personne',
        texte: 'Le script fait la même chose quel que soit le compte qui le lance. C\'est tout ce qu\'on lui demandait.',
      },
      reecrit: {
        titre: 'Deux jours pour cinq lignes',
        texte: 'Le nouveau programme est propre et testé. Il a coûté deux jours pendant lesquels l\'ancien tournait toujours.',
      },
      efface: {
        titre: 'Depuis la racine',
        texte: 'Une variable vide, un cd qui atterrit ailleurs, et 61 000 fichiers en moins. Le chapitre suivant commence dans une heure.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
