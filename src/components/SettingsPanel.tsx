import { Box, Tabs, Tab, Stack, Typography, Button, Accordion, AccordionSummary, AccordionDetails, TextField, FormControlLabel, Switch, Slider, Checkbox } from '@mui/material';
import { Tune, History, ExpandMore } from '@mui/icons-material';
import { Params, ApiLog } from '../types';

interface SettingsPanelProps {
  rightTab: number;
  setRightTab: (tab: number) => void;
  params: Params;
  setParams: React.Dispatch<React.SetStateAction<Params>>;
  apiLogs: ApiLog[];
  setApiLogs: React.Dispatch<React.SetStateAction<ApiLog[]>>;
}

export function SettingsPanel({
  rightTab,
  setRightTab,
  params,
  setParams,
  apiLogs,
  setApiLogs
}: SettingsPanelProps) {
  return (
    <Box width={340} borderLeft="1px solid #e5e5e7" bgcolor="#ffffff" display="flex" flexDirection="column" data-testid="settings-panel-container">
      <Tabs value={rightTab} onChange={(_, v) => setRightTab(v)} variant="fullWidth" sx={{ borderBottom: '1px solid #e5e5e7' }}>
        <Tab icon={<Tune />} label="Parameters" />
        <Tab icon={<History />} label="Logs" />
      </Tabs>
      
      <Box flex={1} overflow="auto" p={2}>
        {rightTab === 0 ? (
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight="bold">Model Parameters</Typography>

            <Accordion defaultExpanded disableGutters elevation={0} sx={{ borderBottom: '1px solid #e5e5e7' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontSize={13} fontWeight="bold">System Prompt</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, pb: 2 }}>
                <TextField placeholder="Enter system prompt..." fullWidth multiline rows={3} size="small" value={params.systemPrompt} onChange={e => setParams({ ...params, systemPrompt: e.target.value })} />
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded disableGutters elevation={0} sx={{ borderBottom: '1px solid #e5e5e7' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontSize={13} fontWeight="bold">Custom Fields</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, pb: 2 }}>
                <FormControlLabel control={<Switch checked={params.enableThinking} onChange={e => setParams({ ...params, enableThinking: e.target.checked })} />}
                  label={<Typography fontSize={13}>Enable Thinking</Typography>} />
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded disableGutters elevation={0} sx={{ borderBottom: '1px solid #e5e5e7' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontSize={13} fontWeight="bold">Image Input</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, pb: 2 }}>
                <Stack spacing={1.5}>
                  <Box sx={{ bgcolor: '#fafafa', p: 1.5, borderRadius: 1.5, border: '1px solid #e5e5e7' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} mb={0.5}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography fontSize={13}>Never exceed</Typography>
                        <TextField
                          size="small"
                          type="number"
                          value={params.downsizeMaxPx}
                          onChange={e => setParams({ ...params, downsizeMaxPx: parseInt(e.target.value) || 0 })}
                          disabled={!params.downsizeEnabled}
                          inputProps={{ min: 1, style: { padding: '2px 8px', fontSize: 13, width: 60, textAlign: 'center' }, 'data-testid': 'downsize-max-px-input' }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.5,
                              bgcolor: '#ffffff'
                            }
                          }}
                        />
                        <Typography fontSize={13}>px</Typography>
                      </Stack>
                      <Switch
                        checked={params.downsizeEnabled}
                        onChange={e => setParams({ ...params, downsizeEnabled: e.target.checked })}
                        data-testid="downsize-enabled-toggle"
                      />
                    </Stack>
                    <Typography fontSize={11} color="text.secondary">
                      Resize images such that the longest edge is no larger than the value above. Proportions are maintained.
                    </Typography>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded disableGutters elevation={0} sx={{ borderBottom: '1px solid #e5e5e7' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontSize={13} fontWeight="bold">Settings</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, pb: 2 }}>
                <Typography fontSize={12} color="text.secondary">Temperature: {params.temperature}</Typography>
                <Slider min={0} max={2} step={0.1} value={params.temperature} onChange={(_, val) => setParams({ ...params, temperature: val as number })} />
                <FormControlLabel control={<Checkbox checked={params.limitLength} onChange={(e: any) => setParams({ ...params, limitLength: e.target.checked })} />}
                  label={<Typography fontSize={13}>Limit Response Length</Typography>} />
              </AccordionDetails>
            </Accordion>
          </Stack>
        ) : (
          <Stack spacing={2} height="100%">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" fontWeight="bold">API Call Logs</Typography>
              <Button size="small" variant="text" onClick={() => setApiLogs([])} disabled={apiLogs.length === 0} sx={{ textTransform: 'none', color: '#ff3b30' }}>
                Clear Logs
              </Button>
            </Stack>

            {apiLogs.length === 0 ? (
              <Stack spacing={1} justifyContent="center" alignItems="center" flex={1} color="text.secondary">
                <History fontSize="large" />
                <Typography fontSize={13}>No API calls recorded yet.</Typography>
              </Stack>
            ) : (
              <Stack spacing={1} overflow="auto" sx={{ maxHeight: 'calc(100vh - 160px)' }}>
                {apiLogs.map(log => (
                  <Accordion key={log.id} disableGutters elevation={0} sx={{ border: '1px solid #e5e5e7', borderRadius: 1.5, mb: 1, '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 1.5, py: 0.5, minHeight: 'auto', '& .MuiAccordionSummary-content': { my: 0.5, alignItems: 'center', justifyContent: 'space-between', display: 'flex', width: '100%', mr: 1 } }}>
                      <Stack spacing={0.5} alignItems="flex-start" sx={{ overflow: 'hidden', mr: 1 }}>
                        <Typography fontSize={12} fontWeight="bold" sx={{ color: '#007aff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          POST /chat/completions
                        </Typography>
                        <Typography fontSize={10} color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                          {log.request.model}
                        </Typography>
                      </Stack>
                      <Stack spacing={0.5} alignItems="flex-end" sx={{ flexShrink: 0 }}>
                        <Box
                          component="span"
                          sx={{
                            fontSize: 10,
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            fontWeight: 'bold',
                            bgcolor:
                              log.response?.statusText === 'Success' ? '#e2f6ea' :
                              log.response?.statusText === 'Error' ? '#ffe5e5' :
                              log.response?.statusText === 'Aborted' ? '#f4f4f7' : '#fff3cd',
                            color:
                              log.response?.statusText === 'Success' ? '#34c759' :
                              log.response?.statusText === 'Error' ? '#ff3b30' :
                              log.response?.statusText === 'Aborted' ? '#8e8e93' : '#ff9500'
                          }}
                        >
                          {log.response?.statusText || 'Pending'}
                        </Box>
                        <Typography fontSize={9} color="text.secondary">{log.timestamp}</Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 1.5, borderTop: '1px solid #e5e5e7', bgcolor: '#fafafa' }}>
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography fontSize={11} fontWeight="bold" color="text.secondary" gutterBottom>Request URL</Typography>
                          <Typography fontSize={11} sx={{ wordBreak: 'break-all', fontFamily: 'monospace', bgcolor: '#f4f4f7', p: 0.5, borderRadius: 0.5 }}>{log.url}</Typography>
                        </Box>
                        
                        <Box>
                          <Typography fontSize={11} fontWeight="bold" color="text.secondary" gutterBottom>Request Payload</Typography>
                          <pre style={{ fontSize: 10, background: '#f4f4f7', padding: 6, borderRadius: 4, overflowX: 'auto', margin: 0, fontFamily: 'monospace' }}>
                            {JSON.stringify(log.request, null, 2)}
                          </pre>
                        </Box>

                        <Box>
                          <Typography fontSize={11} fontWeight="bold" color="text.secondary" gutterBottom>Response Metrics</Typography>
                          <Stack direction="row" spacing={2} sx={{ bgcolor: '#f4f4f7', p: 1, borderRadius: 1 }}>
                            <Box>
                              <Typography fontSize={9} color="text.secondary">Status</Typography>
                              <Typography fontSize={11} fontWeight="bold">{log.response?.status} {log.response?.statusText}</Typography>
                            </Box>
                            {log.response?.duration && (
                              <Box>
                                <Typography fontSize={9} color="text.secondary">Duration</Typography>
                                <Typography fontSize={11} fontWeight="bold">{log.response.duration.toFixed(2)}s</Typography>
                              </Box>
                            )}
                            {log.response?.speed && (
                              <Box>
                                <Typography fontSize={9} color="text.secondary">Speed</Typography>
                                <Typography fontSize={11} fontWeight="bold">{log.response.speed} tok/s</Typography>
                              </Box>
                            )}
                            {log.response?.tokens && (
                              <Box>
                                <Typography fontSize={9} color="text.secondary">Tokens</Typography>
                                <Typography fontSize={11} fontWeight="bold">{log.response.tokens}</Typography>
                              </Box>
                            )}
                          </Stack>
                        </Box>

                        {log.response?.error ? (
                          <Box>
                            <Typography fontSize={11} fontWeight="bold" color="error" gutterBottom>Error Log</Typography>
                            <pre style={{ fontSize: 10, background: '#ffe5e5', color: '#ff3b30', padding: 6, borderRadius: 4, overflowX: 'auto', margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                              {log.response.error}
                            </pre>
                          </Box>
                        ) : (
                          <Box>
                            <Typography fontSize={11} fontWeight="bold" color="text.secondary" gutterBottom>Response Text Content</Typography>
                            <pre style={{ fontSize: 10, background: '#f4f4f7', padding: 6, borderRadius: 4, overflowX: 'auto', margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 150 }}>
                              {log.response?.content || '(Empty)'}
                            </pre>
                          </Box>
                        )}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
