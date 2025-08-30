import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp-logo.png';
import { decodeShareData } from '../utils/share';

import SharedProtocolCard from '../components/share/SharedProtocolCard';
import SharedVendorCard from '../components/share/SharedVendorCard';

export default function Rover() {
    const { type, encodedData } = useParams();
    const [theme] = useState(themes[defaultThemeName]);
    const [item, setItem] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (encodedData) {
            const decoded = decodeShareData(encodedData);
            if (decoded === null) {
                setError('This share link is invalid or corrupted.');
            } else if (decoded.expired) {
                setError('This share link has expired.');
            } else {
                setItem(decoded);
            }
        } else {
            // This is fallback logic for malformed URLs
            setError('This share link is invalid or outdated.');
        }
    }, [type, encodedData]);

    const CardComponent = useMemo(() => {
        const componentType = item?.type || type;
        switch (componentType) {
            case 'protocol':
            case 'protocols':
                return SharedProtocolCard;
            case 'vendor':
            case 'vendors':
                return SharedVendorCard;
            default:
                return null;
        }
    }, [type, item]);

    if (error) {
        return <RoverWrapper theme={theme}><p className="text-center text-red-500">{error}</p></RoverWrapper>;
    }

    if (!item || !CardComponent) {
        return <RoverWrapper theme={theme}><p className="text-center text-gray-500">Loading shared content...</p></RoverWrapper>;
    }

    return (
        <RoverWrapper theme={theme}>
            <div className="max-w-2xl mx-auto flex justify-center">
                <CardComponent item={item} vendor={item} theme={theme} />
            </div>
        </RoverWrapper>
    );
}

const RoverWrapper = ({ children, theme }) => (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8" style={{ backgroundColor: theme.background }}>
        <header className="text-center mb-8">
            <img src={logo} alt="The Pep Planner Logo" className="h-20 w-20 rounded-full shadow-lg object-cover mx-auto mb-4" />
            <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>The Pep Planner</h1>
        </header>
        <main>
            {children}
        </main>
        <footer className="text-center mt-12 py-6 border-t" style={{ borderColor: theme.border }}>
            <p className="text-sm text-gray-500">Powered by The Pep Planner</p>
            <Link to="/login" className="mt-2 inline-block px-6 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }}>
                Plan your own research
            </Link>
        </footer>
    </div>
);
