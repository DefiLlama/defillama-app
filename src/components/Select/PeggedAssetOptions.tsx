import { ActionMeta, components, GroupProps } from 'react-select'
import ReactSelect from './ReactSelect'
import { groupSettings, useTvlToggles, useGroupEnabled, useGetExtraPeggedEnabled } from '~/contexts/LocalStorage'

const tvlOptions = [{ label: 'Unreleased', value: 'unreleased' }]

const tvlOptionsLabel = [
  {
    label: 'Include Circulating Categorized as',
    options: tvlOptions,
  },
]

export default function PeggedAssetTvlOptions({ label }: { label?: string }) {
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
      options={tvlOptionsLabel}
      value={selectedOptions}
      onChange={toggle}
      isMulti
      aria-label={label}
      components={{ Group }}
    />
  )
}

const chainAggr = groupSettings.map((g) => ({ label: g.name, value: g.key }))

const chainAggrOptions = [...chainAggr]

const groupOptionsLabel = [
  {
    label: 'Aggregate Chains',
    options: chainAggr,
  },
]

export function PeggedAssetGroupOptions({ label }: { label?: string }) {
  const tvlToggles = useTvlToggles()

  const groupTvls = useGroupEnabled()

  const filters = { ...groupTvls }

  const selectedOptions = Object.keys(filters)
    .filter((key) => filters[key])
    .map((option) => chainAggrOptions.find((o) => o.value === option))

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
      options={groupOptionsLabel}
      value={selectedOptions}
      onChange={toggle}
      isMulti
      aria-label={label}
      instanceId={'peggedAssetGroupOptions'}
      components={{ Group }}
    />
  )
}
