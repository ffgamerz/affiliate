import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material'
import {
  PersonAdd as PersonAddIcon,
  LockReset as LockResetIcon,
  AutoAwesome as AutoAwesomeIcon,
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