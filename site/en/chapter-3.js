/* Chapter 3: Bastien's script. Shell, cron, empty variables. */
(function (racine) {
  'use strict';

  const { code, capot, a, outil } = racine.RECIT_EN;

  const CRONTAB = `
$ sudo crontab -l -u bastien
UPLOAD_DIR=/srv/uploads
TMP_SUBDIR=tmp
MAILTO=bastien
30 2 * * * /opt/scripts/backup.sh
0 3 * * * /opt/scripts/cleanup.sh
`;

  const SCRIPT = `
$ cat /opt/scripts/cleanup.sh
#!/bin/bash
# Cleans up temporary uploads. Bastien, March 2022.
# DO NOT TOUCH.
cd $UPLOAD_DIR/$TMP_SUBDIR
rm -rf *
`;

  const noeuds = {

    debut: {
      heure: '10:15 AM',
      texte: (s) => `
<p>A ticket from Malik is waiting for you: “Bastien is on leave for three weeks as of this morning. His two crons run under his personal account, and our accounts lock after fifteen days without a login. Move them to the <code>deploy</code> service account before tonight.”</p>
<p>Bastien built all of Panier Vif's infrastructure by himself, four years ago. His scripts still run, and nobody has read them since.</p>
${code(CRONTAB)}
${code(SCRIPT)}
<p>The <code>/srv/uploads</code> folder holds 61,000 files: the catalog photos and the receipts customers attach to their complaints.</p>
${a(s, 'BLAME')
    ? '<p>Inès walks behind your screen, looks at the script, opens her mouth. Then she goes back to her seat without a word. Since the post-mortem, she doesn\'t say much anymore.</p>'
    : '<p>Inès walks behind your screen. “Watch out for that one. It got me once. It doesn\'t behave the same depending on who runs it. I don\'t remember why.”</p>'}`,
      choix: [
        { t: 'Try the script by hand as deploy, then copy over the two cron lines', vers: 'essai_main' },
        { t: 'Read the script line by line before moving it', vers: 'lire' },
        { t: 'Offer to rewrite it properly in Python', vers: 'python' },
        { t: 'Call Bastien on his personal phone', vers: 'bastien' },
      ],
    },

    essai_main: {
      heure: '10:30 AM',
      texte: () => `
${code(`
$ sudo -iu deploy /opt/scripts/cleanup.sh
$ echo $?
0
$ du -sh /srv/uploads/tmp
4.0K    /srv/uploads/tmp
`)}
<p>The script runs without a word, and 12 GB of temporary files vanish from <code>/srv/uploads/tmp</code>. It does what it says.</p>
<p>All that's left is to copy the two schedule lines into the <code>deploy</code> crontab and empty Bastien's.</p>`,
      choix: [
        { t: 'Install the two lines under deploy and delete Bastien\'s crontab', vers: 'nuit' },
        { t: 'First compare both crontabs in full, line by line', vers: 'lire', fx: { f: { COMPARE: true } } },
      ],
    },

    bastien: {
      heure: '10:25 AM',
      entree: () => ({ confiance: -1, f: { APPEL: true } }),
      texte: () => `
<p>Three rings. Airport noise.</p>
<p>“I've been on vacation for four hours.”</p>
<p>You ask your question. He sighs, then answers anyway. “The cleanup? Careful. The variables aren't in the script, they're in my crontab. If you only copy the schedule lines, it starts from the root. I always meant to fix that. OK, I'm boarding.”</p>
<p>He hangs up before you can say thanks.</p>
${capot('In thirty seconds, Bastien gave you what you would have found by reading his crontab all the way to the top. Bothering a colleague on leave is justified when the information only exists in their head. Here, it was right in front of you.')}`,
      choix: [{ t: 'Go back to the script, line by line', vers: 'lire' }],
    },

    lire: {
      heure: '10:45 AM',
      texte: (s) => `
<p>${s.f.APPEL ? 'After what Bastien just said, it all makes sense.' : s.f.COMPARE ? 'You put the two crontabs side by side, and you finally see the first three lines of Bastien\'s.' : 'You start again from the top, crontab included.'} The script defines nothing itself. <code>UPLOAD_DIR</code> and <code>TMP_SUBDIR</code> come from Bastien's crontab.</p>
<p>You walk through what would happen under another account, without those two lines:</p>
${code(`
cd $UPLOAD_DIR/$TMP_SUBDIR    ->    cd /
rm -rf *                      ->    everything deploy is allowed to delete
`)}
<p>And <code>deploy</code> owns <code>/srv/uploads</code> and the application code.</p>
${s.f.COMPARE ? '<p>Your test by hand worked because a login shell loads <code>/etc/profile.d/paniervif.sh</code>, where Bastien also defined these variables. Cron loads nothing.</p>' : ''}
${capot('Cron runs commands with an almost empty environment: no profile, none of your shell variables. An undefined variable expands to an empty string, with no error. And if <code>cd</code> fails or lands somewhere else, the script carries on with the next line anyway.')}
<p>You start fixing it. Malik stops by your desk. “You're touching Bastien's script? It says not to touch it. Let's talk first. I'm setting up a committee on Thursday: one hour, with Hugo and Inès.”</p>`,
      choix: [
        { t: 'Accept Thursday\'s committee', vers: 'comite' },
        { t: 'Offer fifteen minutes right now, just the three of you, with the fix on screen', vers: 'quinze' },
        { t: 'Say yes to Thursday, and fix it this afternoon anyway without telling anyone', vers: 'sans_dire' },
      ],
    },

    comite: {
      jour: 'Thursday, week 6',
      heure: '3:00 PM',
      entree: () => ({ energie: -1, f: { COMITE: true } }),
      texte: () => `
<p>Thursday, 2 PM. Five people, one hour. Hugo asks whether there's “an off-the-shelf tool” for cleaning up files. Malik would like to use the occasion to review all of Bastien's scripts. Inès watches the clock.</p>
<p>At 3 PM, the decision comes down: keep the script, add guardrails. That's what you had on screen Tuesday morning.</p>
<p>In the meantime, the cron ran two more nights under Bastien's account, without incident. You lost nothing, except one hour times five people and two days.</p>
${capot('The committee answered a real concern: touching a script nobody understands. But a five-line decision gets made in front of the five lines. One hour with five people is half a day of work to decide nothing more.')}`,
      choix: [{ t: 'Apply the fix', vers: 'durcir' }],
    },

    quinze: {
      heure: '11:15 AM',
      entree: () => ({ confiance: 1 }),
      texte: () => `
<p>“By Thursday, Bastien's account will have two more days of inactivity. Give me fifteen minutes now, with Inès. I'll show you what the script does and what I'm changing.”</p>
<p>Malik hesitates, then pulls up a chair. You put the five lines on screen, then the two arrows: <code>cd /</code>, <code>rm -rf *</code>.</p>
<p>It takes him ten seconds. “It's been running like this since 2022?”</p>
<p>“It runs like this as long as nobody moves it.”</p>
<p>“Fix it.”</p>`,
      choix: [{ t: 'Apply the fix', vers: 'durcir' }],
    },

    sans_dire: {
      heure: '2:00 PM',
      entree: () => ({ f: { CACHE: true } }),
      texte: () => `
<p>“Thursday works.”</p>
<p>Malik leaves reassured. At 2 PM, you open the script.</p>
<p>You tell yourself it's the right fix, that you'll present it Thursday as a done deal, and that nobody will blame you for preventing an accident.</p>`,
      choix: [{ t: 'Apply the fix', vers: 'durcir' }],
    },

    durcir: {
      heure: (s) => (s.f.COMITE ? '3:30 PM' : s.f.CACHE ? '2:30 PM' : '11:45 AM'),
      texte: () => `
<p>You rewrite the script so it no longer depends on who runs it:</p>
${code(`
#!/bin/bash
# Deletes temporary uploads older than 2 days.
set -euo pipefail

UPLOAD_DIR="/srv/uploads"

find "\${UPLOAD_DIR:?}/tmp" -mindepth 1 -type f -mtime +2 -delete
`)}
<p>Before installing it, you swap <code>-delete</code> for <code>-print</code> and run it exactly the way cron would, with no environment at all:</p>
${code(`
$ sudo -u deploy env -i /bin/bash /opt/scripts/cleanup.sh | head -3
/srv/uploads/tmp/upload-8841.jpg
/srv/uploads/tmp/upload-8842.jpg
/srv/uploads/tmp/upload-8850.pdf
`)}
<p>Only files from <code>tmp</code>. You put <code>-delete</code> back, move the two cron lines under <code>deploy</code>, and install the credentials the backup needs.</p>
${capot('<code>set -u</code> stops the script on an undefined variable, <code>set -e</code> on a failing command. <code>${VAR:?}</code> also rejects an empty variable. And <code>find</code> with a full path replaces the <code>cd</code> then <code>*</code> combo, which deletes wherever it happens to be. Finally, you test a destructive script by making it harmless first.')}`,
      choix: [{ t: 'Check one last thing', vers: 'courrier' }],
    },

    python: {
      jour: 'Thursday, week 6',
      heure: '5:00 PM',
      entree: () => ({ confiance: -1, energie: -1, f: { PYTHON: true } }),
      texte: () => `
<p>“Two days to replace five lines?” Malik isn't convinced, but he lets you do it.</p>
<p>You write a real program: paths built with <code>pathlib</code>, a dry-run mode that lists without deleting, a hard refusal if the target folder isn't under <code>/srv/uploads</code>, six tests. Thursday at 5 PM, it replaces Bastien's script, under the <code>deploy</code> account.</p>
<p>It's better than the original. For two nights, though, the original kept running as is, with its <code>rm -rf *</code>, under an account getting closer to its lockout.</p>
${capot('Rewriting wasn\'t wrong, it was expensive. The danger fit in two lines and could be fixed in twenty minutes. The rewrite left the risk in place for two more days, for a gain nobody had asked for.')}`,
      choix: [{ t: 'Check one last thing', vers: 'courrier' }],
    },

    courrier: {
      heure: (s) => (s.f.COMITE ? '3:45 PM' : s.f.PYTHON ? '5:15 PM' : s.f.CACHE ? '2:45 PM' : '12:00 PM'),
      texte: () => `
<p>Bastien's crontab had one line you haven't looked at yet: <code>MAILTO=bastien</code>. Everything his crons print goes to his local mailbox, on this server.</p>
${code(`
$ sudo ls -lh /var/mail/bastien
-rw-rw---- 1 bastien mail 1.3M Oct  7 02:30 /var/mail/bastien
`)}
<p>1.3 MB of messages nobody has ever opened. The latest one is from last night, 2:30 AM.</p>`,
      choix: [
        { t: 'Open the mailbox and read the latest messages', vers: 'courrier_lu' },
        { t: 'Silence these mails with MAILTO="": nobody reads them anyway', vers: 'courrier_coupe' },
        { t: 'Leave it as is and close the ticket', vers: 'fin_calme' },
      ],
    },

    courrier_lu: {
      heure: (s) => (s.f.COMITE ? '4:30 PM' : s.f.PYTHON ? '6:00 PM' : s.f.CACHE ? '3:30 PM' : '12:45 PM'),
      entree: () => ({ codes: ['BACKUP_OK'], confiance: 1 }),
      texte: () => `
${code(`
$ sudo tail -6 /var/mail/bastien
Subject: Cron <bastien@vif-app-01> /opt/scripts/backup.sh

pg_dump: error: aborting because of server version mismatch
pg_dump: detail: server version: 16.4; pg_dump version: 15.8

$ sudo grep -c "server version mismatch" /var/mail/bastien
94
`)}
<p>Ninety-four nights. Since the PostgreSQL upgrade in June, the database backup has failed every night, and said so every night to a mailbox nobody reads.</p>
<p>You look at the files sent to storage: 20 bytes each. You open the script:</p>
${code(`
pg_dump paniervif | gzip > /var/backups/paniervif-$(date +%F).sql.gz
`)}
<p>You install the PostgreSQL 16 client, add <code>set -euo pipefail</code> at the top of the script, route the mails to the team list, and run a backup by hand. 3.1 GB. <code>gunzip -t</code> validates it.</p>
${capot('In <code>a | b</code>, the exit code is the one from <code>b</code>. <code>pg_dump</code> was failing, <code>gzip</code> was successfully compressing nothing, and the script ended on a zero. <code>pipefail</code> makes the line fail as soon as any link fails. A 20-byte backup is a file, not a backup.')}`,
      choix: [{ t: 'Close the ticket', vers: 'fin_calme' }],
    },

    courrier_coupe: {
      heure: (s) => (s.f.COMITE ? '3:50 PM' : s.f.PYTHON ? '5:20 PM' : s.f.CACHE ? '2:50 PM' : '12:05 PM'),
      entree: () => ({ dette: 2 }),
      texte: () => `
<p>You add <code>MAILTO=""</code> at the top of the new crontab. No more growing mailbox, no more noise.</p>
<p>You didn't read a single message. So you'll never know what these crons were trying to say, every night, for months.</p>
${capot('A channel nobody listens to doesn\'t get fixed by cutting it. Either these messages are useless and you fix whatever produces them, or they matter and they need to go to someone.')}`,
      choix: [{ t: 'Close the ticket', vers: 'fin_calme' }],
    },

    fin_calme: {
      jour: (s) => (s.f.CACHE ? 'Thursday, week 6' : null),
      heure: (s) => (s.f.CACHE ? '2:10 PM' : '6:00 PM'),
      fin: (s) => (s.f.PYTHON ? 'reecrit' : 'durci'),
      entree: (s) => (s.f.CACHE ? { confiance: -2 } : {}),
      texte: (s) => `
${s.f.CACHE
    ? '<p>Thursday, at the committee, you announce it\'s already fixed. Hugo smiles. Malik doesn\'t.</p><p>“We said Thursday. If I can\'t count on a yes, I\'ll double-check everything you do.”</p><p>Your fix was the right one. That\'s not what he holds against you.</p>'
    : '<p>The cleanup now runs under a service account, with a script that no longer depends on who runs it.</p>'}
<p>${a(s, 'BACKUP_OK')
    ? 'And for the first time since June, Panier Vif has a database backup with something in it.'
    : 'At 2:30 AM tonight, the backup will run like every night. You have no reason to think it doesn\'t work.'}</p>`,
    },

    nuit: {
      jour: 'Wednesday, week 6',
      heure: '3:00 AM',
      texte: () => `
<p>You're asleep.</p>
<p>On <code>vif-app-01</code>, cron launches the cleanup under the <code>deploy</code> account, with an almost empty environment. The two lines that defined <code>UPLOAD_DIR</code> and <code>TMP_SUBDIR</code> were in Bastien's crontab. You only copied the schedule lines.</p>
${code(`
cd $UPLOAD_DIR/$TMP_SUBDIR    ->    cd /
rm -rf *
`)}
<p>The system refuses almost everything: <code>deploy</code> isn't an admin. But <code>deploy</code> owns <code>/srv/uploads</code> and the application code.</p>
<p>By 3:04 AM, it's over. Nine thousand “Permission denied” lines go to a local mailbox nobody reads.</p>`,
      choix: [{ t: 'Wake up', vers: 'matin' }],
    },

    matin: {
      jour: 'Wednesday, week 6',
      heure: '7:40 AM',
      entree: () => ({ prod: -3, energie: -1, horlogeFixe: 0 }),
      texte: (s) => `
<p>Yasmine calls you before your coffee. “The site doesn't have a single photo left. Nothing. Gray squares everywhere.”</p>
<p>You look. <code>vif-app-01</code> no longer responds: the load balancer pulled it overnight. The other two servers are carrying the site, but the catalog photos lived on the first one.</p>
<p>${outil(s, 'METRICS')
    ? 'Your payment alert didn\'t go off: customers are still paying, they just can\'t see what they\'re buying anymore.'
    : 'No alert, of course. There isn\'t one.'}</p>`,
      choix: [
        { t: 'First find out what happened last night', vers: 'mail_deploy' },
        { t: 'Redeploy vif-app-01 right away', vers: 'redeploy' },
      ],
    },

    redeploy: {
      jour: 'Wednesday, week 6',
      heure: '8:05 AM',
      entree: () => ({ horloge: 25 }),
      texte: () => `
<p>You rerun the pipeline on <code>vif-app-01</code>. Twenty-five minutes later, the server is back in the load balancer, with brand-new code.</p>
<p>And still gray squares. <code>/srv/uploads</code> is empty. Code can be redeployed; 61,000 files can't.</p>
<p>You still have no idea what wiped them, or what will stop it from happening again tomorrow night.</p>`,
      choix: [{ t: 'Find out what happened last night', vers: 'mail_deploy' }],
    },

    mail_deploy: {
      jour: 'Wednesday, week 6',
      heure: (s) => (s.horloge >= 25 ? '8:15 AM' : '7:50 AM'),
      entree: () => ({ horloge: 10 }),
      texte: () => `
${code(`
$ sudo tail -3 /var/mail/deploy
rm: cannot remove 'usr/bin/zip': Permission denied
rm: cannot remove 'var/lib/dpkg': Permission denied
rm: cannot remove 'etc': Permission denied
`)}
<p>Paths with no leading slash: the script was running from the root. You reopen Bastien's crontab, which you had saved before emptying it, and you finally see its first three lines.</p>
<p>You disable the cron. Then you take stock: the code can be redeployed, and nobody will miss the 12 GB of temporary files. The 61,000 photos and receipts, though, now only exist in a backup.</p>
${capot('Your test by hand worked because a login shell loads <code>/etc/profile.d</code>, where these variables were also defined. Cron loads nothing. An empty variable raises no error: <code>cd $A/$B</code> becomes <code>cd /</code>, and the next line does the rest.')}`,
      choix: [
        { t: 'Ask Inès to show a placeholder image in the meantime', vers: 'efface', fx: { prod: 1, confiance: 1, f: { IMAGE: true } } },
        { t: 'Dive straight into the restore', vers: 'efface' },
      ],
    },

    efface: {
      jour: 'Wednesday, week 6',
      heure: '8:40 AM',
      fin: 'efface',
      entree: () => ({ codes: ['UPLOADS_LOST'], horlogeFin: true }),
      texte: (s) => `
${s.f.IMAGE
    ? '<p>In twenty minutes, Inès ships a fix: every missing photo is replaced with the Panier Vif logo and the product name. It isn\'t pretty, but people can shop again.</p>'
    : '<p>The site stays covered in gray squares. Customers order blind, or don\'t order at all.</p>'}
<p>Time to restore. Bastien had a backup script, run every night at 2:30 AM. It's been running since 2022.</p>
<p>Nobody has ever restored it.</p>`,
    },
  };

  racine.CHAPITRES.en.push({
    id: 'ch3',
    numero: 3,
    titre: 'Bastien\'s script',
    techno: 'Shell',
    jour: 'Tuesday, week 6',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['BLAME', 'QUICK_FIX'], confiance: 2 },
      { instruments: ['METRICS'], codes: ['RUNBOOK'] },
    ],
    fins: {
      durci: {
        titre: 'Seven lines that depend on nobody',
        texte: 'The script does the same thing no matter which account runs it. That\'s all anyone asked of it.',
      },
      reecrit: {
        titre: 'Two days for five lines',
        texte: 'The new program is clean and tested. It cost two days, during which the old one kept running.',
      },
      efface: {
        titre: 'From the root',
        texte: 'An empty variable, a cd that lands somewhere else, and 61,000 fewer files. The next chapter starts in an hour.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
