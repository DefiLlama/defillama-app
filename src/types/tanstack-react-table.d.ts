import type { RowData } from '@tanstack/react-table'

declare module '@tanstack/react-table' {
	interface ColumnMeta<TData extends RowData, TValue> {
		align?: 'start' | 'end' | 'center'
		headerHelperText?: string
		hidden?: boolean
		csvHeader?: string
		/**
		 * Type-only field to satisfy linters about unused generics.
		 * Not used at runtime.
		 */
		__vfType?: [TData, TValue]
	}
}
