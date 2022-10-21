import * as matcha from "./adapters/0x"
import * as inch from "./adapters/1inch"
import * as cowswap from "./adapters/cowswap"
import * as firebird from "./adapters/firebird"
import * as kyberswap from "./adapters/kyberswap"
import * as openocean from "./adapters/openocean"
import * as paraswap from "./adapters/paraswap"
// import * as unidex from "./adapters/unidex" - disabled, their api is broken
import * as airswap from "./adapters/airswap"
//import * as odos from "./adapters/odos" - disabled, cors errors
import * as yieldyak from "./adapters/yieldyak"
import * as krystal from "./adapters/krystal"

const adapters = [matcha, inch, cowswap, firebird, kyberswap, openocean, paraswap, airswap, yieldyak, krystal]

export function getAllChains(){
  const chains = new Set<string>()
  for(const adapter of adapters){
    Object.keys(adapter.chainToId).forEach(chain=>chains.add(chain))
  }
  return Array.from(chains)
}

export function listRoutes(chain: string, from: string, to:string, amount:string){
  return Promise.all(adapters.filter(adap=>adap.chainToId[chain]!==undefined).map(async adapter=>{
    let price = "failure" as any
    try{
      price = await adapter.getQuote(chain, from, to, amount, {
        userAddress: "0x41c0cf92cd178173edcb7e9e61fe3de9ae826b82" // random address
      })
    }catch(e){
      console.error(e)
    }
    return {
      price,
      name: adapter.name
    }
  }))
}