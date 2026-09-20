import { savedCommute, savedDraft, savedRoutes, type Step, scriptSteps } from '@/demo/saved';
import { draftRequest } from '@/draft/request';
import { evaluate } from '@/engine';
import { LANGUAGES, TONES, type Voice } from '@/notice/voice';
import { formatTime } from '@/time';

const commute = savedCommute;
const time = (iso: string | null) => (iso ? formatTime(iso) : iso);

// Any clock: the bundled samples carry their own morning, so the demo runs the same on any day.
const anyDay = new Date('2026-09-20T22:00:00+03:00');
const script = () => scriptSteps(commute, savedRoutes.samples, anyDay);
const step = (scenario: string) => script().find((s) => s.scenario === scenario)!;

/** Every voice the notice sheet offers: two tones in three languages. */
const voices: Voice[] = TONES.flatMap((t) => LANGUAGES.map((l) => ({ tone: t.value, language: l.value })));

const request = (s: Step, voice?: Voice) => draftRequest(commute, s.evaluation, s.simulation, voice);

describe('the bundled routes response', () => {
  it('runs the stage arc: on time, at risk with the accident, late mid-trip', () => {
    const arc = script().filter((s) => s.scenario !== 'switched');

    expect(arc.map(({ evaluation: e }) => [time(e.now), e.state, time(e.eta), e.simulationLabel])).toEqual([
      ['8:00', 'on_time', '8:49', 'Clock set to 8:00'],
      ['8:00', 'at_risk', '8:55', 'Nairobi Expressway +25 min · Clock set to 8:00'],
      ['8:40', 'late', '9:14', 'Nairobi Expressway +25 min · Clock set to 8:40'],
    ]);
  });

  it('offers a route that gets there on time while at risk, so the presenter can switch', () => {
    expect(step('at_risk').evaluation.betterRouteId).toBe('james-gichuru-road');
    expect(step('switched').evaluation.state).toBe('on_time');
  });
});

describe('the saved drafts', () => {
  it('cover every step of the script, in every tone and language', () => {
    const missing = script().flatMap((s) =>
      voices
        .map((voice) => request(s, voice))
        .filter((req) => !savedDraft(req))
        .map((req) => `${s.scenario}:${req.tone}:${req.language}`),
    );

    expect(missing).toEqual([]);
  });

  it('say the ETA the screen says, so a saved notice is never wrong', () => {
    const late = step('late');

    for (const voice of voices) {
      expect(savedDraft(request(late, voice))!.notice).toContain(time(late.evaluation.eta));
    }
  });

  it('are written for the step on screen, so switching routes changes the words', () => {
    const line = (s: Step) => savedDraft(request(s))!.decision_line;

    expect(line(step('switched'))).not.toBe(line(step('on_time')));
  });

  it('are only offered for the facts they were written for, so going off script gets Fika\'s own words', () => {
    const onTime = step('on_time');
    const offScript = evaluate({
      commute,
      samples: savedRoutes.samples,
      now: anyDay,
      selectedRouteId: 'waiyaki-way',
      simulation: onTime.simulation,
    });

    expect(savedDraft(draftRequest(commute, offScript, onTime.simulation))).toBeUndefined();
    expect(savedDraft(request(onTime))).toBeDefined();
  });
});
