import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Eye, EyeOff, Lock, Mail, Shield, User, Briefcase, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const roles: { value: UserRole; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'admin', label: 'Administrator', icon: Shield, description: 'Full system access' },
  { value: 'manager', label: 'Manager', icon: Briefcase, description: 'Approve & manage operations' },
  { value: 'clerk', label: 'Clerk', icon: User, description: 'Process sales & inventory' },
  { value: 'sales_rep', label: 'Sales Rep', icon: Truck, description: 'Field sales & orders' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('clerk');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password, selectedRole);
      if (success) {
        toast.success('Welcome back!', {
          description: `Logged in as ${selectedRole.replace('_', ' ')}`,
        });
        navigate('/dashboard');
      } else {
        toast.error('Login failed', {
          description: 'Please check your credentials',
        });
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sidebar flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-glow">
              <span className="text-primary-foreground font-bold text-2xl">H</span>
            </div>
            <div>
              <h1 className="text-sidebar-foreground text-2xl font-bold">HDP(K) LTD</h1>
              <p className="text-sidebar-muted text-sm">Manufacturing & Distribution</p>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight">
            Enterprise Resource
            <br />
            <span className="text-primary">Planning System</span>
          </h2>
          <p className="text-sidebar-muted text-lg max-w-md">
            Streamline your manufacturing, distribution, and sales operations with our comprehensive ERP solution.
          </p>
          <div className="flex gap-6 text-sidebar-muted text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Real-time Inventory</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Multi-channel Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span>Production Tracking</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sidebar-muted text-sm">
          © 2024 HDP(K) LTD. All rights reserved.
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-2xl" />
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Sign in to access your dashboard</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Select your role</label>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200",
                      selectedRole === role.value
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/30 hover:bg-muted/50"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 mb-2",
                      selectedRole === role.value ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "font-medium text-sm",
                      selectedRole === role.value ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {role.label}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {role.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hdpk.co.ke"
                  className="input-field pl-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-input text-primary focus:ring-primary" />
                <span className="text-sm text-muted-foreground">Remember this device</span>
              </label>
              <button type="button" className="text-sm text-primary hover:underline">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Device ID: <span className="font-mono text-foreground">DEV-{Math.random().toString(36).substr(2, 8).toUpperCase()}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
