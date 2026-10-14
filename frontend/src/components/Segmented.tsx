type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  hint?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

// Группа радиокнопок, стилизованная как переключатель. Generic-компонент: T — union из значений
export default function Segmented<T extends string>({ label, hint, options, value, onChange }: Props<T>) {
  return (
    <fieldset className="field">
      <legend>{label}</legend>
      {hint && <p className="hint">{hint}</p>}
      <div className="segmented">
        {options.map((option) => (
          <label key={option.value} className={option.value === value ? "selected" : undefined}>
            <input
              type="radio"
              name={label}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
