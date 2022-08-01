import { MenuButtonArrow, useSelectState } from 'ariakit'
import { useRouter } from 'next/router'
import { Checkbox } from '~/components'
import HeadHelp from '~/components/HeadHelp'
import { FilterButton, FilterPopover } from '~/components/Select/AriakitSelect'
import {
	AUDITED,
	MILLION_DOLLAR,
	NO_IL,
	SINGLE_EXPOSURE,
	STABLECOINS,
	NO_OUTLIER,
	APY_GT0
} from '~/contexts/LocalStorage'
import { Item, Selected, Stats } from '../shared'

export const attributeOptions = [
	{
		name: 'Stablecoins',
		key: STABLECOINS.toLowerCase(),
		help: 'Select pools consisting of stablecoins only',
		filterFn: (item) => item.stablecoin === true
	},
	{
		name: 'Single Exposure',
		key: SINGLE_EXPOSURE.toLowerCase(),
		help: 'Select pools with single token exposure only',
		filterFn: (item) => item.exposure === 'single'
	},
	{
		name: 'No IL',
		key: NO_IL.toLowerCase(),
		help: 'Select pools with no impermanent loss',
		filterFn: (item) => item.ilRisk === 'no'
	},
	{
		name: 'Million Dollar',
		key: MILLION_DOLLAR.toLowerCase(),
		help: 'Select pools with at least one million dollar in TVL',
		filterFn: (item) => item.tvlUsd >= 1e6
	},
	{
		name: 'Audited',
		key: AUDITED.toLowerCase(),
		help: 'Select pools from audited projects only',
		filterFn: (item) => item.audits !== '0'
	},
	{
		name: 'No Outliers',
		key: NO_OUTLIER.toLowerCase(),
		help: 'Remove pools which are considered outliers based on their geometric mean of apy values',
		filterFn: (item) => item.outlier === false
	},
	{
		name: 'APY > 0',
		key: APY_GT0.toLowerCase(),
		help: 'Remove pools with apy values of 0',
		filterFn: (item) => item.apy > 0
	}
]

export function YieldAttributes({ pathname }: { pathname: string }) {
	const router = useRouter()

	const { attribute = [], ...queries } = router.query

	const values = attributeOptions
		.filter((o) => {
			if (attribute) {
				if (typeof attribute === 'string') {
					return o.key === attribute
				} else {
					return attribute.includes(o.key)
				}
			}
		})
		.map((o) => o.key)

	const updateAttributes = (newFilters) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					attribute: newFilters
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const select = useSelectState({
		value: values,
		setValue: updateAttributes,
		gutter: 8
	})

	const toggleAll = () => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					attribute: attributeOptions.map((o) => o.key)
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clear = () => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					attribute: []
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<>
			<FilterButton state={select}>
				<span>Filter by Attribute</span>
				<MenuButtonArrow />
				{values.length > 0 && <Selected>{values.length}</Selected>}
			</FilterButton>
			<FilterPopover state={select}>
				<Stats>
					<button onClick={clear}>clear</button>

					<button onClick={toggleAll}>toggle all</button>
				</Stats>
				{attributeOptions.map((option) => (
					<Item key={option.key} value={option.key}>
						{option.help ? <HeadHelp title={option.name} text={option.help} /> : option.name}
						<Checkbox checked={values.includes(option.key)} />
					</Item>
				))}
			</FilterPopover>
		</>
	)
}
