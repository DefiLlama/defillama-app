import { useTvlToggles, useGetExtraPeggedEnabled } from 'contexts/LocalStorage'
import { ActionMeta, components, GroupProps } from 'react-select'
import ReactSelect from './ReactSelect'

const tvlOptions = [{label: "Unreleased", value: "unreleased"}]

const groupOptions = [
  {
    label: 'Include Circulating Categorized as',
    options: tvlOptions,
  },
]

export default function PeggedAssetOptions({ label }: { label?: string }) {
  const tvlToggles = useTvlToggles()

  const extraPeggedEnabled = useGetExtraPeggedEnabled()

  const filters = extraPeggedEnabled

  const selectedOptions = Object.keys(filters)
    .filter((key) => filters[key])
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
    <ReactSelect
      options={groupOptions}
      value={selectedOptions}
      onChange={toggle}
      isMulti
      aria-label={label}
      components={{ Group }}
    />
  )
}
