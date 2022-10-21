// All info collected from reverse engineering https://app.odos.xyz/
export const chainToId = {
  ethereum: "ethereum",
  polygon: "polygon",
  arbitrum: "arbitrum",
}

export const name = "Odos"
export const token = null

export function approvalAddress(){
  return "0x3373605b97d079593216a99ceF357C57D1D9648e"
}


export async function getQuote(chain: string, from: string, to:string, amount:string){
const data = await fetch("https://app.odos.xyz/request-path", {
  method: "POST",
  body: JSON.stringify({
    "fromValues":[Number(amount)/1e18], // fix
    "fromTokens":[from], // gas token 0x0000000000000000000000000000000000000000
    "toTokens":[to],
    "gasPrice":159.4, // fix
    "lpBlacklist":[],
    "chain": chainToId[chain],
    "slippageAmount":1,
    "walletAddress":null
  }),
  headers: {
    "Content-Type": "application/json"
  }
  }).then(r=>r.json())
  return {
    amountReturned: data.netOutValue,
    estimatedGas: data.gasEstimate,
    tokenApprovalAddress: data.inputDests[0],
  }
}