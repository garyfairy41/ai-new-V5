import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  TextField,
  Typography,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { JSONEditor } from './JSONEditor';

interface ZapierIntegration {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  webhook_url: string;
  parameter_schema: any;
  created_at?: string;
  updated_at?: string;
}

interface ZapierIntegrationManagerProps {
  agentId: string;
}

const ZapierIntegrationManager: React.FC<ZapierIntegrationManagerProps> = ({ agentId }) => {
  const [integrations, setIntegrations] = useState<ZapierIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentIntegration, setCurrentIntegration] = useState<ZapierIntegration | null>(null);
  const [formData, setFormData] = useState<Partial<ZapierIntegration>>({
    name: '',
    description: '',
    webhook_url: '',
    parameter_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const supabase = useSupabaseClient();

  // Fetch Zapier integrations
  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/zaps`);
      if (!response.ok) {
        throw new Error(`Failed to fetch Zapier integrations: ${response.statusText}`);
      }
      const data = await response.json();
      setIntegrations(data);
    } catch (err) {
      console.error('Error fetching Zapier integrations:', err);
      setError(err.message || 'Failed to load Zapier integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) {
      fetchIntegrations();
    }
  }, [agentId]);

  const handleOpenDialog = (integration: ZapierIntegration | null = null) => {
    if (integration) {
      setCurrentIntegration(integration);
      setFormData({
        name: integration.name,
        description: integration.description,
        webhook_url: integration.webhook_url,
        parameter_schema: integration.parameter_schema
      });
    } else {
      setCurrentIntegration(null);
      setFormData({
        name: '',
        description: '',
        webhook_url: '',
        parameter_schema: {
          type: 'object',
          properties: {},
          required: []
        }
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentIntegration(null);
  };

  const handleOpenDeleteDialog = (integration: ZapierIntegration) => {
    setCurrentIntegration(integration);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setCurrentIntegration(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSchemaChange = (schema: any) => {
    setFormData(prev => ({ ...prev, parameter_schema: schema }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.description || !formData.webhook_url || !formData.parameter_schema) {
        throw new Error('All fields are required');
      }

      let response;
      if (currentIntegration) {
        // Update existing integration
        response = await fetch(`/api/zaps/${currentIntegration.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        // Create new integration
        response = await fetch(`/api/agents/${agentId}/zaps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save Zapier integration');
      }

      setSnackbar({
        open: true,
        message: `Zapier integration ${currentIntegration ? 'updated' : 'created'} successfully!`,
        severity: 'success'
      });
      
      handleCloseDialog();
      fetchIntegrations();
    } catch (err) {
      console.error('Error saving Zapier integration:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Failed to save Zapier integration',
        severity: 'error'
      });
    }
  };

  const handleDelete = async () => {
    if (!currentIntegration) return;
    
    try {
      const response = await fetch(`/api/zaps/${currentIntegration.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete Zapier integration');
      }

      setSnackbar({
        open: true,
        message: 'Zapier integration deleted successfully!',
        severity: 'success'
      });
      
      handleCloseDeleteDialog();
      fetchIntegrations();
    } catch (err) {
      console.error('Error deleting Zapier integration:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Failed to delete Zapier integration',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardHeader 
          title="Zapier Integrations" 
          subheader="Connect your AI agent to Zapier workflows"
          action={
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              disabled={loading}
            >
              Add Integration
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : integrations.length === 0 ? (
            <Box textAlign="center" p={3}>
              <Typography variant="body1" color="textSecondary">
                No Zapier integrations found. Click "Add Integration" to create one.
              </Typography>
            </Box>
          ) : (
            <List>
              {integrations.map((integration) => (
                <ListItem key={integration.id} divider>
                  <ListItemText
                    primary={integration.name}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="textPrimary">
                          {integration.description}
                        </Typography>
                        <br />
                        <Typography component="span" variant="caption" color="textSecondary">
                          Webhook: {integration.webhook_url}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Edit">
                      <IconButton edge="end" onClick={() => handleOpenDialog(integration)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton edge="end" onClick={() => handleOpenDeleteDialog(integration)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{currentIntegration ? 'Edit Zapier Integration' : 'Add Zapier Integration'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Integration Name"
                fullWidth
                value={formData.name || ''}
                onChange={handleInputChange}
                helperText="A unique name for this integration (e.g., add_lead_to_crm)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={formData.description || ''}
                onChange={handleInputChange}
                helperText="Describe what this integration does"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="webhook_url"
                label="Webhook URL"
                fullWidth
                value={formData.webhook_url || ''}
                onChange={handleInputChange}
                helperText="The Zapier webhook URL to send data to"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Parameter Schema
              </Typography>
              <Typography variant="caption" color="textSecondary" paragraph>
                Define the parameters that the AI agent can send to this Zapier integration
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <JSONEditor
                  value={formData.parameter_schema || {}}
                  onChange={handleSchemaChange}
                />
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {currentIntegration ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Zapier Integration</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the Zapier integration "{currentIntegration?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ZapierIntegrationManager;