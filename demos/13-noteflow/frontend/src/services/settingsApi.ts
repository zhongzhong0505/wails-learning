/**
 * Settings API service — calls Go SettingsService methods.
 */

export interface AppInfo {
  version: string
  platform: string
  arch: string
}

async function callBackend(service: string, method: string, ...args: any[]): Promise<any> {
  return (window as any).wails.Call.ByName(`noteflow/services.${service}.${method}`, ...args)
}

export const settingsApi = {
  async getAppInfo(): Promise<AppInfo> {
    return callBackend('SettingsService', 'GetAppInfo')
  },
}
