import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Tour from './Tour';

export default function TourController({ theme, installPrompt }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isTourRunning, setIsTourRunning] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('tour') === 'true' && !isTourRunning) {
            setIsTourRunning(true);
        }
    }, [location.search, isTourRunning]);

    const handleTourEnd = () => {
        setIsTourRunning(false);
        // Remove the tour param from the URL
        const params = new URLSearchParams(location.search);
        params.delete('tour');
        navigate({ search: params.toString() }, { replace: true });
    };

    return (
        <Tour
            theme={theme}
            startTour={isTourRunning}
            onTourEnd={handleTourEnd}
            installPrompt={installPrompt}
        />
    );
}
