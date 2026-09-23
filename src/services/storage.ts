import { get, set, del } from 'idb-keyval';
import type { Subject, StudyFolder, StudyItem, Flashcard, ExamTarget } from '../types';

const SUBJECTS_KEY = 'kaistu_subjects';
const FOLDERS_KEY = 'kaistu_folders';
const ITEMS_KEY = 'kaistu_items';
const SETTINGS_KEY = 'kaistu_settings';
const FLASHCARDS_KEY = 'kaistu_flashcards';
const EXAMS_KEY = 'kaistu_exams';
const DEFAULTS_CLEARED_KEY = 'kaistu_defaults_cleared_v1';

export const StorageService = {
  async getSubjects(): Promise<Subject[]> {
    try {
      // One-time cleanup for users whose browsers had previous demo subjects seeded
      const cleared = await get<boolean>(DEFAULTS_CLEARED_KEY);
      if (!cleared) {
        const existing = await get<Subject[]>(SUBJECTS_KEY);
        if (existing) {
          const filtered = existing.filter(
            (s) => s.id !== 'sub-cs-101' && s.id !== 'sub-math' && s.id !== 'sub-physics'
          );
          await set(SUBJECTS_KEY, filtered);
        }
        const existingItems = await get<StudyItem[]>(ITEMS_KEY);
        if (existingItems) {
          const filteredItems = existingItems.filter(
            (i) => i.id !== 'item-demo-yt' && i.id !== 'item-demo-note' &&
                   i.subjectId !== 'sub-cs-101' && i.subjectId !== 'sub-math' && i.subjectId !== 'sub-physics'
          );
          await set(ITEMS_KEY, filteredItems);
        }
        await set(DEFAULTS_CLEARED_KEY, true);
      }

      const stored = await get<Subject[]>(SUBJECTS_KEY);
      if (stored && Array.isArray(stored)) {
        return stored;
      }
      return [];
    } catch (e) {
      console.error('Failed to load subjects:', e);
      return [];
    }
  },

  async saveSubject(subject: Subject): Promise<void> {
    const subjects = await this.getSubjects();
    const existingIndex = subjects.findIndex((s) => s.id === subject.id);
    if (existingIndex >= 0) {
      subjects[existingIndex] = subject;
    } else {
      subjects.unshift(subject);
    }
    await set(SUBJECTS_KEY, subjects);
  },

  async deleteSubject(id: string): Promise<void> {
    const subjects = await this.getSubjects();
    const filtered = subjects.filter((s) => s.id !== id);
    await set(SUBJECTS_KEY, filtered);

    // Delete folders for this subject
    const allFolders = await this.getFolders();
    const remainingFolders = allFolders.filter((f) => f.subjectId !== id);
    await set(FOLDERS_KEY, remainingFolders);

    // Delete associated items
    const items = await this.getAllItems();
    const remainingItems: StudyItem[] = [];
    for (const item of items) {
      if (item.subjectId === id) {
        if (item.fileStorageKey) {
          await del(`file_${item.fileStorageKey}`);
        }
      } else {
        remainingItems.push(item);
      }
    }
    await set(ITEMS_KEY, remainingItems);
  },

  // Folder CRUD methods for nested chapters/subfolders
  async getFolders(subjectId?: string): Promise<StudyFolder[]> {
    try {
      const folders = await get<StudyFolder[]>(FOLDERS_KEY);
      const list = folders || [];
      if (subjectId) {
        return list.filter((f) => f.subjectId === subjectId);
      }
      return list;
    } catch (e) {
      console.error('Failed to load folders:', e);
      return [];
    }
  },

  async saveFolder(folder: StudyFolder): Promise<void> {
    const folders = await this.getFolders();
    const existingIndex = folders.findIndex((f) => f.id === folder.id);
    if (existingIndex >= 0) {
      folders[existingIndex] = { ...folder, updatedAt: Date.now() };
    } else {
      folders.push({ ...folder, createdAt: Date.now(), updatedAt: Date.now() });
    }
    await set(FOLDERS_KEY, folders);
  },

  async deleteFolder(folderId: string): Promise<void> {
    const allFolders = await this.getFolders();
    // Recursively collect target folder and all subfolders
    const toDeleteFolderIds = new Set<string>([folderId]);
    let addedNew = true;
    while (addedNew) {
      addedNew = false;
      for (const f of allFolders) {
        if (f.parentId && toDeleteFolderIds.has(f.parentId) && !toDeleteFolderIds.has(f.id)) {
          toDeleteFolderIds.add(f.id);
          addedNew = true;
        }
      }
    }

    // Delete items that belong to these folders
    const allItems = await this.getAllItems();
    const remainingItems: StudyItem[] = [];
    for (const item of allItems) {
      if (item.folderId && toDeleteFolderIds.has(item.folderId)) {
        if (item.fileStorageKey) {
          await del(`file_${item.fileStorageKey}`);
        }
      } else {
        remainingItems.push(item);
      }
    }
    await set(ITEMS_KEY, remainingItems);

    // Filter remaining folders
    const remainingFolders = allFolders.filter((f) => !toDeleteFolderIds.has(f.id));
    await set(FOLDERS_KEY, remainingFolders);
  },

  async getAllItems(): Promise<StudyItem[]> {
    try {
      const items = await get<StudyItem[]>(ITEMS_KEY);
      if (items && Array.isArray(items)) {
        return items;
      }
      return [];
    } catch (e) {
      console.error('Failed to load items:', e);
      return [];
    }
  },

  async getItemsBySubject(subjectId: string): Promise<StudyItem[]> {
    const all = await this.getAllItems();
    return all.filter((item) => item.subjectId === subjectId);
  },

  async saveItem(item: StudyItem): Promise<void> {
    const items = await this.getAllItems();
    const existingIndex = items.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      items[existingIndex] = { ...item, updatedAt: Date.now() };
    } else {
      items.unshift({ ...item, createdAt: Date.now(), updatedAt: Date.now() });
    }
    await set(ITEMS_KEY, items);
  },

  async deleteItem(id: string): Promise<void> {
    const items = await this.getAllItems();
    const itemToDelete = items.find((i) => i.id === id);
    if (itemToDelete?.fileStorageKey) {
      await del(`file_${itemToDelete.fileStorageKey}`);
    }
    const filtered = items.filter((i) => i.id !== id);
    await set(ITEMS_KEY, filtered);
  },

  async storeFileBlob(storageKey: string, blob: Blob): Promise<void> {
    await set(`file_${storageKey}`, blob);
  },

  async getFileBlob(storageKey: string): Promise<Blob | undefined> {
    return await get<Blob>(`file_${storageKey}`);
  },

  async getSettings(): Promise<Record<string, any>> {
    const s = await get<Record<string, any>>(SETTINGS_KEY);
    return s || {};
  },

  async saveSettings(settings: Record<string, any>): Promise<void> {
    await set(SETTINGS_KEY, settings);
  },

  async getFlashcards(subjectId?: string): Promise<Flashcard[]> {
    try {
      const cards = await get<Flashcard[]>(FLASHCARDS_KEY);
      const list = cards || [];
      if (subjectId) {
        return list.filter((c) => c.subjectId === subjectId);
      }
      return list;
    } catch (e) {
      console.error('Failed to load flashcards:', e);
      return [];
    }
  },

  async saveFlashcard(card: Flashcard): Promise<void> {
    const cards = await this.getFlashcards();
    const idx = cards.findIndex((c) => c.id === card.id);
    if (idx >= 0) {
      cards[idx] = card;
    } else {
      cards.unshift(card);
    }
    await set(FLASHCARDS_KEY, cards);
  },

  async saveFlashcards(newCards: Flashcard[]): Promise<void> {
    if (!newCards.length) return;
    const cards = await this.getFlashcards();
    // Prepend new cards
    const merged = [...newCards, ...cards];
    await set(FLASHCARDS_KEY, merged);
  },

  async deleteFlashcard(id: string): Promise<void> {
    const cards = await this.getFlashcards();
    const filtered = cards.filter((c) => c.id !== id);
    await set(FLASHCARDS_KEY, filtered);
  },

  async clearFlashcards(subjectId: string): Promise<void> {
    const cards = await this.getFlashcards();
    const remaining = cards.filter((c) => c.subjectId !== subjectId);
    await set(FLASHCARDS_KEY, remaining);
  },

  async getExamTargets(): Promise<ExamTarget[]> {
    try {
      const targets = await get<ExamTarget[]>(EXAMS_KEY);
      return targets || [];
    } catch (e) {
      console.error('Failed to load exam targets:', e);
      return [];
    }
  },

  async saveExamTarget(target: ExamTarget): Promise<void> {
    const targets = await this.getExamTargets();
    const idx = targets.findIndex((t) => t.id === target.id);
    if (idx >= 0) {
      targets[idx] = target;
    } else {
      targets.unshift(target);
    }
    await set(EXAMS_KEY, targets);
  },

  async deleteExamTarget(id: string): Promise<void> {
    const targets = await this.getExamTargets();
    const filtered = targets.filter((t) => t.id !== id);
    await set(EXAMS_KEY, filtered);
  },

  async exportSubjectBundle(subjectId: string): Promise<string> {
    const subjects = await this.getSubjects();
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) throw new Error('Subject not found');

    const items = await this.getItemsBySubject(subjectId);
    const flashcards = await this.getFlashcards(subjectId);
    const folders = await this.getFolders(subjectId);

    const bundle = {
      app: 'KaiStu',
      formatVersion: '1.1',
      exportedAt: Date.now(),
      subject,
      folders,
      items: items.map((it) => ({
        ...it,
        // Keep notes and links intact for easy sharing with friends
        hasLocalBlob: !!it.fileStorageKey,
      })),
      flashcards,
    };
    return JSON.stringify(bundle, null, 2);
  },

  async importSubjectBundle(bundleJson: string): Promise<{ subject: Subject; itemsCount: number; flashcardsCount: number; foldersCount: number }> {
    const data = JSON.parse(bundleJson);
    if (!data.subject || !data.subject.name) {
      throw new Error('Invalid KaiStu subject bundle');
    }

    // Generate fresh IDs if subject already exists, or preserve
    const currentSubjects = await this.getSubjects();
    const existing = currentSubjects.find((s) => s.id === data.subject.id);
    const targetSubjectId = existing ? `sub-${Date.now()}` : data.subject.id;
    const targetSubject: Subject = {
      ...data.subject,
      id: targetSubjectId,
      name: existing ? `${data.subject.name} (Shared)` : data.subject.name,
      createdAt: Date.now(),
    };

    await this.saveSubject(targetSubject);

    // Import folders with ID remapping if needed
    const folderIdMap: Record<string, string> = {};
    let foldersCount = 0;
    if (Array.isArray(data.folders)) {
      for (const f of data.folders) {
        const newFolderId = existing ? `folder-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` : f.id;
        folderIdMap[f.id] = newFolderId;
      }
      for (const f of data.folders) {
        const newFolder: StudyFolder = {
          ...f,
          id: folderIdMap[f.id] || f.id,
          subjectId: targetSubjectId,
          parentId: f.parentId ? (folderIdMap[f.parentId] || f.parentId) : null,
          createdAt: f.createdAt || Date.now(),
        };
        await this.saveFolder(newFolder);
        foldersCount++;
      }
    }

    // Import items
    let itemsCount = 0;
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        const newItem: StudyItem = {
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          subjectId: targetSubjectId,
          folderId: item.folderId ? (folderIdMap[item.folderId] || item.folderId) : null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await this.saveItem(newItem);
        itemsCount++;
      }
    }

    // Import flashcards
    let flashcardsCount = 0;
    if (Array.isArray(data.flashcards)) {
      for (const fc of data.flashcards) {
        const newCard: Flashcard = {
          ...fc,
          id: `fc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          subjectId: targetSubjectId,
          createdAt: Date.now(),
        };
        await this.saveFlashcard(newCard);
        flashcardsCount++;
      }
    }

    return { subject: targetSubject, itemsCount, flashcardsCount, foldersCount };
  },

  async exportAllData(): Promise<string> {
    const subjects = await this.getSubjects();
    const items = await this.getAllItems();
    const folders = await this.getFolders();
    const flashcards = await this.getFlashcards();
    const exams = await this.getExamTargets();
    const data = {
      version: 3,
      exportedAt: Date.now(),
      subjects,
      folders,
      items: items.map((it) => ({
        ...it,
        hasLocalBlob: !!it.fileStorageKey,
      })),
      flashcards,
      exams,
    };
    return JSON.stringify(data, null, 2);
  },
};

