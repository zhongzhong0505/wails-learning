/**
 * Note API service — calls Go NoteService methods via Wails bindings.
 */

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

// Call Go backend methods via Wails v3 bindings
async function callBackend(service: string, method: string, ...args: any[]): Promise<any> {
  // Wails v3 generates bindings at runtime accessible via wails.Call
  return (window as any).wails.Call.ByName(`noteflow/services.${service}.${method}`, ...args)
}

export const noteApi = {
  async create(title: string, content: string, folderId?: string): Promise<Note> {
    return callBackend('NoteService', 'Create', title, content, folderId || null)
  },

  async getAll(folderId?: string): Promise<Note[]> {
    return callBackend('NoteService', 'GetAll', folderId || null)
  },

  async getById(id: string): Promise<Note> {
    return callBackend('NoteService', 'GetByID', id)
  },

  async update(
    id: string,
    title?: string,
    content?: string,
    folderId?: string,
    isPinned?: boolean,
    isArchived?: boolean
  ): Promise<Note> {
    return callBackend('NoteService', 'Update', id,
      title ?? null, content ?? null, folderId ?? null,
      isPinned ?? null, isArchived ?? null)
  },

  async delete(id: string): Promise<void> {
    return callBackend('NoteService', 'Delete', id)
  },

  async search(query: string): Promise<Note[]> {
    return callBackend('NoteService', 'Search', query)
  },

  async getArchived(): Promise<Note[]> {
    return callBackend('NoteService', 'GetArchived')
  },

  async getStats(): Promise<NoteStats> {
    return callBackend('NoteService', 'GetStats')
  },
}
