type SurveyChoiceListProps = {
  name: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  selectedIds: string[];
  allowMultiple?: boolean;
  disabled: boolean;
  onChange: (selectedIds: string[]) => void;
};

export function SurveyChoiceList({
  name,
  options,
  selectedIds,
  allowMultiple = false,
  disabled,
  onChange,
}: SurveyChoiceListProps) {
  function updateSelection(id: string, checked: boolean) {
    if (!allowMultiple) {
      onChange(checked ? [id] : []);
      return;
    }

    if (checked) {
      onChange(selectedIds.includes(id) ? selectedIds : [...selectedIds, id]);
      return;
    }

    onChange(selectedIds.filter((selected) => selected !== id));
  }

  return (
    <div className="choice-list">
      {options.map((option) => (
        <label key={option.id}>
          <input
            type={allowMultiple ? 'checkbox' : 'radio'}
            name={name}
            value={option.id}
            checked={selectedIds.includes(option.id)}
            disabled={disabled}
            onChange={(event) => updateSelection(option.id, event.target.checked)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
