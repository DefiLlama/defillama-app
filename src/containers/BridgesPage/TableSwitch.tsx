/* eslint-disable no-unused-vars*/
import * as React from 'react'
import { BRIDGES_SHOWING_TXS, BRIDGES_SHOWING_ADDRESSES, useBridgesManager } from '~/contexts/LocalStorage'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/Misc'
import { Icon } from '~/components/Icon'

export const TxsTableSwitch = () => {
	const [bridgesSettings, toggleBridgesSettings] = useBridgesManager()
	const isBridgesShowingTxs = bridgesSettings[BRIDGES_SHOWING_TXS]

	return (
		<div className="flex items-center gap-2 rounded-md h-11 w-64 bg-[var(--bg6)] mx-auto p-[6px]">
			<button
				className="flex flex-1 justify-center items-center gap-1 rounded-md p-[6px] data-[active=true]:bg-[#445ed0]"
				data-active={!isBridgesShowingTxs}
				onClick={toggleBridgesSettings(BRIDGES_SHOWING_TXS)}
			>
				<Icon name="bar-chart-2" height={14} width={14} />
				<span>Bridges</span>
			</button>
			<button
				className="flex flex-1 justify-center items-center gap-1 rounded-md p-[6px] data-[active=true]:bg-[#445ed0]"
				data-active={isBridgesShowingTxs}
				onClick={toggleBridgesSettings(BRIDGES_SHOWING_TXS)}
			>
				<Icon name="activity" height={14} width={14} />
				<span>Large Txs</span>
			</button>
		</div>
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
