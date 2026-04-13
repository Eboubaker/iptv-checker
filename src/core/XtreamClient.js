import axios from 'axios'
import https from 'https'

export class XtreamClient {
  constructor({ host, username, password, timeout = 60000, userAgent = '' }) {
    this.host = host.replace(/\/+$/, '')
    this.username = username
    this.password = password
    this.serverInfo = null
    this.userInfo = null

    this.client = axios.create({
      method: 'GET',
      timeout,
      responseType: 'json',
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: userAgent ? { 'User-Agent': userAgent } : {}
    })
  }

  async authenticate() {
    const { data } = await this.client.get(this._playerApiUrl())
    if (!data || !data.user_info || data.user_info.auth !== 1) {
      throw new Error('Xtream authentication failed')
    }
    if (data.user_info.status !== 'Active') {
      throw new Error(`Xtream account status: ${data.user_info.status}`)
    }
    this.userInfo = data.user_info
    this.serverInfo = data.server_info
    return data
  }

  async getPanelData() {
    const { data } = await this.client.get(this._panelApiUrl())
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid panel_api response')
    }
    return data
  }

  async getLiveCategories() {
    return this._playerApiAction('get_live_categories')
  }

  async getVodCategories() {
    return this._playerApiAction('get_vod_categories')
  }

  async getSeriesCategories() {
    return this._playerApiAction('get_series_categories')
  }

  async getLiveStreams(categoryId) {
    const params = categoryId ? { category_id: categoryId } : {}
    return this._playerApiAction('get_live_streams', params)
  }

  async getVodStreams(categoryId) {
    const params = categoryId ? { category_id: categoryId } : {}
    return this._playerApiAction('get_vod_streams', params)
  }

  async getSeries(categoryId) {
    const params = categoryId ? { category_id: categoryId } : {}
    return this._playerApiAction('get_series', params)
  }

  async getVodInfo(vodId) {
    return this._playerApiAction('get_vod_info', { vod_id: vodId })
  }

  async getSeriesInfo(seriesId) {
    return this._playerApiAction('get_series_info', { series_id: seriesId })
  }

  async getShortEpg(streamId, limit) {
    const params = { stream_id: streamId }
    if (limit) params.limit = limit
    return this._playerApiAction('get_short_epg', params)
  }

  async fetchAll() {
    // Try panel_api first (primary)
    try {
      const panelData = await this.getPanelData()
      if (panelData.user_info) {
        this.userInfo = panelData.user_info
        this.serverInfo = panelData.server_info
      }
      const streams = this._extractPanelStreams(panelData)
      if (streams.length > 0) {
        const categories = panelData.categories || {}
        return { streams, categories, source: 'panel_api' }
      }
    } catch {
      // panel_api failed, fall through to player_api
    }

    // Fallback: player_api
    await this.authenticate()

    const [liveCategories, vodCategories, seriesCategories, liveStreams, vodStreams, series] =
      await Promise.all([
        this.getLiveCategories().catch(() => []),
        this.getVodCategories().catch(() => []),
        this.getSeriesCategories().catch(() => []),
        this.getLiveStreams().catch(() => []),
        this.getVodStreams().catch(() => []),
        this.getSeries().catch(() => [])
      ])

    const categories = {
      live: liveCategories,
      movie: vodCategories,
      series: seriesCategories
    }

    const streams = [
      ...liveStreams.map(s => ({ ...s, _type: 'live' })),
      ...vodStreams.map(s => ({ ...s, _type: 'movie' })),
      ...series.map(s => ({ ...s, _type: 'series' }))
    ]

    return { streams, categories, source: 'player_api' }
  }

  buildStreamUrl(streamId, ext = 'ts') {
    const { url, port, server_protocol } = this._getServerInfo()
    return `${server_protocol}://${url}:${port}/${this.username}/${this.password}/${streamId}.${ext}`
  }

  buildVodUrl(streamId, containerExtension = 'mp4') {
    const { url, port, server_protocol } = this._getServerInfo()
    return `${server_protocol}://${url}:${port}/movie/${this.username}/${this.password}/${streamId}.${containerExtension}`
  }

  buildSeriesUrl(episodeId, containerExtension = 'mp4') {
    const { url, port, server_protocol } = this._getServerInfo()
    return `${server_protocol}://${url}:${port}/series/${this.username}/${this.password}/${episodeId}.${containerExtension}`
  }

  toM3U(streams, categories = {}) {
    const categoryMap = this._buildCategoryMap(categories)
    let output = '#EXTM3U\n'

    for (const stream of streams) {
      const type = stream._type || stream.stream_type || 'live'
      const name = stream.name || ''
      const logo = stream.stream_icon || stream.cover || ''
      const categoryId = stream.category_id || ''
      const groupTitle = categoryMap[categoryId] || ''
      const epgId = stream.epg_channel_id || ''

      let url
      if (type === 'live') {
        url = this.buildStreamUrl(stream.stream_id)
      } else if (type === 'movie') {
        url = this.buildVodUrl(stream.stream_id, stream.container_extension || 'mp4')
      } else if (type === 'series') {
        // Series entries point to the series info, not directly playable
        // Use a placeholder — real playback needs episode-level URLs
        url = this.buildSeriesUrl(stream.series_id || stream.stream_id, 'mp4')
      } else {
        url = this.buildStreamUrl(stream.stream_id)
      }

      output += `#EXTINF:-1 tvg-id="${epgId}" tvg-name="${name}" tvg-logo="${logo}" group-title="${groupTitle}",${name}\n`
      output += `${url}\n`
    }

    return output
  }

  _playerApiUrl() {
    return `${this.host}/player_api.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`
  }

  _panelApiUrl() {
    return `${this.host}/panel_api.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`
  }

  _playerApiAction(action, extraParams = {}) {
    const params = new URLSearchParams({
      username: this.username,
      password: this.password,
      action
    })
    for (const [key, value] of Object.entries(extraParams)) {
      params.set(key, value)
    }
    return this.client
      .get(`${this.host}/player_api.php?${params.toString()}`)
      .then(res => res.data || [])
  }

  _getServerInfo() {
    if (this.serverInfo) return this.serverInfo
    // Fallback: parse from host
    const url = new URL(this.host)
    return {
      url: url.hostname,
      port: url.port || (url.protocol === 'https:' ? '443' : '80'),
      server_protocol: url.protocol.replace(':', '')
    }
  }

  _extractPanelStreams(panelData) {
    const streams = []
    const channels = panelData.available_channels || {}

    for (const [, channel] of Object.entries(channels)) {
      streams.push(channel)
    }

    return streams
  }

  _buildCategoryMap(categories) {
    const map = {}
    for (const type of ['live', 'movie', 'series']) {
      const cats = categories[type] || []
      for (const cat of cats) {
        if (cat.category_id && cat.category_name) {
          map[String(cat.category_id)] = cat.category_name
        }
      }
    }
    return map
  }
}
