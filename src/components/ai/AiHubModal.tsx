import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Sparkles,
  Bot,
  Copy,
  Check,
  BookOpen,
  HelpCircle,
  ListOrdered,
  FileText,
  Compass,
  Cpu,
  ArrowRight,
} from 'lucide-react';

interface AiHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  contextInfo?: string;
}

interface AiTool {
  id: string;
  name: string;
  provider: string;
  url: string;
  badge: string;
  color: string;
  bgGradient: string;
  description: string;
  icon: React.ElementType;
}

const AI_TOOLS: AiTool[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    provider: 'Google DeepMind',
    url: 'https://gemini.google.com',
    badge: 'Multimodal & Fast',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    bgGradient: 'from-blue-600/20 to-indigo-600/10',
    description: 'Best for complex science, math equations, research papers, and multimodal study.',
    icon: Sparkles,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT (GPT-4o)',
    provider: 'OpenAI',
    url: 'https://chatgpt.com',
    badge: 'Code & Writing',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    bgGradient: 'from-emerald-600/20 to-teal-600/10',
    description: 'Best for programming algorithms, step-by-step problem breakdown, and essay drafting.',
    icon: Bot,
  },
  {
    id: 'claude',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    url: 'https://claude.ai',
    badge: 'Deep Reasoning',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    bgGradient: 'from-amber-600/20 to-orange-600/10',
    description: 'Best for nuanced conceptual synthesis, philosophy, critique, and reading long text.',
    icon: Cpu,
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    provider: 'Perplexity',
    url: 'https://www.perplexity.ai',
    badge: 'Live Web Sources',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    bgGradient: 'from-cyan-600/20 to-blue-600/10',
    description: 'Best for cited research, fact-checking academic definitions, and latest literature.',
    icon: Compass,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    badge: 'Math & Logic',
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    bgGradient: 'from-indigo-600/20 to-purple-600/10',
    description: 'High-performance open reasoning model tailored for tough STEM & coding proofs.',
    icon: Sparkles,
  },
];

export const AiHubModal: React.FC<AiHubModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  contextInfo,
}) => {
  const [promptText, setPromptText] = useState(
    initialPrompt || 'Explain the core principles of this topic in simple terms with an everyday analogy.'
  );
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyAndLaunch = async (url: string, toolId: string) => {
    try {
      if (promptText.trim()) {
        await navigator.clipboard.writeText(promptText.trim());
        setCopiedAction(toolId);
        setTimeout(() => setCopiedAction(null), 2500);
      }
    } catch {
      // Clipboard write fallback
    }

    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const width = 520;
      const height = 800;
      const left = window.screen.width - width - 30;
      const top = 50;
      window.open(
        url,
        `KaiStu_AI_${toolId}`,
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
      );
    }
  };

  const handleQuickTemplate = (template: string) => {
    const topic = contextInfo ? ` regarding ${contextInfo}` : '';
    setPromptText(template.replace('{topic}', topic));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b0e14] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] bg-[#080a0f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  AI Study Hub & Web Launchers
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Direct Official
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                1-click study prompts with direct access to official ChatGPT, Gemini, Claude & Perplexity
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
            title="Close AI Hub"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Study Prompt & 1-Click Launch Box */}
          <div className="bg-[#07090e] border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Your Study Prompt (Auto-copied to Clipboard)</span>
              </label>
              {copiedAction && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium animate-pulse">
                  <Check className="w-3.5 h-3.5" /> Prompt copied! Opening web AI...
                </span>
              )}
            </div>

            <textarea
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Type or select a question to ask Gemini, ChatGPT, or Claude..."
              className="w-full bg-[#0b0e14] border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition resize-none leading-relaxed"
            />

            {/* Prompt Quick Chips */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <span className="text-slate-500 font-medium shrink-0">Templates:</span>
              <button
                onClick={() =>
                  handleQuickTemplate(
                    'Explain the foundational concept of this topic in simple terms with a real-world everyday analogy.'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white shrink-0 transition flex items-center gap-1"
              >
                <BookOpen className="w-3 h-3 text-indigo-400" />
                <span>Explain Simply</span>
              </button>
              <button
                onClick={() =>
                  handleQuickTemplate(
                    'Generate 5 rigorous practice multiple-choice questions with detailed explanations for each option.'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white shrink-0 transition flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3 text-amber-400" />
                <span>5 Practice MCQs</span>
              </button>
              <button
                onClick={() =>
                  handleQuickTemplate(
                    'Summarize the top 5 high-yield exam takeaways, common student pitfalls, and critical definitions.'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white shrink-0 transition flex items-center gap-1"
              >
                <ListOrdered className="w-3 h-3 text-emerald-400" />
                <span>Exam Summary</span>
              </button>
            </div>
          </div>

          {/* Official Real AI Tools Cards */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Choose AI Service to Launch
              </h3>
              <span className="text-[11px] text-slate-500">
                Opens official web interface with prompt ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AI_TOOLS.map((tool) => {
                const IconComp = tool.icon;
                const isJustCopied = copiedAction === tool.id;

                return (
                  <div
                    key={tool.id}
                    className="bg-[#080a0f] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 transition-all flex flex-col justify-between group hover:shadow-lg hover:shadow-black/40"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${tool.color}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                              {tool.name}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {tool.provider}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${tool.color}`}>
                          {tool.badge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        {tool.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
                      <button
                        onClick={() => handleCopyAndLaunch(tool.url, tool.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                          isJustCopied
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                            : 'bg-white/[0.06] hover:bg-indigo-600 text-slate-200 hover:text-white shadow-sm'
                        }`}
                        title={`Copy prompt and open ${tool.name}`}
                      >
                        {isJustCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied & Opening...</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Prompt & Launch</span>
                            <ArrowRight className="w-3 h-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </button>

                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition shrink-0"
                        title={`Open official ${tool.name} in new tab`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-5 py-3 bg-[#080a0f] border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Works seamlessly across Mobile, Tablets, Laptops & PCs.</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
