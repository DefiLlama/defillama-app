import { Attribute } from './Attribute'
import { BackingType } from './BackingType'
import { PegType } from './PegType'
import { McapRange } from './McapRange'
import { ResetAllStablecoinFilters } from './ResetAll'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

export function PeggedFiltersDropdowns({
	pathname,
	nestedMenu,
	downloadCsv
}: {
	pathname: string
	nestedMenu?: boolean
	downloadCsv: () => void
}) {
	return (
		<>
			<Attribute pathname={pathname} nestedMenu={nestedMenu} />
			<BackingType pathname={pathname} nestedMenu={nestedMenu} />
			<PegType pathname={pathname} nestedMenu={nestedMenu} />
			<McapRange nestedMenu={nestedMenu} />
			<ResetAllStablecoinFilters pathname={pathname} nestedMenu={nestedMenu} />
			<CSVDownloadButton
				onClick={downloadCsv}
				className="rounded-md py-2 px-3 text-xs whitespace-nowrap sm:ml-auto bg-[var(--link-active-bg)] text-white max-sm:mx-3 max-sm:mt-6"
			/>
		</>
	)
}
