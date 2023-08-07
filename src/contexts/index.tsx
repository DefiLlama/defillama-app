import LocalStorageContextProvider, { Updater as LocalStorageContextUpdater } from '~/contexts/LocalStorage'

export const AppContext = ({ noContext, children }) => {
	if (noContext) {
		return <>{children}</>
	}

	return (
		<LocalStorageContextProvider>
			<LocalStorageContextUpdater />
			{children}
		</LocalStorageContextProvider>
	)
}
