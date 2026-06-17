import { Dialog, DialogTitle, DialogContent, Stack, TextField, Button, DialogActions, Typography } from '@mui/material';
import { ApiConfig } from '../types';

interface ApiSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  api: ApiConfig;
  setApi: React.Dispatch<React.SetStateAction<ApiConfig>>;
}

export function ApiSettingsDialog({ open, onClose, api, setApi }: ApiSettingsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>API Configuration</DialogTitle>
      <DialogContent>
        <Stack spacing={2} pt={1} width={320}>
          <TextField label="API Base URL" size="small" value={api.apiBase} onChange={e => setApi({ ...api, apiBase: e.target.value })} />
          <TextField label="Model Name" size="small" value={api.modelName} onChange={e => setApi({ ...api, modelName: e.target.value })} />
          <TextField label="API Key (optional)" size="small" type="password" value={api.apiKey} onChange={e => setApi({ ...api, apiKey: e.target.value })} />
          <Typography fontSize={11} color="text.secondary" sx={{ mt: 1, bgcolor: '#f4f4f7', p: 1, borderRadius: 1 }}>
            <strong>CORS Tip:</strong> Local engines require CORS headers. Start Ollama with OLLAMA_ORIGINS="*" or enable CORS in LM Studio server settings.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
