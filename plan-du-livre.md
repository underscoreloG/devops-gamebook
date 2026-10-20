# Plan du livre

Titre de travail : **Vendredi, 16 h 42**

## Le fil rouge

Tu es le premier poste DevOps de Panier Vif (livraison de courses, Nantes, 22 salariés). Le livre couvre tes 6 premiers mois, de la première pub télé locale (chapitre 1) à la campagne nationale (chapitre 12). Entre les deux, la boîte grossit, l'infra aussi, et chaque raccourci pris revient plus tard.

Personnages récurrents : Malik (CTO, pressé), Inès (dev back, rigoureuse), Bastien (l'ancien qui a tout monté seul et dont les scripts tournent encore).

## Les 12 chapitres

| # | Titre | Techno principale | La situation | Le choix tentant qui casse la prod | Le choix discutable | Lien avec le reste |
|---|-------|-------------------|--------------|-------------------------------------|---------------------|--------------------|
| 1 | Vendredi, 16 h 42 | PostgreSQL | Migration sur 9 M de lignes avant la pub | `CREATE INDEX` sans `CONCURRENTLY` en plein pic | Livrer la colonne sans l'index | Donne NO_INDEX, POSTMORTEM, LOST_ORDERS, RUNBOOK |
| 2 | Disque plein | Linux | Le serveur historique est à 100 %, plus rien ne s'écrit | `rm` sur un log encore ouvert par le processus : l'espace n'est pas libéré, tu supprimes autre chose | Agrandir le disque sans chercher la cause | Lu si POSTMORTEM. Donne LOGROTATE ou QUICK_FIX |
| 3 | Le script de Bastien | Shell | Un cron de nettoyage que personne n'ose toucher | `rm -rf "$DIR"/*` avec une variable vide sous cron | Tout réécrire en Python (2 jours, le bug reste en prod pendant ce temps) | Donne UPLOADS_LOST si les fichiers clients sont effacés |
| 4 | La sauvegarde jamais restaurée | Sauvegardes, PostgreSQL | Il faut restaurer. Le dump nocturne existe. Personne ne l'a jamais testé | Restaurer le dump par-dessus la prod et écraser la journée | Restaurer à côté et recopier à la main | Plus dur si UPLOADS_LOST. Donne RESTORE_TEST |
| 5 | Ça marche sur ma machine | Docker | Première conteneurisation de l'API | Déployer le tag `latest`, laisser un secret dans une couche de l'image | Épingler par tag plutôt que par digest, tourner en root « pour l'instant » | Donne SECRET_IN_IMAGE |
| 6 | Le pipeline | CI/CD | Un test instable bloque une livraison urgente | Désactiver le test, livrer sans avoir jamais testé le rollback | Validation manuelle obligatoire sur tout (les livraisons grossissent) | Donne NO_ROLLBACK |
| 7 | L'outil de Malik | Python | Script de remboursement après un incident | Pas d'idempotence : relancé après un plantage, il rembourse deux fois. Appels HTTP sans timeout | `except Exception: pass` pour « finir le lot » | Donne DOUBLEPAIE |
| 8 | La grande migration | Kubernetes | Passage de l'API sur un cluster | Ni requests ni limits, sonde de vie branchée sur la base, `kubectl apply` dans le mauvais contexte | Mettre des limits CPU (le débat existe vraiment) | Rappel du chapitre 1 : le contrôle de santé branché sur la base |
| 9 | C'est toujours le DNS | Réseau, DNS, TLS | Bascule de domaine, certificat qui expire dimanche | Changer l'enregistrement avec un TTL de 24 h puis éteindre l'ancien serveur | Renouveler le certificat à la main « cette fois » | Donne MANUAL_CERT |
| 10 | 3 h 12 | Observabilité, astreinte | Tu es d'astreinte seul depuis 4 mois. 140 alertes par semaine, dont une vraie | Couper le canal d'alertes, ou acquitter et se rendormir | Alerter sur le CPU plutôt que sur ce que vit le client. Ne pas réveiller Malik | Donne MUTED_ALERTS. Plus court si TOOLS cochés |
| 11 | 1 to destroy | Terraform, cloud | L'infra passe en code | Appliquer un plan sans lire la ligne « 1 to destroy » sur la base | Corriger à la main dans la console pendant l'incident, « on reportera » | Sauvé ou non selon RESTORE_TEST |
| 12 | Samedi, 20 h 50 | Tout | Pub nationale, trafic x 40 | L'autoscaling multiplie les pods, qui saturent les connexions de la base | Geler toutes les livraisons 2 semaines avant | Tous les flags restants sont encaissés ici |

## La couche humaine

Réunions, astreinte, vie perso et observabilité ne sont pas des chapitres à part. Ce sont des mécaniques qui traversent tous les chapitres, parce que dans la vraie vie elles s'invitent pendant l'incident, pas après.

### Feuille d'astreinte (version 2)

| Élément | Départ | Rôle |
|---------|--------|------|
| PROD | 10 | Santé du service. À 0, c'est fini |
| CONFIANCE | 5 | Ce que l'équipe te laisse décider |
| DETTE | 0 | Ce que tu as repoussé |
| ÉNERGIE | 5 | Ce qu'il te reste. Nuits d'astreinte et week-ends travaillés la font baisser |
| HORLOGE | 0 min | Remise à zéro à chaque incident. Chaque paragraphe a un coût en minutes |
| TOOLS | 3 cases vides | LOGS, METRICS, TRACES. Tu les coches quand tu investis dedans |

### Les quatre mécaniques

**1. L'horloge.** Pendant un incident, chaque action coûte des minutes. À 15, 30 et 60 minutes, le texte déclenche des conséquences (PROD baisse, un client publie une capture, la direction s'en mêle). Une réunion de crise coûte 10 minutes. Chercher dans les logs en SSH coûte 15 minutes, 3 si LOGS est coché.

**2. Les réunions.** Jamais inutiles par nature : la même réunion aide ou plombe selon le moment et le format. Chaque chapitre en contient une, et le lecteur choisit d'y aller, de l'écourter, de la refuser ou de la transformer.

- Qui coûtent : la visio de crise à 9 où chacun demande « on en est où ? », le point d'avancement toutes les 30 minutes exigé par la direction, le comité d'une heure pour une décision de deux lignes.
- Qui paient : le post-mortem sans coupable, la passation d'astreinte de 15 minutes, le go/no-go avant un lancement, la revue à deux d'un plan Terraform.
- Le piège : refuser une réunion inutile coûte de la CONFIANCE. Le bon choix est souvent de la remplacer (un message d'état toutes les 15 minutes, une personne désignée pour communiquer).

**3. L'énergie et la vie perso.** Chaque chapitre pose une contrainte personnelle qui entre en conflit avec l'incident. Sous 2 d'ÉNERGIE, certaines bonnes options disparaissent du texte (« si ton ÉNERGIE est inférieure à 2, tu ne remarques pas la ligne *1 to destroy* »). La fatigue ne donne pas un malus, elle retire des choix. Le choix tentant qui casse est presque toujours de jouer au héros.

**4. L'observabilité.** Ce que tu vois pendant un incident dépend de ce que tu as instrumenté avant. Investir coûte du temps et de la CONFIANCE sur le moment (« on n'a pas le temps pour des tableaux de bord »), et ouvre des raccourcis dans les chapitres suivants.

### Fil par chapitre

| # | La réunion | Vie perso, astreinte | Observabilité |
|---|------------|----------------------|---------------|
| 1 | Visio de crise à 9 pendant l'incident | Ton train part à 18 h 12 | Aucune : c'est le support qui t'apprend la panne |
| 2 | Post-mortem : chercher un coupable ou une cause | Inès, désignée coupable, ne te signale plus rien ensuite | Diagnostic à la main en SSH. Première occasion de cocher METRICS (alerte disque) |
| 3 | Comité d'une heure pour décider si on touche au script | Bastien est en congé : l'appeler ou pas | Le cron échoue en silence, ses mails partent dans une boîte que personne ne lit |
| 4 | Point d'avancement toutes les 30 minutes exigé par la direction | 14 heures éveillé : continuer ou passer la main | Personne ne sait si la sauvegarde de la nuit a réussi |
| 5 | Revue de conception : 30 minutes avec un document, ou 2 heures sans | Rien : chapitre de respiration, ÉNERGIE + 1 | Les logs écrits dans le conteneur disparaissent au redémarrage. Occasion de cocher LOGS |
| 6 | Rétrospective qui ajoute une validation manuelle partout | Livraison à 17 h 50, crèche à 18 h 30 | Impossible de dire quelle version tourne en prod |
| 7 | Réunion avec la compta avant de coder (utile, et tentante à sauter) | Malik veut le script « pour ce soir » | Le script ne journalise rien : impossible de savoir qui a été remboursé |
| 8 | Go/no-go de migration contre point hebdo à 12 personnes | Bascule prévue de nuit : seul ou à deux | Tableau de bord vert, clients en erreur : la moyenne cache le p99. Occasion de cocher TRACES |
| 9 | Réunion pour découvrir qui a les accès au nom de domaine | Le certificat expire dimanche, tu es à un mariage | Rien ne surveille le site de l'extérieur |
| 10 | Passation d'astreinte : la faire ou la zapper | Astreinte seul depuis 4 mois. Réveiller quelqu'un à 3 h 12 ou s'acharner seul | Alerter sur les symptômes. Tout journaliser multiplie la facture par 4 |
| 11 | Revue du plan à deux contre comité hebdomadaire des changements | ÉNERGIE basse : la ligne critique t'échappe | Détecter les écarts entre le code et la console |
| 12 | Go/no-go avant la pub, salle de crise pendant | Tes vacances sont posées depuis 4 mois sur cette semaine-là | Tout ce que tu as coché paie ici |

## Règles de construction

1. **Un chapitre = un incident = une techno principale + un rappel d'un chapitre précédent.** Pas de chapitre « tour d'horizon ».
2. **Le mauvais choix est toujours le plus rapide ou celui que demande quelqu'un.** Le bon coûte du temps ou de la CONFIANCE.
3. **Chaque chapitre converge vers un seul paragraphe de sortie.** L'état passe par les jauges et les flags, pas par des branches parallèles.
4. **8 flags actifs au maximum.** Au-delà, la feuille papier devient ingérable.
5. **Chaque commande et chaque config est exécutée pour de vrai avant publication.** Une erreur technique dans un encadré « Sous le capot » tue la crédibilité du livre.
6. **On enseigne des mécanismes, pas des outils** : verrous, variables non définies, idempotence, sondes, TTL. La syntaxe change, le piège reste.
7. **Le non-technique n'a jamais son propre chapitre.** Il interrompt l'incident technique en cours, sinon le livre devient un manuel de management.
8. **Une seule réunion et une seule contrainte perso par chapitre.** Au-delà, l'incident technique passe au second plan.
9. **Aucun personnage n'est idiot.** Malik a de bonnes raisons d'ouvrir sa visio de crise. Le lecteur doit hésiter.

## Taille

- Prototype actuel : 12 paragraphes, environ 1 100 mots.
- Chapitre complet visé : 30 à 35 paragraphes, 3 500 à 4 000 mots (couche humaine comprise).
- Livre : environ 390 paragraphes, 45 000 mots.

## Découpage proposé

- **Saison 1 (chapitres 1 à 4)** : base de données, Linux, shell, sauvegardes. Forme un arc complet (le script du 3 crée le besoin de restauration du 4) et ne demande aucun cluster au lecteur.
- **Saison 2 (5 à 8)** : Docker, CI/CD, Python, Kubernetes.
- **Saison 3 (9 à 12)** : réseau, supervision, Terraform, final.

## Ce que le livre ne couvre pas

Service mesh, GitOps avancé, multi-cloud, FinOps, Kafka. Chacun mérite un incident, aucun n'entre dans 12 chapitres.
