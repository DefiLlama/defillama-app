import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { AI_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscription/auth'
import { removeStorageItem, setStorageItem, useStorageItem } from '~/contexts/localStorageStore'
import { getErrorMessage } from '~/utils/error'

export const LLAMA_AI_CUSTOM_INSTRUCTIONS_KEY = 'llamaai-custom-instructions'
export const LLAMA_AI_ENABLE_MEMORY_KEY = 'llamaai-enable-memory'
export const LLAMA_AI_ENABLE_PREMIUM_TOOLS_KEY = 'llamaai-enable-premium-tools'
export const LLAMA_AI_HACKER_MODE_KEY = 'llamaai-hacker-mode'
export const LLAMA_AI_MODEL_KEY = 'llamaai-model'
export const LLAMA_AI_ENABLE_SOUND_KEY = 'llamaai-enable-sound'
export const LLAMA_AI_SETTINGS_QUERY_KEY = ['llama-ai-settings'] as const

export interface LlamaAISettings {
	customInstructions: string
	enableMemory: boolean
	enablePremiumTools: boolean
	hackerMode: boolean
	model: string
	enableSoundNotifications: boolean
}

export interface LlamaAISettingsActions {
	setCustomInstructions: (value: string) => Promise<void>
	setEnableMemory: (value: boolean) => Promise<void>
	setEnablePremiumTools: (value: boolean) => Promise<void>
	setHackerMode: (value: boolean) => Promise<void>
	setModel: (value: string) => Promise<void>
	setEnableSoundNotifications: (value: boolean) => Promise<void>
}

type LlamaAISettingKey = keyof LlamaAISettings
type LlamaAISettingsUpdate = Partial<LlamaAISettings>
type StoredLlamaAISettings = Partial<LlamaAISettings> | null

export interface ModelOption {
	id: string
	label: string
}

export type TipDTO = {
	id: string
	family: string
	variant: string
	title: string
	cta:
		| { kind: 'link'; label: string; href: string; external: boolean }
		| { kind: 'action'; label: string; action: string }
		| { kind: 'none' }
	dismissPolicy: { kind: 'permanent' } | { kind: 'snooze'; days: number }
}

interface SettingsQueryResult {
	settings: StoredLlamaAISettings
	availableModels: ModelOption[]
	tip: TipDTO | null
}

const DEFAULT_SETTINGS: LlamaAISettings = {
	customInstructions: '',
	enableMemory: true,
	enablePremiumTools: true,
	hackerMode: false,
	model: '',
	enableSoundNotifications: true
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const parseTrueByDefault = (value: string | null) => value !== 'false'
const parseFalseByDefault = (value: string | null) => value === 'true'

function readStoredValue<K extends LlamaAISettingKey>(key: K, value: string | null): LlamaAISettings[K] {
	switch (key) {
		case 'customInstructions':
			return (value ?? DEFAULT_SETTINGS.customInstructions) as LlamaAISettings[K]
		case 'enableMemory':
			return parseTrueByDefault(value) as LlamaAISettings[K]
		case 'enablePremiumTools':
			return parseTrueByDefault(value) as LlamaAISettings[K]
		case 'hackerMode':
			return parseFalseByDefault(value) as LlamaAISettings[K]
		case 'model':
			return (value ?? DEFAULT_SETTINGS.model) as LlamaAISettings[K]
		case 'enableSoundNotifications':
			return parseTrueByDefault(value) as LlamaAISettings[K]
	}
}

function writeStoredValue<K extends LlamaAISettingKey>(key: K, value: LlamaAISettings[K]) {
	switch (key) {
		case 'customInstructions': {
			const nextValue = String(value).trim()
			if (nextValue.length === 0) {
				removeStorageItem(LLAMA_AI_CUSTOM_INSTRUCTIONS_KEY)
			} else {
				setStorageItem(LLAMA_AI_CUSTOM_INSTRUCTIONS_KEY, nextValue)
			}
			return
		}
		case 'enableMemory':
			setStorageItem(LLAMA_AI_ENABLE_MEMORY_KEY, String(value))
			return
		case 'enablePremiumTools':
			setStorageItem(LLAMA_AI_ENABLE_PREMIUM_TOOLS_KEY, String(value))
			return
		case 'hackerMode':
			setStorageItem(LLAMA_AI_HACKER_MODE_KEY, String(value))
			return
		case 'model': {
			const nextModel = String(value).trim()
			if (nextModel.length === 0) {
				removeStorageItem(LLAMA_AI_MODEL_KEY)
			} else {
				setStorageItem(LLAMA_AI_MODEL_KEY, nextModel)
			}
			return
		}
		case 'enableSoundNotifications':
			setStorageItem(LLAMA_AI_ENABLE_SOUND_KEY, String(value))
			return
	}
}

function applyStoredSettings(update: LlamaAISettingsUpdate) {
	for (const [key, value] of Object.entries(update) as Array<[LlamaAISettingKey, LlamaAISettings[LlamaAISettingKey]]>) {
		writeStoredValue(key, value)
	}
}

function mergeDefinedSettings(base: StoredLlamaAISettings, incoming: LlamaAISettingsUpdate): StoredLlamaAISettings {
	const merged: Partial<LlamaAISettings> = { ...(base ?? {}) }
	const target = merged as Record<LlamaAISettingKey, LlamaAISettings[LlamaAISettingKey]>
	for (const [key, value] of Object.entries(incoming) as Array<
		[LlamaAISettingKey, LlamaAISettings[LlamaAISettingKey]]
	>) {
		if (value !== undefined) {
			target[key] = value
		}
	}
	return merged
}

function normalizeServerSettings(value: unknown): LlamaAISettingsUpdate {
	if (!isRecord(value)) return {}

	const normalized: LlamaAISettingsUpdate = {}
	if (typeof value.customInstructions === 'string') {
		normalized.customInstructions = value.customInstructions
	}
	if (typeof value.enableMemory === 'boolean') {
		normalized.enableMemory = value.enableMemory
	}
	if (typeof value.enablePremiumTools === 'boolean') {
		normalized.enablePremiumTools = value.enablePremiumTools
	}
	if (typeof value.hackerMode === 'boolean') {
		normalized.hackerMode = value.hackerMode
	}
	if (typeof value.model === 'string') {
		normalized.model = value.model
	}
	if (typeof value.enableSoundNotifications === 'boolean') {
		normalized.enableSoundNotifications = value.enableSoundNotifications
	}
	return normalized
}

function getStorageKey(setting: LlamaAISettingKey) {
	switch (setting) {
		case 'customInstructions':
			return LLAMA_AI_CUSTOM_INSTRUCTIONS_KEY
		case 'enableMemory':
			return LLAMA_AI_ENABLE_MEMORY_KEY
		case 'enablePremiumTools':
			return LLAMA_AI_ENABLE_PREMIUM_TOOLS_KEY
		case 'hackerMode':
			return LLAMA_AI_HACKER_MODE_KEY
		case 'model':
			return LLAMA_AI_MODEL_KEY
		case 'enableSoundNotifications':
			return LLAMA_AI_ENABLE_SOUND_KEY
	}
}

export function useLlamaAISetting<K extends LlamaAISettingKey>(key: K): LlamaAISettings[K] {
	const fallback =
		key === 'customInstructions'
			? DEFAULT_SETTINGS.customInstructions
			: String(DEFAULT_SETTINGS[key as Exclude<LlamaAISettingKey, 'customInstructions'>])
	const rawValue = useStorageItem(getStorageKey(key), fallback)
	return readStoredValue(key, rawValue)
}

export function useLlamaAISettings() {
	const { authorizedFetch, isAuthenticated, user } = useAuthContext()
	const queryClient = useQueryClient()
	const userId = user?.id ?? null

	const customInstructions = useLlamaAISetting('customInstructions')
	const enableMemory = useLlamaAISetting('enableMemory')
	const enablePremiumTools = useLlamaAISetting('enablePremiumTools')
	const hackerMode = useLlamaAISetting('hackerMode')
	const model = useLlamaAISetting('model')
	const enableSoundNotifications = useLlamaAISetting('enableSoundNotifications')

	const settingsQuery = useQuery({
		queryKey: [...LLAMA_AI_SETTINGS_QUERY_KEY, userId],
		queryFn: async (): Promise<SettingsQueryResult> => {
			if (!authorizedFetch || !isAuthenticated || !userId) return { settings: null, availableModels: [], tip: null }
			const response = await authorizedFetch(`${AI_SERVER}/user-settings`)
			if (!response?.ok) return { settings: null, availableModels: [], tip: null }
			const data = (await response.json().catch(() => null)) as {
				settings?: unknown
				availableModels?: ModelOption[]
				tip?: TipDTO | null
			} | null
			return {
				settings: normalizeServerSettings(data?.settings),
				availableModels: Array.isArray(data?.availableModels) ? data.availableModels : [],
				tip: data?.tip ?? null
			}
		},
		enabled: isAuthenticated && !!userId,
		staleTime: 5 * 60 * 1000
	})

	useEffect(() => {
		if (!settingsQuery.data?.settings) return
		applyStoredSettings(settingsQuery.data.settings)
	}, [settingsQuery.data])

	useEffect(() => {
		if (userId) return
		queryClient.removeQueries({ queryKey: [...LLAMA_AI_SETTINGS_QUERY_KEY] })
	}, [queryClient, userId])

	const persistSettingsMutation = useMutation({
		mutationFn: async (update: LlamaAISettingsUpdate) => {
			if (!authorizedFetch || !isAuthenticated || !userId) return update
			const response = await authorizedFetch(`${AI_SERVER}/user-settings`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ settings: update })
			})
			if (!response?.ok) {
				throw new Error('Failed to persist LlamaAI settings')
			}
			return update
		},
		onMutate: async (update) => {
			await queryClient.cancelQueries({ queryKey: [...LLAMA_AI_SETTINGS_QUERY_KEY, userId] })
			applyStoredSettings(update)
			queryClient.setQueryData<SettingsQueryResult>([...LLAMA_AI_SETTINGS_QUERY_KEY, userId], (previous) => ({
				settings: mergeDefinedSettings(previous?.settings ?? null, update),
				availableModels: previous?.availableModels ?? [],
				tip: previous?.tip ?? null
			}))
		},
		onError: (error) => {
			console.error('[llama-ai] failed to persist settings:', getErrorMessage(error))
		}
	})

	const persistSettings = useCallback(
		async (update: LlamaAISettingsUpdate) => {
			if (!isAuthenticated || !userId) {
				applyStoredSettings(update)
				return
			}
			try {
				await persistSettingsMutation.mutateAsync(update)
			} catch {}
		},
		[isAuthenticated, persistSettingsMutation, userId]
	)

	const actions = useMemo<LlamaAISettingsActions>(
		() => ({
			setCustomInstructions: async (value: string) => persistSettings({ customInstructions: value.trim() }),
			setEnableMemory: async (value: boolean) => persistSettings({ enableMemory: value }),
			setEnablePremiumTools: async (value: boolean) => persistSettings({ enablePremiumTools: value }),
			setHackerMode: async (value: boolean) => persistSettings({ hackerMode: value }),
			setModel: async (value: string) => persistSettings({ model: value }),
			setEnableSoundNotifications: async (value: boolean) => persistSettings({ enableSoundNotifications: value })
		}),
		[persistSettings]
	)

	const availableModels = useMemo(
		() => settingsQuery.data?.availableModels ?? [],
		[settingsQuery.data?.availableModels]
	)

	const settings = useMemo<LlamaAISettings>(() => {
		const normalizedModel =
			model === '' || availableModels.length === 0 || availableModels.some((m) => m.id === model) ? model : ''
		return {
			customInstructions,
			enableMemory,
			enablePremiumTools,
			hackerMode,
			model: normalizedModel,
			enableSoundNotifications
		}
	}, [
		customInstructions,
		enableMemory,
		enablePremiumTools,
		hackerMode,
		model,
		availableModels,
		enableSoundNotifications
	])

	return {
		settings,
		actions,
		availableModels,
		tip: settingsQuery.data?.tip ?? null,
		queryState: settingsQuery
	}
}
