import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, MapPin, Calendar, Shield, ArrowRight, Eye, Briefcase, Building2, X, Trash2, UserMinus, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

import { useNavigate } from 'react-router-dom';

const AdminPortal = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalOwners: 0, totalLocations: 0, totalBookings: 0 });
    const [owners, setOwners] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]); // Pending approvals
    const [locations, setLocations] = useState([]);
    const [recentBookings, setRecentBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    // Modal State
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [viewType, setViewType] = useState(null); // 'properties' or 'bookings'
    const [modalData, setModalData] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            // Stats checks
            const { count: ownerCount } = await supabase.from('users').select('*', { count: 'exact' }).eq('role', 'owner');
            const { count: locationCount } = await supabase.from('locations').select('*', { count: 'exact' });
            const { count: bookingCount } = await supabase.from('bookings').select('*', { count: 'exact' });

            // Fetch Pending Approvals
            const { data: pendings } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'owner')
                .eq('approval_status', 'pending');

            // Fetch recent bookings (Limit 10)
            const { data: recentBks, error: recentError } = await supabase
                .from('bookings')
                .select('*, locations(name), users(name, email)')
                .order('created_at', { ascending: false })
                .limit(10);

            if (recentError) console.error("Error fetching recent bookings:", recentError);

            // Fetch recent locations (Limit 10)
            const { data: recentLocs } = await supabase
                .from('locations')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            // Fetch Owners (Approved users)
            const { data: ownersData } = await supabase
                .from('users')
                .select(`id, name, email, created_at, role, approval_status`)
                .eq('role', 'owner')
                .neq('approval_status', 'pending') // Only show processed or approved owners in main list
                .order('created_at', { ascending: false });

            // Enrich with counts 
            const enrichedOwners = await Promise.all(ownersData.map(async (owner) => {
                const { count: props } = await supabase.from('locations').select('id', { count: 'exact' }).eq('owner_id', owner.id);
                // For bookings, we need locations owned by this user
                // Complex query, simplified approximation: fetch bookings where location.owner_id = owner.id
                // Supabase doesn't support deep count in one go easily without foreign keys setup perfectly for it
                // We'll fetching properties first then bookings is okay for small scale
                const { data: ownerLocs } = await supabase.from('locations').select('id').eq('owner_id', owner.id);
                const locIds = ownerLocs.map(l => l.id);
                let bookingCount = 0;
                if (locIds.length > 0) {
                    const { count } = await supabase.from('bookings').select('id', { count: 'exact' }).in('location_id', locIds);
                    bookingCount = count;
                }
                return { ...owner, propertiesCount: props, bookingsCount: bookingCount };
            }));

            setStats({
                totalOwners: ownerCount || 0,
                totalLocations: locationCount || 0,
                totalBookings: bookingCount || 0
            });
            setOwners(enrichedOwners);
            setPendingRequests(pendings || []);
            setRecentBookings(recentBks || []);
            setLocations(recentLocs || []);

            setLocations(recentLocs || []);

        } catch (e) {
            console.error(e);
            setErrorMsg(e.message || "Failed to fetch data");
        }
        finally { setLoading(false); }
    };

    useEffect(() => {
        // Subscribe to changes in users (owners), locations, and bookings to keep stats fresh
        const channel = supabase
            .channel('admin-dashboard-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchAdminData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => fetchAdminData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchAdminData())
            .subscribe();

        // Fallback polling
        const interval = setInterval(fetchAdminData, 15000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    const handleViewDetails = async (owner, type) => {
        setSelectedOwner(owner);
        setViewType(type);
        setModalLoading(true);
        try {
            if (type === 'properties') {
                const { data } = await supabase.from('locations').select('*').eq('owner_id', owner.id);
                setModalData(data || []);
            } else if (type === 'bookings') {
                const { data: ownerLocs } = await supabase.from('locations').select('id').eq('owner_id', owner.id);
                const locIds = ownerLocs.map(l => l.id);
                if (locIds.length > 0) {
                    const { data } = await supabase
                        .from('bookings')
                        .select('*, locations(name), users(name, email)')
                        .in('location_id', locIds)
                        .order('created_at', { ascending: false });
                    setModalData(data || []);
                } else {
                    setModalData([]);
                }
            }
        } catch (e) { console.error(e); }
        finally { setModalLoading(false); }
    };

    const closeModal = () => {
        setSelectedOwner(null);
        setViewType(null);
        setModalData([]);
    };

    const handleApproveOwner = async (userId) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    approval_status: 'approved',
                    role: 'owner' // Ensure role is owner
                })
                .eq('id', userId);

            if (error) throw error;
            fetchAdminData();
        } catch (error) {
            console.error('Error approving owner:', error);
            alert('Failed to approve owner');
        }
    };

    const handleRejectOwner = async (userId) => {
        if (!confirm('Are you sure you want to reject this owner request?')) return;
        try {
            const { error } = await supabase
                .from('users')
                .update({ approval_status: 'rejected' })
                .eq('id', userId);

            if (error) throw error;
            fetchAdminData();
        } catch (error) {
            console.error('Error rejecting owner:', error);
            alert('Failed to reject owner');
        }
    };

    // Admin Actions
    const handleDeleteOwner = async (id) => {
        if (!confirm("Are you sure you want to delete this owner? This will remove all their properties and bookings.")) return;
        try {
            // 1. Get all location IDs for this owner
            const { data: locs, error: locFetchError } = await supabase
                .from('locations')
                .select('id')
                .eq('owner_id', id);

            if (locFetchError) throw locFetchError;

            const locationIds = locs.map(l => l.id);

            if (locationIds.length > 0) {
                // 2. Delete bookings for these locations
                const { error: bookingDeleteError } = await supabase
                    .from('bookings')
                    .delete()
                    .in('location_id', locationIds);

                if (bookingDeleteError) throw bookingDeleteError;

                // 3. Delete the locations
                const { error: locDeleteError } = await supabase
                    .from('locations')
                    .delete()
                    .eq('owner_id', id);

                if (locDeleteError) throw locDeleteError;
            }

            // 4. Delete owner_profiles if exists
            const { error: profileDeleteError } = await supabase
                .from('owner_profiles')
                .delete()
                .eq('id', id);

            if (profileDeleteError) {
                throw new Error("Could not delete associated Owner Profile. Permission denied or error: " + profileDeleteError.message);
            }

            // 4. Finally delete the user
            const { error } = await supabase.from('users').delete().eq('id', id);
            if (error) throw error;

            fetchAdminData();
        } catch (e) { console.error(e); alert("Error deleting owner: " + e.message); }
    };

    const handleDemoteOwner = async (id) => {
        if (!confirm("Demote this owner to a regular User? They will lose access to the Owner Portal.")) return;
        try {
            const { error } = await supabase.from('users').update({ role: 'user' }).eq('id', id);
            if (error) throw error;
            fetchAdminData();
        } catch (e) { console.error(e); alert("Error demoting owner: " + e.message); }
    };

    const handleDeleteLocation = async (id) => {
        if (!confirm("Are you sure you want to delete this property?")) return;
        try {
            const { error } = await supabase.from('locations').delete().eq('id', id);
            if (error) throw error;
            // Update modal data locally to reflect change immediately
            setModalData(prev => prev.filter(item => item.id !== id));
            // Also refresh main stats
            fetchAdminData();
        } catch (e) { console.error(e); alert("Error deleting property: " + e.message); }
    };

    if (loading) return <div className="p-20 text-center text-2xl">Loading Admin System...</div>;

    return (
        <div className="min-h-screen bg-gray-100 pb-10">
            {/* Admin Header */}
            <div className="bg-slate-900 text-white py-8 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-extrabold mb-1 text-white">Admin Portal</h1>
                            <p className="text-xs text-gray-400">Owner Management Hub</p>
                        </div>
                    </div>

                    {/* Stat Cards - Interactive */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {/* Owners Card */}
                        <div
                            onClick={() => document.getElementById('latest-bookings')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Users size={18} />
                                </div>
                                <span className="px-2 py-0.5 bg-gray-50 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-wide">Users</span>
                            </div>
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-0.5">{stats.totalOwners}</h3>
                            <p className="text-gray-500 font-bold text-xs">Total Users/Owners</p>
                        </div>

                        {/* Properties Card */}
                        <div
                            onClick={() => window.location.href = '#properties-section'} // Simple anchor or ref needed
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-teal-50 rounded-lg text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                    <MapPin size={18} />
                                </div>
                                <span className="px-2 py-0.5 bg-gray-50 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-wide">Locations</span>
                            </div>
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-0.5">{stats.totalLocations}</h3>
                            <p className="text-gray-500 font-bold text-xs">Total Properties</p>
                        </div>

                        {/* Bookings Card */}
                        <div
                            onClick={() => document.getElementById('latest-bookings')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <Calendar size={18} />
                                </div>
                                <span className="px-2 py-0.5 bg-gray-50 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-wide">Activity</span>
                            </div>
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-0.5">{stats.totalBookings}</h3>
                            <p className="text-gray-500 font-bold text-xs">Total Bookings</p>
                        </div>
                    </div>

                    {/* Summaries Section */}
                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 p-2 rounded-lg mb-4 border border-red-200 text-xs">
                            <strong>Debug Error:</strong> {errorMsg}
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4" id="latest-bookings">
                        {/* Latest Bookings */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-gray-900">Latest Bookings</h3>
                                <button onClick={() => navigate('/admin/bookings')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <th className="pb-2">Booking</th>
                                            <th className="pb-2">User</th>
                                            <th className="pb-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="space-y-2">
                                        {recentBookings.slice(0, 5).map(booking => (
                                            <tr key={booking.id} className="border-t border-gray-50 text-[10px]">
                                                <td className="py-2">
                                                    <div className="font-bold text-gray-900">{booking.locations?.name || 'Unknown'}</div>
                                                    <div className="text-[9px] text-gray-500">#{booking.id.slice(0, 6)} • {new Date(booking.created_at).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="py-2">
                                                    <div className="text-[10px] font-medium text-gray-800">{booking.users?.name || 'User'}</div>
                                                </td>
                                                <td className="py-2">
                                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${booking.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                        booking.status === 'Started' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {booking.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {recentBookings.length === 0 && (
                                            <tr><td colSpan="3" className="py-2 text-center text-gray-400 text-xs">No recent bookings</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Latest Properties */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4" id="properties-section">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-gray-900">Newest Properties</h3>
                                <button onClick={() => navigate('/admin/properties')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <th className="pb-2">Property</th>
                                            <th className="pb-2">City</th>
                                            <th className="pb-2">Slots</th>
                                        </tr>
                                    </thead>
                                    <tbody className="space-y-2">
                                        {locations.slice(0, 5).map(loc => (
                                            <tr key={loc.id} className="border-t border-gray-50 text-xs">
                                                <td className="py-2">
                                                    <div className="font-bold text-gray-900 text-[10px]">{loc.name}</div>
                                                    <div className="text-[9px] text-gray-500 uppercase">{loc.type}</div>
                                                </td>
                                                <td className="py-2">
                                                    <div className="text-[10px] text-gray-600">{loc.city}</div>
                                                </td>
                                                <td className="py-2">
                                                    <span className="font-bold text-gray-900 text-[10px]">{loc.available_slots}/{loc.total_slots}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {locations.length === 0 && (
                                            <tr><td colSpan="3" className="py-2 text-center text-gray-400 text-xs">No properties</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                {/* Pending Approval Section */}
                {pendingRequests.length > 0 && (
                    <section className="animate-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2 mb-3">
                            <h2 className="text-lg font-bold text-gray-900">Approvals Needed</h2>
                            <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                                {pendingRequests.length} New
                            </span>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-orange-100">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-orange-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-600 uppercase">Candidate</th>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-600 uppercase">Requested</th>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-600 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {pendingRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-orange-50/30 transition-colors">
                                            <td className="px-4 py-2">
                                                <div className="flex items-center">
                                                    <div className="bg-orange-100 p-1.5 rounded-md mr-3 text-orange-600">
                                                        <ShieldCheck size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900">{req.name || 'Unknown'}</p>
                                                        <p className="text-[10px] text-gray-500">{req.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 font-medium text-gray-600 text-[10px]">
                                                {format(new Date(req.created_at), 'PPP')}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleApproveOwner(req.id)}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md font-bold transition-all shadow-sm hover:shadow-green-200 text-[10px]"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectOwner(req.id)}
                                                        className="bg-white border border-red-100 text-red-600 hover:bg-red-50 px-3 py-1 rounded-md font-bold transition-colors text-[10px]"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Owner Management */}
                <section>
                    <h2 className="text-lg font-bold text-gray-900 mb-3">Owner Management</h2>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                        {owners.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-xs">No Owner accounts found.</div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Owner Identity</th>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Stats</th>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Joined</th>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {owners.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                                <p className="text-xs font-bold text-gray-900">{u.name || 'No Name'}</p>
                                                <p className="text-[10px] text-gray-500">{u.email}</p>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex space-x-2">
                                                    <span className="flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                        <Building2 size={10} className="mr-1" /> {u.propertiesCount} Props
                                                    </span>
                                                    <span className="flex items-center bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                        <Briefcase size={10} className="mr-1" /> {u.bookingsCount} Bkgs
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-gray-600 text-[10px]">
                                                {format(new Date(u.created_at), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleViewDetails(u, 'properties')}
                                                        className="text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors border border-blue-200 text-xs"
                                                        title="View Properties"
                                                    >
                                                        <Building2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewDetails(u, 'bookings')}
                                                        className="text-purple-600 hover:text-purple-800 font-bold bg-purple-50 hover:bg-purple-100 p-1.5 rounded-md transition-colors border border-purple-200 text-xs"
                                                        title="View Bookings"
                                                    >
                                                        <Briefcase size={12} />
                                                    </button>
                                                    <div className="w-px bg-gray-200 mx-1"></div>
                                                    <button
                                                        onClick={() => handleDemoteOwner(u.id)}
                                                        className="text-orange-600 hover:text-orange-800 font-bold bg-orange-50 hover:bg-orange-100 p-1.5 rounded-md transition-colors border border-orange-200 text-xs"
                                                        title="Demote to User"
                                                    >
                                                        <UserMinus size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteOwner(u.id)}
                                                        className="text-red-600 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors border border-red-200 text-xs"
                                                        title="Delete Owner"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </div>

            {/* Modal */}
            {selectedOwner && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-xl shadow-2xl max-w-3xl w-full p-6 relative animate-in fade-in zoom-in duration-300 max-h-[80vh] overflow-y-auto">
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors">
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-extrabold mb-1 text-gray-900">
                            {viewType === 'properties' ? `Properties for ${selectedOwner.name}` : `Bookings for ${selectedOwner.name}`}
                        </h2>
                        <p className="text-gray-500 mb-6 text-xs">{selectedOwner.email}</p>

                        {modalLoading ? (
                            <div className="py-10 text-center text-sm text-gray-400 animate-pulse">Loading data...</div>
                        ) : (
                            <div className="overflow-hidden rounded-lg border border-gray-100 table-container">
                                {viewType === 'properties' && (
                                    modalData.length === 0 ? <p className="p-6 text-center text-gray-500 text-xs">No properties found.</p> :
                                        <table className="min-w-full divide-y divide-gray-100">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500">Name</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500">Type</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500">City</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500">Slots</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500">Price</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {modalData.map(loc => (
                                                    <tr key={loc.id}>
                                                        <td className="px-4 py-2 font-bold text-gray-900 text-xs">{loc.name}</td>
                                                        <td className="px-4 py-2 uppercase text-[10px] font-bold tracking-wider">{loc.type}</td>
                                                        <td className="px-4 py-2 text-gray-600 text-xs">{loc.city}</td>
                                                        <td className="px-4 py-2 text-gray-600 text-xs">{loc.slots} / {loc.total_slots}</td>
                                                        <td className="px-4 py-2 font-bold text-green-600 text-xs">${loc.price_per_hour}/hr</td>
                                                        <td className="px-4 py-2">
                                                            <button
                                                                onClick={() => handleDeleteLocation(loc.id)}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                                                                title="Delete Property"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                )}

                                {viewType === 'bookings' && (
                                    modalData.length === 0 ? <p className="p-6 text-center text-gray-500 text-xs">No bookings found for this owner's properties.</p> :
                                        <table className="min-w-full divide-y divide-gray-100">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500">ID</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500">Customer</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500">Location</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500">Status</th>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {modalData.map(bk => (
                                                    <tr key={bk.id}>
                                                        <td className="px-4 py-2 font-mono text-[10px] text-gray-400">#{bk.id.slice(0, 6)}</td>
                                                        <td className="px-4 py-2 font-bold text-gray-900 text-xs">
                                                            {bk.users?.name || 'User'}
                                                            <div className="text-[10px] text-gray-400 font-normal">{bk.users?.email}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-xs">{bk.locations?.name}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bk.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                                bk.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                {bk.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 font-bold text-gray-900 text-xs">${bk.amount || 0}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                )}
                            </div>
                        )}

                        <div className="mt-6 text-right">
                            <button onClick={closeModal} className="btn-secondary py-1.5 px-4 text-xs">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPortal;
