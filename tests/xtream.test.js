import { XtreamUrlParser } from '../src/core/XtreamUrlParser.js'
import { XtreamClient } from '../src/core/XtreamClient.js'
import { IPTVChecker } from '../src/index.js'
import { server } from './__mocks__/node.js'
import { xtreamPanelFailHandlers } from './__mocks__/xtreamHandlers.js'
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals'
import {
  XTREAM_HOST,
  USERNAME,
  PASSWORD,
  serverInfo,
  userInfo,
  liveCategories,
  vodCategories,
  seriesCategories,
  liveStreams,
  vodStreams,
  seriesData,
  panelApiResponse
} from './__mocks__/xtreamHandlers.js'

describe('XtreamUrlParser', () => {
  it('should parse get.php URL format', () => {
    const result = XtreamUrlParser.parse(
      'http://example.com:8080/get.php?username=user1&password=pass1&type=m3u_plus'
    )
    expect(result).toEqual({
      host: 'http://example.com:8080',
      username: 'user1',
      password: 'pass1'
    })
  })

  it('should parse player_api.php URL format', () => {
    const result = XtreamUrlParser.parse(
      'http://example.com:8080/player_api.php?username=user1&password=pass1'
    )
    expect(result).toEqual({
      host: 'http://example.com:8080',
      username: 'user1',
      password: 'pass1'
    })
  })

  it('should parse panel_api.php URL format', () => {
    const result = XtreamUrlParser.parse(
      'https://example.com/panel_api.php?username=user1&password=pass1'
    )
    expect(result).toEqual({
      host: 'https://example.com',
      username: 'user1',
      password: 'pass1'
    })
  })

  it('should parse direct stream URL format', () => {
    const result = XtreamUrlParser.parse('http://example.com:8080/user1/pass1/12345')
    expect(result).toEqual({
      host: 'http://example.com:8080',
      username: 'user1',
      password: 'pass1'
    })
  })

  it('should return null for invalid URLs', () => {
    expect(XtreamUrlParser.parse('not-a-url')).toBeNull()
    expect(XtreamUrlParser.parse('')).toBeNull()
    expect(XtreamUrlParser.parse(null)).toBeNull()
    expect(XtreamUrlParser.parse(123)).toBeNull()
  })

  it('should return null for URLs without credentials', () => {
    expect(XtreamUrlParser.parse('http://example.com/somefile.m3u')).toBeNull()
    expect(XtreamUrlParser.parse('https://example.com')).toBeNull()
  })
})

describe('XtreamClient', () => {
  let client

  beforeAll(() => {
    client = new XtreamClient({
      host: XTREAM_HOST,
      username: USERNAME,
      password: PASSWORD,
      timeout: 10000
    })
  })

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      const result = await client.authenticate()
      expect(result.user_info).toMatchObject(userInfo)
      expect(result.server_info).toMatchObject(serverInfo)
      expect(client.serverInfo).toMatchObject(serverInfo)
      expect(client.userInfo).toMatchObject(userInfo)
    })

    it('should throw on bad credentials', async () => {
      const badClient = new XtreamClient({
        host: XTREAM_HOST,
        username: 'baduser',
        password: 'badpass'
      })
      await expect(badClient.authenticate()).rejects.toThrow('Xtream authentication failed')
    })

    it('should throw on expired account', async () => {
      const expiredClient = new XtreamClient({
        host: XTREAM_HOST,
        username: 'expireduser',
        password: 'expiredpass'
      })
      await expect(expiredClient.authenticate()).rejects.toThrow('Xtream account status: Expired')
    })
  })

  describe('categories', () => {
    it('should get live categories', async () => {
      const result = await client.getLiveCategories()
      expect(result).toEqual(liveCategories)
    })

    it('should get VOD categories', async () => {
      const result = await client.getVodCategories()
      expect(result).toEqual(vodCategories)
    })

    it('should get series categories', async () => {
      const result = await client.getSeriesCategories()
      expect(result).toEqual(seriesCategories)
    })
  })

  describe('streams', () => {
    it('should get live streams', async () => {
      const result = await client.getLiveStreams()
      expect(result).toEqual(liveStreams)
    })

    it('should get live streams filtered by category', async () => {
      const result = await client.getLiveStreams('1')
      expect(result).toHaveLength(2)
      expect(result.every(s => s.category_id === '1')).toBe(true)
    })

    it('should get VOD streams', async () => {
      const result = await client.getVodStreams()
      expect(result).toEqual(vodStreams)
    })

    it('should get series', async () => {
      const result = await client.getSeries()
      expect(result).toEqual(seriesData)
    })
  })

  describe('URL building', () => {
    beforeAll(async () => {
      await client.authenticate()
    })

    it('should build live stream URL', () => {
      const url = client.buildStreamUrl(1001)
      expect(url).toBe(`http://xtream-mock.test:8080/${USERNAME}/${PASSWORD}/1001.ts`)
    })

    it('should build live stream URL with custom extension', () => {
      const url = client.buildStreamUrl(1001, 'm3u8')
      expect(url).toBe(`http://xtream-mock.test:8080/${USERNAME}/${PASSWORD}/1001.m3u8`)
    })

    it('should build VOD URL', () => {
      const url = client.buildVodUrl(2001, 'mp4')
      expect(url).toBe(`http://xtream-mock.test:8080/movie/${USERNAME}/${PASSWORD}/2001.mp4`)
    })

    it('should build series URL', () => {
      const url = client.buildSeriesUrl(5001, 'mkv')
      expect(url).toBe(`http://xtream-mock.test:8080/series/${USERNAME}/${PASSWORD}/5001.mkv`)
    })
  })

  describe('panel_api primary flow', () => {
    it('should fetch all using panel_api as primary', async () => {
      const result = await client.fetchAll()
      expect(result.source).toBe('panel_api')
      expect(result.streams.length).toBeGreaterThan(0)
      expect(result.categories).toHaveProperty('live')
      expect(result.categories).toHaveProperty('movie')
      expect(result.categories).toHaveProperty('series')
    })

    it('should fall back to player_api when panel_api fails', async () => {
      server.use(...xtreamPanelFailHandlers)

      const fallbackClient = new XtreamClient({
        host: XTREAM_HOST,
        username: USERNAME,
        password: PASSWORD,
        timeout: 10000
      })

      const result = await fallbackClient.fetchAll()
      expect(result.source).toBe('player_api')
      expect(result.streams.length).toBeGreaterThan(0)

      server.resetHandlers()
    })
  })

  describe('toM3U', () => {
    it('should generate valid M3U from live streams', () => {
      const streams = liveStreams.map(s => ({ ...s, _type: 'live' }))
      const categories = { live: liveCategories }

      client.serverInfo = serverInfo
      const m3u = client.toM3U(streams, categories)

      expect(m3u).toMatch(/^#EXTM3U/)
      expect(m3u).toContain('tvg-logo="https://example.com/icons/cnn.png"')
      expect(m3u).toContain('group-title="News"')
      expect(m3u).toContain('group-title="Sports"')
      expect(m3u).toContain(`/${USERNAME}/${PASSWORD}/1001.ts`)
      expect(m3u).toContain('CNN HD')
    })

    it('should generate valid M3U from VOD streams', () => {
      const streams = vodStreams.map(s => ({ ...s, _type: 'movie' }))
      const categories = { movie: vodCategories }

      const m3u = client.toM3U(streams, categories)

      expect(m3u).toContain('tvg-logo="https://image.tmdb.org/t/p/w600_and_h900/matrix.jpg"')
      expect(m3u).toContain('group-title="Action"')
      expect(m3u).toContain(`/movie/${USERNAME}/${PASSWORD}/2001.mp4`)
      expect(m3u).toContain(`/movie/${USERNAME}/${PASSWORD}/2002.mkv`)
    })

    it('should generate valid M3U from series', () => {
      const streams = seriesData.map(s => ({ ...s, _type: 'series' }))
      const categories = { series: seriesCategories }

      const m3u = client.toM3U(streams, categories)

      expect(m3u).toContain('tvg-logo="https://image.tmdb.org/t/p/w600_and_h900/breakingbad.jpg"')
      expect(m3u).toContain('group-title="Netflix"')
      expect(m3u).toContain('Breaking Bad')
    })

    it('should map category_id to category_name', () => {
      const streams = [{ ...liveStreams[0], _type: 'live' }]
      const categories = { live: liveCategories }

      const m3u = client.toM3U(streams, categories)
      expect(m3u).toContain('group-title="News"')
    })
  })
})

describe('Xtream auto-detection integration', () => {
  it('should auto-detect Xtream URL and return parsed playlist', async () => {
    const checker = new IPTVChecker()
    const url = `${XTREAM_HOST}/get.php?username=${USERNAME}&password=${PASSWORD}&type=m3u_plus`
    const results = await checker.checkPlaylist(url)

    expect(results.header).toBeDefined()
    expect(results.items.length).toBeGreaterThan(0)

    // All items should have stream URLs from the Xtream server
    const hasXtreamUrls = results.items.some(item => item.url.includes('xtream-mock.test'))
    expect(hasXtreamUrls).toBe(true)
  })

  it('should preserve tvg-logo in parsed items', async () => {
    const checker = new IPTVChecker()
    const url = `${XTREAM_HOST}/player_api.php?username=${USERNAME}&password=${PASSWORD}`
    const results = await checker.checkPlaylist(url)

    const cnnItem = results.items.find(item => item.name === 'CNN HD')
    expect(cnnItem).toBeDefined()
    expect(cnnItem.tvg.logo).toBe('https://example.com/icons/cnn.png')
  })

  it('should fall back to regular M3U loading for non-Xtream URLs', async () => {
    const checker = new IPTVChecker()
    const url = 'https://example.com/simple.m3u'
    const results = await checker.checkPlaylist(url)

    // Should still work with regular M3U URLs
    expect(results.header).toBeDefined()
    expect(results.items.length).toBeGreaterThan(0)
  })
})
