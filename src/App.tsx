import { useState, useEffect, useRef } from 'react';
import {
  Box, Stack, Typography, TextField, IconButton, Button, List, ListItem, ListItemButton,
  ListItemText, Popover, Tabs, Tab, Accordion, AccordionSummary, AccordionDetails, Slider,
  Switch, FormControlLabel, Select, MenuItem, InputAdornment, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, CircularProgress, ThemeProvider, createTheme, Checkbox
} from '@mui/material';
import {
  Search, Folder, Add, MoreVert, Send, Settings, Psychology, Visibility, ContentCopy,
  Delete, Edit, AltRoute, Replay, ExpandMore, Tune, Build, FolderOpen, Computer, CloudQueue
} from '@mui/icons-material';
import OpenAI from 'openai';

// Types
interface Message {
  id: string; role: 'user' | 'assistant'; content: string;
  model?: string; tokens?: number; speed?: number; duration?: number; stopReason?: string;
}
interface Chat {
  id: string; title: string; folderId?: string; messages: Message[];
  systemPrompt: string; temperature: number; limitLength: boolean; enableThinking: boolean;
}
interface FolderType { id: string; name: string; }
interface ApiConfig { apiKey: string; apiBase: string; modelName: string; vision: boolean; tools: boolean; }

const defaultApiConfig: ApiConfig = {
  apiKey: '', apiBase: 'http://127.0.0.1:1234/v1', modelName: 'google/gemma-4-12b-qat', vision: true, tools: true
};

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#007aff' }, background: { default: '#f4f4f7', paper: '#ffffff' } },
  typography: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
});

export default function App() {
  // State
  const [chats, setChats] = useState<Chat[]>(() => JSON.parse(localStorage.getItem('chats') || '[]'));
  const [folders, setFolders] = useState<FolderType[]>(() => JSON.parse(localStorage.getItem('folders') || '[]'));
  const [activeId, setActiveId] = useState<string>(() => localStorage.getItem('activeChatId') || '');
  const [api, setApi] = useState<ApiConfig>(() => JSON.parse(localStorage.getItem('apiConfig') || JSON.stringify(defaultApiConfig)));
  const [rightTab, setRightTab] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<{ el: HTMLButtonElement; id: string; isFolder: boolean } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync to LocalStorage
  useEffect(() => { localStorage.setItem('chats', JSON.stringify(chats)); }, [chats]);
  useEffect(() => { localStorage.setItem('folders', JSON.stringify(folders)); }, [folders]);
  useEffect(() => { localStorage.setItem('apiConfig', JSON.stringify(api)); }, [api]);
  useEffect(() => { if (activeId) localStorage.setItem('activeChatId', activeId); }, [activeId]);

  const activeChat = chats.find(c => c.id === activeId) || chats[0] || null;

  // Actions
  const handleCreateChat = (folderId?: string) => {
    const newChat: Chat = {
      id: Date.now().toString(), title: 'New Chat', folderId, messages: [],
      systemPrompt: 'You are a helpful assistant.', temperature: 1.0, limitLength: false, enableThinking: false
    };
    setChats([newChat, ...chats]);
    setActiveId(newChat.id);
  };

  const handleCreateFolder = () => {
    const name = prompt('Folder Name:');
    if (name) setFolders([...folders, { id: Date.now().toString(), name }]);
  };

  const handleSend = async () => {
    if (!activeChat || !inputValue.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue };
    const updatedMsgs = [...activeChat.messages, userMsg];
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: '', model: api.modelName };
    
    setChats(chats.map(c => c.id === activeChat.id ? { ...c, messages: [...updatedMsgs, assistantMsg] } : c));
    setInputValue('');
    setLoading(true);

    abortControllerRef.current = new AbortController();
    const openai = new OpenAI({ apiKey: api.apiKey || 'not-needed', baseURL: api.apiBase, dangerouslyAllowBrowser: true });
    const startTime = Date.now();
    let tokenCount = 0;

    try {
      const systemMsg = activeChat.systemPrompt ? [{ role: 'system', content: activeChat.systemPrompt + (activeChat.enableThinking ? '\nThink step by step before answering.' : '') }] : [];
      const stream = await openai.chat.completions.create({
        model: api.modelName,
        messages: [...systemMsg, ...updatedMsgs.map(m => ({ role: m.role, content: m.content }))] as any,
        temperature: activeChat.temperature,
        max_tokens: activeChat.limitLength ? 150 : undefined,
        stream: true,
      }, { signal: abortControllerRef.current.signal });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        tokenCount++;
        const duration = (Date.now() - startTime) / 1000;
        setChats(prev => prev.map(c => c.id === activeChat.id ? {
          ...c, messages: c.messages.map(m => m.id === assistantMsgId ? {
            ...m, content: m.content + delta, tokens: tokenCount, duration, speed: Number((tokenCount / duration).toFixed(2))
          } : m)
        } : c));
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        const isNetErr = e.message?.includes('Failed to fetch') || e.message?.includes('Connection error') || e.message?.includes('fetch failed');
        const tip = isNetErr ? '\n\n[CORS / Connection Error]\nEnsure your local model server has CORS enabled:\n• Ollama: OLLAMA_ORIGINS="*" ollama serve\n• LM Studio: Enable "CORS" in Server settings\n• Llama.cpp: Run with --cors' : '';
        setChats(prev => prev.map(c => c.id === activeChat.id ? {
          ...c, messages: c.messages.map(m => m.id === assistantMsgId ? { ...m, content: m.content + `\n[Error: ${e.message}]${tip}` } : m)
        } : c));
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const updateChatProp = (id: string, prop: keyof Chat, val: any) => {
    setChats(chats.map(c => c.id === id ? { ...c, [prop]: val } : c));
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

  const handleMenuAction = (action: 'delete' | 'rename' | 'move', targetId?: string) => {
    const id = targetId || anchorEl?.id;
    if (!id) return;
    if (action === 'delete') {
      if (confirm('Delete item?')) {
        if (anchorEl?.isFolder) {
          setFolders(folders.filter(f => f.id !== id));
          setChats(chats.map(c => c.folderId === id ? { ...c, folderId: undefined } : c));
        } else {
          setChats(chats.filter(c => c.id !== id));
          if (activeId === id) setActiveId('');
        }
      }
    } else if (action === 'rename') {
      const name = prompt('New name:');
      if (name) {
        if (anchorEl?.isFolder) setFolders(folders.map(f => f.id === id ? { ...f, name } : f));
        else updateChatProp(id, 'title', name);
      }
    } else if (action === 'move') {
      const folderId = prompt('Folder ID (leave empty for root):') || undefined;
      updateChatProp(id, 'folderId', folderId);
    }
    setAnchorEl(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box display="flex" height="100vh" overflow="hidden">
        {/* Left Sidebar */}
        <Box width={260} borderRight="1px solid #e5e5e7" bgcolor="#f4f4f7" display="flex" flexDirection="column">
          <Stack direction="row" justifyContent="space-between" alignItems="center" p={2}>
            <Typography variant="h6" fontWeight="bold">Chats</Typography>
            <IconButton onClick={() => handleCreateChat()} size="small"><Add /></IconButton>
          </Stack>
          <Box px={2} pb={1}>
            <TextField fullWidth size="small" placeholder="Search chats..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
          </Box>
          <ListItemButton onClick={handleCreateFolder} sx={{ mx: 2, borderRadius: 1, py: 0.5 }}>
            <FolderOpen fontSize="small" sx={{ mr: 1, color: '#8e8e93' }} />
            <ListItemText primary="New Folder" primaryTypographyProps={{ fontSize: 13 }} />
          </ListItemButton>
          <Box flex={1} overflow="auto" px={2} mt={1}>
            {folders.map(f => (
              <Box key={f.id} mb={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Folder fontSize="small" sx={{ color: '#007aff' }} />
                    <Typography fontSize={13} fontWeight="bold">{f.name}</Typography>
                  </Stack>
                  <IconButton size="small" onClick={e => setAnchorEl({ el: e.currentTarget, id: f.id, isFolder: true })}><MoreVert fontSize="small" /></IconButton>
                </Stack>
                <List dense sx={{ pl: 2, py: 0 }}>
                  {chats.filter(c => c.folderId === f.id && c.title.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                    <ListItem key={c.id} disablePadding secondaryAction={
                      <IconButton edge="end" size="small" onClick={e => setAnchorEl({ el: e.currentTarget, id: c.id, isFolder: false })}><MoreVert fontSize="small" /></IconButton>
                    }>
                      <ListItemButton selected={activeId === c.id} onClick={() => setActiveId(c.id)} sx={{ borderRadius: 1 }}>
                        <ListItemText primary={c.title} primaryTypographyProps={{ fontSize: 13, noWrap: true }} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))}
            <List dense>
              {chats.filter(c => !c.folderId && c.title.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                <ListItem key={c.id} disablePadding secondaryAction={
                  <IconButton edge="end" size="small" onClick={e => setAnchorEl({ el: e.currentTarget, id: c.id, isFolder: false })}><MoreVert fontSize="small" /></IconButton>
                }>
                  <ListItemButton selected={activeId === c.id} onClick={() => setActiveId(c.id)} sx={{ borderRadius: 1 }}>
                    <ListItemText primary={c.title} primaryTypographyProps={{ fontSize: 13, noWrap: true }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
          <Box p={2} borderTop="1px solid #e5e5e7">
            <Button fullWidth size="small" startIcon={<Settings />} onClick={() => setShowApiDialog(true)} variant="outlined">API Settings</Button>
          </Box>
        </Box>

        {/* Middle Chat Panel */}
        <Box flex={1} display="flex" flexDirection="column" bgcolor="#ffffff">
          {activeChat ? (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" px={3} py={1.5} borderBottom="1px solid #e5e5e7">
                <Typography variant="subtitle1" fontWeight="bold">{activeChat.title}</Typography>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => handleMenuAction('rename', activeChat.id)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => handleMenuAction('delete', activeChat.id)}><Delete fontSize="small" /></IconButton>
                </Stack>
              </Stack>
              
              <Box flex={1} overflow="auto" p={3}>
                <Stack spacing={3}>
                  {activeChat.messages.map(m => (
                    <Box key={m.id} alignSelf={m.role === 'user' ? 'flex-end' : 'flex-start'} maxWidth="80%">
                      {m.role === 'user' ? (
                        editId === m.id ? (
                          <Stack spacing={1} width="100%" minWidth={320} alignItems="flex-start">
                            <TextField
                              fullWidth
                              multiline
                              autoFocus
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Escape') setEditId(null);
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                  handleEditMessage(m.id, editText);
                                  setEditId(null);
                                }
                              }}
                              size="small"
                            />
                            <Stack direction="row" spacing={1}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => setEditId(null)}
                                sx={{ textTransform: 'none', bgcolor: '#e3e3e7', color: '#1d1d1f', borderRadius: 1.5, boxShadow: 'none', '&:hover': { bgcolor: '#d1d1d6' } }}
                              >
                                Discard (Esc)
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => { handleEditMessage(m.id, editText); setEditId(null); }}
                                sx={{ textTransform: 'none', bgcolor: '#007aff', color: '#fff', borderRadius: 1.5, boxShadow: 'none', '&:hover': { bgcolor: '#0062cc' } }}
                              >
                                Save (⌘Enter)
                              </Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Stack spacing={0.5} alignItems="flex-end">
                            <Box bgcolor="#e3e3e7" px={2} py={1} borderRadius={4}><Typography fontSize={14}>{m.content}</Typography></Box>
                            <Stack direction="row" spacing={0.5}>
                              <IconButton size="small" onClick={() => handleForkChat(m.id)}><AltRoute fontSize="inherit" /></IconButton>
                              <IconButton size="small" onClick={() => navigator.clipboard.writeText(m.content)}><ContentCopy fontSize="inherit" /></IconButton>
                              <IconButton size="small" onClick={() => { setEditId(m.id); setEditText(m.content); }}><Edit fontSize="inherit" /></IconButton>
                              <IconButton size="small" onClick={() => handleDeleteMessage(m.id)}><Delete fontSize="inherit" /></IconButton>
                            </Stack>
                          </Stack>
                        )
                      ) : (
                        editId === m.id ? (
                          <Stack spacing={1} width="100%" minWidth={400} alignItems="flex-start">
                            <Typography fontSize={11} color="text.secondary" fontWeight="bold">{m.model}</Typography>
                            <TextField
                              fullWidth
                              multiline
                              autoFocus
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Escape') setEditId(null);
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                  handleEditMessage(m.id, editText);
                                  setEditId(null);
                                }
                              }}
                              size="small"
                            />
                            <Stack direction="row" spacing={1}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => setEditId(null)}
                                sx={{ textTransform: 'none', bgcolor: '#e3e3e7', color: '#1d1d1f', borderRadius: 1.5, boxShadow: 'none', '&:hover': { bgcolor: '#d1d1d6' } }}
                              >
                                Discard (Esc)
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => { handleEditMessage(m.id, editText); setEditId(null); }}
                                sx={{ textTransform: 'none', bgcolor: '#007aff', color: '#fff', borderRadius: 1.5, boxShadow: 'none', '&:hover': { bgcolor: '#0062cc' } }}
                              >
                                Save (⌘Enter)
                              </Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Stack spacing={1}>
                            <Typography fontSize={11} color="text.secondary" fontWeight="bold">{m.model}</Typography>
                            <Typography fontSize={14} sx={{ whiteSpace: 'pre-wrap' }}>{m.content}</Typography>
                            {m.tokens && (
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Tooltip title="Speed"><Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary"><Computer fontSize="inherit" /><Typography fontSize={11}>{m.speed} tok/s</Typography></Stack></Tooltip>
                                <Tooltip title="Tokens"><Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary"><CloudQueue fontSize="inherit" /><Typography fontSize={11}>{m.tokens} tokens</Typography></Stack></Tooltip>
                                <Typography fontSize={11} color="text.secondary">{m.duration?.toFixed(2)}s</Typography>
                              </Stack>
                            )}
                            <Stack direction="row" spacing={0.5}>
                              <IconButton size="small" onClick={handleSend}><Replay fontSize="inherit" /></IconButton>
                              <IconButton size="small" onClick={() => handleForkChat(m.id)}><AltRoute fontSize="inherit" /></IconButton>
                              <IconButton size="small" onClick={() => navigator.clipboard.writeText(m.content)}><ContentCopy fontSize="inherit" /></IconButton>
                              <IconButton size="small" onClick={() => { setEditId(m.id); setEditText(m.content); }}><Edit fontSize="inherit" /></IconButton>
                              <IconButton size="small" onClick={() => handleDeleteMessage(m.id)}><Delete fontSize="inherit" /></IconButton>
                            </Stack>
                          </Stack>
                        )
                      )}
                    </Box>
                  ))}
                  {loading && <CircularProgress size={20} />}
                </Stack>
              </Box>

              {/* Bottom Input Area */}
              <Box p={3} borderTop="1px solid #e5e5e7">
                <Box border="1px solid #e5e5e7" borderRadius={4} p={1} bgcolor="#fafafa">
                  <TextField fullWidth multiline maxRows={4} placeholder="Send a message to the model..." value={inputValue} onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} variant="standard" InputProps={{ disableUnderline: true }} />
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" color="primary"><Add /></IconButton>
                      <IconButton size="small"><Build fontSize="small" /></IconButton>
                      <Button size="small" startIcon={<Psychology />} variant={activeChat.enableThinking ? 'contained' : 'outlined'} onClick={() => updateChatProp(activeChat.id, 'enableThinking', !activeChat.enableThinking)} sx={{ borderRadius: 3, textTransform: 'none', px: 1.5 }}>Think</Button>
                      {api.vision && <Button size="small" startIcon={<Visibility />} variant="outlined" sx={{ borderRadius: 3, textTransform: 'none', px: 1.5 }}>Vision</Button>}
                    </Stack>
                    <IconButton onClick={handleSend} disabled={!inputValue.trim() || loading} color="primary" sx={{ bgcolor: inputValue.trim() ? '#007aff' : '#f4f4f7', color: '#fff', '&:hover': { bgcolor: '#0062cc' } }}><Send fontSize="small" /></IconButton>
                  </Stack>
                </Box>
              </Box>
            </>
          ) : (
            <Stack flex={1} justifyContent="center" alignItems="center" spacing={2} bgcolor="#fafafa">
              <Typography color="text.secondary">Select a chat or create a new one to begin.</Typography>
              <Button onClick={() => handleCreateChat()} startIcon={<Add />} variant="contained">New Chat</Button>
            </Stack>
          )}
        </Box>

        {/* Right Sidebar (Model Settings) */}
        {activeChat && (
          <Box width={340} borderLeft="1px solid #e5e5e7" bgcolor="#ffffff" display="flex" flexDirection="column">
            <Tabs value={rightTab} onChange={(_, v) => setRightTab(v)} variant="fullWidth" sx={{ borderBottom: '1px solid #e5e5e7' }}>
              <Tab icon={<Build />} label="Tools" />
              <Tab icon={<Tune />} label="Parameters" />
            </Tabs>
            
            <Box flex={1} overflow="auto" p={2}>
              {rightTab === 1 ? (
                <Stack spacing={2}>
                  <Typography variant="subtitle2" fontWeight="bold">Model Parameters</Typography>
                  <Box p={1.5} border="1px solid #e5e5e7" borderRadius={2}>
                    <Typography fontSize={12} color="text.secondary" mb={0.5}>Preset</Typography>
                    <Select fullWidth size="small" value="unsaved">
                      <MenuItem value="unsaved">Unsaved Preset</MenuItem>
                    </Select>
                  </Box>

                  <Accordion defaultExpanded disableGutters elevation={0} sx={{ borderBottom: '1px solid #e5e5e7' }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography fontSize={13} fontWeight="bold">System Prompt</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0, pb: 2 }}>
                      <TextField fullWidth multiline rows={3} size="small" value={activeChat.systemPrompt} onChange={e => updateChatProp(activeChat.id, 'systemPrompt', e.target.value)} />
                    </AccordionDetails>
                  </Accordion>

                  <Accordion defaultExpanded disableGutters elevation={0} sx={{ borderBottom: '1px solid #e5e5e7' }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography fontSize={13} fontWeight="bold">Custom Fields</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0, pb: 2 }}>
                      <FormControlLabel control={<Switch checked={activeChat.enableThinking} onChange={e => updateChatProp(activeChat.id, 'enableThinking', e.target.checked)} />}
                        label={<Typography fontSize={13}>Enable Thinking</Typography>} />
                    </AccordionDetails>
                  </Accordion>

                  <Accordion defaultExpanded disableGutters elevation={0} sx={{ borderBottom: '1px solid #e5e5e7' }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography fontSize={13} fontWeight="bold">Settings</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0, pb: 2 }}>
                      <Typography fontSize={12} color="text.secondary">Temperature: {activeChat.temperature}</Typography>
                      <Slider min={0} max={2} step={0.1} value={activeChat.temperature} onChange={(_, val) => updateChatProp(activeChat.id, 'temperature', val as number)} />
                      <FormControlLabel control={<Checkbox checked={activeChat.limitLength} onChange={(e: any) => updateChatProp(activeChat.id, 'limitLength', e.target.checked)} />}
                        label={<Typography fontSize={13}>Limit Response Length</Typography>} />
                    </AccordionDetails>
                  </Accordion>
                </Stack>
              ) : (
                <Stack spacing={2} justifyContent="center" alignItems="center" height="100%" color="text.secondary">
                  <Build fontSize="large" />
                  <Typography fontSize={13}>No tools enabled for Gemma-4.</Typography>
                </Stack>
              )}
            </Box>
          </Box>
        )}

        {/* Options Popover */}
        <Popover open={Boolean(anchorEl)} anchorEl={anchorEl?.el} onClose={() => setAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <List dense sx={{ p: 0.5 }}>
            <ListItemButton onClick={() => handleMenuAction('rename')}><ListItemText primary="Rename" /></ListItemButton>
            {!anchorEl?.isFolder && <ListItemButton onClick={() => handleMenuAction('move')}><ListItemText primary="Move to Folder" /></ListItemButton>}
            <ListItemButton onClick={() => handleMenuAction('delete')} sx={{ color: 'error.main' }}><ListItemText primary="Delete" /></ListItemButton>
          </List>
        </Popover>

        {/* API Settings Dialog */}
        <Dialog open={showApiDialog} onClose={() => setShowApiDialog(false)}>
          <DialogTitle>API Configuration</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1} width={320}>
              <TextField label="API Base URL" size="small" value={api.apiBase} onChange={e => setApi({ ...api, apiBase: e.target.value })} />
              <TextField label="Model Name" size="small" value={api.modelName} onChange={e => setApi({ ...api, modelName: e.target.value })} />
              <TextField label="API Key (optional)" size="small" type="password" value={api.apiKey} onChange={e => setApi({ ...api, apiKey: e.target.value })} />
              <FormControlLabel control={<Switch checked={api.vision} onChange={e => setApi({ ...api, vision: e.target.checked })} />} label="Supports Vision" />
              <FormControlLabel control={<Switch checked={api.tools} onChange={e => setApi({ ...api, tools: e.target.checked })} />} label="Supports Tools" />
              <Typography fontSize={11} color="text.secondary" sx={{ mt: 1, bgcolor: '#f4f4f7', p: 1, borderRadius: 1 }}>
                <strong>CORS Tip:</strong> Local engines require CORS headers. Start Ollama with OLLAMA_ORIGINS="*" or enable CORS in LM Studio server settings.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowApiDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
