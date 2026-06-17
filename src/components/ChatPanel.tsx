import { Box, Stack, Typography, TextField, IconButton, Button, CircularProgress, Tooltip, Popover, List, ListItemButton, ListItemText } from '@mui/material';
import { Edit, Delete, AltRoute, ContentCopy, Computer, CloudQueue, Replay, ArrowForward, AttachFile, Add, Psychology, Send, Image } from '@mui/icons-material';
import { Chat, Attachment, Params } from '../types';

interface ChatPanelProps {
  activeChat: Chat | null;
  loading: boolean;
  inputValue: string;
  setInputValue: (val: string) => void;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  attachAnchorEl: HTMLButtonElement | null;
  setAttachAnchorEl: (el: HTMLButtonElement | null) => void;
  fileInputRef: React.RefObject<any>;
  imageInputRef: React.RefObject<any>;
  editId: string | null;
  setEditId: (id: string | null) => void;
  editText: string;
  setEditText: (txt: string) => void;
  params: Params;
  setParams: React.Dispatch<React.SetStateAction<Params>>;
  handleCreateChat: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  handleSend: (continueId?: string, regenerateId?: string) => Promise<void>;
  handleEditMessage: (msgId: string, newContent: string) => void;
  handleDeleteMessage: (msgId: string) => void;
  handleForkChat: (msgId: string) => void;
  handleMenuAction: (action: 'delete' | 'rename', targetId?: string) => void;
}

export function ChatPanel({
  activeChat,
  loading,
  inputValue,
  setInputValue,
  attachments,
  setAttachments,
  attachAnchorEl,
  setAttachAnchorEl,
  fileInputRef,
  imageInputRef,
  editId,
  setEditId,
  editText,
  setEditText,
  params,
  setParams,
  handleCreateChat,
  handleFileChange,
  handleImageChange,
  handlePaste,
  handleSend,
  handleEditMessage,
  handleDeleteMessage,
  handleForkChat,
  handleMenuAction
}: ChatPanelProps) {
  return (
    <Box flex={1} display="flex" flexDirection="column" bgcolor="#ffffff">
      {activeChat ? (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" px={3} py={1.5} borderBottom="1px solid #e5e5e7">
            <Typography variant="subtitle1" fontWeight="bold">{activeChat.title}</Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Rename Chat">
                <IconButton size="small" onClick={() => handleMenuAction('rename', activeChat.id)}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Chat">
                <IconButton size="small" onClick={() => handleMenuAction('delete', activeChat.id)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
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
                        <Box bgcolor="#e3e3e7" px={2} py={1} borderRadius={4}>
                          {m.files && m.files.length > 0 && (
                            <Stack spacing={0.5} mb={m.content ? 1 : 0} data-testid="chat-message-files">
                              {m.files.map((file, idx) => (
                                <Stack
                                  key={idx}
                                  direction="row"
                                  alignItems="center"
                                  spacing={0.5}
                                  sx={{
                                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                                    borderRadius: 1,
                                    p: 0.75,
                                    border: '1px solid rgba(0, 0, 0, 0.05)'
                                  }}
                                  data-testid="message-file-badge"
                                >
                                  <AttachFile fontSize="small" sx={{ fontSize: 14 }} />
                                  <Typography fontSize={11} noWrap fontWeight="medium">{file.name}</Typography>
                                </Stack>
                              ))}
                            </Stack>
                          )}
                          {m.images && m.images.length > 0 && (
                            <Stack direction="row" spacing={1} flexWrap="wrap" mb={m.content ? 1 : 0} data-testid="chat-message-images">
                              {m.images.map((img, idx) => (
                                <Box
                                  key={idx}
                                  component="img"
                                  src={img}
                                  alt={`attachment-${idx}`}
                                  sx={{
                                    maxWidth: 160,
                                    maxHeight: 160,
                                    borderRadius: 1.5,
                                    objectFit: 'cover',
                                    border: '1px solid rgba(0, 0, 0, 0.1)'
                                  }}
                                  data-testid="message-image-thumbnail"
                                />
                              ))}
                            </Stack>
                          )}
                          {m.content && <Typography fontSize={14}>{m.content}</Typography>}
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Fork conversation">
                            <IconButton size="small" onClick={() => handleForkChat(m.id)}>
                              <AltRoute fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy message">
                            <IconButton size="small" onClick={() => navigator.clipboard.writeText(m.content)}>
                              <ContentCopy fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit message">
                            <IconButton size="small" onClick={() => { setEditId(m.id); setEditText(m.content); }}>
                              <Edit fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete message">
                            <IconButton size="small" onClick={() => handleDeleteMessage(m.id)}>
                              <Delete fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
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
                            <Tooltip title="Speed">
                              <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
                                <Computer fontSize="inherit" />
                                <Typography fontSize={11}>{m.speed} tok/s</Typography>
                              </Stack>
                            </Tooltip>
                            <Tooltip title="Tokens">
                              <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
                                <CloudQueue fontSize="inherit" />
                                <Typography fontSize={11}>{m.tokens} tokens</Typography>
                              </Stack>
                            </Tooltip>
                            <Typography fontSize={11} color="text.secondary">{m.duration?.toFixed(2)}s</Typography>
                          </Stack>
                        )}
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Regenerate message">
                            <IconButton size="small" onClick={() => handleSend(undefined, m.id)}>
                              <Replay fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Continue assistant message">
                            <IconButton size="small" onClick={() => handleSend(m.id)}>
                              <ArrowForward fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Fork conversation">
                            <IconButton size="small" onClick={() => handleForkChat(m.id)}>
                              <AltRoute fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy message">
                            <IconButton size="small" onClick={() => navigator.clipboard.writeText(m.content)}>
                              <ContentCopy fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit message">
                            <IconButton size="small" onClick={() => { setEditId(m.id); setEditText(m.content); }}>
                              <Edit fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete message">
                            <IconButton size="small" onClick={() => handleDeleteMessage(m.id)}>
                              <Delete fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
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
              {attachments.length > 0 && (
                <Stack direction="row" spacing={1} overflow="auto" pb={1} mb={1} borderBottom="1px solid #e5e5e7" data-testid="staged-attachments-preview">
                  {attachments.map(att => (
                    <Box key={att.id} position="relative" display="inline-block" sx={{ flexShrink: 0 }} data-testid="staged-attachment">
                      {att.isImage ? (
                        <Box
                          component="img"
                          src={att.content}
                          alt={att.name}
                          data-testid="staged-image"
                          sx={{ width: 48, height: 48, borderRadius: 1.5, objectFit: 'cover', border: '1px solid #e5e5e7' }}
                        />
                      ) : (
                        <Stack direction="row" alignItems="center" spacing={0.5} data-testid="staged-file" sx={{ height: 48, px: 1.5, borderRadius: 1.5, border: '1px solid #e5e5e7', bgcolor: '#ffffff' }}>
                          <AttachFile fontSize="small" color="action" />
                          <Typography fontSize={11} noWrap sx={{ maxWidth: 80 }}>{att.name}</Typography>
                        </Stack>
                      )}
                      <IconButton
                        size="small"
                        data-testid="remove-attachment"
                        onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                        sx={{
                          position: 'absolute', top: -6, right: -6, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', p: 0.25,
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                        }}
                      >
                        <Delete sx={{ fontSize: 10 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Send a message to the model..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                onPaste={handlePaste}
                variant="standard"
                InputProps={{ disableUnderline: true }}
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Attach">
                    <IconButton size="small" color="primary" onClick={e => setAttachAnchorEl(e.currentTarget)} data-testid="attach-button">
                      <Add />
                    </IconButton>
                  </Tooltip>
                  <Button size="small" startIcon={<Psychology />} variant={params.enableThinking ? 'contained' : 'outlined'} onClick={() => setParams({ ...params, enableThinking: !params.enableThinking })} sx={{ borderRadius: 3, textTransform: 'none', px: 1.5 }}>
                    Think
                  </Button>
                </Stack>
                <Tooltip title="Send message">
                  <IconButton
                    onClick={() => handleSend()}
                    disabled={(!inputValue.trim() && attachments.length === 0) || loading}
                    color="primary"
                    sx={{ bgcolor: (inputValue.trim() || attachments.length > 0) ? '#007aff' : '#f4f4f7', color: '#fff', '&:hover': { bgcolor: '#0062cc' } }}
                    data-testid="send-button"
                  >
                    <Send fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              data-testid="file-input"
            />
            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              style={{ display: 'none' }}
              onChange={handleImageChange}
              data-testid="image-input"
            />
            <Popover
              open={Boolean(attachAnchorEl)}
              anchorEl={attachAnchorEl}
              onClose={() => setAttachAnchorEl(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <List dense sx={{ p: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    setAttachAnchorEl(null);
                    fileInputRef.current?.click();
                  }}
                  data-testid="attach-file-option"
                >
                  <AttachFile fontSize="small" sx={{ mr: 1 }} />
                  <ListItemText primary="Attach file" />
                </ListItemButton>
                <ListItemButton
                  onClick={() => {
                    setAttachAnchorEl(null);
                    imageInputRef.current?.click();
                  }}
                  data-testid="attach-image-option"
                >
                  <Image fontSize="small" sx={{ mr: 1 }} />
                  <ListItemText primary="Attach image" />
                </ListItemButton>
              </List>
            </Popover>
          </Box>
        </>
      ) : (
        <Stack flex={1} justifyContent="center" alignItems="center" spacing={2} bgcolor="#fafafa">
          <Typography color="text.secondary">Select a chat or create a new one to begin.</Typography>
          <Button onClick={handleCreateChat} startIcon={<Add />} variant="contained">New Chat</Button>
        </Stack>
      )}
    </Box>
  );
}
