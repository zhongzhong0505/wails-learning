/**
 * Note API service — re-exports Wails v3 auto-generated bindings with types.
 */
import * as NoteService from '../../bindings/noteflow/services/noteservice.js'
import { Note as NoteModel, NoteStats as NoteStatsModel } from '../../bindings/noteflow/models/models.js'

export interface Note {
  id: string
  title: string
  content: string
  folder_id: string | null
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface NoteStats {
  total: number
  pinned: number
  archived: number
  active: number
}

// Convert model instance to plain object
function toNote(m: any): Note {
  return {
    id: m.id ?? m.ID ?? '',
    title: m.title ?? m.Title ?? '',
    content: m.content ?? m.Content ?? '',
    folder_id: m.folder_id ?? m.FolderID ?? null,
    is_pinned: m.is_pinned ?? m.IsPinned ?? false,
    is_archived: m.is_archived ?? m.IsArchived ?? false,
    created_at: m.created_at ?? m.CreatedAt ?? '',
    updated_at: m.updated_at ?? m.UpdatedAt ?? '',
  }
}

function toNoteStats(m: any): NoteStats {
  return {
    total: m.total ?? m.Total ?? 0,
    pinned: m.pinned ?? m.Pinned ?? 0,
    archived: m.archived ?? m.Archived ?? 0,
    active: m.active ?? m.Active ?? 0,
  }
}

export const noteApi = {
  async create(title: string, content: string, folderId?: string): Promise<Note> {
    const result = await NoteService.Create(title, content, folderId || null)
    return toNote(result)
  },

  async getAll(folderId?: string): Promise<Note[]> {
    const results = await NoteService.GetAll(folderId || null)
    return (results || []).map(toNote)
  },

  async getById(id: string): Promise<Note> {
    const result = await NoteService.GetByID(id)
    return toNote(result)
  },

  async update(
    id: string,
    title?: string,
    content?: string,
    folderId?: string,
    isPinned?: boolean,
    isArchived?: boolean
  ): Promise<Note> {
    const result = await NoteService.Update(
      id,
      title ?? null,
      content ?? null,
      folderId ?? null,
      isPinned ?? null,
      isArchived ?? null
    )
    return toNote(result)
  },

  async delete(id: string): Promise<void> {
    await NoteService.Delete(id)
  },

  async search(query: string): Promise<Note[]> {
    const results = await NoteService.Search(query)
    return (results || []).map(toNote)
  },

  async getArchived(): Promise<Note[]> {
    const results = await NoteService.GetArchived()
    return (results || []).map(toNote)
  },

  async getStats(): Promise<NoteStats> {
    const result = await NoteService.GetStats()
    return toNoteStats(result)
  },
}
