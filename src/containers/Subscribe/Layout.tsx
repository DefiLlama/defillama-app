import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { SEO } from '~/components/SEO'
import { WalletProvider } from '~/layout/WalletProvider'

export function SubscribeLayout({ children }) {
	return (
		<WalletProvider>
			<SEO />
			<div className="col-span-full w-full flex flex-col">
				<header className="min-h-[64px] py-3 px-5 flex items-center justify-end gap-4">
					{/* <img
						src="/defillama-press-kit/defi/PNG/defillama.png"
						height={32}
						width={94}
						className="object-contain mr-auto"
						alt=""
					/> */}
					<ConnectButton />
				</header>
				{children}
				<footer className="mt-auto py-3 px-5 flex flex-wrap items-center justify-center gap-4 text-[#8a8c90]">
					<a href="mailto:support@llama.fi" className="underline">
						Contact Us
					</a>
					<Link href="/subscribe/privacy-policy" passHref>
						<a className="underline">Privacy Policy</a>
					</Link>
					<Link href="/subscribe/fulfillment-policies" passHref>
						<a className="underline">Fulfillment policies</a>
					</Link>
				</footer>
			</div>
		</WalletProvider>
	)
}
