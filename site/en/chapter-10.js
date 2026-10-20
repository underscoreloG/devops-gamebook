/* Chapter 10: 3:12 AM. On-call, alert noise, handover, night-time decisions. */
(function (racine) {
  'use strict';

  const { code, capot, a, outil } = racine.RECIT_EN;

  const apresAlertes = (s) => (outil(s, 'LOGS') ? 'facture' : 'astreinte');
  const nuit = (s) => {
    if (a(s, 'MUTED_ALERTS')) return 'matin_noir';
    if (s.f.ROTATION) return s.f.PASSATION ? 'theo_ok' : 'theo_appelle';
    return 'reveil';
  };

  const DIAG = `
$ df -h /var/lib/postgresql
Filesystem      Size  Used Avail Use% Mounted on
/dev/sdb1       200G  188G   12G  94% /var/lib/postgresql

$ sudo du -sh /var/lib/postgresql/16/main/pg_wal
131G    /var/lib/postgresql/16/main/pg_wal
`;

  const SLOTS = `
SELECT slot_name, active,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots;

   slot_name    | active | retained
----------------+--------+----------
 debezium_trial | f      | 129 GB
`;

  const noeuds = {

    debut: {
      heure: '2:00 PM',
      texte: () => `
<p>You tally up last week. 140 alerts in the #alerts channel. Your phone buzzed 31 times between midnight and 6 AM. Exactly once, it was real.</p>
${code(`
[FIRING]   HighCPU         vif-db-01   82 %
[RESOLVED] HighCPU         vif-db-01
[FIRING]   HighMemory      api-7d9f    71 %
[FIRING]   HighCPU         vif-db-01   81 %
[RESOLVED] HighMemory      api-7d9f
[FIRING]   HighCPU         vif-db-01   83 %
`)}
<p>These are the default rules, installed with the cluster. Nobody chose them. You have been on call for four months straight, and you no longer read this channel: you scroll it.</p>`,
      choix: [
        { t: 'Mute notifications at night: you\'ll finally get some sleep', vers: apresAlertes, fx: { codes: ['MUTED_ALERTS'], energie: 1, f: { BRUIT: 'coupe' } } },
        { t: 'Spend a day triaging: delete what nobody acts on, keep what the customer feels', vers: apresAlertes, fx: { confiance: -1, f: { BRUIT: 'tri' } } },
        { t: 'Raise every threshold to 95 %: less noise, nothing deleted', vers: apresAlertes, fx: { dette: 1, f: { BRUIT: 'seuils' } } },
      ],
    },

    facture: {
      heure: '4:30 PM',
      texte: () => `
<p>Karim drops by with an invoice. “Log storage. €300 a month in November, €1,200 this month. Is that normal?”</p>
<p>You take a look. Since logs were centralized, everything goes there: the access log for every request, and the <code>DEBUG</code> output of the invoicing worker, which someone forgot to turn off again.</p>`,
      choix: [
        { t: 'Stop shipping DEBUG, sample the access logs, keep 14 days', vers: 'astreinte', fx: { confiance: 1 } },
        { t: 'Cut retention to 2 days: it\'s the simplest', vers: 'astreinte', fx: { dette: 1 } },
        { t: 'Change nothing: you can\'t put a price on observability', vers: 'astreinte', fx: { confiance: -1 } },
      ],
    },

    astreinte: {
      jour: 'Friday, week 22',
      heure: '10:00 AM',
      texte: (s) => `
<p>${s.f.BRUIT === 'coupe'
    ? 'You muted notifications between 10 PM and 7 AM. Last night you slept straight through, for the first time since October.'
    : s.f.BRUIT === 'tri'
      ? 'You spent all of yesterday in the alert rules. “You\'re deleting some?” Malik worried. “What if we miss something?” You deleted 34. Six are left: payment is failing, the site is slow, the external probe stopped answering, a disk will be full in two hours, a certificate is expiring, the database stopped answering. Each one has a line that says what to do.'
      : 'You raised every threshold to 95 %. The channel is quieter. The same rules still watch CPU and memory, just a little later than before.'}</p>
<p>Weekly sync with Malik. He thinks you look tired.</p>
<p>“How long have you been on call now?”</p>
<p>“Since I got here.”</p>`,
      choix: [
        {
          t: 'Ask for a real rotation: Inès and Théo each take one week in three, with compensation',
          vers: 'passation',
          verrou: (s) => (s.confiance >= 3 ? null : 'You need at least 3 TRUST. Malik doesn\'t listen to you enough anymore to agree to that.'),
          fx: { f: { ROTATION: true } },
        },
        { t: 'Hand on-call to Théo starting tonight: he\'ll learn on the job', vers: nuit, fx: { f: { ROTATION: true, SANSPREP: true } } },
        { t: 'Say you\'re fine, you can hold out another month', vers: nuit, fx: { energie: -1, f: { SEUL: true } } },
      ],
    },

    passation: {
      jour: 'Friday, week 22',
      heure: '5:45 PM',
      texte: () => `
<p>Malik said yes faster than you expected. “I should have offered it myself.” Théo takes the first week. He volunteered, and he looks a little pale.</p>
<p>It is 5:45 PM. You have fifteen minutes before you leave, and three things on your mind: Inès deployed at 5 PM, the database disk is at 78 % and has been creeping up for ten days without you knowing why, and an alert on the cache fires for nothing one night in three.</p>`,
      choix: [
        { t: 'Take the fifteen minutes: tell him those three things, and what to do about each one', vers: nuit, fx: { confiance: 1, f: { PASSATION: true } } },
        { t: 'Tell him it\'s all in the wiki and head out', vers: nuit },
      ],
    },

    theo_ok: {
      jour: 'Saturday, week 22',
      heure: '3:12 AM',
      entree: () => ({ f: { THEO_OK: true } }),
      texte: (s) => `
<p>Théo's phone rings. Not yours.</p>
<p>${s.f.BRUIT === 'tri' ? 'A single, readable alert: “vif-db-01 disk will be full in two hours.”' : 'It\'s the sixth notification of the night, but this one is about the database disk, and he remembers what you told him.'} Yesterday at 5:45 PM, you gave him an instruction for this exact case: “if that disk goes past 90 %, grow it first, we'll figure out why in the morning.”</p>
<p>He adds 50 GB to the volume, checks that the percentage goes down, writes three lines in #incident and goes back to bed. Twenty minutes in total.</p>
<p>You find his message at 8 AM, over coffee. You slept nine hours.</p>
${capot('Fifteen minutes of handover replaced a 3 AM wake-up. You don\'t hand over on-call with a phone. You hand it over with what changed this week, what is likely to fire, and what to do when it does.')}`,
      choix: [{ t: 'Look for the cause, with a rested head', vers: 'neuf_heures' }],
    },

    theo_appelle: {
      jour: 'Saturday, week 22',
      heure: (s) => (s.f.SANSPREP ? '3:55 AM' : '3:25 AM'),
      entree: (s) => ({ energie: -1, horlogeFixe: s.f.SANSPREP ? 43 : 13 }),
      texte: (s) => `
<p>${s.f.SANSPREP
    ? 'Théo\'s phone rang at 3:12 AM. He looked at the alert, opened the wiki, found nothing, hesitated. It took him forty minutes to work up the nerve to call you. It\'s his first night, and nobody told him when he was allowed to wake someone up.'
    : 'Théo\'s phone rang at 3:12 AM. He opened the wiki. The “database” page dates back to Bastien and describes a server that no longer exists. He calls you.'}</p>
<p>“Sorry. There's an alert on the database disk, and I don't know what to do.”</p>
<p>So you are on call after all. You open your laptop in the dark.</p>`,
      choix: [{ t: 'Look at that disk', vers: 'diag' }],
    },

    reveil: {
      jour: 'Saturday, week 22',
      heure: '3:12 AM',
      entree: () => ({ horlogeFixe: 0 }),
      texte: (s) => `
<p>Your phone buzzes on the nightstand.</p>
<p>${s.f.BRUIT === 'tri'
    ? 'It\'s the first time this week. A single line on the screen: “vif-db-01 disk will be full in two hours.”'
    : 'It\'s the sixth time tonight. The first five were database CPU at 96 %, back to normal before you could even unlock the screen. All you see is “[FIRING]” and the start of a server name.'}</p>`,
      choix: [
        {
          t: 'Open your eyes and read the whole alert',
          vers: 'diag',
          verrou: (s) => (s.energie >= 2 ? null : 'You need at least 2 ENERGY. Your eyes won\'t open.'),
        },
        { t: 'Ack it with your thumb and go back to sleep: it\'s the CPU again', vers: 'matin_noir', fx: { f: { RENDORMI: true } } },
      ],
    },

    diag: {
      jour: 'Saturday, week 22',
      heure: (s) => (s.f.SANSPREP ? '4:05 AM' : s.f.ROTATION ? '3:35 AM' : '3:20 AM'),
      entree: () => ({ horloge: 8 }),
      texte: (s) => `
${code(DIAG)}
<p>The database disk is at 94 %, and it isn't the data: 131 GB of transaction logs, the WAL, which PostgreSQL should be recycling as it goes. Something is stopping it.</p>
${code(SLOTS)}
<p>An inactive replication slot, <code>debezium_trial</code>. PostgreSQL has been holding every log for it for twelve days, in case it comes back to read them. You don't know who created it.</p>
<p>At this rate, the disk will be full around 5:20 AM, and the database will stop.${a(s, 'QUICK_FIX') ? ' You think of the disk you doubled four months ago, without looking for the cause.' : ''}</p>`,
      choix: [
        { t: 'Delete the oldest files in pg_wal by hand', vers: 'wal_rm' },
        { t: 'Grow the disk by 50 GB and go back to sleep: the cause can wait until 9 AM', vers: 'agrandir' },
        { t: 'Drop the inactive slot right now', vers: 'drop_seul' },
        { t: 'Wake Malik up so he can decide', vers: 'malik' },
      ],
    },

    wal_rm: {
      jour: 'Saturday, week 22',
      heure: '4:10 AM',
      fin: 'wal',
      entree: (s) => (a(s, 'RESTORE_TEST')
        ? { prod: -3, energie: -2, confiance: -1, horlogeFin: true }
        : { prod: -5, energie: -2, confiance: -2, horlogeFin: true }),
      texte: (s) => `
${code(`
$ cd /var/lib/postgresql/16/main/pg_wal
$ sudo rm 0000000100000A1*
`)}
<p>100 GB freed in one go. The disk drops to 44 %. You close your laptop.</p>
<p>At 4:02 AM, PostgreSQL looks for one of those files for its next checkpoint. It can't find it.</p>
${code(`
PANIC:  could not locate a valid checkpoint record
`)}
<p>The database won't restart. What you deleted wasn't history: it was the only copy of the latest transactions, not yet written to the data files.</p>
<p>${a(s, 'RESTORE_TEST')
    ? 'There is still the 2:30 AM backup. You have been restoring that one every Sunday for months, through a job that has never failed. Fifty minutes later, the database is back, minus the orders placed between 2:30 and 4 AM. On a weeknight, there were eleven.'
    : 'There is still the 2:30 AM backup. Nobody has restored it since the €0.99 pricing day. The procedure has changed, and so have the versions. It takes you four hours, two failed attempts, and Inès woken up at 5 AM. The database comes back at 8:15 AM, right as the Saturday orders start.'}</p>
${capot('You never delete a file from <code>pg_wal</code> by hand. Those files are the database, just as much as the tables are. When they pile up, something is holding them back, a slot or a broken archiver, and that cause is what you fix.')}`,
    },

    agrandir: {
      jour: 'Saturday, week 22',
      heure: (s) => (s.f.SANSPREP ? '4:25 AM' : s.f.ROTATION ? '3:55 AM' : '3:40 AM'),
      entree: () => ({ energie: -1, horloge: 12, horlogeFin: true, f: { ISSUE: 'agrandi' } }),
      texte: (s) => `
<p>You add 50 GB to the volume from the console, then run <code>growpart</code> and <code>resize2fs</code>. The disk drops back to 75 %. At this rate, you have bought four days.</p>
<p>You write three lines in #incident: what you saw, what you did, and “slot <code>debezium_trial</code> inactive for 12 days, whose is it? We look at 9 AM.”</p>
<p>Then you go back to bed.</p>
${capot((a(s, 'QUICK_FIX') ? 'Four months ago, growing a disk without looking for the cause was running away. ' : '') + 'At 3 AM, growing a disk is the right call: it\'s reversible, it deletes nothing, and it pushes the irreversible choices to an hour when you will be able to make them. The difference from a band-aid fits in one line: the 9 AM follow-up.')}`,
      choix: [{ t: 'Look for the cause at 9 AM', vers: 'neuf_heures' }],
    },

    drop_seul: {
      jour: 'Saturday, week 22',
      heure: (s) => (s.f.SANSPREP ? '4:20 AM' : s.f.ROTATION ? '3:50 AM' : '3:35 AM'),
      entree: () => ({ energie: -1, horloge: 8, horlogeFin: true, f: { ISSUE: 'drop' } }),
      texte: () => `
${code(`
SELECT pg_drop_replication_slot('debezium_trial');
CHECKPOINT;
`)}
<p>PostgreSQL recycles 129 GB of logs in a few seconds. The disk drops to 30 %.</p>
<p>You go back to bed, and you don't sleep. That slot belonged to someone. If it fed an export, an accounting spreadsheet, some replication you don't know exists, you just broke it, at 3:35 AM, without asking anyone.</p>`,
      choix: [{ t: 'Wait until 9 AM to find out', vers: 'neuf_heures' }],
    },

    malik: {
      jour: 'Saturday, week 22',
      heure: (s) => (s.f.SANSPREP ? '4:40 AM' : s.f.ROTATION ? '4:10 AM' : '3:55 AM'),
      entree: () => ({ energie: -1, horloge: 27, horlogeFin: true, f: { ISSUE: 'malik' } }),
      texte: () => `
<p>Malik picks up on the fourth ring, his voice thick with sleep. It takes him five minutes to understand what a replication slot is, five more to find his glasses.</p>
<p>“What do you suggest?”</p>
<p>“Grow the disk, and find out whose slot this is tomorrow morning.”</p>
<p>“Then do that.”</p>
<p>You grow the disk. Another twenty minutes have gone by, and two people are now awake for a decision you had already made.</p>
${capot('Waking someone up is the right call in two cases: you don\'t know what to do, or the decision isn\'t yours to make, because it commits money or data. Here, the fix was safe, reversible, and within your scope. Grinding away alone is a mistake. So is covering yourself.')}`,
      choix: [{ t: 'Look for the cause at 9 AM', vers: 'neuf_heures' }],
    },

    neuf_heures: {
      jour: 'Saturday, week 22',
      heure: '9:00 AM',
      fin: (s) => (s.f.THEO_OK ? 'dormi' : 'reveil'),
      entree: (s) => (s.f.ISSUE === 'drop' ? {} : { confiance: 1 }),
      texte: (s) => `
<p>Inès answers in the channel before you have even asked. “That's mine. A test export to the analytics tool, two weeks ago. I stopped the connector and forgot the slot. Sorry.”</p>
${s.f.ISSUE === 'drop'
    ? '<p>Your bet last night paid off: that slot was no longer used for anything. It could just as easily have been the monthly accounting export.</p>'
    : '<p>You drop the slot together, on a video call, in ten seconds. PostgreSQL recycles 129 GB of logs in one go.</p>'}
<p>Then you add one line to the database configuration:</p>
${code(`
max_slot_wal_keep_size = 20GB
`)}
<p>From now on, an abandoned slot will be invalidated after 20 GB instead of filling the disk. ${s.f.BRUIT === 'tri' ? 'And you add a seventh alert: a slot inactive for more than an hour.' : 'You promise yourself you\'ll add an alert on inactive slots, someday.'}</p>`,
    },

    matin_noir: {
      jour: 'Saturday, week 22',
      heure: (s) => (s.f.RENDORMI ? '5:25 AM' : '7:05 AM'),
      fin: 'muet',
      entree: (s) => (s.f.RENDORMI
        ? { prod: -3, energie: -2, confiance: -1, horlogeFin: true }
        : { prod: -4, confiance: -2, horlogeFin: true }),
      texte: (s) => `
${s.f.RENDORMI
    ? '<p>At 5:22 AM, the phone doesn\'t buzz anymore: it rings. “PostgreSQL is not responding.” This time, you read it.</p>'
    : '<p>At 3:12 AM, an alert went out to a channel whose notifications are muted until 7 AM. At 5:20 AM, a second one. Nobody saw them.</p><p>At 7:05 AM, a customer writes to support: “Is your site down?”</p>'}
${code(DIAG.replace('188G   12G  94%', '200G     0 100%').replace('131G', '143G'))}
<p>The database disk is full. PostgreSQL stopped dead. Since 5:20 AM, not a single Panier Vif page has loaded.</p>
<p>You find the cause in ten minutes: a replication slot abandoned after a test by Inès, holding twelve days of logs. You grow the disk, restart the database, drop the slot. ${s.f.RENDORMI ? 'By 6 AM, the site is back.' : 'By 7:45 AM, the site is back, after two and a half hours of downtime and the start of the Saturday orders.'}</p>
${capot(s.f.RENDORMI
    ? 'You didn\'t ignore an alert out of carelessness. You ignored one because the five before it were false. An alert that fires for nothing is not harmless: it teaches whoever receives it to stop reading.'
    : 'Muting the noise also muted the signal. The problem was not the number of alerts at night, but the fact that 139 out of 140 required no action. Those get deleted. The 140th has to be able to wake someone up.')}`,
    },
  };

  racine.CHAPITRES.en.push({
    id: 'ch10',
    numero: 10,
    titre: '3:12 AM',
    techno: 'On-call',
    jour: 'Thursday, week 22',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { instruments: ['LOGS', 'METRICS'], codes: ['RESTORE_TEST', 'QUICK_FIX'] },
      { energie: 1, confiance: 2 },
    ],
    fins: {
      dormi: {
        titre: 'Someone else\'s phone',
        texte: 'The alert fired, someone knew what to do, and it wasn\'t you. That is what working on-call looks like.',
      },
      reveil: {
        titre: 'A 3 AM decision',
        texte: 'The phone rang, you read it, and the database held. Now make sure that next time, it doesn\'t have to be you.',
      },
      muet: {
        titre: 'The hundred and fortieth',
        texte: 'The only real alert of the week arrived in the middle of the false ones, and nobody read it.',
      },
      wal: {
        titre: 'It wasn\'t history',
        texte: 'The disk had room. The database no longer had its latest transactions.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
