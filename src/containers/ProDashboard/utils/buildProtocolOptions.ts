import { slug as sluggify } from '~/utils'

type AnyProtocol = {
	name: string
	tvl?: number | null
	parentProtocol?: string | null
	defillamaId?: string | number
	slug?: string
	logo?: string
}

type ParentProto = { id: string; name: string; logo?: string }

export interface BuiltProtocolOptions {
	options: Array<{ value: string; label: string; logo?: string; isChild?: boolean; id?: string }>
	parentToChildrenMap: Map<string, string[]>
}

export function buildProtocolOptions(
	protocols: AnyProtocol[],
	parentProtocols: ParentProto[] = [],
	valueKey: 'name' | 'slug' = 'name'
): BuiltProtocolOptions {
	const childrenByParentId = new Map<string, AnyProtocol[]>()
	const parentMetaById = new Map<string, ParentProto>()
	parentProtocols.forEach((pp) => parentMetaById.set(pp.id, pp))

	const allChildren = new Set<string>()

	for (const p of protocols) {
		if (p.parentProtocol) {
			const arr = childrenByParentId.get(p.parentProtocol) || []
			arr.push(p)
			childrenByParentId.set(p.parentProtocol, arr)
			if (p.name) allChildren.add(p.name)
		}
	}

	const sortByTvlThenName = (a: AnyProtocol, b: AnyProtocol) => {
		const at = a.tvl || 0
		const bt = b.tvl || 0
		if (bt !== at) return bt - at
		return a.name.localeCompare(b.name)
	}

	const options: Array<{ value: string; label: string; logo?: string; isChild?: boolean; id?: string }> = []
	const parentToChildrenMap = new Map<string, string[]>()

	const parentIds = Array.from(childrenByParentId.keys())
	for (const parentId of parentIds) {
		const pp = parentMetaById.get(parentId)
		const children = (childrenByParentId.get(parentId) || []).slice().sort(sortByTvlThenName)
		const parentName = pp?.name || children[0]?.name?.split(' - ')[0] || String(parentId)
		const parentLogo = pp?.logo

		const parentValue = valueKey === 'slug' ? sluggify(parentName) : parentName
		const parentOption = {
			value: parentValue,
			label: parentName,
			logo: parentLogo,
			isChild: false,
			id: sluggify(parentName)
		}
		options.push(parentOption)

		const childNames: string[] = []
		for (const child of children) {
			const childValue = valueKey === 'slug' ? child.slug || sluggify(child.name) : child.name
			options.push({
				value: childValue,
				label: child.name,
				logo: child.logo,
				isChild: true,
				id: sluggify(child.name)
			})
			childNames.push(child.name)
		}
		parentToChildrenMap.set(parentName, childNames)
	}

	const solo = protocols
		.filter((p) => !p.parentProtocol && !parentIds.includes(String(p.defillamaId)))
		.slice()
		.sort(sortByTvlThenName)

	for (const s of solo) {
		const val = valueKey === 'slug' ? s.slug || sluggify(s.name) : s.name
		options.push({ value: val, label: s.name, logo: s.logo, isChild: false, id: sluggify(s.name) })
	}

	return { options, parentToChildrenMap }
}
