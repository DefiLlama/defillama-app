export const SignIn = ({ text, className }: { text?: string; className?: string }) => {
	return (
		<>
			<button
				className={
					className ??
					'font-medium rounded-lg border border-[#39393E] py-[14px] flex-1 text-center mx-auto w-full disabled:cursor-not-allowed'
				}
			>
				{text ?? 'Sign In'}
			</button>
		</>
	)
}
