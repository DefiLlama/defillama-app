// Inline helper to avoid circular dependency with index.js
const capitalizeFirstLetter = (word: string) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : '')

type ExplorerEntry = [url: string, name: string]
type BlockExplorerValue = ExplorerEntry | ExplorerEntry[]

function isMultiExplorer(value: BlockExplorerValue): value is ExplorerEntry[] {
	return Array.isArray(value[0])
}

const blockExplorers: Record<string, BlockExplorerValue> = {
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
	//fantom: ['https://ftmscan.com/address/', 'FTMscan'], deprecated
	//heco: ['https://hecoinfo.com/address/', 'HecoInfo'], deprecated
	wan: ['https://wanscan.org/token/', 'Wanscan'],
	polygon: ['https://polygonscan.com/address/', 'PolygonScan'],
	rsk: ['https://rootstock.blockscout.com/token/', 'Rootstock Explorer'],
	solana: ['https://solscan.io/token/', 'Solscan'],
	tezos: ['https://tzkt.io/', 'TzKT'],
	moonriver: ['https://moonriver.moonscan.io/', 'Blockscout'],
	arbitrum: ['https://arbiscan.io/address/', 'Arbiscan'],
	//shiden: ['https://blockscout.com/shiden/address/', 'Blockscout'],
	terra: ['https://finder.terra.money/columbus-4/account/', 'Terra Finder'],
	okex: ['https://www.oklink.com/oktc/tokenAddr', 'Oklink'],
	celo: ['https://celo.blockscout.com/token/', 'Celo'],
	waves: ['https://wavesexplorer.com/assets/', 'Waves Explorer'],
	eos: ['https://unicove.com/token/eosio.token/', 'Unicove'],
	energyweb: ['https://explorer.energyweb.org/address/', 'EnergyWeb'],
	cronos: ['https://explorer.cronos.org/token/', 'Cronoscan'],
	harmony: ['https://explorer.harmony.one/address/', 'Harmony Explorer'],
	tron: ['https://tronscan.org/#/contract/', 'Tronscan'],
	kucoin: ['https://scan.kcc.io/token/', 'KCC Explorer'],
	iotex: ['https://iotexscan.io/address/', 'IoTeX Explorer'],
	//callisto: ['https://explorer.callisto.network/address/', 'Callisto Explorer'],
	aurora: ['https://explorer.mainnet.aurora.dev/address/', 'Aurora Explorer'],
	boba: ['https://bobascan.com/address/', 'Boba Explorer'],
	elrond: ['https://explorer.multiversx.com/tokens/', 'MultiversX Explorer'],
	xdc: ['https://xdcscan.com/token/', 'XDC Explorer'],
	//csc: ['https://www.coinex.net/address/', 'CSC Explorer'], deprecated
	cardano: ['https://cardanoscan.io/token/', 'Cardanoscan'],
	astar: ['https://blockscout.com/astar/address/', 'Blockscout'],
	algorand: ['https://allo.info/asset/', 'Allo'],
	//evmos: ['https://evm.evmos.org/address/', 'Evmos Explorer'], deprecated
	klaytn: ['https://kaiascan.io/token/', 'Kaiascan'],
	proton: ['https://explorer.xprnetwork.org/tokens/', 'XPR Network Explorer'],
	//vite: ['https://vitescan.io/token/', 'Vitescan'], deprecated
	ethereumclassic: ['https://etc.blockscout.com/token/', 'ETC Blockscout'],
	//milkomeda: ['https://rpc.c1.milkomeda.com:4000/address/', 'C1 Blockscout'], deprecated
	dfk: ['https://subnets.avax.network/defi-kingdoms/token/', 'DFK Chain Explorer'],
	//findora: ['https://evm.findorascan.io/token/', 'Findorascan'], deprecated
	rei: ['https://scan.rei.network/address/', 'ReiScan'],
	//nova: ['https://explorer.novanetwork.io/address/', 'NovaExplorer'], deprecated
	dogechain: ['https://explorer.dogechain.dog/address/', 'Doge Chain Explorer'],
	hedera: ['https://hashscan.io/mainnet/token/', 'HashScan'],
	starcoin: ['https://stcscan.io/main/tokens/detail/', 'Stcscan'],
	arbitrum_nova: ['https://arbitrum-nova.blockscout.com/token/', 'Arbitrum Nova Blockscout'],
	ultron: ['https://ulxscan.com/address/', 'ulxscan'],
	tombchain: ['https://tombscout.com/address/', 'Tombchain Explorer'],
	//canto: ['https://evm.explorer.canto.io/tokens/', 'Canto Explorer'], deprecated
	//vision: ['https://www.visionscan.org/contract/', 'Visionscan'], deprecated
	ethpow: ['https://www.oklink.com/ethereum-pow/token/', 'ETHW Explorer'],
	//cube: ['https://www.cubescan.network/en-us/token/', 'CUBE Scan'], deprecated
	//functionx: ['https://starscan.io/evm/address/', 'StarScan'], deprecated
	//kekchain: ['https://mainnet-explorer.kekchain.com/address/', 'Kekchain Explorer'], deprecated
	//godwoken: ['https://v0.gwscan.com/account/', 'GwScan'], deprecated
	//godwokenv1: ['https://v1.gwscan.com/account/', 'GwScan'], deprecated
	//muuchain: ['https://explorer.muuchain.com/address/', 'MUUSCAN'], deprecated
	neo: ['https://explorer.onegate.space/NEP17tokeninfo/', 'ONEGATE'],
	bittorrent: ['https://bttcscan.com/address/', 'BTTCSCAN'],
	//empire: ['https://explorer.empirenetwork.io/address/', 'Empire Explorer'], deprecated
	//tlchain: ['https://explorer.tlchain.live/token/', 'TLChain Explorer'], deprecated
	core: ['https://scan.coredao.org/token/', 'Scan Coredao'],
	//rpg: ['https://scan.rangersprotocol.com/address/', 'Rangerscan'], deprecated
	//loop: ['https://explorer.mainnetloop.com/token/', 'LoopExplorer'], deprecated
	era: [
		['https://explorer.zksync.io/address/', 'ZKsync Era Explorer'],
		['https://zksync.blockscout.com/token/', 'Blockscout']
	],
	map: ['https://maposcan.io/address/', 'Maposcan'],
	conflux: ['https://evm.confluxscan.org/address/', 'Conflux Scan'],
	//eos_evm: ['https://explorer.evm.eosnetwork.com/address/', 'EOS EVM Explorer'], deprecated
	thorchain: ['https://thorchain.net/address/', 'Thorchain Explorer'],
	sui: ['https://suiscan.xyz/mainnet/coin/', 'Suiscan'],
	pulse: ['https://scan.pulsechain.com/address/', 'PulseChain Scan'],
	onus: ['https://explorer.onuschain.io/address/', 'OnusChain Explorer'],
	starknet: ['https://voyager.online/contract/', 'Voyager'],
	linea: ['https://lineascan.build/token/', 'LineaScan'],
	mantle: ['https://mantlescan.xyz/token/', 'Mantle Explorer'],
	base: [
		['https://basescan.org/address/', 'Basescan'],
		['https://base.blockscout.com/token/', 'Blockscout']
	],
	op_bnb: ['https://opbnbscan.com/address/', 'opBNBScan'],
	//mvc: ['https://scan.microvisionchain.com/token/', 'MVCScan'], deprecated
	shibarium: ['https://www.shibariumscan.io/token/', 'ShibariumScan'],
	beam: ['https://subnets.avax.network/beam/address/', 'Beam Subnet Explorer'],
	nos: ['https://explorer.l2.trustless.computer/address/', 'NOS Blockscout'],
	scroll: ['https://scrollscan.com/address/', 'Scrollscan'],
	radixdlt: ['https://dashboard.radixdlt.com/resource/', 'Radix Dashboard'],
	lightlink: ['https://phoenix.lightlink.io/token/', 'LightLink Explorer'],
	//zkfair: ['https://scan.zkfair.io/address/', 'Zkfair Explorer'], deprecated
	//bitnet: ['https://btnscan.com/address/', 'BTNScan'], deprecated
	aptos: ['https://aptoscan.com/account/', 'Aptoscan'],
	zeta: ['https://zetascan.com/address/', 'Zetascan'],
	merlin: ['https://scan.merlinchain.io/address/', 'Merlin Explorer'],
	//bitrock: ['https://explorer.bit-rock.io/token/', 'Bitrock Explorer'], deprecated
	blast: ['https://blastscan.io/address/', 'Blastscan'],
	mode: ['https://modescan.io/address/', 'Modescan'],
	btr: ['https://www.btrscan.com/address/', 'BTRscan'],
	degen: ['https://explorer.degen.tips/address/', 'DegenExplorer'],
	rari: ['https://mainnet.explorer.rarichain.org/address/', 'Rari Blockscout'],
	xai: ['https://explorer.xai-chain.net/address/', 'XAI Blockscout'],
	sanko: ['https://explorer.sanko.xyz/address/', 'Sanko Blockscout'],
	fuse: ['https://explorer.fuse.io/token/', 'Fuse Blockscout'],
	shape: ['https://shapescan.xyz/address/', 'Shape Explorer'],
	abstract: ['https://abscan.org/address/', 'Abscan'],
	zero_network: ['https://explorer.zero.network/address/', 'ZERO Network Explorer'],
	redstone: ['https://explorer.redstone.xyz/address/', 'Redstone Explorer'],
	ink: ['https://explorer.inkonchain.com/address/', 'Ink Explorer'],
	sophon: ['https://explorer.sophon.xyz/address/', 'Sophon Explorer'],
	soneium: ['https://soneium.blockscout.com/address/', 'Soneium Blockscout'],
	berachain: ['https://beratrail.io/address/', 'Beratrail'],
	sty: ['https://www.storyscan.xyz/token/', 'Storyscan'],
	hemi: ['https://explorer.hemi.xyz/address/', 'Hemi Block Explorer'],
	ogpu: ['https://ogpuscan.io/address/', 'Ogpuscan'],
	keeta: ['https://explorer.keeta.com/token/', 'Keeta Explorer']
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
		const normalized: ExplorerEntry[] = isMultiExplorer(explorer) ? explorer : [explorer]
		explorers = normalized.map((e) => ({
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

export const getProtocolTokenUrlOnExplorer = (address: string = '') => {
	if (!address || typeof address !== 'string' || address === '') return null

	const newAddress = !address.includes(':') ? `ethereum:${address}` : address
	const [chain, chainAddress] = newAddress.split(':')
	const explorer = blockExplorers[chain]

	if (explorer) {
		const first: ExplorerEntry = isMultiExplorer(explorer) ? explorer[0] : explorer
		return `${first[0]}${chainAddress}`
	}

	return null
}
