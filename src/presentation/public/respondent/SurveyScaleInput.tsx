import type { QuestionScaleVariant } from '../../../domain/surveys/survey';

type SurveyScaleInputProps = {
  disabled: boolean;
  name: string;
  onChange: (value: number) => void;
  prompt: string;
  required?: boolean;
  selectedValue: number | null;
  values: number[];
  variant: QuestionScaleVariant | null;
};

const scaleClasses = {
  buttons: 'likert',
  stars: 'star-rating',
  nps: 'nps-scale',
};

export function SurveyScaleInput({
  disabled,
  name,
  onChange,
  prompt,
  required,
  selectedValue,
  values,
  variant,
}: SurveyScaleInputProps) {
  const className = scaleClasses[variant ?? 'buttons'];

  return (
    <fieldset className={className}>
      <legend className="sr-only">{prompt}</legend>
      <div className={`${className}__options`}>
        {values.map((value) => {
          const isSelected = variant === 'stars'
            ? selectedValue !== null && value <= selectedValue
            : variant === 'nps' && value === selectedValue;
          return (
            <label className={isSelected ? 'is-selected' : undefined} key={value}>
              <input
                type="radio"
                name={name}
                value={value}
                checked={selectedValue === value}
                disabled={disabled}
                required={required}
                onChange={() => onChange(value)}
              />
              {variant === 'stars' ? (
                <>
                  <span aria-hidden="true">★</span>
                  <span className="sr-only">{value} av 5 stjerner</span>
                </>
              ) : <span>{value}</span>}
            </label>
          );
        })}
      </div>
      {variant === 'nps' ? (
        <div className="nps-scale__legend" aria-hidden="true">
          <span>Lite sannsynlig</span>
          <span>Svært sannsynlig</span>
        </div>
      ) : null}
    </fieldset>
  );
}
