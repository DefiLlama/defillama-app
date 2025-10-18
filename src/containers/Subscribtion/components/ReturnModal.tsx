import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

interface ReturnModalProps {
	isOpen: boolean
	onClose: () => void
	returnUrl: string
}

export function ReturnModal({ isOpen, onClose, returnUrl }: ReturnModalProps) {
	const router = useRouter()

	const handleStayOnPage = () => {
		const { returnUrl, ...restQuery } = router.query
		router.replace(
			{
				pathname: router.pathname,
				query: restQuery
			},
			undefined,
			{ shallow: true }
		)
		onClose()
	}
	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={() => onClose()}>
			<Ariakit.Dialog
				className="dialog gap-0 border border-[#4a4a50]/10 bg-[#131415] p-0 shadow-[0_0_150px_75px_rgba(92,92,249,0.15),0_0_75px_25px_rgba(123,123,255,0.1)] md:max-w-[400px]"
				portal
				unmountOnHide
			>
				<Ariakit.DialogDismiss className="absolute top-3 right-3 z-20 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white">
					<Icon name="x" className="h-6 w-6" />
				</Ariakit.DialogDismiss>
				<div className="mx-auto max-w-[400px] p-8">
					<h2 className="mb-4 text-center text-2xl font-bold text-white">Welcome Back!</h2>
					<p className="mb-6 text-center text-gray-400">
						Would you like to return to the page you were on before signing in?
					</p>
					<div className="flex flex-col gap-3">
						<BasicLink
							href={returnUrl}
							className="w-full rounded-lg bg-[#5C5CF9] px-4 py-3 text-center font-medium text-white transition-colors hover:bg-[#4A4AF0]"
						>
							Yes, take me back
						</BasicLink>
						<button
							onClick={handleStayOnPage}
							className="w-full rounded-lg bg-[#22242930] px-4 py-3 font-medium text-white transition-colors hover:bg-[#39393E]"
						>
							Stay on this page
						</button>
					</div>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
