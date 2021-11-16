module.exports = {
    async redirects() {
        return [
            {
                source: '/chain/Binance',
                destination: '/chain/BSC',
                permanent: true,
            },
        ]
    },
}