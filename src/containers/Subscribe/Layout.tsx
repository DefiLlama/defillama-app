import Link from 'next/link'
import { SEO } from '~/components/SEO'
import { WalletProvider } from '~/layout/WalletProvider'
import { SignIn } from './SignIn'
import Head from 'next/head'

export function SubscribeLayout({ children }) {
	return (
		<WalletProvider>
			<Head>
				<title>Subscribe - DefiLlama</title>
				<link rel="icon" type="image/png" href="/favicon-32x32.png" />
			</Head>
			<SEO />
			<div className="col-span-full w-full flex flex-col">
				<header className="min-h-[64px] py-3 px-5 flex items-center justify-end gap-4">
					<SignIn
						className={`font-medium rounded-lg border border-[#39393E] bg-[#5C5CF9] p-2 flex-1 text-center ml-auto max-w-fit min-w-[120px] shadow-[0px_0px_32px_0px_#5C5CF980] disabled:cursor-not-allowed flex items-center gap-1 justify-center flex-nowrap`}
					/>
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
