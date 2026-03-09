import * as Ariakit from '@ariakit/react'
import { startTransition, type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { getAnchorRect, replaceValue } from '../utils/entitySuggestions'
import { useGetEntities, type EntityResult } from './useGetEntities'
import { detectTrigger, calculateComboboxPlacement } from './useTriggerDetection'

interface EntityData extends Pick<EntityResult, 'id' | 'name' | 'type'> {}

interface UseEntityComboboxOptions {
	promptInputRef: RefObject<HTMLTextAreaElement | null>
	currentValue: string
	applyPromptEdit: (edit: {
		nextValue: string
		selectionStart?: number
		selectionEnd?: number
		focus?: boolean
	}) => void
}

export function useEntityCombobox({ promptInputRef, currentValue, applyPromptEdit }: UseEntityComboboxOptions) {
	const [isTriggerOnly, setIsTriggerOnly] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [entityVersion, setEntityVersion] = useState(0)
	const entitiesRef = useRef<Set<string>>(new Set())
	const entitiesMapRef = useRef<Map<string, EntityData>>(new Map())
	const isComposingRef = useRef(false)

	const combobox = Ariakit.useComboboxStore()

	const { data: matches, isFetching, isLoading } = useGetEntities(searchTerm)

	const hasMatches = !!matches && matches.length > 0

	useEffect(() => {
		combobox.render()
	}, [combobox])

	useEffect(() => {
		return () => {
			combobox.hide()
		}
	}, [combobox])

	const updatePlacement = useCallback(
		(textarea: HTMLTextAreaElement) => {
			const nextPlacement = calculateComboboxPlacement(textarea, getAnchorRect)
			if (combobox.getState().placement !== nextPlacement) {
				combobox.setState('placement', nextPlacement)
			}
		},
		[combobox]
	)

	const runTriggerDetection = useCallback(
		(textarea: HTMLTextAreaElement) => {
			const triggerState = detectTrigger(textarea)

			updatePlacement(textarea)

			if (triggerState.isActive && !triggerState.isTriggerOnly) {
				setIsTriggerOnly(false)
				combobox.show()
				startTransition(() => setSearchTerm(triggerState.searchValueWithTrigger))
			} else if (triggerState.isActive && triggerState.isTriggerOnly) {
				setIsTriggerOnly(true)
				combobox.show()
				startTransition(() => setSearchTerm(triggerState.searchValueWithTrigger))
			} else {
				setIsTriggerOnly(false)
				startTransition(() => setSearchTerm(''))
				combobox.hide()
			}
		},
		[updatePlacement, combobox]
	)

	const handleScroll = () => {
		const textarea = promptInputRef.current
		if (textarea) {
			updatePlacement(textarea)
		}
		combobox.render()
	}

	const handleChange = (textarea: HTMLTextAreaElement) => {
		// Skip trigger detection during IME composition (Japanese/Chinese/Korean input)
		if (isComposingRef.current) {
			return
		}

		runTriggerDetection(textarea)
	}

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const textarea = promptInputRef.current
		if (!textarea) return

		// Skip all keyboard handling during IME composition
		if (isComposingRef.current || event.nativeEvent.isComposing) {
			return
		}

		// Handle backspace/delete for entity removal
		if (event.key === 'Backspace' || event.key === 'Delete') {
			const { selectionStart, selectionEnd, value } = textarea

			if (selectionStart !== selectionEnd) return

			const isBackspace = event.key === 'Backspace'
			const checkPos = isBackspace ? selectionStart - 1 : selectionStart

			for (const entityName of entitiesRef.current) {
				const entityIndex = value.indexOf(entityName, Math.max(0, checkPos - entityName.length))
				if (entityIndex === -1 || entityIndex > checkPos) continue

				const entityEnd = entityIndex + entityName.length
				if (checkPos >= entityIndex && checkPos < entityEnd) {
					event.preventDefault()
					const newValue = value.slice(0, entityIndex) + value.slice(entityEnd)

					startTransition(() => setSearchTerm(''))
					combobox.hide()

					entitiesRef.current.delete(entityName)
					entitiesMapRef.current.delete(entityName)
					setEntityVersion((version) => version + 1)
					applyPromptEdit({
						nextValue: newValue,
						selectionStart: entityIndex,
						selectionEnd: entityIndex
					})
					return
				}
			}
		}

		// Handle tab for autocomplete
		if (event.key === 'Tab' && combobox.getState().renderedItems.length > 0) {
			event.preventDefault()
			const activeValue = combobox.getState().activeValue
			if (activeValue && matches && matches.length > 0) {
				const activeItem = matches.find((item) => item.id === activeValue)
				if (activeItem) {
					selectEntity(activeItem)
				}
			}
		}
	}

	const selectEntity = ({ id, name, type }: EntityData) => {
		const textarea = promptInputRef.current
		if (!textarea) return

		const triggerState = detectTrigger(textarea)
		if (triggerState.triggerOffset === -1) return

		entitiesRef.current.add(name)
		entitiesMapRef.current.set(name, { id, name, type })
		setEntityVersion((version) => version + 1)

		const getNewValue = replaceValue(triggerState.triggerOffset, triggerState.searchValue, name)
		const newValue = getNewValue(currentValue)
		const selectionStart = triggerState.triggerOffset + name.length + 1

		startTransition(() => setSearchTerm(''))
		combobox.hide()
		applyPromptEdit({
			nextValue: newValue,
			selectionStart,
			selectionEnd: selectionStart,
			focus: true
		})
	}

	const getFinalEntities = () => {
		return Array.from(entitiesRef.current)
			.map((name) => {
				const data = entitiesMapRef.current.get(name)
				if (!data) return null
				return {
					term: name,
					slug: data.id
				}
			})
			.filter((entity) => entity !== null && currentValue.includes(entity.term)) as Array<{
			term: string
			slug: string
		}>
	}

	const restoreEntities = useCallback((entities?: Array<{ term: string; slug: string }>) => {
		entitiesRef.current.clear()
		entitiesMapRef.current.clear()
		if (entities && entities.length > 0) {
			for (const { term, slug } of entities) {
				entitiesRef.current.add(term)
				entitiesMapRef.current.set(term, { id: slug, name: term, type: '' })
			}
		}
		setEntityVersion((version) => version + 1)
	}, [])

	const resetCombobox = useCallback(() => {
		startTransition(() => setSearchTerm(''))
		combobox.hide()
		entitiesRef.current.clear()
		entitiesMapRef.current.clear()
		setEntityVersion((version) => version + 1)
	}, [combobox])

	// IME composition handlers for Japanese/Chinese/Korean input
	const handleCompositionStart = () => {
		isComposingRef.current = true
	}

	const handleCompositionEnd = useCallback(() => {
		isComposingRef.current = false
		const textarea = promptInputRef.current
		if (textarea) {
			runTriggerDetection(textarea)
		}
	}, [promptInputRef, runTriggerDetection])

	const hasRenderedItems = combobox.getState().renderedItems.length > 0

	const clearSearch = useCallback(() => {
		startTransition(() => setSearchTerm(''))
		combobox.hide()
	}, [combobox])

	return {
		combobox,
		searchTerm,
		matches,
		hasMatches,
		isFetching,
		isLoading,
		isTriggerOnly,
		entityVersion,
		entitiesRef,
		hasRenderedItems,
		handleScroll,
		handleChange,
		handleKeyDown,
		handleCompositionStart,
		handleCompositionEnd,
		selectEntity,
		getFinalEntities,
		restoreEntities,
		resetCombobox,
		clearSearch
	}
}
