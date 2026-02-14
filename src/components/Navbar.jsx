
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
    const { user, userRole, logout } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Locations', path: '/locations' },
        { name: 'Parking', path: '/parking' },
        { name: 'EV Charging', path: '/ev-charging' },
    ];

    const handleLogout = async () => {
        await logout();
    };

    const getDashboardLink = () => {
        if (userRole === 'admin') return '/admin-portal';
        if (userRole === 'owner') return '/owner-portal';
        return '/user-dashboard'; // Keep standard dashboard for users
    };

    return (
        <nav className="bg-white shadow-lg sticky top-0 z-50 h-24 flex items-center">
            <div className="w-full max-w-screen-2xl mx-auto px-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center group">
                            <span className="text-4xl font-extrabold text-primary group-hover:scale-105 transition-transform">VOLT</span>
                            <span className="text-4xl font-extrabold text-secondary group-hover:scale-105 transition-transform">park</span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-10">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={`relative px-4 py-2 text-xl font-bold transition-all duration-300 group cursor-pointer ${isActive(link.path) ? 'text-secondary' : 'text-gray-600 hover:text-primary'
                                    }`}
                            >
                                {link.name}
                                <span className={`absolute bottom-0 left-0 w-full h-1 rounded-full bg-secondary transform origin-left transition-transform duration-300 ${isActive(link.path) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                            </Link>
                        ))}
                    </div>

                    <div className="hidden md:flex items-center space-x-6">
                        {user ? (
                            <div className="relative group">
                                <button className="flex items-center space-x-3 focus:outline-none">
                                    <div className="h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md ring-4 ring-white group-hover:ring-secondary transition-all">
                                        {user.email?.charAt(0).toUpperCase()}
                                    </div>
                                </button>

                                {/* Profile Dropdown */}
                                <div className="absolute right-0 mt-4 w-64 bg-white rounded-2xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right z-50 border border-gray-100">
                                    <div className="px-6 py-4 border-b border-gray-100">
                                        <p className="text-sm text-gray-500">Signed in as</p>
                                        <p className="text-lg font-bold text-gray-900 truncate">{user.email}</p>
                                        <p className="text-xs font-bold text-secondary uppercase mt-1">{userRole}</p>
                                    </div>

                                    <Link to="/profile" className="block px-6 py-3 text-lg text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center">
                                        <User size={20} className="mr-3" /> My Profile
                                    </Link>

                                    <Link to={getDashboardLink()} className="block px-6 py-3 text-lg text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center">
                                        <Menu size={20} className="mr-3" /> My Dashboard
                                    </Link>

                                    <div className="border-t border-gray-100 mt-2 pt-2">
                                        <button onClick={handleLogout} className="w-full text-left px-6 py-3 text-lg text-red-600 hover:bg-red-50 transition-colors flex items-center">
                                            <LogOut size={20} className="mr-3" /> Logout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative group">
                                <button className="btn-primary flex items-center space-x-2 px-8 py-3 rounded-full text-lg">
                                    <User size={24} />
                                    <span>Login</span>
                                </button>
                                <div className="absolute right-0 mt-4 w-56 bg-white rounded-2xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right z-50 border border-gray-100">
                                    <Link to="/login" className="block px-6 py-4 text-lg text-gray-700 hover:bg-gray-50 font-medium">
                                        Login as User
                                    </Link>
                                    <Link to="/owner-login" className="block px-6 py-4 text-lg text-gray-700 hover:bg-gray-50 font-medium">
                                        Login as Owner
                                    </Link>
                                    <Link to="/admin-login" className="block px-6 py-4 text-lg text-gray-700 hover:bg-gray-50 font-medium">
                                        Login as Admin
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 hover:text-primary p-2">
                            {isOpen ? <X size={32} /> : <Menu size={32} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-t">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setIsOpen(false)}
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                            >
                                {link.name}
                            </Link>
                        ))}
                        {user ? (
                            <>
                                <Link to={getDashboardLink()} onClick={() => setIsOpen(false)} className="block px-3 py-2 text-base font-medium text-primary hover:bg-gray-50">
                                    Dashboard
                                </Link>
                                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-base font-medium text-red-500 hover:bg-gray-50">
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link to="/login" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-base font-medium text-primary hover:bg-gray-50">
                                Login / Signup
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
