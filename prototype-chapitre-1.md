# Vendredi, 16 h 42

*Prototype papier du chapitre 1 - 12 paragraphes, 3 fins possibles.*

*Remplacé par la version web jouable (`jeu.html`, sources dans `site/`). Les chiffres et le mécanisme de panne y ont été corrigés ; ce fichier reste comme archive.*

## Ta feuille d'astreinte

Note sur un papier :

- **PROD : 10** (à 0, la boîte perd ses clients et toi ton poste)
- **CONFIANCE : 5** (ce que l'équipe est prête à te laisser décider)
- **DETTE : 0** (ce que tu repousses à plus tard)
- **Mots-codes :** aucun pour l'instant. Tu en noteras quand le texte te le demande.

Ne lis pas les paragraphes dans l'ordre. Commence au 1 et suis les renvois.

---

## 1

Tu as rejoint Panier Vif il y a trois semaines. Livraison de courses à Nantes, 22 salariés, et toi : le premier poste DevOps de la boîte.

Malik, le CTO, pose son ordinateur sur ton bureau.

« La pub télé passe demain à 20 h 50. Le code promo RENTREE doit marcher, limité aux 5 000 premières commandes. La PR d'Inès est prête. Il ne manque que ton feu vert. »

Tu ouvres la PR. Le code est propre. La migration tient en deux lignes :

```sql
ALTER TABLE orders ADD COLUMN promo_code text;
CREATE INDEX idx_orders_promo_code ON orders (promo_code);
```

Tu vérifies deux chiffres. La table `orders` contient 38 millions de lignes. Et le vendredi soir, c'est le pic : environ 120 commandes écrites par seconde.

La CI est verte.

- Tu approuves et tu lances le déploiement. **Va au 7.**
- Tu demandes à Inès de modifier la migration avant de livrer. **Va au 4.**
- Tu annonces que rien ne part en prod un vendredi après 16 h. Ce sera lundi. **Va au 9.**

---

## 2

Samedi, 20 h 51. La pub vient de passer. 4 000 visiteurs en 90 secondes.

À chaque validation de panier, l'application vérifie le quota :

```sql
SELECT count(*) FROM orders WHERE promo_code = 'RENTREE';
```

Sans index, PostgreSQL relit les 38 millions de lignes. À chaque commande. Le CPU de la base monte à 100 %, le paiement met 14 secondes à répondre, puis ne répond plus.

Tu dois maintenant créer l'index que tu avais repoussé, en plein pic, sur une base à genoux.

**PROD - 4.** Raye SANSINDEX : la dette vient d'être payée, avec les intérêts.

> **Sous le capot.** Le choix du vendredi n'était pas faux, il était incomplet. Livrer sans l'index était défendable. Livrer sans l'index *et sans date pour le créer* ne l'était pas.

*Fin du prototype (fin 2 sur 3).*

---

## 3

Tu tiens bon. Tu rentres chez toi.

À 19 h 30, ton téléphone vibre dans le tram. Malik a les droits admin sur le pipeline. Il a déployé lui-même.

**CONFIANCE - 1.**

> **Sous le capot.** Dire non n'a pas supprimé le risque. Ça t'a seulement sorti de la pièce où il se prenait.

**Va au 7.** Les choix qui s'y présentent, tu les fais depuis ton téléphone.

---

## 4

« Qu'est-ce qui cloche ? demande Inès. La CI est verte. »

Tu as trois façons de réécrire la migration.

**Option A** - deux migrations séparées :

```sql
-- migration 1
SET lock_timeout = '3s';
ALTER TABLE orders ADD COLUMN promo_code text;
```

```sql
-- migration 2 (hors transaction)
CREATE INDEX CONCURRENTLY idx_orders_promo_code ON orders (promo_code);
```

**Option B** - un DEFAULT pour que ce soit instantané :

```sql
ALTER TABLE orders ADD COLUMN promo_code text NOT NULL DEFAULT '';
CREATE INDEX idx_orders_promo_code ON orders (promo_code);
```

**Option C** - la colonne ce soir, l'index la semaine prochaine, au calme :

```sql
ALTER TABLE orders ADD COLUMN promo_code text;
```

- Tu choisis A. **Va au 5.**
- Tu choisis B. **Va au 7.**
- Tu choisis C. **Va au 6.**

---

## 5

L'option A a un prix. L'outil de migration d'Inès enveloppe tout dans une transaction, et `CREATE INDEX CONCURRENTLY` refuse d'y tourner. Il faut changer la config, refaire la revue, repasser en staging.

Vous livrez à 18 h 05 au lieu de 16 h 50. Malik regarde sa montre deux fois.

L'index se construit en onze minutes. Pendant ce temps, les commandes continuent de s'écrire. Tu vérifies avec `\d orders` que l'index n'est pas marqué `INVALID`. Il ne l'est pas.

Personne ne remarque rien. C'était le but.

**CONFIANCE + 1.**

> **Sous le capot.** `CREATE INDEX` classique bloque toutes les écritures sur la table pendant la construction. `CONCURRENTLY` est plus lent et peut échouer en laissant un index invalide à supprimer, mais il ne bloque personne.

**Va au 10.**

---

## 6

La colonne seule passe en quelques millisecondes. À 17 h 10, tout est en prod. Malik paie sa tournée.

Tu crées un ticket « Ajouter l'index sur promo_code ». Tu ne lui mets pas de date.

**CONFIANCE + 1. DETTE + 2.** Note le mot-code **SANSINDEX**.

**Va au 10.**

---

## 7

La migration démarre. La colonne est ajoutée en un instant.

Puis `CREATE INDEX` pose son verrou sur `orders` et commence à lire 38 millions de lignes. Les lectures passent. Les écritures attendent.

120 commandes par seconde attendent.

En quarante secondes, le canal #support se remplit : « paiement qui tourne dans le vide », « erreur 500 au panier ». Malik est debout derrière toi.

**PROD - 3.**

- Tu annules la migration tout de suite avec `pg_cancel_backend`. **Va au 11.**
- Tu laisses finir. L'index doit être presque construit. **Va au 12.**

> **Sous le capot.** Si tu viens de l'option B : le DEFAULT n'était pas le problème. Depuis PostgreSQL 11, ajouter une colonne avec une valeur par défaut constante est instantané. Tu as corrigé la ligne qui ne posait pas de souci.

---

## 8

Samedi, 20 h 51. La pub vient de passer. 4 000 visiteurs en 90 secondes.

Tu regardes le tableau de bord depuis ton canapé. Le trafic est multiplié par six. Le temps de réponse du paiement reste à 180 ms.

Personne ne t'écrit.

C'est ça, le métier : quand tu le fais bien, il ne se passe rien.

Si tu as noté POSTMORTEM ou CASCADE, lundi à 10 h tu animes ton premier post-mortem. Ce sera le chapitre 2.

*Fin du prototype (fin 1 sur 3, ou fin 3 sur 3 si tu es passé par le 7).*

---

## 9

Malik ne hausse pas le ton. C'est pire.

« La pub est payée. 40 000 euros. Elle passe demain, que tu sois d'accord ou non. »

**CONFIANCE - 2.**

> **Sous le capot.** « Pas de déploiement le vendredi » n'est pas une règle de sécurité. C'est un aveu : on ne fait pas assez confiance à ses déploiements pour les faire quand ça compte.

- Tu maintiens ta position. **Va au 3.**
- Tu proposes une troisième voie : livrer ce soir, mais autrement. **Va au 4.**

---

## 10

La soirée se termine. Le week-end commence.

- Si tu as noté **SANSINDEX**, **va au 2.**
- Sinon, **va au 8.**

---

## 11

```sql
SELECT pg_cancel_backend(48213);
```

La transaction est annulée. Colonne et index disparaissent ensemble, le verrou tombe, les commandes en attente passent d'un coup.

Six minutes d'incident. Malik souffle.

Inès et toi réécrivez la migration correctement (pour savoir comment, rejoue et va au 4). Vous relivrez à 18 h 40.

Note le mot-code **POSTMORTEM**.

**Va au 10.**

---

## 12

Tu attends. Deux minutes. Cinq.

Chaque commande bloquée garde une connexion à la base. Le pool est plein. La sonde `/health` de l'API, qui fait un `SELECT 1`, n'obtient plus de connexion et échoue. Kubernetes en conclut que les pods sont morts et les redémarre. Tous. En boucle.

Le site entier est tombé, plus seulement le paiement.

L'index se termine au bout de neuf minutes. Il en faut six de plus pour que les pods se stabilisent.

**PROD - 3. CONFIANCE - 1.** Note le mot-code **CASCADE**.

> **Sous le capot.** Une sonde de vie qui dépend de la base transforme une base lente en application morte. La sonde de vie doit répondre à une seule question : « ce processus est-il coincé ? »

**Va au 10.**
