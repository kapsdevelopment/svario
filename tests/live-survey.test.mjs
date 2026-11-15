import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SVARIO_LIVE_TEST_URL ?? 'http://127.0.0.1:54321';
const key = process.env.SVARIO_LIVE_TEST_KEY;
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname),
  'The live test creates fixtures and must run against a local Supabase instance.');
assert.ok(key, 'Set SVARIO_LIVE_TEST_KEY to the local Supabase publishable or anon key.');

function client() {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function read(request) {
  const { data, error } = await request;
  assert.ok(!error, error?.message);
  return data;
}

async function signUp() {
  const user = client();
  const { session } = await read(user.auth.signUp({
    email: `live-test-${randomUUID()}@example.com`,
    password: randomUUID(),
  }));
  assert.ok(session, 'The local instance must allow sign-ups without email confirmation.');
  await read(user.rpc('ensure_account_initialized_v2'));
  return user;
}

async function createSurvey(owner, draftOptions = {}) {
  const survey = await read(owner.rpc('create_survey_draft', {
    p_title: 'Liveøkt – automatisert test',
    p_slug: `live-test-${randomUUID()}`,
    p_response_mode: 'anonymous',
    ...draftOptions,
  }));
  const [choice, scale] = await read(owner.from('questions').insert([
    { survey_id: survey.id, type: 'multiple_choice', prompt: 'Vil du bli med?', sort_order: 0 },
    {
      survey_id: survey.id, type: 'likert_scale', prompt: 'Hvordan gikk det?', sort_order: 1,
      scale_min: 1, scale_max: 5, scale_variant: 'buttons',
    },
  ]).select('id, sort_order').order('sort_order'));
  choice.options = await read(owner.from('question_options').insert([
    { question_id: choice.id, label: 'Ja', sort_order: 0 },
    { question_id: choice.id, label: 'Nei', sort_order: 1 },
  ]).select('id, sort_order').order('sort_order'));
  return { ...survey, questions: [choice, scale] };
}

test('a live-only draft starts directly in the lobby and stays closed to ordinary responses', async (t) => {
  const owner = await signUp();
  const outsider = await signUp();
  const anonymous = client();
  const survey = await createSurvey(owner, { p_live_only: true });
  t.after(() => read(owner.rpc('delete_survey', { p_survey_id: survey.id })));

  assert.equal(survey.status, 'draft');
  assert.equal(survey.live_only, true);
  assert.equal(survey.starts_at, null);
  assert.equal(survey.ends_at, null);

  const start = (actor) => actor.rpc('start_live_survey', { p_survey_id: survey.id });
  assert.ok((await start(outsider)).error);
  assert.ok((await start(anonymous)).error);

  const invalidDuration = await owner.from('surveys').update({ ends_at: new Date().toISOString() }).eq('id', survey.id);
  assert.equal(invalidDuration.error?.code, '23514');

  const sessionId = await read(start(owner));
  assert.equal(await read(start(owner)), sessionId);
  const ownerState = await read(owner.from('surveys').select('live_only,status').eq('id', survey.id).single());
  assert.deepEqual(ownerState, { live_only: true, status: 'published' });
  const ordinaryForm = () => read(anonymous.from('surveys').select('id').eq('id', survey.id));
  assert.deepEqual(await ordinaryForm(), []);
  assert.deepEqual(await read(anonymous.from('questions').select('id').eq('survey_id', survey.id)), []);
  const ordinaryAnswer = await anonymous.rpc('submit_survey_response', {
    p_survey_slug: survey.slug,
    p_answers: [
      { questionId: survey.questions[0].id, optionIds: [survey.questions[0].options[0].id] },
      { questionId: survey.questions[1].id, likertValue: 3 },
    ],
  });
  assert.match(ordinaryAnswer.error?.message ?? '', /not available|not found|ikke åpent/i);

  const voterKey = randomUUID();
  const participant = () => read(anonymous.rpc('get_live_survey_status', {
    p_session_id: sessionId, p_voter_key: voterKey,
  }));
  assert.equal((await participant()).status, 'lobby');
  await read(owner.rpc('advance_live_survey', { p_session_id: sessionId, p_step: -1, p_finish: false }));
  assert.equal((await participant()).status, 'question');
  await read(owner.rpc('advance_live_survey', { p_session_id: sessionId, p_step: 0, p_finish: true }));
  assert.equal((await participant()).status, 'closed');
  assert.deepEqual(await ordinaryForm(), []);

  const copyId = await read(owner.rpc('repeat_survey_once', { p_survey_id: survey.id }));
  t.after(() => read(owner.rpc('delete_survey', { p_survey_id: copyId })));
  assert.deepEqual(
    await read(owner.from('surveys').select('live_only,status').eq('id', copyId).single()),
    { live_only: true, status: 'draft' },
  );
});

function submitOrdinaryResponse(anonymous, survey) {
  const [choice, scale] = survey.questions;
  return anonymous.rpc('submit_survey_response', {
    p_survey_slug: survey.slug,
    p_answers: [
      { questionId: choice.id, optionIds: [choice.options[0].id] },
      { questionId: scale.id, likertValue: 5 },
    ],
  });
}

function publicationActions(actor, id) {
  return actor.rpc('list_survey_publication_actions', { p_survey_ids: [id] });
}

function stopPublication(actor, id, action) {
  return actor.rpc('stop_survey_publication', { p_survey_id: id, p_action: action });
}

test('only managers can withdraw unanswered surveys or close answered surveys', async (t) => {
  const owner = await signUp();
  const outsider = await signUp();
  const anonymous = client();
  const survey = await createSurvey(owner);
  t.after(() => read(owner.rpc('delete_survey', { p_survey_id: survey.id })));
  const publish = () => read(owner.rpc('publish_survey', { p_survey_id: survey.id }));
  const respondentLink = () => read(anonymous.from('surveys').select('slug').eq('slug', survey.slug));
  const available = () => read(publicationActions(owner, survey.id));

  await publish();
  assert.deepEqual(await respondentLink(), [{ slug: survey.slug }]);
  assert.deepEqual(await available(), [{ survey_id: survey.id, action: 'unpublish' }]);
  assert.deepEqual(await read(publicationActions(outsider, survey.id)), []);
  assert.ok((await publicationActions(anonymous, survey.id)).error);
  assert.ok((await stopPublication(outsider, survey.id, 'unpublish')).error);
  assert.ok((await stopPublication(anonymous, survey.id, 'unpublish')).error);
  assert.ok((await stopPublication(owner, survey.id, 'close')).error);
  assert.ok((await owner.from('surveys').update({ status: 'closed' }).eq('id', survey.id)).error);

  const draft = await read(stopPublication(owner, survey.id, 'unpublish'));
  assert.equal(draft.status, 'draft');
  assert.equal(draft.published_at, null);
  assert.equal(draft.slug, survey.slug);
  assert.deepEqual(await available(), []);
  assert.deepEqual(await respondentLink(), []);
  assert.ok((await submitOrdinaryResponse(anonymous, survey)).error);
  await read(owner.from('surveys').update({ title: 'Redigert utkast' }).eq('id', survey.id));

  const publishedAgain = await publish();
  assert.equal(publishedAgain.slug, survey.slug);
  assert.equal(publishedAgain.title, 'Redigert utkast');
  assert.deepEqual(await respondentLink(), [{ slug: survey.slug }]);

  const responseId = await read(submitOrdinaryResponse(anonymous, survey));
  assert.deepEqual(await available(), [{ survey_id: survey.id, action: 'close' }]);
  assert.match((await stopPublication(owner, survey.id, 'unpublish')).error?.message ?? '', /har fått svar/);
  assert.ok((await stopPublication(outsider, survey.id, 'close')).error);
  const closed = await read(stopPublication(owner, survey.id, 'close'));
  assert.equal(closed.status, 'closed');
  assert.ok(closed.closed_at);
  assert.equal(closed.published_at, publishedAgain.published_at);
  assert.equal(closed.slug, survey.slug);
  assert.deepEqual(await respondentLink(), []);
  assert.ok((await submitOrdinaryResponse(anonymous, survey)).error);
  assert.deepEqual(await read(owner.from('survey_responses').select('id').eq('survey_id', survey.id)),
    [{ id: responseId }]);
  assert.equal((await read(owner.from('answers').select('id').eq('response_id', responseId))).length, 2);
});

test('a first response racing with withdrawal can never be saved for a draft', async (t) => {
  const owner = await signUp();
  const anonymous = client();
  for (let i = 0; i < 5; i++) {
    const survey = await createSurvey(owner);
    t.after(() => read(owner.rpc('delete_survey', { p_survey_id: survey.id })));
    await read(owner.rpc('publish_survey', { p_survey_id: survey.id }));
    const [withdraw, submit] = await Promise.all([
      stopPublication(owner, survey.id, 'unpublish'),
      submitOrdinaryResponse(anonymous, survey),
    ]);
    const [state, responses] = await Promise.all([
      read(owner.from('surveys').select('status').eq('id', survey.id).single()),
      read(owner.from('survey_responses').select('id').eq('survey_id', survey.id)),
    ]);
    if (!withdraw.error) {
      assert.equal(state.status, 'draft');
      assert.match(submit.error?.message ?? '', /not available for responses/);
      assert.equal(responses.length, 0);
    } else {
      assert.equal(state.status, 'published');
      assert.equal(responses.length, 1);
      assert.equal(responses[0].id, submit.data);
      assert.match(withdraw.error.message, /har fått svar/);
    }
  }
});

test('active live rooms must be finished first and their votes count as answers', async (t) => {
  const owner = await signUp();
  const anonymous = client();
  const survey = await createSurvey(owner, { p_live_only: true });
  t.after(() => read(owner.rpc('delete_survey', { p_survey_id: survey.id })));
  const sessionId = await read(owner.rpc('start_live_survey', { p_survey_id: survey.id }));
  const advance = (step, finish) => read(owner.rpc('advance_live_survey', {
    p_session_id: sessionId, p_step: step, p_finish: finish,
  }));
  const voterKey = randomUUID();

  assert.deepEqual(await read(publicationActions(owner, survey.id)), []);
  assert.match((await stopPublication(owner, survey.id, 'unpublish')).error?.message ?? '', /Avslutt den aktive liveøkten/);
  await advance(-1, false);
  const state = await read(anonymous.rpc('get_live_survey_status', {
    p_session_id: sessionId, p_voter_key: voterKey,
  }));
  await read(anonymous.rpc('submit_live_survey_vote', {
    p_session_id: sessionId, p_step: 0, p_question_id: state.question.id,
    p_option_id: state.question.options[0].id, p_voter_key: voterKey,
  }));
  await advance(0, true);
  assert.deepEqual(await read(publicationActions(owner, survey.id)), [{ survey_id: survey.id, action: 'close' }]);
  const sessionSummary = () => read(owner.rpc('get_live_survey_host', { p_session_id: sessionId }));
  const summaryBeforeClose = await sessionSummary();
  assert.equal((await read(stopPublication(owner, survey.id, 'close'))).status, 'closed');
  assert.deepEqual(await sessionSummary(), summaryBeforeClose);
});

function timed(task) {
  const start = performance.now();
  return Promise.resolve(task).then((value) => ({ value, ms: performance.now() - start }));
}

function percentile95(times) {
  const sorted = [...times].sort((a, b) => a - b);
  return Math.round(sorted[Math.ceil(sorted.length * 0.95) - 1]);
}

test('50 anonymous browsers vote in a live survey with single-choice and Likert questions', { timeout: 60_000 }, async (t) => {
  const owner = await signUp();
  const outsider = await signUp();
  const survey = await createSurvey(owner);
  t.after(async () => {
    await read(owner.rpc('delete_survey', { p_survey_id: survey.id }));
  });

  const start = (actor = owner) => actor.rpc('start_live_survey', { p_survey_id: survey.id });
  const list = (actor = owner) => actor.rpc('list_live_survey_sessions', { p_survey_id: survey.id });

  assert.match((await start()).error?.message ?? '', /publisert/);
  await read(owner.rpc('publish_survey', { p_survey_id: survey.id }));
  assert.ok((await start(outsider)).error);
  assert.ok((await list(outsider)).error);

  // The production app uses the same anonymous client role and polls every 2 seconds.
  const voters = Array.from({ length: 50 }, () => ({ actor: client(), key: randomUUID() }));
  const [voter] = voters;
  assert.ok((await start(voter.actor)).error);
  const [id, duplicateStart] = await Promise.all([read(start()), read(start())]);
  assert.equal(id, duplicateStart);

  function host(actor = owner) {
    return actor.rpc('get_live_survey_host', { p_session_id: id });
  }
  function advance(step, finish = false, actor = owner) {
    return actor.rpc('advance_live_survey', { p_session_id: id, p_step: step, p_finish: finish });
  }
  function state({ actor, key: voterKey }) {
    return read(actor.rpc('get_live_survey_status', { p_session_id: id, p_voter_key: voterKey }));
  }
  function vote({ actor, key: voterKey }, step, question, option) {
    return actor.rpc('submit_live_survey_vote', {
      p_session_id: id, p_step: step, p_question_id: question.id,
      p_option_id: option.id, p_voter_key: voterKey,
    });
  }
  const [first, second] = survey.questions;
  const [optionA, optionB] = first.options;

  assert.equal(await read(host(outsider)), null);
  assert.ok((await host(voter.actor)).error);
  assert.ok((await advance(-1, false, outsider)).error);
  assert.ok((await advance(-1, false, voter.actor)).error);
  assert.ok((await vote(voter, 0, first, optionA)).error);

  const lobby = await Promise.all(voters.map(state));
  assert.ok(lobby.every((data) => data.status === 'lobby' && data.question === null));

  const opened = await read(advance(-1));
  assert.equal(opened.results[0].question.id, first.id);
  assert.deepEqual(opened.results[0].counts, {});
  assert.ok((await advance(-1)).error, 'A stale host tab cannot skip a question.');

  const pollTimes = [];
  for (let round = 0; round < 3; round += 1) {
    const polls = await Promise.all(voters.map((participant) => timed(state(participant))));
    for (const { value, ms } of polls) {
      assert.equal(value.question.id, first.id);
      assert.equal(value.selectedOptionId, null);
      assert.ok(!Object.hasOwn(value, 'results'));
      pollTimes.push(ms);
    }
    if (round < 2) await delay(2_000);
  }

  assert.ok((await vote(voter, 0, first, { id: randomUUID() })).error);
  const votes = await Promise.all(voters.map((participant, index) =>
    timed(read(vote(participant, 0, first, index < 30 ? optionA : optionB))),
  ));
  assert.equal(votes.filter(({ value }) => value === optionA.id).length, 30);
  assert.equal(votes.filter(({ value }) => value === optionB.id).length, 20);

  const retried = await Promise.all(Array.from({ length: 10 }, () => read(vote(voter, 0, first, optionB))));
  assert.ok(retried.every((optionId) => optionId === optionA.id));
  assert.equal((await state({ ...voter, actor: client() })).selectedOptionId, optionA.id);
  assert.deepEqual((await read(host())).results[0].counts, { [optionA.id]: 30, [optionB.id]: 20 });

  const next = await read(advance(0));
  const scale = next.results[0].question;
  assert.equal(scale.id, second.id);
  assert.equal(scale.scaleVariant, 'buttons');
  assert.deepEqual(scale.options.map(({ value, label }) => [value, label]), [
    [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5'],
  ]);
  const lowest = scale.options[0];
  const highest = scale.options[4];
  assert.ok((await vote({ actor: client(), key: randomUUID() }, 0, first, optionA)).error);
  assert.equal(await read(vote(voter, 0, first, optionA)), optionA.id);
  const followUps = await Promise.all(voters.map(state));
  for (const data of followUps) {
    assert.deepEqual(data.question, scale);
    assert.equal(data.selectedOptionId, null);
  }

  assert.ok((await vote(voter, 1, scale, optionA)).error);
  assert.equal(await read(vote(voter, 1, scale, highest)), highest.id);
  assert.equal(await read(vote(voter, 1, scale, lowest)), highest.id);
  assert.deepEqual((await read(host())).results[0].counts, { [highest.id]: 1 });
  assert.equal((await state({ ...voter, actor: client() })).selectedOptionId, highest.id);

  const [finish, ...racingVotes] = await Promise.all([
    read(advance(1, true)),
    ...voters.slice(1).map((participant) => vote(participant, 1, scale, lowest)),
  ]);
  const accepted = racingVotes.filter(({ error }) => !error).length;
  assert.ok(racingVotes.every(({ error }) => !error || /stengt/.test(error.message)));
  assert.equal(finish.status, 'closed');
  assert.equal(finish.results[1].counts[lowest.id] ?? 0, accepted);
  assert.equal(finish.results[1].counts[highest.id], 1);
  assert.ok((await vote({ actor: client(), key: randomUUID() }, 1, scale, lowest)).error);
  assert.equal((await state(voter)).status, 'closed');
  assert.equal((await read(list()))[0].status, 'closed');

  // Another run gets its own QR URL and doesn't inherit the previous results.
  const newId = await read(start());
  assert.notEqual(newId, id);
  assert.deepEqual((await read(owner.rpc('get_live_survey_host', { p_session_id: newId }))).results, []);

  const ordinary = await read(owner.from('survey_responses').select('id').eq('survey_id', survey.id));
  assert.equal(ordinary.length, 0);
  t.diagnostic(`50 simultaneous voters. Local p95 status read: ${percentile95(pollTimes)} ms. Local p95 vote: ${percentile95(votes.map(({ ms }) => ms))} ms.`);
});
