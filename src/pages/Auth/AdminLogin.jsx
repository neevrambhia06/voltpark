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

            <div className="max-w-md w-full space-y-8 bg-gray-900/90 backdrop-blur-xl p-10 rounded-3xl shadow-2xl transform transition-all hover:scale-[1.01] duration-500 relative z-10 border border-red-900/50">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-red-900/30 flex items-center justify-center rounded-full mb-6 border border-red-700/50">
                        <ShieldCheck className="text-red-500" size={32} />
                    </div>
                    <div className="flex justify-center mb-2">
                        <div className="flex items-center group">
                            <span className="text-2xl font-extrabold text-white">VOLT</span>
                            <span className="text-2xl font-extrabold text-red-500">park</span>
                        </div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-white font-ferron tracking-wide">
                        Admin Access
                    </h2>
                    <p className="mt-2 text-gray-400 text-sm uppercase tracking-widest">
                        Restricted Area
                    </p>
                </div>

                {error && (
                    <div className="bg-red-900/30 border-l-4 border-red-600 p-4 rounded-r-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-400 font-bold">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-1 ml-1">Admin Email</label>
                            <input
                                type="email"
                                required
                                className="block w-full px-5 py-4 text-lg border border-gray-700 placeholder-gray-600 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all bg-gray-800/50 hover:bg-gray-800"
                                placeholder="admin@voltpark.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-1 ml-1">Security Key</label>
                            <input
                                type="password"
                                required
                                className="block w-full px-5 py-4 text-lg border border-gray-700 placeholder-gray-600 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all bg-gray-800/50 hover:bg-gray-800"
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
                            className={`w-full flex justify-center py-4 px-6 border border-transparent text-lg font-bold rounded-xl text-white ${loading ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500'} focus:outline-none focus:ring-4 focus:ring-red-900/50 transition-all shadow-lg shadow-red-900/20`}
                        >
                            {loading ? 'Verifying Credentials...' : 'Authenticate'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
