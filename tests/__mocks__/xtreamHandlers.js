import { http, HttpResponse } from 'msw'

const XTREAM_HOST = 'http://xtream-mock.test:8080'
const USERNAME = 'testuser'
const PASSWORD = 'testpass'

const serverInfo = {
  url: 'xtream-mock.test',
  port: '8080',
  https_port: '8443',
  server_protocol: 'http',
  rtmp_port: '8443',
  timezone: 'Europe/London',
  timestamp_now: 1700000000,
  time_now: '2024-01-01 00:00:00'
}

const userInfo = {
  username: USERNAME,
  password: PASSWORD,
  auth: 1,
  status: 'Active',
  exp_date: '1900000000',
  is_trial: '0',
  active_cons: '0',
  created_at: '1700000000',
  max_connections: '1',
  allowed_output_formats: ['m3u8', 'ts', 'rtmp']
}

const expiredUserInfo = {
  ...userInfo,
  username: 'expireduser',
  password: 'expiredpass',
  status: 'Expired',
  exp_date: '1600000000'
}

const badAuthInfo = {
  user_info: { auth: 0 }
}

const liveCategories = [
  { category_id: '1', category_name: 'News', parent_id: 0 },
  { category_id: '2', category_name: 'Sports', parent_id: 0 },
  { category_id: '3', category_name: 'Entertainment', parent_id: 0 }
]

const vodCategories = [
  { category_id: '10', category_name: 'Action', parent_id: 0 },
  { category_id: '11', category_name: 'Drama', parent_id: 0 },
  { category_id: '12', category_name: 'Comedy', parent_id: 0 }
]

const seriesCategories = [
  { category_id: '20', category_name: 'Netflix', parent_id: 0 },
  { category_id: '21', category_name: 'HBO', parent_id: 0 }
]

const liveStreams = [
  {
    num: 1,
    name: 'CNN HD',
    stream_type: 'live',
    stream_id: 1001,
    stream_icon: 'https://example.com/icons/cnn.png',
    epg_channel_id: 'CNN.us',
    added: '1700000000',
    category_id: '1',
    custom_sid: '',
    direct_source: '',
    tv_archive: 0,
    tv_archive_duration: 0
  },
  {
    num: 2,
    name: 'BBC News',
    stream_type: 'live',
    stream_id: 1002,
    stream_icon: 'https://example.com/icons/bbc.png',
    epg_channel_id: 'BBC.uk',
    added: '1700000000',
    category_id: '1',
    custom_sid: '',
    direct_source: '',
    tv_archive: 0,
    tv_archive_duration: 0
  },
  {
    num: 3,
    name: 'ESPN HD',
    stream_type: 'live',
    stream_id: 1003,
    stream_icon: 'https://example.com/icons/espn.png',
    epg_channel_id: 'ESPN.us',
    added: '1700000000',
    category_id: '2',
    custom_sid: '',
    direct_source: '',
    tv_archive: 0,
    tv_archive_duration: 0
  }
]

const vodStreams = [
  {
    num: 1,
    name: 'The Matrix',
    stream_type: 'movie',
    stream_id: 2001,
    stream_icon: 'https://image.tmdb.org/t/p/w600_and_h900/matrix.jpg',
    rating: '8.7',
    rating_5based: 4,
    added: '1700000000',
    is_adult: '0',
    category_id: '10',
    container_extension: 'mp4',
    custom_sid: '',
    direct_source: ''
  },
  {
    num: 2,
    name: 'Inception',
    stream_type: 'movie',
    stream_id: 2002,
    stream_icon: 'https://image.tmdb.org/t/p/w600_and_h900/inception.jpg',
    rating: '8.8',
    rating_5based: 4,
    added: '1700000000',
    is_adult: '0',
    category_id: '11',
    container_extension: 'mkv',
    custom_sid: '',
    direct_source: ''
  },
  {
    num: 3,
    name: 'The Hangover',
    stream_type: 'movie',
    stream_id: 2003,
    stream_icon: 'https://image.tmdb.org/t/p/w600_and_h900/hangover.jpg',
    rating: '7.7',
    rating_5based: 4,
    added: '1700000000',
    is_adult: '0',
    category_id: '12',
    container_extension: 'mp4',
    custom_sid: '',
    direct_source: ''
  }
]

const seriesData = [
  {
    num: 1,
    series_id: 3001,
    name: 'Breaking Bad',
    cover: 'https://image.tmdb.org/t/p/w600_and_h900/breakingbad.jpg',
    plot: 'A chemistry teacher turned meth producer.',
    cast: 'Bryan Cranston',
    director: 'Vince Gilligan',
    genre: 'Drama',
    releaseDate: '2008-01-20',
    last_modified: '1700000000',
    rating: '9.5',
    rating_5based: '5',
    backdrop_path: [],
    youtube_trailer: '',
    episode_run_time: '47',
    category_id: '20'
  },
  {
    num: 2,
    series_id: 3002,
    name: 'Game of Thrones',
    cover: 'https://image.tmdb.org/t/p/w600_and_h900/got.jpg',
    plot: 'Nine noble families fight for control.',
    cast: 'Emilia Clarke',
    director: 'David Benioff',
    genre: 'Fantasy',
    releaseDate: '2011-04-17',
    last_modified: '1700000000',
    rating: '9.3',
    rating_5based: '5',
    backdrop_path: [],
    youtube_trailer: '',
    episode_run_time: '57',
    category_id: '21'
  }
]

// Panel API combines everything
const panelApiResponse = {
  user_info: userInfo,
  server_info: serverInfo,
  categories: {
    live: liveCategories,
    movie: vodCategories,
    series: seriesCategories
  },
  available_channels: {
    '1001': { ...liveStreams[0], _type: 'live' },
    '1002': { ...liveStreams[1], _type: 'live' },
    '1003': { ...liveStreams[2], _type: 'live' },
    '2001': { ...vodStreams[0], _type: 'movie' },
    '2002': { ...vodStreams[1], _type: 'movie' },
    '2003': { ...vodStreams[2], _type: 'movie' }
  }
}

function matchCredentials(url, user = USERNAME, pass = PASSWORD) {
  const u = new URL(url)
  return u.searchParams.get('username') === user && u.searchParams.get('password') === pass
}

export const xtreamHandlers = [
  // Panel API - primary endpoint
  http.get(`${XTREAM_HOST}/panel_api.php`, ({ request }) => {
    if (!matchCredentials(request.url)) {
      return HttpResponse.json(badAuthInfo)
    }
    const u = new URL(request.url)
    if (u.searchParams.get('username') === 'expireduser') {
      return HttpResponse.json({ user_info: expiredUserInfo, server_info: serverInfo })
    }
    return HttpResponse.json(panelApiResponse)
  }),

  // Player API - auth (no action)
  http.get(`${XTREAM_HOST}/player_api.php`, ({ request }) => {
    const u = new URL(request.url)
    const action = u.searchParams.get('action')
    const user = u.searchParams.get('username')
    const pass = u.searchParams.get('password')

    if (user === 'baduser' || pass === 'badpass') {
      return HttpResponse.json(badAuthInfo)
    }

    if (user === 'expireduser' && pass === 'expiredpass') {
      return HttpResponse.json({ user_info: expiredUserInfo, server_info: serverInfo })
    }

    if (user !== USERNAME || pass !== PASSWORD) {
      return HttpResponse.json(badAuthInfo)
    }

    if (!action) {
      return HttpResponse.json({ user_info: userInfo, server_info: serverInfo })
    }

    switch (action) {
      case 'get_live_categories':
        return HttpResponse.json(liveCategories)
      case 'get_vod_categories':
        return HttpResponse.json(vodCategories)
      case 'get_series_categories':
        return HttpResponse.json(seriesCategories)
      case 'get_live_streams': {
        const catId = u.searchParams.get('category_id')
        if (catId) {
          return HttpResponse.json(liveStreams.filter(s => s.category_id === catId))
        }
        return HttpResponse.json(liveStreams)
      }
      case 'get_vod_streams': {
        const catId = u.searchParams.get('category_id')
        if (catId) {
          return HttpResponse.json(vodStreams.filter(s => s.category_id === catId))
        }
        return HttpResponse.json(vodStreams)
      }
      case 'get_series': {
        const catId = u.searchParams.get('category_id')
        if (catId) {
          return HttpResponse.json(seriesData.filter(s => s.category_id === catId))
        }
        return HttpResponse.json(seriesData)
      }
      default:
        return HttpResponse.json([])
    }
  }),

  // Get.php URL (M3U redirect) - also triggers Xtream detection
  http.get(`${XTREAM_HOST}/get.php`, ({ request }) => {
    if (!matchCredentials(request.url)) {
      return new HttpResponse(null, { status: 403 })
    }
    // Return a minimal M3U that would normally come from get.php
    // But since auto-detection intercepts first, this is a fallback
    return HttpResponse.text('#EXTM3U\n#EXTINF:-1,Fallback Channel\nhttp://example.com/stream.ts\n')
  }),

  // Mock stream URLs for testing stream checks
  http.get(`${XTREAM_HOST}/${USERNAME}/${PASSWORD}/:streamId`, () => {
    return HttpResponse.text('mock-stream-data')
  }),
  http.get(`${XTREAM_HOST}/movie/${USERNAME}/${PASSWORD}/:streamId`, () => {
    return HttpResponse.text('mock-vod-data')
  }),
  http.get(`${XTREAM_HOST}/series/${USERNAME}/${PASSWORD}/:streamId`, () => {
    return HttpResponse.text('mock-series-data')
  })
]

// Player API auth that returns 500 — forces fallback to panel_api
export const xtreamPlayerAuthFailHandlers = [
  http.get(`${XTREAM_HOST}/player_api.php`, () => {
    return new HttpResponse(null, { status: 500 })
  })
]

// Panel API that returns 500 (kept for reference)
export const xtreamPanelFailHandlers = [
  http.get(`${XTREAM_HOST}/panel_api.php`, () => {
    return new HttpResponse(null, { status: 500 })
  })
]
export {
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
}
