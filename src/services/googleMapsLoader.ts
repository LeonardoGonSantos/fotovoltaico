let googleMapsPromise: Promise<typeof google> | null = null

interface LoadGoogleMapsOptions {
  apiKey: string
  libraries?: string[]
  language?: string
  region?: string
}

export function loadGoogleMaps({
  apiKey,
  libraries = ['places', 'geometry', 'drawing'],
  language = 'pt-BR',
  region = 'BR',
}: LoadGoogleMapsOptions) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps only pode ser carregado no browser.'))
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google)
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      const params = new URLSearchParams({
        key: apiKey,
        language,
        region,
        libraries: libraries.join(','),
        v: 'weekly',
      })

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
      script.async = true
      script.defer = true

      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google)
        } else {
          reject(new Error('Google Maps não inicializou corretamente.'))
        }
      }

      script.onerror = () => {
        reject(new Error('Falha ao carregar Google Maps JavaScript API.'))
      }

      document.head.appendChild(script)
    })
  }

  return googleMapsPromise
}
