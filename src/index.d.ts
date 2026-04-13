import { Playlist, PlaylistItem, PlaylistHeader, PlaylistItemTvg } from 'iptv-playlist-parser'

export declare type IPTVCheckerOptions = {
  debug?: Boolean
  userAgent?: string
  timeout?: number
  parallel?: number
  delay?: number
  retry?: number
  setUp?: () => Promise<void> | void
  afterEach?: () => Promise<void> | void
  beforeEach?: () => Promise<void> | void
}

export interface PlaylistItemWithStatus extends PlaylistItem {
  status:
    | {
        ok: boolean
        code: string
        message: string
      }
    | {
        ok: boolean
        code: string
        metadata: {
          streams: any[]
          format: any
          requests: any[]
        }
      }
}

export interface PlaylistWithStatus {
  header: PlaylistHeader
  items: PlaylistItemWithStatus[]
}

export interface StreamWithStatus {
  url: string
  status:
    | {
        ok: boolean
        code: string
        message: string
      }
    | {
        ok: boolean
        code: string
        metadata: {
          streams: any[]
          format: any
          requests: any[]
        }
      }
}

export interface Stream {
  name?: string
  tvg?: PlaylistItemTvg
  group?: {
    title: string
  }
  http?: {
    referrer: string
    'user-agent': string
  }
  url: string
  raw?: string
  line?: number
  timeshift?: string
  catchup?: {
    type: string
    source: string
    days: string
  }
  lang?: string
}

export declare class IPTVChecker {
  constructor(opts?: IPTVCheckerOptions)
  checkPlaylist(input: Playlist): Promise<PlaylistWithStatus>
  checkStream(input: string | Stream): Promise<StreamWithStatus>
}

export interface XtreamCredentials {
  host: string
  username: string
  password: string
}

export interface XtreamServerInfo {
  url: string
  port: string
  https_port: string
  server_protocol: string
  rtmp_port: string
  timezone: string
  timestamp_now: number
  time_now: string
}

export interface XtreamUserInfo {
  username: string
  password: string
  auth: number
  status: string
  exp_date: string
  is_trial: string
  active_cons: string
  created_at: string
  max_connections: string
  allowed_output_formats: string[]
}

export interface XtreamCategory {
  category_id: string
  category_name: string
  parent_id: number
}

export interface XtreamLiveStream {
  num: number
  name: string
  stream_type: 'live'
  stream_id: number
  stream_icon: string
  epg_channel_id: string | null
  added: string
  category_id: string
  custom_sid: string
  direct_source: string
  tv_archive: number
  tv_archive_duration: number
}

export interface XtreamVodStream {
  num: number
  name: string
  stream_type: 'movie'
  stream_id: number
  stream_icon: string
  rating: string
  rating_5based: number
  added: string
  is_adult: string
  category_id: string
  container_extension: string
  custom_sid: string
  direct_source: string
}

export interface XtreamSeries {
  num: number
  series_id: number
  name: string
  cover: string
  plot: string
  cast: string
  director: string
  genre: string
  releaseDate: string
  last_modified: string
  rating: string
  rating_5based: string
  backdrop_path: string[]
  youtube_trailer: string
  episode_run_time: string
  category_id: string
}

export interface XtreamCategories {
  live: XtreamCategory[]
  movie: XtreamCategory[]
  series: XtreamCategory[]
}

export interface XtreamFetchAllResult {
  streams: Array<XtreamLiveStream | XtreamVodStream | XtreamSeries>
  categories: XtreamCategories
  source: 'panel_api' | 'player_api'
}

export interface XtreamClientOptions {
  host: string
  username: string
  password: string
  timeout?: number
  userAgent?: string
}

export declare class XtreamClient {
  constructor(opts: XtreamClientOptions)
  authenticate(): Promise<{ user_info: XtreamUserInfo; server_info: XtreamServerInfo }>
  getPanelData(): Promise<any>
  getLiveCategories(): Promise<XtreamCategory[]>
  getVodCategories(): Promise<XtreamCategory[]>
  getSeriesCategories(): Promise<XtreamCategory[]>
  getLiveStreams(categoryId?: string): Promise<XtreamLiveStream[]>
  getVodStreams(categoryId?: string): Promise<XtreamVodStream[]>
  getSeries(categoryId?: string): Promise<XtreamSeries[]>
  getVodInfo(vodId: number): Promise<any>
  getSeriesInfo(seriesId: number): Promise<any>
  getShortEpg(streamId: number, limit?: number): Promise<any>
  fetchAll(): Promise<XtreamFetchAllResult>
  buildStreamUrl(streamId: number, ext?: string): string
  buildVodUrl(streamId: number, containerExtension?: string): string
  buildSeriesUrl(episodeId: number, containerExtension?: string): string
  toM3U(streams: any[], categories?: Partial<XtreamCategories>): string
}

export declare class XtreamUrlParser {
  static parse(input: string): XtreamCredentials | null
}
