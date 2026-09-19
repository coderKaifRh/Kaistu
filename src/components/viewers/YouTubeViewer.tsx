import React, { useState, useRef } from 'react';
import type { StudyItem, VideoBookmark } from '../../types';
import {
  Bookmark,
  Clock,
  Play,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface YouTubeViewerProps {
  item: StudyItem;
  onUpdateItem: (updated: StudyItem) => void;
  onOpenAiAssist?: (contextPrompt: string) => void;
}

export const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

export const formatSecondsToTime = (totalSeconds: number): string => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const parseTimeToSeconds = (timeStr: string): number => {
  const parts = timeStr.trim().split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const single = Number(timeStr);
  return isNaN(single) ? 0 : single;
};

export const YouTubeViewer: React.FC<YouTubeViewerProps> = ({
  item,
  onUpdateItem,
  onOpenAiAssist,
}) => {
  const videoId = item.youtubeVideoId || extractYouTubeId(item.youtubeUrl || '');
  const [currentStartTime, setCurrentStartTime] = useState<number>(0);
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkTime, setNewBookmarkTime] = useState('');
  const [newBookmarkNote, setNewBookmarkNote] = useState('');
  const [showAddBookmark, setShowAddBookmark] = useState(false);
  // Default to false so 100% of height and width is dedicated to the giant video!
  const [showTimestampsPanel, setShowTimestampsPanel] = useState(false);
  const [isFullscreenCinema, setIsFullscreenCinema] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bookmarks = item.bookmarks || [];

  const handleJumpToTime = (seconds: number) => {
    setCurrentStartTime(seconds);
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookmarkTitle) return;

    const seconds = parseTimeToSeconds(newBookmarkTime);
    const newBookmark: VideoBookmark = {
      id: 'bm-' + Date.now(),
      timestamp: seconds,
      title: newBookmarkTitle,
      note: newBookmarkNote,
    };

    const updatedBookmarks = [...bookmarks, newBookmark].sort((a, b) => a.timestamp - b.timestamp);
    onUpdateItem({
      ...item,
      bookmarks: updatedBookmarks,
    });

    setNewBookmarkTitle('');
    setNewBookmarkTime('');
    setNewBookmarkNote('');
    setShowAddBookmark(false);
  };

  const handleDeleteBookmark = (bmId: string) => {
    const updated = bookmarks.filter((b) => b.id !== bmId);
    onUpdateItem({
      ...item,
      bookmarks: updated,
    });
  };

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
        <Play className="w-16 h-16 text-red-500 mb-4 opacity-75" />
        <h3 className="text-lg font-semibold text-slate-200">Invalid YouTube URL</h3>
        <p className="text-sm mt-1">Please check the link provided: {item.youtubeUrl}</p>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${currentStartTime}&enablejsapi=1&rel=0`;

  return (
    <div
      className={`flex flex-col h-full w-full bg-slate-950 text-white overflow-hidden transition-all duration-200 ${
        isFullscreenCinema
          ? 'fixed inset-0 z-50 bg-black'
          : 'rounded-xl border border-slate-800 shadow-2xl'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/95 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <span className="bg-red-600/20 text-red-400 text-xs font-semibold px-2 py-0.5 rounded border border-red-600/30 flex items-center gap-1 shrink-0">
            <Play className="w-3 h-3 fill-red-500" /> YouTube
          </span>
          <h2 className="font-semibold text-xs truncate text-slate-100" title={item.title}>
            {item.title}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Timestamps toggle button */}
          <button
            onClick={() => setShowTimestampsPanel(!showTimestampsPanel)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition ${
              showTimestampsPanel
                ? 'bg-amber-950/50 text-amber-300 border-amber-800/70'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title="Toggle Timestamps Drawer"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Moments ({bookmarks.length})</span>
            {showTimestampsPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {onOpenAiAssist && (
            <button
              onClick={() =>
                onOpenAiAssist(
                  `I am studying from this YouTube video titled "${item.title}". Can you give me a structured summary, key concepts, and 3 practice quiz questions on this topic?`
                )
              }
              className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg transition font-medium shadow-sm"
              title="Ask AI about this video"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Summary</span>
            </button>
          )}

          {/* Full-Screen Cinema Mode Toggle */}
          <button
            onClick={() => setIsFullscreenCinema(!isFullscreenCinema)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title={isFullscreenCinema ? 'Exit Full Screen' : 'Full Screen Cinema'}
          >
            {isFullscreenCinema ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <a
            href={item.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main Container: Full-Height, Full-Width Giant Video Player */}
      <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden relative">
        <div className="w-full h-full bg-black flex-1 min-h-0 relative flex items-center justify-center">
          <iframe
            ref={iframeRef}
            key={currentStartTime}
            src={embedUrl}
            title={item.title}
            className="w-full h-full border-0 absolute inset-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Timestamps Drawer (Only shown when toggled, never steals default video space) */}
        {showTimestampsPanel && (
          <div className="h-40 w-full bg-slate-900/98 border-t border-slate-800 flex flex-col shrink-0 shadow-xl">
            <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-1.5 font-medium text-xs text-slate-300">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span>Video Bookmarks ({bookmarks.length})</span>
              </div>
              <button
                onClick={() => setShowAddBookmark(!showAddBookmark)}
                className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/50 px-2 py-0.5 rounded transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Bookmark</span>
              </button>
            </div>

            {/* Add Bookmark Form */}
            {showAddBookmark && (
              <form onSubmit={handleAddBookmark} className="p-2 bg-slate-850 border-b border-slate-700 flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Time (e.g. 04:30 or 90)"
                    value={newBookmarkTime}
                    onChange={(e) => setNewBookmarkTime(e.target.value)}
                    className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Topic / Note title"
                    value={newBookmarkTitle}
                    onChange={(e) => setNewBookmarkTitle(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium shrink-0"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddBookmark(false)}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Optional brief notes on what was discussed..."
                  value={newBookmarkNote}
                  onChange={(e) => setNewBookmarkNote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </form>
            )}

            {/* List of Bookmarks */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {bookmarks.length === 0 ? (
                <div className="text-center py-3 text-slate-500 text-xs flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 opacity-40" />
                  <span>No bookmarks yet. Click "+ Add Bookmark" to tag formulas or topics!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="group flex items-start justify-between p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <button
                        onClick={() => handleJumpToTime(bm.timestamp)}
                        className="flex items-start gap-2 text-left flex-1 min-w-0"
                      >
                        <span className="shrink-0 text-xs font-mono font-bold px-1.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded flex items-center gap-1 group-hover:bg-indigo-900 transition">
                          <Play className="w-2.5 h-2.5 fill-indigo-400" />
                          {formatSecondsToTime(bm.timestamp)}
                        </span>
                        <div className="truncate flex-1">
                          <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                            {bm.title}
                          </div>
                          {bm.note && <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{bm.note}</div>}
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteBookmark(bm.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition ml-1"
                        title="Delete bookmark"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
