import { POKE_BALLS, getPokeBall } from '@runvista/pokemon/pokeballs';

interface PokeBallSelectProps {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function PokeBallSelect({ id, value, onChange, disabled = false }: PokeBallSelectProps) {
  const selected = value ? getPokeBall(value) : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        Poké Ball
      </label>

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-raised"
        >
          {selected ? (
            <img src={selected.imageUrl} alt="" className="h-8 w-8 object-contain" />
          ) : (
            <span className="text-xs text-text-secondary">—</span>
          )}
        </span>

        <select
          id={id}
          value={value ?? ''}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
          className="min-h-12 w-full rounded-xl border border-white/10 bg-surface-raised px-3 text-sm text-text-primary outline-none focus:border-accent disabled:opacity-60"
        >
          <option value="">Sin Poké Ball</option>

          {POKE_BALLS.map((ball) => (
            <option key={ball.key} value={ball.key}>
              {ball.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
