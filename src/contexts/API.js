export async function fetchAPI(endpoint, method = 'GET', payload = null) {
  const options = { method }
  if (payload) {
    options.body = JSON.stringify(payload)
  }

  return fetch(endpoint)
    .then(response => {
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new TypeError("Oops, we haven't got JSON!")
      }
      return response.json()
    })
    .then(data => {
      return data
    })
    .catch(error => console.error(error))
}
