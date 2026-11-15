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

async function createSurvey(owner) {
  const survey = await read(owner.rpc('create_survey_draft', {
    p_title: 'Liveøkt – automatisert test',
    p_slug: `live-test-${randomUUID()}`,
    p_response_mode: 'anonymous',
  }));
  const questions = await read(owner.from('questions').insert([
    { survey_id: survey.id, type: 'multiple_choice', prompt: 'Kaffe eller te?', sort_order: 1 },
    { survey_id: survey.id, type: 'multiple_choice', prompt: 'Fjell eller fjord?', sort_order: 0 },
  ]).select('id, prompt, sort_order').order('sort_order'));
  const options = await read(owner.from('question_options').insert(questions.flatMap(({ id }) => [
    { question_id: id, label: 'Alternativ A', sort_order: 0 },
    { question_id: id, label: 'Alternativ B', sort_order: 1 },
  ])).select('id, question_id, sort_order').order('sort_order'));
  for (const question of questions) {
    question.options = options.filter((option) => option.question_id === question.id);
  }
  return { ...survey, questions };
}

function timed(task) {
  const start = performance.now();
  return Promise.resolve(task).then((value) => ({ value, ms: performance.now() - start }));
}

function percentile95(times) {
  const sorted = [...times].sort((a, b) => a - b);
  return Math.round(sorted[Math.ceil(sorted.length * 0.95) - 1]);
}

test('50 anonymous browsers follow the host and submit to the correct live question', { timeout: 60_000 }, async (t) => {
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

  assert.ok((await vote(voter, 0, first, second.options[0])).error);
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
  assert.equal(next.results[0].question.id, second.id);
  assert.ok((await vote({ actor: client(), key: randomUUID() }, 0, first, optionA)).error);
  assert.equal(await read(vote(voter, 0, first, optionA)), optionA.id);
  const followUps = await Promise.all(voters.map(state));
  assert.ok(followUps.every((data) => data.question.id === second.id && data.selectedOptionId === null));

  const [finish, ...racingVotes] = await Promise.all([
    read(advance(1, true)),
    ...voters.map((participant) => vote(participant, 1, second, second.options[0])),
  ]);
  const accepted = racingVotes.filter(({ error }) => !error).length;
  assert.ok(racingVotes.every(({ error }) => !error || /stengt/.test(error.message)));
  assert.equal(finish.status, 'closed');
  assert.equal(finish.results[1].counts[second.options[0].id] ?? 0, accepted);
  assert.ok((await vote({ actor: client(), key: randomUUID() }, 1, second, second.options[0])).error);
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
