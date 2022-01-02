import { isValidProtocol, tokenIconUrl } from './index'

describe('utils/index', () => {
    describe('isValidProtocol', () => {

        const tokensObject = { 0: { name: 'uniswap' }, 1: { name: 'defi-protocol' }, 2: { name: 'alpha finance' } }

        it('returns true if protocol exactly matches a name in tokens dictionary', () => {
            expect(isValidProtocol(tokensObject, 'uniswap')).toBe(true)
            expect(isValidProtocol(tokensObject, 'defi-protocol')).toBe(true)
            expect(isValidProtocol(tokensObject, 'alpha-finance')).toBe(true)
        })

        it('returns false if protocol doesnt exactly match a name in tokens dictionary', () => {
            expect(isValidProtocol(tokensObject, 'defiprotocol')).toBe(false)
            expect(isValidProtocol(tokensObject, 'uni-swap')).toBe(false)
            expect(isValidProtocol(tokensObject, 'llama')).toBe(false)
        })
    })

    describe('tokenIconUrl', () => {
        it('basic tests', () => {
            expect(tokenIconUrl("Maker")).toBe(`/icons/maker.jpg`)
            expect(tokenIconUrl("Maker DAO")).toBe(`/icons/maker-dao.jpg`)
            expect(tokenIconUrl("Maker DAO 1")).toBe(`/icons/maker-dao-1.jpg`)
        })
    })
})