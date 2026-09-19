import React, { useState, useEffect } from 'react';
import type { StudyItem } from '../../types';
import {
  Sparkles,
  Download,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Eye,
  Edit3,
  Columns,
  Volume2,
} from 'lucide-react';

interface NoteEditorProps {
  item: StudyItem;
  onUpdateItem: (updated: StudyItem) => void;
  onOpenAiAssist?: (contextPrompt: string) => void;
  defaultViewMode?: 'edit' | 'preview' | 'split';
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  item,
  onUpdateItem,
  onOpenAiAssist,
  defaultViewMode = 'edit',
}) => {
  const [content, setContent] = useState(item.noteContent || '');
  const [title, setTitle] = useState(item.title);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>(defaultViewMode);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Stop speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Debounced auto-save
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      onUpdateItem({
        ...item,
        title,
        noteContent: content,
        updatedAt: Date.now(),
      });
      setSaveStatus('saved');
    }, 600);

    return () => clearTimeout(timer);
  }, [content, title]);

  const insertSnippet = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 10);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Study_Note'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const plainText = `${title}. ` + content
      .replace(/[#*_`~>-]/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (!plainText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Basic markdown to clean HTML parser for live preview
  const renderSimpleMarkdown = (md: string) => {
    if (!md) return '<p class="text-slate-500 italic">Empty note. Start typing your thoughts...</p>';

    const lines = md.split('\n');
    let html = '';

    for (let line of lines) {
      // Headings
      if (line.startsWith('### ')) {
        html += `<h3 class="text-lg font-bold text-indigo-300 mt-4 mb-2">${escapeHtml(line.slice(4))}</h3>`;
        continue;
      }
      if (line.startsWith('## ')) {
        html += `<h2 class="text-xl font-bold text-white mt-5 mb-2 border-b border-slate-700/60 pb-1">${escapeHtml(line.slice(3))}</h2>`;
        continue;
      }
      if (line.startsWith('# ')) {
        html += `<h1 class="text-2xl font-black text-indigo-400 mt-6 mb-3 border-b border-indigo-500/30 pb-2">${escapeHtml(line.slice(2))}</h1>`;
        continue;
      }

      // Checklists
      if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
        const checked = line.startsWith('- [x] ');
        const text = line.slice(6);
        html += `<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled ${checked ? 'checked' : ''} class="rounded accent-indigo-500"/><span class="${checked ? 'line-through text-slate-500' : 'text-slate-200'}">${escapeHtml(text)}</span></div>`;
        continue;
      }

      // Bullet lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        html += `<li class="ml-4 list-disc text-slate-200 my-0.5">${formatInline(line.slice(2))}</li>`;
        continue;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        html += `<blockquote class="border-l-4 border-indigo-500 pl-3 py-1 my-2 bg-indigo-950/20 text-indigo-200 text-sm rounded-r">${formatInline(line.slice(2))}</blockquote>`;
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        html += '<div class="h-3"></div>';
        continue;
      }

      // Standard paragraph
      html += `<p class="text-slate-200 text-sm leading-relaxed my-1">${formatInline(line)}</p>`;
    }

    return html;
  };

  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  const formatInline = (text: string) => {
    let res = escapeHtml(text);
    // Bold
    res = res.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    // Italic
    res = res.replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>');
    // Inline code
    res = res.replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>');
    return res;
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col h-full bg-[#090c13] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl">
      {/* Note Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0e121a] border-b border-white/[0.07] gap-2 shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="bg-transparent text-sm font-bold text-white border-0 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded-lg px-2 py-1 flex-1 min-w-[180px] tracking-tight placeholder-slate-500"
        />

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'} • {wordCount} words
          </span>

          {/* View mode toggle */}
          <div className="flex items-center bg-black/40 border border-white/[0.08] p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'edit' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white'}`}
              title="Edit only"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-md transition-all hidden md:block ${viewMode === 'split' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white'}`}
              title="Split edit & preview"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'preview' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white'}`}
              title="Preview only"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {onOpenAiAssist && (
            <button
              onClick={() =>
                onOpenAiAssist(
                  `Here are my study notes for "${title}":\n\n${content}\n\nCan you review these notes, add any missing critical concepts, and generate 5 practice questions to test my understanding?`
                )
              }
              className="flex items-center gap-1.5 text-xs bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-lg transition-all font-semibold shadow-sm"
              title="Enhance notes or generate quiz with AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">AI Review</span>
            </button>
          )}

          {/* Audio Reader (TTS) with live soundwave */}
          <button
            onClick={handleToggleSpeech}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all font-semibold ${
              isSpeaking
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.1]'
            }`}
            title={isSpeaking ? 'Stop reading aloud' : 'Listen to note (Text-to-Speech)'}
          >
            {isSpeaking ? (
              <div className="flex items-end gap-[2px] h-3 w-3">
                <span className="w-[2px] bg-amber-400 rounded-full animate-wave-1" />
                <span className="w-[2px] bg-amber-400 rounded-full animate-wave-2" />
                <span className="w-[2px] bg-amber-400 rounded-full animate-wave-3" />
              </div>
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">{isSpeaking ? 'Reading' : 'Listen'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition"
            title="Download as Markdown file"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Markdown Toolbar */}
      {viewMode !== 'preview' && (
        <div className="flex items-center gap-1 px-4 py-1.5 bg-[#090c13] border-b border-white/[0.06] text-slate-400 text-xs overflow-x-auto shrink-0">
          <button
            onClick={() => insertSnippet('**', '**')}
            className="p-1.5 hover:bg-white/[0.08] hover:text-white rounded transition"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('*', '*')}
            className="p-1.5 hover:bg-white/[0.08] hover:text-white rounded transition"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-white/[0.08] mx-1" />
          <button
            onClick={() => insertSnippet('# ')}
            className="p-1.5 hover:bg-white/[0.08] hover:text-white rounded transition"
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('## ')}
            className="p-1.5 hover:bg-white/[0.08] hover:text-white rounded transition"
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-white/[0.08] mx-1" />
          <button
            onClick={() => insertSnippet('- ')}
            className="p-1.5 hover:bg-white/[0.08] hover:text-white rounded transition"
            title="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('1. ')}
            className="p-1.5 hover:bg-slate-800 hover:text-white rounded"
            title="Numbered list"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('- [ ] ')}
            className="p-1.5 hover:bg-slate-800 hover:text-white rounded"
            title="Checklist / Task"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('```\n', '\n```')}
            className="p-1.5 hover:bg-slate-800 hover:text-white rounded"
            title="Code block"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('> ')}
            className="px-2 py-0.5 hover:bg-slate-800 hover:text-white rounded font-mono"
            title="Quote"
          >
            Quote
          </button>
        </div>
      )}

      {/* Editor & Preview Panes */}
      <div className="flex-1 flex min-h-0">
        {/* Editor Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`flex-1 flex flex-col bg-slate-950 p-2.5 sm:p-3.5 ${viewMode === 'split' ? 'w-1/2 border-r border-slate-800' : 'w-full'}`}>
            <textarea
              id="note-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your study notes, formulas, questions and summaries here..."
              className="flex-1 w-full bg-transparent text-slate-100 placeholder-slate-600 font-mono text-xs md:text-sm resize-none focus:outline-none leading-relaxed"
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`flex-1 bg-slate-900/40 p-6 overflow-y-auto ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div
              className="prose prose-invert max-w-none text-xs md:text-sm"
              dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(content) }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
