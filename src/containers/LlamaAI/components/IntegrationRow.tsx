import { useEffect, useState } from 'react'
import type { TelegramStatus } from '~/containers/LlamaAI/api/telegram'
import { useIntegrationLink } from '~/containers/LlamaAI/hooks/useIntegrationLink'

export type IntegrationKind = 'telegram'

type Props = {
	kind: IntegrationKind
	title: string
	description: string
	glyph?: React.ReactNode
	initialStatus?: TelegramStatus | null
	initialTgloginToken?: string | null
	onInitialStateConsumed?: () => void
}

function formatHandle(raw: string | null | undefined): string {
	if (!raw) return ''
	return raw.startsWith('@') ? raw : `@${raw}`
}

export function IntegrationRow({
	kind,
	title,
	description,
	glyph,
	initialStatus,
	initialTgloginToken,
	onInitialStateConsumed
}: Props) {
	const link = useIntegrationLink({
		initialStatus: kind === 'telegram' ? initialStatus : null,
		initialTgloginToken: kind === 'telegram' ? initialTgloginToken : null
	})

	useEffect(() => {
		if (initialTgloginToken && onInitialStateConsumed) onInitialStateConsumed()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const [codeDraft, setCodeDraft] = useState('')
	const [inlineError, setInlineError] = useState<string | null>(null)

	return (
		<div className="rounded-xl border border-black/[0.06] bg-black/[0.015] p-4 dark:border-white/[0.06] dark:bg-white/[0.015]">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					{glyph}
					<div className="min-w-0">
						<p className="m-0 text-[13.5px] font-medium text-[#1a1a1a] dark:text-white">{title}</p>
						<p className="m-0 mt-0.5 text-xs text-[#777] dark:text-[#919296]">{description}</p>
					</div>
				</div>
				{link.state.status === 'linked' ? (
					<div className="flex shrink-0 flex-col items-end gap-2">
						<span className="text-[12px] whitespace-nowrap text-[#777] dark:text-[#919296]">
							Linked as {formatHandle(link.state.username)}
						</span>
						<div className="flex gap-2">
							<button
								onClick={() => link.disconnect()}
								className="shrink-0 rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs whitespace-nowrap hover:bg-black/[0.04] dark:border-white/[0.08] dark:hover:bg-white/[0.04]"
							>
								Disconnect
							</button>
							<button
								onClick={() => link.connect()}
								className="shrink-0 rounded-lg bg-[#1853A8] px-3 py-1.5 text-xs whitespace-nowrap text-white hover:bg-[#1853A8]/90 dark:bg-[#4B86DB]"
							>
								Switch account
							</button>
						</div>
					</div>
				) : link.state.status === 'idle' || link.state.status === 'starting' ? (
					<button
						disabled={link.state.status === 'starting'}
						onClick={() => link.connect()}
						className="shrink-0 rounded-lg bg-[#1853A8] px-3 py-1.5 text-xs whitespace-nowrap text-white disabled:opacity-50 dark:bg-[#4B86DB]"
					>
						{link.state.status === 'starting' ? 'Opening…' : 'Connect'}
					</button>
				) : null}
			</div>

			{link.state.status === 'awaiting_tg' && (
				<div className="mt-3 rounded-lg bg-black/[0.04] p-3 text-xs text-[#777] dark:bg-white/[0.04] dark:text-[#919296]">
					Waiting for confirmation in Telegram…
					{link.state.showFallback && (
						<div className="mt-2">
							Didn&apos;t see Telegram open?{' '}
							<a href={link.state.deepLink} target="_blank" rel="noopener" className="underline">
								DM /start to the bot
							</a>
							.
						</div>
					)}
				</div>
			)}

			{link.state.status === 'awaiting_code' && (
				<form
					onSubmit={(e) => {
						e.preventDefault()
						setInlineError(null)
						link.confirmCode(codeDraft).catch((err: any) => {
							setInlineError(err?.body?.error || err?.message || 'Invalid code')
						})
					}}
					className="mt-3 flex gap-2"
				>
					<input
						value={codeDraft}
						onChange={(e) => setCodeDraft(e.target.value.replace(/\D/g, '').slice(0, 6))}
						placeholder="6-digit code from Telegram"
						maxLength={6}
						inputMode="numeric"
						className="flex-1 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-sm dark:border-white/[0.08] dark:bg-[#1a1b1c]"
					/>
					<button
						type="submit"
						disabled={codeDraft.length !== 6}
						className="rounded-lg bg-[#1853A8] px-3 py-1.5 text-xs text-white disabled:opacity-50 dark:bg-[#4B86DB]"
					>
						Confirm
					</button>
				</form>
			)}

			{link.state.status === 'awaiting_code' && inlineError && (
				<div className="mt-2 text-xs text-red-600 dark:text-red-400">{inlineError}</div>
			)}

			{link.state.status === 'switch_confirm' && (
				<div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-xs dark:bg-amber-900/20">
					<p className="m-0 mb-2">
						You&apos;re already linked to {formatHandle(link.state.currentTelegramUsername)}. Switch to this Telegram?
					</p>
					<div className="flex gap-2">
						<button
							onClick={() => link.confirmSwitch()}
							className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs text-white"
						>
							Yes, switch
						</button>
						<button
							onClick={() => link.cancelSwitch()}
							className="rounded-lg border border-black/[0.1] px-3 py-1.5 text-xs"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{link.state.status === 'error' && (
				<div className="mt-3 rounded-lg border border-red-500/40 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-200">
					{link.state.message}
				</div>
			)}
		</div>
	)
}
