export const chainToId = {
  ethereum: "https://api.0x.org/",
  bsc: "https://bsc.api.0x.org/",
  polygon: "https://polygon.api.0x.org/",
  optimism: "https://optimism.api.0x.org/",
  arbitrum: "https://avalanche.api.0x.org/",
  avax: "https://avalanche.api.0x.org/",
  fantom: "https://fantom.api.0x.org/",
  celo: "https://celo.api.0x.org/",
}

export const name = "Matcha/0x"
export const token = "ZRX"

export function approvalAddress(){
  // https://docs.0x.org/0x-api-swap/guides/swap-tokens-with-0x-api
  return "0xdef1c0ded9bec7f1a1670819833240f027b25eff"
}

export async function getQuote(chain: string, from: string, to:string, amount:string){
  // amount should include decimals
  const data = await fetch(`${chainToId[chain]}swap/v1/quote?buyToken=${to}&sellToken=${from}&sellAmount=${amount}`).then(r=>r.json())
  return {
    amountReturned: data.buyAmount,
    estimatedGas: data.gas,
    tokenApprovalAddress: data.to,
  }
}

/*
https://docs.0x.org/0x-api-swap/guides/swap-tokens-with-0x-api
export async function executeSwap(){  
  const receipt = await waitForTxSuccess(web3.eth.sendTransaction({
    from: taker,
    to: quote.to,
    data: quote.data,
    value: quote.value,
    gasPrice: quote.gasPrice,
    // 0x-API cannot estimate gas in forked mode.
    ...(FORKED ? {} : { gas : quote.gas }),
}));
}
*/