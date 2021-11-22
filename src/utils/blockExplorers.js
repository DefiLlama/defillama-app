const blockExplorers = {
  bsc: ['https://bscscan.com/address/', 'Bscscan'],
  xdai: ['https://blockscout.com/xdai/mainnet/address/', 'BlockScout'],
  avax: ['https://cchain.explorer.avax.network/address/', 'CChain Explorer'],
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
  iotex: ['https://iotexscan.io/address/', 'IoTeX Explorer']
}

export const getBlockExplorer = (address = '') => {
  let blockExplorerLink = 'https://etherscan.io/address/' + address
  let blockExplorerName = 'Etherscan'
  Object.entries(blockExplorers).forEach(explorer => {
    const chainId = explorer[0] + ':'
    if (address?.startsWith(chainId)) {
      address = address.slice(chainId.length)
      blockExplorerLink = explorer[1][0] + address
      blockExplorerName = explorer[1][1]
    }
  })

  return {
    blockExplorerLink,
    blockExplorerName
  }
}
