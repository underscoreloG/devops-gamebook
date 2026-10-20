/* Chapter 1: the migration. This file only holds the story; rendering lives in moteur.js. */
(function (racine) {
  'use strict';

  const { code, capot, msg, hm } = racine.RECIT_EN;

  /* Times: Friday slips by 10 minutes if you took the time to read the PR */
  const retard = (s) => (s.f.LU ? 10 : 0);
  const ven = (s, h, m) => hm(h, m + retard(s));
  const debut = (s) => (s.f.SAMEDI ? [20, 51] : s.f.LOIN ? [19, 6] : [16, 50 + retard(s)]);
  const heureIncident = (s) => { const d = debut(s); return hm(d[0], d[1] + (s.horloge || 0)); };
  const apresIncident = (s, extra) => { const d = debut(s); return hm(d[0], d[1] + (s.f.DUREE || 0) + extra); };

  const ERREUR_TRANSACTION = 'ERROR:  CREATE INDEX CONCURRENTLY cannot run inside a transaction block';

  const choixDepart = [
    { t: 'Approve and start the deploy', vers: 'deploy' },
    { t: 'Ask Inès to change the migration', vers: 'reecrire' },
    { t: 'Announce that nothing ships to prod on a Friday after 4 PM', vers: 'refus' },
    { t: 'Read the rest of the PR first (10 minutes)', vers: 'lire', si: (s) => !s.f.LU },
  ];

  const apresVendredi = (s) => (s.codes.includes('NO_INDEX') ? 'sam_incident' : 'sam_calme');

  const noeuds = {

    pr: {
      heure: '4:42 PM',
      texte: () => `
<p>You joined Panier Vif three weeks ago. Grocery delivery in Nantes, 22 employees, and you are the company's first DevOps hire.</p>
<p>Malik, the CTO, sets his laptop down on your desk.</p>
<p>“The TV ad airs tomorrow at 8:50 PM. The RENTREE promo code has to work, capped at the first 5,000 orders. Inès's PR is ready. All it needs is your green light.”</p>
<p>You open the PR. The migration is two lines long:</p>
${code(`
ALTER TABLE orders ADD COLUMN promo_code text;
CREATE INDEX idx_orders_promo_code ON orders (promo_code);
`)}
<p>You check two numbers. The <code>orders</code> table holds 9 million rows. And Friday between 5 and 8 PM is the peak of the week: one order every four seconds.</p>
<p>CI is green.</p>
<p>Your train to Rennes leaves at 6:12 PM. Someone is expecting you at a birthday party you already missed last year.</p>`,
      choix: choixDepart,
    },

    lire: {
      heure: '4:52 PM',
      entree: () => ({ f: { LU: true } }),
      texte: () => `
<p>You scroll down through the code. The quota check is there:</p>
${code(`
def promo_available(code):
    if not settings.PROMO_QUOTA_ENABLED:
        return True
    uses = db.scalar(
        "SELECT count(*) FROM orders WHERE promo_code = :code",
        {"code": code},
    )
    return uses < 5000
`)}
<p>It runs on every checkout. Without an index on <code>promo_code</code>, that query will scan all 9 million rows on every payment.</p>
<p>You also note the feature flag Inès added, <code>PROMO_QUOTA_ENABLED</code>. Turned off, the promo code still works, but nobody counts anymore.</p>
<p>Malik drums his fingers on the desk. “So?”</p>`,
      choix: choixDepart,
    },

    refus: {
      heure: (s) => ven(s, 16, 44),
      entree: () => ({ confiance: -2 }),
      texte: () => `
<p>Malik doesn't raise his voice. That's worse.</p>
<p>“The ad is paid for. €40,000. It airs tomorrow, whether you agree or not.”</p>
${capot('“No deploys on Fridays” is not a safety rule. It\'s a confession: you don\'t trust your deploys enough to run them when it matters.')}`,
      choix: [
        { t: 'Hold your ground and go catch your train', vers: 'loin' },
        { t: 'Suggest a third way: ship tonight, but differently', vers: 'reecrire' },
      ],
    },

    loin: {
      heure: '7:08 PM',
      entree: () => ({ confiance: -1, f: { LOIN: true } }),
      texte: () => `
<p>You stand firm. At 6:12 PM, you're on the train.</p>
<p>At 7:08 PM, somewhere past Redon, your phone buzzes. Then buzzes again.</p>
<p>Malik has admin rights on the pipeline. He deployed it himself, at 7:06 PM.</p>
${capot('Saying no didn\'t remove the risk. You just left the room where the decision was being made.')}`,
      choix: [{ t: 'Open the messages', vers: 'deploy' }],
    },

    reecrire: {
      heure: (s) => ven(s, 16, 48),
      texte: (s) => `
<p>“What's wrong?” Inès asks. “CI is green.”</p>
<p>“CI runs against a 200-row table.”</p>
${s.f.LU ? '<p>You think back to the quota query. It will need that index from the very first order on Saturday night.</p>' : ''}
<p>You see three ways to rewrite the migration.</p>
<h3>Option A: two separate migrations</h3>
${code(`
-- migration 1
SET lock_timeout = '3s';
ALTER TABLE orders ADD COLUMN promo_code text;

-- migration 2
CREATE INDEX CONCURRENTLY idx_orders_promo_code ON orders (promo_code);
`)}
<h3>Option B: a DEFAULT, so it's instant</h3>
${code(`
ALTER TABLE orders ADD COLUMN promo_code text NOT NULL DEFAULT '';
CREATE INDEX idx_orders_promo_code ON orders (promo_code);
`)}
<h3>Option C: the column tonight, the index later, when things are quiet</h3>
${code(`
ALTER TABLE orders ADD COLUMN promo_code text;
`)}`,
      choix: [
        { t: 'Pick option A', vers: 'optA' },
        { t: 'Pick option B', vers: 'deploy', fx: { f: { B: true } } },
        { t: 'Pick option C', vers: 'optC' },
      ],
    },

    optA: {
      heure: (s) => ven(s, 16, 55),
      texte: (s) => `
<p>Option A has a price. Two migrations instead of one, a new review, a pass through staging. Inès estimates it hits prod around ${ven(s, 18, 5)}.</p>
<p>Your train leaves at 6:12 PM, and the station is twenty minutes away.</p>
<p>Malik checks the time. “Can't we go faster?”</p>`,
      choix: [
        { t: 'Stay until the end and let your train go', vers: 'A_rester' },
        { t: 'Validate staging, write the runbook for Inès and leave at 5:40 PM', vers: 'A_passer' },
        { t: 'Skip staging to ship before 5:30 PM', vers: 'A_sauter' },
      ],
    },

    A_rester: {
      heure: (s) => ven(s, 18, 5),
      entree: () => ({ energie: -1, confiance: 1 }),
      texte: (s) => `
<p>In staging, migration 2 fails:</p>
${code(ERREUR_TRANSACTION)}
<p>Inès's migration tool wraps every file in a transaction. Ten minutes to find the option that turns it off. That is exactly what staging is for.</p>
<p>At ${ven(s, 18, 5)}, everything is in prod. The index builds in fourteen minutes while orders keep getting written. You check with <code>\\d orders</code> that it isn't marked <code>INVALID</code>. It isn't.</p>
<p>Nobody notices a thing. That was the point.</p>
<p>Your train, on the other hand, is gone. The next one is at 8:12 PM.</p>
${capot('A plain <code>CREATE INDEX</code> blocks every write on the table while it builds. <code>CONCURRENTLY</code> is slower and can fail, leaving behind an invalid index you have to drop, but it blocks no one. The <code>lock_timeout</code> does something else: if the <code>ALTER TABLE</code> has to wait behind a long transaction, it gives up after 3 seconds instead of making the whole table queue up behind it.')}`,
      choix: [{ t: 'Close the ticket', vers: 'soir' }],
    },

    A_passer: {
      heure: '6:20 PM',
      entree: () => ({ codes: ['RUNBOOK'] }),
      texte: () => `
<p>You run the migrations through staging together. The second one fails:</p>
${code(ERREUR_TRANSACTION)}
<p>Inès's migration tool wraps every file in a transaction. Ten minutes to find the option that turns it off.</p>
<p>At 5:30 PM, staging is green. You write the rest in the ticket:</p>
${code(`
1. Run migration 2 in prod (outside a transaction).
2. During the build: do nothing. Orders keep flowing, that's normal.
3. When it's done: \\d orders
4. If the index is marked INVALID:
   DROP INDEX CONCURRENTLY idx_orders_promo_code;
   then rerun migration 2.
5. Do not deploy the app until the index is valid.
6. If in doubt: call me. I'm on a train, not on the Moon.
`)}
<p>Malik raises an eyebrow. “You're leaving in the middle of a deploy?”</p>
<p>“I'm leaving after writing down how to finish it.”</p>
<p>At 6:20 PM, on the train, your phone buzzes. Inès: “Index valid. App deployed. Have a good weekend.”</p>
${capot('A procedure someone else ran without you is worth more than a deploy you watched from start to finish. The first one survives your vacation.')}`,
      choix: [{ t: 'Put your phone away', vers: 'soir' }],
    },

    A_sauter: {
      heure: (s) => ven(s, 18, 10),
      entree: () => ({ energie: -1, dette: 1 }),
      texte: (s) => `
<p>“That saves us forty minutes,” you say. Inès hesitates, then pushes.</p>
<p>In prod, migration 1 goes through: the column exists. Migration 2 fails:</p>
${code(ERREUR_TRANSACTION)}
<p>Inès's migration tool wraps every file in a transaction. The pipeline stops dead, before deploying the app. No customer saw anything: this particular error has the decency to fail cleanly.</p>
<p>But prod is in a halfway state, and you have to understand it, fix it, push again. At ${ven(s, 18, 10)}, everything is live, index valid. You shipped later than if you had gone through staging, and your train is gone.</p>
${capot('Skipping staging didn\'t save you forty minutes. It moved the discovery of the problem into prod. This time, the error was harmless. You had no way of knowing that beforehand.')}`,
      choix: [{ t: 'Close the ticket', vers: 'soir' }],
    },

    optC: {
      heure: (s) => ven(s, 17, 10),
      entree: () => ({ confiance: 1, dette: 2, codes: ['NO_INDEX'] }),
      texte: (s) => `
<p>The column alone goes through in a few milliseconds. At ${ven(s, 17, 10)}, everything is in prod. Malik buys a round. You'll make your train.</p>
<p>That leaves the index.</p>`,
      choix: [
        { t: 'Open a ticket “Add the index on promo_code” and head for the station', vers: 'soir' },
        {
          t: 'Set a reminder: create the index tomorrow at 8 AM, when traffic is at its lowest',
          vers: 'C_samedi',
          verrou: (s) => (s.f.LU ? null : 'You don\'t know what this index is for: you didn\'t read the rest of the PR.'),
        },
      ],
    },

    C_samedi: {
      heure: (s) => ven(s, 17, 15),
      entree: () => ({ retire: ['NO_INDEX'], dette: -2, energie: -1 }),
      texte: () => `
<p>You set the reminder before you even leave the office.</p>
<p>Tomorrow at 8 AM, from a kitchen in Rennes, you'll run <code>CREATE INDEX CONCURRENTLY</code>. Fourteen minutes, index valid, cold coffee.</p>
<p>It won't be glorious. It will be done.</p>
${capot('Shipping without the index was defensible: the column cost nothing and the pressure dropped. What makes this choice safe is giving the leftover work a date, and that date landing before the ad.')}`,
      choix: [{ t: 'Head for the station', vers: 'soir' }],
    },

    deploy: {
      heure: heureIncident,
      entree: (s) => ({ prod: -3, horlogeFixe: s.f.LOIN ? 5 : 2, energie: s.f.LOIN ? -1 : 0 }),
      texte: (s) => `
${s.f.LOIN
    ? '<p>Getting your laptop out, balancing it on your knees and tethering it to your phone: three minutes. You scroll back through the thread.</p><p>The column was added in an instant.</p>'
    : '<p>The migration starts. The column is added in an instant.</p>'}
<p>Then <code>CREATE INDEX</code> takes its lock on <code>orders</code> and starts reading 9 million rows. Reads go through. Writes wait.</p>
<p>Checkout spins. A minute later, the entire site is returning 503.</p>
<p>No alert fired. Support raises the alarm: “payment stuck,” “blank page,” “is this normal?”</p>
${s.f.B ? capot('The <code>DEFAULT</code> wasn\'t the problem. Since PostgreSQL 11, adding a column with a constant default is instant. You fixed the line that was fine and kept the one that wasn\'t.') : ''}
<p>Malik opens a crisis call. Nine people join within a minute: support, the head of sales, the founder. A notification pops up: “Join, we need to understand.”</p>`,
      choix: [
        { t: 'Join the call and explain the situation', vers: 'action', fx: { horloge: 10, f: { VISIO: 'rejoint' } } },
        { t: 'Don\'t answer and get to work', vers: 'action', fx: { confiance: -1, f: { VISIO: 'ignore' } } },
        { t: 'Write three lines in #incident, then mute notifications', vers: 'action', fx: { horloge: 1, confiance: 1, f: { VISIO: 'etat' } } },
      ],
    },

    action: {
      heure: heureIncident,
      texte: (s) => {
        const d = debut(s);
        let t = '';
        if (s.f.VISIO === 'rejoint') {
          t += '<p>You join. “Is this because of the ad?” “Did we lose orders?” “When is it coming back?” You have no answers: you haven\'t looked yet. Everyone rephrases the previous person\'s question.</p>';
          t += '<p>Ten minutes later, you mute your mic. The lock hasn\'t moved.</p>';
        } else if (s.f.VISIO === 'ignore') {
          t += '<p>You don\'t answer. ' + (s.f.LOIN ? 'Your phone rings three times in a row. Malik.' : 'Malik comes and stands right behind your chair.') + ' “And what am I supposed to tell the founder?”</p>';
        } else {
          t += '<p>You write:</p>';
          t += msg('Checkout and site down since ' + hm(d[0], d[1]) + '. Likely cause: the running migration. Looking at the database. Next update in 10 minutes.');
          t += '<p>On the call, Malik reads your message out loud. The questions stop.</p>';
        }
        t += capot('A crisis call answers a real need: knowing what\'s going on. Three written lines answer it in one minute, without pulling the only person who can fix the problem away from it.');
        t += '<p>Now, the migration.</p>';
        return t;
      },
      choix: [
        { t: 'Cancel the deploy job in the pipeline', vers: 'jobtue' },
        { t: 'Open psql and find out who is blocking', vers: 'diagnostic' },
        { t: 'Let it finish: the index must be almost built', vers: 'attendre' },
      ],
    },

    jobtue: {
      heure: heureIncident,
      entree: () => ({ horloge: 4, f: { JOB: true } }),
      texte: () => `
<p>You click the red button. The job switches to “canceled.” You reload the checkout page.</p>
<p>Still 503.</p>
<p>You reload again. Four minutes go by before you admit it: nothing has changed.</p>
${capot('Canceling the job killed the client, not the query. PostgreSQL only notices a client is gone when it tries to talk to it, and a <code>CREATE INDEX</code> says nothing until it\'s done. The lock is still held. Worse: at the end, with no client left to send the <code>COMMIT</code>, everything will be rolled back.')}`,
      choix: [{ t: 'Open psql and find out who is blocking', vers: 'diagnostic' }],
    },

    diagnostic: {
      heure: heureIncident,
      entree: () => ({ horloge: 3 }),
      texte: () => `
<p>You connect to the database and ask who is doing what:</p>
${code(`
SELECT pid, wait_event_type, left(query, 46) AS query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start;

  pid  | wait_event_type |                     query
-------+-----------------+------------------------------------------------
 48213 | IO              | CREATE INDEX idx_orders_promo_code ON orders (
 48377 | Lock            | INSERT INTO orders (customer_id, slot_id, tota
 48379 | Lock            | UPDATE orders SET status = 'paid' WHERE id = 7
 48380 | Lock            | INSERT INTO orders (customer_id, slot_id, tota
 ...
(61 rows)
`)}
<p>One query is working. Sixty others are waiting behind it, and with them every connection the app has.</p>
${capot('All 60 connections in the pool are taken by blocked writes. None are left for the rest of the site, not even for <code>/health</code>, which the load balancer checks before sending traffic to a server. A lock on a single table took down the whole site.')}`,
      choix: [
        { t: 'Cancel query 48213 with pg_cancel_backend', vers: 'annuler' },
        { t: 'Let it finish: canceling now means losing everything', vers: 'attendre', si: (s) => !s.f.JOB },
      ],
    },

    annuler: {
      heure: heureIncident,
      entree: (s) => {
        const duree = s.horloge + 1;
        const fx = { horloge: 1, codes: ['POSTMORTEM'], f: { DUREE: duree } };
        if (duree >= 10) { fx.prod = -2; fx.codes.push('LOST_ORDERS'); }
        return fx;
      },
      texte: (s) => `
${code('SELECT pg_cancel_backend(48213);')}
<p>The transaction is canceled. ${s.f.JOB ? 'The' : 'The column and the index vanish together, the'} lock drops, and the sixty queued writes go through at once. The site comes back.</p>
<p>${s.f.DUREE} minutes of incident.</p>
${s.codes.includes('LOST_ORDERS')
    ? '<p>That\'s too long. During checkout, Panier Vif holds the customer\'s delivery slot for ten minutes. After that, the slot is released. The people who waited get their cart back, but not their Saturday morning delivery. Support counts 41 lost orders.</p>'
    : '<p>That\'s short enough. During checkout, Panier Vif holds the customer\'s delivery slot for ten minutes, and none of them had time to expire. The people who waited finish their orders.</p>'}
<p>Still, the promo code isn't in prod yet, and the ad airs tomorrow.</p>`,
      choix: [
        { t: 'Ship it again tonight, properly this time', vers: 'relivrer_soir' },
        { t: 'Stop here: ship it again tomorrow at 8 AM, with a clear head', vers: 'relivrer_samedi' },
      ],
    },

    attendre: {
      heure: heureIncident,
      entree: (s) => {
        const duree = Math.max(s.horloge, 11) + 3;
        return { horlogeFixe: duree, prod: -2, confiance: -1, energie: s.f.LOIN ? 0 : -1, codes: ['POSTMORTEM', 'LOST_ORDERS'], f: { DUREE: duree } };
      },
      texte: (s) => `
<p>You wait. Two minutes. Five. Eight.</p>
<p>At the tenth minute, the delivery slots Panier Vif holds during checkout expire. The customers still waiting will keep their cart, but not their Saturday morning delivery.</p>
<p>The index finishes at the eleventh minute. The lock drops, sixty writes go through at once, followed by everyone who kept reloading the page. It takes three more minutes for the site to breathe again.</p>
<p>The promo code is in prod, with its index. Support counts 41 lost orders. ${s.f.LOIN ? 'Through the window, the countryside rolls by without you seeing it.' : 'You catch your train just in time, without saying goodbye to anyone.'}</p>
${capot('“It\'s almost done” is the most expensive sentence in an incident. You didn\'t know how much time was left. When you don\'t know, you stop the bleeding first and fix things after.')}`,
      choix: [{ t: 'Breathe', vers: 'soir', fx: { horlogeFin: true } }],
    },

    relivrer_soir: {
      heure: (s) => (s.f.LOIN ? '9:15 PM' : ven(s, 18, 40)),
      entree: () => ({ energie: -2, horlogeFin: true }),
      texte: (s) => `
${s.f.LOIN
    ? '<p>You get to Rennes at 7:30 PM and set up in the station hall, laptop on your knees. Over the phone, you walk Inès through it: the column on one side, the index on the other, built with <code>CONCURRENTLY</code>. Staging, review, prod. At 9:15 PM, the promo code is live and nobody felt a thing.</p><p>By the time you reach the party, they\'re on coffee.</p>'
    : '<p>You and Inès rewrite the migration: the column on one side, the index on the other, built with <code>CONCURRENTLY</code>. Staging, review, prod. At ' + ven(s, 18, 40) + ', the promo code is live and nobody felt a thing.</p><p>Your train left half an hour ago. You send a message: “Start without me.”</p>'}
${capot('Shipping again right after an incident, hands still shaking, is a gamble. It held because there were two of you and staging did its job. Alone and without staging, that\'s how the second incident of the night is born.')}`,
      choix: [{ t: 'Breathe', vers: 'soir' }],
    },

    relivrer_samedi: {
      heure: (s) => apresIncident(s, 4),
      entree: () => ({ energie: -1, confiance: -1, horlogeFin: true }),
      texte: () => `
<p>“We stop here for tonight. Tomorrow at 8 AM, lowest traffic, we ship it again properly.”</p>
<p>Malik looks at you for a long time. “And if it breaks again tomorrow morning, twelve hours before the ad?”</p>
<p>You don't have a good answer. You only have one certainty: tonight, you would review a migration badly.</p>
<p>Tomorrow at 8 AM, with Inès on a video call, it will take twenty-five minutes: two migrations, an index built with <code>CONCURRENTLY</code>, and nobody will feel a thing. But your Saturday will start with an alarm clock.</p>`,
      choix: [{ t: 'Breathe', vers: 'soir' }],
    },

    soir: {
      heure: 'Later',
      texte: (s) => `
${s.codes.includes('POSTMORTEM')
    ? '<p>One thing sticks with you. It wasn\'t an alert that raised the alarm. It was an unhappy customer, then another, then support.</p>'
    : '<p>Everything went fine. One question stays with you anyway: if it had broken, who would have known first?</p><p>You know the answer. A customer.</p>'}
<p>Bastien, the company veteran, set up a Prometheus two years ago. It collects everything. Nobody looks at it, and it has never sent a single alert to anyone.</p>`,
      choix: [
        {
          t: 'Set up an alert on the checkout error rate tonight (20 minutes)',
          vers: 'alerte',
          verrou: (s) => (s.energie >= 4 ? null : 'You need at least 4 ENERGY. Tonight, you would write that rule wrong.'),
        },
        { t: 'Put it on the list for Monday morning', vers: apresVendredi, fx: { dette: 1 } },
        { t: 'Drop it: this won\'t happen again', vers: apresVendredi },
      ],
    },

    alerte: {
      heure: 'Twenty minutes',
      entree: () => ({ instruments: ['METRICS'], energie: -1 }),
      texte: () => `
<p>You write the simplest rule possible:</p>
${code(`
- alert: CheckoutErrors
  expr: |
    sum(rate(http_requests_total{route="/checkout", status=~"5.."}[5m]))
      / sum(rate(http_requests_total{route="/checkout"}[5m])) > 0.05
  for: 2m
  labels:
    severity: page
  annotations:
    summary: "More than 5% of payments are failing"
`)}
<p>You wire it to your phone and to the #incident channel. You trigger a fake error in staging to check that it rings. It rings.</p>
${capot('This alert doesn\'t look at CPU or memory. It looks at what the customer experiences: can they pay? You alert on symptoms, you investigate causes.')}`,
      choix: [{ t: 'Close the laptop', vers: apresVendredi }],
    },

    sam_calme: {
      jour: 'Saturday, week 3',
      heure: '8:51 PM',
      fin: (s) => (s.codes.includes('POSTMORTEM') ? 'rattrapage' : 'rien'),
      texte: (s) => `
<p>The ad just aired. 4,000 visitors in 90 seconds.</p>
<p>You watch the dashboard from a couch. Traffic is up sixfold. Checkout response time holds at 180 ms.</p>
${s.instruments.includes('METRICS')
    ? '<p>Your alert doesn\'t ring. You know that\'s good news, because it exists.</p>'
    : '<p>Nobody messages you. You assume everything is fine. You still reload the checkout page three times, just to check.</p>'}
<p>That's the job: when you do it right, nothing happens.</p>`,
    },

    sam_incident: {
      jour: 'Saturday, week 3',
      heure: heureIncident,
      entree: (s) => (s.instruments.includes('METRICS')
        ? { prod: -3, horlogeFixe: 2, f: { SAMEDI: true } }
        : { prod: -4, horlogeFixe: 12, f: { SAMEDI: true } }),
      texte: (s) => `
<p>The ad just aired. 4,000 visitors in 90 seconds.</p>
<p>On every checkout, the app checks the quota:</p>
${code('SELECT count(*) FROM orders WHERE promo_code = \'RENTREE\';')}
<p>Without an index, PostgreSQL scans all 9 million rows. On every order. Database CPU climbs to 100%, checkout takes 14 seconds to respond, then stops responding at all.</p>
${s.instruments.includes('METRICS')
    ? '<p>At 8:53 PM, your phone rings: “More than 5% of payments are failing.” You\'re at your screen two minutes after it started.</p>'
    : '<p>You have no idea. You find out at 9:03 PM, from a screenshot a customer posted that Malik forwards to you with three question marks. Twelve minutes of ad time are already gone.</p>'}
<p>${s.f.LU ? 'You remember Inès\'s feature flag,' : 'You finally open Inès\'s code and find a feature flag,'} <code>PROMO_QUOTA_ENABLED</code>. Turned off, the promo code still works, but nobody counts to 5,000 anymore.</p>`,
      choix: [
        { t: 'Create the index now, with CONCURRENTLY', vers: 'sam_index' },
        { t: 'Call Malik to turn off the quota, then create the index', vers: 'sam_coupe' },
        { t: 'Restart the database: it always comes back after a restart', vers: 'sam_redemarre' },
      ],
    },

    sam_redemarre: {
      jour: 'Saturday, week 3',
      heure: heureIncident,
      entree: () => ({ prod: -2, horloge: 5 }),
      texte: () => `
<p>You restart PostgreSQL. Every connection drops: for two minutes, the entire site is down.</p>
<p>Then the database comes back, its cache empty, and the same queries come back with it. Within thirty seconds, CPU is at 100% again.</p>
<p>You just added a full outage on top of a partial one.</p>
${capot('A restart only cures state problems: a memory leak, a stuck process. Here the problem is load, and the load was waiting for you at the door.')}`,
      choix: [
        { t: 'Create the index now, with CONCURRENTLY', vers: 'sam_index' },
        { t: 'Call Malik to turn off the quota, then create the index', vers: 'sam_coupe' },
      ],
    },

    sam_index: {
      jour: 'Saturday, week 3',
      heure: heureIncident,
      fin: 'interets',
      entree: () => ({ prod: -2, horloge: 25, retire: ['NO_INDEX'], dette: -2, energie: -1 }),
      texte: () => `
<p>You run the command on a database that's on its knees. <code>CONCURRENTLY</code> blocks no one, but it has to read the whole table while sharing the disk with hundreds of queries doing the same thing.</p>
<p>Twenty-five minutes. For twenty-five minutes, the ad Panier Vif paid €40,000 for sends customers to a checkout that doesn't respond.</p>
<p>Then the index becomes valid, and everything calms down in ten seconds.</p>
${capot('You fixed it before stopping the bleeding. The fix was the right one, but it took twenty-five minutes, when a feature flag would have restored service in four.')}`,
    },

    sam_coupe: {
      jour: 'Saturday, week 3',
      heure: heureIncident,
      fin: 'interets',
      entree: () => ({ horloge: 4, confiance: 1, retire: ['NO_INDEX'], dette: -2, energie: -1 }),
      texte: () => `
<p>Malik picks up on the first ring. You give him the choice in one sentence: “Either checkout stays down for half an hour, or we stop counting and hand out more than 5,000 discounts.”</p>
<p>Two seconds of silence. “Turn it off.”</p>
<p>Four minutes later, all three servers have restarted with the quota disabled. Checkout responds in 200 ms. You build the index calmly. It's valid at 9:40 PM, and you turn the quota back on.</p>
<p>On Monday, accounting will count 6,200 discounts instead of 5,000. At €5 per discount, that's €6,000 too much. Cheaper than half an hour of downtime during the ad.</p>
${capot('Stop the bleeding first, fix it after. And going over the quota wasn\'t your call: it\'s a money decision, and it belongs to someone who has the authority to make it. Your job was to make it possible in one sentence.')}`,
    },
  };

  racine.CHAPITRES.en.push({
    id: 'ch1',
    numero: 1,
    titre: 'The migration',
    techno: 'PostgreSQL',
    jour: 'Friday, week 3',
    debut: 'pr',
    noeuds: noeuds,
    fins: {
      rien: {
        titre: 'Nothing happens',
        texte: 'Neither on Friday nor on Saturday did a single customer see an outage. Nobody will ever know what you prevented, and that is how you recognize good work.',
      },
      rattrapage: {
        titre: 'Recovery',
        texte: 'Friday broke, Saturday held. On Monday at 10 AM, you run your first postmortem.',
      },
      interets: {
        titre: 'With interest',
        texte: 'The index you put off on Friday got paid for on Saturday, in the middle of the ad. Shipping without it was defensible. Leaving it without a date was not.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
