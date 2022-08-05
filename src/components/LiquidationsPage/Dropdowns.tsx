/* eslint-disable no-unused-vars*/

import styled from 'styled-components'
import useSWR from 'swr'
import { fetcher } from '~/utils/useSWR'
import React, { useState } from 'react'
import { FilterButton, FilterPopover } from '../Select/AriakitSelect'
import { Checkbox, MenuButtonArrow, useSelectState } from 'ariakit'
import { Stats } from '../Filters/shared'
import { Item } from '../DropdownMenu'
import { useRouter } from 'next/router'
import { ChartState } from './Chart'
import { defaultChartState } from '~/pages/liquidations'

const Dropdowns = styled.span`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 20px;

	button {
		font-weight: 400;
	}
`

export type DropdownOption = {
	name: string
	key: string
}
const ProtocolsDropdown = ({ options }: { options: DropdownOption[] }) => {
	return <h3>Protocols filter</h3>
}
const ChainsDropdown = ({ options }: { options: DropdownOption[] }) => {
	return <h3>Chains filter</h3>
}
export const LiquidationsChartFilters = ({ aggregateBy }: { aggregateBy: 'chain' | 'protocol' }) => {
	const { data } = useSWR<DropdownOption[]>(
		`http://localhost:3000/api/mock-liquidations-options?aggregateBy${aggregateBy}`,
		fetcher
	)
	return (
		<Dropdowns>
			{data && (aggregateBy === 'protocol' ? <ProtocolsDropdown options={data} /> : <ChainsDropdown options={data} />)}
		</Dropdowns>
	)
}

// export function OptionsDropdown({ options }: { options: DropdownOption[] }) {
// 	const router = useRouter()
// 	const { asset, aggregateBy, filter } = router.query as Chart
// 	const _asset = asset || defaultChart.asset
// 	const _aggregateBy = aggregateBy || defaultChart.aggregateBy
// 	const _filter = filter || defaultChart.filter

// 	const [enabledOptions, setEnabledOptions] = useState<string[]>([])

// 	const select = useSelectState({
// 		value: options.map((x) => x.key),
// 		gutter: 8
// 	})

// 	const clear = () => {
// 		const newQuery = { ...router.query, filter: 'none' }
// 		router.push({ pathname: router.pathname, query: newQuery }, undefined, {
// 			shallow: true
// 		})
// 	}

// 	const toggleAll = () => {
// 		const newQuery = { ...router.query }
// 		delete newQuery.filter
// 		router.push({ pathname: router.pathname, query: newQuery }, undefined, {
// 			shallow: true
// 		})
// 	}

// 	return (
// 		<>
// 			<FilterButton state={select}>
// 				<span>Filter by {_aggregateBy === 'chain' ? 'protocol' : 'chain'}</span>
// 				<MenuButtonArrow />
// 			</FilterButton>
// 			<FilterPopover state={select}>
// 				<Stats>
// 					<button onClick={clear}>clear</button>

// 					<button onClick={toggleAll}>toggle all</button>
// 				</Stats>
// 				{options.map((option) => (
// 					<Item key={option.key} value={option.key}>
// 						{option.name}
// 						<Checkbox checked={!_filter || _filter.includes(option.key)} />
// 					</Item>
// 				))}
// 			</FilterPopover>
// 		</>
// 	)
// }
