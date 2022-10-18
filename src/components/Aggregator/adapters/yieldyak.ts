import {ethers} from "ethers"
import { providers } from "../rpcs"

// Source https://github.com/yieldyak/yak-aggregator
export const chainToId = {
  avax: "0xC4729E56b831d74bBc18797e0e17A295fA77488c",
}

export const name = "YieldYak"
export const token = "YAK"

export function approvalAddress(chain: string){
  return chainToId[chain]
}

export async function getQuote(chain: string, from: string, to:string, amount:string){
  const routerContract = new ethers.Contract(chainToId[chain], [
    "function findBestPathWithGas(uint256 _amountIn,address _tokenIn,address _tokenOut,uint256 _maxSteps,uint256 _gasPrice) external view returns (FormattedOffer memory)"
  ], providers[chain])
  const gasPrice = 33 // gwei
  const data = await routerContract.findBestPathWithGas(amount, from, to, 3, gasPrice)
  return {
    amountReturned: data.amounts[data.amounts.length - 1],
    estimatedGas: data.gasEstimate, // Gas estimates only include gas-cost of swapping and querying on adapter and not intermediate logic, nor tx-gas-cost.
  }
}