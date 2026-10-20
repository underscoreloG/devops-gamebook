/* Chapitre 7 : l'outil de Malik. Python, idempotence, timeouts, erreurs avalées. */
(function (racine) {
  'use strict';

  const { code, capot } = racine.RECIT;

  const SCRIPT_MALIK = `
import csv, requests

for ligne in csv.DictReader(open("commandes.csv")):
    try:
        requests.post(
            "https://api.payloire.example/v1/refunds",
            json={"payment_id": ligne["payment_id"], "amount": 490},
            headers={"Authorization": f"Bearer {CLE}"},
        )
    except Exception:
        pass
`;

  const scriptComplet = (s) => `
def rembourser(commande):
    reponse = requests.post(
        f"{API}/refunds",
        json={"payment_id": commande["payment_id"], "amount": ${s.f.KARIM ? 'int(commande["montant_centimes"])' : '490'}},
        headers={**AUTH, "Idempotency-Key": f"frais-livraison-{commande['id']}"},
        timeout=10,
    )
    reponse.raise_for_status()
    return reponse.json()["id"]

for commande in commandes:
    try:
        journal.writerow([commande["id"], "ok", rembourser(commande)])
    except requests.RequestException as erreur:
        journal.writerow([commande["id"], "echec", str(erreur)])
`;

  const noeuds = {

    debut: {
      heure: '17 h 30',
      texte: () => `
<p>Samedi dernier, un bug a facturé deux fois les frais de livraison à 312 clients. Le bug est corrigé. Les 312 clients, eux, attendent toujours leur argent, et trois d'entre eux le font savoir publiquement.</p>
<p>Malik arrive avec son ordinateur ouvert. Il a codé hier soir, chez lui.</p>
<p>« J'ai fait un script. Il lit la liste des commandes et il appelle l'API de PayLoire pour rembourser 4,90 euros à chacun. Tu le relis et tu le lances ce soir ? Je veux pouvoir répondre aux clients demain matin. »</p>
${code(SCRIPT_MALIK)}
<p>Vingt lignes, écrites par ton responsable. Il y a une réunion prévue avec Karim, de la compta, demain à 10 h, « pour caler les détails ».</p>`,
      choix: [
        { t: 'Lancer le script de Malik tel quel, ce soir', vers: 'run_brut' },
        { t: 'Appeler Karim un quart d\'heure avant de toucher au code', vers: 'karim' },
        { t: 'Attendre la réunion de demain 10 h avec la compta', vers: 'demain' },
        { t: 'Relire le code tout de suite : la compta, c\'est pour les détails', vers: 'code' },
      ],
    },

    karim: {
      heure: '17 h 50',
      entree: () => ({ f: { KARIM: true } }),
      texte: () => `
<p>Karim décroche à la deuxième sonnerie. Il t'écoute, puis rit jaune.</p>
<p>« 4,90 à tout le monde ? Deux problèmes. Vendredi, le support a déjà remboursé 57 clients à la main, ceux qui criaient le plus fort. Ils sont dans mon fichier, colonne F. Et les abonnés ne paient que 2,90 de livraison. Il y en a 88 dans la liste. Si tu leur envoies 4,90, je passe ma semaine à réclamer deux euros à 88 personnes. »</p>
<p>Il t'envoie son fichier : une colonne pour le montant exact, une autre pour ceux qui sont déjà remboursés.</p>
${capot('Le script de Malik était faux avant d\'être fragile : mauvais montant pour 88 clients, double remboursement pour 57. Aucune relecture de code ne l\'aurait montré. L\'information était chez la personne qui tient les comptes, à un quart d\'heure de téléphone.')}`,
      choix: [{ t: 'Relire le code, avec le bon fichier', vers: 'code' }],
    },

    demain: {
      jour: 'Mercredi, semaine 16',
      heure: '10 h 45',
      entree: () => ({ confiance: -1, prod: -1, f: { KARIM: true, DEMAIN: true } }),
      texte: () => `
<p>« Demain, après la réunion compta. » Malik serre les dents. « Les clients attendent depuis samedi. »</p>
<p>Le soir, un quatrième client publie sa facture en double. Le message est partagé deux cents fois.</p>
<p>Mercredi, 10 h. Karim pose son fichier sur la table. « Le support a déjà remboursé 57 clients à la main, colonne F. Et les 88 abonnés n'avaient payé que 2,90, pas 4,90. » Malik regarde son script, puis le plafond.</p>
${capot('La réunion était utile : elle a évité deux erreurs sur 145 clients. Mais ce qu\'elle contenait tenait en un coup de fil de quinze minutes la veille. Attendre le créneau prévu a coûté une journée de clients en colère.')}`,
      choix: [{ t: 'Relire le code, avec le bon fichier', vers: 'code' }],
    },

    code: {
      jour: (s) => (s.f.DEMAIN ? 'Mercredi, semaine 16' : null),
      heure: (s) => (s.f.DEMAIN ? '11 h 00' : s.f.KARIM ? '18 h 00' : '17 h 40'),
      texte: (s) => `
<p>Tu relis les vingt lignes. Quatre choses te gênent.</p>
<p>L'appel à l'API n'a pas de timeout : si PayLoire ne répond pas, le script attendra pour toujours. Rien n'empêche de rembourser deux fois le même client si on relance. <code>except Exception: pass</code> avale toutes les erreurs sans en garder une seule. Et le script n'écrit nulle part ce qu'il a fait.</p>
<p>${s.f.DEMAIN
    ? 'Malik attend derrière toi. « Combien de temps ? »'
    : 'Il est tard. Malik repasse. « C\'est bon ? Tu le lances ? »'}</p>`,
      choix: [
        { t: 'Ajouter un timeout et lancer : dix minutes', vers: 'run_timeout', fx: { f: { NIVEAU: 'timeout' } } },
        { t: 'Timeout, clé d\'idempotence et journal de chaque remboursement : une heure, puis lancer', vers: 'run_complet', fx: { energie: -1, f: { NIVEAU: 'complet' } } },
        {
          t: 'Tout ça, plus un essai sur cinq commandes avec Karim, et lancer demain à 9 h',
          vers: 'run_complet',
          si: (s) => !s.f.DEMAIN,
          fx: { confiance: -1, f: { NIVEAU: 'complet', ESSAI: true } },
        },
        {
          t: 'Tout ça, plus un essai sur cinq commandes avec Karim, cet après-midi',
          vers: 'run_complet',
          si: (s) => !!s.f.DEMAIN,
          fx: { f: { NIVEAU: 'complet', ESSAI: true } },
        },
      ],
    },

    run_brut: {
      heure: '18 h 25',
      entree: () => ({ energie: -1, f: { NIVEAU: 'brut' } }),
      texte: () => `
<p>Tu lances. Le terminal n'affiche rien : le script n'a aucun <code>print</code>. Tu supposes qu'il travaille.</p>
<p>Dix minutes. Vingt. Toujours rien, et le curseur ne revient pas. Sur le dashboard de PayLoire, le compteur de remboursements est bloqué à 139 depuis un quart d'heure.</p>
<p>Le script n'est pas lent. Il est suspendu à une connexion que PayLoire ne fermera jamais.</p>
<p>Tu fais Ctrl-C. Tu ne sais pas si le 140e client a été remboursé.</p>
${capot('<code>requests</code> n\'a pas de timeout par défaut. Un appel sans <code>timeout=</code> peut attendre indéfiniment une réponse qui ne viendra pas. C\'est la panne la plus banale d\'un script réseau, et la plus silencieuse.')}`,
      choix: [
        { t: 'Relancer le script depuis le début', vers: 'relance_debut' },
        { t: 'Retrouver d\'abord où il s\'est arrêté, dans le dashboard de PayLoire', vers: 'reprise' },
      ],
    },

    relance_debut: {
      heure: '18 h 50',
      entree: () => ({ confiance: -2, prod: -1, f: { DOUBLE: true } }),
      texte: () => `
<p>Tu relances. Le script recommence à la première ligne du fichier, et PayLoire accepte tout : pour son API, ce sont 139 nouvelles demandes.</p>
<p>Cette fois, il va au bout. 312 remboursements, plus les 139 du premier passage.</p>
<p>139 clients ont reçu 9,80 euros au lieu de 4,90. 681 euros de trop, qu'il faudra soit abandonner, soit reprélever, avec un mail d'explication que personne n'a envie d'écrire.</p>
${capot('Un script qui déplace de l\'argent doit pouvoir être relancé sans rien faire deux fois. PayLoire le permet, comme la plupart des API de paiement : avec un en-tête <code>Idempotency-Key</code> propre à chaque commande, la seconde demande aurait renvoyé le premier remboursement au lieu d\'en créer un autre.')}`,
      choix: [{ t: 'Affronter la compta', vers: 'bilan' }],
    },

    reprise: {
      heure: '19 h 30',
      entree: () => ({ energie: -1 }),
      texte: () => `
<p>Tu exportes la liste des remboursements depuis le dashboard de PayLoire, tu la compares au fichier ligne à ligne. 139 faits. Le 140e aussi, finalement : la demande était partie, seule la réponse s'est perdue.</p>
<p>Tu coupes le fichier à la ligne 141, tu ajoutes un <code>timeout=10</code> pour ne pas revivre ça, et tu relances sur le reste. Quarante minutes de plus, mais personne n'est remboursé deux fois par ta faute.</p>
<p>Il est 19 h 30. Le script a « fini ». Avec <code>except: pass</code>, tu n'as aucun moyen de savoir combien d'appels ont réellement réussi.</p>`,
      choix: [{ t: 'Annoncer que c\'est fait', vers: 'bilan' }],
    },

    run_timeout: {
      jour: (s) => (s.f.DEMAIN ? 'Mercredi, semaine 16' : null),
      heure: (s) => (s.f.DEMAIN ? '11 h 30' : '18 h 30'),
      texte: () => `
<p>Tu ajoutes <code>timeout=10</code> et tu lances. Six minutes plus tard, le curseur revient. Aucune erreur affichée.</p>
<p>Aucune erreur affichée, parce que le script n'en affiche jamais. Vers la 140e commande, PayLoire a mis plus de dix secondes à répondre : l'exception a été avalée. Un peu plus loin, l'API a renvoyé neuf fois « 429, trop de requêtes ». Ce ne sont même pas des exceptions : le script n'a pas regardé le code de retour.</p>
<p>Dix clients n'ont rien reçu. Le script dit que tout va bien.</p>
${capot('<code>except Exception: pass</code> transforme une panne en silence. Et <code>requests</code> ne lève rien pour une réponse 429 ou 500 tant qu\'on n\'appelle pas <code>raise_for_status()</code>. Un script qui ne sait pas dire ce qui a échoué n\'a pas « réussi » : il n\'a simplement rien dit.')}`,
      choix: [{ t: 'Annoncer que c\'est fait', vers: 'bilan' }],
    },

    run_complet: {
      jour: (s) => (s.f.DEMAIN || s.f.ESSAI ? 'Mercredi, semaine 16' : null),
      heure: (s) => (s.f.DEMAIN ? '15 h 00' : s.f.ESSAI ? '9 h 40' : '19 h 20'),
      entree: () => ({ f: { JOURNAL: true } }),
      texte: (s) => `
<p>Tu réécris le cœur du script :</p>
${code(scriptComplet(s))}
${s.f.ESSAI
    ? '<p>Karim s\'assoit à côté de toi. Vous lancez sur cinq commandes, puis il vérifie chacune dans son outil. La quatrième avait déjà été remboursée en partie par le support : il la retire de la liste. Tu lances le reste.</p>'
    : '<p>Tu lances sur la liste entière.</p>'}
<p>Vers la 140e commande, PayLoire met plus de dix secondes à répondre. Le journal note « echec », et le script continue. Un peu plus loin, neuf réponses 429. Notées aussi.</p>
<p>À la fin, le journal dit : ${s.f.KARIM ? '245' : '302'} remboursés, 10 en échec. Tu relances le script tel quel. Grâce à la clé d'idempotence, PayLoire reconnaît les demandes déjà traitées et ne paie que les dix manquantes.</p>
${capot('Trois lignes font la différence. Le timeout empêche le script de rester suspendu. <code>raise_for_status()</code> transforme une réponse d\'erreur en exception, que le journal enregistre au lieu de l\'avaler. Et la clé d\'idempotence rend la relance sans danger : le remède à une panne à mi-chemin devient « relancer ».')}`,
      choix: [{ t: 'Annoncer que c\'est fait', vers: 'bilan' }],
    },

    bilan: {
      jour: 'Le lendemain',
      heure: '11 h 00',
      fin: (s) => (s.f.DOUBLE || !s.f.KARIM ? 'double' : s.f.JOURNAL ? 'propre' : 'aveugle'),
      entree: (s) => {
        const fx = {};
        if (!s.f.KARIM) { fx.confiance = -2; fx.prod = -1; }
        if (!s.f.JOURNAL) { fx.energie = -1; fx.dette = 1; }
        if (s.f.KARIM && s.f.JOURNAL) fx.confiance = 1;
        return fx;
      },
      texte: (s) => `
<p>Karim passe à ton bureau avec une seule question. « Qui a été remboursé, et de combien ? »</p>
${s.f.JOURNAL
    ? '<p>Tu lui envoies le journal : une ligne par commande, l\'identifiant du remboursement chez PayLoire, le montant. Il le charge dans son tableur, fait un total, hoche la tête.</p>'
    : '<p>Tu n\'en sais rien. Le script n\'a rien écrit. Tu passes deux heures à exporter les opérations depuis PayLoire et à les recoller au fichier de départ, ligne par ligne.' + (s.f.NIVEAU === 'timeout' ? ' C\'est là que tu découvres les dix clients oubliés. Deux d\'entre eux ont déjà rappelé le support.' : '') + '</p>'}
${!s.f.KARIM
    ? '<p>Puis il pose son propre fichier à côté du tien, et son visage change. « Tu as envoyé 4,90 à tout le monde ? Le support en avait déjà remboursé 57 à la main. Et les 88 abonnés n\'avaient payé que 2,90. » 145 clients ont reçu trop. Il faudra leur écrire.</p>'
    : '<p>Les montants correspondent à son fichier : 4,90 pour les uns, 2,90 pour les abonnés, rien pour les 57 que le support avait déjà traités.</p>'}
<p>${s.f.DOUBLE
    ? 'Malik ne dit rien sur les 139 doublons. C\'était son script, et c\'est toi qui l\'as relancé.'
    : 'Malik relit ta version par-dessus ton épaule. « Je n\'aurais pas pensé à la moitié. »'}</p>`,
    },
  };

  racine.CHAPITRES.fr.push({
    id: 'ch7',
    numero: 7,
    titre: 'L\'outil de Malik',
    techno: 'Python',
    jour: 'Mardi, semaine 16',
    debut: 'debut',
    noeuds: noeuds,
    essais: [{ energie: 2, confiance: 1 }],
    fins: {
      propre: {
        titre: 'Relançable',
        texte: 'Chaque client a reçu le bon montant, une seule fois, et tu peux le prouver ligne par ligne.',
      },
      aveugle: {
        titre: 'Sans trace',
        texte: 'Les montants étaient justes. Mais le script n\'a rien noté, et il a fallu deux heures pour reconstituer ce qu\'il avait fait.',
      },
      double: {
        titre: 'Remboursés de trop',
        texte: 'Un script écrit vite pour réparer une erreur de facturation en a créé une deuxième, dans l\'autre sens.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
