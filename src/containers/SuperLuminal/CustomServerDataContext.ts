import { createContext, useContext } from 'react'

export const CustomServerDataContext = createContext<Record<string, unknown>>({})

export function useCustomServerData<T>(key: string): T | undefined {
	const data = useContext(CustomServerDataContext)
	return data[key] as T | undefined
}
