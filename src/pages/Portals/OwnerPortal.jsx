import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { PlusCircle, Edit, Trash2, MapPin, DollarSign, Calendar, TrendingUp, CheckCircle, Clock, Building2, Lock, Shield, X, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import BarcodeModal from '../../components/BarcodeModal';

const OwnerPortal = () => {
    const { user, approvalStatus } = useAuth(); // Get approval status
    const [locations, setLocations] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState({ revenue: 0, occupancy: 0, rating: 0 });
    const [loading, setLoading] = useState(true);

    // UI State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedBarcodeBooking, setSelectedBarcodeBooking] = useState(null);

    // Form State
    const [newLoc, setNewLoc] = useState({
        name: '',
        address: '',
        city: '',
        type: 'parking',
        price: '',
        slots: ''
    });

    const [editingLoc, setEditingLoc] = useState(null);

    const isApproved = approvalStatus === 'approved';
    const authLoading = false; // Assuming handled by useAuth or parent

    useEffect(() => {
        if (user) {
            fetchOwnerData();
        }
    }, [user]);

    const fetchOwnerData = async () => {
        try {
            setLoading(true);
            const { data: locs, error: locError } = await supabase
                .from('locations')
                .select('*')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false });

            if (locError) { console.error(locError); return; }
            setLocations(locs || []);

            if (locs && locs.length > 0) {
                const locationIds = locs.map(l => l.id);
                // Step 3: Fetch bookings where location_id IN (owner_location_ids)
                const { data: bks, error: bkError } = await supabase
                    .from('bookings')
                    .select('*, locations(name), users(full_name, email)') // Corrected select string
                    .in('location_id', locationIds)
                    .order('created_at', { ascending: false });

                if (bkError) throw bkError;

                setBookings(bks || []);
            } else {
                setBookings([]);
            }

        } catch (error) {
            console.error("Error fetching owner data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Derived Stats
    const totalProperties = locations.length;
    // Active = Scheduled or Started
    const activeBookingsCount = bookings.filter(b => ['Scheduled', 'Started'].includes(b.status)).length;

    // Real-time updates for Locations
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('owner-locations')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'locations', filter: `owner_id=eq.${user.id}` },
                () => {
                    fetchOwnerData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Real-time updates for Bookings
    useEffect(() => {
        if (!user) return;

        const bookingsChannel = supabase
            .channel('owner-bookings')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookings' },
                () => {
                    fetchOwnerData();
                }
            )
            .subscribe();

        // Polling interaction fallback
        const interval = setInterval(() => {
            fetchOwnerData();
        }, 15000);

        return () => {
            supabase.removeChannel(bookingsChannel);
            clearInterval(interval);
        };
    }, [user]);

    const handleAddLocation = async (e) => {
        e.preventDefault();

        if (!isApproved) {
            alert("You must be approved by an admin to list properties.");
            return;
        }

        try {
            const { error } = await supabase.from('locations').insert([{
                owner_id: user.id,
                name: newLoc.name,
                address: newLoc.address,
                city: newLoc.city,
                type: newLoc.type,
                price_per_hour: parseFloat(newLoc.price),
                total_slots: parseInt(newLoc.slots),
                available_slots: parseInt(newLoc.slots) // Initially full
            }]);

            if (error) throw error;

            alert('Location added successfully!');
            setIsAddModalOpen(false);
            setNewLoc({ name: '', address: '', city: '', type: 'parking', price: '', slots: '' });
            fetchOwnerData(); // Refresh list

        } catch (error) {
            alert('Error adding location: ' + error.message);
        }
    };

    const handleEditLocation = async (e) => {
        e.preventDefault();
        if (!editingLoc) return;

        try {
            const { error } = await supabase
                .from('locations')
                .update({
                    name: editingLoc.name,
                    address: editingLoc.address,
                    city: editingLoc.city,
                    type: editingLoc.type,
                    price_per_hour: parseFloat(editingLoc.price_per_hour),
                    total_slots: parseInt(editingLoc.total_slots),
                })
                .eq('id', editingLoc.id);

            if (error) throw error;

            alert('Property updated successfully!');
            setIsEditModalOpen(false);
            setEditingLoc(null);
            fetchOwnerData();

        } catch (error) {
            alert('Error updating location: ' + error.message);
        }
    };

    const openEditModal = (loc) => {
        setEditingLoc(loc);
        setIsEditModalOpen(true);
    };

    const handleStatusChange = async (bookingId, newStatus, locationId) => {
        try {
            // Find current booking to get old status
            const booking = bookings.find(b => b.id === bookingId);
            const oldStatus = booking?.status || 'Scheduled';

            if (oldStatus === newStatus) return;

            // 1. Update booking status
            const { error: bookingError } = await supabase
                .from('bookings')
                .update({ status: newStatus })
                .eq('id', bookingId);

            if (bookingError) throw bookingError;

            // 2. Update location slots logic (Robust Recalculation)
            const { count: activeCount, error: countError } = await supabase
                .from('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('location_id', locationId)
                .in('status', ['Scheduled', 'Started']);

            if (!countError) {
                const { data: locationData, error: locFetchError } = await supabase
                    .from('locations')
                    .select('total_slots')
                    .eq('id', locationId)
                    .single();

                if (!locFetchError && locationData) {
                    const newAvailable = Math.max(0, locationData.total_slots - activeCount);

                    const { error: slotUpdateError } = await supabase
                        .from('locations')
                        .update({ available_slots: newAvailable })
                        .eq('id', locationId);

                    if (slotUpdateError) console.error("Failed to update slots:", slotUpdateError);
                }
            }

            // Optimistic update for UI
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));

        } catch (error) {
            console.error("Status update failed:", error);
            alert("Failed to update status");
        }
    };

    const recalculateSlots = async (locationId) => {
        try {
            console.log("Recalculating slots for:", locationId);
            const { count: activeCount, error: countError } = await supabase
                .from('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('location_id', locationId)
                .in('status', ['Scheduled', 'Started']);

            if (countError) throw countError;

            const { data: locationData, error: locFetchError } = await supabase
                .from('locations')
                .select('total_slots')
                .eq('id', locationId)
                .single();

            if (locFetchError) throw locFetchError;

            const newAvailable = Math.max(0, locationData.total_slots - activeCount);

            const { error: slotUpdateError } = await supabase
                .from('locations')
                .update({ available_slots: newAvailable })
                .eq('id', locationId);

            if (slotUpdateError) throw slotUpdateError;

            console.log("Slots synced. Active: " + activeCount + ". Available: " + newAvailable);
            fetchOwnerData();
        } catch (e) {
            console.error("Sync failed:", e);
        }
    };

    // Stats
    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    if (authLoading || loading) return <div className="p-20 text-center text-4xl font-bold animate-pulse">Loading Portal...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Owner Header */}
            <div className="bg-primary text-white py-20 px-8 shadow-2xl">
                <div className="presentation-container flex justify-between items-center">
                    <div>
                        <h1 className="text-7xl font-extrabold mb-4 tracking-tight">Owner Portal</h1>
                        <p className="text-3xl opacity-90 font-light">Manage your properties and bookings</p>
                    </div>
                    <div className="flex space-x-12 text-center bg-white/10 p-8 rounded-3xl backdrop-blur-sm border border-white/10">
                        <div>
                            <p className="text-6xl font-extrabold">{locations.length}</p>
                            <p className="opacity-80 text-xl uppercase tracking-wider font-bold mt-2">Properties</p>
                        </div>
                        <div className="w-px bg-white/20 mx-4"></div>
                        <div>
                            <p className="text-6xl font-extrabold">{bookings.length}</p>
                            <p className="opacity-80 text-xl uppercase tracking-wider font-bold mt-2">Bookings</p>
                        </div>
                        <div className="w-px bg-white/20 mx-4"></div>
                        <div>
                            <p className="text-6xl font-extrabold text-secondary">${totalRevenue}</p>
                            <p className="opacity-80 text-xl uppercase tracking-wider font-bold mt-2">Earnings</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="presentation-container py-16 space-y-20">

                {/* Section A: My Locations */}
                <section>
                    <div className="flex justify-between items-center mb-12">
                        <h2 className="text-5xl font-extrabold text-gray-900">My Locations</h2>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="btn-secondary"
                        >
                            <PlusCircle className="mr-3" size={28} /> Add New Property
                        </button>
                    </div>

                    {locations.length === 0 ? (
                        <div className="bg-white p-20 rounded-[3rem] text-center shadow-sm border border-dashed border-gray-300">
                            <Building2 className="mx-auto text-gray-300 mb-6" size={80} />
                            <p className="text-4xl text-gray-400 font-bold mb-4">You have no properties listed.</p>
                            <p className="text-2xl text-gray-400">Add your first parking spot to start earning.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {locations.map(loc => (
                                <div key={loc.id} className="card group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditModal(loc); }}
                                            className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-white text-primary"
                                        >
                                            <Edit size={24} />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="text-3xl font-bold text-gray-900 line-clamp-1">{loc.name}</h3>
                                        <span className={`px-5 py-2 rounded-full text-lg font-bold uppercase tracking-wide ${loc.type === 'ev' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {loc.type}
                                        </span>
                                    </div>
                                    <p className="text-2xl text-gray-500 mb-8 flex items-center">
                                        <MapPin size={24} className="mr-3 text-gray-400" /> {loc.address}, {loc.city}
                                    </p>
                                    <div className="flex justify-between items-center text-xl font-medium border-t border-gray-100 pt-8 mt-auto">
                                        <span className="text-gray-600 bg-gray-100 px-4 py-2 rounded-xl">Slots: <span className="text-gray-900 font-bold">{loc.available_slots}/{loc.total_slots}</span></span>
                                        <span className="text-primary font-extrabold text-4xl">${loc.price_per_hour}<span className="text-lg text-gray-400 font-medium">/hr</span></span>
                                    </div>

                                    <div className="flex gap-4 mt-8">
                                        <button
                                            onClick={() => openEditModal(loc)}
                                            className="flex-1 py-4 bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center"
                                        >
                                            <Edit size={20} className="mr-2" /> Edit
                                        </button>
                                        <button
                                            onClick={() => recalculateSlots(loc.id)}
                                            className="flex-1 py-4 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center"
                                            title="Force Sync Slot Count"
                                        >
                                            <CheckCircle size={20} className="mr-2" /> Sync
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Dashboard Statistics */}
                <div className="relative">
                    {/* Approval Status Banner */}
                    {!isApproved && (
                        <div className="absolute top-0 left-0 right-0 -mt-6 bg-yellow-400 text-yellow-900 px-6 py-4 rounded-t-3xl font-bold flex items-center justify-center z-20 shadow-sm animate-pulse">
                            <Shield className="mr-3" size={24} />
                            <span>Approval Pending – You cannot add properties yet. Please wait for admin verification.</span>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-secondary transform -skew-y-2 origin-top-left translate-y-20 h-64 -z-10 opacity-5"></div>
                    <div className={`bg-white rounded-[3rem] shadow-xl p-10 border border-gray-100 relative overflow-hidden ${!isApproved ? 'rounded-t-none mt-6' : ''}`}>
                        {/* Section B: Bookings for My Locations */}
                        <section>
                            <h2 className="text-5xl font-extrabold text-gray-900 mb-12">Recent Bookings Management</h2>
                            <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
                                {bookings.length === 0 ? (
                                    <div className="p-20 text-center text-3xl text-gray-400 font-bold">No bookings yet.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="table-header">Booking ID</th>
                                                    <th className="table-header">Customer</th>
                                                    <th className="table-header">Location / Date</th>
                                                    <th className="table-header">Slot</th>
                                                    <th className="table-header">Status Control</th>
                                                    <th className="table-header text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {bookings.map((booking) => (
                                                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="table-cell font-mono text-gray-500">
                                                            #{booking.id.slice(0, 6)}
                                                            <div className="text-sm mt-1 text-gray-400 font-sans">
                                                                {format(new Date(booking.created_at), 'MMM d, yyyy')}
                                                            </div>
                                                        </td>
                                                        <td className="table-cell">
                                                            <div className="font-bold text-gray-900">{booking.users?.full_name || 'User'}</div>
                                                            <div className="text-gray-500 text-lg">{booking.users?.email}</div>
                                                        </td>
                                                        <td className="table-cell">
                                                            <div className="font-bold text-primary mb-1">{booking.locations?.name}</div>
                                                            <div className="flex items-center text-gray-600">
                                                                <Calendar className="mr-2" size={18} />
                                                                {format(new Date(booking.start_time), 'MMM d, h:mm a')}
                                                            </div>
                                                        </td>
                                                        <td className="table-cell">
                                                            {booking.selected_slot ? (
                                                                <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full font-bold text-sm border border-blue-200">
                                                                    {booking.selected_slot}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 font-mono text-sm">--</span>
                                                            )}
                                                        </td>
                                                        <td className="table-cell">
                                                            <select
                                                                value={booking.status || 'Scheduled'}
                                                                onChange={(e) => handleStatusChange(booking.id, e.target.value, booking.location_id)}
                                                                className={`p-3 pr-8 rounded-xl font-bold border-2 cursor-pointer outline-none focus:ring-4 focus:ring-opacity-50 transition-all ${booking.status === 'Completed' ? 'border-green-200 bg-green-50 text-green-800' :
                                                                    booking.status === 'Cancelled' ? 'border-red-200 bg-red-50 text-red-800' :
                                                                        booking.status === 'Started' ? 'border-blue-200 bg-blue-50 text-blue-800' :
                                                                            'border-gray-200 bg-white text-gray-700'
                                                                    }`}
                                                            >
                                                                <option value="Scheduled">📅 Scheduled</option>
                                                                <option value="Started">▶️ Started</option>
                                                                <option value="Completed">✅ Completed</option>
                                                                <option value="Cancelled">❌ Cancelled</option>
                                                            </select>
                                                        </td>
                                                        <td className="table-cell text-right">
                                                            <button
                                                                onClick={() => setSelectedBarcodeBooking(booking)}
                                                                className="btn-sm bg-gray-900 text-white hover:bg-black inline-flex items-center"
                                                            >
                                                                <QrCode size={20} className="mr-2" /> View Barcode
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Add Location Modal */}
                    {isAddModalOpen && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                            <div className="bg-white/90 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-12 relative animate-in fade-in zoom-in duration-300">
                                <button onClick={() => setIsAddModalOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors">
                                    <X size={36} />
                                </button>
                                <h2 className="text-4xl font-extrabold mb-10 text-gray-900">Add New Property</h2>
                                <form onSubmit={handleAddLocation} className="space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-2">Property Name</label>
                                            <input type="text" required
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                value={newLoc.name} onChange={e => setNewLoc({ ...newLoc, name: e.target.value })} placeholder="e.g. Downtown Garage" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-2">Type</label>
                                            <select
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                value={newLoc.type} onChange={e => setNewLoc({ ...newLoc, type: e.target.value })}>
                                                <option value="parking">Parking</option>
                                                <option value="ev">EV Charging</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-bold mb-2">Address</label>
                                        <input type="text" required
                                            className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            value={newLoc.address} onChange={e => setNewLoc({ ...newLoc, address: e.target.value })} placeholder="Street Address" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-2">City</label>
                                            <input type="text" required
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                value={newLoc.city} onChange={e => setNewLoc({ ...newLoc, city: e.target.value })} placeholder="City" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-2">Price/Hr ($)</label>
                                            <input type="number" required
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                value={newLoc.price} onChange={e => setNewLoc({ ...newLoc, price: e.target.value })} placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-2">Total Slots</label>
                                            <input type="number" required
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                value={newLoc.slots} onChange={e => setNewLoc({ ...newLoc, slots: e.target.value })} placeholder="10" />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full btn-secondary py-5 text-2xl mt-6">
                                        Publish Location
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Edit Location Modal */}
                    {isEditModalOpen && editingLoc && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                            <div className="bg-white/90 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-12 relative animate-in fade-in zoom-in duration-300">
                                <button onClick={() => setIsEditModalOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors">
                                    <X size={36} />
                                </button>
                                <h2 className="text-4xl font-extrabold mb-10 text-gray-900">Edit Property</h2>
                                <form onSubmit={handleEditLocation} className="space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label>Property Name</label>
                                            <input type="text" required
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg"
                                                value={editingLoc.name} onChange={e => setEditingLoc({ ...editingLoc, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label>Type</label>
                                            <select
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg"
                                                value={editingLoc.type} onChange={e => setEditingLoc({ ...editingLoc, type: e.target.value })}>
                                                <option value="parking">Parking</option>
                                                <option value="ev">EV Charging</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label>Address</label>
                                        <input type="text" required
                                            className="w-full p-4 border border-gray-300 rounded-xl text-lg"
                                            value={editingLoc.address} onChange={e => setEditingLoc({ ...editingLoc, address: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-8">
                                        <div>
                                            <label>City</label>
                                            <input type="text" required
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg"
                                                value={editingLoc.city} onChange={e => setEditingLoc({ ...editingLoc, city: e.target.value })} />
                                        </div>
                                        <div>
                                            <label>Price/Hr ($)</label>
                                            <input type="number" required
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg"
                                                value={editingLoc.price_per_hour} onChange={e => setEditingLoc({ ...editingLoc, price_per_hour: e.target.value })} />
                                        </div>
                                        <div>
                                            <label>Total Slots</label>
                                            <input type="number" required
                                                className="w-full p-4 border border-gray-300 rounded-xl text-lg"
                                                value={editingLoc.total_slots} onChange={e => setEditingLoc({ ...editingLoc, total_slots: e.target.value })} />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full btn-primary py-5 text-2xl mt-6">
                                        Save Changes
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Barcode Modal */}
                    <BarcodeModal
                        booking={selectedBarcodeBooking}
                        onClose={() => setSelectedBarcodeBooking(null)}
                    />
                </div>
            </div>
        </div>
    );
};

export default OwnerPortal;
