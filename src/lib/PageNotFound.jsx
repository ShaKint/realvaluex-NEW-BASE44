import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function PageNotFound() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl font-black text-white/20 mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-white/40 mb-6">The page you're looking for doesn't exist.</p>
        <Link
          to={user ? '/dashboard' : '/'}
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all"
        >
          {user ? 'Back to Dashboard' : 'Back to Home'}
        </Link>
      </div>
    </div>
  );
}
