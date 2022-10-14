/* eslint-disable no-unused-vars*/
import * as React from 'react'
import styled from 'styled-components'
import { BarChart2, Activity, TrendingUp, Users } from 'react-feather'
import { BRIDGES_SHOWING_TXS, BRIDGES_SHOWING_ADDRESSES, useBridgesManager } from '~/contexts/LocalStorage'

export const TxsTableSwitch = () => {
	const [bridgesSettings, toggleBridgesSettings] = useBridgesManager()
	const isBridgesShowingTxs = bridgesSettings[BRIDGES_SHOWING_TXS]

	return (
		<Wrapper>
			<Switch active={!isBridgesShowingTxs} onClick={toggleBridgesSettings(BRIDGES_SHOWING_TXS)}>
				<BarChart2 size={14} />
				<span>Volumes</span>
			</Switch>
			<Switch active={isBridgesShowingTxs} onClick={toggleBridgesSettings(BRIDGES_SHOWING_TXS)}>
				<Activity size={14} />
				<span>Large Txs</span>
			</Switch>
		</Wrapper>
	)
}

export const AddressesTableSwitch = () => {
	const [bridgesSettings, toggleBridgesSettings] = useBridgesManager()
	const isBridgesShowingAddresses = bridgesSettings[BRIDGES_SHOWING_ADDRESSES]

	return (
		<Wrapper>
			<Switch active={!isBridgesShowingAddresses} onClick={toggleBridgesSettings(BRIDGES_SHOWING_ADDRESSES)}>
				<TrendingUp size={14} />
				<span>Tokens</span>
			</Switch>
			<Switch active={isBridgesShowingAddresses} onClick={toggleBridgesSettings(BRIDGES_SHOWING_ADDRESSES)}>
				<Users size={14} />
				<span>Addresses</span>
			</Switch>
		</Wrapper>
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
