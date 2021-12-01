module.exports = {
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true
      }
    ]
  },
  images: {
    domains: ['icons.llama.fi']
  }
}
