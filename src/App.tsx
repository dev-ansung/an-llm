import { Box, ThemeProvider, createTheme } from '@mui/material';
import { useChatState } from './hooks/useChatState';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ApiSettingsDialog } from './components/ApiSettingsDialog';

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#007aff' }, background: { default: '#f4f4f7', paper: '#ffffff' } },
  typography: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
});

export default function App() {
  const chatState = useChatState();

  return (
    <ThemeProvider theme={theme}>
      <Box display="flex" height="100vh" overflow="hidden">
        {/* Left Sidebar */}
        <Sidebar
          chats={chatState.chats}
          activeId={chatState.activeId}
          setActiveId={chatState.setActiveId}
          searchQuery={chatState.searchQuery}
          setSearchQuery={chatState.setSearchQuery}
          handleCreateChat={chatState.handleCreateChat}
          setShowApiDialog={chatState.setShowApiDialog}
          anchorEl={chatState.anchorEl}
          setAnchorEl={chatState.setAnchorEl}
          handleMenuAction={chatState.handleMenuAction}
        />

        {/* Middle Chat Panel */}
        <ChatPanel
          activeChat={chatState.activeChat}
          loading={chatState.loading}
          inputValue={chatState.inputValue}
          setInputValue={chatState.setInputValue}
          attachments={chatState.attachments}
          setAttachments={chatState.setAttachments}
          attachAnchorEl={chatState.attachAnchorEl}
          setAttachAnchorEl={chatState.setAttachAnchorEl}
          fileInputRef={chatState.fileInputRef}
          imageInputRef={chatState.imageInputRef}
          editId={chatState.editId}
          setEditId={chatState.setEditId}
          editText={chatState.editText}
          setEditText={chatState.setEditText}
          params={chatState.params}
          setParams={chatState.setParams}
          handleCreateChat={chatState.handleCreateChat}
          handleFileChange={chatState.handleFileChange}
          handleImageChange={chatState.handleImageChange}
          handlePaste={chatState.handlePaste}
          handleSend={chatState.handleSend}
          handleEditMessage={chatState.handleEditMessage}
          handleDeleteMessage={chatState.handleDeleteMessage}
          handleForkChat={chatState.handleForkChat}
          handleMenuAction={chatState.handleMenuAction}
        />

        {/* Right Sidebar (Settings) */}
        {chatState.activeChat && (
          <SettingsPanel
            rightTab={chatState.rightTab}
            setRightTab={chatState.setRightTab}
            params={chatState.params}
            setParams={chatState.setParams}
            apiLogs={chatState.apiLogs}
            setApiLogs={chatState.setApiLogs}
          />
        )}

        {/* API Settings Dialog */}
        <ApiSettingsDialog
          open={chatState.showApiDialog}
          onClose={() => chatState.setShowApiDialog(false)}
          api={chatState.api}
          setApi={chatState.setApi}
        />
      </Box>
    </ThemeProvider>
  );
}
