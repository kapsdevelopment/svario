const durationPresets = [
  { label: '24 timer', days: 1 },
  { label: '1 uke', days: 7 },
  { label: '2 uker', days: 14 },
  { label: '3 uker', days: 21 },
  { label: '1 mnd', months: 1 },
] as const;

export type SurveyDurationPreset = (typeof durationPresets)[number];

export function SurveyDurationPresets({
  disabled,
  liveOnly,
  onDurationPreset,
  onLiveOnlyChange,
}: {
  disabled: boolean;
  liveOnly: boolean;
  onDurationPreset: (preset: SurveyDurationPreset) => void;
  onLiveOnlyChange: (liveOnly: boolean) => void;
}) {
  return (
    <div className="duration-presets" role="group" aria-label="Hurtigvalg for varighet">
      <span>Varighet</span>
      <div>
        {durationPresets.map((preset) => (
          <button
            className="duration-preset-button"
            type="button"
            disabled={disabled}
            key={preset.label}
            onClick={() => onDurationPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
        <button
          aria-pressed={liveOnly}
          className="duration-preset-button"
          disabled={disabled}
          onClick={() => onLiveOnlyChange(!liveOnly)}
          type="button"
        >
          Liveøkt
        </button>
      </div>
    </div>
  );
}
