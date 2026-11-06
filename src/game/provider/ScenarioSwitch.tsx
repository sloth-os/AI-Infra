import { Cloud } from 'lucide-react'

export function ScenarioSwitch({
  value,
  onChange,
}: {
  value: 'model' | 'cloud-provider'
  onChange: (value: 'model' | 'cloud-provider') => void
}) {
  return (
    <label className="game-scenario-switch" title="Change game scenario">
      <Cloud size={17} />
      <select
        aria-label="Game scenario"
        value={value}
        onChange={(event) =>
          onChange(event.target.value as 'model' | 'cloud-provider')
        }
      >
        <option value="model">Model operator · AI lifecycle</option>
        <option value="cloud-provider">
          Cloud provider · physical infrastructure
        </option>
      </select>
    </label>
  )
}
