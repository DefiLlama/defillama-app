import { Hovercard, HovercardAnchor, HovercardDisclosure, useHovercardState } from 'ariakit/hovercard'
import dayjs from 'dayjs'
import { sum } from 'lodash'
import { useEffect, useState } from 'react'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, tokenIconUrl } from '~/utils'

export const UpcomingEvent = ({
	noOfTokens = [],
	timestamp,
	event,
	price,
	symbol,
	mcap,
	maxSupply,
	name,
	isProtocolPage = false
}) => {
	const tokenPrice = price
	const tokenSymbol = tokenPrice?.symbol?.toUpperCase() || symbol?.toUpperCase()
	const tokens = noOfTokens.reduce((acc, curr) => (acc += curr.length === 2 ? curr[1] - curr[0] : curr[0]), 0)
	const tokenValue = price ? tokens * price : null
	const unlockPercent = maxSupply ? (tokens / maxSupply) * 100 : null
	const unlockPercentFloat = tokenValue && mcap ? (tokenValue / mcap) * 100 : null

	const timeLeft = timestamp - Date.now() / 1e3
	const days = Math.floor(timeLeft / 86400)
	const hours = Math.floor((timeLeft - 86400 * days) / 3600)
	const minutes = Math.floor((timeLeft - 86400 * days - 3600 * hours) / 60)
	const seconds = Math.floor(timeLeft - 86400 * days - 3600 * hours - minutes * 60)
	const [_, rerender] = useState(1)

	const currentUnlockBreakdown = event.map(({ description, noOfTokens, timestamp }) => {
		const regex =
			/(?:of (.+?) tokens (?:will be|were) unlocked)|(?:will (?:increase|decrease) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})|(?:from (.+?) on {timestamp})|(?:was (?:increased|decreased) from \{tokens\[0\]\} to \{tokens\[1]\} tokens per week from (.+?) on {timestamp})/
		const matches = description.match(regex)
		const name = matches?.[1] || matches?.[2] || matches?.[3] || matches?.[4] || ''
		const amount = sum(noOfTokens)
		return {
			name,
			amount,
			timestamp
		}
	})

	useEffect(() => {
		if (timeLeft <= 0) return
		const id = setInterval(() => rerender((value) => value + 1), 1000)

		return () => clearInterval(id)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const hovercard = useHovercardState({ gutter: 8, timeout: 0 })

	if (isProtocolPage) {
		return (
			<span className="rounded-md bg-[var(--bg1)] dark:bg-[#121316] p-4 border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] z-10 flex flex-col gap-2">
				<span className="flex items-center gap-2 justify-between">
					<span className="flex flex-col px-2">
						{tokenValue ? formattedNum(tokenValue, true) : <span>{formattedNum(unlockPercent)}%</span>}
						{unlockPercent ? (
							<span className="text-[var(--text3)]">
								{tokenValue ? formattedNum(unlockPercent) + '%' : null}
								{unlockPercentFloat ? <>({formattedNum(unlockPercentFloat)}% of float)</> : null}
							</span>
						) : null}
					</span>
					<span className="flex flex-col px-2">
						{timeLeft > 0 ? (
							<span className="flex items-center gap-1">
								<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">
									{days}D
								</span>
								<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">
									{hours}H
								</span>
								<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">
									{minutes}M
								</span>
								<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">
									{seconds}S
								</span>
							</span>
						) : (
							<span className="flex items-center justify-end gap-1">
								<span
									className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center"
									style={{ width: 'fit-content', padding: '0px 8px' }}
								>
									{Math.abs(days)} days ago
								</span>
							</span>
						)}
					</span>
				</span>

				<hr className="border-[var(--bg4)]" />
				<span className="flex flex-col gap-4">
					{currentUnlockBreakdown.map(({ name, amount }) => {
						const percentage = (amount / maxSupply) * 100
						const percentageFloat = tokenValue && mcap ? (amount / mcap) * 100 : null
						const usdValue = price ? amount * price : null
						return (
							<span className="flex flex-col gap-1" key={name + amount}>
								<span className="flex items-center justify-between gap-2">
									<span>{name}</span>
									<span>{usdValue ? formattedNum(usdValue, true) : '-'}</span>
								</span>
								<span className="flex items-center justify-between gap-2 text-[var(--text3)]">
									<span>
										{formattedNum(percentage)}%{' '}
										{percentageFloat ? <>({formattedNum(percentageFloat)}% of float)</> : null}
									</span>
									<span>
										{formattedNum(amount)} {tokenSymbol}
									</span>
								</span>
							</span>
						)
					})}
				</span>
			</span>
		)
	}

	return (
		<>
			<HovercardAnchor
				state={hovercard}
				className={'bg-[var(--bg1)] dark:bg-[#121316] p-2 rounded-md flex items-center justify-between'}
			>
				<span className="flex flex-col px-2">
					{tokenValue ? formattedNum(tokenValue, true) : <span>{formattedNum(unlockPercent)}%</span>}
					{unlockPercent ? (
						<span className="text-[var(--text3)]">
							{tokenValue ? formattedNum(unlockPercent) + '%' : null}
							{unlockPercentFloat ? <>({formattedNum(unlockPercentFloat)}% of float)</> : null}
						</span>
					) : null}
				</span>
				<span className="flex flex-col px-2">
					{timeLeft > 0 ? (
						<span className="flex items-center gap-1">
							<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">
								{days}D
							</span>
							<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">
								{hours}H
							</span>
							<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">
								{minutes}M
							</span>
							<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">
								{seconds}S
							</span>
						</span>
					) : (
						<span className="flex items-center justify-end gap-1">
							<span
								className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center"
								style={{ width: 'fit-content', padding: '0px 8px' }}
							>
								{Math.abs(days)} days ago
							</span>
						</span>
					)}
				</span>
			</HovercardAnchor>
			<HovercardDisclosure state={hovercard} />
			{hovercard.mounted ? (
				<Hovercard
					state={hovercard}
					className="rounded-md bg-[var(--bg1)] dark:bg-[#121316] p-4 border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] z-10 flex flex-col gap-2"
				>
					<span className="flex items-center justify-between">
						<span className="flex items-center gap-2">
							<TokenLogo logo={tokenIconUrl(name)} size={30} />
							{tokenSymbol}
						</span>
						<span>{timestamp ? dayjs(timestamp * 1e3).format('MMM D, YYYY') : null}</span>
					</span>
					<hr className="border-[var(--bg4)]" />
					<span className="flex flex-col gap-4">
						{currentUnlockBreakdown.map(({ name, amount }) => {
							const percentage = (amount / maxSupply) * 100
							const percentageFloat = tokenValue && mcap ? (amount / mcap) * 100 : null
							const usdValue = price ? amount * price : null
							return (
								<span className="flex flex-col gap-1" key={name + amount}>
									<span className="flex items-center justify-between gap-2">
										<span>{name}</span>
										<span>{usdValue ? formattedNum(usdValue, true) : '-'}</span>
									</span>
									<span className="flex items-center justify-between gap-2 text-[var(--text3)]">
										<span>
											{formattedNum(percentage)}%{' '}
											{percentageFloat ? <>({formattedNum(percentageFloat)}% of float)</> : null}
										</span>
										<span>
											{formattedNum(amount)} {tokenSymbol}
										</span>
									</span>
								</span>
							)
						})}
					</span>
				</Hovercard>
			) : null}
		</>
	)
}
