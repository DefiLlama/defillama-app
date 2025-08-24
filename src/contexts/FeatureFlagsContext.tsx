import { createContext, useContext, ReactNode } from 'react'
import { useFeatureFlags, FeatureFlags } from '~/hooks/useFeatureFlags'

interface FeatureFlagsContextType {
	flags: FeatureFlags
	loading: boolean
	error: string | null
	refetch: () => void
	hasFeature: (feature: keyof FeatureFlags) => boolean
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined)

export const FeatureFlagsProvider = ({ children }: { children: ReactNode }) => {
	const { flags, loading, error, refetch } = useFeatureFlags()

	const hasFeature = (feature: keyof FeatureFlags): boolean => {
		return Boolean(flags[feature])
	}

	const contextValue: FeatureFlagsContextType = {
		flags,
		loading,
		error,
		refetch,
		hasFeature
	}

	return <FeatureFlagsContext.Provider value={contextValue}>{children}</FeatureFlagsContext.Provider>
}

export const useFeatureFlagsContext = () => {
	const context = useContext(FeatureFlagsContext)
	if (context === undefined) {
		throw new Error('useFeatureFlagsContext must be used within a FeatureFlagsProvider')
	}
	return context
}