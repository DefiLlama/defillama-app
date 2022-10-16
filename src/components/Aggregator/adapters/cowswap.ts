// Source: https://docs.cow.fi/off-chain-services/api

import { ExtraData } from "./types"

export const chainToId = {
  ethereum: "https://api.cow.fi/mainnet",
  gnosis: "https://api.cow.fi/xdai",
}

export const name = "CowSwap"

export function approvalAddress(){
  return "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110"
}

// https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/2.-query-the-fee-endpoint
export async function getQuote(chain: string, from: string, to:string, amount:string, extra:ExtraData){
  // amount should include decimals
  const data = await fetch(
    `${chainToId[chain]}/api/v1/quote`,
    {
      method: "POST",
      body: JSON.stringify({
        "sellToken": from,
        "buyToken": to,
        "receiver": extra.userAddress,
        "appData": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "partiallyFillable": false,
        "sellTokenBalance": "erc20",
        "buyTokenBalance": "erc20",
        "from": extra.userAddress,
        //"priceQuality": "fast",
        "signingScheme": "eip712",
        //"onchainOrder": false,
        "kind": "sell",
        "sellAmountBeforeFee": amount
      }),
      headers: {
        "Content-Type": "application/json"
      }
    }).then(r=>r.json())
  return {
    amountReturned: data.quote.buyAmount,
    estimatedGas: 0,
    validTo: data.quote.validTo,
  }
}