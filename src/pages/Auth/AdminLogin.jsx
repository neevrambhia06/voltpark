import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ShieldCheck } from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Authenticate
            const { data, error } = await login(email.trim(), password);
            if (error) throw error;

            // 2. Check Role
            if (data?.user) {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();

                if (userError) throw userError;

                if (userData?.role === 'admin') {
                    navigate('/admin-portal');
                } else {
                    // Not an admin
                    await supabase.auth.signOut();
                    setError("This account does not have Admin access.");
                }
            }
        } catch (err) {
            console.error(err);
            await supabase.auth.signOut();
            setError(err.message || "Failed to login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
                    alt="Cyber Security"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"></div>
            </div>

            <div className="max-w-xs w-full space-y-4 bg-gray-900/90 backdrop-blur-xl p-6 rounded-xl shadow-2xl transform transition-all hover:scale-[1.01] duration-500 relative z-10 border border-red-900/50">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-red-900/30 flex items-center justify-center rounded-full mb-3 border border-red-700/50">
                        <ShieldCheck className="text-red-500" size={24} />
                    </div>
                    <div className="flex justify-center mb-1">
                        <div className="flex items-center group">
                            <span className="text-xl font-extrabold text-white">VOLT</span>
                            <span className="text-xl font-extrabold text-red-500">park</span>
                        </div>
                    </div>
                    <h2 className="text-lg font-extrabold text-white font-ferron tracking-wide">
                        Admin Access
                    </h2>
                </div>

                {error && (
                    <div className="bg-red-900/30 border-l-2 border-red-600 p-2 rounded-r-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-2">
                                <p className="text-xs text-red-400 font-bold">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-300 mb-0.5 ml-1">Admin Email</label>
                            <input
                                type="email"
                                required
                                className="block w-full px-3 py-2 text-sm border border-gray-700 placeholder-gray-600 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-transparent transition-all bg-gray-800/50 hover:bg-gray-800"
                                placeholder="admin@voltpark.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-300 mb-0.5 ml-1">Security Key</label>
                            <input
                                type="password"
                                required
                                className="block w-full px-3 py-2 text-sm border border-gray-700 placeholder-gray-600 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-transparent transition-all bg-gray-800/50 hover:bg-gray-800"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white ${loading ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500'} focus:outline-none focus:ring-2 focus:ring-red-900/50 transition-all shadow-md shadow-red-900/20`}
                        >
                            {loading ? 'Verifying...' : 'Authenticate'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
