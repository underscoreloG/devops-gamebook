/* Chapitre 11 : 1 to destroy. Terraform, state, lecture du plan, dérive. */
(function (racine) {
  'use strict';

  const { code, capot, a } = racine.RECIT;

  const apresRevue = (s) => (a(s, 'SECRET_IN_IMAGE') ? 'scan' : 'plan');

  const PLAN = `
$ terraform plan

  # aws_instance.db must be replaced
-/+ resource "aws_instance" "db" {
      ~ ami           = "ami-0a1b2c3d4e5f67890" -> "ami-0f9e8d7c6b5a43210" # forces replacement
      ~ id            = "i-04c1e2a9b7d3f5a61" -> (known after apply)
        instance_type = "m6i.xlarge"
        tags          = { "Name" = "vif-db-01" }
        # (31 unchanged attributes hidden)
    }

  # aws_eks_node_group.principal will be updated in-place
  ~ resource "aws_eks_node_group" "principal" {
      ~ scaling_config {
          ~ desired_size = 3 -> 5
        }
    }

Plan: 1 to add, 1 to change, 1 to destroy.
`;

  const noeuds = {

    debut: {
      heure: '10 h 00',
      texte: () => `
<p>La campagne nationale est dans deux semaines. Hugo a signé : une pub sur une grande chaîne, un samedi soir.</p>
<p>« Si on doit ajouter des serveurs en urgence ce soir-là, demande Malik, on fait comment ? »</p>
<p>Aujourd'hui, on fait comme Bastien : on clique dans la console du cloud, de mémoire. Depuis un mois, tu décris donc toute l'infrastructure dans du code Terraform. Le cluster, la base, le réseau : 47 ressources importées une à une.</p>
<p>Terraform retient ce qu'il gère dans un fichier, le state. Il te reste à décider où ce fichier vit.</p>`,
      choix: [
        { t: 'Sur ton poste pour l\'instant : c\'est le plus simple pour démarrer', vers: 'revue', fx: { dette: 2, f: { STATE: 'local' } } },
        { t: 'Dans un bucket distant, avec un lock (une demi-journée)', vers: 'revue', fx: { f: { STATE: 'distant' } } },
        { t: 'Dans le dépôt Git, à côté du code : il sera versionné', vers: 'revue', fx: { dette: 1, f: { STATE: 'git' } } },
      ],
    },

    revue: {
      heure: '14 h 30',
      texte: (s) => `
<p>${s.f.STATE === 'local'
    ? 'Le state reste dans ton dossier personnel. Tant que tu es la seule personne à lancer Terraform, ça ne gêne personne.'
    : s.f.STATE === 'distant'
      ? 'Le state est dans un bucket chiffré. Quand quelqu\'un lance Terraform, un lock empêche les autres de le faire en même temps. Inès peut l\'utiliser depuis son poste dès aujourd\'hui.'
      : 'Tu ajoutes <code>terraform.tfstate</code> au dépôt. Chaque modification de l\'infra laissera une trace dans l\'historique.'}</p>
<p>Malik a une autre inquiétude. « Ce truc peut tout supprimer en une commande, non ? Je veux un comité des changements. Tous les jeudis à 14 h, on passe en revue ce qui va être appliqué. Rien ne part sans le comité. »</p>`,
      choix: [
        { t: 'Accepter le comité du jeudi', vers: apresRevue, fx: { f: { REVUE: 'comite' } } },
        { t: 'Proposer à la place une pull request par changement : le plan y est affiché, une personne le relit', vers: apresRevue, fx: { confiance: 1, f: { REVUE: 'pr' } } },
        { t: 'Répondre que tu es la seule personne à comprendre Terraform : tu appliqueras toi-même', vers: apresRevue, fx: { dette: 1, f: { REVUE: 'solo' } } },
      ],
    },

    scan: {
      jour: 'Mercredi, semaine 24',
      heure: '11 h 00',
      texte: () => `
<p>Le nouveau pipeline analyse chaque image avant de la déployer. Dès son premier passage, il lève une alerte rouge :</p>
${code(`
api:2.41.0 (couche 6)
  SECRET  PAYLOIRE_SECRET_KEY=sk_live_4f8a...   gravité : CRITIQUE
`)}
<p>La clé de l'API de paiement, celle qui était entrée dans l'image le jour du premier Dockerfile. Elle est dans chaque version publiée depuis quatre mois, et dans le cache de chaque machine qui en a téléchargé une.</p>
<p>La remplacer demande une heure avec Karim : générer une nouvelle clé chez PayLoire, la donner aux pods au démarrage, révoquer l'ancienne.</p>`,
      choix: [
        { t: 'Faire la rotation de la clé maintenant', vers: 'plan', fx: { retire: ['SECRET_IN_IMAGE'], energie: -1, confiance: 1 } },
        { t: 'Marquer l\'alerte comme « connue » : on verra après la campagne', vers: 'plan', fx: { dette: 1 } },
      ],
    },

    plan: {
      jour: 'Vendredi, semaine 24',
      heure: '17 h 50',
      texte: (s) => `
<p>Malik veut deux nœuds de plus dans le cluster avant la campagne. Tu changes un chiffre dans le code : <code>desired_size = 5</code>. Une ligne.</p>
<p>${s.f.REVUE === 'comite'
    ? 'Le comité d\'hier a validé « l\'ajout de deux nœuds » en trente secondes, entre onze autres changements projetés au mur. Personne n\'a lu les sorties de plan : il y en avait quatre cents lignes.'
    : s.f.REVUE === 'pr'
      ? 'Tu peux ouvrir une pull request : le pipeline y affichera le plan, et Inès le relira lundi matin. Ou appliquer toi-même ce soir, pour que ce soit fait.'
      : 'Personne ne relira : c\'est toi qui appliques.'}</p>
<p>Il est 17 h 50, un vendredi. Tu lances le plan.</p>
${code(PLAN)}
<p>Deux nœuds de plus. C'est ce que tu attendais.</p>`,
      choix: [
        { t: 'Appliquer : c\'est juste deux nœuds', vers: 'detruit' },
        {
          t: 'Relire le plan ligne par ligne avant d\'appliquer',
          vers: 'lire_plan',
          verrou: (s) => (s.energie >= 2 ? null : 'Il te faut au moins 2 d\'ÉNERGIE. Tes yeux glissent sur les lignes sans les lire.'),
        },
        { t: 'Ouvrir la pull request et laisser Inès relire lundi', vers: 'pr_lundi', si: (s) => s.f.REVUE === 'pr' },
      ],
    },

    detruit: {
      jour: 'Vendredi, semaine 24',
      heure: '18 h 04',
      entree: (s) => (a(s, 'RESTORE_TEST')
        ? { prod: -4, energie: -2, confiance: -1, horlogeFixe: 0, f: { DETRUIT: true } }
        : { prod: -6, energie: -2, confiance: -2, horlogeFixe: 0, f: { DETRUIT: true } }),
      texte: (s) => `
${code(`
$ terraform apply -auto-approve
aws_instance.db: Destroying... [id=i-04c1e2a9b7d3f5a61]
aws_instance.db: Destruction complete after 41s
aws_instance.db: Creating...
aws_eks_node_group.principal: Modifying...
`)}
<p>Tu lis <code>Destroying</code>, et ton estomac comprend avant toi.</p>
<p><code>vif-db-01</code>. La base de données. Terraform vient de supprimer le serveur et son disque, puis d'en créer un neuf, vide, pour le remplacer. Le plan le disait : <code>1 to destroy</code>.</p>
<p>La cause tient en une ligne de ton code : l'image système était définie par « la plus récente ». Une nouvelle image a été publiée mardi. Pour Terraform, changer d'image, c'est remplacer la machine.</p>
<p>Plus aucune page ne s'affiche. Il reste le backup de 2 h 30 cette nuit. ${a(s, 'RESTORE_TEST')
    ? 'Tu le restaures chaque dimanche depuis des mois : cinquante minutes, sans surprise. La base revient à 19 h. Il lui manque toutes les commandes de la journée, un vendredi. Yasmine et Karim passeront le week-end à les reconstituer à partir des paiements.'
    : 'Personne ne l\'a restauré depuis le jour des prix à 0,99 euro. Il te faut quatre heures, deux tentatives ratées et Inès rappelée de chez elle. La base revient à 22 h 10. Il lui manque toutes les commandes de la journée, un vendredi, et le pic du soir est passé sur une page d\'erreur.'}</p>
${capot('Terraform dit toujours ce qu\'il va faire. La dernière ligne du plan se lit en entier : tout chiffre différent de zéro devant <code>to destroy</code> doit s\'expliquer avant d\'appliquer. <code>-/+</code> et <code>forces replacement</code> signifient la même chose : cette ressource sera détruite.')}`,
      choix: [
        { t: 'Recréer proprement la base par Terraform, image épinglée et destruction interdite', vers: 'bilan', fx: { horlogeFin: true } },
        { t: 'Laisser la base telle que tu l\'as remontée à la main dans la console : on remettra Terraform d\'accord plus tard', vers: 'bilan', fx: { dette: 3, horlogeFin: true, f: { MAIN: true } } },
      ],
    },

    lire_plan: {
      jour: 'Vendredi, semaine 24',
      heure: '18 h 20',
      entree: () => ({ confiance: 1 }),
      texte: () => `
<p>Tu remontes au début de la sortie. Avant les deux nœuds, il y a un autre bloc. <code>aws_instance.db must be replaced</code>. Et la dernière ligne : <code>1 to destroy</code>.</p>
<p>Tu retires tes mains du clavier.</p>
<p><code>aws_instance.db</code>, c'est <code>vif-db-01</code>. Dans ton code, l'image système de ce serveur est « la plus récente disponible ». Une nouvelle image a été publiée mardi. Pour Terraform, changer d'image, c'est détruire la machine et en créer une autre. Avec son disque.</p>
<p>Tu corriges :</p>
${code(`
resource "aws_instance" "db" {
  ami = "ami-0a1b2c3d4e5f67890"   # épinglée : plus de most_recent

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami]
  }
}
`)}
${code(`
Plan: 0 to add, 1 to change, 0 to destroy.
`)}
<p>Deux nœuds de plus, et rien d'autre. Tu appliques à 18 h 20.</p>
${capot('<code>prevent_destroy</code> fait échouer tout plan qui voudrait supprimer la ressource : la base ne peut plus disparaître par accident. Et une image « la plus récente » est le même piège que <code>latest</code> dans un Dockerfile : une valeur qui change sans que personne l\'ait décidé.')}`,
      choix: [{ t: 'Passer au lundi suivant', vers: 'derive' }],
    },

    pr_lundi: {
      jour: 'Lundi, semaine 25',
      heure: '9 h 15',
      entree: () => ({ confiance: 1 }),
      texte: () => `
<p>Tu ouvres la pull request et tu pars en week-end. Le pipeline y colle la sortie du plan.</p>
<p>Lundi, 9 h 15. Un commentaire d'Inès, sur la dernière ligne :</p>
<p>« <code>1 to destroy</code> ? Pour ajouter deux nœuds ? C'est quoi, <code>aws_instance.db</code> ? »</p>
<p>C'est <code>vif-db-01</code>. La base. Ton code prenait « l'image système la plus récente », une nouvelle est sortie mardi, et Terraform voulait remplacer le serveur, disque compris. Tu ne l'avais pas vu vendredi à 17 h 50. Elle l'a vu lundi à 9 h, en lisant un plan de vingt lignes.</p>
<p>Tu épingles l'image, tu ajoutes <code>prevent_destroy</code>. Le plan redevient ce qu'il devait être : zéro destruction.</p>
${capot('Une relecture ne marche que si ce qu\'on relit est court. Un plan de vingt lignes, lu par une personne reposée qui n\'a pas écrit le changement : c\'est le garde-fou le moins cher qui existe.')}`,
      choix: [{ t: 'Continuer', vers: 'derive' }],
    },

    derive: {
      jour: 'Lundi, semaine 25',
      heure: '11 h 00',
      texte: () => `
<p>Tu relances un plan, pour vérifier que tout est calme. Il ne l'est pas tout à fait :</p>
${code(`
  # aws_security_group.db will be updated in-place
  ~ resource "aws_security_group" "db" {
      - ingress {
          - cidr_blocks = ["0.0.0.0/0"]
          - from_port   = 5432
          - to_port     = 5432
        }
    }
`)}
<p>Une règle de pare-feu qui n'est pas dans ton code : le port de PostgreSQL, ouvert au monde entier. Quelqu'un l'a ajoutée à la main dans la console, pour un essai, et ne l'a jamais retirée. Terraform propose de la supprimer.</p>
<p>La base de Panier Vif est joignable depuis n'importe où sur Internet, depuis une date que personne ne connaît.</p>`,
      choix: [
        { t: 'Supprimer la règle, et lancer un plan chaque nuit qui alerte au moindre écart', vers: 'bilan', fx: { confiance: 1, f: { VEILLE: true } } },
        { t: 'Supprimer la règle et passer à la suite', vers: 'bilan' },
      ],
    },

    bilan: {
      jour: (s) => (s.f.DETRUIT ? 'Lundi, semaine 25' : 'Mercredi, semaine 25'),
      heure: '16 h 00',
      fin: (s) => (s.f.DETRUIT ? 'detruit' : (s.f.STATE !== 'distant' || s.f.REVUE === 'solo') ? 'derive' : 'code'),
      entree: (s) => (!s.f.DETRUIT && s.f.STATE === 'local' ? { energie: -1 } : !s.f.DETRUIT && s.f.STATE === 'git' ? { energie: -1, confiance: -1 } : {}),
      texte: (s) => `
${s.f.DETRUIT
    ? (s.f.MAIN
      ? '<p>La base tourne, sur un serveur que tu as recréé à la main vendredi soir. Terraform, lui, croit toujours gérer une autre machine. Au prochain <code>apply</code>, il voudra remettre le monde en accord avec son state.</p>'
      : '<p>La base tourne, sur un serveur recréé par le code, avec une image épinglée et <code>prevent_destroy</code>. Ça a coûté une demi-heure de plus vendredi soir, pendant que tout le monde attendait.</p>')
    : ''}
${!s.f.DETRUIT && s.f.STATE === 'local'
    ? '<p>Inès a voulu ajouter une règle de pare-feu depuis son poste. Sans ton state, son Terraform ne connaissait rien de l\'existant : <code>Plan: 47 to add</code>. Il proposait de recréer toute l\'infrastructure en double. Elle a lu la dernière ligne et s\'est arrêtée. Tu passes ta journée à déplacer le state dans un bucket, ce que tu aurais pu faire le premier jour.</p>'
    : ''}
${!s.f.DETRUIT && s.f.STATE === 'git'
    ? '<p>Le scanner du pipeline a trouvé le mot de passe de la base, en clair, dans le dépôt Git : il était dans le state. Le fichier garde tout ce que Terraform connaît, secrets compris. Tu changes le mot de passe, tu sors le state du dépôt, et tu découvres qu\'on ne retire pas vraiment un fichier d\'un historique Git.</p>'
    : ''}
${!s.f.DETRUIT && s.f.VEILLE
    ? '<p>Chaque nuit à 4 h, le pipeline lance <code>terraform plan -detailed-exitcode</code>. S\'il trouve un écart entre le code et la réalité, il t\'écrit. La prochaine règle ajoutée « pour un essai » vivra moins de vingt-quatre heures.</p>'
    : ''}
<p>${s.f.DETRUIT
    ? 'La campagne nationale est dans douze jours. Hugo demande si « ce genre de chose » peut se reproduire ce soir-là.'
    : 'L\'infrastructure de Panier Vif tient maintenant dans un dépôt. La campagne nationale est dans dix jours.'}</p>`,
    },
  };

  racine.CHAPITRES.fr.push({
    id: 'ch11',
    numero: 11,
    titre: '1 to destroy',
    techno: 'Terraform',
    jour: 'Lundi, semaine 24',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['SECRET_IN_IMAGE', 'RESTORE_TEST'] },
      { energie: 0, confiance: 2 },
    ],
    transition: { prod: 3, energie: 2 },
    fins: {
      code: {
        titre: 'Zéro destruction',
        texte: 'L\'infra est décrite, relue avant chaque changement, et la base ne peut plus disparaître sur une ligne mal lue.',
      },
      derive: {
        titre: 'Du code, et une seule personne',
        texte: 'L\'infra est dans du code, mais tout repose encore sur ton poste ou sur ta seule relecture. Tu as déplacé le problème de Bastien, pas supprimé.',
      },
      detruit: {
        titre: 'La ligne du bas',
        texte: 'Le plan annonçait une destruction. Il l\'annonçait à 17 h 50, un vendredi, au milieu de vingt lignes attendues.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
