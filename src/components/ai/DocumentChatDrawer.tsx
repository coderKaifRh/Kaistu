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
  Bot,
  User,
  Presentation,
} from 'lucide-react';

interface DocumentChatDrawerProps {
  item: StudyItem;
  isOpen: boolean;
  onClose: () => void;
  onJumpToPage?: (pageNumber: number) => void;
  initialPrompt?: string;
}

const DEFAULT_QUICK_PROMPTS = [
  'Summarize this document in 5 high-yield exam takeaways',
  'What are the core formulas and fundamental definitions here?',
  'Generate 5 practice questions with answers from this material',
  'Explain the main concept in simple terms for a beginner',
];

const PPT_QUICK_PROMPTS = [
  'Summarize all slides in 5 high-yield exam takeaways',
  'What are the core concepts, formulas & definitions in these slides?',
  'Generate 5 practice exam questions with answers from these slides',
  'Explain the key takeaways simply with intuitive analogies',
];

export const DocumentChatDrawer: React.FC<DocumentChatDrawerProps> = ({
  item,
  isOpen,
  onClose,
  onJumpToPage,
  initialPrompt,
}) => {
  const isPresentation = item.type === 'pptx' || item.type === 'ppt';
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

  // Handle initial prompt passed to drawer
  useEffect(() => {
    if (initialPrompt && isOpen) {
      setInputText(initialPrompt);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [initialPrompt, isOpen]);

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
        contentType: item.type,
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
    // Replace [Page X] or [Slide X] tags with interactive clickable buttons
    const parts = text.split(/(\[(?:page|slide)\s*\d+\])/gi);

    return parts.map((part, index) => {
      const match = part.match(/\[(page|slide)\s*(\d+)\]/i);
      if (match && onJumpToPage) {
        const isSlide = match[1].toLowerCase() === 'slide' || isPresentation;
        const pageNum = parseInt(match[2], 10);
        return (
          <button
            key={index}
            onClick={() => onJumpToPage(pageNum)}
            className={`inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold transition-all shadow-xs active:scale-95 cursor-pointer ${
              isSlide
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
            title={`Click to jump directly to ${isSlide ? 'Slide' : 'Page'} ${pageNum}`}
          >
            {isSlide ? (
              <Presentation className="w-3 h-3 text-amber-600" />
            ) : (
              <FileText className="w-3 h-3 text-emerald-600" />
            )}
            <span>{isSlide ? `Slide ${pageNum}` : `Page ${pageNum}`}</span>
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-white border-l border-gray-200 shadow-2xl transition-all duration-300 animate-in slide-in-from-right text-gray-800 font-sans ${
        isExpanded ? 'w-full md:w-[680px]' : 'w-full sm:w-[440px] md:w-[480px]'
      }`}
    >
      {/* Top Header (ChatGPT Style Clean Light Header) */}
      <header className="px-4 py-3.5 border-b border-gray-200 bg-white flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center text-white shadow-sm shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-gray-900 tracking-tight">
                AI Document Tutor
              </h2>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                {currentModel}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 truncate max-w-[220px]">
              {item.title}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Key settings button */}
          <button
            onClick={() => setShowKeySetup((prev) => !prev)}
            className={`p-1.5 rounded-lg transition text-xs flex items-center gap-1 ${
              showKeySetup || !isKeyConfigured
                ? 'bg-gray-100 text-gray-900 border border-gray-300 font-semibold'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Configure Gemini API Key"
          >
            <Key className="w-4 h-4" />
          </button>

          {/* Expand / Shrink */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition hidden sm:block"
            title={isExpanded ? 'Collapse width' : 'Expand width'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body Area */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-white">
        {/* API Key Setup Modal / Slide-down (Clean Light Card) */}
        {showKeySetup && (
          <div className="p-4 sm:p-5 bg-[#f9fafb] border-b border-gray-200 shrink-0 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-600" />
                  <span>Connect Free Gemini API Key</span>
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Use Google's free Gemini API key to chat with any PDF or note. Stored strictly in your browser (100% private & zero server cost).
                </p>
              </div>
              {isKeyConfigured && (
                <button
                  onClick={() => setShowKeySetup(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
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
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold transition group shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span>Get 100% Free Key from Google AI Studio</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
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
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none transition font-mono shadow-xs"
                  />
                  {keyError && (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{keyError}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isValidatingKey}
                    className="flex-1 py-2 px-4 rounded-xl bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
                      className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200 text-xs font-medium transition"
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
        {isExtracting ? (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-2 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            <span>
              {isPresentation
                ? 'Indexing PowerPoint presentation slides & notes...'
                : 'Indexing document pages for citations...'}
            </span>
          </div>
        ) : pages.length > 0 ? (
          <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 flex items-center justify-between font-mono">
            <span className="flex items-center gap-1.5 font-medium">
              {isPresentation ? (
                <Presentation className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className={isPresentation ? 'text-amber-700' : 'text-emerald-700'}>
                {pages.length} {isPresentation ? 'Slides Indexed' : 'Pages Indexed'}
              </span>
            </span>
            <span className="text-slate-400">RAG Semantic Search Ready</span>
          </div>
        ) : null}

        {/* Chat Messages Stream (Clean Light Canvas) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white">
          {messages.length === 0 ? (
            <div className="py-10 px-2 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#10a37f]/10 text-[#10a37f] flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {isPresentation ? 'Ask Questions About These Slides' : 'Ask Questions About This Material'}
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mb-6 leading-relaxed">
                {isPresentation
                  ? 'Your AI tutor scans your PowerPoint slides & speaker notes to give accurate explanations and clickable slide citations.'
                  : 'Your AI tutor scans this document to give accurate explanations and clickable page citations.'}
              </p>

              {/* Quick Prompts (ChatGPT Style Light Cards) */}
              <div className="w-full space-y-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left px-1">
                  Suggested Prompts:
                </p>
                {(isPresentation ? PPT_QUICK_PROMPTS : DEFAULT_QUICK_PROMPTS).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 text-xs text-gray-800 transition flex items-center justify-between group shadow-xs cursor-pointer"
                  >
                    <span>{prompt}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* AI Avatar */}
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-0.5 text-[10px] text-gray-400 font-mono">
                    <span className="font-semibold text-gray-600">
                      {msg.sender === 'user' ? 'You' : 'KaiStu Tutor'}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-[#f4f4f4] text-gray-900 rounded-br-xs border border-gray-200/80 font-normal'
                        : 'bg-white border border-gray-200/90 text-gray-800 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    {msg.sender === 'ai' ? (
                      <div className="space-y-2.5">
                        <div className="text-gray-800 leading-relaxed font-normal">
                          {renderFormattedText(msg.text)}
                        </div>

                        {/* Clickable Page/Slide Citations Banner */}
                        {msg.citedPages && msg.citedPages.length > 0 && onJumpToPage && (
                          <div className="pt-2.5 mt-2 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-gray-500 font-medium">
                              {isPresentation ? 'Referenced Slides:' : 'Referenced Pages:'}
                            </span>
                            {msg.citedPages.map((pg) => (
                              <button
                                key={pg}
                                onClick={() => onJumpToPage(pg)}
                                className={`px-2 py-0.5 rounded-md font-mono font-semibold text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                                  isPresentation
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                                title={`Jump to ${isPresentation ? 'Slide' : 'Page'} ${pg}`}
                              >
                                {isPresentation ? (
                                  <Presentation className="w-3 h-3 text-amber-600" />
                                ) : (
                                  <FileText className="w-3 h-3 text-emerald-600" />
                                )}
                                <span>{isPresentation ? `Slide ${pg}` : `Page ${pg}`}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span>{msg.text}</span>
                    )}
                  </div>

                  {/* Message Actions */}
                  {msg.sender === 'ai' && (
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <button
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="p-1 text-gray-400 hover:text-gray-700 transition text-[11px] flex items-center gap-1 rounded hover:bg-gray-100"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Copied</span>
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

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-bl-xs bg-gray-50 border border-gray-200 text-gray-600 text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Reading relevant pages & generating explanation...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar (ChatGPT Signature Rounded Box) */}
        <div className="p-4 border-t border-gray-200 bg-white shrink-0">
          <div className="relative flex items-end gap-2 bg-[#f4f4f4] border border-gray-200 focus-within:border-gray-400 focus-within:bg-white rounded-2xl p-2 transition-all shadow-xs">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isKeyConfigured
                  ? 'Message AI Tutor... (Press Enter to send)'
                  : 'Click the Key icon above to activate Gemini API...'
              }
              disabled={!isKeyConfigured || isLoading}
              className="flex-1 p-1 bg-transparent border-0 text-[13px] text-gray-900 placeholder-gray-400 resize-none focus:outline-none transition leading-relaxed disabled:opacity-50"
            />

            <div className="flex items-center gap-1 shrink-0 pb-0.5">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-200/60 rounded-lg transition"
                  title="Clear conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || !isKeyConfigured || isLoading}
                className="w-8 h-8 rounded-full bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed"
                title="Send message (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 mt-2 text-center">
            Powered by {currentModel} • Press <kbd className="font-mono bg-gray-100 px-1 py-0.5 rounded border border-gray-200 text-gray-500">Enter</kbd> to send
          </p>
        </div>
      </div>
    </div>
  );
};
