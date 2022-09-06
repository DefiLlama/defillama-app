import * as React from 'react'
import dynamic from 'next/dynamic'
import { Header } from './shared'

// TODO update types/react package and remvoe 'any' type
const Desktop: any = dynamic<React.ReactNode>(() => import('./Desktop'), {
	loading: () => <Header />
})

const Mobile: any = dynamic<React.ReactNode>(() => import('./Mobile'), {
	loading: () => <Header />
})

export default function Nav() {
	return (
		<>
			<Mobile />
			<Desktop />
		</>
	)
}
