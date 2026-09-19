import { get, set, del } from 'idb-keyval';
import type { Subject, StudyItem, Flashcard, ExamTarget } from '../types';

const SUBJECTS_KEY = 'kaistu_subjects';
const ITEMS_KEY = 'kaistu_items';
const SETTINGS_KEY = 'kaistu_settings';
const FLASHCARDS_KEY = 'kaistu_flashcards';
const EXAMS_KEY = 'kaistu_exams';

// Default starter subjects so user is never greeted with a blank screen
export const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'sub-cs-101',
    name: 'Computer Science & AI',
    code: 'CSE-101',
    description: 'Algorithms, Data Structures, Machine Learning & Web Tech',
    icon: 'Brain',
    color: 'from-blue-600 to-indigo-600',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    id: 'sub-math',
    name: 'Higher Mathematics',
    code: 'MATH-201',
    description: 'Calculus, Linear Algebra, Differential Equations',
    icon: 'Sigma',
    color: 'from-emerald-600 to-teal-600',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: 'sub-physics',
    name: 'General Physics',
    code: 'PHY-102',
    description: 'Mechanics, Electromagnetism, Quantum Mechanics',
    icon: 'Atom',
    color: 'from-purple-600 to-pink-600',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
];

export const DEFAULT_ITEMS: StudyItem[] = [
  {
    id: 'item-demo-yt',
    subjectId: 'sub-cs-101',
    title: 'How Large Language Models Work (3Blue1Brown)',
    type: 'youtube',
    youtubeUrl: 'https://www.youtube.com/watch?v=wjZofJX0v4U',
    youtubeVideoId: 'wjZofJX0v4U',
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    updatedAt: Date.now() - 1000 * 60 * 60 * 20,
    bookmarks: [
      { id: 'b1', timestamp: 75, title: 'Attention Mechanism Intro', note: 'Visual explanation of tokens' },
      { id: 'b2', timestamp: 350, title: 'Matrix Multiplications', note: 'Query, Key, Value weights' },
    ],
    tags: ['AI', 'Transformers', '3Blue1Brown'],
  },
  {
    id: 'item-demo-note',
    subjectId: 'sub-cs-101',
    title: 'Quick Revision Notes: Big-O & Complexity',
    type: 'note',
    noteContent: `# Data Structures & Algorithms: Quick Sheet

## 1. Time Complexity Highlights
- **O(1)**: Constant time (Hash table lookup, array index)
- **O(log n)**: Binary Search, Balanced BST lookup
- **O(n)**: Linear search, array traversal
- **O(n log n)**: Merge Sort, Heap Sort, Quick Sort (average)
- **O(n^2)**: Bubble sort, nested loops

## 2. Key Reminders
- Master Theorem for divide and conquer: $T(n) = aT(n/b) + f(n)$
- Dynamic Programming: Look for overlapping subproblems and optimal substructure!

> *Tip: Keep practicing on KaiStu every day!*`,
    createdAt: Date.now() - 1000 * 60 * 60 * 10,
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
    tags: ['Algorithms', 'Exam Prep'],
  },
];

export const StorageService = {
  async getSubjects(): Promise<Subject[]> {
    try {
      const stored = await get<Subject[]>(SUBJECTS_KEY);
      if (stored && stored.length > 0) {
        return stored;
      }
      await set(SUBJECTS_KEY, DEFAULT_SUBJECTS);
      return DEFAULT_SUBJECTS;
    } catch (e) {
      console.error('Failed to load subjects:', e);
      return DEFAULT_SUBJECTS;
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

  async getAllItems(): Promise<StudyItem[]> {
    try {
      const items = await get<StudyItem[]>(ITEMS_KEY);
      if (items && items.length > 0) {
        return items;
      }
      await set(ITEMS_KEY, DEFAULT_ITEMS);
      return DEFAULT_ITEMS;
    } catch (e) {
      console.error('Failed to load items:', e);
      return DEFAULT_ITEMS;
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

  async deleteFlashcard(id: string): Promise<void> {
    const cards = await this.getFlashcards();
    const filtered = cards.filter((c) => c.id !== id);
    await set(FLASHCARDS_KEY, filtered);
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

    const bundle = {
      app: 'KaiStu',
      formatVersion: '1.0',
      exportedAt: Date.now(),
      subject,
      items: items.map((it) => ({
        ...it,
        // Keep notes and links intact for easy sharing with friends
        hasLocalBlob: !!it.fileStorageKey,
      })),
      flashcards,
    };
    return JSON.stringify(bundle, null, 2);
  },

  async importSubjectBundle(bundleJson: string): Promise<{ subject: Subject; itemsCount: number; flashcardsCount: number }> {
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

    // Import items
    let itemsCount = 0;
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        const newItem: StudyItem = {
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          subjectId: targetSubjectId,
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

    return { subject: targetSubject, itemsCount, flashcardsCount };
  },

  async exportAllData(): Promise<string> {
    const subjects = await this.getSubjects();
    const items = await this.getAllItems();
    const flashcards = await this.getFlashcards();
    const exams = await this.getExamTargets();
    const data = {
      version: 2,
      exportedAt: Date.now(),
      subjects,
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

