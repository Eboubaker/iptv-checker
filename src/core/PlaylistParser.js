import { XtreamUrlParser } from './XtreamUrlParser.js'
import { XtreamClient } from './XtreamClient.js'
import { PlaylistLoader } from './PlaylistLoader.js'
import { existsSync, readFileSync } from 'fs'
import parser from 'iptv-playlist-parser'
import { isWebUri } from 'valid-url'

export class PlaylistParser {
  constructor({ config }) {
    this.config = config
    this.playlistLoader = new PlaylistLoader({ config })
  }

  async parse(input) {
    if (input instanceof Object && Reflect.has(input, `items`)) return input

    let data = input
    if (Buffer.isBuffer(input)) {
      data = input.toString('utf8')
    } else if (typeof input === 'string') {
      if (isWebUri(input)) {
        const xtreamData = await this._tryXtream(input)
        if (xtreamData) {
          data = xtreamData
        } else {
          data = await this.playlistLoader.load(input)
        }
      } else if (existsSync(input)) {
        data = readFileSync(input, 'utf8')
      }
    }

    if (!data.startsWith('#EXTM3U')) {
      return Promise.reject('Unable to parse a playlist')
    }

    return parser.parse(data)
  }

  async _tryXtream(url) {
    const parsed = XtreamUrlParser.parse(url)
    if (!parsed) return null

    try {
      const client = new XtreamClient({
        host: parsed.host,
        username: parsed.username,
        password: parsed.password,
        timeout: this.config.timeout,
        userAgent: this.config.userAgent
      })

      const { streams, categories } = await client.fetchAll()
      if (!streams || streams.length === 0) return null

      return client.toM3U(streams, categories)
    } catch {
      return null
    }
  }
}
