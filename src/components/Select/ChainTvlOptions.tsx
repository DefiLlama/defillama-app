import { ActionMeta, components, GroupProps } from 'react-select'
import { defiTvlOptions, extraTvlSettings } from '~/components/Settings'
import { groupKeys, groupSettings, useSettingsManager, useToggleSetting } from '~/contexts/LocalStorage'
import ReactSelect from './ReactSelect'

const chainAggr = groupSettings.map((g) => ({ label: g.name, value: g.key }))
const extraTvls = defiTvlOptions.map((g) => ({ label: g.name, value: g.key }))
const tvlOptions = [...chainAggr, ...extraTvls]

const groupOptions = [
	{
		label: 'Aggregate Chains',
		options: chainAggr
	},
	{
		label: 'Include In TVL',
		options: extraTvls
	}
]

export function ChainTvlOptions({ label }: { label?: string }) {
	const tvlToggles = useToggleSetting()

	const groupTvls = useSettingsManager(groupKeys)
	const extraTvls = useSettingsManager(extraTvlSettings)

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
