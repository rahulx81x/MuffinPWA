import { useState, type InputHTMLAttributes } from 'react';
import { Calculator } from 'lucide-react';
import { AmountCalculatorModal } from './AmountCalculatorModal';

type SmartAmountInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'value' | 'onChange'
> & {
  value: string;
  onChange: (value: string) => void;
};

function formatApplied(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(value);
}

export function SmartAmountInput({
  value,
  onChange,
  className = '',
  disabled,
  ...rest
}: SmartAmountInputProps) {
  const [calcOpen, setCalcOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${className} pr-10`.trim()}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setCalcOpen(true)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-text-muted transition hover:text-primary disabled:opacity-40"
          aria-label="Open calculator"
        >
          <Calculator className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <AmountCalculatorModal
        open={calcOpen}
        initialExpression={value}
        onClose={() => setCalcOpen(false)}
        onApply={(result) => onChange(formatApplied(result))}
      />
    </>
  );
}
