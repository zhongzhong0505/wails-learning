/**
 * Folder API service — re-exports Wails v3 auto-generated bindings with types.
 */
import * as FolderService from '../../bindings/noteflow/services/folderservice.js'

export interface Folder {
  id: string
  name: string
  icon: string
  parent_id: string | null
  sort_order: number
  created_at: string
  note_count: number
}

// Convert model instance to plain object
function toFolder(m: any): Folder {
  return {
    id: m.id ?? m.ID ?? '',
    name: m.name ?? m.Name ?? '',
    icon: m.icon ?? m.Icon ?? '',
    parent_id: m.parent_id ?? m.ParentID ?? null,
    sort_order: m.sort_order ?? m.SortOrder ?? 0,
    created_at: m.created_at ?? m.CreatedAt ?? '',
    note_count: m.note_count ?? m.NoteCount ?? 0,
  }
}

export const folderApi = {
  async getAll(): Promise<Folder[]> {
    const results = await FolderService.GetAll()
    return (results || []).map(toFolder)
  },

  async create(name: string, icon?: string, parentId?: string): Promise<Folder> {
    const result = await FolderService.Create(name, icon || '', parentId || null)
    return toFolder(result)
  },

  async rename(id: string, name: string): Promise<void> {
    await FolderService.Rename(id, name)
  },

  async delete(id: string): Promise<void> {
    await FolderService.Delete(id)
  },
}
