import { Box, ThemeProvider, createTheme, useMediaQuery, Drawer, useTheme } from '@mui/material';
import { useState } from 'react';
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
  const uiTheme = useTheme();
  const isMobile = useMediaQuery(uiTheme.breakpoints.down('md'));

  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <Box display="flex" height="100vh" overflow="hidden">
        {/* Left Sidebar */}
        {isMobile ? (
          <Drawer
            anchor="left"
            open={mobileLeftOpen}
            onClose={() => setMobileLeftOpen(false)}
            PaperProps={{ sx: { width: 260 } }}
          >
            <Sidebar
              chats={chatState.chats}
              activeId={chatState.activeId}
              setActiveId={(id) => {
                chatState.setActiveId(id);
                setMobileLeftOpen(false);
              }}
              searchQuery={chatState.searchQuery}
              setSearchQuery={chatState.setSearchQuery}
              handleCreateChat={() => {
                chatState.handleCreateChat();
                setMobileLeftOpen(false);
              }}
              setShowApiDialog={(show) => {
                chatState.setShowApiDialog(show);
                setMobileLeftOpen(false);
              }}
              anchorEl={chatState.anchorEl}
              setAnchorEl={chatState.setAnchorEl}
              handleMenuAction={chatState.handleMenuAction}
            />
          </Drawer>
        ) : (
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
        )}

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
          handleStop={chatState.handleStop}
          isMobile={isMobile}
          onToggleLeftDrawer={() => setMobileLeftOpen(!mobileLeftOpen)}
          onToggleRightDrawer={() => setMobileRightOpen(!mobileRightOpen)}
        />

        {/* Right Sidebar (Settings) */}
        {chatState.activeChat && (
          isMobile ? (
            <Drawer
              anchor="right"
              open={mobileRightOpen}
              onClose={() => setMobileRightOpen(false)}
              PaperProps={{ sx: { width: 340 } }}
            >
              <SettingsPanel
                rightTab={chatState.rightTab}
                setRightTab={chatState.setRightTab}
                params={chatState.params}
                setParams={chatState.setParams}
                apiLogs={chatState.apiLogs}
                setApiLogs={chatState.setApiLogs}
              />
            </Drawer>
          ) : (
            <SettingsPanel
              rightTab={chatState.rightTab}
              setRightTab={chatState.setRightTab}
              params={chatState.params}
              setParams={chatState.setParams}
              apiLogs={chatState.apiLogs}
              setApiLogs={chatState.setApiLogs}
            />
          )
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
