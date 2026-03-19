/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
 Send,
 Plus,
 MessageSquare,
 TrendingUp,
 Lightbulb,
 Target,
 BarChart3,
 Settings,
 Menu,
 X,
 Bot,
 User,
 Loader2,
 ChevronRight,
 Briefcase,
 Rocket,
 Globe,
 Users,
 ShieldCheck,
 Sparkles,
 Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type, ThinkingLevel, GenerateContentResponse } from "@google/genai";

const SYSTEM_PROMPT = `Woyɛ adwumayɛfoɔ AI kwankyerɛfoɔ a wo ho akokwa (Advanced Entrepreneur AI assistant). Wo dwumadie ne sɛ wobɛkyerɛ nnipa akwan a wɔfa so hyɛ adwuma ase, wɔnyini, na wɔnsusuw ho wɔ Abibirem, titiriw Ghana.

Nnyinasosɛ a ɛsɛ sɛ wodi akyi:
1. Ubuntu-Driven Business: Ma kwan ma adwumayɛ no mmoa mpɔtam hɔfoɔ, na ɛnyɛ mfasoɔ nkoaa.
2. Leapfrog Strategies: Kyerɛ akwan a yɛfa so de fon so sika (Mobile Money) ne mfiridwuma foforɔ di dwuma.
3. Informal-to-Formal: Kyerɛ akwan a ofie adwuma bɛfa so ayɛ adwuma kɛseɛ a sika korabea gye tom.
4. Resilience & Resourcefulness: Kyerɛ adwumayɛfoɔ sɛnea wɔbɛnyina pintinn wɔ berɛ a nneɛma nnyɛ mmerɛ.
5. Generational Wealth: Kyerɛ akwan a sika bɛtena hɔ ama mma ne mmanana.

FINANCIAL DIRECTIVE:
Kyerɛ sika biara wɔ Ghana Cedis (GHS) mu berɛ biara.

LANGUAGE DIRECTIVE:
Provide all responses in BOTH Asante Twi and English. 
Use the following format strictly:
TWI: [Asante Twi text]
ENG: [English text]

CONCISENESS DIRECTIVE:
Be direct and concise. Avoid long introductions. Focus on actionable advice to minimize processing time.

Suban: Kasa no mu nna hɔ, ɛnyɛ den, na ma adwumayɛfoɔ no mmodenbɔ.`;

interface MessageContent {
  twi: string;
  english: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string | MessageContent;
  isSparkle?: boolean;
}

const LOADING_MESSAGES = [
  "Meredwene ho...",
  "Merehwehwɛ adwumayɛ akwan pa...",
  "Merekyerɛ sika ho nhyehyɛe...",
  "EvansAI reyɛ nhwehwɛmu...",
  "Ubuntu nhyehyɛe reba..."
];

const App = () => {
 const [messages, setMessages] = useState<Message[]>([
   {
     role: 'assistant',
     content: {
       twi: "Akwaba! Me ne EvansAI, wo adwumayɛfoɔ kwankyerɛfoɔ. Sɛ wopɛ sɛ wode fon so sika (MoMo) trɛ wo adwuma mu anaa wopɛ sɛ wosusuw Ubuntu ho de ma wo mpɔtam hɔfoɔ nya nkɔsoɔ a, me wɔ ha ma wo. Adwuma bɛn na yɛnhyɛ aseɛ nnɛ?",
       english: "Welcome! I am EvansAI, your entrepreneurial guide. Whether you want to expand your business using Mobile Money (MoMo) or consider Ubuntu to bring progress to your community, I am here for you. What business shall we start today?"
     }
   }
 ]);
 const [input, setInput] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [loadingTextIdx, setLoadingTextIdx] = useState(0);
 const [sidebarOpen, setSidebarOpen] = useState(true);
 const [activeTab, setActiveTab] = useState('chat');
 const [sparkleLoading, setSparkleLoading] = useState<string | null>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 // Cycle loading messages to make the wait feel shorter
 useEffect(() => {
   let interval: any;
   if (isLoading || sparkleLoading) {
     interval = setInterval(() => {
       setLoadingTextIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
     }, 2000);
   } else {
     setLoadingTextIdx(0);
   }
   return () => clearInterval(interval);
 }, [isLoading, sparkleLoading]);

 const scrollToBottom = () => {
   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
 };

 useEffect(() => {
   scrollToBottom();
 }, [messages]);

 const parseBilingualResponse = (text: string): MessageContent => {
    const twiMatch = text.match(/TWI:\s*([\s\S]*?)(?=\nENG:|$)/i);
    const engMatch = text.match(/ENG:\s*([\s\S]*?)$/i);
    
    let twi = "";
    let english = "";

    if (twiMatch) {
      twi = twiMatch[1].trim();
    } else if (!text.includes("ENG:")) {
      // If we haven't seen TWI: yet, or it's just raw text during streaming
      twi = text.replace(/TWI:\s*/i, "").trim();
    }

    if (engMatch) {
      english = engMatch[1].trim();
    }

    return { twi, english };
  };

 const handleSendMessage = async (e?: React.FormEvent, customInput?: string) => {
   e?.preventDefault();
   const textToSend = customInput || input;
   if (!textToSend.trim() || isLoading) return;

   const userMessage: Message = { role: 'user', content: textToSend };
   setMessages(prev => [...prev, userMessage]);
   setInput('');
   setIsLoading(true);

   // Add a placeholder assistant message for streaming
   setMessages(prev => [...prev, { 
     role: 'assistant', 
     content: { twi: "", english: "" } 
   }]);

   try {
     const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
     
     // Only send last 4 messages for faster context processing
     const contents = [
       ...messages.slice(-4).map(m => ({
         role: m.role === 'user' ? 'user' : 'model',
         parts: [{ text: typeof m.content === 'string' ? m.content : `TWI: ${m.content.twi}\nENG: ${m.content.english}` }]
       })),
       { role: 'user', parts: [{ text: textToSend }] }
     ];

     const stream = await ai.models.generateContentStream({
       model: "gemini-3-flash-preview",
       contents: contents as any,
       config: {
         systemInstruction: SYSTEM_PROMPT,
         thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
       },
     });

     let fullText = "";
     for await (const chunk of stream) {
       const c = chunk as GenerateContentResponse;
       if (c.text) {
         fullText += c.text;
         const parsed = parseBilingualResponse(fullText);
         setMessages(prev => {
           const newMessages = [...prev];
           newMessages[newMessages.length - 1] = {
             role: 'assistant',
             content: parsed
           };
           return newMessages;
         });
       }
     }
   } catch (error) {
     console.error("Gemini API Error:", error);
     setMessages(prev => {
       const newMessages = [...prev];
       newMessages[newMessages.length - 1] = {
         role: 'assistant',
         content: {
           twi: "Mate mfomsoɔ bi wɔ mfiridwuma no mu. Mesrɛ wo, sɔ hwɛ bio.",
           english: "I encountered a technical error. Please try again."
         }
       };
       return newMessages;
     });
   } finally {
     setIsLoading(false);
   }
 };

 const triggerSparkleAction = async (actionType: 'PITCH' | 'RISK' | 'CEDIS') => {
   if (isLoading || messages.length < 2) return;
   setSparkleLoading(actionType);
  
   let prompt = "";
   const history = messages.slice(-4).map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : m.content.english}`).join("\n");

   switch(actionType) {
     case 'PITCH':
       prompt = `Draft a high-impact 1-minute elevator pitch in BOTH Asante Twi and English for a Ghanaian investor based on our talk. Focus on Ubuntu and GHS profits.\n\nContext:\n${history}`;
       break;
     case 'RISK':
       prompt = `Identify 3 risks in Ghana for this idea and suggest solutions in BOTH Asante Twi and English.\n\nContext:\n${history}`;
       break;
     case 'CEDIS':
       prompt = `Break down startup costs in GHS for this plan in BOTH Asante Twi and English.\n\nContext:\n${history}`;
       break;
     default:
       return;
   }

   // Add placeholder
   setMessages(prev => [...prev, { 
     role: 'assistant', 
     content: { twi: "", english: "" },
     isSparkle: true
   }]);

   try {
     const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
     const stream = await ai.models.generateContentStream({
       model: "gemini-3-flash-preview",
       contents: [{ role: 'user', parts: [{ text: prompt }] }] as any,
       config: {
         systemInstruction: "Woyɛ adwumayɛfoɔ kwankyerɛfoɔ. Provide responses in BOTH Asante Twi and English. Format: TWI: [text] ENG: [text]. Ma asɛm no nyɛ tiawa na ɛmu nna hɔ.",
         thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
       },
     });

     let fullText = "";
     for await (const chunk of stream) {
       const c = chunk as GenerateContentResponse;
       if (c.text) {
         fullText += c.text;
         const parsed = parseBilingualResponse(fullText);
         setMessages(prev => {
           const newMessages = [...prev];
           newMessages[newMessages.length - 1] = {
             role: 'assistant',
             content: parsed,
             isSparkle: true
           };
           return newMessages;
         });
       }
     }
   } catch (error) {
     console.error(error);
   } finally {
     setSparkleLoading(null);
   }
 };

 const quickAction = (text: string) => {
   setInput(text);
   setTimeout(() => {
     const form = document.getElementById('chat-form') as HTMLFormElement;
     if (form) form.requestSubmit();
   }, 10);
 };

 return (
   <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
     {/* Sidebar */}
     <aside className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col z-20 overflow-hidden shrink-0`}>
       <div className="p-6 flex items-center gap-3 border-b border-slate-100">
         <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
           <Globe size={24} />
         </div>
         <span className="font-bold text-xl tracking-tight text-slate-800">EvansAI</span>
       </div>

       <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
         <div>
           <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Adwumayɛ Akwankyerɛ</h3>
           <nav className="space-y-1">
             <button
               onClick={() => setActiveTab('chat')}
               className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'hover:bg-slate-100 text-slate-600'}`}
             >
               <MessageSquare size={18} /> Nkɔmmɔbɔ
             </button>
             <button
               onClick={() => setActiveTab('tools')}
               className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'tools' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'hover:bg-slate-100 text-slate-600'}`}
             >
               <Briefcase size={18} /> Adwumayɛ Nneɛma
             </button>
           </nav>
         </div>

         <div>
           <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Adwumayɛ Nhyehyɛe Pa</h3>
           <div className="space-y-2">
             {[
               { label: 'Ofie kɔ Adwuma kɛseɛ', icon: <ShieldCheck size={16} />, prompt: 'Meyɛ adwuma wɔ ofie wɔ [LOCATION]. Mɛyɛ dɛn na matumi akɔ sika korabea na manya mmoa akuro me adwuma no mu?' },
               { label: 'MoMo Nkɔsoɔ', icon: <TrendingUp size={16} />, prompt: 'Mɛyɛ dɛn na mede fon so sika (Mobile Money) bɛhyɛ me adwuma no mu ama manya nkɔsoɔ?' },
               { label: 'Abusuakuo Sika (Susu)', icon: <Users size={16} />, prompt: 'Mɛyɛ dɛn na matumi de Susu nhyehyɛe aboa me adwuma no berɛ a menni sika korabea mmoa?' },
               { label: 'Nneɛma akwantuo', icon: <Target size={16} />, prompt: 'Bɔ me aka wɔ sɛnea mɛtumi de me nneɛma akɔ mpɔtam a akwan mu nnyɛ mmerɛ.' }
             ].map((item, idx) => (
               <button
                 key={idx}
                 onClick={() => quickAction(item.prompt)}
                 className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-all"
               >
                 {item.icon} {item.label}
               </button>
             ))}
           </div>
         </div>
       </div>

       <div className="p-4 border-t border-slate-200">
         <div className="bg-slate-100 rounded-xl p-3 flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center overflow-hidden">
              <User size={20} className="text-slate-500" />
           </div>
           <div className="flex-1 overflow-hidden">
             <p className="text-sm font-medium truncate">Adwumayɛfoɔ</p>
             <p className="text-xs text-slate-500">Premium Kwankyerɛ</p>
           </div>
           <Settings size={18} className="text-slate-400 cursor-pointer hover:text-emerald-600" />
         </div>
       </div>
     </aside>

     {/* Main Content */}
     <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
       {/* Header */}
       <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
         <div className="flex items-center gap-4">
           <button
             onClick={() => setSidebarOpen(!sidebarOpen)}
             className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
           >
             {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
           </button>
           <h2 className="font-semibold text-lg text-slate-800">
             {activeTab === 'chat' ? 'Evans Adwuma nkɔmmɔ' : 'Adwumayɛ Nneɛma Pa'}
           </h2>
         </div>
         <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100 shadow-sm">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               EvansAI wɔ ha
            </div>
         </div>
       </header>

       {/* Dynamic View */}
       <div className="flex-1 overflow-y-auto">
         <AnimatePresence mode="wait">
           {activeTab === 'chat' ? (
             <motion.div 
               key="chat"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
               className="max-w-6xl mx-auto p-6 space-y-6"
             >
               {messages.map((msg, idx) => (
                 <motion.div
                   key={idx}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                 >
                   <div className={`flex gap-3 ${msg.role === 'user' ? 'max-w-[85%] flex-row-reverse' : 'w-full flex-row'}`}>
                     <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-emerald-600 shadow-sm'}`}>
                       {msg.role === 'user' ? <User size={18} /> : <Globe size={18} />}
                     </div>
                     <div className={`p-4 rounded-2xl shadow-sm flex-1 ${
                       msg.role === 'user'
                         ? 'bg-emerald-600 text-white rounded-tr-none max-w-fit'
                         : msg.isSparkle ? 'bg-indigo-50 border-indigo-200 text-indigo-900 border' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                     }`}>
                       {msg.role === 'assistant' && typeof msg.content === 'object' ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                           <div className="pb-4 md:pb-0 md:pr-6">
                             <div className="flex items-center gap-2 mb-3">
                               <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Asante Twi</span>
                             </div>
                             <div className="prose prose-sm max-w-none prose-slate whitespace-pre-wrap leading-relaxed">
                               {msg.content.twi || (isLoading && idx === messages.length - 1 ? "..." : "")}
                             </div>
                           </div>
                           <div className="pt-4 md:pt-0 md:pl-6">
                             <div className="flex items-center gap-2 mb-3">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">English</span>
                             </div>
                             <div className="prose prose-sm max-w-none prose-slate whitespace-pre-wrap leading-relaxed italic text-slate-600">
                               {msg.content.english || (isLoading && idx === messages.length - 1 ? "..." : "")}
                             </div>
                           </div>
                         </div>
                       ) : (
                         <div className="prose prose-sm max-w-none prose-slate whitespace-pre-wrap">
                           {typeof msg.content === 'string' ? msg.content : msg.content.english}
                         </div>
                       )}
                     </div>
                   </div>
                 </motion.div>
               ))}
               {isLoading && !messages[messages.length - 1].content && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="flex justify-start"
                 >
                   <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-400">
                       <Globe size={18} />
                     </div>
                     <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} />
                        <span className="text-sm text-slate-500">{LOADING_MESSAGES[loadingTextIdx]}</span>
                     </div>
                   </div>
                 </motion.div>
               )}
               <div ref={messagesEndRef} />
             </motion.div>
           ) : (
             <motion.div 
               key="tools"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.2 }}
               className="max-w-5xl mx-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
             >
               <div className="bg-gradient-to-br from-indigo-600 to-emerald-600 p-[1px] rounded-2xl shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
                 onClick={() => quickAction("✨ Adwumayɛ akwan foforɔ nhwehwɛmu: Hwehwɛ adwumayɛ akwan foforɔ 3 a ɛbɛtumi ama nkurɔfoɔ mfasoɔ wɔ Ghana nnɛ.")}>
                 <div className="bg-white p-6 rounded-[15px] h-full flex flex-col">
                   <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                     <Sparkles className="text-indigo-600" />
                   </div>
                   <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                     Nhwehwɛmu ✨
                   </h3>
                   <p className="text-sm text-slate-500 leading-relaxed mb-4">EvansAI de mfiridwuma bɛhwehwɛ adwumayɛ foforɔ ama wo.</p>
                   <div className="mt-auto flex items-center text-indigo-600 text-sm font-bold">
                     Hyɛ aseɛ <Zap size={14} className="ml-1" />
                   </div>
                 </div>
               </div>

               {[
                 { title: 'Market Entry', desc: 'Sɛnea wobɛtumi ahyɛ adwuma ase wɔ mpɔtam hɔ.', icon: <Users className="text-orange-500" /> },
                 { title: 'Fintech Leapfrog', desc: 'MoMo ne mfiridwuma a yɛde di sika dwuma.', icon: <TrendingUp className="text-emerald-500" /> },
                 { title: 'Resilience Planner', desc: 'Sɛnea wobɛsi pintinn wɔ berɛ a nneɛma yɛ den.', icon: <ShieldCheck className="text-blue-500" /> },
                 { title: 'Export & AfCFTA', desc: 'Sɛnea wobɛtumi de nneɛma akɔ Abibirem aman afoforɔ so.', icon: <Globe className="text-indigo-500" /> },
                 { title: 'Ubuntu Tracker', desc: 'Sɛnea wo adwuma no boa wo mpɔtam hɔfoɔ.', icon: <Lightbulb className="text-yellow-500" /> },
                 { title: 'Legacy & Trust', desc: 'Adwuma a ɛbɛtena hɔ ama mma ne mmanana.', icon: <Briefcase className="text-slate-500" /> }
               ].map((tool, idx) => (
                 <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => quickAction(`Guide me through the ${tool.title}: ${tool.desc}`)}>
                   <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-50 transition-colors">
                     {tool.icon}
                   </div>
                   <h3 className="font-bold text-slate-800 mb-2">{tool.title}</h3>
                   <p className="text-sm text-slate-500 leading-relaxed mb-4">{tool.desc}</p>
                   <div className="flex items-center text-emerald-600 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                     Hunu mu asɛm <ChevronRight size={16} />
                   </div>
                 </div>
               ))}
             </motion.div>
           )}
         </AnimatePresence>
       </div>

       {/* Input Area */}
       <div className="bg-white border-t border-slate-200 p-4 md:p-6">
         <div className="max-w-4xl mx-auto mb-4">
           {messages.length >= 2 && activeTab === 'chat' && (
             <div className="flex flex-wrap gap-2 mb-4 animate-in fade-in slide-in-from-bottom-2">
               <button
                 onClick={() => triggerSparkleAction('PITCH')}
                 disabled={!!sparkleLoading}
                 className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-2"
               >
                 {sparkleLoading === 'PITCH' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                 ✨ Nkɔmmɔ tiawa (Pitch)
               </button>
               <button
                 onClick={() => triggerSparkleAction('RISK')}
                 disabled={!!sparkleLoading}
                 className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-2"
               >
                 {sparkleLoading === 'RISK' ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                 ✨ Adwumayɛ mu asiane
               </button>
               <button
                 onClick={() => triggerSparkleAction('CEDIS')}
                 disabled={!!sparkleLoading}
                 className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center gap-2"
               >
                 {sparkleLoading === 'CEDIS' ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                 ✨ GHS Sika ho nhyehyɛe
               </button>
             </div>
           )}
          
           <form
             id="chat-form"
             onSubmit={handleSendMessage}
             className="flex gap-4"
           >
             <div className="flex-1 relative">
               <textarea
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSendMessage();
                   }
                 }}
                 placeholder="Bisa me adwumayɛ, Ubuntu, anaa MoMo ho asɛm..."
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none max-h-32 text-slate-800"
                 rows={1}
               />
               <button
                 type="submit"
                 disabled={isLoading || !input.trim()}
                 className="absolute right-2 bottom-2 p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                 {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
               </button>
             </div>
           </form>
         </div>
         <p className="text-[10px] text-center text-slate-400 mt-1">
           EvansAI bɛboa wo ma wo adwuma anyini. Hwɛ nneɛma no mu yie ansa na woadi so.
         </p>
       </div>
     </main>
   </div>
 );
};

export default App;
