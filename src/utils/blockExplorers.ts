import { capitalizeFirstLetter } from '.'

const blockExplorers = {
	ethereum: ['https://etherscan.io/token/', 'Etherscan'],
	bsc: ['https://bscscan.com/address/', 'Bscscan'],
	xdai: ['https://gnosisscan.io/address/', 'GnosisScan'],
	avax: ['https://snowtrace.io/address/', 'Snowtrace'],
	fantom: ['https://ftmscan.com/address/', 'FTMscan'],
	heco: ['https://hecoinfo.com/address/', 'HecoInfo'],
	wan: ['https://wanscan.org/token/', 'Wanscan'],
	polygon: ['https://polygonscan.com/address/', 'PolygonScan'],
	rootstock: ['https://explorer.rsk.co/address/', 'Rootstock Explorer'],
	solana: ['https://solscan.io/token/', 'Solscan'],
	tezos: ['https://tzkt.io/', 'TzKT'],
	moonriver: ['https://blockscout.moonriver.moonbeam.network/address/', 'Blockscout'],
	arbitrum: ['https://arbiscan.io/address/', 'Arbiscan'],
	shiden: ['https://blockscout.com/shiden/address/', 'Blockscout'],
	terra: ['https://finder.terra.money/columbus-4/account/', 'Terra Finder'],
	okex: ['https://www.oklink.com/okexchain/tokenAddr/', 'Oklink'],
	celo: ['https://explorer.celo.org/tokens/', 'Celo'],
	waves: ['https://wavesexplorer.com/assets/', 'Waves Explorer'],
	eos: ['https://bloks.io/tokens/', 'bloks'],
	energyweb: ['https://explorer.energyweb.org/address/', 'EnergyWeb'],
	cronos: ['https://cronoscan.com/address/', 'Cronoscan'],
	harmony: ['https://explorer.harmony.one/address/', 'Harmony Explorer'],
	tron: ['https://tronscan.org/#/contract/', 'Tronscan'],
	kucoin: ['https://explorer.kcc.io/en/address/', 'KCC Explorer'],
	iotex: ['https://iotexscan.io/address/', 'IoTeX Explorer'],
	callisto: ['https://explorer.callisto.network/address/', 'Callisto Explorer'],
	aurora: ['https://explorer.mainnet.aurora.dev/address/', 'Aurora Explorer'],
	boba: ['https://bobascan.com/address/', 'Boba Explorer'],
	elrond: ['https://elrondscan.com/token/', 'Elrondscan'],
	xdc: ['https://explorer.xinfin.network/token/', 'XDC Explorer'],
	csc: ['https://www.coinex.net/address/', 'CSC Explorer'],
	cardano: ['https://cardanoscan.io/token/', 'Cardanoscan'],
	astar: ['https://blockscout.com/astar/address/', 'Blockscout'],
	algorand: ['https://algoexplorer.io/asset/', 'Algoexplorer'],
	evmos: ['https://evm.evmos.org/address/', 'Evmos Explorer'],
	klaytn: ['https://scope.klaytn.com/token/', 'Klaytn Scope'],
	proton: ['https://www.protonscan.io/tokens/', 'Protonscan'],
	vite: ['https://vitescan.io/token/', 'Vitescan'],
	ethereumclassic: ['https://blockscout.com/etc/mainnet/address/', 'ETC Blockscout'],
	milkomeda: ['https://rpc.c1.milkomeda.com:4000/address/', 'C1 Blockscout'],
	dfk: ['https://subnets.avax.network/defi-kingdoms/dfk-chain/explorer/token/', 'DFK Chain Explorer'],
	findora: ['https://evm.findorascan.io/token/', 'Findorascan'],
	rei: ['https://scan.rei.network/address/', 'ReiScan'],
	nova: ['https://explorer.novanetwork.io/address/', 'NovaExplorer'],
	dogechain: ['https://explorer.dogechain.dog/address/', 'Doge Chain Explorer'],
	hedera: ['https://hashscan.io/#/mainnet/token/', 'HashScan'],
	carbon: ['https://scan.carbon.network/token/', 'Carbonscan'],
	starcoin: ['https://stcscan.io/main/tokens/', 'Stcscan'],
	arbitrum_nova: ['https://nova-explorer.arbitrum.io/address/', 'NovaExplorer'],
	ultron: ['https://ulxscan.com/address/', 'ulxscan'],
	juno: ['https://www.mintscan.io/juno/assets/', 'Mintscan Juno'],
	tombchain: ['https://tombscout.com/address/', 'Tombchain Explorer'],
	canto: ['https://evm.explorer.canto.io/tokens/', 'Canto Explorer'],
	vision: ['https://www.visionscan.org/contract/', 'Visionscan'],
	ethpow: ['https://www.oklink.com/en/ethw/address/', 'ETHW Explorer'],
	cube: ['https://www.cubescan.network/en-us/token/', 'CUBE Scan'],
	functionx: ['https://starscan.io/evm/address/', 'StarScan'],
	kekchain: ['https://mainnet-explorer.kekchain.com/address/', 'Kekchain Explorer'],
	godwoken: ['https://v0.gwscan.com/account/', 'GwScan'],
	godwokenv1: ['https://v1.gwscan.com/account/', 'GwScan'],
	muuchain: ['https://explorer.muuchain.com/address/', 'MUUSCAN'],
	neo: ['https://explorer.onegate.space/NEP17tokeninfo/', 'ONEGATE'],
	bittorrent: ['https://bttcscan.com/address/', 'BTTCSCAN'],
	empire: ['https://explorer.empirenetwork.io/address/', 'Empire Explorer'],
	tlchain: ['https://explorer.tlchain.live/token/', 'TLChain Explorer'],
	core: ['https://scan.coredao.org/token/', 'Scan Coredao'],
	rpg: ['https://scan.rangersprotocol.com/address/', 'Rangerscan'],
	loop: ['https://explorer.mainnetloop.com/token/', 'LoopExplorer'],
	era: ['https://explorer.zksync.io/address/', 'zkSync Explorer'],
	map: ['https://maposcan.io/address/', 'Maposcan'],
	conflux: ['https://evm.confluxscan.net/address/', 'Conflux Scan'],
	eos_evm: ['https://explorer.evm.eosnetwork.com/address/', 'EOS EVM Explorer'],
	thorchain: ['https://thorchain.net/address/', 'Thorchain Explorer'],
	sui: ['https://suiscan.xyz/mainnet/object/', 'Suiscan'],
	pulse: ['https://scan.pulsechain.com/address/', 'PulseChain Scan'],
	onus: ['https://explorer.onuschain.io/address/', 'OnusChain Explorer'],
	stark: ['https://starkscan.co/token/', 'StarkScan']
}

export const getBlockExplorer = (address: string = '') => {
	let blockExplorerLink, blockExplorerName, chainName
	if (address?.includes(':')) {
		const [chain, chainAddress] = address.split(':')
		const explorer = blockExplorers[chain]
		if (explorer !== undefined) {
			blockExplorerLink = explorer[0] + chainAddress
			blockExplorerName = explorer[1]
		}
		chainName = chain
			? chain
					.split('_')
					.map((x) => capitalizeFirstLetter(x))
					.join(' ')
			: 'Ethereum'
	} else {
		if (typeof address === 'string' && address !== '') {
			blockExplorerLink = 'https://etherscan.io/token/' + address
			blockExplorerName = 'Etherscan'
			chainName = 'Ethereum'
		}
	}

	return {
		blockExplorerLink: blockExplorerLink ?? '',
		blockExplorerName: blockExplorerName ?? 'unknown',
		chainName
	}
}
