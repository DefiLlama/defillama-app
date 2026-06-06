import { createContext, useContext } from 'react'

export const ContentReadyContext = createContext<() => void>(() => {})

export const useContentReady = () => useContext(ContentReadyContext)
