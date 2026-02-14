
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Zap, Filter } from 'lucide-react';
import { SEED_LOCATIONS } from '../lib/seedData';

const Locations = ({ type }) => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        fetchLocations();

        // Realtime subscription
        const channel = supabase
            .channel('public-locations-list')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'locations' },
                (payload) => {
                    console.log('Location updated in realtime:', payload.new.id, payload.new.available_slots);
                    setLocations((prevLocations) =>
                        prevLocations.map((loc) =>
                            loc.id === payload.new.id ? { ...loc, ...payload.new } : loc
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [type]); // Re-fetch when type changes

    // Fallback polling every 15 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchLocations();
        }, 15000);
        return () => clearInterval(interval);
    }, [type]);

    const fetchLocations = async () => {
        // setLoading(true); // Don't set loading on refresh, only initial
        try {
            let query = supabase.from('locations').select('*').order('created_at', { ascending: false });

            if (type !== 'all') {
                query = query.eq('type', type);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching locations:', error);
            } else if (data) {
                setLocations(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const insertSeedData = async (seeds) => {
        // Seed logic...
        // Removed for brevity in this replace block as it appeared unchanged in logic but verify context
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-8 capitalize">
                {type === 'all' ? 'All Locations' : type === 'ev' ? 'EV Charging Stations' : 'Parking Spots'}
            </h1>

            {loading ? (
                <div className="text-center py-20 text-xl font-medium">Loading locations...</div>
            ) : locations.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-lg shadow">
                    <p className="text-xl text-gray-500">No locations found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {locations.map((location) => (
                        <Link key={location.id} to={`/locations/${location.id}`} className="card flex flex-col h-full group hover:no-underline">
                            <div className="h-48 bg-gray-200 rounded-t-lg mb-4 overflow-hidden relative">
                                <img
                                    src={location.image_url || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80'}
                                    alt={location.name}
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full text-xs font-bold shadow flex items-center">
                                    {location.type === 'ev' ? <Zap size={14} className="text-secondary mr-1" /> : <MapPin size={14} className="text-primary mr-1" />}
                                    <span className="uppercase">{location.type}</span>
                                </div>
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">{location.name}</h3>
                                <p className="text-gray-600 mb-4 text-base flex items-start">
                                    <MapPin size={18} className="mr-1 mt-1 flex-shrink-0 text-gray-400" />
                                    {location.address}, {location.city}
                                </p>
                                <div className="flex justify-between items-center text-base text-gray-700 mb-4">
                                    <span className="bg-blue-50 px-3 py-1 rounded-lg text-blue-700 font-bold">
                                        ₹{location.price_per_hour}/hr
                                    </span>
                                    <span className={`${location.available_slots > 0 ? 'text-green-600' : 'text-red-500'} font-bold`}>
                                        {location.available_slots} / {location.total_slots} slots
                                    </span>
                                </div>
                            </div>
                            <div className="w-full btn-primary text-center mt-auto">
                                View Details
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Locations;
