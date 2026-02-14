import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signUp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const { data, error } = await login(email.trim(), password);
                if (error) throw error;

                // Fetch user role for verification
                if (data?.user) {
                    try {
                        const { data: userData, error: userError } = await supabase
                            .from('users')
                            .select('role')
                            .eq('id', data.user.id)
                            .single();

                        if (userData) {
                            if (userData.role === 'user') {
                                navigate('/user-dashboard');
                            } else {
                                // Incorrect Role
                                await supabase.auth.signOut();
                                if (userData.role === 'owner') {
                                    setError("This email is registered as an Owner. Please use the Owner Login.");
                                } else if (userData.role === 'admin') {
                                    setError("Please use the Admin Login.");
                                } else {
                                    setError("Access Restricted: Invalid User Role.");
                                }
                            }
                        } else {
                            // Fallback if user record missing (rare, but treat as user or error?)
                            // To be strict:
                            navigate('/user-dashboard');
                        }
                    } catch (fetchErr) {
                        console.error("Role fetch error:", fetchErr);
                        await supabase.auth.signOut();
                        setError("Failed to verify account role.");
                    }
                } else {
                    navigate('/');
                }
            } else {
                const { error } = await signUp(email.trim(), password, name.trim());
                if (error) throw error;
                // After signup, redirect to user dashboard as they are 'user' by default
                navigate('/user-dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop"
                    alt="City Night"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
            </div>

            <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-xl p-10 rounded-3xl shadow-2xl transform transition-all hover:scale-[1.01] duration-500 relative z-10 border border-white/20">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="flex items-center group">
                            <span className="text-4xl font-extrabold text-slate-900">VOLT</span>
                            <span className="text-4xl font-extrabold text-secondary">park</span>
                        </div>
                    </div>
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-2 font-ferron tracking-wide">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-lg text-gray-600">
                        {isLogin ? 'Sign in to access your dashboard' : 'Join the smart parking revolution'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-fade-in-down">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 font-bold">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-5">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="block w-full px-5 py-4 text-lg border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="block w-full px-5 py-4 text-lg border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Password</label>
                            <input
                                type="password"
                                required
                                className="block w-full px-5 py-4 text-lg border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-gray-50/50 hover:bg-white"
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
                            className={`w-full flex justify-center py-4 px-6 border border-transparent text-xl font-bold rounded-xl text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-slate-800'} focus:outline-none focus:ring-4 focus:ring-secondary/30 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5`}
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying...
                                </span>
                            ) : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>
                    </div>
                </form>

                <div className="text-center pt-2">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-base font-bold text-secondary hover:text-teal-700 transition-colors hover:underline"
                    >
                        {isLogin ? "New to VOLTpark? Create an account" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
