import { Box, Stack, Typography, Tooltip, IconButton, TextField, InputAdornment, List, ListItem, ListItemButton, ListItemText, Popover } from '@mui/material';
import { Add, Search, MoreVert, Settings } from '@mui/icons-material';
import { Button } from '@mui/material';
import { Chat } from '../types';

interface SidebarProps {
  chats: Chat[];
  activeId: string;
  setActiveId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  handleCreateChat: () => void;
  setShowApiDialog: (open: boolean) => void;
  setAnchorEl: (val: { el: HTMLButtonElement; id: string } | null) => void;
  anchorEl: { el: HTMLButtonElement; id: string } | null;
  handleMenuAction: (action: 'delete' | 'rename', targetId?: string) => void;
}

export function Sidebar({
  chats,
  activeId,
  setActiveId,
  searchQuery,
  setSearchQuery,
  handleCreateChat,
  setShowApiDialog,
  setAnchorEl,
  anchorEl,
  handleMenuAction
}: SidebarProps) {
  return (
    <Box width={260} borderRight="1px solid #e5e5e7" bgcolor="#f4f4f7" display="flex" flexDirection="column" data-testid="sidebar-container">
      <Stack direction="row" justifyContent="space-between" alignItems="center" p={2}>
        <Typography variant="h6" fontWeight="bold">Chats</Typography>
        <Tooltip title="New Chat">
          <IconButton onClick={handleCreateChat} size="small">
            <Add />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box px={2} pb={1}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            )
          }}
        />
      </Box>
      <Box flex={1} overflow="auto" px={2} mt={1}>
        <List dense>
          {chats
            .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(c => (
              <ListItem
                key={c.id}
                disablePadding
                secondaryAction={
                  <Tooltip title="Chat Options">
                    <IconButton edge="end" size="small" onClick={e => setAnchorEl({ el: e.currentTarget, id: c.id })}>
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemButton selected={activeId === c.id} onClick={() => setActiveId(c.id)} sx={{ borderRadius: 1 }}>
                  <ListItemText primary={c.title} primaryTypographyProps={{ fontSize: 13, noWrap: true }} />
                </ListItemButton>
              </ListItem>
            ))}
        </List>
      </Box>
      <Box p={2} borderTop="1px solid #e5e5e7">
        <Button fullWidth size="small" startIcon={<Settings />} onClick={() => setShowApiDialog(true)} variant="outlined">
          API Settings
        </Button>
      </Box>

      {/* Options Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl?.el}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <List dense sx={{ p: 0.5 }}>
          <ListItemButton onClick={() => handleMenuAction('rename')}><ListItemText primary="Rename" /></ListItemButton>
          <ListItemButton onClick={() => handleMenuAction('delete')} sx={{ color: 'error.main' }}><ListItemText primary="Delete" /></ListItemButton>
        </List>
      </Popover>
    </Box>
  );
}
