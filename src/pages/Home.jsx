
import { Search, MapPin, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative bg-primary text-white py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1573348722427-f1d6d19dba7c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20"></div>
                <div className="relative max-w-7xl mx-auto text-center z-10">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 font-ferron">
                        Find <span className="text-secondary">Smart Parking</span> & <br />
                        <span className="text-secondary">EV Charging</span> Near You
                    </h1>
                    <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                        Book your spot in seconds. Secure, convenient, and reliable.
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto bg-white rounded-full p-2 flex items-center shadow-lg transform hover:scale-[1.01] transition-transform duration-300">
                        <MapPin className="text-gray-400 ml-4" size={24} />
                        <input
                            type="text"
                            placeholder="Search locations, city, or address..."
                            className="flex-grow px-4 py-3 text-gray-800 focus:outline-none rounded-full"
                        />
                        <button className="bg-secondary text-white px-8 py-3 rounded-full font-bold hover:bg-teal-600 transition-colors flex items-center">
                            Search
                        </button>
                    </div>
                </div>
            </section>

            {/* Feature Cards Section */}
            <section className="py-16 px-4 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-8">

                        {/* Parking Card */}
                        <Link to="/parking" className="card group block transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                                <MapPin className="text-primary" size={40} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Find Parking</h2>
                            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                Access thousands of secure parking spots in garages and lots across the city.
                                Reserve ahead to save time and money.
                            </p>
                            <div className="inline-flex items-center font-bold text-primary group-hover:text-secondary transition-colors text-lg">
                                Find Parking <ArrowRight size={24} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        {/* EV Charging Card */}
                        <Link to="/ev-charging" className="card group block transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                            <div className="bg-teal-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-100 transition-colors">
                                <Zap className="text-secondary" size={40} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">EV Charging</h2>
                            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                Locate fast and reliable EV charging stations.
                                Check availability in real-time and start charging instantly.
                            </p>
                            <div className="inline-flex items-center font-bold text-secondary group-hover:text-teal-600 transition-colors text-lg">
                                Find Stations <ArrowRight size={24} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-16 px-4 bg-white">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-12">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-6">
                            <div className="text-6xl font-bold text-gray-100 mb-4">01</div>
                            <h3 className="text-xl font-bold mb-2">Search</h3>
                            <p className="text-gray-600">Find the perfect spot or charging station near your destination.</p>
                        </div>
                        <div className="p-6">
                            <div className="text-6xl font-bold text-gray-100 mb-4">02</div>
                            <h3 className="text-xl font-bold mb-2">Book</h3>
                            <p className="text-gray-600">Reserve your space in advance to guarantee availability.</p>
                        </div>
                        <div className="p-6">
                            <div className="text-6xl font-bold text-gray-100 mb-4">03</div>
                            <h3 className="text-xl font-bold mb-2">Park & Pay</h3>
                            <p className="text-gray-600">Arrive, park, and pay seamlessly through the app. No tickets needed.</p>
                        </div>
                    </div>
                </div>
            </section>
            {/* Become an Owner CTA */}
            <section className="py-20 bg-secondary text-white text-center px-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">Own a Parking Space?</h2>
                    <p className="text-xl md:text-2xl mb-8 opacity-90">
                        Maximize your earnings by listing your parking spots or EV charging stations on VOLTpark.
                        Manage bookings and get paid seamlessly.
                    </p>
                    <Link
                        to="/owner-register"
                        className="inline-block bg-white text-secondary font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:bg-gray-100 transform hover:scale-105 transition-all"
                    >
                        Become a Partner
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Home;
