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
        <div className="min-h-screen bg-gray-50 py-16 px-8 presentation-container">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-6xl font-extrabold text-gray-900 mb-12">My Profile</h1>

                <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
                    <div className="bg-gradient-to-r from-primary to-secondary h-48"></div>
                    <div className="px-12 pb-12 relative">
                        <div className="absolute -top-20 left-12">
                            <div className="h-40 w-40 rounded-full bg-white p-2 shadow-xl">
                                <div className="h-full w-full rounded-full bg-primary flex items-center justify-center text-6xl text-white font-bold">
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 ml-48 pl-8 flex justify-between items-start">
                            <div>
                                <h2 className="text-5xl font-bold text-gray-900 mb-2">{name}</h2>
                                <p className="text-2xl text-gray-500">Member since {new Date(user.created_at).getFullYear()}</p>
                            </div>
                            <div className="bg-gray-100 px-6 py-3 rounded-2xl">
                                <p className="text-lg font-bold text-gray-500 uppercase tracking-widest mb-1">Role</p>
                                <p className="text-3xl font-bold text-primary capitalize">{userRole}</p>
                            </div>
                        </div>

                        <div className="mt-16 grid gap-10">
                            {/* Feedback Messages */}
                            {message && (
                                <div className="bg-green-50 border-l-8 border-green-500 p-6 rounded-r-xl">
                                    <p className="text-green-800 text-xl font-bold">{message}</p>
                                </div>
                            )}
                            {error && (
                                <div className="bg-red-50 border-l-8 border-red-500 p-6 rounded-r-xl">
                                    <p className="text-red-800 text-xl font-bold">{error}</p>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex space-x-4 border-b-2 border-gray-100 mb-4">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`pb-4 px-4 text-2xl font-bold transition-colors ${activeTab === 'details' ? 'text-primary border-b-4 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Personal Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('email')}
                                    className={`pb-4 px-4 text-2xl font-bold transition-colors ${activeTab === 'email' ? 'text-primary border-b-4 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Update Email
                                </button>
                                <button
                                    onClick={() => setActiveTab('password')}
                                    className={`pb-4 px-4 text-2xl font-bold transition-colors ${activeTab === 'password' ? 'text-primary border-b-4 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Change Password
                                </button>
                            </div>

                            {/* Forms */}
                            <div className="bg-gray-50 rounded-3xl p-10">
                                {activeTab === 'details' && (
                                    <form onSubmit={handleUpdateName} className="space-y-8">
                                        <h3 className="text-3xl font-bold text-gray-900 border-b pb-4">Personal Information</h3>
                                        <div>
                                            <label>Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full"
                                            />
                                        </div>
                                        <button disabled={loading} className="btn-primary w-full py-5">
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </form>
                                )}

                                {activeTab === 'email' && (
                                    <form onSubmit={handleUpdateEmail} className="space-y-8">
                                        <h3 className="text-3xl font-bold text-gray-900 border-b pb-4">Update Email Address</h3>
                                        <div>
                                            <label>New Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full"
                                                placeholder="Enter new email"
                                            />
                                        </div>
                                        <div>
                                            <label>Confirm New Email</label>
                                            <input
                                                type="email"
                                                required
                                                value={confirmEmail}
                                                onChange={(e) => setConfirmEmail(e.target.value)}
                                                className="w-full"
                                                placeholder="Confirm new email"
                                            />
                                        </div>
                                        <button disabled={loading} className="btn-secondary w-full py-5">
                                            {loading ? 'Updating...' : 'Update Email'}
                                        </button>
                                    </form>
                                )}

                                {activeTab === 'password' && (
                                    <form onSubmit={handleUpdatePassword} className="space-y-8">
                                        <h3 className="text-3xl font-bold text-gray-900 border-b pb-4">Change Password</h3>
                                        <div>
                                            <label>New Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label>Confirm New Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <button disabled={loading} className="btn-primary w-full py-5 bg-gray-900 hover:bg-black">
                                            {loading ? 'Updating...' : 'Set New Password'}
                                        </button>
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
