export class XtreamUrlParser {
  static parse(input) {
    if (typeof input !== 'string') return null

    try {
      const url = new URL(input)
      const username = url.searchParams.get('username')
      const password = url.searchParams.get('password')

      if (username && password) {
        const host = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`
        return { host, username, password }
      }

      // Try path-based format: /username/password/streamId
      const pathParts = url.pathname.split('/').filter(Boolean)
      if (pathParts.length >= 2) {
        const [first, second] = pathParts
        // Exclude known API paths
        if (!['player_api.php', 'panel_api.php', 'get.php', 'xmltv.php'].includes(first)) {
          const host = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`
          return { host, username: first, password: second }
        }
      }

      return null
    } catch {
      return null
    }
  }
}
