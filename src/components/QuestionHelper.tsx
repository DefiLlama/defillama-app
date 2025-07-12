import * as React from 'react'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'
import { useIsCoarsePointer } from '~/hooks/useIsCoarsePointer'

export const QuestionHelper = React.memo(function QuestionHelper({
	text,
	disabled,
	...props
}: {
	text: string
	disabled?: boolean
	className?: string
}) {
	const isCoarsePointer = useIsCoarsePointer()

	return (
		<Tooltip content={disabled ? null : text} showOnTap={isCoarsePointer}>
			<Icon name="help-circle" height={16} width={16} {...props} />
		</Tooltip>
	)
})
