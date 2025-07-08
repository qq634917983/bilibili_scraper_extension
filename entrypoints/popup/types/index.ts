/**
 * 视频数据接口
 */
export interface VideoData {
  id: string;
  name: string;
  url: string;
  stayTime: number;
  videoTime?: number;
  originalIndex: number;
}

/**
 * 当前视频信息接口
 */
export interface CurrentVideoInfo {
  name: string;
  remainingTime: number;
}

/**
 * 循环状态接口
 */
export interface LoopState {
  videoData: VideoData[];
  currentIndex: number;
  isLooping: boolean;
  randomRange: number;
  timePercentage: number;
}

/**
 * 消息类型
 */
export type MessageType = 
  | 'REQUEST_SCRAPER_DATA'
  | 'BV_SCRAPER_DATA'
  | 'START_LOOP'
  | 'STOP_LOOP'
  | 'UPDATE_DATA'
  | 'GET_STATE'
  | 'SHUFFLE_DATA'
  | 'REQUEST_CURRENT_VIDEO_INFO'
  | 'CURRENT_VIDEO_INFO';