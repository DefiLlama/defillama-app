import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

interface SubmitButtonProps {
	isStreaming?: boolean
	isPending: boolean
	hasValue: boolean
	onStop?: () => void
}

export function SubmitButton({ isStreaming, isPending, hasValue, onStop }: SubmitButtonProps) {
	if (isStreaming) {
		return (
			<Tooltip
				content="Stop"
				render={<button type="button" onClick={onStop} data-umami-event="llamaai-stop-generation" />}
				className="group flex h-7 w-7 items-center justify-center rounded-lg bg-(--old-blue)/12 hover:bg-(--old-blue)"
			>
				<span className="block h-2 w-2 bg-(--old-blue) group-hover:bg-white group-focus-visible:bg-white sm:h-2.5 sm:w-2.5" />
				<span className="sr-only">Stop</span>
			</Tooltip>
		)
	}

	return (
		<button
			type="submit"
			data-umami-event="llamaai-prompt-submit"
			className="flex h-7 w-7 items-center justify-center gap-2 rounded-lg bg-(--old-blue) text-white hover:bg-(--old-blue)/80 focus-visible:bg-(--old-blue)/80 disabled:opacity-25"
			disabled={isPending || isStreaming || !hasValue}
		>
			<Icon name="arrow-up" height={14} width={14} className="sm:h-4 sm:w-4" />
			<span className="sr-only">Submit prompt</span>
		</button>
	)
}
