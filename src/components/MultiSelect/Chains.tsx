import { ActionMeta, components, GroupProps } from 'react-select'
import { protocolsAndChainsOptions } from '~/components/Filters/protocols'
import { DEFI_CHAINS_SETTINGS, useDefiChainsManager, useDefiManager } from '~/contexts/LocalStorage'
import ReactSelect from './ReactSelect'

const chainAggr = DEFI_CHAINS_SETTINGS.map((g) => ({ label: g.name, value: g.key }))
const extraTvls = protocolsAndChainsOptions.map((g) => ({ label: g.name, value: g.key }))
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

export function GroupChains({ label }: { label?: string }) {
	const [groupTvls] = useDefiChainsManager()
	const [extraTvls, updater] = useDefiManager()

	const fitlers = { ...groupTvls, ...extraTvls }

	const selectedOptions = Object.keys(fitlers)
		.filter((key) => fitlers[key])
		.map((option) => tvlOptions.find((o) => o.value === option))

	const toggle = (_, s: ActionMeta<any>) => {
		if (s.removedValues) {
			s.removedValues?.forEach((option) => updater(option.value)())
		} else if (s.removedValue) {
			updater(s.removedValue.value)()
		} else updater(s.option.value)()
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
