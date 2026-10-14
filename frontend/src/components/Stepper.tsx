// Шагов действительно три и они идут по порядку — поэтому здесь нумерация уместна
const STEPS = ["Document and settings", "Preparing", "Chat"];

export default function Stepper({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="stepper" aria-label="Progress">
      {STEPS.map((step, i) => (
        <li key={step} className={i === current ? "current" : i < current ? "done" : undefined}>
          <span className="stepper-n">{i + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
