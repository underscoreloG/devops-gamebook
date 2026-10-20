/* Chapter 11: 1 to destroy. Terraform, state, reading the plan, drift. */
(function (racine) {
  'use strict';

  const { code, capot, a } = racine.RECIT_EN;

  const apresRevue = (s) => (a(s, 'SECRET_IN_IMAGE') ? 'scan' : 'plan');

  const PLAN = `
$ terraform plan

  # aws_instance.db must be replaced
-/+ resource "aws_instance" "db" {
      ~ ami           = "ami-0a1b2c3d4e5f67890" -> "ami-0f9e8d7c6b5a43210" # forces replacement
      ~ id            = "i-04c1e2a9b7d3f5a61" -> (known after apply)
        instance_type = "m6i.xlarge"
        tags          = { "Name" = "vif-db-01" }
        # (31 unchanged attributes hidden)
    }

  # aws_eks_node_group.main will be updated in-place
  ~ resource "aws_eks_node_group" "main" {
      ~ scaling_config {
          ~ desired_size = 3 -> 5
        }
    }

Plan: 1 to add, 1 to change, 1 to destroy.
`;

  const noeuds = {

    debut: {
      heure: '10:00 AM',
      texte: () => `
<p>The national campaign is two weeks out. Hugo signed the deal: an ad on a major TV channel, on a Saturday night.</p>
<p>“If we have to add servers in a hurry that night,” Malik asks, “how do we do it?”</p>
<p>Today, you do it the Bastien way: you click around the cloud console, from memory. So for the past month, you have been describing the whole infrastructure in Terraform code. The cluster, the database, the network: 47 resources imported one by one.</p>
<p>Terraform keeps track of what it manages in a file, the state. You still have to decide where that file lives.</p>`,
      choix: [
        { t: 'On your laptop for now: it\'s the simplest way to start', vers: 'revue', fx: { dette: 2, f: { STATE: 'local' } } },
        { t: 'In a remote bucket, with a lock (half a day)', vers: 'revue', fx: { f: { STATE: 'distant' } } },
        { t: 'In the Git repo, next to the code: it\'ll be versioned', vers: 'revue', fx: { dette: 1, f: { STATE: 'git' } } },
      ],
    },

    revue: {
      heure: '2:30 PM',
      texte: (s) => `
<p>${s.f.STATE === 'local'
    ? 'The state stays in your home directory. As long as you are the only person running Terraform, it bothers no one.'
    : s.f.STATE === 'distant'
      ? 'The state lives in an encrypted bucket. When someone runs Terraform, a lock stops anyone else from running it at the same time. Inès can use it from her laptop starting today.'
      : 'You add <code>terraform.tfstate</code> to the repo. Every infra change will leave a trace in the history.'}</p>
<p>Malik has another worry. “This thing can delete everything in one command, right? I want a change advisory board. Every Thursday at 2 PM, we review what's about to be applied. Nothing ships without the board.”</p>`,
      choix: [
        { t: 'Accept the Thursday board', vers: apresRevue, fx: { f: { REVUE: 'comite' } } },
        { t: 'Propose one pull request per change instead: the plan is posted there, one person reviews it', vers: apresRevue, fx: { confiance: 1, f: { REVUE: 'pr' } } },
        { t: 'Reply that you are the only one who understands Terraform: you\'ll apply things yourself', vers: apresRevue, fx: { dette: 1, f: { REVUE: 'solo' } } },
      ],
    },

    scan: {
      jour: 'Wednesday, week 24',
      heure: '11:00 AM',
      texte: () => `
<p>The new pipeline scans every image before deploying it. On its very first run, it raises a red alert:</p>
${code(`
api:2.41.0 (layer 6)
  SECRET  PAYLOIRE_SECRET_KEY=sk_live_4f8a...   severity: CRITICAL
`)}
<p>The payment API key, the one that got baked into the image the day of the first Dockerfile. It is in every version published for four months, and in the cache of every machine that ever pulled one.</p>
<p>Replacing it takes an hour with Karim: generate a new key at PayLoire, hand it to the pods at startup, revoke the old one.</p>`,
      choix: [
        { t: 'Rotate the key now', vers: 'plan', fx: { retire: ['SECRET_IN_IMAGE'], energie: -1, confiance: 1 } },
        { t: 'Mark the alert as “known”: we\'ll see after the campaign', vers: 'plan', fx: { dette: 1 } },
      ],
    },

    plan: {
      jour: 'Friday, week 24',
      heure: '5:50 PM',
      texte: (s) => `
<p>Malik wants two more nodes in the cluster before the campaign. You change one number in the code: <code>desired_size = 5</code>. One line.</p>
<p>${s.f.REVUE === 'comite'
    ? 'Yesterday\'s board approved “adding two nodes” in thirty seconds, between eleven other changes projected on the wall. Nobody read the plan outputs: there were four hundred lines of them.'
    : s.f.REVUE === 'pr'
      ? 'You can open a pull request: the pipeline will post the plan there, and Inès will review it Monday morning. Or apply it yourself tonight, so it\'s done.'
      : 'Nobody will review it: you are the one applying.'}</p>
<p>It is 5:50 PM on a Friday. You run the plan.</p>
${code(PLAN)}
<p>Two more nodes. That's what you expected.</p>`,
      choix: [
        { t: 'Apply: it\'s just two nodes', vers: 'detruit' },
        {
          t: 'Read the plan line by line before applying',
          vers: 'lire_plan',
          verrou: (s) => (s.energie >= 2 ? null : 'You need at least 2 ENERGY. Your eyes slide over the lines without reading them.'),
        },
        { t: 'Open the pull request and let Inès review it Monday', vers: 'pr_lundi', si: (s) => s.f.REVUE === 'pr' },
      ],
    },

    detruit: {
      jour: 'Friday, week 24',
      heure: '6:04 PM',
      entree: (s) => (a(s, 'RESTORE_TEST')
        ? { prod: -4, energie: -2, confiance: -1, horlogeFixe: 0, f: { DETRUIT: true } }
        : { prod: -6, energie: -2, confiance: -2, horlogeFixe: 0, f: { DETRUIT: true } }),
      texte: (s) => `
${code(`
$ terraform apply -auto-approve
aws_instance.db: Destroying... [id=i-04c1e2a9b7d3f5a61]
aws_instance.db: Destruction complete after 41s
aws_instance.db: Creating...
aws_eks_node_group.main: Modifying...
`)}
<p>You read <code>Destroying</code>, and your stomach gets it before you do.</p>
<p><code>vif-db-01</code>. The database. Terraform just deleted the server and its disk, then created a fresh, empty one to replace it. The plan said so: <code>1 to destroy</code>.</p>
<p>The cause fits in one line of your code: the system image was defined as “the most recent.” A new image was published on Tuesday. For Terraform, changing the image means replacing the machine.</p>
<p>Not a single page loads anymore. There is still last night's 2:30 AM backup. ${a(s, 'RESTORE_TEST')
    ? 'You have been restoring it every Sunday for months: fifty minutes, no surprises. The database is back at 7 PM. It is missing every order from the day, on a Friday. Yasmine and Karim will spend the weekend rebuilding them from the payments.'
    : 'Nobody has restored it since the €0.99 pricing day. It takes you four hours, two failed attempts, and Inès called back from home. The database is back at 10:10 PM. It is missing every order from the day, on a Friday, and the evening peak went by on an error page.'}</p>
${capot('Terraform always tells you what it is about to do. Read the last line of the plan in full: any number other than zero in front of <code>to destroy</code> has to be explained before you apply. <code>-/+</code> and <code>forces replacement</code> mean the same thing: this resource will be destroyed.')}`,
      choix: [
        { t: 'Rebuild the database cleanly through Terraform, image pinned and destruction forbidden', vers: 'bilan', fx: { horlogeFin: true } },
        { t: 'Leave the database as you rebuilt it by hand in the console: you\'ll reconcile Terraform later', vers: 'bilan', fx: { dette: 3, horlogeFin: true, f: { MAIN: true } } },
      ],
    },

    lire_plan: {
      jour: 'Friday, week 24',
      heure: '6:20 PM',
      entree: () => ({ confiance: 1 }),
      texte: () => `
<p>You scroll back to the top of the output. Before the two nodes, there is another block. <code>aws_instance.db must be replaced</code>. And the last line: <code>1 to destroy</code>.</p>
<p>You take your hands off the keyboard.</p>
<p><code>aws_instance.db</code> is <code>vif-db-01</code>. In your code, that server's system image is “the most recent available.” A new image was published on Tuesday. For Terraform, changing the image means destroying the machine and creating another one. Disk included.</p>
<p>You fix it:</p>
${code(`
resource "aws_instance" "db" {
  ami = "ami-0a1b2c3d4e5f67890"   # pinned: no more most_recent

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami]
  }
}
`)}
${code(`
Plan: 0 to add, 1 to change, 0 to destroy.
`)}
<p>Two more nodes, and nothing else. You apply at 6:20 PM.</p>
${capot('<code>prevent_destroy</code> makes any plan that would delete the resource fail: the database can no longer disappear by accident. And a “most recent” image is the same trap as <code>latest</code> in a Dockerfile: a value that changes without anyone deciding it should.')}`,
      choix: [{ t: 'Skip to the following Monday', vers: 'derive' }],
    },

    pr_lundi: {
      jour: 'Monday, week 25',
      heure: '9:15 AM',
      entree: () => ({ confiance: 1 }),
      texte: () => `
<p>You open the pull request and leave for the weekend. The pipeline pastes the plan output into it.</p>
<p>Monday, 9:15 AM. A comment from Inès, on the last line:</p>
<p>“<code>1 to destroy</code>? To add two nodes? What's <code>aws_instance.db</code>?”</p>
<p>It's <code>vif-db-01</code>. The database. Your code picked “the most recent system image,” a new one came out on Tuesday, and Terraform wanted to replace the server, disk included. You didn't see it on Friday at 5:50 PM. She saw it on Monday at 9 AM, reading a twenty-line plan.</p>
<p>You pin the image and add <code>prevent_destroy</code>. The plan goes back to what it should have been: zero destruction.</p>
${capot('A review only works if what you review is short. A twenty-line plan, read by a rested person who didn\'t write the change: that is the cheapest safeguard there is.')}`,
      choix: [{ t: 'Continue', vers: 'derive' }],
    },

    derive: {
      jour: 'Monday, week 25',
      heure: '11:00 AM',
      texte: () => `
<p>You run another plan, to check that everything is quiet. It isn't, quite:</p>
${code(`
  # aws_security_group.db will be updated in-place
  ~ resource "aws_security_group" "db" {
      - ingress {
          - cidr_blocks = ["0.0.0.0/0"]
          - from_port   = 5432
          - to_port     = 5432
        }
    }
`)}
<p>A firewall rule that isn't in your code: the PostgreSQL port, open to the entire world. Someone added it by hand in the console, for a test, and never removed it. Terraform offers to delete it.</p>
<p>The Panier Vif database is reachable from anywhere on the Internet, since a date nobody knows.</p>`,
      choix: [
        { t: 'Delete the rule, and run a plan every night that alerts on the slightest drift', vers: 'bilan', fx: { confiance: 1, f: { VEILLE: true } } },
        { t: 'Delete the rule and move on', vers: 'bilan' },
      ],
    },

    bilan: {
      jour: (s) => (s.f.DETRUIT ? 'Monday, week 25' : 'Wednesday, week 25'),
      heure: '4:00 PM',
      fin: (s) => (s.f.DETRUIT ? 'detruit' : (s.f.STATE !== 'distant' || s.f.REVUE === 'solo') ? 'derive' : 'code'),
      entree: (s) => (!s.f.DETRUIT && s.f.STATE === 'local' ? { energie: -1 } : !s.f.DETRUIT && s.f.STATE === 'git' ? { energie: -1, confiance: -1 } : {}),
      texte: (s) => `
${s.f.DETRUIT
    ? (s.f.MAIN
      ? '<p>The database is running, on a server you rebuilt by hand on Friday night. Terraform, meanwhile, still thinks it manages another machine. On the next <code>apply</code>, it will try to bring the world back in line with its state.</p>'
      : '<p>The database is running, on a server rebuilt from code, with a pinned image and <code>prevent_destroy</code>. It cost an extra half hour on Friday night, while everyone waited.</p>')
    : ''}
${!s.f.DETRUIT && s.f.STATE === 'local'
    ? '<p>Inès wanted to add a firewall rule from her laptop. Without your state, her Terraform knew nothing about what already existed: <code>Plan: 47 to add</code>. It offered to build a duplicate of the whole infrastructure. She read the last line and stopped. You spend your day moving the state into a bucket, which you could have done on day one.</p>'
    : ''}
${!s.f.DETRUIT && s.f.STATE === 'git'
    ? '<p>The pipeline scanner found the database password, in plain text, in the Git repo: it was in the state. That file keeps everything Terraform knows, secrets included. You change the password, take the state out of the repo, and find out that you can\'t really remove a file from Git history.</p>'
    : ''}
${!s.f.DETRUIT && s.f.VEILLE
    ? '<p>Every night at 4 AM, the pipeline runs <code>terraform plan -detailed-exitcode</code>. If it finds a gap between the code and reality, it messages you. The next rule added “for a test” will live less than twenty-four hours.</p>'
    : ''}
<p>${s.f.DETRUIT
    ? 'The national campaign is twelve days out. Hugo asks whether “that kind of thing” could happen again that night.'
    : 'Panier Vif\'s infrastructure now fits in a repo. The national campaign is ten days out.'}</p>`,
    },
  };

  racine.CHAPITRES.en.push({
    id: 'ch11',
    numero: 11,
    titre: '1 to destroy',
    techno: 'Terraform',
    jour: 'Monday, week 24',
    debut: 'debut',
    noeuds: noeuds,
    essais: [
      { codes: ['SECRET_IN_IMAGE', 'RESTORE_TEST'] },
      { energie: 0, confiance: 2 },
    ],
    transition: { prod: 3, energie: 2 },
    fins: {
      code: {
        titre: 'Zero to destroy',
        texte: 'The infra is described in code, reviewed before every change, and the database can no longer vanish over a misread line.',
      },
      derive: {
        titre: 'Code, and still one person',
        texte: 'The infra is in code, but everything still rests on your laptop or on your review alone. You moved Bastien\'s problem, you didn\'t remove it.',
      },
      detruit: {
        titre: 'The bottom line',
        texte: 'The plan announced a destruction. It announced it at 5:50 PM on a Friday, in the middle of twenty expected lines.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
