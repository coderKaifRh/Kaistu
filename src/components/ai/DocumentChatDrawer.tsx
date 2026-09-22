import React, { useState, useEffect, useRef } from 'react';
import type { StudyItem } from '../../types';
import { GeminiKeyService } from '../../services/geminiKeyService';
import { DocumentTextExtractor, type ExtractedPage } from '../../services/documentTextExtractor';
import { GeminiChatService, type ChatMessage } from '../../services/geminiChatService';
import {
  Sparkles,
  X,
  Send,
  Key,
  ExternalLink,
  Loader2,
  Trash2,
  Copy,
  Check,
  FileText,
  AlertCircle,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface DocumentChatDrawerProps {
  item: StudyItem;
  isOpen: boolean;
  onClose: () => void;
  onJumpToPage?: (pageNumber: number) => void;
}

const QUICK_PROMPTS = [
  'Summarize this document in 5 high-yield exam takeaways',
  'What are the core formulas and fundamental definitions here?',
  'Generate 5 practice questions with answers from this material',
  'Explain the main concept in simple terms for a beginner',
];

export const DocumentChatDrawer: React.FC<DocumentChatDrawerProps> = ({
  item,
  isOpen,
  onClose,
  onJumpToPage,
}) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean>(false);
  const [showKeySetup, setShowKeySetup] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isValidatingKey, setIsValidatingKey] = useState<boolean>(false);
  const [currentModel, setCurrentModel] = useState<string>(GeminiKeyService.getModel());

  // Document Pages
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Key and Document Text
  useEffect(() => {
    const savedKey = GeminiKeyService.getKey();
    const resolvedModel = GeminiKeyService.getModel();
    setCurrentModel(resolvedModel);

    if (savedKey) {
      setApiKey(savedKey);
      setIsKeyConfigured(true);
      setShowKeySetup(false);
    } else {
      setIsKeyConfigured(false);
      setShowKeySetup(true);
    }
  }, []);

  // When drawer opens or item changes, extract document text in background
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const loadText = async () => {
      setIsExtracting(true);
      try {
        const extracted = await DocumentTextExtractor.extractText(item);
        if (active) {
          setPages(extracted);
        }
      } catch (err) {
        console.warn('Failed to extract text for AI chat:', err);
      } finally {
        if (active) {
          setIsExtracting(false);
        }
      }
    };

    loadText();
    return () => {
      active = false;
    };
  }, [isOpen, item]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Save & Validate Key
  const handleSaveKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setKeyError(null);

    const trimmed = keyInput.trim();
    if (!trimmed) {
      setKeyError('Please paste your Gemini API key');
      return;
    }

    setIsValidatingKey(true);
    const result = await GeminiKeyService.validateKey(trimmed);
    setIsValidatingKey(false);

    if (result.valid) {
      GeminiKeyService.saveKey(trimmed);
      setApiKey(trimmed);
      setIsKeyConfigured(true);
      setShowKeySetup(false);
      setKeyInput('');
      if (result.model) {
        setCurrentModel(result.model);
      }
    } else {
      setKeyError(result.error || 'Invalid API key. Please check and try again.');
    }
  };

  const handleRemoveKey = () => {
    if (confirm('Are you sure you want to remove your saved Gemini API key?')) {
      GeminiKeyService.removeKey();
      setApiKey('');
      setIsKeyConfigured(false);
      setShowKeySetup(true);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    if (!apiKey) {
      setShowKeySetup(true);
      return;
    }

    setInputText('');

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Find relevant pages using RAG
      const relevant = DocumentTextExtractor.findRelevantPages(pages, query, 4);

      const result = await GeminiChatService.askQuestion({
        apiKey,
        question: query,
        documentTitle: item.title,
        relevantPages: relevant,
        chatHistory: messages,
      });

      setCurrentModel(GeminiKeyService.getModel());

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: result.answer,
        timestamp: Date.now(),
        citedPages: result.citedPages,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'ai',
        text: `⚠️ **Error communicating with Gemini:** ${err.message || 'Please check your API key or connection.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderFormattedText = (text: string) => {
    // Replace [Page X] tags with interactive clickable buttons
    const parts = text.split(/(\[page\s*\d+\])/gi);

    return parts.map((part, index) => {
      const match = part.match(/\[page\s*(\d+)\]/i);
      if (match && onJumpToPage) {
        const pageNum = parseInt(match[1], 10);
        return (
          <button
            key={index}
            onClick={() => onJumpToPage(pageNum)}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-purple-500/25 hover:bg-purple-500/40 text-purple-200 border border-purple-500/50 text-[11px] font-mono font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            title={`Click to jump directly to Page ${pageNum}`}
          >
            <FileText className="w-3 h-3 text-pink-400" />
            <span>Page {pageNum}</span>
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-[#0c0818]/95 border-l border-purple-500/30 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] transition-all duration-300 animate-in slide-in-from-right text-slate-100 ${
        isExpanded ? 'w-full md:w-[680px]' : 'w-full sm:w-[440px] md:w-[480px]'
      }`}
    >
      {/* Top Header */}
      <header className="px-4 py-3.5 border-b border-white/[0.08] bg-[#090614]/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] shrink-0">
            <Sparkles className="w-4 h-4 text-amber-200" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black text-white tracking-tight uppercase">
                AI Document Tutor
              </h2>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {currentModel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
              {item.title}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Key settings button */}
          <button
            onClick={() => setShowKeySetup((prev) => !prev)}
            className={`p-1.5 rounded-lg transition text-xs flex items-center gap-1 ${
              showKeySetup || !isKeyConfigured
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
            title="Configure Gemini API Key"
          >
            <Key className="w-4 h-4" />
          </button>

          {/* Expand / Shrink */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition hidden sm:block"
            title={isExpanded ? 'Collapse width' : 'Expand width'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body Area */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* API Key Setup Modal / Slide-down */}
        {showKeySetup && (
          <div className="p-4 sm:p-5 bg-gradient-to-b from-[#170e2f] to-[#0d071a] border-b border-purple-500/30 shrink-0 animate-in slide-in-from-top-2 duration-200 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-400" />
                  <span>Activate Free AI Tutor</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Use Google's free Gemini API key to chat with any PDF or note. Stored only in your browser (100% private & zero server cost).
                </p>
              </div>
              {isKeyConfigured && (
                <button
                  onClick={() => setShowKeySetup(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-200 text-xs font-semibold transition group shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
                  <span>Get 100% Free Key from Google AI Studio</span>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400" />
              </a>

              <form onSubmit={handleSaveKey} className="space-y-2">
                <div>
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder={
                      isKeyConfigured
                        ? 'Paste new Gemini API Key to update...'
                        : 'Paste your key here (AIzaSy...)'
                    }
                    className="w-full px-3.5 py-2.5 bg-[#090614] border border-purple-500/30 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition font-mono"
                  />
                  {keyError && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{keyError}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isValidatingKey}
                    className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center justify-center gap-1.5"
                  >
                    {isValidatingKey ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying with Google...</span>
                      </>
                    ) : (
                      <span>Save & Activate Key</span>
                    )}
                  </button>

                  {isKeyConfigured && (
                    <button
                      type="button"
                      onClick={handleRemoveKey}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                      title="Delete Key from this device"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Document Parsing Status Banner */}
        {isExtracting && (
          <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/20 text-[11px] text-purple-300 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
            <span>Indexing document pages for citations...</span>
          </div>
        )}

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="py-8 px-2 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-pink-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-3 shadow-[0_0_25px_rgba(168,85,247,0.3)]">
                <Sparkles className="w-6 h-6 text-pink-400 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                Ask Questions About This Material
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mb-6">
                Your AI tutor scans this document to give accurate explanations and citations.
              </p>

              {/* Quick Prompts */}
              <div className="w-full space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 text-left px-1">
                  Suggested Prompts:
                </p>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-2.5 rounded-xl bg-purple-500/[0.07] hover:bg-purple-500/20 border border-purple-500/20 text-xs text-slate-200 hover:text-white transition flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-mono">
                  {msg.sender === 'user' ? (
                    <span>You</span>
                  ) : (
                    <span className="flex items-center gap-1 text-purple-400 font-bold">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span>KaiStu Tutor</span>
                    </span>
                  )}
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[92%] shadow-md whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-sm'
                      : 'bg-[#150d28] border border-purple-500/30 text-slate-200 rounded-bl-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                  }`}
                >
                  {msg.sender === 'ai' ? (
                    <div className="space-y-2">
                      <div className="prose prose-invert prose-xs max-w-none">
                        {renderFormattedText(msg.text)}
                      </div>

                      {/* Clickable Page Citations Banner */}
                      {msg.citedPages && msg.citedPages.length > 0 && onJumpToPage && (
                        <div className="pt-2 mt-2 border-t border-white/[0.08] flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-medium">Referenced Pages:</span>
                          {msg.citedPages.map((pg) => (
                            <button
                              key={pg}
                              onClick={() => onJumpToPage(pg)}
                              className="px-2 py-0.5 rounded-md bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 border border-purple-500/40 font-mono font-bold text-[10px] transition-all flex items-center gap-1"
                              title={`Jump to Page ${pg}`}
                            >
                              <FileText className="w-3 h-3 text-pink-400" />
                              <span>Page {pg}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </div>

                {msg.sender === 'ai' && (
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="p-1 text-slate-500 hover:text-slate-300 transition text-[10px] flex items-center gap-1"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-purple-400 font-bold">
                <Sparkles className="w-3 h-3 text-pink-400 animate-spin" />
                <span>KaiStu Tutor</span>
              </div>
              <div className="p-3.5 rounded-2xl rounded-bl-sm bg-[#150d28] border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                <span>Reading relevant pages & generating answer...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-white/[0.08] bg-[#090614]/90 shrink-0">
          <div className="relative flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isKeyConfigured
                  ? 'Ask a question about this material (e.g. key theorem or formula)...'
                  : 'Click the Key icon above to activate Gemini API...'
              }
              disabled={!isKeyConfigured || isLoading}
              className="flex-1 p-2.5 bg-[#120a22] border border-purple-500/30 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 resize-none focus:outline-none transition leading-relaxed disabled:opacity-50"
            />

            <div className="flex flex-col gap-1 shrink-0">
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || !isKeyConfigured || isLoading}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all cursor-pointer"
                title="Send question (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>

              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="w-10 h-6 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition"
                  title="Clear conversation"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5 text-center">
            Powered by Gemini 1.5 Flash • Press <kbd className="font-mono text-slate-400">Enter</kbd> to send
          </p>
        </div>
      </div>
    </div>
  );
};
