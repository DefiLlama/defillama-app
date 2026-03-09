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

interface SelectedEntity {
	term: string
	slug: string
	type: string
}

export function useEntityCombobox({ promptInputRef, currentValue, applyPromptEdit }: UseEntityComboboxOptions) {
	const [isTriggerOnly, setIsTriggerOnly] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedEntities, setSelectedEntities] = useState<SelectedEntity[]>([])
	const isComposingRef = useRef(false)

	const combobox = Ariakit.useComboboxStore()

	const { data: matches, isFetching, isLoading } = useGetEntities(searchTerm)

	const hasMatches = !!matches && matches.length > 0

	// Re-render Ariakit's popover positioning whenever the combobox state changes.
	useEffect(() => {
		combobox.render()
	}, [combobox])

	// Always hide the popover on unmount so stale UI never lingers across route changes.
	useEffect(() => {
		return () => {
			combobox.hide()
		}
	}, [combobox])

	// Keep the popover above or below the textarea depending on the available viewport space.
	const updatePlacement = useCallback(
		(textarea: HTMLTextAreaElement) => {
			const nextPlacement = calculateComboboxPlacement(textarea, getAnchorRect)
			if (combobox.getState().placement !== nextPlacement) {
				combobox.setState('placement', nextPlacement)
			}
		},
		[combobox]
	)

	// Detect whether the caret is inside an entity trigger and update search / popover visibility together.
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

	// Recalculate the anchor position when the textarea scrolls.
	const handleScroll = () => {
		const textarea = promptInputRef.current
		if (textarea) {
			updatePlacement(textarea)
		}
		combobox.render()
	}

	// Skip trigger detection during IME composition so partially-composed text is not treated as a search.
	const handleChange = (textarea: HTMLTextAreaElement) => {
		// Skip trigger detection during IME composition (Japanese/Chinese/Korean input)
		if (isComposingRef.current) {
			return
		}

		runTriggerDetection(textarea)
	}

	// Own keyboard behavior for entity deletion and tab-complete while the combobox is active.
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

			for (const { term: entityName } of selectedEntities) {
				const entityIndex = value.indexOf(entityName, Math.max(0, checkPos - entityName.length))
				if (entityIndex === -1 || entityIndex > checkPos) continue

				const entityEnd = entityIndex + entityName.length
				if (checkPos >= entityIndex && checkPos < entityEnd) {
					event.preventDefault()
					const newValue = value.slice(0, entityIndex) + value.slice(entityEnd)

					startTransition(() => setSearchTerm(''))
					combobox.hide()

					setSelectedEntities((entities) => entities.filter(({ term }) => term !== entityName))
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

	// Replace the active trigger token with the chosen entity label and keep metadata for later submission.
	const selectEntity = ({ id, name, type }: EntityData) => {
		const textarea = promptInputRef.current
		if (!textarea) return

		const triggerState = detectTrigger(textarea)
		if (triggerState.triggerOffset === -1) return

		setSelectedEntities((entities) => {
			const next = entities.filter(({ term }) => term !== name)
			next.push({ term: name, slug: id, type })
			return next
		})

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

	// Convert the current entity set back into the prompt payload expected by submit handlers.
	const getFinalEntities = () => {
		return selectedEntities
			.filter(({ term }) => currentValue.includes(term))
			.map(({ term, slug }) => ({
				term,
				slug
			}))
	}

	// Restore entity metadata after a failed prompt is retried back into the input.
	const restoreEntities = useCallback((entities?: Array<{ term: string; slug: string }>) => {
		setSelectedEntities(
			entities?.map(({ term, slug }) => ({
				term,
				slug,
				type: ''
			})) ?? []
		)
	}, [])

	// Fully clear combobox UI plus cached entity metadata when the input is reset.
	const resetCombobox = useCallback(() => {
		startTransition(() => setSearchTerm(''))
		combobox.hide()
		setSelectedEntities([])
	}, [combobox])

	// IME composition handlers for Japanese/Chinese/Korean input
	const handleCompositionStart = () => {
		isComposingRef.current = true
	}

	// Re-run trigger detection once IME composition commits the final text into the textarea.
	const handleCompositionEnd = useCallback(() => {
		isComposingRef.current = false
		const textarea = promptInputRef.current
		if (textarea) {
			runTriggerDetection(textarea)
		}
	}, [promptInputRef, runTriggerDetection])

	const hasRenderedItems = combobox.getState().renderedItems.length > 0

	// Clear the current combobox search without touching already-selected entities.
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
		selectedEntities,
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
