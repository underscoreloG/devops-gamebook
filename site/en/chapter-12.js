/* Chapter 12: Saturday, 8:50 PM. The national campaign: everything sown so far is reaped here. */
(function (racine) {
  'use strict';

  const { code, capot, a } = racine.RECIT_EN;

  const apresCharge = (s) => (s.f.CHARGE ? 'test' : 'vacances');
  const apresPub = (s) => (s.f.CHARGE ? 'final' : s.f.VAC === 'prepare' ? 'ines_gere' : 'sature');
  const MINUTES = [25, 12, 6, 3];

  const noeuds = {

    debut: {
      heure: '10:00 AM',
      texte: (s) => `
<p>Hugo has gathered the whole company. Behind him, a slide: “Saturday, 8:50 PM. A major TV channel. 4 million viewers.”</p>
<p>The first ad, six months ago, brought 4,000 visitors in 90 seconds. This one will bring forty times as many.</p>
<p>Malik speaks up. “To take zero risk: starting today, we freeze everything. No more production deploys until the day after the ad. Nine days, zero changes.”</p>
<p>Everyone turns to you.</p>`,
      choix: [
        { t: 'Accept the full freeze: nine days without shipping anything', vers: 'charge', fx: { confiance: 1, f: { GEL: 'total' } } },
        {
          t: 'Propose something better than a freeze: only small changes, each one revertible in two minutes',
          vers: 'charge',
          verrou: (s) => (a(s, 'NO_ROLLBACK') ? 'You have never tested a rollback. You can\'t promise one in front of the whole company.' : null),
          fx: { f: { GEL: 'petit' } },
        },
        { t: 'Refuse to change any habits: we ship like we always do', vers: 'charge', fx: { confiance: -1, f: { GEL: 'rien' } } },
      ],
    },

    charge: {
      heure: '11:30 AM',
      texte: (s) => `
<p>${s.f.GEL === 'total'
    ? 'The freeze passes unanimously. Inès shelves three fixes that were waiting to go out.'
    : s.f.GEL === 'petit'
      ? '“A nine-day freeze means sixty changes all shipping together the Monday after. I\'d rather have ten small ones I know how to revert.” Malik remembers the rollback button. He agrees.'
      : 'Malik doesn\'t push. He writes something down in his notebook.'}</p>
<p>That leaves the real question. Nobody has ever sent forty times the usual traffic at this cluster.</p>
<p>A load test takes a day to prepare: a copy of prod, a tool that simulates customers, an evening watching the graphs. Théo has another idea: “Forty times the traffic, forty times the pods. That's what autoscaling is for.”</p>`,
      choix: [
        { t: 'Set up a load test Tuesday night, on a copy of prod', vers: apresCharge, fx: { energie: -1, f: { CHARGE: true } } },
        { t: 'Do the math on paper: autoscaling will keep up', vers: apresCharge, fx: { f: { CHARGE: false } } },
        { t: 'Double the cluster\'s node count, to be safe', vers: apresCharge, fx: { f: { CHARGE: false, NOEUDS: true } } },
      ],
    },

    test: {
      jour: 'Tuesday, week 26',
      heure: '9:40 PM',
      texte: () => `
<p>At five times the usual traffic, everything is fine. At ten times, everything is fine. At twelve times, the error rate goes from 0 to 60 % in twenty seconds.</p>
${code(`
FATAL:  sorry, too many clients already
`)}
<p>It isn't the cluster giving way. Autoscaling did exactly its job: it went from 6 to 40 pods. Each pod holds up to 20 open connections to the database. 40 times 20: 800. PostgreSQL accepts 200.</p>
<p>The more pods you add, the more clients the database turns away. On Saturday, at forty times the traffic, this would have happened live, two minutes after the ad.</p>
${capot('Autoscaling fixes the link it watches, and shifts the load onto the next one. Here, the next link has a hard ceiling. You only find that kind of ceiling by pushing the system all the way to it, on an evening when nobody is watching.')}`,
      choix: [
        { t: 'Put PgBouncer in front of the database, in transaction mode', vers: 'vacances', fx: { confiance: 1, f: { POOL: 'bouncer' } } },
        { t: 'Raise max_connections to 1,000', vers: 'vacances', fx: { f: { POOL: 'max' } } },
        { t: 'Cap autoscaling at 8 pods', vers: 'vacances', fx: { f: { POOL: 'plafond' } } },
      ],
    },

    vacances: {
      jour: 'Wednesday, week 26',
      heure: '9:30 AM',
      texte: (s) => `
${s.f.POOL === 'bouncer'
    ? '<p>You set up PgBouncer:</p>' + code(`
[databases]
paniervif = host=vif-db-01 port=5432

[pgbouncer]
pool_mode = transaction
max_client_conn = 2000
default_pool_size = 80
`) + '<p>The pods connect to it, by the hundreds. It keeps only 80 connections to the database, and lends them out for the length of a transaction. You rerun the test: at forty times the traffic, the database never sees more than 80 clients.</p>'
    : s.f.POOL === 'max'
      ? '<p>You set <code>max_connections</code> to 1,000 and restart the database. The test no longer produces errors. It produces something else: with 800 open connections, each with its own memory, the database slows down the harder you push it. Responses arrive, later and later.</p>'
      : s.f.POOL === 'plafond'
        ? '<p>You cap autoscaling at 8 pods: 160 connections at most, under the limit. The test no longer produces errors. At forty times the traffic, 8 pods aren\'t enough: requests queue up. The site answers, slowly.</p>'
        : s.f.NOEUDS
          ? '<p>You double the nodes. €2,400 for the month. The cluster now has room for 80 pods. Nobody checked what those 80 pods would ask of whatever sits behind them.</p>'
          : '<p>The math is quick: the cluster can hold 40 pods, and autoscaling will create them. On paper, it holds up.</p>'}
<p>One thing is left that you have been putting off for a week. Your vacation was booked four months ago: ten days, leaving Friday morning. The day before the ad.</p>
<p>Nobody asked you to cancel it. Nobody told you to go, either.</p>`,
      choix: [
        { t: 'Cancel your vacation: you\'ll be there Saturday night', vers: 'samedi', fx: { energie: -2, f: { VAC: 'annule' } } },
        {
          t: 'Leave, after two days preparing Inès: runbooks, a dry run Thursday, she runs Saturday',
          vers: 'samedi',
          fx: { confiance: 1, f: { VAC: 'prepare' } },
        },
        { t: 'Leave as planned, and stay reachable', vers: 'samedi', fx: { f: { VAC: 'joignable' } } },
      ],
    },

    samedi: {
      jour: 'Saturday, week 26',
      heure: '8:50 PM',
      entree: (s) => {
        const fx = { prod: 0, dette: 0, energie: 0, f: {} };
        let n = 0;
        if (s.f.VAC === 'prepare' && !a(s, 'RUNBOOK')) fx.energie -= 1;
        if (a(s, 'MANUAL_CERT')) { fx.prod -= 1; n += 1; }
        if (a(s, 'SECRET_IN_IMAGE')) { fx.prod -= s.f.VAC === 'joignable' ? 3 : 2; n += 1; }
        if (s.f.GEL === 'total') { fx.prod -= 1; fx.dette += 2; n += 1; }
        if (s.f.GEL === 'rien') { fx.prod -= 1; n += 1; }
        if (s.dette >= 5) { fx.prod -= 1; n += 1; fx.f.DETTE_LOURDE = true; }
        if (s.f.POOL === 'max') { fx.prod -= 1; n += 1; }
        if (s.f.POOL === 'plafond') { fx.prod -= 2; n += 1; }
        if (!s.f.CHARGE) n += 1;
        fx.f.EVENEMENTS = n;
        return fx;
      },
      texte: (s) => `
<p>${s.f.VAC === 'annule'
    ? 'You have been at the office since noon. Your suitcase is still in your front hall at home, unpacked.'
    : s.f.VAC === 'prepare'
      ? 'You are 500 miles away, on a terrace. On Thursday, Inès dry-ran the whole evening, runbook in hand' + (a(s, 'RUNBOOK') ? ', the way you two have been doing it for six months' : ': half of it had to be written this week, and you caught your train running on fumes') + '. Tonight, she is in charge. Your phone lies face down on the table.'
      : 'You are 500 miles away, at a restaurant. Your phone sits next to your plate, screen up.'}</p>
${a(s, 'MANUAL_CERT')
    ? '<p>7:10 PM. Marketing had a QR code printed in the ad, pointing to <code>offre.paniervif.fr</code>. Nobody told the tech team. The subdomain has no certificate, and yours are made by hand. The first curious visitors hit a security warning for twenty-five minutes.</p>'
    : ''}
${a(s, 'SECRET_IN_IMAGE')
    ? '<p>8:31 PM. PayLoire automatically disables a key “detected in a public image.” It\'s the payment key baked into the image four months ago, never replaced. Not a single payment goes through' + (s.f.VAC === 'joignable' ? ', and the only person who knows how to rotate it is at a restaurant. You dictate it over the phone, between the main course and dessert, for thirty-five minutes.' : '. The rotation takes twelve minutes, nineteen minutes before the ad.') + '</p>'
    : ''}
${s.f.GEL === 'total'
    ? '<p>On Wednesday, Yasmine reported a display bug in the price per kilo. The fix is one line. It is frozen, along with sixty other changes that will all ship together on Monday. Tonight, 4 million people discover Panier Vif with wrong prices per kilo.</p>'
    : s.f.GEL === 'rien'
      ? '<p>Friday at 5 PM, Théo shipped a redesign of the cart, “so it\'s ready for the ad.” It has a mobile bug nobody had time to catch.</p>'
      : ''}
${s.f.DETTE_LOURDE
    ? '<p>And one of the undated tickets, out of all the ones you have pushed back for six months, picks tonight to remind you it exists: a log disk nobody rotates on the new worker.</p>'
    : ''}
<p>8:50 PM. The ad airs. Thirty seconds, a family, a grocery basket, a logo.</p>
<p>${s.f.CHARGE
    ? (s.f.POOL === 'bouncer'
      ? 'Visitors pour in by the tens of thousands. The API goes from 6 to 40 pods. PgBouncer absorbs 800 connections and shows only 80 to the database.'
      : s.f.POOL === 'max'
        ? 'Visitors pour in by the tens of thousands. The API goes from 6 to 40 pods, the database accepts their 800 connections, and slows down under their weight. Checkout takes six seconds.'
        : 'Visitors pour in by the tens of thousands. Autoscaling stops at 8 pods, as you told it to. Requests queue up. The site takes eight seconds to answer, but it answers.')
    : 'Visitors pour in by the tens of thousands. Autoscaling does its job: 10 pods, 20, 40' + (s.f.NOEUDS ? ', 60' : '') + '.'}</p>`,
      choix: [{ t: '8:53 PM', vers: apresPub }],
    },

    sature: {
      jour: 'Saturday, week 26',
      heure: (s) => (s.f.VAC === 'joignable' ? '9:15 PM' : '8:53 PM'),
      entree: (s) => {
        const outils = s.instruments.length;
        return {
          prod: -4 + (outils === 0 ? -1 : 0) + (s.f.VAC === 'joignable' ? -1 : 0),
          confiance: s.f.NOEUDS ? -1 : 0,
          horlogeFixe: MINUTES[outils] + (s.f.VAC === 'joignable' ? 15 : 0),
        };
      },
      texte: (s) => `
<p>The error rate goes from 0 to 60 % in twenty seconds. Two visitors out of three, among the tens of thousands who just saw the ad, land on an error page.</p>
${s.f.VAC === 'joignable'
    ? '<p>Your phone rings. Malik. You step out of the restaurant. He describes graphs you can\'t see while you hunt for signal on the sidewalk. A quarter of an hour goes by before you have a screen in front of you.</p>'
    : ''}
<p>${s.instruments.length === 3
    ? 'Three minutes is enough. The traces show every request waiting for a database connection. The logs spell it out. The metrics show 200 connections out of 200.'
    : s.instruments.length === 2
      ? 'Six minutes to understand, cross-checking the two sources you have. The pods are fine. It\'s the database turning people away.'
      : s.instruments.length === 1
        ? 'Twelve minutes of fumbling with the only tool you set up in six months. The pods are fine. It\'s the database turning people away.'
        : 'You have no centralized logs, no metrics, no traces. You open terminals one by one, pod by pod. Twenty-five minutes before you hit the line that explains everything.'}</p>
${code(`
FATAL:  sorry, too many clients already
`)}
<p>${s.f.NOEUDS ? '60' : '40'} pods, 20 connections each. PostgreSQL accepts 200. ${s.f.NOEUDS ? 'The nodes added “to be safe” let autoscaling drive even further into the wall.' : 'Every pod autoscaling adds makes things worse.'}</p>`,
      choix: [
        { t: 'Add even more pods: the site is short on capacity', vers: 'final', fx: { prod: -2, f: { GESTE: 'pods' } } },
        {
          t: 'Cap autoscaling at 8 pods, right now',
          vers: 'final',
          verrou: (s) => (s.energie >= 2 ? null : 'You need at least 2 ENERGY. You can no longer reason against your own reflex.'),
          fx: { confiance: 1, f: { GESTE: 'plafond' } },
        },
        { t: 'Restart the database with max_connections at 1,000', vers: 'final', fx: { prod: -1, f: { GESTE: 'restart' } } },
      ],
    },

    ines_gere: {
      jour: 'Saturday, week 26',
      heure: '8:53 PM',
      entree: (s) => ({ prod: -3 + (s.instruments.length === 0 ? -1 : 0), confiance: 1, f: { GESTE: 'ines' } }),
      texte: (s) => `
<p>The error rate goes from 0 to 60 % in twenty seconds.</p>
<p>Inès doesn't call you. She opens the runbook to the page “mass errors after a spike,” written on Thursday. First line: check the database connections.</p>
${code(`
FATAL:  sorry, too many clients already
`)}
<p>${s.instruments.length >= 2
    ? 'She finds it in four minutes, with the tools you set up over the months.'
    : 'It takes her a quarter of an hour, for lack of tools to see with: she reads the logs pod by pod.'} 40 pods, 20 connections each, a database that accepts 200. She caps autoscaling at 8 pods. The error rate drops back. The site is slow, but it answers.</p>
<p>At 9:10 PM, you get a message: “Database connection saturation. Capped at 8 pods, it's holding. I'll tell you all about it when you're back. Enjoy.”</p>
<p>You put the phone back face down on the table.</p>`,
      choix: [{ t: 'Sunday morning', vers: 'final' }],
    },

    final: {
      jour: 'Sunday, week 26',
      heure: '9:00 AM',
      fin: (s) => (s.f.EVENEMENTS === 0 ? 'rien' : (s.f.VAC === 'annule' && s.energie <= 1) ? 'heros' : 'tenu'),
      entree: (s) => {
        const fx = { horlogeFin: true, prod: 0, energie: 0, confiance: 0 };
        if (a(s, 'MUTED_ALERTS') && s.f.EVENEMENTS > 0) fx.prod -= 1;
        if (s.f.VAC === 'joignable') fx.energie -= s.f.EVENEMENTS > 0 ? 2 : 1;
        if (s.f.VAC === 'prepare') fx.energie += 1;
        if (s.f.VAC === 'annule') fx.confiance += 1;
        return fx;
      },
      texte: (s) => `
${s.f.GESTE === 'pods'
    ? '<p>Last night, you added pods. Each one took twenty more connections from a database that didn\'t have a single one left to give. The error rate climbed to 85 %. It took ten more minutes to do the opposite: cap at 8.</p>' + capot('When a site is buckling, the reflex is to add capacity. When the bottleneck sits behind it, every server you add pushes harder against the same wall. The move that saves you is to send less, not more.')
    : s.f.GESTE === 'plafond'
      ? '<p>Last night, you capped autoscaling at 8 pods. 160 connections, under the limit. The error rate dropped back within a minute. The site was slow, customers waited eight seconds, but they were placing orders.</p>' + capot('A service that is slow for everyone beats a service that errors for two customers out of three. Degrading on purpose means choosing what you give up before the system chooses for you.')
      : s.f.GESTE === 'restart'
        ? '<p>Last night, you restarted the database at the peak, with <code>max_connections</code> at 1,000. Two minutes of blank screen for everyone, at the worst moment in Panier Vif\'s history. Then the site came back, slow, with a database straining under 800 connections.</p>'
        : ''}
${a(s, 'MUTED_ALERTS') && s.f.EVENEMENTS > 0
    ? '<p>At 10:10 PM, the ad aired again. Notifications on the alerts channel had been muted since 10 PM, like every night for a month. The second wave lasted twenty minutes before anyone looked.</p>'
    : ''}
<p>${s.f.EVENEMENTS === 0
    ? 'Last night, 160,000 people came to the site in ten minutes. The dashboard drew a mountain, then a gentle slope. Checkout response time never went above 220 ms.'
    : 'Sunday morning, Hugo runs the numbers. The orders are there, fewer than they could have been.'}</p>
<p>${s.f.VAC === 'annule'
    ? 'You are in the empty open space. You saw everything, followed everything, held everything together yourself. Hugo wrote you “thank you” with three exclamation points. Your ten days of vacation, though, were never rescheduled: nobody thought of it.'
    : s.f.VAC === 'prepare'
      ? 'You eat breakfast facing the mountains. Inès sent you a photo of the dashboard, with a single word: “Look.” She ran the most important night in the company\'s history, and you weren\'t there.'
      : (s.f.EVENEMENTS > 0
        ? 'You are 500 miles away, and you haven\'t slept. You spent the evening on the phone on a sidewalk. That isn\'t a vacation, and it wasn\'t good work either.'
        : 'You are 500 miles away. Nobody called you. You still kept refreshing the dashboard on your phone all evening, right through dessert.')}</p>
<p>Six months ago, on a Friday at 4:42 PM, someone asked you for a green light on a two-line migration.</p>`,
    },
  };

  const epilogue = (s) => ' '
    + (s.energie <= 1 ? 'You are worn out, and it will end up showing in your decisions.' : s.energie >= 4 ? 'You have energy left for what comes next, which is rare in this line of work.' : 'The fatigue is there, but you are still standing.')
    + ' '
    + (s.dette >= 5 ? 'A pile of undated tickets is waiting for you on Monday.' : s.dette <= 1 ? 'You carry almost no debt.' : 'A few postponed decisions are still waiting for you.')
    + ' '
    + (s.confiance >= 7 ? 'The team follows you without you having to push.' : s.confiance <= 2 ? 'People still double-check behind you.' : 'The team listens to you, most of the time.');

  racine.CHAPITRES.en.push({
    id: 'ch12',
    numero: 12,
    titre: 'Saturday, 8:50 PM',
    techno: 'Everything',
    jour: 'Thursday, week 25',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['MANUAL_CERT', 'SECRET_IN_IMAGE', 'MUTED_ALERTS', 'NO_ROLLBACK'], dette: 6, energie: 2, confiance: 2 },
      { codes: ['RUNBOOK', 'RESTORE_TEST'], instruments: ['LOGS', 'METRICS', 'TRACES'], confiance: 8 },
    ],
    fins: {
      rien: {
        titre: 'Nothing happens',
        texte: (s) => 'Forty times the traffic, and not one alert. Nobody will ever know what you prevented over six months, and that is how you recognize good work.' + epilogue(s),
      },
      tenu: {
        titre: 'It held',
        texte: (s) => 'The night had its snags, each one coming from a decision made weeks earlier. Panier Vif is still standing, with more customers than yesterday.' + epilogue(s),
      },
      heros: {
        titre: 'Running on empty',
        texte: (s) => 'You saved everything yourself, and you are the only person who could have done it. That is the problem, not the reward: a company that rests on one exhausted person does not hold.' + epilogue(s),
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
