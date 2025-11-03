import { createContext, ReactNode, useContext } from 'react'
import { FeatureFlags, useFeatureFlags } from '~/hooks/useFeatureFlags'

interface FeatureFlagsContextType {
	flags: FeatureFlags
	loading: boolean
	userLoading: boolean
	error: string | null
	refetch: () => void
	hasFeature: (feature: keyof FeatureFlags) => boolean
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined)

export const FeatureFlagsProvider = ({ children }: { children: ReactNode }) => {
	const { flags, loading, error, refetch, userLoading } = useFeatureFlags()

	const hasFeature = (feature: keyof FeatureFlags): boolean => {
		return Boolean(flags[feature])
	}

	const contextValue: FeatureFlagsContextType = {
		flags,
		loading,
		userLoading,
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
