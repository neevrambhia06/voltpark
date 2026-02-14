
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, ArrowLeft, Search, Filter, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import BarcodeModal from '../../components/BarcodeModal';

const AdminBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, Scheduled, Started, Completed, Cancelled
    const [selectedBarcodeBooking, setSelectedBarcodeBooking] = useState(null);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, locations(name, type, city), users(name, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBookings = bookings.filter(bk => {
        const matchesSearch = (bk.locations?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (bk.users?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            bk.id.includes(searchTerm);

        const matchesStatus = filterStatus === 'all' || bk.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/admin-portal" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
                                <ArrowLeft size={24} />
                            </Link>
                            <h1 className="text-3xl font-bold text-gray-900">All Bookings</h1>
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                            Total: {filteredBookings.length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search Booking ID, Location, User..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter size={20} className="text-gray-400" />
                        <select
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Started">Started</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-6 text-left text-sm font-extrabold text-gray-500 uppercase tracking-widest">Booking ID</th>
                                    <th className="px-6 py-6 text-left text-sm font-extrabold text-gray-500 uppercase tracking-widest">Location</th>
                                    <th className="px-6 py-6 text-left text-sm font-extrabold text-gray-500 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-6 text-left text-sm font-extrabold text-gray-500 uppercase tracking-widest">Time</th>
                                    <th className="px-6 py-6 text-left text-sm font-extrabold text-gray-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-6 text-right text-sm font-extrabold text-gray-500 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="6" className="px-6 py-20 text-center text-xl text-gray-400 font-medium">Loading bookings...</td></tr>
                                ) : filteredBookings.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-20 text-center text-xl text-gray-400 font-medium">No bookings found.</td></tr>
                                ) : (
                                    filteredBookings.map((bk) => (
                                        <tr key={bk.id} className="hover:bg-blue-50/50 transition-all duration-200 group">
                                            <td className="px-6 py-6 whitespace-nowrap">
                                                <span className="font-mono text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 font-bold">
                                                    #{bk.id.slice(0, 8)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 whitespace-nowrap">
                                                <div className="text-lg font-bold text-gray-900 mb-1">{bk.locations?.name || 'Unknown Location'}</div>
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <MapPin size={14} className="mr-1" />
                                                    {bk.locations?.city}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 whitespace-nowrap">
                                                <div className="text-lg font-bold text-gray-900 mb-1">{bk.users?.name || 'Unknown User'}</div>
                                                <div className="text-sm text-gray-500 font-medium">{bk.users?.email}</div>
                                            </td>
                                            <td className="px-6 py-6 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="text-base font-bold text-gray-900">
                                                        {new Date(bk.start_time).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center mt-1 bg-gray-50 px-2 py-1 rounded w-fit">
                                                        <Calendar size={14} className="mr-2 text-gray-400" />
                                                        {new Date(bk.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                        {new Date(bk.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 whitespace-nowrap">
                                                <span className={`px-4 py-2 inline-flex text-sm leading-5 font-extrabold rounded-full uppercase tracking-wide border shadow-sm ${bk.status === 'Completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                                        bk.status === 'Started' ? 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse' :
                                                            bk.status === 'Cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                'bg-amber-100 text-amber-800 border-amber-200'
                                                    }`}>
                                                    {bk.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => setSelectedBarcodeBooking(bk)}
                                                    className="text-white bg-indigo-600 hover:bg-indigo-700 font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-indigo-200 hover:-translate-y-0.5"
                                                >
                                                    View Barcode
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Barcode Modal */}
            <BarcodeModal
                booking={selectedBarcodeBooking}
                onClose={() => setSelectedBarcodeBooking(null)}
            />
        </div>
    );
};

export default AdminBookings;
