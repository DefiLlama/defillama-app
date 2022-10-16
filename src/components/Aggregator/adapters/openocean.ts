export const chainToId = {
  ethereum: 1,
  bsc: 52,
  polygon: 137,
  optimism: 10,
  arbitrum: 42161,
  gnosis: 100,
  avax: 43114,
  fantom: 250,
  aurora: 1313161554,
  heco: 128,
  harmony: 1666600000,
  boba: 288,
  okc: 66,
}

export const name = "OpenOcean"

export function approvalAddress(){
  return "0x6352a56caadc4f1e25cd6c75970fa768a3304e64"
}

const chainNames = {
  ethereum: "eth"
}

// https://docs.openocean.finance/dev/openocean-api-3.0/quick-start
export async function getQuote(chain: string, from: string, to:string, amount:string){
  const gasPrice = await fetch(`https://ethapi.openocean.finance/v2/${chainToId[chain]}/gas-price`).then(r=>r.json())
  const data = await fetch(
    `https://open-api.openocean.finance/v3/${chainNames[chain] ?? chain}/quote?inTokenAddress=${from}&outTokenAddress=${to}&amount=${amount}&gasPrice=${gasPrice.fast?.maxPriorityFeePerGas ?? gasPrice.fast}`).then(r=>r.json())
  return {
    amountReturned: data.data.outAmount,
    estimatedGas: data.data.estimatedGas,
  }
}