/* Chapter 4: the backup nobody ever restored. PostgreSQL, restores, fatigue. */
(function (racine) {
  'use strict';

  const { code, capot, msg, hm, a } = racine.RECIT_EN;

  /* Théo ran his query at 11:17 AM and took three minutes to work up the nerve to say so */
  const heure = (repli) => (s) => (s.horloge != null ? hm(11, 17 + s.horloge) : repli);

  const noeuds = {

    debut: {
      heure: heure('11:20 AM'),
      entree: (s) => (s.depart.codes.includes('UPLOADS_LOST')
        ? { prod: -2, energie: -1, retire: ['UPLOADS_LOST'], horlogeFixe: 3 }
        : { prod: -1, horlogeFixe: 3 }),
      texte: (s) => `
${s.depart.codes.includes('UPLOADS_LOST')
    ? '<p>You spent the morning restoring the photos. Last night\'s archive doesn\'t exist: under the <code>deploy</code> account, the backup script didn\'t have the storage credentials. The one from the night before did the job. 61,000 files in two hours, minus the receipts uploaded yesterday, gone for good.</p><p>You haven\'t had time yet to look at what that script does with the database.</p>'
    : '<p>Two quiet days. You had started tidying up the wiki.</p>'}
<p>Théo, the developer who joined last month, walks up to your desk. He's pale.</p>
<p>“I wanted to fix a product price in staging. I think I was on prod.”</p>
<p>He turns his screen toward you:</p>
${code(`
UPDATE products SET price_cents = 99
WHERE id = 20481;

UPDATE 14012
`)}
<p>He had selected only the first line before running it. All 14,012 products in the catalog now cost €0.99. For three minutes, customers have been ordering at that price.</p>`,
      choix: [
        { t: 'Put the whole site in maintenance mode', vers: 'reunion', fx: { prod: -2, f: { STOP: 'maintenance' } } },
        { t: 'Disable only checkout with the CHECKOUT_ENABLED feature flag', vers: 'reunion', fx: { prod: -1, horloge: 2, f: { STOP: 'paiement' } } },
        { t: 'Leave the site open and restore the right prices as fast as possible', vers: 'reunion', fx: { f: { STOP: 'ouvert' } } },
      ],
    },

    reunion: {
      heure: heure('11:25 AM'),
      entree: () => ({ horloge: 3 }),
      texte: (s) => `
<p>${s.f.STOP === 'maintenance'
    ? 'The maintenance page goes up. Nobody orders at €0.99 anymore. Nobody orders at all.'
    : s.f.STOP === 'paiement'
      ? 'Customers can still fill their carts. At checkout, a banner asks them to come back in an hour. No more orders go out at €0.99.'
      : 'The site stays open. Every minute, four or five orders go out at €0.99 per item. You tell yourself you\'ll be quick.'}</p>
<p>Hugo, the founder, has heard the news. He writes in #incident: “I want a video call every thirty minutes until this is over. Everyone.”</p>`,
      choix: [
        { t: 'Accept the video calls every thirty minutes', vers: 'source', fx: { horloge: 20, energie: -1, f: { POINTS: 'visio' } } },
        { t: 'Offer a written update in #incident every thirty minutes instead', vers: 'source', fx: { confiance: 1, f: { POINTS: 'ecrit' } } },
        { t: 'Ask Malik to be Hugo\'s only point of contact while you work', vers: 'source', fx: { confiance: 1, f: { POINTS: 'malik' } } },
      ],
    },

    source: {
      heure: heure('11:30 AM'),
      entree: () => ({ horloge: 5 }),
      texte: (s) => `
${s.f.POINTS === 'visio'
    ? '<p>Two video calls have already happened. Ten minutes each, six people, the same questions. Twice, you answered “I\'m looking into it.”</p>'
    : s.f.POINTS === 'ecrit'
      ? '<p>Hugo agrees. You post the first update:</p>' + msg('All prices have been wrong since 11:17 AM. Cause known. Looking for the right source to restore them. Next update at 12 PM.')
      : '<p>Malik takes Hugo aside. “I\'ll keep you posted. Let them work.” You stop getting notifications.</p>'}
<p>You need the prices from before 11:17 AM. The database backup runs every night at 2:30 AM.</p>
${a(s, 'BACKUP_OK')
    ? '<p>You fixed that script two days ago, reading Bastien\'s mailbox. Last night\'s file weighs 3.1 GB and <code>gunzip -t</code> validates it. It\'s the second usable backup in Panier Vif\'s history.</p>'
    : '<p>You open the folder. Last night\'s file weighs 20 bytes. So does yesterday\'s. You scroll back: 20 bytes, 20 bytes, 20 bytes. The last normal-sized file dates from June 24.</p>' + code(`
$ pg_dump paniervif > /dev/null
pg_dump: error: aborting because of server version mismatch
pg_dump: detail: server version: 16.4; pg_dump version: 15.8
`) + '<p>Since the June upgrade, <code>pg_dump</code> has failed every night. The script chains <code>pg_dump | gzip</code> without <code>pipefail</code>: <code>gzip</code> compresses nothing, returns zero, and everyone believes it works.</p>'}`,
      choix: (s) => (a(s, 'BACKUP_OK') ? [
        { t: 'Restore last night\'s backup straight onto the prod database', vers: 'ecrase' },
        { t: 'Restore the backup on the side, into a temporary database, and copy over only the prices', vers: 'a_cote' },
        { t: 'Leave the database alone: have the catalog team re-enter the prices', vers: 'manuel' },
      ] : [
        { t: 'Restore the June backup on the side and take its prices', vers: 'juin' },
        { t: 'Rebuild the prices from the order lines', vers: 'reconstruire' },
        { t: 'Have the catalog team re-enter the prices', vers: 'manuel' },
      ]),
    },

    ecrase: {
      heure: heure('12:15 PM'),
      entree: () => ({ prod: -4, confiance: -2, horloge: 40, f: { ISSUE: 'ecrase' } }),
      texte: () => `
${code(`
$ dropdb paniervif && createdb paniervif
$ gunzip -c "$DUMP" | psql -q paniervif
`)}
<p>Forty minutes later, the prices are right. All of them. The database is exactly as it was at 2:30 AM last night.</p>
<p>It takes you a few seconds to understand what that means. The 312 orders placed this morning no longer exist. Neither do the 28 accounts created since dawn, or the delivery slots booked for this afternoon. The trucks are already loaded, for orders the database has no trace of anymore.</p>
<p>You fixed one column by erasing nine hours of activity.</p>
${capot('A backup puts the whole database back to a point in time, not one table or one column. Restoring over prod means choosing to lose everything written since. The rule: always restore on the side, then copy over only what you need.')}`,
      choix: [{ t: 'Rebuild whatever can be rebuilt', vers: 'apres' }],
    },

    a_cote: {
      heure: heure('12:20 PM'),
      entree: () => ({ horloge: 45, confiance: 1, f: { ISSUE: 'restaure' } }),
      texte: () => `
<p>You restore into a separate database, without touching prod:</p>
${code(`
$ createdb paniervif_restore
$ gunzip -c "$DUMP" | psql -q paniervif_restore
$ psql paniervif_restore -c "\\copy (SELECT id, price_cents FROM products) TO 'prices.csv' CSV"
COPY 14009
`)}
<p>Twenty-five minutes of restore. Then, on prod, inside a transaction:</p>
${code(`
BEGIN;
CREATE TEMP TABLE good_prices (id bigint PRIMARY KEY, price_cents integer);
\\copy good_prices FROM 'prices.csv' CSV
UPDATE products p SET price_cents = o.price_cents
FROM good_prices o WHERE p.id = o.id;
-- UPDATE 14009
SELECT id, name FROM products WHERE id NOT IN (SELECT id FROM good_prices);
-- 3 rows
COMMIT;
`)}
<p>14,009 prices restored. The three remaining products were created this morning: they didn't exist at 2:30 AM. You ask the catalog team for their prices, and they give them to you in two minutes.</p>
<p>Not a single order from this morning was touched.</p>
${capot('Restoring on the side costs twenty-five minutes and risks nothing. The transaction lets you check the result before committing: until you type <code>COMMIT</code>, a <code>ROLLBACK</code> undoes everything. That\'s exactly what Théo was missing.')}`,
      choix: [{ t: 'Reopen and take stock', vers: 'apres' }],
    },

    manuel: {
      heure: '4:30 PM',
      entree: (s) => ({ prod: s.f.STOP === 'ouvert' ? 0 : -2, energie: -1, horlogeFixe: 313, f: { ISSUE: 'manuel' } }),
      texte: (s) => `
<p>The catalog team has an Excel export from last week. Four people get to work: load the file, fix the 200 prices that changed since, check the promotions one by one.</p>
<p>At 4:30 PM, the prices are right. You took no risk with the database. ${s.f.STOP === 'ouvert'
    ? 'The site stayed open for those five hours.'
    : 'The site, on the other hand, sold nothing for five hours, on a weekday.'}</p>
${capot('Not restoring is a real option when you don\'t trust your backups. It costs human time and hours of downtime, not data. The question it leaves open: why don\'t you trust your backups?')}`,
      choix: [{ t: 'Reopen and take stock', vers: 'apres' }],
    },

    juin: {
      heure: heure('12:30 PM'),
      entree: () => ({ horloge: 50, f: { ISSUE: 'juin' } }),
      texte: () => `
<p>You restore the June 24 backup into a separate database, extract the prices, and copy them onto prod. Fifty minutes, cleanly, inside a transaction.</p>
<p>The prices look like prices again. The site reopens.</p>
<p>At 3 PM, the catalog team calls you. 2,300 products have changed price since June, and 900 didn't exist yet: those stayed at €0.99. For two hours, Panier Vif has been selling butter at summer prices and new products for almost nothing.</p>
${capot('A three-month-old backup answers one question: what did the database look like three months ago? That wasn\'t the question. The technique was right, restore on the side and copy over a single column. The source wasn\'t.')}`,
      choix: [{ t: 'Shut checkout again and start over properly', vers: 'reconstruire', fx: { prod: -1, confiance: -2 } }],
    },

    reconstruire: {
      heure: (s) => (s.f.ISSUE === 'juin' ? '3:20 PM' : heure('12:00 PM')(s)),
      entree: () => ({ horloge: 30, f: { RECONSTRUIT: true } }),
      texte: (s) => `
<p>${s.f.ISSUE === 'juin' ? 'This time, you look for a recent source.' : 'No usable backup. You need another source.'} Every order line keeps the unit price at the time of purchase. So the last price each product sold at, before 11:17 AM, is the right one:</p>
${code(`
SELECT DISTINCT ON (product_id) product_id, unit_price_cents
FROM order_lines
WHERE created_at < :incident_start
ORDER BY product_id, created_at DESC;
-- 11204 rows
`)}
<p>11,204 of the 14,012 products get their price back. That leaves 2,808 that haven't sold recently. For those, you have a copy of prod made in staging nine days ago, and the catalog team to check the differences.</p>
<p>Cross-check, verify, apply: it's slow. It takes the rest of the day.</p>`,
      choix: [{ t: 'Keep going', vers: 'soir' }],
    },

    soir: {
      heure: '9:30 PM',
      entree: () => ({ energie: -1, horlogeFin: true }),
      texte: (s) => `
<p>The 11,204 safe prices are ready to apply. The other 2,808 are in a half-checked spreadsheet. The office is empty, except for Inès, who is packing up.</p>
<p>You've been up since ${s.depart.codes.includes('UPLOADS_LOST') ? '7:40 AM, and this is your second incident of the day' : '7 AM'}. You reread the same query for the third time without understanding it.</p>
<p>Malik texts you: “Are we reopening tonight?”</p>`,
      choix: [
        {
          t: 'Finish tonight: apply all 14,012 prices, rereading every query three times',
          vers: 'finir_net',
          verrou: (s) => (s.energie >= 3 ? null : 'You need at least 3 ENERGY to reread anything properly.'),
        },
        { t: 'Finish tonight, fast: apply everything and reopen', vers: 'finir_vite' },
        { t: 'Apply the 11,204 safe prices, hide the other products, reopen and go to bed', vers: 'partiel' },
        { t: 'Hand over to Inès with notes', vers: 'main' },
      ],
    },

    finir_net: {
      heure: '11:40 PM',
      entree: () => ({ energie: -2, f: { ISSUE: 'reconstruit' } }),
      texte: () => `
<p>You force yourself to slow down. Every query inside a transaction, a check <code>SELECT</code> before every <code>COMMIT</code>, ten products verified by hand on the site.</p>
<p>At 11:40 PM, all 14,012 prices are in place and checkout reopens. You go home with no memory of the drive.</p>
${capot('It held because you still had enough left to reread. That\'s not a method: next time, you might have nothing left, and you\'ll only find out afterward.')}`,
      choix: [{ t: 'Take stock the next day', vers: 'apres' }],
    },

    finir_vite: {
      heure: '10:10 PM',
      entree: () => ({ energie: -1, prod: -1, confiance: -1, f: { ISSUE: 'reconstruit' } }),
      texte: () => `
<p>You apply everything in one go. In your last query, you join the spreadsheet on the supplier reference instead of the product ID. The two columns look alike, at 10 PM.</p>
<p>Checkout reopens. The next morning, 140 products carry someone else's price: laundry detergent at the price of yogurt, salmon at the price of salt.</p>
<p>Fourteen hours after the first botched <code>UPDATE</code>, you just ran a second one.</p>
${capot('You can\'t feel fatigue from the inside. You don\'t think “I\'m about to make a mistake,” you think “it\'s almost over.” Past a certain number of hours, the careful decision is the one that no longer requires precision.')}`,
      choix: [{ t: 'Fix it, then take stock', vers: 'apres' }],
    },

    partiel: {
      heure: '10:00 PM',
      entree: () => ({ confiance: 1, f: { ISSUE: 'reconstruit' } }),
      texte: () => `
<p>You apply the 11,204 prices you have no doubt about. In ten minutes, Inès adds a filter that hides the remaining 2,808 products from the catalog.</p>
<p>At 10 PM, checkout reopens on 80% of the catalog, the 80% that makes almost all the sales. You reply to Malik: “Yes, except the products we'll finish tomorrow morning.”</p>
<p>The next day at 10 AM, rested and with the catalog team, the last prices are checked and put back online.</p>
${capot('Between shutting everything and reopening everything, there\'s almost always an acceptable degraded service. Looking for it is part of the job, especially when the person doing the fixing is no longer in shape to finish.')}`,
      choix: [{ t: 'Take stock', vers: 'apres' }],
    },

    main: {
      heure: '9:50 PM',
      entree: (s) => (a(s, 'RUNBOOK')
        ? { confiance: 1, f: { ISSUE: 'reconstruit' } }
        : { energie: -1, f: { ISSUE: 'reconstruit' } }),
      texte: (s) => `
<p>“Inès, I'm done for. Can you finish?”</p>
${a(s, 'RUNBOOK')
    ? '<p>She puts down her bag. Since the Friday of the ad, the two of you have gotten into the habit of writing down the steps before doing them. You leave her ten lines: what\'s done, what\'s left, the check query, when to stop. She applies the safe prices, reopens at 10:30 PM and leaves the rest for tomorrow.</p><p>You sleep nine hours.</p>'
    : '<p>She puts down her bag. You explain out loud, in a jumble, where things stand. She calls you at 10:15 PM to ask which file is the right one. Then at 11 PM, about a query she doesn\'t dare run without you. Checkout reopens at 11:30 PM.</p><p>You neither worked nor slept.</p>'}
${capot('Handing over isn\'t giving up, as long as the handover actually happens. Without written notes, the other person inherits the problem and your phone number.')}`,
      choix: [{ t: 'Take stock the next day', vers: 'apres' }],
    },

    apres: {
      jour: 'The next day',
      heure: '10:00 AM',
      entree: (s) => {
        const fx = { horlogeFin: true };
        if (s.f.STOP === 'ouvert') { fx.prod = -2; fx.confiance = -2; }
        return fx;
      },
      texte: (s) => `
${s.f.STOP === 'ouvert'
    ? '<p>The site stayed open for the whole fix. Accounting ran the numbers: hundreds of orders at €0.99 per item. Hugo had to choose between honoring them at a loss and canceling them one by one. He canceled. This week\'s customer reviews are unreadable.</p>'
    : ''}
<p>Malik has called everyone together. Théo sits at the end of the table and says nothing.</p>
<p>“Two topics,” Malik says. “How a developer who joined last month can write to the prod database from his laptop. And why, on the day we needed a backup, ${a(s, 'BACKUP_OK') ? 'we only had a single valid one, by luck, as of two days ago' : 'we didn\'t have one'}.”</p>
<p>He turns to you. “You have half a day. What do you do with it?”</p>`,
      choix: [
        { t: 'An automated restore test every week, and read-only prod access by default', vers: 'cloture', fx: { codes: ['RESTORE_TEST', 'BACKUP_OK'], confiance: 1, energie: -1, f: { SUITE: 'test' } } },
        { t: 'Fix the backup script and move on', vers: 'cloture', fx: { codes: ['BACKUP_OK'], dette: 2, f: { SUITE: 'script' } } },
        { t: 'Revoke Théo\'s access: he\'s the problem', vers: 'cloture', fx: { codes: ['BACKUP_OK'], dette: 2, confiance: -1, f: { SUITE: 'theo' } } },
      ],
    },

    cloture: {
      jour: 'The next day',
      heure: '5:00 PM',
      fin: (s) => (s.f.ISSUE === 'ecrase' ? 'ecrase' : s.f.ISSUE === 'restaure' ? 'restaure' : 'sans_filet'),
      texte: (s) => (s.f.SUITE === 'test' ? `
<p>You write a job that, every Sunday at 4 AM, restores the latest backup into a throwaway database, counts the rows of the ten biggest tables, and alerts you if any number is zero or if the restore fails.</p>
<p>Then you create two roles: read-only for everyone, write access reserved for migrations that go through the pipeline. Théo is the first to thank you.</p>
${capot('A backup you\'ve never restored is a hypothesis. The only test that counts is restoring it, regularly, without a human having to remember.')}`
        : s.f.SUITE === 'script' ? `
<p>You install the right PostgreSQL client, add <code>set -euo pipefail</code>, and check that last night's file is bigger than 20 bytes. It's 3.1 GB.</p>
<p>Nobody restored it to find out. And Théo, like everyone else, can still run an <code>UPDATE</code> on prod from his laptop.</p>`
          : `
<p>Théo loses his prod access. He spends the week apologizing to everyone, then stops suggesting anything in meetings.</p>
<p>Inès, Malik and you keep yours, with the same SQL client and the same tabs open side by side on staging and prod. The backup, at least, is fixed: you did it along the way.</p>
${capot('If anyone on the team could have made the same mistake, taking it away from one person only removes one candidate out of four. The useful question isn\'t who ran the query, but why nothing stopped them.')}`),
    },
  };

  racine.CHAPITRES.en.push({
    id: 'ch4',
    numero: 4,
    titre: 'The backup nobody restored',
    techno: 'Backups',
    jour: (s) => (s.depart.codes.includes('UPLOADS_LOST') ? 'Wednesday, week 6' : 'Thursday, week 6'),
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['UPLOADS_LOST'], energie: 3, confiance: 2 },
      { codes: ['BACKUP_OK', 'RUNBOOK'] },
      { codes: ['RUNBOOK'], energie: 2 },
    ],
    fins: {
      restaure: {
        titre: 'On the side, then one column',
        texte: 'The backup existed, it was valid, and you didn\'t let it wipe out the morning. Three conditions met for the first time.',
      },
      sans_filet: {
        titre: 'No safety net',
        texte: 'The prices came back without help from a backup. It worked because the database happened to keep a trace somewhere else. The next damaged table might not.',
      },
      ecrase: {
        titre: 'Nine hours erased',
        texte: 'The backup was good. It\'s the way it was restored that turned one wrong column into a vanished morning.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
