import { capitalizeFirstLetter } from '.'

const blockExplorers = {
	ethereum: [
		['https://etherscan.io/token/', 'Etherscan'],
		['https://eth.blockscout.com/token/', 'Blockscout']
	],
	bsc: ['https://bscscan.com/address/', 'Bscscan'],
	xdai: [
		['https://gnosisscan.io/address/', 'GnosisScan'],
		['https://gnosis.blockscout.com/token/', 'Blockscout']
	],
	optimism: [
		['https://optimistic.etherscan.io/address/', 'Etherscan'],
		['https://optimism.blockscout.com/token/', 'Blockscout']
	],
	avax: ['https://snowtrace.io/address/', 'Snowtrace'],
	fantom: ['https://ftmscan.com/address/', 'FTMscan'],
	heco: ['https://hecoinfo.com/address/', 'HecoInfo'],
	wan: ['https://wanscan.org/token/', 'Wanscan'],
	polygon: ['https://polygonscan.com/address/', 'PolygonScan'],
	rsk: ['https://rootstock.blockscout.com/token/', 'Rootstock Explorer'],
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
	elrond: ['https://explorer.multiversx.com/tokens/', 'MultiversX Explorer'],
	xdc: ['https://explorer.xinfin.network/token/', 'XDC Explorer'],
	csc: ['https://www.coinex.net/address/', 'CSC Explorer'],
	cardano: ['https://cardanoscan.io/token/', 'Cardanoscan'],
	astar: ['https://blockscout.com/astar/address/', 'Blockscout'],
	algorand: ['https://allo.info/asset/', 'Allo'],
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
	era: [
		['https://explorer.zksync.io/address/', 'zkSync Explorer'],
		['https://zksync.blockscout.com/token/', 'Blockscout']
	],
	map: ['https://maposcan.io/address/', 'Maposcan'],
	conflux: ['https://evm.confluxscan.net/address/', 'Conflux Scan'],
	eos_evm: ['https://explorer.evm.eosnetwork.com/address/', 'EOS EVM Explorer'],
	thorchain: ['https://thorchain.net/address/', 'Thorchain Explorer'],
	sui: ['https://suiscan.xyz/mainnet/object/', 'Suiscan'],
	pulse: ['https://scan.pulsechain.com/address/', 'PulseChain Scan'],
	onus: ['https://explorer.onuschain.io/address/', 'OnusChain Explorer'],
	stark: ['https://starkscan.co/token/', 'StarkScan'],
	linea: ['https://lineascan.build/token/', 'LineaScan'],
	mantle: ['https://explorer.mantle.xyz/address/', 'Mantle Explorer'],
	base: [
		['https://basescan.org/address/', 'Basescan'],
		['https://base.blockscout.com/token/', 'Blockscout']
	],
	op_bnb: ['https://mainnet.opbnbscan.com/address/', 'opBNBScan'],
	mvc: ['https://scan.microvisionchain.com/token/', 'MVCScan'],
	shibarium: ['https://www.shibariumscan.io/token/', 'ShibariumScan'],
	beam: ['https://subnets.avax.network/beam/address/', 'Beam Subnet Explorer'],
	nos: ['https://explorer.l2.trustless.computer/address/', 'NOS Blockscout'],
	scroll: ['https://blockscout.scroll.io/address/', 'Scroll Explorer'],
	radixdlt: ['https://dashboard.radixdlt.com/resource/', 'Radix Dashboard'],
	lightlink: ['https://phoenix.lightlink.io/token/', 'LightLink Explorer'],
	zkfair: ['https://scan.zkfair.io/address/', 'Zkfair Explorer'],
	bitnet: ['https://btnscan.com/address/', 'BTNScan'],
	aptos: ['https://aptoscan.com/account/', 'Aptoscan'],
	zeta: ['https://zetachain.blockscout.com/token/', 'Zeta Blockscout']
}

export const getBlockExplorer = (address: string = '') => {
	let blockExplorerLink, blockExplorerName, chainName, explorers
	if (!address || typeof address !== 'string' || address === '') {
		return { blockExplorerLink, blockExplorerName, chainName, explorers }
	}
	if (!address.includes(':')) {
		address = `ethereum:${address}`
	}
	const [chain, chainAddress] = address.split(':')
	const explorer = blockExplorers[chain]
	if (explorer) {
		explorers = (explorer[0].length === 2 ? explorer : [explorer]).map((e) => ({
			blockExplorerLink: e[0] + chainAddress,
			blockExplorerName: e[1]
		}))
		blockExplorerLink = explorers[0].blockExplorerLink
		blockExplorerName = explorers[0].blockExplorerName
	}
	chainName = chain
		? chain
				.split('_')
				.map((x) => capitalizeFirstLetter(x))
				.join(' ')
		: 'Ethereum'

	return {
		blockExplorerLink: blockExplorerLink ?? '',
		blockExplorerName: blockExplorerName ?? 'unknown',
		chainName,
		explorers
	} //rebuild again
}
