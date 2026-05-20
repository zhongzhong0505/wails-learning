/**
 * Folder API service — calls Go FolderService methods via Wails bindings.
 */

export interface Folder {
  id: string
  name: string
  icon: string
  parent_id: string | null
  sort_order: number
  created_at: string
  note_count: number
}

// Call Go backend methods via Wails v3 bindings
async function callBackend(service: string, method: string, ...args: any[]): Promise<any> {
  return (window as any).wails.Call.ByName(`noteflow/services.${service}.${method}`, ...args)
}

export const folderApi = {
  async getAll(): Promise<Folder[]> {
    return callBackend('FolderService', 'GetAll')
  },

  async create(name: string, icon?: string, parentId?: string): Promise<Folder> {
    return callBackend('FolderService', 'Create', name, icon || '', parentId || null)
  },

  async rename(id: string, name: string): Promise<void> {
    return callBackend('FolderService', 'Rename', id, name)
  },

  async delete(id: string): Promise<void> {
    return callBackend('FolderService', 'Delete', id)
  },
}
