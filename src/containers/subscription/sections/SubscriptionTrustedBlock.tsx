export function SubscriptionTrustedBlock({ trustLogos }: { trustLogos: string[] }) {
	return (
		<div className="flex w-full flex-col items-center md:w-auto">
			<div className="flex w-full flex-col items-center gap-2 text-center md:w-[448px] md:gap-4">
				<h2 className="text-[20px] leading-7 font-semibold text-(--sub-c-111f34) dark:text-white md:text-(--sub-c-090b0c) dark:md:text-white">
					Trusted by DeFi Natives and Global Regulators
				</h2>
				<p className="text-[12px] leading-4 text-(--sub-c-617389) dark:text-(--sub-c-c6c6c6) md:text-[14px] md:leading-[21px] md:text-(--sub-c-484848) dark:md:text-(--sub-c-c6c6c6)">
					From top crypto exchanges to global central banks
				</p>
			</div>

			<div className="mt-6 grid w-full grid-cols-2 gap-x-4 gap-y-4 md:mt-9 md:w-[1184px] md:grid-cols-4">
				{trustLogos.map((src) => (
					<div
						key={src}
						className="flex h-[56px] items-center justify-center md:h-[68px]"
					>
						<img
							src={src}
							alt=""
							className="max-h-[28px] max-w-[150px] object-contain brightness-0 opacity-70 dark:brightness-100 dark:opacity-90 md:max-h-[40px] md:max-w-[210px]"
						/>
					</div>
				))}
			</div>
			<div className="mt-2 flex h-[56px] w-full items-center justify-center md:mt-4 md:h-[68px] md:w-[284px]">
				<img
					src="/assets/trusts-llama/cftc.svg"
					alt=""
					className="max-h-[30px] object-contain brightness-0 opacity-70 dark:brightness-100 dark:opacity-90 md:max-h-[41px]"
				/>
			</div>
		</div>
	)
}
