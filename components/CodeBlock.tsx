
import React, { useState } from 'react';
import { Copy, Download, Play, Check, Code2, Maximize2, Minimize2, X } from 'lucide-react';
import JSZip from 'jszip';

interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const ext = language.toLowerCase() === 'python' ? 'py' : 
                language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js' ? 'js' : 
                language.toLowerCase() === 'typescript' || language.toLowerCase() === 'ts' ? 'ts' : 
                language.toLowerCase() === 'html' ? 'html' : 
                language.toLowerCase() === 'css' ? 'css' : 'txt';
    
    zip.file(`project/main.${ext}`, code);
    if (language.toLowerCase() === 'html' && !code.includes('<style>')) {
        zip.file('project/style.css', '/* Soraa AI Generated Styles */');
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soraa_project_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isPreviewable = ['html', 'css', 'javascript', 'jsx', 'tsx'].includes(language.toLowerCase());

  const previewContent = language === 'html' ? code : `<html><head><style>body{font-family:sans-serif;padding:20px;background:#fff;}</style></head><body><div id="root"></div><script type="module">${code}</script></body></html>`;

  return (
    <div className="my-6 group relative rounded-2xl border border-slate-700/50 bg-[#0d1117] overflow-hidden shadow-2xl transition-all hover:border-indigo-500/50 w-full max-w-full">
      <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-[#161b22] border-b border-slate-700/50 gap-3">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-indigo-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{language}</span>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          {isPreviewable && (
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-all ${showPreview ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            >
              <Play size={14} fill={showPreview ? 'currentColor' : 'none'} />
              <span className="hidden sm:inline">{showPreview ? 'View Code' : 'Preview'}</span>
            </button>
          )}
          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block"></div>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Salin'}</span>
          </button>
          <button 
            onClick={handleDownloadZip}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <Download size={14} />
            <span className="hidden sm:inline">ZIP</span>
          </button>
        </div>
      </div>
      
      <div className="relative overflow-hidden w-full">
        {showPreview && isPreviewable ? (
          <div className="bg-white h-[400px] w-full overflow-hidden relative group/preview">
            <div className="absolute top-3 right-3 z-10 flex gap-2">
               <button 
                onClick={() => setIsFullScreen(true)}
                className="bg-slate-900/80 backdrop-blur-md p-2 rounded-lg text-white hover:bg-indigo-600 transition-all shadow-lg"
                title="Full Screen Preview"
               >
                 <Maximize2 size={14} />
               </button>
               <span className="bg-slate-900/10 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-slate-500 border border-slate-200 uppercase flex items-center">Live Preview</span>
            </div>
            <iframe
              title="Preview"
              srcDoc={previewContent}
              className="w-full h-full border-none"
            />
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar w-full">
            <pre className="p-5 text-[13px] leading-relaxed text-slate-300 font-mono whitespace-pre w-full">
              <code className="block w-full">{code}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Full Screen Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[9999] bg-white animate-fade-in flex flex-col">
            <div className="h-14 bg-slate-900 flex items-center justify-between px-6 text-white shrink-0">
                <div className="flex items-center gap-3">
                    <Sparkles className="text-indigo-400" size={18} />
                    <span className="text-sm font-bold tracking-tight">Soraa Project Preview</span>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleDownloadZip}
                        className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                    >
                        <Download size={14} /> Download ZIP
                    </button>
                    <button 
                        onClick={() => setIsFullScreen(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
            <div className="flex-1 bg-white relative">
                 <iframe
                    title="Full Preview"
                    srcDoc={previewContent}
                    className="w-full h-full border-none"
                />
            </div>
        </div>
      )}
    </div>
  );
};

const Sparkles = ({ size, className }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
);

export default CodeBlock;