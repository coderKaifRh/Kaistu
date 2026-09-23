export type ContentType = 'pdf' | 'docx' | 'pptx' | 'ppt' | 'youtube' | 'note';

export interface Subject {
  id: string;
  name: string;
  code?: string;
  description?: string;
  icon: string;
  color: string;
  createdAt: number;
  itemCount?: number;
}

export interface StudyFolder {
  id: string;
  subjectId: string;
  parentId?: string | null; // null/undefined for root level of the subject
  name: string;
  createdAt: number;
  updatedAt?: number;
}

export interface VideoBookmark {
  id: string;
  timestamp: number; // in seconds
  title: string;
  note?: string;
}

export interface StudyItem {
  id: string;
  subjectId: string;
  folderId?: string | null; // null/undefined for root level of subject
  title: string;
  type: ContentType;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  fileStorageKey?: string; // key in IndexedDB for large blob
  youtubeUrl?: string;
  youtubeVideoId?: string;
  noteContent?: string;
  bookmarks?: VideoBookmark[];
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
}

export interface PomodoroState {
  workMinutes: number;
  breakMinutes: number;
  secondsRemaining: number;
  isRunning: boolean;
  mode: 'work' | 'break';
  completedSessions: number;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface Flashcard {
  id: string;
  subjectId: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  lastReviewed?: number;
  createdAt: number;
}

export interface ExamTarget {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  createdAt: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type AmbientSoundType = 'rain' | 'waves' | 'cafe' | 'whitenoise';
