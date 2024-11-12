import { Attribute } from './Attribute'
import { BackingType } from './BackingType'
import { PegType } from './PegType'
import { McapRange } from './McapRange'
import { ResetAllStablecoinFilters } from './ResetAll'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

export function PeggedFiltersDropdowns({
	pathname,
	isMobile,
	downloadCsv
}: {
	pathname: string
	isMobile?: boolean
	downloadCsv: () => void
}) {
	return (
		<>
			<Attribute pathname={pathname} subMenu={isMobile} />
			<BackingType pathname={pathname} subMenu={isMobile} />
			<PegType pathname={pathname} subMenu={isMobile} />
			<McapRange subMenu={isMobile} />
			<ResetAllStablecoinFilters pathname={pathname} subMenu={isMobile} />
			<CSVDownloadButton
				onClick={downloadCsv}
				className="rounded-md py-2 px-3 text-xs whitespace-nowrap ml-auto bg-[var(--link-active-bg)] text-white"
			/>
		</>
	)
}
