import {ethers} from "ethers"
import { providers } from "../rpcs"

// https://about.airswap.io/technology/protocols

// registry addresses
export const chainToId = {
  ethereum: "0x8F9DA6d38939411340b19401E8c54Ea1f51B8f95",
  bsc: "0x9F11691FA842856E44586380b27Ac331ab7De93d",
  polygon: "0x9F11691FA842856E44586380b27Ac331ab7De93d",
  avax: "0xE40feb39fcb941A633deC965Abc9921b3FE962b2",
}

const swapContracts = {
  ethereum: "0x522D6F36c95A1b6509A14272C17747BbB582F2A6",
  bsc: "0x132F13C3896eAB218762B9e46F55C9c478905849",
  polygon: "0x6713C23261c8A9B7D84Dd6114E78d9a7B9863C1a",
  avax: "0xEc08261ac8b3D2164d236bD499def9f82ba9d13F",
}

export const name = "AirSwap"
export const token = "AST"

// https://about.airswap.io/technology/deployments
export function approvalAddress(chain: string){
  return swapContracts[chain]
}

export async function getQuote(chain: string, from: string, to:string, amount:string){
  const discoveryContract = new ethers.Contract(chainToId[chain], [
    "function getURLsForToken(address token) external view returns (string[] memory urls)"
  ], providers[chain])
  const [fromServers, toServers] = await Promise.all([from, to].map(t=>discoveryContract.getURLsForToken(t)))
  const overlappingServers = fromServers.filter(s=>toServers.includes(s))

  const controller = new AbortController()
  // 5 second timeout:
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  const offers = (await Promise.all(overlappingServers.map(s=>fetch(s, {
    method: "POST",
    body: JSON.stringify({
      "jsonrpc": "2.0",
      "id": "78e032d0-2894-42fd-99ce-22dfd14cf65b",
      "method": "getSignerSideOrder", // getSignerSideOrder -> provide input amount, getSenderSideOrder -> provide output amount
      "params": {
        "signerToken": to,
        "senderWallet": "0x3a0e257568cc9c6c5d767d5dc0cd8a9ac69cc3ae", // wrapper contract
        "senderToken": from,
        "senderAmount": amount,
        "swapContract": swapContracts[chain]
      }
    }),
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json"
    }
  }).then(r=>r.json()).then(r=>r.error === undefined?r.result:null).catch(e=>null)))).filter(r=>r!==null)
  const bestOffer = offers.reduce((min, offer)=> offer.signerAmount > min.signerAmount)
  return {
    amountReturned: bestOffer.signerAmount,
    estimatedGas: 200885, // based on a previous tx, needs fixing
    validTo: bestOffer.expiry,
  }
}