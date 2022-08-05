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
import { ChartState, defaultChartState } from './utils'
import { useLiquidationsState } from '~/utils/liquidations'

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
export const LiquidationsChartFilters = () => {
	const { aggregateBy } = useLiquidationsState()

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
