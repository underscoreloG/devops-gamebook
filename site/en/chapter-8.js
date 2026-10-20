/* Chapter 8: the big migration. Kubernetes, resources, probes, contexts. */
(function (racine) {
  'use strict';

  const { code, capot, hm, a, outil } = racine.RECIT_EN;

  const grave = (s) => s.f.RES === 'rien' || s.f.SONDE === 'db';
  /* Day label and cutover hour (24h); heureBascule adds the minutes and formats with hm: 23 + '10' gives "11:10 PM" */
  const quand = (s) => (s.f.QUAND === 'nuit' ? ['Monday, week 18', 23] : s.f.QUAND === 'matin' ? ['Tuesday, week 18', 7] : ['Tuesday, week 18', 14]);
  const jourBascule = (s) => quand(s)[0];
  const heureBascule = (suffixe) => (s) => hm(quand(s)[1], Number(suffixe));

  const noeuds = {

    debut: {
      heure: '10:00 AM',
      texte: () => `
<p>The Kubernetes cluster is ready. Three nodes, rented from the same hosting provider as the old servers. This week, the API moves in.</p>
<p>The plan fits in one line: both worlds will run side by side, and the load balancer will send 5% of traffic to the cluster, then 25%, then everything.</p>
<p>You bring it up with Malik. “Great. Announce it at the 11 AM weekly, that way everyone's in the loop.”</p>
<p>The weekly is twelve people for an hour. Everyone goes over their week. Half the room reads their email.</p>`,
      choix: [
        { t: 'Announce the migration at the weekly', vers: 'hebdo' },
        { t: 'Run a twenty-minute go/no-go instead, with a checklist', vers: 'gonogo' },
        { t: 'Organize nothing: it\'s a technical migration, nobody will notice', vers: 'm_ressources', fx: { f: { ANNONCE: 'rien' } } },
      ],
    },

    hebdo: {
      heure: '12:00 PM',
      entree: () => ({ f: { ANNONCE: 'hebdo' } }),
      texte: () => `
<p>You go ninth, between the delivery route schedule and the homepage redesign. “This week, we're migrating the API to Kubernetes. It should be transparent.”</p>
<p>Two people nod. Yasmine, from support, is answering a customer on her phone. Nobody asks a question.</p>
<p>Everyone is “in the loop.” Nobody knows which day, what time, or what to do if it goes wrong.</p>`,
      choix: [{ t: 'Write the manifests', vers: 'm_ressources' }],
    },

    gonogo: {
      heure: '11:40 AM',
      entree: (s) => (a(s, 'NO_ROLLBACK')
        ? { confiance: 1, energie: -1, retire: ['NO_ROLLBACK'], f: { ANNONCE: 'gonogo', PLAN_RETOUR: true } }
        : { confiance: 1, f: { ANNONCE: 'gonogo' } }),
      texte: (s) => `
<p>Twenty minutes, four people: Malik, Inès, Yasmine and you. A checklist on the screen. When? Who watches what? What does support say if a customer calls? How do we roll back?</p>
${s.f.PLAN_RETOUR
    ? '<p>The last question draws a blank. Nobody here has ever tested a rollback. You write the answer on the spot: the old servers stay up for a week, and rolling back means putting their weight back to 100% in the load balancer. You try it in staging that afternoon. Two minutes, timed.</p>'
    : '<p>The last question has had an answer since the day you tried the rollback button: the old servers stay up for a week, and rolling back means putting their weight back to 100% in the load balancer.</p>'}
<p>Yasmine writes down the cutover time and a sentence to tell customers. Malik says “go.”</p>
${capot('A go/no-go isn\'t an information meeting, it\'s a decision meeting: few people, a list of closed questions, and only one possible outcome, yes or no. The one that matters most is always the last: how do we roll back?')}`,
      choix: [{ t: 'Write the manifests', vers: 'm_ressources' }],
    },

    m_ressources: {
      heure: '2:00 PM',
      texte: () => `
<p>You write the API Deployment. First question: how much memory and CPU each pod requests, and how far it's allowed to go.</p>
<p>The worker that generates PDF invoices will run on the same cluster. It's known for being greedy.</p>
${code(`
# Option 1
resources: {}

# Option 2
resources:
  requests: { cpu: 250m, memory: 384Mi }
  limits:   { memory: 512Mi }

# Option 3
resources:
  requests: { cpu: 250m, memory: 384Mi }
  limits:   { cpu: 500m, memory: 512Mi }
`)}`,
      choix: [
        { t: 'Option 1: nothing for now, we\'ll tune it by watching real usage', vers: 'm_sondes', fx: { f: { RES: 'rien' } } },
        { t: 'Option 2: requests, a memory limit, no CPU limit', vers: 'm_sondes', fx: { f: { RES: 'bon' } } },
        { t: 'Option 3: requests and limits everywhere, CPU included', vers: 'm_sondes', fx: { f: { RES: 'cpu' } } },
      ],
    },

    m_sondes: {
      heure: '2:30 PM',
      texte: (s) => `
<p>${s.f.RES === 'rien'
    ? 'You leave the block empty. Kubernetes will place the pods wherever it likes, without guaranteeing them anything.'
    : s.f.RES === 'bon'
      ? 'Each pod has a reserved share, and a memory ceiling past which it gets killed rather than choking its neighbors.'
      : 'Each pod is locked in its box, memory and CPU. It looks rigorous.'}</p>
<p>Second question: how does Kubernetes know a pod is healthy? The app already has a <code>/health</code> route, which runs a <code>SELECT 1</code> on the database. Inès can add others in ten minutes.</p>
${code(`
# Option 1
livenessProbe:
  httpGet: { path: /health, port: 8000 }

# Option 2
livenessProbe:
  httpGet: { path: /livez, port: 8000 }     # the process responds
readinessProbe:
  httpGet: { path: /readyz, port: 8000 }    # the database and cache respond

# Option 3: no probes
`)}`,
      choix: [
        { t: 'Option 1: liveness on /health, a pod cut off from the database should restart', vers: 'bascule', fx: { f: { SONDE: 'db' } } },
        { t: 'Option 2: /livez for liveness, /readyz for readiness', vers: 'bascule', fx: { f: { SONDE: 'bon' } } },
        { t: 'Option 3: no probes for now, it works without them', vers: 'bascule', fx: { dette: 1, f: { SONDE: 'rien' } } },
      ],
    },

    bascule: {
      heure: '4:00 PM',
      texte: (s) => `
<p>${s.f.SONDE === 'db'
    ? 'You wire the liveness probe to <code>/health</code>. If a pod can no longer reach the database, Kubernetes will restart it.'
    : s.f.SONDE === 'bon'
      ? 'Inès adds both routes. Liveness only checks the process. Readiness checks the dependencies: a pod that can no longer reach the database is pulled out of traffic, without being killed.'
      : 'No probes. Kubernetes will consider a pod ready as soon as its container has started.'}</p>
<p>The manifests go through staging without a hitch. All that's left is picking the cutover time. Traffic is at its lowest between 11 PM and 6 AM.</p>
<p>“Do it tonight,” Malik suggests. “That way, if it breaks, nobody sees anything.”</p>`,
      choix: [
        { t: 'Tonight at 11 PM, solo', vers: 'nettoyage', fx: { energie: -2, f: { QUAND: 'nuit' } } },
        { t: 'Tomorrow at 7 AM, with Inès', vers: 'nettoyage', fx: { energie: -1, f: { QUAND: 'matin' } } },
        { t: 'Tomorrow at 2 PM, in broad daylight, with the whole team watching the dashboards', vers: 'nettoyage', fx: { f: { QUAND: 'jour' } } },
      ],
    },

    nettoyage: {
      jour: jourBascule,
      heure: heureBascule('10'),
      texte: (s) => `
<p>${s.f.QUAND === 'nuit'
    ? 'The open space is empty. A single lamp on, yours.'
    : s.f.QUAND === 'matin'
      ? 'Inès brought croissants. She sits down next to you, her screen on your dashboards.'
      : 'Malik, Inès and Yasmine have pulled up their chairs. The dashboards are projected on the wall.'}</p>
<p>The load balancer sends 5% of traffic to the cluster. The first customers are served by pods. Everything looks normal.</p>
<p>While you wait to move to 25%, you want to do a bit of cleanup: delete the test deployment you left in staging last week.</p>
${code(`
$ kubectl delete -f api-test.yaml
`)}
<p>You have two terminals open, two clusters. Your finger hovers over the Enter key.</p>`,
      choix: [
        { t: 'Run the command: this is the staging terminal', vers: (s) => (s.f.QUAND === 'nuit' ? 'erreur_contexte' : 'canari'), fx: { f: { NET: 'lance' } } },
        {
          t: 'First check which cluster this terminal points to',
          vers: 'canari',
          verrou: (s) => (s.energie >= 3 ? null : 'You need at least 3 ENERGY. At this hour, you don\'t double-check anything anymore.'),
          fx: { f: { NET: 'verifie' } },
        },
        { t: 'Rewrite the command with --context staging, so it no longer depends on the terminal', vers: 'canari', fx: { confiance: 1, f: { NET: 'explicite' } } },
      ],
    },

    erreur_contexte: {
      jour: jourBascule,
      heure: heureBascule('14'),
      entree: () => ({ prod: -2, confiance: -1, horlogeFixe: 4 }),
      texte: () => `
${code(`
$ kubectl delete -f api-test.yaml
deployment.apps "api" deleted
service "api" deleted

$ kubectl config current-context
paniervif-prod
`)}
<p>It wasn't the staging terminal. And your test file used the same names as prod.</p>
<p>On the cluster, the API no longer exists. The 5% of customers routed there get errors. You reapply the manifests, palms sweating: images to pull, pods to start. Four minutes.</p>
<p>Nobody was there to ask you “which cluster are you on?”</p>
${capot('<code>kubectl</code> acts on the last context you picked, without reminding you. Alone, late and tired, you don\'t check. The safeguards that work don\'t rely on vigilance: a <code>--context</code> written into every command, a prompt that shows the cluster in red, delete rights removed in prod.')}`,
      choix: [{ t: 'Resume the cutover', vers: 'canari', fx: { horlogeFin: true } }],
    },

    canari: {
      jour: jourBascule,
      heure: heureBascule('30'),
      texte: (s) => `
${s.f.NET === 'lance' && s.f.QUAND !== 'nuit'
    ? '<p>“Wait.” Inès has put her hand on your arm. “Which cluster are you on right now?”</p><p>You check. <code>paniervif-prod</code>. Your test file uses the same names as prod: you were about to delete the API. You take your hand off the keyboard, slowly.</p>'
    : s.f.NET === 'verifie'
      ? '<p><code>kubectl config current-context</code> answers <code>paniervif-prod</code>. It wasn\'t the staging terminal. You switch windows, and breathe.</p>'
      : s.f.NET === 'explicite'
        ? '<p>With <code>--context staging</code> in the command, the terminal doesn\'t matter. The test deployment disappears from the right cluster. You add the flag to all your aliases.</p>'
        : ''}
<p>Twenty minutes at 5%. On the dashboard, the cluster's average response time is 190 ms, versus 180 ms on the old servers. The error rate is zero.</p>
<p>${outil(s, 'METRICS') ? 'Your alerts are quiet.' : 'Nobody has complained.'} Everything says you can keep going.</p>`,
      choix: [
        { t: 'Move to 25%, then 100%: the average looks good', vers: 'apres_canari', fx: { f: { OBS: 'moyenne' } } },
        { t: 'Look at the p99 before moving on', vers: 'apres_canari', fx: { f: { OBS: 'p99' } } },
        { t: 'Add tracing on the payment path before going further (two hours)', vers: 'apres_canari', fx: { energie: -1, instruments: ['TRACES'], f: { OBS: 'traces' } } },
      ],
    },

    apres_canari: {
      jour: jourBascule,
      heure: heureBascule('55'),
      entree: (s) => (s.f.RES === 'cpu' && s.f.OBS !== 'moyenne' ? { confiance: 1, f: { RES: 'bon', CPU_VU: true } } : {}),
      texte: (s) => `
${s.f.CPU_VU
    ? (s.f.OBS === 'traces'
      ? '<p>The first traces come in. On one payment request in a hundred, a step that does nothing, no call, no SQL query, takes four seconds. The code is waiting. Waiting to be given CPU back.</p>'
      : '<p>The average says 190 ms. The p99 says 4.2 seconds: one request in a hundred is twenty times slower than the rest.</p>')
      + code(`
rate(container_cpu_cfs_throttled_periods_total{pod=~"api-.*"}[5m])
  / rate(container_cpu_cfs_periods_total{pod=~"api-.*"}[5m])
= 0.31
`)
      + '<p>The pods are throttled a third of the time. Your 500m CPU limit cuts them off at every spike, even when the node has spare CPU. You remove the CPU limit and keep the request. The p99 drops back to 240 ms. You move to 25%, then 100%.</p>'
      + capot('A 190 ms average can hide one customer in a hundred waiting four seconds. That customer pays, or gives up. As for the CPU limit, it doesn\'t protect the pod: it slows it down. Many teams keep requests, which guarantee a share, and skip CPU limits. The debate is real, and you settle it by looking at the p99.')
    : s.f.RES === 'cpu'
      ? '<p>You move to 25%, then 100%. The average stays tame: 195 ms. You close the dashboards feeling like a job well done.</p><p>You didn\'t look past the average.</p>'
      : (s.f.OBS === 'moyenne'
        ? '<p>You move to 25%, then 100%. The average stays tame. All of Panier Vif\'s traffic is served by the cluster.</p>'
        : s.f.OBS === 'p99'
          ? '<p>The p99 is 260 ms: the slowest request in a hundred looks like the others. You move to 25%, then 100%.</p>'
          : '<p>The traces show a payment path with no surprises: the database, PayLoire, the cache, each in its place and on time. You move to 25%, then 100%. And now you know where every request spends its time.</p>')}
<p>All traffic is on Kubernetes. ${a(s, 'NO_ROLLBACK')
    ? 'Malik suggests shutting down the old servers on Wednesday: €900 a month, might as well save it right away. Nobody objects.'
    : 'The old servers stay up for a week, at 0% of traffic, just in case.'}</p>`,
      choix: [{ t: 'Friday, 6 PM: first peak of the week', vers: 'vendredi' }],
    },

    vendredi: {
      jour: 'Friday, week 18',
      heure: '6:05 PM',
      fin: (s) => (grave(s) ? 'evince' : (s.f.RES === 'cpu' || s.f.SONDE === 'rien') ? 'bride' : 'migre'),
      entree: (s) => {
        const fx = { prod: 0, confiance: 0, dette: 0 };
        if (s.f.RES === 'rien') fx.prod -= 3;
        if (s.f.SONDE === 'db') fx.prod -= 3;
        if (s.f.SONDE === 'rien') fx.prod -= 1;
        if (s.f.RES === 'cpu') { fx.prod -= 2; fx.dette += 1; }
        if (grave(s)) {
          fx.prod += a(s, 'NO_ROLLBACK') ? -1 : 1;
          if (s.f.ANNONCE !== 'gonogo') fx.confiance -= 1;
        }
        return fx;
      },
      texte: (s) => `
<p>On Friday evening, all of Nantes orders its weekend groceries.</p>
${s.f.RES === 'rien'
    ? '<p>At 6:02 PM, the invoice worker swallows 6 GB of memory for a monthly export. The node is choking. Kubernetes has to make room, and it starts with the pods it promised nothing to: with no requests, the API pods are at the bottom of the list. It evicts them, all of them on that node, then the ones on the neighboring node where the worker got rescheduled.</p>' + capot('A pod with no requests and no limits is classed <code>BestEffort</code>: first to be evicted when memory runs short. “We\'ll tune it later” amounts to telling the cluster that the API is the least important thing it runs.')
    : ''}
${s.f.SONDE === 'db'
    ? '<p>At 6:04 PM, a heavy query ties up the database for forty seconds. <code>/health</code> stops answering in time. Kubernetes concludes that every pod is dead, and restarts them all at once. On restart, they all rush the database together, which slows it down further, and <code>/health</code> fails again. The loop lasts nine minutes.</p>' + capot('A liveness probe that depends on the database turns a slow database into a dead application. Liveness answers a single question: is this process stuck? Dependencies belong in readiness, which pulls the pod out of traffic without killing it.')
    : ''}
${s.f.SONDE === 'rien'
    ? '<p>Already on Thursday, with every deployment, customers got 502 errors for forty seconds: without readiness, Kubernetes sends traffic to new pods before the app has finished starting. Tonight, Inès ships a fix at 6 PM, and it happens again at peak.</p>'
    : ''}
${s.f.RES === 'cpu'
    ? '<p>Since Tuesday, support has been getting the same message, always worded the same way: “it\'s slow, sometimes.” Tonight, at peak, one request in a hundred takes over four seconds, and checkout gives up after three. Your pods are throttled by their CPU limit. The average, meanwhile, still looks excellent.</p>'
    : ''}
${grave(s)
    ? (a(s, 'NO_ROLLBACK')
      ? '<p>“Switch back to the old servers!” Malik shouts. They\'ve been off since Wednesday. They have to be powered back on, redeployed, checked. Nobody had ever tried. The incident lasts as long as it takes to understand and fix it in place.</p>'
      : '<p>You put the old servers\' weight back to 100% in the load balancer. Two minutes later, the site responds again, and you can look for the cause with nobody waiting.</p>')
      + (s.f.ANNONCE !== 'gonogo' ? '<p>Yasmine learns about the migration at the same time as the outage. “Nobody told me it was this week. What do I tell customers?”</p>' : '<p>Yasmine already has her sentence ready for customers. She wrote it down on Monday.</p>')
    : ''}
${!grave(s) && s.f.RES !== 'cpu' && s.f.SONDE !== 'rien'
    ? '<p>The invoice worker swallows its usual 6 GB, hits its own limit, and gets restarted on its own. A heavy query slows the database for forty seconds: the pods step out of traffic until it passes, then come back. The dashboard barely ripples.</p><p>The cluster has weathered its first Friday. Nobody writes to you.</p>'
    : ''}`,
    },
  };

  racine.CHAPITRES.en.push({
    id: 'ch8',
    numero: 8,
    titre: 'The big migration',
    techno: 'Kubernetes',
    jour: 'Monday, week 18',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['NO_ROLLBACK'], energie: 3, confiance: 2 },
      { instruments: ['METRICS', 'LOGS'], energie: 2 },
    ],
    fins: {
      migre: {
        titre: 'The first Friday',
        texte: 'The cluster took a peak, a greedy neighbor and a slow database without anyone noticing. That was the point.',
      },
      bride: {
        titre: 'It\'s slow, sometimes',
        texte: 'Nothing went down. But some customers are paying for a setting the average doesn\'t show.',
      },
      evince: {
        titre: 'At the bottom of the list',
        texte: 'The cluster did exactly what the manifests asked. The manifests just didn\'t say what you meant.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
