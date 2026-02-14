import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, DollarSign, QrCode } from 'lucide-react';
import BarcodeModal from '../../components/BarcodeModal';

const DashboardLayout = ({ title, children }) => {
    return (
        <div className="max-w-[1800px] mx-auto px-8 py-16">
            <h1 className="text-6xl font-extrabold text-gray-900 mb-12">{title}</h1>
            <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden p-12">
                {children}
            </div>
        </div>
    )
}

const BookingList = ({ bookings }) => {
    const [selectedBooking, setSelectedBooking] = useState(null);

    if (bookings.length === 0) {
        return <div className="p-20 text-center text-3xl text-gray-400 font-bold">No bookings found. Start exploring!</div>
    }

    return (
        <>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="table-header">Details</th>
                            <th className="table-header">Location</th>
                            <th className="table-header">Slot</th>
                            <th className="table-header">Schedule</th>
                            <th className="table-header">Payment</th>
                            <th className="table-header">Status</th>
                            <th className="table-header text-right">Access</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {bookings.map((booking) => (
                            <tr key={booking.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="table-cell">
                                    <div className="font-mono text-gray-500 text-lg">#{booking.id.slice(0, 8)}</div>
                                </td>
                                <td className="table-cell">
                                    <div className="flex items-center">
                                        <MapPin className="text-primary mr-3" size={24} />
                                        <span className="font-bold text-gray-900 text-2xl">{booking.locations?.name || 'Unknown Location'}</span>
                                    </div>
                                </td>
                                <td className="table-cell">
                                    {booking.selected_slot ? (
                                        <span className="bg-blue-100 text-blue-800 py-2 px-4 rounded-xl font-bold text-xl border border-blue-200">
                                            {booking.selected_slot}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 font-bold text-lg">--</span>
                                    )}
                                </td>
                                <td className="table-cell">
                                    <div className="flex flex-col space-y-1">
                                        <div className="flex items-center text-gray-900 font-bold text-xl">
                                            <Calendar className="mr-2 text-gray-400" size={20} />
                                            {format(new Date(booking.start_time), 'MMM d, yyyy')}
                                        </div>
                                        <div className="flex items-center text-gray-500 text-lg">
                                            <Clock className="mr-2 text-gray-400" size={20} />
                                            {format(new Date(booking.start_time), 'h:mm a')} • {booking.duration} hr(s)
                                        </div>
                                    </div>
                                </td>
                                <td className="table-cell">
                                    <div className="font-bold text-2xl text-secondary">${booking.amount}</div>
                                </td>
                                <td className="table-cell">
                                    <span className={`px-6 py-3 inline-flex text-lg font-bold rounded-full uppercase tracking-wide ${booking.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                        booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                            booking.status === 'Started' ? 'bg-blue-100 text-blue-800' :
                                                'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {booking.status || 'Scheduled'}
                                    </span>
                                </td>
                                <td className="table-cell text-right">
                                    <button
                                        onClick={() => setSelectedBooking(booking)}
                                        className="btn-sm bg-gray-900 text-white hover:bg-black inline-flex items-center shadow-lg transform transition-transform group-hover:scale-105"
                                    >
                                        <QrCode size={24} className="mr-3" /> View Barcode
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <BarcodeModal
                booking={selectedBooking}
                onClose={() => setSelectedBooking(null)}
            />
        </>
    )
}

export const UserDashboard = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);

    useEffect(() => {
        const fetchBookings = async () => {
            const { data } = await supabase
                .from('bookings')
                .select('*, locations(name)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            setBookings(data || []);
        }
        if (user) fetchBookings();
    }, [user]);

    return (
        <DashboardLayout title="My Bookings">
            <BookingList bookings={bookings} />
        </DashboardLayout>
    )
}

export const OwnerDashboard = () => {
    // Replaced by specific OwnerPortal page, keeping component for safety if needed by router
    return null;
}

export default UserDashboard;
