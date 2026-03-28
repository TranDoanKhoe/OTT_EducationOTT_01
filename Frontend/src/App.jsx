import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation,
} from 'react-router-dom';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import Home from './Pages/Home';
import Login from './Pages/Login';
import ContactsManagement from './Pages/ContactsManagement';
import AdminDashboard from './Pages/AdminDashboard';
import AdminUsers from './Pages/AdminUsers';
import AdminGroups from './Pages/AdminGroups';
import AdminStatistics from './Pages/AdminStatistics';

// Protected Admin Route Component - Simplified
const ProtectedAdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // Nếu không có token, redirect về login
    if (!token) {
        return <Navigate to="/" replace />;
    }

    // Nếu không phải admin, redirect về home
    if (userRole !== 'ADMIN') {
        return <Navigate to="/home" replace />;
    }

    return children;
};

const AnimatedRoutes = ({ userId }) => {
    const location = useLocation();
    const routeContainerRef = useRef(null);

    useLayoutEffect(() => {
        if (!routeContainerRef.current) return;

        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        if (reduceMotion) return;

        const ctx = gsap.context(() => {
            gsap.fromTo(
                routeContainerRef.current,
                { autoAlpha: 0, y: 10 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.42,
                    ease: 'power2.out',
                    clearProps: 'opacity,transform,visibility',
                },
            );
        }, routeContainerRef);

        return () => ctx.revert();
    }, [location.pathname]);

    return (
        <div ref={routeContainerRef}>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/home" element={<Home userId={userId} />} />
                <Route path="/contacts" element={<ContactsManagement />} />

                {/* Admin Routes */}
                <Route
                    path="/admin/dashboard"
                    element={
                        <ProtectedAdminRoute>
                            <AdminDashboard />
                        </ProtectedAdminRoute>
                    }
                />
                <Route
                    path="/admin/users"
                    element={
                        <ProtectedAdminRoute>
                            <AdminUsers />
                        </ProtectedAdminRoute>
                    }
                />
                <Route
                    path="/admin/groups"
                    element={
                        <ProtectedAdminRoute>
                            <AdminGroups />
                        </ProtectedAdminRoute>
                    }
                />
                <Route
                    path="/admin/statistics"
                    element={
                        <ProtectedAdminRoute>
                            <AdminStatistics />
                        </ProtectedAdminRoute>
                    }
                />

                {/* Redirect /admin to /admin/dashboard */}
                <Route
                    path="/admin"
                    element={<Navigate to="/admin/dashboard" replace />}
                />
            </Routes>
        </div>
    );
};

function App() {
    // Lấy userId và accessToken từ localStorage
    const userId = localStorage.getItem('userId');

    return (
        <div className="min-h-screen w-full bg-liquid-app transition-smooth text-gray-800">
            <Router>
                <AnimatedRoutes userId={userId} />
            </Router>
        </div>
    );
}

export default App;
