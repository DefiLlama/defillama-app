import { extraTvlOptions } from 'components/SettingsModal'
import { groupSettings, useGetExtraTvlEnabled, useGroupEnabled, useTvlToggles } from 'contexts/LocalStorage'
import { ActionMeta, components, GroupProps } from 'react-select'
import Select from '.'

const chainAggr = groupSettings.map((g) => ({ label: g.name, value: g.key }))
const extraTvls = extraTvlOptions.map((g) => ({ label: g.name, value: g.key }))
const tvlOptions = [...chainAggr, ...extraTvls]

const groupOptions = [
  {
    label: 'Aggregate Chains',
    options: chainAggr,
  },
  {
    label: 'Include TVLs',
    options: extraTvls,
  },
]

export default function ChainsTvlSelect({ label }: { label?: string }) {
  const tvlToggles = useTvlToggles()

  const groupTvls = useGroupEnabled()
  const extraTvls = useGetExtraTvlEnabled()

  const fitlers = { ...groupTvls, ...extraTvls }

  const selectedOptions = Object.keys(fitlers)
    .filter((key) => fitlers[key])
    .map((option) => tvlOptions.find((o) => o.value === option))

  const toggle = (_, s: ActionMeta<any>) => {
    if (s.removedValues) {
      s.removedValues?.forEach((option) => tvlToggles(option.value)())
    } else if (s.removedValue) {
      tvlToggles(s.removedValue.value)()
    } else tvlToggles(s.option.value)()
  }

  const Group = (props: GroupProps) => (
    <div>
      <components.Group {...props} />
    </div>
  )

  return (
    <Select
      options={groupOptions}
      value={selectedOptions}
      onChange={toggle}
      isMulti
      aria-label={label}
      components={{ Group }}
    />
  )
}
