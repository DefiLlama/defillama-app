const blockExplorers = {
  bsc: ['https://bscscan.com/address/', 'Bscscan'],
  xdai: ['https://blockscout.com/xdai/mainnet/address/', 'BlockScout'],
  avax: ['https://snowtrace.io/address/', 'Snowtrace'],
  fantom: ['https://ftmscan.com/address/', 'FTMscan'],
  heco: ['https://hecoinfo.com/address/', 'HecoInfo'],
  wan: ['https://wanscan.org/token/', 'Wanscan'],
  polygon: ['https://polygonscan.com/address/', 'PolygonScan'],
  rsk: ['https://explorer.rsk.co/address/', 'RSK Explorer'],
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
  cronos: ['https://cronos.crypto.org/explorer/address/', 'Cronos Explorer'],
  harmony: ['https://explorer.harmony.one/address/', 'Harmony Explorer'],
  tron: ['https://tronscan.org/#/', 'Tronscan'],
  kucoin: ['https://explorer.kcc.io/en/address/', 'KCC Explorer'],
  iotex: ['https://iotexscan.io/address/', 'IoTeX Explorer'],
  callisto: ['https://explorer.callisto.network/address/', 'Callisto Explorer'],
  aurora: ['https://explorer.mainnet.aurora.dev/address/', 'Aurora Explorer'],
  boba: ['https://blockexplorer.boba.network/tokens/', 'Boba Explorer'],
  elrond: ['https://elrondscan.com/token/', 'Elrondscan'],
  xdc: ['https://explorer.xinfin.network/token/', 'XDC Explorer'],
  csc: ['https://www.coinex.net/address/', 'CSC Explorer'],
  cardano: ['https://cardanoscan.io/token/', 'Cardanoscan'],
  astar: ['https://blockscout.com/astar/address/', 'Blockscout'],
  algorand: ['https://algoexplorer.io/asset/', 'Algoexplorer'],
  evmos: ['https://evm.evmos.org/address/', 'Evmos Explorer'],
  klaytn: ['https://scope.klaytn.com/token/','Klaytn Scope'],
  proton: ['https://www.protonscan.io/tokens/','Protonscan'],
}

export const getBlockExplorer = (address = '') => {
  let blockExplorerLink, blockExplorerName;
  if (address?.includes(':')) {
    const [chain, chainAddress] = address.split(':')
    const explorer = blockExplorers[chain]
    if (explorer !== undefined) {
      blockExplorerLink = explorer[0] + chainAddress;
      blockExplorerName = explorer[1];
    }
  } else if (typeof address === "string") {
    blockExplorerLink = 'https://etherscan.io/address/' + address
    blockExplorerName = 'Etherscan'
  }

  return {
    blockExplorerLink,
    blockExplorerName
  }
}
