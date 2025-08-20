import * as React from 'react'
import { BRIDGES_SHOWING_TXS, BRIDGES_SHOWING_ADDRESSES, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'

export const TxsTableSwitch = () => {
	const [bridgesSettings, toggleBridgesSettings] = useLocalStorageSettingsManager('bridges')
	const isBridgesShowingTxs = bridgesSettings[BRIDGES_SHOWING_TXS]

	return (
		<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-(--text-form)">
			<button
				className="flex items-center gap-1 shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
				data-active={!isBridgesShowingTxs}
				onClick={() => toggleBridgesSettings(BRIDGES_SHOWING_TXS)}
			>
				<Icon name="bar-chart-2" height={14} width={14} />
				<span>Bridges</span>
			</button>
			<button
				className="flex items-center gap-1 shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
				data-active={isBridgesShowingTxs}
				onClick={() => toggleBridgesSettings(BRIDGES_SHOWING_TXS)}
			>
				<Icon name="activity" height={14} width={14} />
				<span>Large Txs</span>
			</button>
		</div>
	)
}

export const AddressesTableSwitch = () => {
	const [bridgesSettings, toggleBridgesSettings] = useLocalStorageSettingsManager('bridges')
	const isBridgesShowingAddresses = bridgesSettings[BRIDGES_SHOWING_ADDRESSES]

	return (
		<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-(--text-form)">
			<button
				data-active={!isBridgesShowingAddresses}
				onClick={() => toggleBridgesSettings(BRIDGES_SHOWING_ADDRESSES)}
				className="flex items-center gap-1 shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
			>
				<Icon name="trending-up" height={14} width={14} />
				<span>Tokens</span>
			</button>
			<button
				data-active={isBridgesShowingAddresses}
				onClick={() => toggleBridgesSettings(BRIDGES_SHOWING_ADDRESSES)}
				className="flex items-center gap-1 shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
			>
				<Icon name="users" height={14} width={14} />
				<span>Addresses</span>
			</button>
		</div>
	)
}
