
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MapPin, Zap, Clock, Calendar, CreditCard } from 'lucide-react';
import { format, addHours } from 'date-fns';
import { SEED_LOCATIONS } from '../lib/seedData';
import DateTimeWheel from '../components/DateTimeWheel';
import SlotGrid from '../components/SlotGrid';


const LocationDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState({
        startDateTime: new Date(),
        duration: 1
    });
    const [processing, setProcessing] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [occupiedSlots, setOccupiedSlots] = useState([]);

    useEffect(() => {
        if (id) {
            fetchLocation();
            fetchOccupiedSlots();

            // Realtime subscription for location details
            const locChannel = supabase
                .channel(`location-detail-${id}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'locations', filter: `id=eq.${id}` },
                    (payload) => {
                        console.log('Realtime location update:', payload);
                        setLocation((prev) => ({ ...prev, ...payload.new }));
                    }
                )
                .subscribe();

            // Realtime subscription for bookings (to update occupied slots)
            const bookingChannel = supabase
                .channel(`location-bookings-${id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'bookings', filter: `location_id=eq.${id}` },
                    () => {
                        console.log('Realtime booking update - refreshing slots');
                        fetchOccupiedSlots();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(locChannel);
                supabase.removeChannel(bookingChannel);
            };
        }
    }, [id]);

    const fetchOccupiedSlots = async () => {
        try {
            // Fetch bookings that are Scheduled or Started
            const { data, error } = await supabase
                .from('bookings')
                .select('selected_slot')
                .eq('location_id', id)
                .in('status', ['Scheduled', 'Started']);

            if (error) throw error;

            if (data) {
                const slots = data.map(b => b.selected_slot).filter(Boolean);
                setOccupiedSlots(slots);
            }
        } catch (e) {
            console.error("Error fetching occupied slots:", e);
        }
    };

    // ... fetchLocation ...

    // ... handleBooking ...

    // ...



    // ... (fetchLocation remains same, omitted for brevity if using tool correctly with context, but I cant skip lines in replace_file_content unless I use chunks.
    // Wait, I need to keep fetchLocation. I'll use separate replace calls or just be careful. 
    // Actually, I can use the tool to replace 'imports' and 'state init' and 'handleBooking' separately if I want to be safe.
    // Or I can just replace the top part and the handleBooking part.
    // The previous tool call handled the FORM render.
    // This one will handle imports and the top logic.

    // ... imports are already there at the top. I need to ADD DatePicker imports.

    const fetchLocation = async () => {
        try {
            const seedLocation = SEED_LOCATIONS.find(l => l.id === id);
            if (seedLocation) {
                const { data, error } = await supabase
                    .from('locations')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (!error && data) {
                    setLocation(data);
                } else {
                    console.log("Using seed data for details");
                    setLocation(seedLocation);
                }
            } else {
                const { data, error } = await supabase
                    .from('locations')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (error) throw error;
                setLocation(data);
            }
        } catch (error) {
            console.error('Error fetching location:', error);
            const seedLocation = SEED_LOCATIONS.find(l => l.id === id);
            if (seedLocation) setLocation(seedLocation);
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = async (e) => {
        e.preventDefault();
        if (!user) {
            navigate('/login');
            return;
        }

        if (!selectedSlot) {
            alert("Please select a parking slot or charger.");
            return;
        }

        setProcessing(true);
        try {
            const startDateTime = booking.startDateTime;
            const endDateTime = addHours(startDateTime, booking.duration);
            const amount = location.price_per_hour * booking.duration;

            // Generate ID for Booking + Barcode
            const newBookingId = crypto.randomUUID();

            // Use RPC to safely insert booking and update slots (Bypassing RLS)
            const { data, error } = await supabase.rpc('create_booking', {
                p_location_id: location.id,
                p_user_id: user.id,
                p_start_time: startDateTime.toISOString(),
                p_end_time: endDateTime.toISOString(),
                p_duration: booking.duration,
                p_amount: amount,
                p_status: 'Scheduled',
                p_barcode_value: newBookingId,
                p_selected_slot: selectedSlot
            });

            if (error) {
                console.error("RPC Error:", error);

                // Fallback for Demo Mode / Missing RPC
                if (error.message.includes('function create_booking') || error.code === 'PGRST202') {
                    // Try old method if RPC fails (e.g., user hasn't run SQL yet), though it will likely fail on update RLS
                    console.warn("RPC not found, attempting direct insert...");
                    const { error: bookingError } = await supabase.from('bookings').insert([{
                        id: newBookingId,
                        user_id: user.id,
                        location_id: location.id,
                        start_time: startDateTime.toISOString(),
                        end_time: endDateTime.toISOString(),
                        duration: booking.duration,
                        amount: amount,
                        status: 'Scheduled',
                        barcode_value: newBookingId,
                        selected_slot: selectedSlot
                    }]);

                    if (bookingError) throw bookingError;

                    // Attempt update (will fail if RLS not set, but worth a try in dev)
                    if (location.available_slots > 0) {
                        const { error: updateError } = await supabase
                            .from('locations')
                            .update({ available_slots: location.available_slots - 1 })
                            .eq('id', location.id);
                        if (updateError) console.warn("Could not update slots (RLS likely):", updateError);
                    }
                } else {
                    throw error;
                }
            }

            alert('Booking confirmed! Barcode generated.');
            navigate('/user-dashboard');

        } catch (error) {
            console.error('Booking failed:', error);
            alert('Booking failed: ' + (error.message || "Unknown error"));
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="text-center py-20">Loading...</div>;
    if (!location) return <div className="text-center py-20">Location not found</div>;

    return (
    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid md:grid-cols-3 gap-6">
                {/* Left: Images and Info */}
                <div className="md:col-span-2 space-y-6">
                    <img
                        src={location.image_url || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80'}
                        alt={location.name}
                        className="w-full h-64 object-cover rounded-xl shadow-lg"
                    />

                    <div>
                        <div className="flex items-center space-x-3 mb-3">
                            <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${location.type === 'ev' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'}`}>
                                {location.type}
                            </span>
                        </div>

                        <p className="flex items-center text-gray-600 mb-4 text-sm">
                            <MapPin className="mr-1.5" size={16} />
                            {location.address}, {location.city}
                        </p>

                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold mb-3">Details</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-gray-500 text-xs">Price per hour</p>
                                    <p className="text-base font-medium text-primary">${location.price_per_hour}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">Total Slots</p>
                                    <p className="text-base font-medium">{location.total_slots}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">Available Slots</p>
                                    <p className={`text-base font-medium ${location.available_slots > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {location.available_slots}
                                    </p>
                                </div>
                                {location.type === 'ev' && (
                                    <div>
                                        <p className="text-gray-500 text-xs">EV Chargers</p>
                                        <p className="text-base font-medium text-secondary">{location.ev_chargers}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6">
                            <SlotGrid
                                totalSlots={location.total_slots}
                                availableSlots={location.available_slots}
                                type={location.type}
                                selectedSlot={selectedSlot}
                                occupiedSlots={occupiedSlots}
                                onSelect={(id) => setSelectedSlot(prev => prev === id ? null : id)}
                            />
                        </div>

                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-2">Description</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                {location.description || 'Secure and convenient parking location with 24/7 access. CCTV surveillance and well-lit areas for your safety. Easy entry and exit.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Booking Form */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-xl shadow-lg p-5 sticky top-20">
                        <h3 className="text-lg font-bold mb-4 text-gray-900">Book Your Spot</h3>

                        <form onSubmit={handleBooking} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Select Date & Time</label>
                                <div>
                                    <DateTimeWheel
                                        selectedDate={booking.startDateTime}
                                        onChange={(date) => setBooking({ ...booking, startDateTime: date })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Duration (Hours)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={18} />
                                    <select
                                        className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-secondary focus:border-secondary text-base appearance-none"
                                        value={booking.duration}
                                        onChange={(e) => setBooking({ ...booking, duration: parseInt(e.target.value) })}
                                    >
                                        {[1, 2, 3, 4, 5, 8, 12, 24].map(h => (
                                            <option key={h} value={h}>{h} Hour{h > 1 ? 's' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between items-center text-gray-600 text-sm">
                                    <span>Rate</span>
                                    <span>${location.price_per_hour}/hr</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-lg font-bold text-gray-900">
                                    <span>Total</span>
                                    <span>${(location.price_per_hour * booking.duration).toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={processing || location.available_slots <= 0}
                                className={`w-full btn-secondary text-base py-3 flex justify-center items-center shadow-lg transform transition-all hover:scale-[1.02] ${processing ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                {processing ? 'Processing...' : (
                                    <>
                                        <CreditCard size={18} className="mr-2" />
                                        Confirm
                                    </>
                                )}
                            </button>

                            {location.available_slots <= 0 && (
                                <p className="text-red-500 text-center font-bold mt-2 text-sm">
                                    Sold Out for this time.
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationDetails;
