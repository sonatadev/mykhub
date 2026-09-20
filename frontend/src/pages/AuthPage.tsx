import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NotebookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthStore } from '@/lib/store/auth';
import { ApiError } from '@/lib/api';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent, tab: 'login' | 'register') {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === 'login') await login(email, password);
      else await register(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Errore di rete, riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <NotebookText className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">mykhub</h1>
          <p className="text-sm text-muted-foreground">Il tuo spazio di note personale</p>
        </div>

        <Tabs defaultValue={mode} onValueChange={() => setError(null)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" asChild>
              <Link to="/login">Accedi</Link>
            </TabsTrigger>
            <TabsTrigger value="register" asChild>
              <Link to="/register">Registrati</Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form className="flex flex-col gap-4" onSubmit={(e) => submit(e, 'login')}>
              <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
              <Field
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete="current-password"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? 'Accesso in corso…' : 'Accedi'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form className="flex flex-col gap-4" onSubmit={(e) => submit(e, 'register')}>
              <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
              <Field
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete="new-password"
                hint="6–128 caratteri"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? 'Creazione account…' : 'Crea account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete: string;
  hint?: string;
}) {
  const id = `field-${label.toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
