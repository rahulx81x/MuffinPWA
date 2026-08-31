import { useState } from 'react';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CalculateIcon from '@mui/icons-material/Calculate';
import { AmountCalculatorModal } from './AmountCalculatorModal';

interface SmartAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

function formatApplied(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(value);
}

export function SmartAmountInput({
  value,
  onChange,
  placeholder,
  disabled,
  required,
}: SmartAmountInputProps) {
  const [calcOpen, setCalcOpen] = useState(false);

  return (
    <>
      <OutlinedInput
        fullWidth
        size="small"
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputProps={{
          inputMode: 'decimal',
          autoComplete: 'off',
          spellCheck: false,
        }}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              edge="end"
              size="small"
              disabled={disabled}
              onClick={() => setCalcOpen(true)}
              aria-label="Open calculator"
            >
              <CalculateIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        }
        sx={{
          borderRadius: 2.5,
          fontFamily: 'monospace',
          fontWeight: 600,
        }}
      />

      <AmountCalculatorModal
        open={calcOpen}
        initialExpression={value}
        onClose={() => setCalcOpen(false)}
        onApply={(result) => onChange(formatApplied(result))}
      />
    </>
  );
}

