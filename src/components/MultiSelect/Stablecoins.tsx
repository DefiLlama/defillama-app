import { ActionMeta, components, GroupProps } from 'react-select'
import { ReactSelect } from './ReactSelect'
import { useDefiChainsManager, DEFI_CHAINS_SETTINGS } from '~/contexts/LocalStorage'

const tvlOptions = [{ label: 'Unreleased', value: 'unreleased' }]

const tvlOptionsLabel = [
	{
		label: 'Include Circulating Categorized as',
		options: tvlOptions
	}
]

export function PeggedAssetTvlOptions({ label }: { label?: string }) {
	const [extraPeggedEnabled, updater] = useDefiChainsManager()

	const filters = extraPeggedEnabled

	const selectedOptions = Object.keys(filters)
		.filter((key) => filters[key])
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
			options={tvlOptionsLabel}
			value={selectedOptions}
			onChange={toggle}
			isMulti
			aria-label={label}
			components={{ Group }}
		/>
	)
}

const chainAggr = DEFI_CHAINS_SETTINGS.map((g) => ({ label: g.name, value: g.key }))

const chainAggrOptions = [...chainAggr]

const groupOptionsLabel = [
	{
		label: 'Aggregate Chains',
		options: chainAggr
	}
]

export function GroupStablecoins({ label }: { label?: string }) {
	const [groupTvls, updater] = useDefiChainsManager()

	const filters = { ...groupTvls }

	const selectedOptions = Object.keys(filters)
		.filter((key) => filters[key])
		.map((option) => chainAggrOptions.find((o) => o.value === option))

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
