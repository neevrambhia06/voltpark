
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("user"); // default
    const [approvalStatus, setApprovalStatus] = useState("none"); // default

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchGetUserProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchGetUserProfile(session.user.id);
            } else {
                setUserRole("user");
                setApprovalStatus("none");
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchGetUserProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('role, approval_status')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
            } else if (data) {
                console.log("✔ Fetched Profile:", data.role, data.approval_status);
                setUserRole(data.role);
                setApprovalStatus(data.approval_status || 'none');
            } else {
                console.warn("⚠ User profile not found!");
            }
        } catch (err) {
            console.error("Fetch profile error:", err);
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email, password, name) => {
        console.log("Starting signup process for:", email);
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    name: name.trim(),
                },
            },
        });

        if (error) {
            console.error("Supabase Auth Error:", error);
            return { data, error };
        }

        if (data?.user) {
            console.log("Auth user created successfully:", data.user.id);

            const { error: insertError } = await supabase.from('users').insert([{
                id: data.user.id,
                email: email.trim(),
                name: name.trim(),
                role: 'user',
                approval_status: 'none',
                created_at: new Date().toISOString()
            }]);

            if (insertError) {
                console.error("Insert into users table failure:", insertError);
                return { data, error: { message: "Account created but profile not saved." } };
            }
        }
        return { data, error };
    };

    // New Owner Signup
    const signUpOwner = async (email, password, name, company, city) => {
        console.log("Starting OWNER signup process for:", email);
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    name: name.trim(),
                    role: 'owner'
                },
            },
        });

        if (error) {
            console.error("Supabase Auth Error:", error);
            return { data, error };
        }

        if (data?.user) {
            console.log("Auth (Owner) user created successfully:", data.user.id);

            // 1. Insert into users table as 'owner' with 'pending' status
            const { error: userError } = await supabase.from('users').insert([{
                id: data.user.id,
                email: email.trim(),
                name: name.trim(),
                role: 'owner',
                approval_status: 'pending', // Set to Pending
                created_at: new Date().toISOString()
            }]);

            if (userError) {
                console.error("Insert into users table failure:", userError);
                return { data, error: { message: "Failed to create user profile." } };
            }

            // 2. Insert into owner_profiles table
            const { error: profileError } = await supabase.from('owner_profiles').insert([{
                id: data.user.id,
                company_name: company.trim(),
                city: city.trim(),
                created_at: new Date().toISOString()
            }]);

            if (profileError) {
                console.error("Insert into owner_profiles failure:", profileError);
                // Non-critical (?) but should be reported. User is created though.
                return { data, error: { message: "Account created but owner profile details failed. Please contact support." } };
            }

            console.log("Owner registration complete.");
        }
        return { data, error };
    };

    const login = (email, password) => {
        return supabase.auth.signInWithPassword({ email: email.trim(), password });
    };

    const logout = () => {
        return supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, userRole, approvalStatus, signUp, signUpOwner, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
