export function Logo({ animate = false, size = 'default' }: { animate?: boolean; size?: 'default' | 'sm' }) {
	const sm = size === 'sm'
	return (
		<div
			className={`flex select-none ${sm ? 'items-center gap-2' : 'flex-col items-center gap-2.5'}${animate ? ' sl-loader' : ''}`}
		>
			<img
				src="/assets/defillama.webp"
				height={sm ? 24 : 36}
				width={sm ? 94 : 140}
				className="hidden object-contain dark:block"
				alt="DefiLlama"
			/>
			<img
				src="/assets/defillama-dark.webp"
				height={sm ? 24 : 36}
				width={sm ? 94 : 140}
				className="object-contain dark:hidden"
				alt="DefiLlama"
			/>
			<span
				className={
					sm
						? 'rounded-full border border-(--sl-accent)/40 px-2 py-0.5 text-[7px] font-semibold tracking-[0.12em] text-(--sl-accent)/60 uppercase'
						: 'rounded-full border border-(--sl-accent)/40 px-3 py-1 text-[9px] font-semibold tracking-[0.15em] text-(--sl-accent)/60 uppercase'
				}
			>
				{sm ? 'IR' : 'Investor Relationships'}
			</span>
		</div>
	)
}

export function TextLoader() {
	return (
		<div className="sl-loader text-center leading-none select-none">
			<span className="block text-[13px] font-medium tracking-[0.4em] text-(--sl-text-brand)">SUPER</span>
			<span
				className="block text-[34px] font-black tracking-[0.08em] text-transparent"
				style={{ WebkitTextStroke: '1px var(--sl-stroke-brand)' }}
			>
				LUMINAL
			</span>
		</div>
	)
}
