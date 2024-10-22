/* eslint-disable no-unused-vars*/
import * as React from 'react'
import styled from 'styled-components'
import { BRIDGES_SHOWING_TXS, BRIDGES_SHOWING_ADDRESSES, useBridgesManager } from '~/contexts/LocalStorage'
import { Denomination, Filters } from '../ECharts/ProtocolChart/Misc'
import { Icon } from '../Icon'

export const TxsTableSwitch = () => {
	const [bridgesSettings, toggleBridgesSettings] = useBridgesManager()
	const isBridgesShowingTxs = bridgesSettings[BRIDGES_SHOWING_TXS]

	return (
		<Wrapper>
			<Switch active={!isBridgesShowingTxs} onClick={toggleBridgesSettings(BRIDGES_SHOWING_TXS)}>
				<Icon name="bar-chart-2" height={14} width={14} />
				<span>Bridges</span>
			</Switch>
			<Switch active={isBridgesShowingTxs} onClick={toggleBridgesSettings(BRIDGES_SHOWING_TXS)}>
				<Icon name="activity" height={14} width={14} />
				<span>Large Txs</span>
			</Switch>
		</Wrapper>
	)
}

export const AddressesTableSwitch = () => {
	const [bridgesSettings, toggleBridgesSettings] = useBridgesManager()
	const isBridgesShowingAddresses = bridgesSettings[BRIDGES_SHOWING_ADDRESSES]

	return (
		<Filters>
			<Denomination
				as="button"
				active={!isBridgesShowingAddresses}
				onClick={toggleBridgesSettings(BRIDGES_SHOWING_ADDRESSES)}
				style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
			>
				<Icon name="trending-up" height={14} width={14} />
				<span>Tokens</span>
			</Denomination>
			<Denomination
				as="button"
				active={isBridgesShowingAddresses}
				onClick={toggleBridgesSettings(BRIDGES_SHOWING_ADDRESSES)}
				style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
			>
				<Icon name="users" height={14} width={14} />
				<span>Addresses</span>
			</Denomination>
		</Filters>
	)
}

const Wrapper = styled.span`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 8px;
	border-radius: 6px;
	background-color: ${({ theme }) => theme.bg6};
	padding: 6px;
	height: 40px;
	width: 250px;
	margin: 0 auto;
	box-shadow: ${({ theme }) => theme.shadowSm};
`

interface ISwitch {
	active: boolean
}

const Switch = styled.button<ISwitch>`
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 4px;
	color: ${({ active, theme }) => (active ? '#fff' : theme.text1)};
	font-size: 14px;
	white-space: nowrap;
	flex-wrap: nowrap;
	padding: 6px;
	border-radius: 6px;
	background: ${({ active, theme }) => (active ? '#445ed0' : theme.bg6)};
	flex: 1;
`
