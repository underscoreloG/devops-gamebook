/* Chapter 9: it's always DNS. TTL, domain cutover, certificates. */
(function (racine) {
  'use strict';

  const { code, capot, a, outil } = racine.RECIT_EN;

  const apresCert = (s) => (s.f.DNS === 'casse' ? 'vendredi_casse' : 'vendredi_ok');
  const dimanche = (s) => (s.f.CERT === 'copie' ? 'dimanche_expire' : 'dimanche_calme');

  const noeuds = {

    debut: {
      heure: '9:30 AM',
      texte: () => `
<p>All traffic has gone through the cluster for two weeks. The old servers are useless now, except for one thing: the domain <code>www.paniervif.fr</code> still points at the old load balancer, which forwards everything to the cluster.</p>
<p>Malik wants them shut down. “€900 a month to forward mail. Tomorrow night, hard deadline.”</p>
<p>For that, the domain has to point straight at the cluster. So you have to edit the DNS zone. And there is a catch: nobody on the team knows who has access to it.</p>
<p>“I'll set up a meeting this afternoon,” Malik says. “Everyone, one hour. We'll track those credentials down eventually.”</p>
<p>You have something else on your mind: on Saturday, you are a witness at a wedding, 250 miles from here. Your train leaves tomorrow at 6:10 PM.</p>`,
      choix: [
        { t: 'Accept this afternoon\'s meeting', vers: 'reunion_acces' },
        { t: 'Dig it up yourself: dig, whois, the password manager', vers: 'chercher' },
        { t: 'Go see Bastien, who just got back from vacation', vers: 'bastien' },
      ],
    },

    reunion_acces: {
      heure: '4:00 PM',
      entree: () => ({ energie: -1, f: { TARD: true } }),
      texte: () => `
<p>Seven people around the table. Hugo thinks it was the web agency from four years ago. Karim finds a €14 yearly invoice, paid with a card that no longer exists. Yasmine remembers a “renewal” email she filed as spam.</p>
<p>Fifty minutes in, someone says: “We should ask Bastien.” Bastien is at his desk, ten yards away. Nobody invited him.</p>
<p>It takes him thirty seconds: the domain has been on his personal account at the hosting provider since day one.</p>
${capot('The meeting tied up seven people for an hour to find a piece of information only one of them had. Before you call a meeting, ask who knows. If the answer is “one person,” go see that person.')}`,
      choix: [{ t: 'Open the DNS zone', vers: 'zone' }],
    },

    chercher: {
      heure: '9:50 AM',
      texte: () => `
${code(`
$ dig +short NS paniervif.fr
ns1.hebergeur-ouest.example.
ns2.hebergeur-ouest.example.
`)}
<p>The zone lives at the legacy hosting provider. In the password manager, you find an entry called “domain (Bastien personal account).” The password works. Two-factor auth sends a code to Bastien's phone.</p>
<p>He is at his desk. He reads you the code, a little embarrassed. “We really need to get that off my account.”</p>
<p>You make a note to transfer the domain to a company account. Twenty minutes in total.</p>`,
      choix: [{ t: 'Open the DNS zone', vers: 'zone' }],
    },

    bastien: {
      heure: '9:40 AM',
      entree: () => ({ confiance: 1, f: { AVERTI: true } }),
      texte: () => `
<p>Bastien looks up from his screen. “The domain? It's on my personal account, has been from the start. I'll give you access. We should move it out of there, by the way.”</p>
<p>Then, while you log in: “Watch out for one thing. Back then I bumped the TTL to twenty-four hours, to cut down on queries. If you change the address, it'll take a full day to show up everywhere.”</p>
<p>Ten minutes, access included.</p>`,
      choix: [{ t: 'Open the DNS zone', vers: 'zone' }],
    },

    zone: {
      heure: (s) => (s.f.TARD ? '4:15 PM' : '10:15 AM'),
      texte: (s) => `
${code(`
$ dig +noall +answer www.paniervif.fr
www.paniervif.fr.    86400    IN    A    203.0.113.10
`)}
<p>The old load balancer is at <code>203.0.113.10</code>. The cluster ingress is at <code>198.51.100.20</code>. You just swap one for the other.</p>
<p>The number in the middle is the TTL: 86,400 seconds. ${s.f.AVERTI ? 'The twenty-four hours Bastien mentioned.' : 'Twenty-four hours.'}</p>
<p>${s.f.TARD ? 'It is already past 4 PM, and Malik wants the servers off tomorrow night.' : 'Malik wants the servers off tomorrow night.'}</p>`,
      choix: [
        { t: 'Change the address now and shut down the old servers tonight', vers: 'cert', fx: { f: { DNS: 'casse' } } },
        { t: 'Drop the TTL to 300 today, cut over tomorrow, and keep the old servers until Monday', vers: 'cert', fx: { confiance: -1, f: { DNS: 'bas' } } },
        { t: 'Change the address now, but keep the old servers running until Monday', vers: 'cert', fx: { confiance: -1, f: { DNS: 'garde' } } },
      ],
    },

    cert: {
      heure: (s) => (s.f.TARD ? '4:40 PM' : '10:45 AM'),
      texte: (s) => `
${s.f.VU
    ? ''
    : (s.f.DNS === 'casse'
      ? '<p>You prepare the change for tonight.</p>'
      : '<p>“Monday?” Malik grimaces. You explain the twenty-four hours. He counts on his fingers: three extra days of servers, €90. “Fine. Monday.”</p>')}
<p>${s.f.VU ? 'You still have to decide where the cluster\'s certificate will come from.' : 'One detail left. Once the domain points at the cluster, the cluster will have to serve the HTTPS certificate for <code>www.paniervif.fr</code>. Today it sits on the old load balancer, renewed by a cron job Bastien wrote.'}</p>`,
      choix: [
        { t: 'Check the current certificate first', vers: 'cert_vu', si: (s) => !s.f.VU },
        { t: 'Copy the current certificate and its key into the cluster: it already works', vers: apresCert, si: (s) => !s.f.VU, fx: { f: { CERT: 'copie' } } },
        { t: 'Renew the certificate by hand, just this once, and copy it into the cluster', vers: apresCert, si: (s) => !!s.f.VU, fx: { codes: ['MANUAL_CERT'], dette: 1, f: { CERT: 'manuel' } } },
        { t: 'Install cert-manager with HTTP validation, which will issue the certificate after the cutover', vers: apresCert, fx: { f: { CERT: 'http' } } },
        { t: 'Install cert-manager with DNS validation, to have the certificate before the cutover (one hour)', vers: apresCert, fx: { energie: -1, f: { CERT: 'dns' } } },
      ],
    },

    cert_vu: {
      heure: (s) => (s.f.TARD ? '4:50 PM' : '10:55 AM'),
      entree: () => ({ f: { VU: true } }),
      texte: () => `
${code(`
$ echo | openssl s_client -connect www.paniervif.fr:443 2>/dev/null \\
    | openssl x509 -noout -enddate
notAfter=Jan 18 14:02:11 2026 GMT
`)}
<p>Sunday, 3:02 PM, Paris time. Three days from now.</p>
<p>A Let's Encrypt certificate gets renewed a month before it ends. This one should have been renewed four weeks ago. You go look at Bastien's cron job: it has failed every night since the migration. To prove it controls the domain, <code>certbot</code> drops a file on the old server. But the old load balancer now forwards every request to the cluster, including the one Let's Encrypt sends to fetch that file.</p>
<p>Nobody noticed. Nothing watches this certificate from the outside.</p>
${capot('An expiring certificate is the most predictable outage there is: the date is written inside it. It still happens, because renewal is automatic right up to the day a migration quietly breaks the automation.')}`,
      choix: [{ t: 'Decide what to do about the certificate', vers: 'cert' }],
    },

    vendredi_casse: {
      jour: 'Friday, week 20',
      heure: '8:20 AM',
      entree: () => ({ prod: -3, horlogeFixe: 0 }),
      texte: (s) => `
<p>Last night at 7 PM, you changed the address and stopped the old servers. You checked from your phone: the site loaded. You left the office with a clear head.</p>
<p>This morning, Yasmine has forty messages. “Site unreachable.” “It just spins.” At home, on 4G, everything works. On the office wifi, nothing.</p>
${code(`
$ dig +noall +answer www.paniervif.fr @8.8.8.8
www.paniervif.fr.    38211    IN    A    203.0.113.10
`)}
<p>This resolver still has the old address cached, for another 38,211 seconds. So do thousands of others, at ISPs, in home routers, inside companies. All of them send their users to a server that is turned off.</p>
<p>${outil(s, 'METRICS') ? 'Your alerts said nothing: seen from the cluster, the requests that arrive are served without errors. The ones that never arrive leave no trace.' : 'No alert, of course.'}</p>`,
      choix: [
        { t: 'Power the old servers back on', vers: 'rallumer' },
        { t: 'Put the old address back in the DNS zone', vers: 'flipflop' },
        { t: 'Wait: by 7 PM tonight, every cache will have expired', vers: 'attendre' },
      ],
    },

    flipflop: {
      jour: 'Friday, week 20',
      heure: '8:40 AM',
      entree: () => ({ prod: -1, horloge: 20 }),
      texte: () => `
<p>You put <code>203.0.113.10</code> back in the zone. Twenty minutes later, the complaints have doubled.</p>
<p>People who had already picked up the new address were fine. People whose cache just expired now get the old one, the dead server, and will keep it for twenty-four hours. You just broke the site for a second group of users without fixing it for the first.</p>
<p>You put the new address back. There is only one way to serve everyone: both addresses have to answer.</p>`,
      choix: [{ t: 'Power the old servers back on', vers: 'rallumer' }],
    },

    rallumer: {
      jour: 'Friday, week 20',
      heure: (s) => (s.horloge >= 20 ? '8:55 AM' : '8:35 AM'),
      entree: () => ({ horloge: 12, horlogeFin: true, confiance: -1 }),
      texte: () => `
<p>The servers were stopped, not deleted. You restart them. Twelve minutes later, the old load balancer is forwarding traffic to the cluster again, and Yasmine's forty customers have their site back.</p>
<p>Both addresses answer. It no longer matters what each resolver has cached.</p>
<p>“So they stay on,” Malik says. “Until when?” Until Monday, at least. Which is what you could have told him yesterday.</p>
${capot('You can\'t flush other people\'s caches. Once a DNS answer goes out with a 24-hour TTL, it lives for 24 hours everywhere it landed. The only room to maneuver comes before: lower the TTL, wait for the old one to expire, then cut over. And the old address has to keep answering as long as a cache can still send someone there.')}`,
      choix: [{ t: 'Wrap up the week', vers: 'depart' }],
    },

    attendre: {
      jour: 'Friday, week 20',
      heure: '7:00 PM',
      entree: () => ({ prod: -3, confiance: -2, horlogeFin: true }),
      texte: () => `
<p>“It'll sort itself out by tonight.”</p>
<p>That's true. All day, hour after hour, caches expire and customers come back. All day, too, a share of Panier Vif's regulars land on a page that won't load, on a Friday, the day people order groceries for the weekend.</p>
<p>By 7 PM, it's over. Hugo spent the afternoon answering customers himself. He doesn't understand why all it took was turning three servers back on, and nobody did it.</p>`,
      choix: [{ t: 'Wrap up the week', vers: 'depart' }],
    },

    vendredi_ok: {
      jour: 'Friday, week 20',
      heure: '10:30 AM',
      texte: (s) => `
${s.f.DNS === 'bas'
    ? '<p>The TTL has been at 300 since yesterday morning. The old twenty-four hours have run out: no cache holds the address for more than five minutes now. You change the record.</p><p>Five minutes later, the old load balancer is getting almost nothing. If something had gone wrong, rolling back would have taken five minutes too.</p>'
    : '<p>You changed the address yesterday. Since then, caches have been expiring hour by hour, and traffic has been sliding from the old load balancer to the cluster. Both answer, so nobody sees a difference.</p><p>It works. You still note that, for those twenty-four hours, you had no way to roll back quickly if the cluster ingress had had a problem.</p>'}
${s.f.CERT === 'http'
    ? '<p>cert-manager requests its certificate as soon as the domain points at the cluster. Let\'s Encrypt queries the zone\'s nameservers directly, sees the new address, and validates in a minute. During that minute, the very first visitors to the cluster got a temporary certificate their browser rejected. From now on, renewal takes care of itself.</p>'
    : s.f.CERT === 'dns'
      ? '<p>The certificate was already waiting in the cluster: with DNS validation, cert-manager proves it controls the domain by writing a record in the zone, without needing traffic to arrive. No visitor saw a warning. Renewal will take care of itself.</p>'
      : s.f.CERT === 'manuel'
        ? '<p>Yesterday, you ran <code>certbot</code> in manual mode, added the validation record to the zone by hand, and copied the result into a Secret. The certificate is good for 90 days. In 60 days, someone will have to remember it.</p>'
        : '<p>The certificate and its key, copied from the old server, sit in a Secret in the cluster. The padlock shows up. Nothing to report.</p>'}`,
      choix: [{ t: 'Wrap up the week', vers: 'depart' }],
    },

    depart: {
      jour: 'Friday, week 20',
      heure: '5:10 PM',
      texte: (s) => `
<p>Your bag is packed, your suit in its garment bag. The train is at 6:10 PM.</p>
<p>${s.f.DNS === 'casse'
    ? 'This morning taught you one thing: from the inside, everything was fine. The site was broken from the outside, and nothing watches the site from the outside.'
    : 'One thought holds you back. All your alerts watch the cluster from the inside. Nothing checks what a customer sees from home: the domain name, the certificate, the page.'}</p>
<p>Setting up an external probe, at another hosting provider, with an alert on the certificate date: half an hour. You would have to run for the station.</p>`,
      choix: [
        { t: 'Set up the external probe before you leave', vers: (s) => (s.f.CERT === 'copie' ? 'alerte_exp' : 'dimanche_calme'), fx: { instruments: ['METRICS'], f: { SONDE: true } } },
        { t: 'Leave: it can wait until Monday', vers: dimanche },
      ],
    },

    alerte_exp: {
      jour: 'Friday, week 20',
      heure: '5:40 PM',
      texte: () => `
${code(`
- alert: CertificateExpiringSoon
  expr: probe_ssl_earliest_cert_expiry - time() < 14 * 86400
`)}
<p>You save the rule. It fires within a second.</p>
<p>The certificate you copied into the cluster yesterday expires Sunday at 3:02 PM. It should have been renewed four weeks ago: Bastien's cron job has failed every night since the migration, and nobody knew.</p>
<p>Sunday at 3 PM, you will be holding the rings.</p>
<p>It is 5:40 PM. Your train leaves in half an hour.</p>`,
      choix: [
        { t: 'Install cert-manager with DNS validation, now, and catch the next train', vers: 'dimanche_calme', fx: { energie: -1, confiance: 1, f: { CERT: 'dns' } } },
        { t: 'Renew by hand in twenty minutes and run for the station', vers: 'dimanche_calme', fx: { codes: ['MANUAL_CERT'], dette: 1, f: { CERT: 'manuel' } } },
      ],
    },

    dimanche_calme: {
      jour: 'Sunday, week 20',
      heure: '3:02 PM',
      fin: (s) => (s.f.DNS === 'casse' ? 'ttl' : 'bascule'),
      texte: (s) => `
<p>The cocktail hour. Someone hands you a glass. Your phone is in your inside pocket, and it hasn't buzzed since Friday.</p>
<p>${s.f.SONDE
    ? 'Somewhere at another hosting provider, a probe loads the Panier Vif home page every minute and checks the certificate date. If it went quiet, you would know that too.'
    : 'You assume everything is fine. Nobody has called you, and that is the only signal you have.'}</p>
<p>${a(s, 'MANUAL_CERT')
    ? 'The certificate holds until spring. You put a reminder in your calendar, between two other reminders.'
    : 'The certificate will renew itself without you in sixty days, and every time after that.'}</p>`,
    },

    dimanche_expire: {
      jour: 'Sunday, week 20',
      heure: '3:40 PM',
      entree: () => ({ prod: -3, horlogeFixe: 38 }),
      texte: () => `
<p>The cocktail hour. Your phone buzzes. Malik. You let it ring. He calls again. You step aside.</p>
<p>“The site shows a red page. Connection not secure. For everyone. For half an hour now.”</p>
<p>You open the site on your phone. The certificate expired at 3:02 PM. The one you copied into the cluster on Thursday without checking its date. It should have been renewed four weeks ago: Bastien's cron job has failed every night since the migration.</p>
<p>Browsers don't even offer to continue. Panier Vif is closed, on a Sunday afternoon, and you are 250 miles away with a flower in your lapel.</p>`,
      choix: [
        { t: 'Lock yourself in the car with your laptop', vers: 'voiture' },
        { t: 'Call Inès and walk her through it over the phone', vers: 'ines' },
        { t: 'Reply that you\'ll handle it tonight, after the ceremony', vers: 'ce_soir' },
      ],
    },

    voiture: {
      jour: 'Sunday, week 20',
      heure: '4:30 PM',
      fin: 'expire',
      entree: () => ({ energie: -2, codes: ['MANUAL_CERT'], horloge: 50, dette: 1 }),
      texte: () => `
<p>You brought your laptop, “just in case.” In the passenger seat, tethered to your phone, you run <code>certbot</code> in manual mode, add the validation record to the zone, and copy the new certificate into the cluster.</p>
<p>Fifty minutes. The padlock comes back at 4:30 PM.</p>
<p>When you walk back into the hall, the speeches are over. Yours was supposed to go second. Someone read it for you, off a sheet of paper.</p>
${capot('You fixed it, by hand and at your own expense. Nothing has changed, though: in 90 days this certificate will expire again, and it will still depend on your memory and your presence.')}`,
    },

    ines: {
      jour: 'Sunday, week 20',
      heure: (s) => (a(s, 'RUNBOOK') ? '4:05 PM' : '4:40 PM'),
      fin: 'expire',
      entree: (s) => (a(s, 'RUNBOOK')
        ? { codes: ['MANUAL_CERT'], horloge: 25, confiance: 1, dette: 1 }
        : { codes: ['MANUAL_CERT'], horloge: 60, prod: -1, energie: -1, dette: 1 }),
      texte: (s) => `
<p>Inès picks up right away. She has seen the messages.</p>
${a(s, 'RUNBOOK')
    ? '<p>“Just tell me where it\'s written down.” Since that first Friday, the two of you have been writing up procedures. You point her to the certificate one, written on Thursday. She follows it line by line and calls back only once, to confirm a command. At 4:05 PM, the padlock is back.</p><p>You only missed ten minutes of the party.</p>'
    : '<p>Nothing is written down anywhere. You dictate the commands from memory, over the noise, one finger in your ear. She gets the domain wrong once, you get a flag wrong another time. At 4:40 PM, the padlock comes back.</p><p>You spent an hour on the phone in a parking lot. She spent her Sunday afraid of breaking everything.</p>'}
${capot('What decided the length of the outage was not Inès\'s skill. It was whether a written procedure existed before the day it was needed.')}`,
    },

    ce_soir: {
      jour: 'Sunday, week 20',
      heure: '10:30 PM',
      fin: 'expire',
      entree: () => ({ prod: -3, confiance: -3, codes: ['MANUAL_CERT'], energie: -1, horlogeFin: true, dette: 1 }),
      texte: () => `
<p>“I'm at a wedding. I'll look at it tonight.”</p>
<p>A silence. “Tonight. Okay.”</p>
<p>You put your phone away. You don't hear a word of the next speech.</p>
<p>At 10:30 PM, from your hotel room, you renew the certificate by hand. The site was down for seven and a half hours, on a Sunday. Hugo wrote to you three times. The last message is one word: “Monday.”</p>
${capot('Your weekend was legitimate. But nobody else knew how to renew that certificate, and you knew it when you left. The problem is not that you refused to leave the party. It\'s that you were the only person able to fix it.')}`,
    },
  };

  racine.CHAPITRES.en.push({
    id: 'ch9',
    numero: 9,
    titre: 'It\'s always DNS',
    techno: 'DNS and TLS',
    jour: 'Thursday, week 20',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['RUNBOOK'], instruments: ['METRICS'] },
      { energie: 2, confiance: 2 },
    ],
    fins: {
      bascule: {
        titre: 'Nobody noticed',
        texte: 'The domain points to the right place, the certificate is valid, and you danced without looking at your phone.',
      },
      ttl: {
        titre: 'Twenty-four hours',
        texte: 'The change was right. It was the old server, shut down too early, that everyone whose cache had not yet expired was missing.',
      },
      expire: {
        titre: 'Our guest sends regrets',
        texte: 'The date was written in the certificate. Nobody read it, and it came due during the speeches.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
