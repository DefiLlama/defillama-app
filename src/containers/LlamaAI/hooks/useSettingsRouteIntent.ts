import type { NextRouter } from 'next/router'
import { useCallback, useEffect } from 'react'
import {
	getSettingsIntentFromQuery,
	readPendingSettingsIntent,
	stashSettingsIntent,
	type SettingsInitialState
} from '~/containers/LlamaAI/utils/settingsIntent'

type SettingsDialogStore = { show: () => void }

export function useSettingsRouteIntent({
	router,
	user,
	settingsModalStore,
	setInitialIntegrationsState
}: {
	router: NextRouter
	user: unknown
	settingsModalStore: SettingsDialogStore
	setInitialIntegrationsState: (state: SettingsInitialState | null) => void
}) {
	const { isReady, pathname, query, replace } = router
	const openSettingsIntent = useCallback(
		(initialState: SettingsInitialState) => {
			if (initialState.tab || initialState.tgloginToken) setInitialIntegrationsState(initialState)
			settingsModalStore.show()
		},
		[setInitialIntegrationsState, settingsModalStore]
	)

	useEffect(() => {
		if (!isReady) return
		const intent = getSettingsIntentFromQuery(query)
		if (!intent) return

		void replace({ pathname, query: intent.nextQuery }, undefined, {
			shallow: true,
			scroll: false
		})

		if (!user) {
			try {
				stashSettingsIntent(window.sessionStorage, intent.initialState)
			} catch {}
			return
		}

		openSettingsIntent(intent.initialState)
	}, [isReady, openSettingsIntent, pathname, query, replace, user])

	useEffect(() => {
		if (!user) return
		let intent: SettingsInitialState | null = null
		try {
			intent = readPendingSettingsIntent(window.sessionStorage)
		} catch {}
		if (intent) openSettingsIntent(intent)
	}, [openSettingsIntent, user])
}
