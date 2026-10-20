# Feuille de route d'écriture

Livre : **Vendredi, 16 h 42** (12 chapitres, environ 390 paragraphes, 45 000 mots)

## État au 1er octobre 2026

- **Fait :** un premier jet des 12 chapitres, jouable de bout en bout dans `jeu.html` (180 paragraphes, 37 fins). Le moteur, le simulateur de chemins et l'assemblage existent dans `site/` et `outils/`.
- **Pas fait :** tout ce qui ne s'écrit pas. Aucune commande n'a été exécutée dans un labo, aucun chapitre n'a été relu par un spécialiste, aucun lecteur n'a joué. Les incidents viennent d'un premier jet générique, pas de la liste des 20 incidents réels.
- **Conséquence :** les phases 2, 4, 6 et 7 ne sont plus des phases d'écriture mais de vérification et de réécriture, chapitre par chapitre. Les étapes 1 (fiche), 3 (graphe) et 4 (premier jet) de la méthode sont faites ; les étapes 2, 5, 7 et 8 restent entières.

## Hypothèses

- Rythme : 6 heures par semaine. Si tu en as 3, double les durées. Si tu en as 12, divise par deux.
- Démarrage : semaine du 5 octobre 2026.
- Charge totale estimée : 200 heures, soit 34 semaines. Fin visée : juin 2027.
- Le goulot n'est pas la rédaction. Ce sont la vérification technique et les tests de lecture, que personne ne peut faire à ta place.

## Vue d'ensemble

| Phase | Contenu | Semaines | Heures | Sortie |
|-------|---------|----------|--------|--------|
| 0 | Cadrage | 1 | 3 | Fiche de cadrage signée |
| 1 | Bible et outillage | 1-2 | 12 | Bible, gabarits, validateur, labo |
| 2 | Chapitre 1 complet | 3-4 | 12 | Chapitre 1 en version finale |
| 3 | Test de lecture, go/no-go | 5 | 5 | Décision : continuer, ajuster, arrêter |
| 4 | Saison 1 (chapitres 2 à 4) | 6-11 | 36 | 4 chapitres jouables d'affilée |
| 5 | Publication saison 1 | 12-13 | 10 | Saison 1 entre les mains de vrais lecteurs |
| 6 | Saison 2 (chapitres 5 à 8) | 14-21 | 48 | 8 chapitres |
| 7 | Saison 3 (chapitres 9 à 12) | 22-29 | 48 | 12 chapitres |
| 8 | Assemblage et équilibrage | 30-33 | 20 | Manuscrit complet |
| 9 | Lancement | 34 | 6 | Livre publié |

---

## Phase 0 - Cadrage (semaine 1, 3 h)

Quatre décisions. Tant qu'elles ne sont pas prises, tout le reste est écrit pour personne.

- [ ] **Public.** Par défaut : dev ou ops junior qui sait ouvrir un terminal et lire du SQL.
- [ ] **Support.** Papier/PDF, ou web interactif. La feuille d'astreinte version 2 (4 jauges, une horloge, 3 tools, 8 flags) est lourde à tenir à la main. Par défaut : écrire en Markdown neutre, sortir en PDF, garder le web comme option.
- [ ] **Objectif.** Vendre, former, ou se faire connaître. Décide du prix, de la longueur et du canal.
- [ ] **Qui relit.** Trouver dès maintenant 3 lecteurs-testeurs et 2 relecteurs techniques (un côté bases de données, un côté Kubernetes).

Sortie : une page, `cadrage.md`.

## Phase 1 - Bible et outillage (semaines 1-2, 12 h)

### La bible (6 h)

- [ ] **Liste de 20 incidents réels**, vécus ou entendus de première main. C'est la matière première du livre : sans elle, le texte sera générique.
- [ ] **Personnages** : Malik, Inès, Bastien, plus 2 ou 3 autres. Pour chacun : ce qu'il veut, ce qu'il craint, sa phrase type.
- [ ] **Carte de l'infra de Panier Vif** à 3 dates : mois 1 (un serveur, un cron), mois 3 (conteneurs, pipeline), mois 6 (cluster, Terraform).
- [ ] **Chronologie** des 6 mois : quel chapitre tombe quelle semaine, quels événements de la boîte.
- [ ] **Guide de style** : tutoiement, présent, phrases courtes, pas de genre imposé au héros, encadrés « Sous le capot » de 3 phrases maximum.
- [ ] **Règles du jeu figées** : feuille d'astreinte, seuils de l'horloge, effet de l'ÉNERGIE basse.

### L'outillage (6 h)

- [ ] **Un fichier Markdown par chapitre**, paragraphes numérotés localement (1.1, 1.2), renumérotés et mélangés à l'assemblage.
- [ ] **Script de validation du graphe** : renvois cassés, paragraphes inatteignables, impasses, flags donnés mais jamais lus, flags lus mais jamais donnés.
- [ ] **Script de simulation** : parcourt tous les chemins et sort la distribution finale des jauges. Sert à voir si un chapitre est gagnable par hasard ou impossible.
- [ ] **Labo technique** : un `docker compose` avec PostgreSQL pour la saison 1. Chaque commande du livre y est exécutée, chaque sortie affichée est une vraie sortie.
- [ ] **Export** PDF et EPUB.

Sortie : `bible.md`, `gabarit-chapitre.md`, dossier `outils/`, dossier `labo/`.

## Phase 2 - Chapitre 1 au format complet (semaines 3-4, 12 h)

Le prototype passe de 12 à 30-35 paragraphes, avec l'horloge, l'ÉNERGIE, la visio de crise et le train de 18 h 12.

Ce chapitre sert de référence : c'est sur lui qu'on règle la méthode, qui sera ensuite répétée 11 fois.

### La méthode, pour chaque chapitre (12 h)

| Étape | Quoi | Durée | Qui |
|-------|------|-------|-----|
| 1 | **Fiche d'incident** d'une page : le mécanisme, le choix tentant, le choix discutable, le bon choix et son coût, la réunion, la contrainte perso, les flags | 1 h | Toi |
| 2 | **Reproduire l'incident dans le labo**. Si tu n'arrives pas à le casser pour de vrai, il ne va pas dans le livre | 2 h | Toi |
| 3 | **Graphe des paragraphes** avant d'écrire une ligne : nœuds, renvois, coûts en minutes, effets sur les jauges | 1 h | Claude, tu valides |
| 4 | **Premier jet** | 2 h | Claude, à partir de la fiche et des sorties du labo |
| 5 | **Réécriture à ta voix** : les dialogues, les détails vécus, ce qui sonne faux | 2 h | Toi |
| 6 | **Validation automatique** : graphe et simulation | 0,5 h | Script |
| 7 | **Relecture technique** par quelqu'un qui pratique la techno | 1 h | Relecteur |
| 8 | **Test de lecture** par 2 personnes, sans explication | 1,5 h | Testeurs |
| 9 | **Corrections** | 1 h | Toi et Claude |

Critère de sortie d'un chapitre : le validateur passe, le relecteur technique ne trouve plus d'erreur, et au moins un testeur a rejoué pour voir une autre fin.

## Phase 3 - Test de lecture, go/no-go (semaine 5, 5 h)

- [ ] Faire jouer le chapitre 1 à 3-5 personnes du public visé, en les regardant sans rien dire.
- [ ] Noter pour chacun : durée, chemin pris, premier choix, nombre de parties, moment où il décroche, erreur technique relevée.
- [ ] Poser une seule question à la fin : « Tu veux la suite ? »

| Résultat | Décision |
|----------|----------|
| Au moins 3 sur 5 rejouent et veulent la suite | Continuer |
| Ils finissent mais ne rejouent pas | Ajuster : les choix sont trop lisibles ou les fins trop proches |
| Ils ne tiennent pas la feuille d'astreinte | Passer au web, ou réduire à 3 jauges |
| Ils décrochent avant la fin | Arrêter, ou repartir sur un format court (épisodes de 10 paragraphes) |

## Phase 4 - Saison 1 (semaines 6-11, 36 h)

Deux semaines par chapitre, méthode de la phase 2.

- [ ] **Semaines 6-7 : chapitre 2, Disque plein** (Linux). Labo : remplir un disque, supprimer un fichier ouvert, saturer les inodes.
- [ ] **Semaines 8-9 : chapitre 3, Le script de Bastien** (shell). Labo : le script tourne à la main et casse sous cron.
- [ ] **Semaines 10-11 : chapitre 4, La sauvegarde jamais restaurée**. Labo : un dump vide depuis 3 mois, une restauration réelle chronométrée.

Point de contrôle fin de semaine 11 : jouer les 4 chapitres d'affilée. Les flags du chapitre 1 doivent encore peser au chapitre 4.

## Phase 5 - Publication saison 1 (semaines 12-13, 10 h)

Publier avant d'avoir fini. Quatre chapitres lus par 50 inconnus t'apprennent plus que douze chapitres dans un tiroir.

- [ ] Mise en page, couverture provisoire, relecture orthographique.
- [ ] Diffusion selon l'objectif choisi en phase 0.
- [ ] Un formulaire de retour à la fin : meilleur chapitre, pire chapitre, erreur trouvée, envie de la suite.

Critère pour lancer la saison 2 : des lecteurs que tu ne connais pas demandent la suite. Sinon, la saison 1 reste un petit livre terminé, ce qui est déjà un résultat.

## Phase 6 - Saison 2 (semaines 14-21, 48 h)

- [ ] **Avant de commencer** : étendre le labo (registre d'images, pipeline local, cluster `kind` ou `k3d`). Compter 4 h, prises sur le chapitre 5.
- [ ] Semaines 14-15 : chapitre 5, Docker.
- [ ] Semaines 16-17 : chapitre 6, CI/CD.
- [ ] Semaines 18-19 : chapitre 7, Python.
- [ ] Semaines 20-21 : chapitre 8, Kubernetes. Le plus risqué : prévoir le relecteur technique dès la semaine 18.

## Phase 7 - Saison 3 (semaines 22-29, 48 h)

- [ ] Semaines 22-23 : chapitre 9, DNS et TLS.
- [ ] Semaines 24-25 : chapitre 10, astreinte et observabilité.
- [ ] Semaines 26-27 : chapitre 11, Terraform.
- [ ] Semaines 28-29 : chapitre 12, le final. Il encaisse tous les flags : commencer par lister ceux qui sont encore actifs.

## Phase 8 - Assemblage et équilibrage (semaines 30-33, 20 h)

- [ ] **Simulation complète** sur les 12 chapitres : part des chemins qui finissent à PROD 0, part des fins heureuses. Viser un livre dur mais gagnable.
- [ ] **Renumérotation et mélange** des paragraphes de 1 à 390.
- [ ] **Relecture de continuité** : personnages, dates, état de l'infra d'un chapitre à l'autre.
- [ ] **Vérification finale du labo** : relancer toutes les commandes sur les versions courantes des outils.
- [ ] **10 lecteurs bêta** sur le livre entier.
- [ ] Correction orthographique professionnelle, couverture, feuille d'astreinte à imprimer.

## Phase 9 - Lancement (semaine 34, 6 h)

- [ ] Choix du canal : auto-édition ou éditeur technique. À trancher à la fin de la phase 5, avec les chiffres de la saison 1 en main.
- [ ] Page de présentation avec le chapitre 1 jouable gratuitement.
- [ ] Annonce aux lecteurs de la saison 1.

---

## Risques et coupe-circuits

| Risque | Signal | Réponse |
|--------|--------|---------|
| Abandon en cours de route | Deux semaines de suite sans avancer | S'arrêter à la fin de la saison en cours et publier ce qui existe |
| Erreur technique publiée | Un lecteur en trouve une | Corriger sous 48 h, tenir une page d'errata publique |
| Chapitres trop longs à produire | Un chapitre dépasse 18 h | Réduire à 25 paragraphes, ou retirer la couche humaine de ce chapitre |
| Choix trop évidents | Les testeurs gagnent du premier coup | Rendre le bon choix plus coûteux, jamais le mauvais plus caché |
| Feuille d'astreinte trop lourde | Les testeurs arrêtent de noter | Passer au web, ou fusionner DETTE et flags |
| Texte générique | Un relecteur dit « j'ai déjà lu ça » | Revenir à la liste des 20 incidents réels |

## Les trois prochaines actions

1. Répondre aux 4 décisions de la phase 0.
2. Écrire la liste des 20 incidents réels.
3. Contacter 3 testeurs et 2 relecteurs techniques.
