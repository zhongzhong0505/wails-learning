/**
 * Settings API service — re-exports Wails v3 auto-generated bindings with types.
 */
import * as SettingsService from '../../bindings/noteflow/services/settingsservice.js'

export interface AppInfo {
  version: string
  platform: string
  arch: string
}

function toAppInfo(m: any): AppInfo {
  return {
    version: m.version ?? m.Version ?? '',
    platform: m.platform ?? m.Platform ?? '',
    arch: m.arch ?? m.Arch ?? '',
  }
}

export const settingsApi = {
  async getAppInfo(): Promise<AppInfo> {
    const result = await SettingsService.GetAppInfo()
    return toAppInfo(result)
  },
}
