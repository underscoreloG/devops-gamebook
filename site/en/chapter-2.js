/* Chapter 2: disk full. Linux, postmortem, first disk alert. */
(function (racine) {
  'use strict';

  const { code, capot, hm, a, outil } = racine.RECIT_EN;

  /* The incident started at 9:43 AM. With an alert, you see it 2 minutes later; without one, support tells you at 9:52 AM. */
  const heure = (repli) => (s) => (s.horloge != null ? hm(9, 43 + s.horloge) : repli);
  const finDeJournee = (s) => (s.f.FERME ? 'jeudi' : 'fin_lundi');
  const apresVeille = (s) => (s.f.CASSE ? 'casse' : 'postmortem');

  const noeuds = {

    debut: {
      heure: heure('9:52 AM'),
      entree: (s) => ({ prod: -1, horlogeFixe: outil(s, 'METRICS') ? 2 : 9 }),
      texte: (s) => `
<p>${a(s, 'POSTMORTEM')
    ? 'Friday\'s postmortem is scheduled for 2 PM. You\'re putting together the timeline, minute by minute.'
    : 'The weekend went well. You\'re starting to believe in quiet Mondays.'}</p>
${outil(s, 'METRICS')
    ? '<p>Your phone rings: “More than 5% of payments are failing.” The alert you set up Friday night just fired for the first time, two minutes after the start.</p>'
    : '<p>Yasmine, from support, shows up at your desk. “I have customers saying one page out of three crashes. Not all of them. One out of three. For the last ten minutes.”</p>'}
<p>One out of three. Panier Vif has three app servers behind its load balancer. You look at the logs of the oldest one, <code>vif-app-01</code>:</p>
${code(`
OSError: [Errno 28] No space left on device
OSError: [Errno 28] No space left on device
OSError: [Errno 28] No space left on device
`)}
<p>The load balancer, meanwhile, sees three healthy servers: <code>/health</code> responds, since it has nothing to write.</p>`,
      choix: [
        { t: 'Log in to vif-app-01 and look at the disk', vers: 'df' },
        { t: 'Pull vif-app-01 out of the load balancer, then investigate', vers: 'sortir' },
        { t: 'Reboot vif-app-01: that will surely free something up', vers: 'reboot' },
      ],
    },

    sortir: {
      heure: '9:54 AM',
      entree: () => ({ confiance: 1, horlogeFin: true, f: { SORTI: true } }),
      texte: () => `
<p>You uncheck <code>vif-app-01</code> in the load balancer console. It stops receiving traffic. Two servers are plenty on a Monday morning.</p>
<p>The errors stop. Yasmine gives you a thumbs-up from across the open space.</p>
<p>The server is still sick, but no customer knows it anymore. You have all the time you need.</p>
${capot('A half-broken server does more damage than a dead one: the load balancer keeps sending it a third of your customers. Pulling it out fixes nothing, but it turns an emergency into a work item.')}`,
      choix: [{ t: 'Log in to vif-app-01 and look at the disk', vers: 'df' }],
    },

    reboot: {
      heure: heure('9:58 AM'),
      entree: () => ({ horloge: 5 }),
      texte: () => `
<p>You start the reboot. Four minutes later, the server is back, and the app refuses to start: it can't even write its PID file.</p>
<p>This time, <code>/health</code> stops responding. The load balancer pulls <code>vif-app-01</code> on its own.</p>
<p>The errors stop. You fixed nothing: you broke the server badly enough for the load balancer to notice.</p>
${capot('A reboot clears memory and <code>/tmp</code>, not <code>/var/log</code>. You got lucky: the useful outcome, taking the server out of traffic, was one click away and didn\'t require shutting anything down.')}`,
      choix: [{ t: 'Log in to vif-app-01 and look at the disk', vers: 'df', fx: { horlogeFin: true, f: { SORTI: true } } }],
    },

    df: {
      heure: heure('10:00 AM'),
      entree: () => ({ horloge: 3 }),
      texte: () => `
${code(`
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   50G     0 100% /

$ sudo du -xh --max-depth=2 /var | sort -h | tail -4
1.1G    /var/lib
2.3G    /var/log/nginx
44G     /var/log/paniervif
47G     /var/log

$ ls -lh /var/log/paniervif/
-rw-r--r-- 1 deploy deploy 44G Sep 22 09:55 app.log
`)}
<p>A single 44 GB file. You read the end of it: thousands of lines per minute, all tagged <code>DEBUG</code>, with the details of every SQL query.</p>`,
      choix: [
        { t: 'Delete the file: rm app.log', vers: 'rm' },
        { t: 'Empty the file without deleting it: truncate -s 0 app.log', vers: 'tronquer' },
        { t: 'Grow the disk to 100 GB from the cloud console', vers: 'agrandir' },
      ],
    },

    rm: {
      heure: heure('10:05 AM'),
      entree: () => ({ horloge: 5 }),
      texte: () => `
${code(`
$ sudo rm /var/log/paniervif/app.log
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   50G     0 100% /
`)}
<p>The file is gone. The disk is still full.</p>
<p>You run <code>df</code> three more times. Then you search, and you end up finding the command that shows deleted files that are still open:</p>
${code(`
$ sudo lsof +L1
COMMAND   PID   USER  FD   TYPE DEVICE    SIZE/OFF NLINK    NODE NAME
gunicorn 2714 deploy  5w    REG    8,1 47244640256     0 1048611 /var/log/paniervif/app.log (deleted)
`)}
${capot('<code>rm</code> removes a name, not data. As long as a process keeps the file open, the kernel keeps its blocks. You now have 44 GB taken up by a file nobody can see with <code>ls</code> anymore.')}`,
      choix: [
        { t: 'Restart the app so it lets go of the file', vers: 'relancer' },
        { t: 'Empty the file through /proc: : > /proc/2714/fd/5', vers: 'proc' },
        { t: 'Free up space another way: rm -rf /var/log/*', vers: 'rm_tout' },
      ],
    },

    rm_tout: {
      heure: heure('10:08 AM'),
      entree: () => ({ horloge: 2, f: { CASSE: true } }),
      texte: () => `
${code(`
$ sudo rm -rf /var/log/*
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   47G  2.6G  95% /
`)}
<p>2.6 GB free. The app starts writing again. The errors stop.</p>
<p>You also just deleted the nginx logs, the system logs, and the directories that held them. Nothing complains. For now.</p>
<p>And the 44 GB ghost file is still there. You restart the app so it finally lets go of it.</p>`,
      choix: [{ t: 'Find out what filled this disk', vers: 'cause' }],
    },

    relancer: {
      heure: heure('10:08 AM'),
      entree: () => ({ horloge: 2 }),
      texte: () => `
${code(`
$ sudo systemctl restart paniervif
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G  5.8G   42G  13% /
`)}
<p>The app restarts, lets go of the ghost file, and the kernel finally gives back the 44 GB. The requests in flight on this server were cut off, but nothing crashes after that.</p>`,
      choix: [{ t: 'Find out what filled this disk', vers: 'cause' }],
    },

    proc: {
      heure: heure('10:07 AM'),
      entree: () => ({ horloge: 1, confiance: 1 }),
      texte: () => `
${code(`
$ sudo sh -c ': > /proc/2714/fd/5'
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G  5.8G   42G  13% /
`)}
<p>The file has no name anymore, but the process holding it open still has a file descriptor for it in <code>/proc</code>. You empty it through that. 44 GB back, without restarting anything.</p>
<p>Inès, who was watching over your shoulder, jots the command down somewhere.</p>`,
      choix: [{ t: 'Find out what filled this disk', vers: 'cause' }],
    },

    tronquer: {
      heure: heure('10:01 AM'),
      entree: () => ({ horloge: 1 }),
      texte: () => `
${code(`
$ sudo truncate -s 0 /var/log/paniervif/app.log
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G  5.8G   42G  13% /
`)}
<p>The file still exists, it weighs zero bytes, and the app keeps writing to it without noticing anything. The errors stop.</p>
${capot('Emptying a file gives the space back right away, even if it\'s open. Deleting it gives nothing back as long as a process holds it. This works here because the app writes in append mode: after the truncation, it starts again from the beginning.')}`,
      choix: [{ t: 'Find out what filled this disk', vers: 'cause' }],
    },

    agrandir: {
      heure: heure('10:12 AM'),
      entree: () => ({ horloge: 10, dette: 2, codes: ['QUICK_FIX'] }),
      texte: () => `
<p>In the cloud console, you grow the volume from 50 to 100 GB. Then, on the server:</p>
${code(`
$ sudo growpart /dev/sda 1
$ sudo resize2fs /dev/sda1
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        99G   50G   45G  53% /
`)}
<p>Ten minutes, without restarting anything. The errors stop. The 44 GB file is still there, and it's growing.</p>
<p>Malik pokes his head in. “All fixed?”</p>`,
      choix: [
        { t: 'Answer “not yet” and find out what filled the disk', vers: 'cause' },
        { t: 'Answer “fixed” and close the ticket: the disk has headroom', vers: 'veille', fx: { horlogeFin: true, f: { FERME: true } } },
      ],
    },

    cause: {
      heure: '10:40 AM',
      entree: (s) => (s.horloge != null && s.horloge >= 20
        ? { prod: -1, horlogeFin: true, f: { LONG: true } }
        : { horlogeFin: true }),
      texte: (s) => `
${s.f.LONG ? '<p>The incident lasted more than twenty minutes, in the middle of the busiest ordering hour of the week. Yasmine already has a stack of complaints.</p>' : ''}
<p>44 GB don't write themselves. You trace it back:</p>
${code(`
$ grep LOG_LEVEL /etc/paniervif/app.env
LOG_LEVEL=DEBUG

$ ls -l /etc/paniervif/app.env
-rw-r----- 1 ines deploy 412 Sep 19 17:03 /etc/paniervif/app.env

$ ls /etc/logrotate.d/ | grep -c paniervif
0
`)}
<p>On Friday at 5:03 PM, Inès switched the logs to <code>DEBUG</code> to follow the promo code. Nobody set them back to <code>INFO</code>. And nothing on this server rotates or compresses that file: it has been growing since the install.</p>
${s.f.CASSE ? '<p>You think back to your <code>rm -rf /var/log/*</code>. You tell yourself you\'ll check on nginx later.</p>' : ''}`,
      choix: [
        { t: 'Set INFO back and write a log rotation', vers: 'rotation' },
        { t: 'Set INFO back and move on: the cause is fixed', vers: 'info_seul' },
      ],
    },

    rotation: {
      heure: '11:10 AM',
      entree: () => ({ retire: ['QUICK_FIX'], dette: -1 }),
      texte: () => `
<p>You set <code>LOG_LEVEL=INFO</code> back, then write <code>/etc/logrotate.d/paniervif</code>:</p>
${code(`
/var/log/paniervif/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
`)}
<p>You test it as a dry run with <code>sudo logrotate --debug /etc/logrotate.d/paniervif</code>, then for real with <code>--force</code>. An <code>app.log.1</code> file appears. You copy the config to the other two servers.</p>
${capot('<code>copytruncate</code> copies the file then empties it, without asking the app anything. You can lose a few lines during the copy. The other, cleaner way is to rename the file and send the app a signal so it reopens it.')}`,
      choix: [{ t: 'Move on', vers: 'veille' }],
    },

    info_seul: {
      heure: '10:50 AM',
      entree: (s) => (a(s, 'QUICK_FIX') ? { dette: 1 } : { dette: 1, codes: ['QUICK_FIX'] }),
      texte: () => `
<p>You set <code>LOG_LEVEL=INFO</code> back and restart the app. The file now grows a hundred times slower.</p>
<p>A hundred times slower is not zero. Without rotation, it will take a few months instead of three days. You might not be watching on that day.</p>`,
      choix: [{ t: 'Move on', vers: 'veille' }],
    },

    veille: {
      heure: '11:30 AM',
      texte: (s) => `
<p>One question remains. This disk took three days to fill up, and nobody saw it coming.</p>
<p>${outil(s, 'METRICS')
    ? 'Your checkout alert fired, but only once the damage was done. And yet Bastien\'s Prometheus knows how full every disk is, minute by minute.'
    : 'The Prometheus Bastien set up two years ago knows how full every disk is, minute by minute. It has never warned anyone.'}</p>`,
      choix: [
        { t: 'Set up an alert on the disks (20 minutes)', vers: 'alerte_disque' },
        { t: 'Move on: you\'ve already lost your morning', vers: apresVeille },
      ],
    },

    alerte_disque: {
      heure: '11:50 AM',
      entree: () => ({ instruments: ['METRICS'] }),
      texte: (s) => `
<p>You write two rules${s.depart.instruments.includes('METRICS') ? ', next to the checkout one' : ''}:</p>
${code(`
- alert: DiskAlmostFull
  expr: node_filesystem_avail_bytes{mountpoint="/"}
      / node_filesystem_size_bytes{mountpoint="/"} < 0.15
  for: 10m

- alert: DiskFullWithinADay
  expr: predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 24 * 3600) < 0
  for: 30m
`)}
<p>You replay the second one against Friday night's data. It would have fired on Saturday at 2 AM, two days before the outage.</p>
${capot('A fixed threshold warns you when it\'s almost too late. <code>predict_linear</code> extends the trend of the last six hours and answers the only useful question: at this rate, when does it break?')}`,
      choix: [{ t: 'Move on', vers: apresVeille }],
    },

    casse: {
      heure: '1:10 PM',
      entree: () => ({ prod: -2, confiance: -1 }),
      texte: () => `
<p>Inès deploys an unrelated fix. The pipeline reloads nginx on each server, one after the other. On <code>vif-app-01</code>:</p>
${code(`
nginx: [emerg] open() "/var/log/nginx/error.log" failed (2: No such file or directory)
`)}
<p>nginx refuses to restart: the directory it writes its logs to no longer exists. The pipeline, meanwhile, carries on with the other two servers. For six minutes, the time it takes you to understand and recreate the directory, one customer out of three hits an error.</p>
<p>“Is that the same server as this morning?” Malik asks.</p>
${capot('<code>rm -rf /var/log/*</code> breaks nothing right away: processes keep their files open. The outage comes at the next restart, hours later, when nobody connects the dots anymore.')}`,
      choix: [{ t: 'Go to the postmortem', vers: 'postmortem' }],
    },

    postmortem: {
      heure: '2:00 PM',
      entree: (s) => ({ retire: ['POSTMORTEM', 'LOST_ORDERS'], confiance: a(s, 'LOST_ORDERS') ? -1 : 0 }),
      texte: (s) => `
<p>Meeting room. Malik, Inès, Yasmine, and Hugo, the founder, who never comes to this kind of meeting.</p>
${s.depart.codes.includes('POSTMORTEM')
    ? '<p>You start with Friday: the migration, the lock, the minutes.' + (s.depart.codes.includes('LOST_ORDERS') ? ' Hugo only remembers one number. “Forty-one lost orders.”' : ' Hugo nods: it was short.') + '</p>'
    : '<p>There was nothing to say about Friday. The meeting is about this morning.</p>'}
<p>Then you walk through the disk. Malik cuts you off.</p>
<p>“Wait. Who switched the logs to DEBUG on Friday?”</p>
<p>Silence. You know the answer: the file has Inès's name on it. She stares at the table.</p>`,
      choix: [
        { t: 'Answer: it was Inès, Friday at 5:03 PM', vers: 'coupable' },
        { t: 'Answer that the real question is elsewhere: why a single setting can fill a disk without anyone knowing', vers: 'cause_sys' },
        { t: 'Answer that it\'s your fault: you should have seen it', vers: 'ma_faute' },
      ],
    },

    coupable: {
      heure: '2:20 PM',
      entree: () => ({ codes: ['BLAME'] }),
      texte: () => `
<p>“It was Inès. Friday, 5:03 PM.”</p>
<p>That's accurate. Malik turns to her. “When were you planning to set it back?”</p>
<p>Inès explains, apologizes, promises to be careful. The meeting ends with a single action item: “Inès will be careful.”</p>
<p>On the way out, she doesn't look at you.</p>
${capot('A name is not a cause. “Inès will be careful” changes nothing about the system: the next person in a hurry will do the same thing. And the person who just got singled out learned a very specific lesson: the less she says, the less she risks.')}`,
      choix: [{ t: 'Finish the day', vers: finDeJournee }],
    },

    cause_sys: {
      heure: '2:20 PM',
      entree: () => ({ confiance: 1 }),
      texte: (s) => `
<p>“Any one of us would have done it on Friday night. The question is why a single setting can fill a disk in three days without any of us knowing.”</p>
<p>Malik frowns, then picks up a marker. Three lines on the whiteboard: the log level goes back to INFO on its own after 24 hours, every log gets rotated, every disk gets an alert.</p>
<p>Inès looks up. “The automatic switch back to INFO, I can do it this week.”</p>
${a(s, 'RUNBOOK') ? '<p>“And I\'ll write the runbook for a full disk,” she adds. “Like the one you left me on Friday.”</p>' : ''}
${capot('A blameless postmortem isn\'t about being nice. It\'s the only format where people say what really happened, and where the action items target the system instead of someone\'s memory.')}`,
      choix: [{ t: 'Finish the day', vers: finDeJournee }],
    },

    ma_faute: {
      heure: '2:20 PM',
      entree: () => ({ confiance: -1, dette: 1 }),
      texte: () => `
<p>“It's on me. I should have seen it.”</p>
<p>Inès gives you a surprised look, then a grateful one. Malik sighs. “Fine. You'll be careful.”</p>
<p>The meeting is over in ten minutes. Nobody wrote an action item on the whiteboard. Hugo walks out wondering, out loud, whether this position was a good idea.</p>
${capot('Taking the blame protects a colleague and kills the discussion. The result is the same as with a designated culprit: a promise to be vigilant, and an unchanged system.')}`,
      choix: [{ t: 'Finish the day', vers: finDeJournee }],
    },

    fin_lundi: {
      heure: '6:00 PM',
      fin: (s) => (s.f.CASSE ? 'casse' : a(s, 'QUICK_FIX') ? 'bouchetrou' : 'propre'),
      texte: (s) => `
<p>You close the ticket. ${a(s, 'QUICK_FIX')
    ? 'The server is running. The file, though, keeps growing, more slowly.'
    : 'Three servers, three rotations, a sensible log level.'}</p>
<p>${outil(s, 'METRICS')
    ? 'And the next time a disk fills up, you\'ll know before support does.'
    : 'The next time a disk fills up, it will be Yasmine telling you again.'}</p>`,
    },

    jeudi: {
      jour: 'Thursday, week 4',
      heure: '10:40 PM',
      fin: 'bouchetrou',
      entree: () => ({ prod: -2, energie: -1 }),
      texte: (s) => `
<p>${outil(s, 'METRICS')
    ? 'Your phone rings on the couch: “DiskFullWithinADay.” You check the time and tell yourself it can wait until tomorrow morning. At 10:40 PM, it rings again, for checkout this time.'
    : 'Your phone rings on the couch. Malik. “The site is crashing one time out of three. Again.”'}</p>
<p>The 100 GB disk is full. The logs were still on <code>DEBUG</code>: you never looked for what was filling them. Doubling the disk bought you three and a half days.</p>
<p>From your living room, you empty the file and set <code>INFO</code> back. It's 11:30 PM.</p>
${capot('Growing a disk is a real answer when you know why it\'s full. Without the cause, it\'s a countdown reset to zero.')}`,
    },
  };

  racine.CHAPITRES.en.push({
    id: 'ch2',
    numero: 2,
    titre: 'Disk full',
    techno: 'Linux',
    jour: 'Monday, week 4',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['POSTMORTEM', 'LOST_ORDERS'], confiance: 2, energie: 3 },
      { codes: ['RUNBOOK'], instruments: ['METRICS'] },
    ],
    fins: {
      propre: {
        titre: 'A rotation and three lines on the whiteboard',
        texte: 'The disk is empty, the cause is dealt with, and the file can no longer grow forever.',
      },
      bouchetrou: {
        titre: 'The countdown',
        texte: 'The service is running, but nothing stops this disk from filling up again. You bought time, you didn\'t solve the problem.',
      },
      casse: {
        titre: 'Two outages for the price of one',
        texte: 'The full disk was fixed in the morning. The deleted directory broke the same server in the afternoon.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
