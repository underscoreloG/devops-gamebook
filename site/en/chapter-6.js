/* Chapter 6: the pipeline. CI/CD, a flaky test, a rollback nobody ever tested. */
(function (racine) {
  'use strict';

  const { code, capot, hm, a } = racine.RECIT_EN;

  /* The clock counts minutes since 5:20 PM: each minute costs about 10 euros in free deliveries */
  const heure = (s) => hm(17, 20 + (s.horloge || 0));
  const euros = (s) => (s.f.COUT || 0) * 10;
  const suite = (s) => (s.f.SKIP ? 'samedi' : 'bilan');

  const ECHEC = `
FAILED tests/test_slots.py::test_slot_is_bookable - AssertionError
=========== 1 failed, 412 passed in 7m41s ===========
`;

  const noeuds = {

    debut: {
      heure: heure,
      entree: () => ({ horlogeFixe: 0 }),
      texte: () => `
<p>Since the 9 AM release, delivery has been free for everyone. A comparison between cents and euros: the free delivery threshold, meant to be €60, kicks in at 60 cents.</p>
<p>Karim, in accounting, ran the numbers: €4.90 per order, two orders a minute. About ten euros gone every minute.</p>
<p>Inès wrote the fix in fifteen minutes. It's ready. The pipeline is red:</p>
${code(ECHEC)}
<p>“It's the flaky test,” Inès says. “It fails every now and then, everyone knows. Usually we just rerun it.”</p>
<p>It's 5:20 PM. At 6:30 PM you have to pick up your niece at daycare, twenty-five minutes from here. You promised your sister.</p>`,
      choix: [
        { t: 'Rerun the pipeline', vers: 'relance1' },
        { t: 'Read why this test fails', vers: 'lire_test' },
        { t: 'Disable the test and ship the fix', vers: 'livraison', fx: { horloge: 16, dette: 2, f: { SKIP: true, COUT: 16 } } },
      ],
    },

    relance1: {
      heure: heure,
      entree: () => ({ horloge: 8 }),
      texte: () => `
<p>Eight minutes. You watch the stages go by, one by one.</p>
${code(ECHEC)}
<p>Same test, same line. Eighty euros of free deliveries while you waited.</p>`,
      choix: [
        { t: 'Rerun again: third time\'s the charm', vers: 'relance2' },
        { t: 'Read why this test fails', vers: 'lire_test' },
        { t: 'Disable the test and ship the fix', vers: 'livraison', fx: { horloge: 16, dette: 2, f: { SKIP: true } } },
      ],
    },

    relance2: {
      heure: heure,
      entree: () => ({ horloge: 8 }),
      texte: () => `
<p>Eight more minutes.</p>
${code(ECHEC)}
<p>Three identical failures in a row. A test that fails at random doesn't do that. Malik has walked over and is watching the screen over your shoulder, saying nothing.</p>
${capot('Rerunning is a reasonable answer to a random failure, once. After the second identical failure, it isn\'t random anymore, and every extra rerun costs eight minutes and teaches you nothing.')}`,
      choix: [
        { t: 'Read why this test fails', vers: 'lire_test' },
        { t: 'Disable the test and ship the fix', vers: 'livraison', fx: { horloge: 16, dette: 2, f: { SKIP: true } } },
      ],
    },

    lire_test: {
      heure: heure,
      entree: () => ({ horloge: 4 }),
      texte: () => `
<p>You open the test. It's three lines long:</p>
${code(`
def test_slot_is_bookable():
    slot = Slot(start=datetime.now().replace(hour=17, minute=0))
    assert slot.is_bookable()
`)}
<p>A delivery slot is only bookable if it starts in the future. The test builds a slot for “today at 5 PM.”</p>
<p>It passes all morning. It fails every day after 5 PM. This test isn't flaky: it's wrong on a schedule, and nobody noticed because nobody shipped in the evening.</p>
<p>Rerunning won't help before tomorrow morning.</p>`,
      choix: [
        { t: 'Fix the test now by freezing the time', vers: 'corriger' },
        { t: 'Disable the test, with a ticket in your name for tomorrow 10 AM', vers: 'livraison', fx: { horloge: 17, f: { SKIP_DATE: true } } },
        { t: 'Just disable the test', vers: 'livraison', fx: { horloge: 16, dette: 2, f: { SKIP: true } } },
      ],
    },

    corriger: {
      heure: heure,
      entree: () => ({ horloge: 10, confiance: 1, f: { CORRIGE: true } }),
      texte: () => `
<p>Ten minutes. The test no longer depends on when it runs:</p>
${code(`
@freeze_time("2025-01-15 12:00:00")
def test_slot_is_bookable():
    slot = Slot(start=datetime(2025, 1, 15, 17, 0))
    assert slot.is_bookable()
`)}
<p>You add its opposite, an 11 AM slot that must no longer be bookable, and push everything along with Inès's fix.</p>
${capot('A test that reads the clock also tests the moment it runs. Freezing the time makes it identical at 9 AM, at 5 PM and three years from now. Most so-called flaky tests have a cause just as precise as this one, and you only find it by reading them.')}`,
      choix: [{ t: 'Run the pipeline and ship', vers: 'livraison', fx: { horloge: 14 } }],
    },

    livraison: {
      heure: heure,
      entree: (s) => ({ confiance: s.horloge > 40 ? -1 : 0, f: { COUT: s.horloge }, horlogeFin: true }),
      texte: (s) => `
<p>${s.f.SKIP
    ? 'You add one line above the test: <code>@pytest.mark.skip(reason="flaky")</code>. The pipeline goes green.'
    : s.f.SKIP_DATE
      ? 'You add <code>@pytest.mark.skip(reason="wrong after 5 PM, ticket 482")</code> and create ticket 482: in your name, due tomorrow 10 AM, with the root cause already written in it. The pipeline goes green.'
      : 'The pipeline goes green, all 414 tests included.'} Six minutes of deployment, server by server.</p>
<p>The fix is in prod. Delivery is paid again under €60. Karim tallies up the end of the day: about €${euros(s)} more lost since 5:20 PM.</p>
${s.f.COUT > 40 ? '<p>“Forty minutes to ship a fix that was ready,” Malik mutters. He doesn\'t wait for an answer.</p>' : ''}
<p>Malik claps his hands. “Okay. While everyone's here, let's do the retro on today. Right now, while it's fresh. One hour.”</p>
<p>You check the time. Daycare closes at 6:30 PM.</p>`,
      choix: [
        { t: 'Stay for the retro and call your sister to sort it out', vers: 'retro', fx: { energie: -1, f: { QUAND: 'soir' } } },
        { t: 'Say you have a commitment and suggest tomorrow at 9:30 AM', vers: 'retro', fx: { f: { QUAND: 'demain' } } },
        { t: 'Slip out quietly: they\'ll do the retro without you', vers: 'sans_toi' },
      ],
    },

    retro: {
      jour: (s) => (s.f.QUAND === 'demain' ? 'Friday, week 14' : null),
      heure: (s) => (s.f.QUAND === 'demain' ? '9:30 AM' : '6:15 PM'),
      texte: (s) => `
${s.f.QUAND === 'demain'
    ? '<p>“Tomorrow, 9:30. I have a commitment tonight, and we\'ll think better after some rest.” Malik shrugs. “Tomorrow, then.”</p><p>Your niece told you about her whole day on the drive home. This morning, everyone has slept and yesterday\'s anger has cooled.</p>'
    : '<p>You step out into the hallway. Your sister picks up, sighs, says she\'ll figure something out. She doesn\'t say “as usual,” but you hear it.</p><p>In the room, everyone is tired and a little bruised. Malik does most of the talking.</p>'}
<p>“This bug cost us a full day of delivery fees. I don't want that again. My proposal: starting Monday, every release gets manual approval from two people, and we only ship on Tuesdays and Thursdays.”</p>
<p>Inès stares at her hands. Today, the team ships five or six times a day.</p>`,
      choix: [
        { t: 'Accept: two manual approvals, two release days a week', vers: 'valide' },
        { t: 'Propose something else: actually test the rollback, and show the deployed version', vers: 'rollback_test' },
        { t: 'Defend the status quo: it was a bug, not a process problem', vers: 'rien' },
      ],
    },

    sans_toi: {
      heure: '6:05 PM',
      entree: () => ({ confiance: -1, dette: 2, codes: ['NO_ROLLBACK'], f: { VALIDE: true } }),
      texte: () => `
<p>You grab your bag while everyone looks for a room. You reach the daycare at 6:28 PM. Your niece shows you a drawing.</p>
<p>The next day, you find the notes in your inbox. In your absence, the retro decided: every release will get manual approval from two people, and the team will only ship on Tuesdays and Thursdays.</p>
<p>Malik added one line: “Too bad you couldn't stay.”</p>
${capot('Leaving on time was fair. Leaving without saying so let the decision get made without the one person whose job this is. One sentence would have done it: “not tonight, tomorrow morning.”')}`,
      choix: [{ t: 'Two weeks later', vers: suite }],
    },

    valide: {
      jour: 'Two weeks later',
      heure: '3:00 PM',
      entree: () => ({ confiance: 1, dette: 2, codes: ['NO_ROLLBACK'], f: { VALIDE: true } }),
      texte: () => `
<p>“Fine.” Malik is relieved: he has a rule.</p>
<p>Two weeks later, the Thursday release holds 43 commits from six people. Both approvers clicked “approve” after scrolling through the list. Nobody can review 43 commits.</p>
<p>A display bug shows up in the cart. It takes three hours to find which of the 43 commits introduced it.</p>
${capot('A manual approval reassures without checking anything the tests don\'t already check. And shipping less often means shipping bigger: every release gets riskier and harder to untangle. The opposite of what you wanted.')}`,
      choix: [{ t: 'Continue', vers: suite }],
    },

    rollback_test: {
      jour: (s) => (s.f.QUAND === 'demain' ? 'Friday, week 14' : 'Friday, week 14'),
      heure: '3:00 PM',
      entree: () => ({ confiance: 1, energie: -1 }),
      texte: () => `
<p>“Two signatures wouldn't have stopped yesterday's bug. What we were missing was a way to go back in two minutes. We've had a rollback button for two years. Who's ever clicked it?”</p>
<p>Silence. Malik gives you the day.</p>
<p>In staging, you deploy yesterday morning's version, then click rollback. The old image restarts, and crashes:</p>
${code(`
psycopg.errors.UndefinedColumn: column orders.delivery_fee does not exist
`)}
<p>Yesterday's version had renamed a column. The old code can't read the new schema. If you had clicked that button on Thursday, in prod, not a single order would have gone through.</p>
<p>You write the rule with Inès: a schema change takes three releases. Add the new column and write to both. Switch the reads. Drop the old one, later. At every step, the previous version still works.</p>
<p>You add a <code>/version</code> route and a vertical line on the dashboard for every deployment.</p>
${capot('A rollback you\'ve never tried is a hypothesis, like a backup you\'ve never restored. Code goes back in a minute; the database doesn\'t. Until migrations are compatible with the previous version, the button is a trap.')}`,
      choix: [{ t: 'Continue', vers: suite }],
    },

    rien: {
      jour: 'Two weeks later',
      heure: '3:00 PM',
      entree: () => ({ confiance: -1, codes: ['NO_ROLLBACK'] }),
      texte: () => `
<p>“It was a bug. It happens. We fixed it the same day. Adding signatures wouldn't have prevented it.”</p>
<p>You're right about the signatures. Malik knows it, and it annoys him. “So we change nothing?”</p>
<p>The retro ends with no action items. Everyone goes back to shipping five times a day, with a rollback button nobody has ever clicked.</p>
${capot('Rejecting a bad measure isn\'t enough when the worry behind it is real. Malik wanted an answer to “what do we do next time?” With no proposal on the table, his rule will come back at the next incident, and it will pass.')}`,
      choix: [{ t: 'Continue', vers: suite }],
    },

    bilan: {
      jour: 'Two weeks later',
      heure: '5:00 PM',
      fin: (s) => (a(s, 'NO_ROLLBACK') ? 'process' : 'livre'),
      texte: (s) => `
${s.f.SKIP_DATE
    ? '<p>The morning after the bug, at 10 AM, you reopened ticket 482. Ten minutes to freeze the time in the test, one deleted line to re-enable it. The ticket didn\'t live twenty-four hours.</p>'
    : s.f.CORRIGE
      ? '<p>The test everyone called flaky hasn\'t failed once since you read it.</p>'
      : ''}
<p>${a(s, 'NO_ROLLBACK')
    ? 'The team ships, one way or another. The day a release goes wrong, someone will have to roll back with a button nobody has ever tried.'
    : 'The team still ships five times a day. Every deployment leaves a line on the dashboard, and the rollback has been tried for real, twice, in staging.'}</p>`,
    },

    samedi: {
      jour: 'Saturday, week 16',
      heure: '8:10 AM',
      fin: 'saute',
      entree: () => ({ prod: -3, energie: -1 }),
      texte: () => `
<p>The disabled test is still disabled. Nobody had any reason to remember it: no ticket, no date, no name.</p>
<p>On Wednesday, Théo changed the time zone handling. The other 412 tests passed. The only one that checked that a past slot is no longer bookable was asleep under its <code>skip</code> line.</p>
<p>Saturday, 8:10 AM. Yasmine calls you: sixty customers booked a delivery last night for “this morning at 7 AM,” a slot that had already passed when they paid. The trucks are full. Sixty baskets have no room on them.</p>
${capot('The test was wrong, not useless. It guarded a real rule, badly. Disabling a test “just to ship” with no date and no owner is deleting it while keeping the illusion that it still exists.')}`,
    },
  };

  racine.CHAPITRES.en.push({
    id: 'ch6',
    numero: 6,
    titre: 'The pipeline',
    techno: 'CI/CD',
    jour: 'Thursday, week 14',
    debut: 'debut',
    noeuds: noeuds,
    essais: [{ energie: 2, confiance: 2 }],
    fins: {
      livre: {
        titre: 'A button someone actually clicked',
        texte: 'The fix shipped, the test finally tells the truth, and the rollback is no longer a legend.',
      },
      process: {
        titre: 'One more rule',
        texte: 'The bug is fixed. The thing that would have caught it in two minutes still doesn\'t exist.',
      },
      saute: {
        titre: 'The sleeping test',
        texte: 'The fix shipped fast. The guardrail removed to go fast never came back, and it was missing on the one day it would have mattered.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
