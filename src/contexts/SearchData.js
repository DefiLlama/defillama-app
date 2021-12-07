import React, { createContext, useContext } from 'react'

const SearchDataContext = createContext({
  protocolNames: [],
  chainsSet: []
})

export const useSearchData = () => {
  const contextData = useContext(SearchDataContext)
  return contextData
}

export default function Provider({ children, protocolsAndChains }) {
  return <SearchDataContext.Provider value={protocolsAndChains}>{children}</SearchDataContext.Provider>
}
