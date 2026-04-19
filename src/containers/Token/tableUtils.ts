import type { Updater } from '@tanstack/react-table'

export const DEFAULT_TABLE_PAGE_SIZE = 10
export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const
export const DEFAULT_TABLE_PLACEHOLDER_MIN_HEIGHT = 494

const isUpdaterFunction = <T>(updater: Updater<T>): updater is (old: T) => T => {
	return typeof updater === 'function'
}

export const resolveUpdater = <T>(updater: Updater<T>, previousValue: T): T => {
	return isUpdaterFunction(updater) ? updater(previousValue) : updater
}
