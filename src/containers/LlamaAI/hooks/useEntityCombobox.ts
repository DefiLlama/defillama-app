import * as Ariakit from '@ariakit/react'
import { startTransition, type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { getAnchorRect, replaceValue } from '../utils/entitySuggestions'
import { setInputSize } from '../utils/scrollUtils'
import { highlightWord } from '../utils/textUtils'
import { useGetEntities } from './useGetEntities'
import { detectTrigger, calculateComboboxPlacement } from './useTriggerDetection'

interface EntityData {
	id: string
	name: string
	type: string
}

interface UseEntityComboboxOptions {
	promptInputRef: RefObject<HTMLTextAreaElement>
	highlightRef: RefObject<HTMLDivElement>
	setValue: (value: string) => void
}

export function useEntityCombobox({ promptInputRef, highlightRef, setValue }: UseEntityComboboxOptions) {
	const [isTriggerOnly, setIsTriggerOnly] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const entitiesRef = useRef<Set<string>>(new Set())
	const entitiesMapRef = useRef<Map<string, EntityData>>(new Map())
	const isProgrammaticUpdateRef = useRef(false)
	const isComposingRef = useRef(false)

	const combobox = Ariakit.useComboboxStore()

	const { data: matches, isFetching, isLoading } = useGetEntities(searchTerm)

	const hasMatches = matches && matches.length > 0

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

	const handleChange = (currentValue: string) => {
		setValue(currentValue)

		// Always update highlight (fast operation with cached regex)
		if (highlightRef.current) {
			highlightRef.current.innerHTML = highlightWord(currentValue, Array.from(entitiesRef.current))
		}

		if (isProgrammaticUpdateRef.current) {
			isProgrammaticUpdateRef.current = false
			return
		}

		// Skip trigger detection during IME composition (Japanese/Chinese/Korean input)
		if (isComposingRef.current) {
			return
		}

		const textarea = promptInputRef.current
		if (!textarea) return

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

					textarea.value = newValue
					setValue(newValue)
					setInputSize(promptInputRef, highlightRef)
					startTransition(() => setSearchTerm(''))
					combobox.hide()

					entitiesRef.current.delete(entityName)
					entitiesMapRef.current.delete(entityName)

					if (highlightRef.current) {
						highlightRef.current.innerHTML = highlightWord(newValue, Array.from(entitiesRef.current))
					}

					setTimeout(() => {
						textarea.setSelectionRange(entityIndex, entityIndex)
					}, 0)
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

		entitiesRef.current.add(name)
		entitiesMapRef.current.set(name, { id, name, type })

		const getNewValue = replaceValue(triggerState.triggerOffset, triggerState.searchValue, name)
		const newValue = getNewValue(textarea.value)

		startTransition(() => setSearchTerm(''))
		combobox.hide()

		isProgrammaticUpdateRef.current = true
		textarea.value = newValue
		setInputSize(promptInputRef, highlightRef)
		setValue(newValue)

		if (highlightRef.current) {
			highlightRef.current.innerHTML = highlightWord(newValue, Array.from(entitiesRef.current))
		}

		setTimeout(() => {
			textarea.focus()
		}, 0)
	}

	const getFinalEntities = () => {
		const currentValue = promptInputRef.current?.value ?? ''
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

	const restoreEntities = (entities?: Array<{ term: string; slug: string }>) => {
		entitiesRef.current.clear()
		entitiesMapRef.current.clear()
		if (entities && entities.length > 0) {
			for (const { term, slug } of entities) {
				entitiesRef.current.add(term)
				entitiesMapRef.current.set(term, { id: slug, name: term, type: '' })
			}
		}
	}

	const resetCombobox = () => {
		startTransition(() => setSearchTerm(''))
		combobox.hide()
		entitiesRef.current.clear()
		entitiesMapRef.current.clear()
	}

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

	const setIsProgrammaticUpdate = useCallback((value: boolean) => {
		isProgrammaticUpdateRef.current = value
	}, [])

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
		entitiesRef,
		setIsProgrammaticUpdate,
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
