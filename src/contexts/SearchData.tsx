import React, { createContext, useContext } from 'react'

const SearchDataContext = createContext({
    protocolNames: [],
    chainsSet: [],
})

export const useSearchData = () => {
    const contextData = useContext(SearchDataContext)
    if (contextData.protocolNames.length === 0) {
        return {
            protocolNames: [{ name: "Uniswap", symbol: "UNI" }, { name: "Maker", symbol: "MKR" }, { name: "Curve", symbol: "CRV" }],
            chainsSet: ["Ethereum", "Solana", "Fantom"]
        }
    }
    return contextData
}

export default function Provider({ children, protocolsAndChains }) {
    return <SearchDataContext.Provider value={protocolsAndChains}>{children}</SearchDataContext.Provider>
}
