import { ComboboxState } from 'ariakit'

export function findActiveItem(combobox: ComboboxState) {
	return combobox.items.find((item) => !item.disabled && item.id === combobox.activeId)
}
