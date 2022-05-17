import { extraTvlOptions } from 'components/SettingsModal'
import { groupSettings, useGetExtraTvlEnabled, useGroupEnabled, useTvlToggles } from 'contexts/LocalStorage'
import { ActionMeta } from 'react-select'
import Select from '.'

const tvlOptions = [...groupSettings, ...extraTvlOptions].map((g) => ({ label: g.name, value: g.key }))

export default function ChainsTvlSelect({ label }: { label?: string }) {
  const tvlToggles = useTvlToggles()

  const groupTvls = useGroupEnabled()
  const extraTvls = useGetExtraTvlEnabled()

  const fitlers = { ...extraTvls, ...groupTvls }

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

  //   return <Select options={[]} />

  return <Select options={tvlOptions} value={selectedOptions} onChange={toggle} isMulti aria-label={label} />
}
