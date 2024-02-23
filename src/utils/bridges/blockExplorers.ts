import { capitalizeFirstLetter } from '..'

const blockExplorersTxs = {
	ethereum: ['https://etherscan.io/tx/', 'Etherscan'],
	bsc: ['https://bscscan.com/tx/', 'Bscscan'],
	xdai: ['https://gnosisscan.io/tx/', 'GnosisScan'],
	avax: ['https://snowscan.xyz/tx/', 'SnowScan'],
	fantom: ['https://ftmscan.com/tx/', 'FTMscan'],
	heco: ['https://hecoinfo.com/tx/', 'HecoInfo'],
	polygon: ['https://polygonscan.com/tx/', 'PolygonScan'],
	solana: ['https://solscan.io/tx/', 'Solscan'],
	arbitrum: ['https://arbiscan.io/tx/', 'Arbiscan'],
	optimism: ['https://optimistic.etherscan.io/tx/', 'Optimism Explorer'],
	aurora: ['https://aurorascan.dev/tx/', 'AuroraScan'],
	celo: ['https://explorer.celo.org/mainnet/tx/', 'Celo Explorer'],
	klaytn: ['https://scope.klaytn.com/tx/, Klaytn Scope']
}

const blockExplorersAddresses = {
	ethereum: ['https://etherscan.io/address/', 'Etherscan'],
	bsc: ['https://bscscan.com/address/', 'Bscscan'],
	xdai: ['https://gnosisscan.io/address/', 'GnosisScan'],
	avax: ['https://snowscan.xyz/address/', 'SnowScan'],
	fantom: ['https://ftmscan.com/address/', 'FTMscan'],
	heco: ['https://hecoinfo.com/address/', 'HecoInfo'],
	polygon: ['https://polygonscan.com/address/', 'PolygonScan'],
	solana: ['https://solscan.io/address/', 'Solscan'],
	arbitrum: ['https://arbiscan.io/address/', 'Arbiscan'],
	optimism: ['https://optimistic.etherscan.io/address/', 'Optimism Explorer'],
	aurora: ['https://aurorascan.dev/address/', 'AuroraScan'],
	celo: ['https://explorer.celo.org/mainnet/address/', 'Celo Explorer'],
	klaytn: ['https://scope.klaytn.com/account/, Klaytn Scope']
}

export const getBlockExplorerForTx = (txHash: string = '') => {
	let blockExplorerLink, blockExplorerName
	if (txHash?.includes(':')) {
		const [chain, chainHash] = txHash.split(':')
		const explorer = blockExplorersTxs[chain]
		if (explorer !== undefined) {
			blockExplorerLink = explorer[0] + chainHash
			blockExplorerName = explorer[1]
		}
	} else {
		if (typeof txHash === 'string' && txHash !== '') {
			blockExplorerLink = 'https://etherscan.io/tx/' + txHash
			blockExplorerName = 'Etherscan'
		}
	}

	return {
		blockExplorerLink,
		blockExplorerName
	}
}

export const getBlockExplorerForAddress = (txHash: string = '') => {
	let blockExplorerLink, blockExplorerName, chainName
	if (txHash?.includes(':')) {
		const [chain, chainHash] = txHash.split(':')
		const explorer = blockExplorersAddresses[chain]
		if (explorer !== undefined) {
			blockExplorerLink = explorer[0] + chainHash
			blockExplorerName = explorer[1]
		}
		chainName = chain
			? chain
					.split('_')
					.map((x) => capitalizeFirstLetter(x))
					.join(' ')
			: 'Ethereum'
	} else {
		if (typeof txHash === 'string' && txHash !== '') {
			blockExplorerLink = 'https://etherscan.io/address/' + txHash
			blockExplorerName = 'Etherscan'
			chainName = 'Ethereum'
		}
	}

	return {
		blockExplorerLink,
		blockExplorerName,
		chainName
	}
}
