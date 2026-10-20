/* Chapter 5: works on my machine. Docker, images, secrets, logs. */
(function (racine) {
  'use strict';

  const { code, capot, hm, a, outil } = racine.RECIT_EN;

  const heure = (s) => hm(16, 4 + (s.horloge || 0));

  /* The Dockerfile shown depends on the reader's four decisions */
  function dockerfile(s) {
    const base = s.f.BASE === 'latest' ? 'python:latest'
      : s.f.BASE === 'tag' ? 'python:3.12-slim'
        : 'python:3.12-slim@sha256:2f1c0e...';
    const secret = s.f.SECRET === 'copy' ? 'COPY .env .\n'
      : s.f.SECRET === 'arg' ? 'ARG PAYLOIRE_SECRET_KEY\nENV PAYLOIRE_SECRET_KEY=$PAYLOIRE_SECRET_KEY\n'
        : '';
    return 'FROM ' + base + '\n'
      + 'WORKDIR /app\n'
      + 'COPY requirements.txt .\n'
      + 'RUN pip install --no-cache-dir -r requirements.txt\n'
      + 'COPY . .\n'
      + secret
      + (s.f.SECRET === 'copy' ? 'RUN python manage.py collectstatic --noinput && rm .env\n' : 'RUN python manage.py collectstatic --noinput\n')
      + (s.f.ROOT ? '' : 'RUN useradd --system app && chown -R app /app\nUSER app\n')
      + 'CMD ["gunicorn", "paniervif.wsgi", "--bind", "0.0.0.0:8000"'
      + (s.f.LOGS === 'fichier' ? ', "--error-logfile", "/app/logs/app.log"]' : ', "--error-logfile", "-"]');
  }

  const noeuds = {

    debut: {
      heure: '9:30 AM',
      entree: () => ({ energie: 1 }),
      texte: () => `
<p>Three weeks without an incident. You've slept, and it shows.</p>
<p>Malik wants the API in containers before the end of the month: in two months, Panier Vif will have a cluster, and he wants the ground ready. Théo got a head start. He shows you his Dockerfile with cautious pride.</p>
${code(`
FROM python:latest
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
`)}
<p>“It works on my machine. The image is 1.9 GB, but it works.”</p>
<p>Malik, over the partition: “Before we merge anything, we hold a workshop. This afternoon, two hours, the whole tech team. We decide on our container strategy.”</p>`,
      choix: [
        { t: 'Accept the two-hour workshop', vers: 'atelier' },
        { t: 'Write one page with the four decisions to make, and propose a thirty-minute review tomorrow', vers: 'page' },
        { t: 'Merge Théo\'s Dockerfile as is: it works, we\'ll improve it later', vers: 'merge_brut' },
      ],
    },

    atelier: {
      heure: '4:00 PM',
      entree: () => ({ energie: -1, f: { ATELIER: true } }),
      texte: () => `
<p>Six people, two hours, one whiteboard. Talk of orchestrators, private registries, an article Hugo read about serverless. Théo doesn't dare show his Dockerfile.</p>
<p>At 4 PM, the whiteboard holds three lines: “base image: dig into it,” “secrets: dig into it,” “logs: check with Bastien when he's back.”</p>
<p>Nobody decided anything. So you'll be the one deciding, tomorrow, in front of the file.</p>
${capot('A workshop without a starting document produces topics, not decisions. Two hours with six people is a day and a half of work. The same discussion, with a page of proposals read beforehand, fits in thirty minutes.')}`,
      choix: [{ t: 'Back to the Dockerfile, first decision', vers: 'd_base' }],
    },

    page: {
      heure: '11:00 AM',
      entree: () => ({ confiance: 1 }),
      texte: () => `
<p>“Give me until tomorrow. I'll write one page: four decisions, the options for each, what I recommend. You read it, we settle it in thirty minutes.”</p>
<p>Malik thinks it over. “And if we don't agree?”</p>
<p>“Then we'll know exactly what we disagree on.”</p>
<p>You open a document. Four headings: the base image, secrets, logs, the user. Théo sits down next to you.</p>`,
      choix: [{ t: 'First decision: the base image', vers: 'd_base' }],
    },

    merge_brut: {
      heure: '9:45 AM',
      entree: () => ({ dette: 3, codes: ['SECRET_IN_IMAGE'], f: { BASE: 'latest', SECRET: 'copy', LOGS: 'fichier', ROOT: true, BRUT: true } }),
      texte: () => `
<p>“It works, we merge. We'll improve it as we go.”</p>
<p>Théo grins from ear to ear. Malik cancels his workshop, relieved. At 9:45 AM, the pipeline builds the image and pushes it to the registry.</p>
<p>You didn't check what <code>COPY . /app</code> picks up. Théo's folder contains a <code>.env</code> file, with the payment API key. It's now inside an image the whole pipeline can pull.</p>
<p>The application runs as root, writes its logs inside the container, and relies on <code>python:latest</code>.</p>`,
      choix: [{ t: 'Three weeks later', vers: 'casse' }],
    },

    d_base: {
      heure: (s) => (s.f.ATELIER ? '9:30 AM' : '11:15 AM'),
      jour: (s) => (s.f.ATELIER ? 'Tuesday, week 9' : null),
      texte: () => `
<p>First line of the file: which image to build on. Théo used <code>python:latest</code>. “That way, we always have the latest version.”</p>
<p>Three options on the table:</p>
${code(`
FROM python:latest
FROM python:3.12-slim
FROM python:3.12-slim@sha256:2f1c0e...
`)}
<p>The third one pins the image down to the byte. It requires setting up a bot that proposes updates, or nobody will ever do them.</p>`,
      choix: [
        { t: 'Keep python:latest: always up to date', vers: 'd_secret', fx: { f: { BASE: 'latest' } } },
        { t: 'Switch to python:3.12-slim: a chosen version', vers: 'd_secret', fx: { f: { BASE: 'tag' } } },
        { t: 'Pin by digest and install the update bot (one hour)', vers: 'd_secret', fx: { f: { BASE: 'digest' } } },
      ],
    },

    d_secret: {
      heure: (s) => (s.f.ATELIER ? '10:00 AM' : '11:45 AM'),
      jour: (s) => (s.f.ATELIER ? 'Tuesday, week 9' : null),
      texte: (s) => `
${s.f.BASE === 'latest'
    ? '<p>You keep <code>latest</code>. The file is shorter, and Théo is happy.</p>'
    : s.f.BASE === 'tag'
      ? '<p><code>3.12-slim</code> it is. The image drops to 210 MB. The tag can still move from one patch to the next, but no longer from one version to the next.</p>'
      : '<p>You pin the digest and hook up the bot. Its first proposal lands ten minutes later, in a pull request someone will have to read.</p>'}
<p>Second decision. The application needs the payment API key, <code>PAYLOIRE_SECRET_KEY</code>. Right now, it lives in a <code>.env</code> file on every developer's machine.</p>
<p>Théo suggests copying the <code>.env</code> into the image and deleting it at the end of the build. Inès suggests a build argument, provided by the pipeline. You have a third idea.</p>`,
      choix: [
        { t: 'COPY .env, then RUN rm .env at the end: it won\'t be in the image anymore', vers: 'd_logs', fx: { codes: ['SECRET_IN_IMAGE'], f: { SECRET: 'copy' } } },
        { t: 'ARG and ENV: the pipeline provides the key at build time', vers: 'd_logs', fx: { codes: ['SECRET_IN_IMAGE'], f: { SECRET: 'arg' } } },
        { t: 'Nothing in the image: the key arrives when the container starts, with --env-file on the server', vers: 'd_logs', fx: { f: { SECRET: 'runtime' } } },
      ],
    },

    d_logs: {
      heure: (s) => (s.f.ATELIER ? '10:30 AM' : '2:00 PM'),
      jour: (s) => (s.f.ATELIER ? 'Tuesday, week 9' : null),
      texte: (s) => `
${s.f.SECRET === 'copy'
    ? '<p>The file is copied, then deleted three lines further down. In the running container, it\'s gone. You move on.</p>' + capot('An image is a stack of layers, and every instruction adds one. <code>RUN rm .env</code> creates a layer that hides the file; the <code>COPY</code> layer right below it still contains it. Anyone who has the image can extract it.')
    : s.f.SECRET === 'arg'
      ? '<p>The pipeline will pass the key with <code>--build-arg</code>. It\'s no longer in the repo, that\'s something. You move on.</p>' + capot('An <code>ARG</code> copied into an <code>ENV</code> gets written into the image configuration. <code>docker inspect</code> shows it in plain text to anyone who can pull it. A secret passed at build time stays in the image.')
      : '<p>The image no longer contains any secret. The key lives in a file on the server, readable by root only, and Docker hands it to the container when it starts. The same image can run in staging and in prod.</p>' + capot('An image gets copied, cached and shared: everything inside it eventually leaks. A secret is provided at runtime. And if the build itself needs one, BuildKit can mount it for the duration of a single instruction, with <code>RUN --mount=type=secret</code>, without writing it to a layer.')}
<p>Third decision: logs. Right now, the application writes to <code>/var/log/paniervif/app.log</code>. You remember that file.</p>`,
      choix: [
        { t: 'Keep a file, inside the container: /app/logs/app.log', vers: 'd_root', fx: { f: { LOGS: 'fichier' } } },
        { t: 'Write to standard output and let Docker keep them, with a maximum size', vers: 'd_root', fx: { f: { LOGS: 'stdout' } } },
        { t: 'Standard output, plus collection to a central place where the whole team can search (half a day)', vers: 'd_root', fx: { energie: -1, instruments: ['LOGS'], f: { LOGS: 'central' } } },
      ],
    },

    d_root: {
      heure: (s) => (s.f.ATELIER ? '11:00 AM' : s.f.LOGS === 'central' ? '6:00 PM' : '2:30 PM'),
      jour: (s) => (s.f.ATELIER ? 'Tuesday, week 9' : null),
      texte: (s) => `
${s.f.LOGS === 'fichier'
    ? '<p>The logs stay in a file, inside the container. Nothing changes for the application.</p>'
    : s.f.LOGS === 'stdout'
      ? '<p>The application writes to its standard output. Docker keeps the logs on the server, with <code>--log-opt max-size=50m --log-opt max-file=5</code>. <code>docker logs</code> shows them, even after a crash.</p>'
      : '<p>You install a collector on each server. By 6 PM, logs from all three machines land in the same place, searchable by everyone, kept for fourteen days. Inès types a customer\'s name and finds their order from yesterday in four seconds.</p>'}
<p>Last decision. Inside the container, the application runs as root. Switching to a dedicated user means fixing the permissions on two folders. Twenty minutes, maybe forty.</p>
<p>“We can do that later, right?” Théo says. “It already works.”</p>`,
      choix: [
        { t: 'Leave root for now', vers: 'resultat', fx: { dette: 1, f: { ROOT: true } } },
        { t: 'Create a dedicated user now', vers: 'resultat' },
      ],
    },

    resultat: {
      heure: (s) => (s.f.ATELIER ? '11:45 AM' : '3:15 PM'),
      jour: (s) => (s.f.ATELIER || s.f.LOGS === 'central' ? 'Tuesday, week 9' : null),
      texte: (s) => `
<p>Here's the Dockerfile going out for review:</p>
${code(dockerfile(s))}
<p>Dependencies are installed before the code is copied: as long as <code>requirements.txt</code> doesn't change, Docker reuses the layer and the build drops from nine minutes to forty seconds. A <code>.dockerignore</code> keeps out the <code>.git</code> folder and local files.</p>
<p>${a(s, 'SECRET_IN_IMAGE')
    ? 'The image is pushed to the registry. The payment key travels with it, in every copy.'
    : 'The image is pushed to the registry. It contains nothing you couldn\'t show a stranger.'}</p>
<p>The pipeline deploys it to the three servers, one after the other. Nobody notices a thing.</p>`,
      choix: [{ t: 'Three weeks later', vers: (s) => (s.f.BASE === 'latest' ? 'casse' : 'calme') }],
    },

    calme: {
      jour: 'Thursday, week 12',
      heure: '4:20 PM',
      fin: (s) => (a(s, 'SECRET_IN_IMAGE') || s.f.ROOT || s.f.LOGS === 'fichier' ? 'dette' : 'propre'),
      entree: (s) => (s.f.LOGS === 'fichier' ? { dette: 1 } : {}),
      texte: (s) => `
<p>A VAT bug on the invoices: a fix has to ship before 5 PM. The pipeline rebuilds the image and deploys it. At 4:20 PM, it's in prod.</p>
<p>${s.f.BASE === 'digest'
    ? 'The bot proposed a new base image on Monday. Inès reviewed it and merged it on Tuesday, after a pass through staging. Today, nothing moved without someone deciding it.'
    : 'Since your choice, the <code>3.12-slim</code> tag has received two minor updates, which the build swallowed without warning. Nothing broke. This time.'}</p>
${s.f.LOGS === 'fichier'
    ? '<p>Last Tuesday, a container restarted on its own in the middle of the night. Nobody knows why: its logs were inside the container, and they disappeared with it.</p>'
    : ''}`,
    },

    casse: {
      jour: 'Thursday, week 12',
      heure: heure,
      entree: () => ({ prod: -3, horlogeFixe: 4 }),
      texte: (s) => `
<p>A VAT bug on the invoices: a fix has to ship before 5 PM. The pipeline rebuilds the image, pushes it, and starts replacing the containers, server by server.</p>
<p>The first container starts and stops immediately. The pipeline doesn't wait to find out whether it's healthy: it moves on to the second server. Then the third.</p>
<p>At 4:04 PM, no server responds anymore. ${outil(s, 'METRICS') ? 'Your payment alert goes off within the minute.' : 'Yasmine comes running.'}</p>
<p>The VAT fix was two lines. You can't see how it could have done this.</p>`,
      choix: [
        { t: 'Read the logs of the container that keeps stopping', vers: 'diag' },
        { t: 'Rerun the pipeline: maybe it was a fluke', vers: 'relance' },
        { t: 'Put yesterday\'s image back on all three servers', vers: 'retour_image' },
      ],
    },

    relance: {
      jour: 'Thursday, week 12',
      heure: heure,
      entree: () => ({ horloge: 8 }),
      texte: () => `
<p>You rerun it. Eight minutes of build and deployment. The three containers start, then stop, exactly like the first time.</p>
<p>The same image, built twice, breaks twice the same way. It wasn't a fluke.</p>`,
      choix: [
        { t: 'Read the logs of the container that keeps stopping', vers: 'diag' },
        { t: 'Put yesterday\'s image back on all three servers', vers: 'retour_image' },
      ],
    },

    diag: {
      jour: 'Thursday, week 12',
      heure: heure,
      entree: (s) => ({ horloge: s.f.LOGS === 'central' ? 1 : s.f.LOGS === 'stdout' ? 3 : 20, f: { DIAG: true } }),
      texte: (s) => `
${s.f.LOGS === 'central'
    ? '<p>You don\'t even have time to open a terminal. Inès has already pasted the line in #incident, found in the centralized logs:</p>'
    : s.f.LOGS === 'stdout'
      ? '<p><code>docker logs</code> on the stopped container. The answer is on the last line:</p>'
      : '<p><code>docker logs</code> shows nothing: the application writes to a file, inside a container that stops and that the pipeline replaces. Each attempt wipes the traces of the previous one.</p><p>It takes you twenty minutes to start the image by hand, with a shell instead of the application, and reproduce the error before your eyes:</p>'}
${code(`
  File "/usr/local/lib/python3.13/site-packages/legacypdf/compat.py", line 3, in <module>
    import cgi
ModuleNotFoundError: No module named 'cgi'
`)}
<p>Python 3.13. Nobody decided to move to Python 3.13. <code>python:latest</code> did it on its own, and the library that generates the invoices uses a module this version removed.</p>
${capot('<code>latest</code> isn\'t a version, it\'s a label the publisher moves whenever it wants. The same Dockerfile, built three weeks apart, produced two different images. The two-line fix had nothing to do with it: it just triggered a new build.')}`,
      choix: [
        { t: 'Put yesterday\'s image back on all three servers', vers: 'retour_image' },
        { t: 'Change the Dockerfile to python:3.12-slim, rebuild and redeploy', vers: 'epingle' },
      ],
    },

    retour_image: {
      jour: 'Thursday, week 12',
      heure: heure,
      fin: 'latest',
      entree: (s) => {
        const total = s.horloge + 4;
        return { horloge: 4, prod: total >= 30 ? -1 : 0, confiance: s.f.DIAG ? 1 : 0, dette: s.f.DIAG ? 0 : 1 };
      },
      texte: (s) => `
<p>Yesterday's image is still in the registry, under its own number. You redeploy it as is on all three servers. Four minutes later, the site responds.</p>
<p>${s.horloge} minutes of total outage.</p>
${s.f.DIAG
    ? '<p>You know why it broke. You pin the base image right after, and the VAT fix goes back out at 5:10 PM, on Python 3.12.</p>'
    : '<p>You don\'t know yet why the new image breaks. The VAT fix will wait until tomorrow, while you figure it out. Malik doesn\'t like “tomorrow.”</p>'}
${capot('An image built yesterday works today exactly like yesterday. That\'s the whole point: rolling back requires neither understanding nor rebuilding, only keeping the old images and knowing which one was running.')}`,
    },

    epingle: {
      jour: 'Thursday, week 12',
      heure: heure,
      fin: 'latest',
      entree: (s) => ({ horloge: 15, prod: s.horloge + 15 >= 30 ? -1 : 0 }),
      texte: (s) => `
<p>You replace <code>latest</code> with <code>3.12-slim</code>, push, wait for the build, then the deployment. Fifteen more minutes, during which the site stays down.</p>
<p>${s.horloge} minutes of total outage. At least the VAT fix went out with it.</p>
${capot('The fix was right, in the wrong order. Yesterday\'s image was available and could be put back in four minutes. Restore service first, fix second, with nobody left waiting.')}`,
    },
  };

  racine.CHAPITRES.en.push({
    id: 'ch5',
    numero: 5,
    titre: 'Works on my machine',
    techno: 'Docker',
    jour: 'Monday, week 9',
    debut: 'debut',
    noeuds: noeuds,
    essais: [{ instruments: ['METRICS'], energie: 2 }],
    fins: {
      propre: {
        titre: 'An image you can show',
        texte: 'A chosen version, no secrets, logs that outlive the container, no root. The VAT fix went out without anyone holding their breath.',
      },
      dette: {
        titre: 'It works, for now',
        texte: 'Nothing broke. But the image carries at least one postponed decision, and it will keep it until someone remembers.',
      },
      latest: {
        titre: 'Always up to date',
        texte: 'Nobody had decided to change Python versions. The label did it for you, on the day you needed to ship fast.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
