import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Autocomplete,
  CircularProgress,
  Button,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material'
import {
  PersonAdd as PersonAddIcon,
  LockReset as LockResetIcon,
  AutoAwesome as AutoAwesomeIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.tsx'
import type { User } from '@supabase/supabase-js'

export default function Settings() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  // Redirect non-admin users
  if (!isAdmin) {
    navigate('/')
    return null
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Settings
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <AiModelSection user={user!} />
        <AiFormatRulesSection user={user!} />
        <AddUserSection />
        <ResetPasswordSection />
      </Box>
    </Box>
  )
}

function AddUserSection() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        setEmail('')
        setPassword('')
      }
    } catch (err) {
      setError('Failed to create user')
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PersonAddIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Add New User
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleAddUser}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
            size="small"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
            size="small"
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? 'Adding...' : 'Add User'}
          </Button>
        </Box>
      </CardContent>

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          User created successfully! They will receive a confirmation email.
        </Alert>
      </Snackbar>
    </Card>
  )
}

function ResetPasswordSection() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/login`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setEmail('')
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LockResetIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Reset User Password
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleResetPassword}>
          <TextField
            label="User Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
            size="small"
            placeholder="Enter user's email to send reset link"
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </Box>
      </CardContent>

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Password reset email sent successfully!
        </Alert>
      </Snackbar>
    </Card>
  )
}

function AiFormatRulesSection({ user }: { user: User }) {
  const [rules, setRules] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadRules = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_format_rules')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Failed to load AI format rules:', error)
      }
      setRules(data?.ai_format_rules ?? '')
      setLoading(false)
    }
    loadRules()
  }, [user.id])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const { error: err } = await supabase
      .from('profiles')
      .update({ ai_format_rules: rules })
      .eq('id', user.id)

    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AI Format Rules (System Prompt)
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These rules define how the AI generates video descriptions from SRT content.
          Changes take effect immediately on the next generation.
        </Typography>

        <TextField
          label="AI Format Rules"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          fullWidth
          multiline
          minRows={15}
          maxRows={30}
          size="small"
          disabled={loading}
          slotProps={{
            input: {
              sx: { fontFamily: 'monospace', fontSize: 13 },
            },
          }}
        />

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? 'Saving...' : 'Save Rules'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setRules('')}
            disabled={loading}
          >
            Reset to Default
          </Button>
        </Box>
      </CardContent>

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          AI Format Rules saved successfully!
        </Alert>
      </Snackbar>
    </Card>
  )
}

const DEFAULT_MODEL_OPTIONS = [
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]

function AiModelSection({ user }: { user: User }) {
  const [model, setModel] = useState('')
  const [savedModel, setSavedModel] = useState('')
  const [modelOptions, setModelOptions] = useState<string[]>(DEFAULT_MODEL_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_model')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Failed to load AI model:', error)
      }
      const saved = data?.ai_model ?? 'gemini-3.6-flash'
      setModel(saved)
      setSavedModel(saved)
      setLoading(false)
    }
    load()
  }, [user.id])

  // Fetch available models from Google API (non-blocking, best-effort)
  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await fetch('/api/ai-check')
        if (!res.ok) return
        const data = await res.json() as { models?: string[] }
        if (data.models?.length) {
          setModelOptions((prev) => Array.from(new Set([...prev, ...data.models!])).sort())
        }
      } catch {
        // ignore - fall back to static list
      }
    }
    loadModels()
  }, [])

  const handleSave = async () => {
    const trimmed = model.trim()
    if (!trimmed) {
      setError('Model name cannot be empty')
      return
    }
    setSaving(true)
    setError(null)

    const { error: err } = await supabase
      .from('profiles')
      .update({ ai_model: trimmed })
      .eq('id', user.id)

    if (err) {
      setError(err.message)
    } else {
      setSavedModel(trimmed)
      setSuccess(true)
    }
    setSaving(false)
  }

  const handleTest = async () => {
    const trimmed = model.trim()
    if (!trimmed) {
      setTestResult({ ok: false, message: 'Model name is empty' })
      return
    }
    setTesting(true)
    setTestResult(null)
    setError(null)

    try {
      const res = await fetch('/api/ai-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: trimmed }),
      })
      const data = await res.json() as { success?: boolean; reply?: string; error?: string }
      if (data.success) {
        setTestResult({ ok: true, message: `Model "${trimmed}" berfungsi! Reply: ${data.reply || '(tiada)'}` })
      } else {
        setTestResult({ ok: false, message: data.error || 'Test gagal' })
      }
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Test gagal' })
    }
    setTesting(false)
  }

  const hasChanges = model.trim() !== savedModel

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SmartToyIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AI Model (Description Generator)
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pilih model AI dari senarai atau taip nama custom model sendiri.
          Model ini digunakan untuk menjana description video dari SRT content.
        </Typography>

        <Autocomplete
          freeSolo
          options={modelOptions}
          value={model}
          onChange={(_, newValue) => setModel(newValue || '')}
          onInputChange={(_, newInput) => setModel(newInput)}
          disabled={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="AI Model"
              placeholder="cth: gemini-2.5-flash"
              size="small"
              fullWidth
            />
          )}
        />

        <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || loading || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save Model'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleTest}
            disabled={testing || loading}
            startIcon={testing ? <CircularProgress size={16} /> : undefined}
          >
            {testing ? 'Testing...' : 'Test API & Model'}
          </Button>
        </Box>

        {testResult && (
          <Alert severity={testResult.ok ? 'success' : 'error'} sx={{ mt: 2 }}>
            {testResult.message}
          </Alert>
        )}
      </CardContent>

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          AI Model saved successfully!
        </Alert>
      </Snackbar>
    </Card>
  )
}
