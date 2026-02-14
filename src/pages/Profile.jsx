import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Shield, Lock, Save } from 'lucide-react';

const Profile = () => {
    const { user, userRole } = useAuth();

    // UI State
    const [activeTab, setActiveTab] = useState('details'); // details, email, password
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState(user?.user_metadata?.name || '');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Fallback if user is null (should be protected)
    if (!user) return <div className="p-20 text-center text-4xl font-bold animate-pulse">Loading Profile...</div>;

    const handleUpdateName = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(''); setMessage('');
        try {
            // 1. Update Auth Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { name: name }
            });
            if (authError) throw authError;

            // 2. Update Database
            const { error: dbError } = await supabase
                .from('users')
                .update({ name: name })
                .eq('id', user.id);
            if (dbError) throw dbError;

            setMessage('Name updated successfully!');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateEmail = async (e) => {
        e.preventDefault();
        if (email !== confirmEmail) {
            setError("Emails do not match");
            return;
        }
        setLoading(true);
        setError(''); setMessage('');
        try {
            console.log("Starting email update for user:", user.id);
            // 1. Update Supabase Auth FIRST
            const { data, error: authError } = await supabase.auth.updateUser({ email: email });

            if (authError) {
                console.error("Auth update failed:", authError);
                throw authError;
            }

            console.log("Auth email update initiated. Check your new email for confirmation link if enabled.");

            // 2. Update Users Table (Only if Auth update succeeds)
            // Note: If email confirmation is enabled, the new email isn't active in Auth yet until confirmed.
            // But we can update the DB record to reflect the *intended* email or wait.
            // For this implementation, we'll update the DB to keep sync, assuming immediate change or specific Supabase settings.

            const { error: dbError } = await supabase
                .from('users')
                .update({ email: email })
                .eq('id', user.id);

            if (dbError) {
                console.error("DB update failed:", dbError);
                throw dbError;
            }

            setMessage('Email updated successfully! If email confirmation is enabled, please check your inbox.');
            setEmail(''); setConfirmEmail('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        setError(''); setMessage('');
        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            setMessage('Password changed successfully!');
            setPassword(''); setConfirmPassword('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 presentation-container">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-extrabold text-gray-900 mb-6">My Profile</h1>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="bg-gradient-to-r from-primary to-secondary h-24"></div>
                    <div className="px-6 pb-6 relative">
                        <div className="absolute -top-10 left-6">
                            <div className="h-20 w-20 rounded-full bg-white p-1 shadow-md">
                                <div className="h-full w-full rounded-full bg-primary flex items-center justify-center text-2xl text-white font-bold">
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 ml-24 pl-4 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-0.5">{name}</h2>
                                <p className="text-xs text-gray-500">Member since {new Date(user.created_at).getFullYear()}</p>
                            </div>
                            <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Role</p>
                                <p className="text-sm font-bold text-primary capitalize leading-none">{userRole}</p>
                            </div>
                        </div>

                        <div className="mt-8 grid gap-6">
                            {/* Feedback Messages */}
                            {message && (
                                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-md">
                                    <p className="text-green-800 text-sm font-bold">{message}</p>
                                </div>
                            )}
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md">
                                    <p className="text-red-800 text-sm font-bold">{error}</p>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex space-x-6 border-b border-gray-100 mb-2">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`pb-2 px-1 text-sm font-bold transition-colors ${activeTab === 'details' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Personal Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('email')}
                                    className={`pb-2 px-1 text-sm font-bold transition-colors ${activeTab === 'email' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Update Email
                                </button>
                                <button
                                    onClick={() => setActiveTab('password')}
                                    className={`pb-2 px-1 text-sm font-bold transition-colors ${activeTab === 'password' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Change Password
                                </button>
                            </div>

                            {/* Forms */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                {activeTab === 'details' && (
                                    <form onSubmit={handleUpdateName} className="space-y-4">
                                        <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">Personal Information</h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <button disabled={loading} className="btn-primary w-full py-2 text-sm">
                                                {loading ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {activeTab === 'email' && (
                                    <form onSubmit={handleUpdateEmail} className="space-y-4">
                                        <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">Update Email Address</h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">New Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                                                placeholder="Enter new email"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Confirm New Email</label>
                                            <input
                                                type="email"
                                                required
                                                value={confirmEmail}
                                                onChange={(e) => setConfirmEmail(e.target.value)}
                                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                                                placeholder="Confirm new email"
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <button disabled={loading} className="btn-secondary w-full py-2 text-sm">
                                                {loading ? 'Updating...' : 'Update Email'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {activeTab === 'password' && (
                                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                                        <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">Change Password</h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">New Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Confirm New Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <button disabled={loading} className="btn-primary w-full py-2 text-sm bg-gray-900 hover:bg-black">
                                                {loading ? 'Updating...' : 'Set New Password'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
