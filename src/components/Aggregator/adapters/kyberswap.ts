import { ExtraData } from "../types"

// https://docs.kyberswap.com/Aggregator/aggregator-api#tag/swap/operation/get-route-encode
export const chainToId = {
  ethereum: "ethereum",
  bsc: "bsc",
  polygon: "polygon",
  optimism: "optimism",
  arbitrum: "arbitrum",
  avax: "avalanche",
  fantom: "fantom",
  aurora: "aurora",
  bttc: "bttc",
  cronos: "cronos",
  oasis: "oasis",
  velas: "velas",
}

export const name = "KyberSwap"
export const token = "KNC"

export function approvalAddress(){
  return "0x00555513Acf282B42882420E5e5bA87b44D8fA6E"
}

export async function getQuote(chain: string, from: string, to:string, amount:string, extra:ExtraData){
  // amount should include decimals
  const data = await fetch(`https://aggregator-api.kyberswap.com/${chainToId[chain]}/route/encode?tokenIn=${from}&tokenOut=${to}&amountIn=${amount}&to=${extra.userAddress}`, {
    headers:{
      "Accept-Version": "Latest"
    }
  }).then(r=>r.json())
  return {
    amountReturned: data.outputAmount,
    estimatedGas: data.totalGas,
    tokenApprovalAddress: data.routerAddress,
  }
}


