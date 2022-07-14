import * as React from 'react'
import {
	TrendingUp,
	HelpCircle,
	Link as LinkLogo,
	CloudDrizzle,
	Minimize2,
	Clock,
	Bookmark,
	RefreshCcw,
	Code,
	Shield,
	Share2,
	Map,
	Book
} from 'react-feather'
import { Entry, Footer } from './shared'

const Paper = () => (
	<svg
		stroke="currentColor"
		fill="currentColor"
		strokeWidth="0"
		viewBox="0 0 512 512"
		height="20px"
		width="20px"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			fill="none"
			strokeLinejoin="round"
			strokeWidth="32"
			d="M368 415.86V72a24.07 24.07 0 00-24-24H72a24.07 24.07 0 00-24 24v352a40.12 40.12 0 0040 40h328"
		></path>
		<path
			fill="none"
			strokeLinejoin="round"
			strokeWidth="32"
			d="M416 464h0a48 48 0 01-48-48V128h72a24 24 0 0124 24v264a48 48 0 01-48 48z"
		></path>
		<path
			fill="none"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="32"
			d="M240 128h64m-64 64h64m-192 64h192m-192 64h192m-192 64h192"
		></path>
		<path d="M176 208h-64a16 16 0 01-16-16v-64a16 16 0 0116-16h64a16 16 0 0116 16v64a16 16 0 01-16 16z"></path>
	</svg>
)

const DefiNav = () => {
	return (
		<>
			<Entry url="/" name="Overview" Icon={TrendingUp} />
			<Entry url="/chains" name="Chains" Icon={LinkLogo} />
			<Entry url="/roundup" name="Roundup" Icon={Paper} newTag />
			<Entry url="https://wiki.defillama.com/wiki/Main_Page" name="Wiki" Icon={Book} newTag />
			<Entry url="/airdrops" name="Airdrops" Icon={CloudDrizzle} />
			<Entry url="/oracles" name="Oracles" Icon={Shield} />
			<Entry url="/forks" name="Forks" Icon={Share2} />
			<Entry url="/watchlist" name="Watchlist" Icon={Bookmark} />
			<Entry url="/top-protocols" name="Top Protocols" Icon={Map} />
			<Entry url="/categories" name="Categories" Icon={RefreshCcw} />
			<Entry url="/recent" name="Recent" Icon={Clock} />
			<Entry url="/comparison" name="Comparison" Icon={Minimize2} />
			<Entry url="/languages" name="Languages" Icon={Code} />
			<Entry url="/about" name="About" Icon={HelpCircle} />

			<Footer app="defi" />
		</>
	)
}

export default DefiNav
