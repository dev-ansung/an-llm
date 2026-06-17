import { useState, useEffect, useRef } from 'react';
import OpenAI from 'openai';
import { Chat, Message, Attachment, Params, ApiConfig, ApiLog } from '../types';
import { resizeImage } from '../services/image';
import { sanitizeLogsForStorage } from '../services/openai';

const defaultParams: Params = {
  systemPrompt: 'You are Gemma, a large language model.',
  temperature: 1.0,
  limitLength: false,
  enableThinking: false,
  downsizeEnabled: true,
  downsizeMaxPx: 2048
};

const defaultApiConfig: ApiConfig = {
  apiKey: '',
  apiBase: 'http://127.0.0.1:1234/v1',
  modelName: 'google/gemma-4-12b-qat'
};

export function useChatState() {
  const [chats, setChats] = useState<Chat[]>(() => {
    try { return JSON.parse(localStorage.getItem('chats') || '[]'); } catch { return []; }
  });
  const [activeId, setActiveId] = useState<string>(() => localStorage.getItem('activeChatId') || '');
  const [api, setApi] = useState<ApiConfig>(() => {
    try { return JSON.parse(localStorage.getItem('apiConfig') || JSON.stringify(defaultApiConfig)); } catch { return defaultApiConfig; }
  });
  const [params, setParams] = useState<Params>(() => {
    const saved = localStorage.getItem('params');
    if (!saved) return defaultParams;
    try { return { ...defaultParams, ...JSON.parse(saved) }; } catch { return defaultParams; }
  });
  const [rightTab, setRightTab] = useState(0);
  const [apiLogs, setApiLogs] = useState<ApiLog[]>(() => {
    try { return JSON.parse(localStorage.getItem('apiLogs') || '[]'); } catch { return []; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<{ el: HTMLButtonElement; id: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachAnchorEl, setAttachAnchorEl] = useState<HTMLButtonElement | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try { localStorage.setItem('chats', JSON.stringify(chats)); } catch (e) { console.warn(e); }
  }, [chats]);
  useEffect(() => {
    try { localStorage.setItem('apiConfig', JSON.stringify(api)); } catch (e) { console.warn(e); }
  }, [api]);
  useEffect(() => {
    try { localStorage.setItem('params', JSON.stringify(params)); } catch (e) { console.warn(e); }
  }, [params]);
  useEffect(() => {
    try { if (activeId) localStorage.setItem('activeChatId', activeId); } catch (e) { console.warn(e); }
  }, [activeId]);
  useEffect(() => {
    try {
      const sanitized = sanitizeLogsForStorage(apiLogs);
      localStorage.setItem('apiLogs', JSON.stringify(sanitized));
    } catch (e) {
      console.warn(e);
    }
  }, [apiLogs]);

  // Abort completion request when active chat changes or component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeId]);

  const activeChat = chats.find(c => c.id === activeId) || chats[0] || null;

  const handleCreateChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(), title: 'New Chat', messages: []
    };
    setChats([newChat, ...chats]);
    setActiveId(newChat.id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const newAttachment: Attachment = {
        id: Date.now().toString() + Math.random().toString(),
        name: file.name,
        type: file.type,
        content: text,
        isImage: false
      };
      setAttachments(prev => [...prev, newAttachment]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      let dataUrl = event.target?.result as string;
      if (params.downsizeEnabled) {
        dataUrl = await resizeImage(dataUrl, params.downsizeMaxPx);
      }
      const newAttachment: Attachment = {
        id: Date.now().toString() + Math.random().toString(),
        name: file.name,
        type: file.type,
        content: dataUrl,
        isImage: true
      };
      setAttachments(prev => [...prev, newAttachment]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = async (event) => {
          let dataUrl = event.target?.result as string;
          if (params.downsizeEnabled) {
            dataUrl = await resizeImage(dataUrl, params.downsizeMaxPx);
          }
          const newAttachment: Attachment = {
            id: Date.now().toString() + Math.random().toString(),
            name: file.name || `pasted-image-${Date.now()}.png`,
            type: file.type,
            content: dataUrl,
            isImage: true
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
        e.preventDefault();
      }
    }
  };

  const handleSend = async (continueId?: string, regenerateId?: string) => {
    if (!activeChat || loading) return;
    let updatedMsgs: Message[];
    let assistantMsgId: string;
    const isCont = !!continueId;
    const isRegen = !!regenerateId;

    if (isCont) {
      const idx = activeChat.messages.findIndex(m => m.id === continueId);
      if (idx === -1) return;
      updatedMsgs = activeChat.messages.slice(0, idx + 1);
      assistantMsgId = continueId;
    } else if (isRegen) {
      const idx = activeChat.messages.findIndex(m => m.id === regenerateId);
      if (idx === -1) return;
      updatedMsgs = activeChat.messages.slice(0, idx);
      assistantMsgId = regenerateId;
      setChats(chats.map(c => c.id === activeChat.id ? {
        ...c, messages: c.messages.map(m => m.id === assistantMsgId ? { ...m, content: '', tokens: undefined, duration: undefined, speed: undefined } : m)
      } : c));
    } else {
      if (!inputValue.trim() && attachments.length === 0) return;
      const msgImages = attachments.filter(a => a.isImage).map(a => a.content);
      const msgFiles = attachments.filter(a => !a.isImage).map(a => ({ name: a.name, content: a.content }));
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: inputValue,
        ...(msgImages.length > 0 ? { images: msgImages } : {}),
        ...(msgFiles.length > 0 ? { files: msgFiles } : {})
      };
      updatedMsgs = [...activeChat.messages, userMsg];
      assistantMsgId = (Date.now() + 1).toString();
      const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: '', model: api.modelName };
      setChats(chats.map(c => c.id === activeChat.id ? { ...c, messages: [...updatedMsgs, assistantMsg] } : c));
      setInputValue('');
      setAttachments([]);
    }
    setLoading(true);

    abortControllerRef.current = new AbortController();
    const openai = new OpenAI({ apiKey: api.apiKey || 'not-needed', baseURL: api.apiBase, dangerouslyAllowBrowser: true, maxRetries: 0 });
    const startTime = Date.now();
    let tokenCount = 0;

    const logId = Date.now().toString() + Math.random().toString();
    const systemMsg = params.systemPrompt ? [{ role: 'system', content: params.systemPrompt + (params.enableThinking ? '\nThink step by step before answering.' : '') }] : [];
    const requestMessages = [
      ...systemMsg,
      ...updatedMsgs.map(m => {
        if (m.role === 'user') {
          let textContent = m.content;
          if (m.files && m.files.length > 0) {
            const filesStr = m.files.map(f => `[Attached File: ${f.name}]\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');
            textContent = textContent ? `${filesStr}\n\n${textContent}` : filesStr;
          }
          if (m.images && m.images.length > 0) {
            const contentBlocks: any[] = [{ type: 'text', text: textContent }];
            m.images.forEach(img => {
              contentBlocks.push({
                type: 'image_url',
                image_url: { url: img }
              });
            });
            return { role: m.role, content: contentBlocks };
          }
          return { role: m.role, content: textContent };
        }
        return { role: m.role, content: m.content };
      })
    ];
    const requestPayload = {
      model: api.modelName,
      messages: requestMessages,
      temperature: params.temperature,
      max_tokens: params.limitLength ? 150 : undefined,
      stream: true,
    };

    const newLog: ApiLog = {
      id: logId,
      timestamp: new Date().toLocaleTimeString(),
      url: `${api.apiBase}/chat/completions`,
      request: requestPayload,
      response: { status: 200, statusText: 'Pending', content: '' }
    };
    setApiLogs(prev => [newLog, ...prev]);

    try {
      const stream = await openai.chat.completions.create({
        model: requestPayload.model,
        messages: requestPayload.messages as any,
        temperature: requestPayload.temperature,
        max_tokens: requestPayload.max_tokens,
        stream: true,
      }, { signal: abortControllerRef.current.signal });

      let accumulatedContent = isCont ? (activeChat.messages.find(m => m.id === continueId)?.content || '') : '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        tokenCount++;
        accumulatedContent += delta;
        const duration = (Date.now() - startTime) / 1000;
        const speed = Number((tokenCount / duration).toFixed(2));
        setChats(prev => prev.map(c => c.id === activeChat.id ? {
          ...c, messages: c.messages.map(m => m.id === assistantMsgId ? {
            ...m, content: accumulatedContent, tokens: tokenCount, duration, speed
          } : m)
        } : c));
        setApiLogs(prev => prev.map(l => l.id === logId ? {
          ...l, response: { status: 200, statusText: 'Streaming', content: accumulatedContent, tokens: tokenCount, speed, duration }
        } : l));
      }

      setApiLogs(prev => prev.map(l => l.id === logId ? {
        ...l, response: { ...l.response!, statusText: 'Success' }
      } : l));
    } catch (e: any) {
      const isAbort = e.name === 'AbortError' || 
                      e.name === 'APIUserAbortError' || 
                      e.message?.toLowerCase().includes('abort');
      if (!isAbort) {
        const isNetErr = e.message?.includes('Failed to fetch') || e.message?.includes('Connection error') || e.message?.includes('fetch failed');
        const tip = isNetErr ? '\n\n[CORS / Connection Error]\nEnsure your local model server has CORS enabled:\n• Ollama: OLLAMA_ORIGINS="*" ollama serve\n• LM Studio: Enable "CORS" in Server settings\n• Llama.cpp: Run with --cors' : '';
        setChats(prev => prev.map(c => c.id === activeChat.id ? {
          ...c, messages: c.messages.map(m => m.id === assistantMsgId ? { ...m, content: m.content + `\n[Error: ${e.message}]${tip}` } : m)
        } : c));
        setApiLogs(prev => prev.map(l => l.id === logId ? {
          ...l, response: { status: 500, statusText: 'Error', content: '', error: e.message || 'Unknown error', duration: (Date.now() - startTime) / 1000 }
        } : l));
      } else {
        setApiLogs(prev => prev.map(l => l.id === logId ? {
          ...l, response: { status: 499, statusText: 'Aborted', content: '', error: 'Request aborted by user', duration: (Date.now() - startTime) / 1000 }
        } : l));
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleEditMessage = (msgId: string, newContent: string) => {
    if (!activeChat) return;
    const newMsgs = activeChat.messages.map(m => m.id === msgId ? { ...m, content: newContent } : m);
    setChats(chats.map(c => c.id === activeChat.id ? { ...c, messages: newMsgs } : c));
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!activeChat) return;
    setChats(chats.map(c => c.id === activeChat.id ? { ...c, messages: c.messages.filter(m => m.id !== msgId) } : c));
  };

  const handleForkChat = (msgId: string) => {
    if (!activeChat) return;
    const idx = activeChat.messages.findIndex(m => m.id === msgId);
    const newChat: Chat = {
      ...activeChat, id: Date.now().toString(), title: `${activeChat.title} (Fork)`,
      messages: activeChat.messages.slice(0, idx + 1)
    };
    setChats([newChat, ...chats]);
    setActiveId(newChat.id);
  };

  const handleMenuAction = (action: 'delete' | 'rename', targetId?: string) => {
    const id = targetId || anchorEl?.id;
    if (!id) return;
    if (action === 'delete') {
      if (confirm('Delete chat?')) {
        setChats(chats.filter(c => c.id !== id));
        if (activeId === id) setActiveId('');
      }
    } else if (action === 'rename') {
      const name = prompt('New name:');
      if (name) {
        setChats(chats.map(c => c.id === id ? { ...c, title: name } : c));
      }
    }
    setAnchorEl(null);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return {
    chats, setChats,
    activeId, setActiveId,
    activeChat,
    api, setApi,
    params, setParams,
    rightTab, setRightTab,
    apiLogs, setApiLogs,
    searchQuery, setSearchQuery,
    inputValue, setInputValue,
    showApiDialog, setShowApiDialog,
    loading,
    anchorEl, setAnchorEl,
    editId, setEditId,
    editText, setEditText,
    attachments, setAttachments,
    attachAnchorEl, setAttachAnchorEl,
    fileInputRef,
    imageInputRef,
    handleCreateChat,
    handleFileChange,
    handleImageChange,
    handlePaste,
    handleSend,
    handleEditMessage,
    handleDeleteMessage,
    handleForkChat,
    handleMenuAction,
    handleStop
  };
}
