
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Code, 
  HelpCircle, 
  Terminal, 
  Database,
  Search,
  Settings,
  Menu,
  X,
  Send,
  Image as ImageIcon,
  Pin,
  Trash2,
  Cpu,
  MoreVertical,
  ChevronRight,
  Sparkles,
  Zap,
  Globe,
  Share2,
  Command,
  Layout,
  FileCode
} from 'lucide-react';
import { ChatSession, Message, SoraaTool, UserStats } from './types';
import MarkdownRenderer from './components/MarkdownRenderer';
import { callGemini } from './services/geminiService';

const UNLIMITED_CODE = "Saya developer terkeren123-32+#7";
const DAILY_LIMIT = 300; // Limit ditingkatkan ke 300 sesuai permintaan

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    dailyCount: 0,
    lastReset: new Date().toLocaleDateString(),
    isUnlimited: false 
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // Load Data
  useEffect(() => {
    const savedSessions = localStorage.getItem('soraa_sessions');
    const savedStats = localStorage.getItem('soraa_stats');
    
    if (savedSessions) setSessions(JSON.parse(savedSessions));
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      const today = new Date().toLocaleDateString();
      // Reset count kalau ganti hari, kecuali sudah unlimited
      if (stats.lastReset !== today && !stats.isUnlimited) {
        setUserStats({ dailyCount: 0, lastReset: today, isUnlimited: false });
      } else {
        setUserStats(stats);
      }
    }
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem('soraa_sessions', JSON.stringify(sessions));
    localStorage.setItem('soraa_stats', JSON.stringify(userStats));
  }, [sessions, userStats]);

  // Auto Scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId, isProcessing]);

  const createNewChat = (category?: string) => {
    const newId = Date.now().toString();
    const titles: Record<string, string> = {
      'web-dev': 'Proyek Web',
      'nodejs': 'Backend Node',
      'python': 'Script Python',
      'general': 'Tanya Soraa'
    };
    
    const newSession: ChatSession = {
      id: newId,
      title: category ? titles[category] || 'Obrolan Baru' : 'Sesi Baru',
      messages: [],
      isPinned: false,
      lastModified: Date.now(),
      category: category as any
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newId);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const simulateTyping = async (sessionId: string, fullText: string) => {
    const isCode = fullText.includes('```');
    const CHUNK_SIZE = isCode ? 180 : 50; // Lebih cepat ngetiknya
    const DELAY = 1; 
    let currentText = "";
    
    for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
      currentText += fullText.slice(i, i + CHUNK_SIZE);
      
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          const newMessages = [...s.messages];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.role === 'model') {
            lastMsg.content = currentText;
          }
          return { ...s, messages: newMessages, lastModified: Date.now() };
        }
        return s;
      }));
      
      if (i + CHUNK_SIZE < fullText.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY));
      }
    }
  };

  const handleSendMessage = async () => {
    const trimmedInput = input.trim();
    if ((!trimmedInput && !selectedImage) || isProcessing) return;

    // Cek Kode Rahasia
    if (trimmedInput === UNLIMITED_CODE) {
      setUserStats(prev => ({ ...prev, isUnlimited: true }));
      setInput('');
      
      const unlockMsg: Message = {
        role: 'model',
        content: "🚀 **AKSES UNLIMITED AKTIF!** Wah, kamu beneran developer terkeren ya. Sekarang kamu bebas nanya apa aja tanpa batas harian. Selamat ngoding! 🔥",
        timestamp: Date.now()
      };

      if (currentSessionId) {
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, unlockMsg], lastModified: Date.now() } : s));
      } else {
        createNewChat();
        // Wait for state to update or just alert
        alert("Akses Unlimited Aktif!");
      }
      return;
    }

    // Cek Limit
    if (!userStats.isUnlimited && userStats.dailyCount >= DAILY_LIMIT) {
      const limitMsg: Message = {
        role: 'model',
        content: `😅 **Limit harian tercapai!** (${userStats.dailyCount}/${DAILY_LIMIT}). Kamu bisa nunggu besok atau masukkan **Kode Rahasia Developer Terkeren** buat buka akses tanpa batas!`,
        timestamp: Date.now()
      };
      
      if (currentSessionId) {
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, limitMsg], lastModified: Date.now() } : s));
      } else {
        alert("Limit harian habis. Masukkan kode rahasia untuk lanjut!");
      }
      return;
    }

    let activeSession = sessions.find(s => s.id === currentSessionId);
    if (!activeSession) {
      const newId = Date.now().toString();
      activeSession = {
        id: newId,
        title: trimmedInput.slice(0, 25) + (trimmedInput.length > 25 ? '...' : ''),
        messages: [],
        isPinned: false,
        lastModified: Date.now()
      };
      setSessions([activeSession, ...sessions]);
      setCurrentSessionId(newId);
    }

    const userMessage: Message = {
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
      image: selectedImage || undefined
    };

    // ISOLASI CHAT: Hanya ambil history dari sesi yang aktif
    const contextMessages = [...activeSession.messages, userMessage];
    
    setSessions(prev => prev.map(s => 
      s.id === activeSession!.id 
        ? { ...s, messages: [...s.messages, userMessage], lastModified: Date.now() } 
        : s
    ));

    const imageToSend = selectedImage;
    setInput('');
    setSelectedImage(null);
    if (textAreaRef.current) textAreaRef.current.style.height = 'auto';
    setIsProcessing(true);

    try {
      const systemInstruction = `Kamu adalah Soraa, AI Engineer asisten pribadi paling pinter.
      Bahasanya santai, asik, tapi tetep profesional (ngomongnya kayak temen sejawat dev). 
      Format: Markdown (bold, list, dll).
      Kode: Berikan kode yang clean di dalam blocks.
      Konteks Workspace: ${activeSession.category || 'Standard'}.`;
      
      const response = await callGemini(contextMessages, systemInstruction, imageToSend || undefined);
      
      const placeholder: Message = { role: 'model', content: '', timestamp: Date.now() };

      setSessions(prev => prev.map(s => 
        s.id === activeSession!.id 
          ? { ...s, messages: [...s.messages, placeholder], lastModified: Date.now() } 
          : s
      ));

      await simulateTyping(activeSession.id, response);
      
      if (!userStats.isUnlimited) {
        setUserStats(prev => ({ ...prev, dailyCount: prev.dailyCount + 1 }));
      }
    } catch (error) {
      const errorMsg: Message = {
        role: 'model',
        content: "Duh, Soraa lagi pusing (eror). Coba kirim ulang ya!",
        timestamp: Date.now()
      };
      setSessions(prev => prev.map(s => 
        s.id === activeSession!.id ? { ...s, messages: [...s.messages, errorMsg] } : s
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.lastModified - a.lastModified;
  });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-inter selection:bg-indigo-100">
      <aside 
        className={`${isSidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-0'} fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 md:relative md:translate-x-0 overflow-hidden flex flex-col shadow-xl md:shadow-none`}
      >
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg ring-4 ring-indigo-50">
              <Sparkles size={18} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Soraa AI</h1>
              <span className={`text-[9px] font-black uppercase tracking-widest block leading-none mt-0.5 ${userStats.isUnlimited ? 'text-indigo-500' : 'text-slate-400'}`}>
                {userStats.isUnlimited ? 'UNLIMITED PRO' : `LIMIT: ${userStats.dailyCount}/${DAILY_LIMIT}`}
              </span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400"><X size={18} /></button>
        </div>

        <div className="px-4 mb-4 space-y-3">
          <button 
            onClick={() => createNewChat()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            <span className="text-sm">Obrolan Baru</span>
          </button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Cari histori..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-6 pb-6">
          <div>
            <h3 className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Workspace</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Web Dev', icon: Layout, id: 'web-dev', color: 'bg-blue-50 text-blue-600' },
                { label: 'Node.js', icon: Terminal, id: 'nodejs', color: 'bg-emerald-50 text-emerald-600' },
                { label: 'Python', icon: Code, id: 'python', color: 'bg-amber-50 text-amber-600' },
                { label: 'Cloud/DB', icon: Database, id: 'general', color: 'bg-purple-50 text-purple-600' }
              ].map(tool => (
                <button 
                  key={tool.id}
                  onClick={() => createNewChat(tool.id)}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all group"
                >
                  <div className={`p-2 rounded-lg ${tool.color} group-hover:scale-110 transition-transform`}>
                    <tool.icon size={14} />
                  </div>
                  <span className="font-bold text-[10px] text-slate-700">{tool.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Riwayat Chat</h3>
            <div className="space-y-1">
              {sortedSessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => {
                    setCurrentSessionId(session.id);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 text-xs rounded-xl cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <MessageSquare size={14} className={currentSessionId === session.id ? 'text-white' : 'text-slate-400'} />
                  <span className="flex-1 truncate font-bold">{session.title}</span>
                  <div className={`flex items-center gap-1 ${currentSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button onClick={(e) => { e.stopPropagation(); setSessions(prev => prev.map(s => s.id === session.id ? { ...s, isPinned: !s.isPinned } : s)); }} className="p-1">
                      <Pin size={10} fill={session.isPinned ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSessions(prev => prev.filter(s => s.id !== session.id)); if(currentSessionId === session.id) setCurrentSessionId(null); }} className="p-1">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
              {sortedSessions.length === 0 && <p className="text-center text-[10px] text-slate-400 py-4">Belum ada obrolan</p>}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">DEV</div>
             <div className="flex-1 min-w-0">
               <p className="text-[11px] font-black text-slate-800 truncate uppercase tracking-tighter">My Account</p>
               <div className="flex items-center gap-1 text-[8px] font-bold text-indigo-600 uppercase">
                 <Zap size={8} fill="currentColor" /> {userStats.isUnlimited ? 'UNLIMITED ACCESS' : 'FREE TIER'}
               </div>
             </div>
             <Settings size={14} className="text-slate-400 hover:text-indigo-600 transition-colors" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-white min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-100 sticky top-0 z-40 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-100 rounded-lg text-slate-500 md:hidden">
              <Menu size={18} />
            </button>
            <h2 className="font-bold text-slate-900 truncate text-sm">
              {currentSession ? currentSession.title : 'Selamat Datang'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 gap-2">
              <Cpu size={12} className="text-indigo-600" />
              <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">GEMINI 3P FLASH</span>
            </div>
            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Share2 size={16} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-10 py-8 space-y-10">
          {!currentSession || currentSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8 animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-xl ring-8 ring-indigo-50 animate-bounce">
                <Sparkles size={40} />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Halo! Soraa di sini.</h1>
                <p className="text-slate-500 font-medium">Mau bikin keajaiban apa kita hari ini?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-4">
                {[
                  { title: "Bikin API Node.js", icon: Terminal },
                  { title: "Review Kode React", icon: FileCode },
                  { title: "Debug Python", icon: Bug },
                  { title: "Bantu Desain Web", icon: Layout }
                ].map((item, i) => (
                  <button 
                    key={i} 
                    onClick={() => setInput(`Bantuin ${item.title.toLowerCase()} dong...`)}
                    className="p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-500 hover:shadow-lg transition-all flex items-center gap-3 group"
                  >
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><item.icon size={16} /></div>
                    <span className="font-bold text-slate-800 text-xs">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-10 pb-10">
              {currentSession.messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 md:gap-5 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-md ${
                    msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'
                  }`}>
                    {msg.role === 'user' ? <Command size={14} /> : <Sparkles size={14} />}
                  </div>
                  <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className={`text-[9px] font-black text-slate-400 uppercase tracking-widest ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                        {msg.role === 'user' ? 'SAYA' : 'SORAA AI'}
                      </span>
                    </div>
                    {msg.image && (
                      <div className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        <img src={msg.image} alt="Upload" className="max-w-[240px] md:max-w-md rounded-xl border-2 border-white shadow-lg" />
                      </div>
                    )}
                    <div className={`p-4 md:p-5 rounded-2xl shadow-sm overflow-hidden break-words ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none inline-block max-w-full text-left' 
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 block w-full'
                    }`}>
                      <MarkdownRenderer content={msg.content} />
                    </div>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-300 border border-indigo-100">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex-1 space-y-2 pt-2">
                    <div className="h-2 bg-slate-100 rounded-full w-24"></div>
                    <div className="h-3 bg-slate-50 rounded-full w-full"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} className="h-4" />
            </div>
          )}
        </div>

        <div className="p-4 md:p-8 bg-white/50 backdrop-blur-md border-t border-slate-50">
          <div className="max-w-4xl mx-auto relative bg-white border border-slate-200 rounded-2xl md:rounded-[2rem] shadow-xl p-1.5 focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
            {selectedImage && (
              <div className="absolute bottom-full mb-4 left-4 p-1.5 bg-white rounded-2xl shadow-xl border border-slate-100 animate-fade-in z-50">
                <div className="relative w-24 h-24">
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-slate-900 text-white p-1 rounded-full shadow-lg hover:bg-red-500 transition-colors"><X size={12} /></button>
                </div>
              </div>
            )}
            
            <div className="flex items-end gap-1 px-2 py-1.5">
              <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0">
                <ImageIcon size={20} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              <textarea 
                ref={textAreaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder="Tanya apa aja ke Soraa..."
                className="flex-1 py-2.5 px-2 bg-transparent focus:outline-none resize-none text-[14px] font-medium text-slate-800 min-h-[44px] max-h-[300px] custom-scrollbar"
              />
              <button 
                onClick={handleSendMessage}
                disabled={isProcessing || (!input.trim() && !selectedImage)}
                className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                  isProcessing || (!input.trim() && !selectedImage) ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white shadow-lg hover:-translate-y-0.5 active:scale-95'
                }`}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
          <p className="mt-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hidden sm:block">
            Soraa Pro AI • {userStats.isUnlimited ? 'Unlimited Developer Access' : `Limit ${DAILY_LIMIT} Pesan Per Hari`}
          </p>
        </div>
      </main>
    </div>
  );
};

const Bug = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" /><path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" /><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" /><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
  </svg>
);

export default App;
