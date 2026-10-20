/* Chapter 7: Malik's tool. Python, idempotency, timeouts, swallowed errors. */
(function (racine) {
  'use strict';

  const { code, capot } = racine.RECIT_EN;

  const SCRIPT_MALIK = `
import csv, requests

for row in csv.DictReader(open("orders.csv")):
    try:
        requests.post(
            "https://api.payloire.example/v1/refunds",
            json={"payment_id": row["payment_id"], "amount": 490},
            headers={"Authorization": f"Bearer {KEY}"},
        )
    except Exception:
        pass
`;

  const scriptComplet = (s) => `
def refund(order):
    response = requests.post(
        f"{API}/refunds",
        json={"payment_id": order["payment_id"], "amount": ${s.f.KARIM ? 'int(order["amount_cents"])' : '490'}},
        headers={**AUTH, "Idempotency-Key": f"delivery-fee-{order['id']}"},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()["id"]

for order in orders:
    try:
        log.writerow([order["id"], "ok", refund(order)])
    except requests.RequestException as err:
        log.writerow([order["id"], "failed", str(err)])
`;

  const noeuds = {

    debut: {
      heure: '5:30 PM',
      texte: () => `
<p>Last Saturday, a bug charged delivery fees twice to 312 customers. The bug is fixed. The 312 customers are still waiting for their money, and three of them are saying so in public.</p>
<p>Malik walks over with his laptop open. He was coding last night, at home.</p>
<p>“I wrote a script. It reads the list of orders and calls the PayLoire API to refund €4.90 to each one. Can you review it and run it tonight? I want to be able to answer customers tomorrow morning.”</p>
${code(SCRIPT_MALIK)}
<p>Twenty lines, written by your manager. There's a meeting with Karim, from accounting, tomorrow at 10 AM, “to sort out the details.”</p>`,
      choix: [
        { t: 'Run Malik\'s script as is, tonight', vers: 'run_brut' },
        { t: 'Call Karim for fifteen minutes before touching the code', vers: 'karim' },
        { t: 'Wait for tomorrow\'s 10 AM meeting with accounting', vers: 'demain' },
        { t: 'Review the code right now: accounting is for the details', vers: 'code' },
      ],
    },

    karim: {
      heure: '5:50 PM',
      entree: () => ({ f: { KARIM: true } }),
      texte: () => `
<p>Karim picks up on the second ring. He listens, then gives a dry laugh.</p>
<p>“€4.90 to everyone? Two problems. On Friday, support already refunded 57 customers by hand, the ones who yelled the loudest. They're in my file, column F. And subscribers only pay €2.90 for delivery. There are 88 of them on the list. If you send them €4.90, I spend my week chasing two euros from 88 people.”</p>
<p>He sends you his file: one column with the exact amount, another for the ones already refunded.</p>
${capot('Malik\'s script was wrong before it was fragile: the wrong amount for 88 customers, a double refund for 57. No code review would have shown it. The information was with the person who keeps the books, fifteen minutes away by phone.')}`,
      choix: [{ t: 'Review the code, with the right file', vers: 'code' }],
    },

    demain: {
      jour: 'Wednesday, week 16',
      heure: '10:45 AM',
      entree: () => ({ confiance: -1, prod: -1, f: { KARIM: true, DEMAIN: true } }),
      texte: () => `
<p>“Tomorrow, after the accounting meeting.” Malik clenches his jaw. “Customers have been waiting since Saturday.”</p>
<p>That evening, a fourth customer posts their double-charged invoice. The post is shared two hundred times.</p>
<p>Wednesday, 10 AM. Karim puts his file on the table. “Support already refunded 57 customers by hand, column F. And the 88 subscribers only paid €2.90, not €4.90.” Malik looks at his script, then at the ceiling.</p>
${capot('The meeting was useful: it prevented two mistakes affecting 145 customers. But what it contained fit in a fifteen-minute phone call the day before. Waiting for the scheduled slot cost a day of angry customers.')}`,
      choix: [{ t: 'Review the code, with the right file', vers: 'code' }],
    },

    code: {
      jour: (s) => (s.f.DEMAIN ? 'Wednesday, week 16' : null),
      heure: (s) => (s.f.DEMAIN ? '11:00 AM' : s.f.KARIM ? '6:00 PM' : '5:40 PM'),
      texte: (s) => `
<p>You read the twenty lines. Four things bother you.</p>
<p>The API call has no timeout: if PayLoire doesn't answer, the script will wait forever. Nothing prevents refunding the same customer twice if you rerun it. <code>except Exception: pass</code> swallows every error without keeping a single one. And the script doesn't record anywhere what it did.</p>
<p>${s.f.DEMAIN
    ? 'Malik is waiting behind you. “How long?”'
    : 'It\'s late. Malik stops by again. “All good? Are you running it?”'}</p>`,
      choix: [
        { t: 'Add a timeout and run it: ten minutes', vers: 'run_timeout', fx: { f: { NIVEAU: 'timeout' } } },
        { t: 'Timeout, idempotency key and a log of every refund: one hour, then run it', vers: 'run_complet', fx: { energie: -1, f: { NIVEAU: 'complet' } } },
        {
          t: 'All of that, plus a trial on five orders with Karim, and run it tomorrow at 9 AM',
          vers: 'run_complet',
          si: (s) => !s.f.DEMAIN,
          fx: { confiance: -1, f: { NIVEAU: 'complet', ESSAI: true } },
        },
        {
          t: 'All of that, plus a trial on five orders with Karim, this afternoon',
          vers: 'run_complet',
          si: (s) => !!s.f.DEMAIN,
          fx: { f: { NIVEAU: 'complet', ESSAI: true } },
        },
      ],
    },

    run_brut: {
      heure: '6:25 PM',
      entree: () => ({ energie: -1, f: { NIVEAU: 'brut' } }),
      texte: () => `
<p>You run it. The terminal shows nothing: the script has no <code>print</code>. You assume it's working.</p>
<p>Ten minutes. Twenty. Still nothing, and the prompt doesn't come back. On the PayLoire dashboard, the refund counter has been stuck at 139 for fifteen minutes.</p>
<p>The script isn't slow. It's hanging on a connection PayLoire will never close.</p>
<p>You hit Ctrl-C. You don't know whether customer 140 got refunded.</p>
${capot('<code>requests</code> has no default timeout. A call without <code>timeout=</code> can wait forever for a response that will never come. It\'s the most common failure of a network script, and the quietest.')}`,
      choix: [
        { t: 'Rerun the script from the start', vers: 'relance_debut' },
        { t: 'First find where it stopped, in the PayLoire dashboard', vers: 'reprise' },
      ],
    },

    relance_debut: {
      heure: '6:50 PM',
      entree: () => ({ confiance: -2, prod: -1, f: { DOUBLE: true } }),
      texte: () => `
<p>You rerun it. The script starts over from the first line of the file, and PayLoire accepts everything: as far as its API knows, these are 139 new requests.</p>
<p>This time it runs to the end. 312 refunds, plus the 139 from the first pass.</p>
<p>139 customers got €9.80 instead of €4.90. €681 too much, which you'll either have to write off or charge back, with an explanation email nobody wants to write.</p>
${capot('A script that moves money must be safe to rerun without doing anything twice. PayLoire supports it, like most payment APIs: with an <code>Idempotency-Key</code> header unique to each order, the second request would have returned the first refund instead of creating another one.')}`,
      choix: [{ t: 'Face accounting', vers: 'bilan' }],
    },

    reprise: {
      heure: '7:30 PM',
      entree: () => ({ energie: -1 }),
      texte: () => `
<p>You export the list of refunds from the PayLoire dashboard and compare it to the file, line by line. 139 done. Number 140 too, as it turns out: the request went through, only the response got lost.</p>
<p>You cut the file at line 141, add a <code>timeout=10</code> so you never live through that again, and run it on the rest. Forty more minutes, but nobody gets refunded twice because of you.</p>
<p>It's 7:30 PM. The script has “finished.” With <code>except: pass</code>, you have no way of knowing how many calls actually succeeded.</p>`,
      choix: [{ t: 'Announce that it\'s done', vers: 'bilan' }],
    },

    run_timeout: {
      jour: (s) => (s.f.DEMAIN ? 'Wednesday, week 16' : null),
      heure: (s) => (s.f.DEMAIN ? '11:30 AM' : '6:30 PM'),
      texte: () => `
<p>You add <code>timeout=10</code> and run it. Six minutes later, the prompt comes back. No errors shown.</p>
<p>No errors shown, because the script never shows any. Around order 140, PayLoire took more than ten seconds to answer: the exception was swallowed. A bit further on, the API returned “429, too many requests” nine times. Those aren't even exceptions: the script never looked at the status code.</p>
<p>Ten customers got nothing. The script says everything is fine.</p>
${capot('<code>except Exception: pass</code> turns a failure into silence. And <code>requests</code> raises nothing on a 429 or a 500 until you call <code>raise_for_status()</code>. A script that can\'t tell you what failed hasn\'t “succeeded”: it just hasn\'t said anything.')}`,
      choix: [{ t: 'Announce that it\'s done', vers: 'bilan' }],
    },

    run_complet: {
      jour: (s) => (s.f.DEMAIN || s.f.ESSAI ? 'Wednesday, week 16' : null),
      heure: (s) => (s.f.DEMAIN ? '3:00 PM' : s.f.ESSAI ? '9:40 AM' : '7:20 PM'),
      entree: () => ({ f: { JOURNAL: true } }),
      texte: (s) => `
<p>You rewrite the core of the script:</p>
${code(scriptComplet(s))}
${s.f.ESSAI
    ? '<p>Karim sits down next to you. You run it on five orders, then he checks each one in his tool. The fourth had already been partly refunded by support: he takes it off the list. You run the rest.</p>'
    : '<p>You run it on the whole list.</p>'}
<p>Around order 140, PayLoire takes more than ten seconds to answer. The log records “failed,” and the script moves on. A bit further, nine 429 responses. Logged too.</p>
<p>At the end, the log says: ${s.f.KARIM ? '245' : '302'} refunded, 10 failed. You rerun the script as is. Thanks to the idempotency key, PayLoire recognizes the requests it already processed and only pays the ten missing ones.</p>
${capot('Three lines make the difference. The timeout keeps the script from hanging. <code>raise_for_status()</code> turns an error response into an exception, which the log records instead of swallowing. And the idempotency key makes a rerun safe: the cure for a failure halfway through becomes “run it again.”')}`,
      choix: [{ t: 'Announce that it\'s done', vers: 'bilan' }],
    },

    bilan: {
      jour: 'The next day',
      heure: '11:00 AM',
      fin: (s) => (s.f.DOUBLE || !s.f.KARIM ? 'double' : s.f.JOURNAL ? 'propre' : 'aveugle'),
      entree: (s) => {
        const fx = {};
        if (!s.f.KARIM) { fx.confiance = -2; fx.prod = -1; }
        if (!s.f.JOURNAL) { fx.energie = -1; fx.dette = 1; }
        if (s.f.KARIM && s.f.JOURNAL) fx.confiance = 1;
        return fx;
      },
      texte: (s) => `
<p>Karim comes by your desk with a single question. “Who got refunded, and how much?”</p>
${s.f.JOURNAL
    ? '<p>You send him the log: one line per order, the PayLoire refund ID, the amount. He loads it into his spreadsheet, sums it up, nods.</p>'
    : '<p>You have no idea. The script didn\'t record anything. You spend two hours exporting transactions from PayLoire and matching them back to the original file, line by line.' + (s.f.NIVEAU === 'timeout' ? ' That\'s when you discover the ten forgotten customers. Two of them have already called support again.' : '') + '</p>'}
${!s.f.KARIM
    ? '<p>Then he puts his own file next to yours, and his face changes. “You sent €4.90 to everyone? Support had already refunded 57 of them by hand. And the 88 subscribers only paid €2.90.” 145 customers got too much. Someone will have to write to them.</p>'
    : '<p>The amounts match his file: €4.90 for some, €2.90 for subscribers, nothing for the 57 support had already handled.</p>'}
<p>${s.f.DOUBLE
    ? 'Malik says nothing about the 139 duplicates. It was his script, and you were the one who reran it.'
    : 'Malik reads your version over your shoulder. “I wouldn\'t have thought of half of this.”'}</p>`,
    },
  };

  racine.CHAPITRES.en.push({
    id: 'ch7',
    numero: 7,
    titre: 'Malik\'s tool',
    techno: 'Python',
    jour: 'Tuesday, week 16',
    debut: 'debut',
    noeuds: noeuds,
    essais: [{ energie: 2, confiance: 1 }],
    fins: {
      propre: {
        titre: 'Safe to rerun',
        texte: 'Every customer got the right amount, exactly once, and you can prove it line by line.',
      },
      aveugle: {
        titre: 'No trace',
        texte: 'The amounts were right. But the script recorded nothing, and it took two hours to rebuild what it had done.',
      },
      double: {
        titre: 'Overpaid',
        texte: 'A script written in a hurry to fix a billing mistake created a second one, in the other direction.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
