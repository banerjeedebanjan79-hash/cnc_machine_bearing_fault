import * as React from 'react';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { User } from './types';

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);

  const handleLogin = (user: User) => {
    setUser(user);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!user ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
