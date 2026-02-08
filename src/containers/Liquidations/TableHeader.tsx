import * as React from 'react'
import { TableSwitch } from './TableSwitch'

export const TableHeader = ({ metaText }: { metaText?: string | null }) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--cards-border) p-3">
			<TableSwitch />
			{metaText ? <p className="text-right text-xs text-(--text-label) italic opacity-70">{metaText}</p> : null}
		</div>
	)
}
