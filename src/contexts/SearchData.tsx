import React, { createContext, useContext } from 'react'

const SearchDataContext = createContext({
    protocols: [],
    chains: [],
})

export const useSearchData = () => useContext(SearchDataContext)

export default function Provider({ children, protocolsAndChains }) {
    return <SearchDataContext.Provider value={protocolsAndChains}>{children}</SearchDataContext.Provider>
}
