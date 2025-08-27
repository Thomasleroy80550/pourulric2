import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from './SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { profile, loading } = useSession();

  React.useEffect(() => {
    if (!loading && profile?.role !== 'admin') {
      toast.error("Accès non autorisé.");
      navigate('/');
    }
  }, [profile, loading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <h1>Admin Panel (Debug Mode)</h1>
        <nav>
          <Link to="/admin">Dashboard</Link> | <Link to="/admin/users">Users</Link>
        </nav>
        <button onClick={handleLogout}>Déconnexion</button>
      </header>
      <main style={{ flex: 1, padding: '1rem' }}>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;