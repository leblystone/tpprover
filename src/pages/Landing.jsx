import React, { useState, useEffect, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Check, 
  CheckSquare,
  Star, 
  HeartHandshake,
  Smartphone, 
  Tablet, 
  Monitor, 
  FlaskConical, 
  Calendar, 
  BarChart3, 
  Download,
  Apple,
  Play,
  Droplet,
  Pen,
  Package,
  ShoppingCart,
  MapPin,
  FileText,
  Share2,
  Shield,
  Calculator,
  BookOpen,
  Layers,
  Pipette
} from 'lucide-react';
import logo from '../assets/tpp_logo.png';
import LandingContactModal from '../components/legal/LandingContactModal';
import LandingFooter from '../components/layout/LandingFooter';
import LandingHeader from '../components/layout/LandingHeader';
import { isNative, isPWAInstalled, isIOS } from '../utils/platform';
import { usePageSEO } from '../utils/pageSEO';

export default function Landing() {
  usePageSEO();
  const navigate = useNavigate();
  const [showContact, setShowContact] = useState(false);
  const [showIOSPopup, setShowIOSPopup] = useState(false);
  // Today's Research demo checkboxes (interactive on landing)
  const [landingChecked, setLandingChecked] = useState({ b12: false, glow: false, nad: false });
  const toggleLandingCheck = (id) => setLandingChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  // Enable scrolling on landing page
  useEffect(() => {
    document.body.classList.add('landing-page');
    document.documentElement.classList.add('landing-page-active');
    return () => {
      document.body.classList.remove('landing-page');
      document.documentElement.classList.remove('landing-page-active');
    };
  }, []);

  // Smart routing: Native apps and installed PWAs go to login (with intro)
  // Browser users stay on landing page (marketing)
  useEffect(() => {
    const shouldRedirectToApp = isNative() || isPWAInstalled();
    
    if (shouldRedirectToApp) {
      console.log('📱 Native/Installed PWA detected - redirecting to login/intro');
      startTransition(() => {
        navigate('/login', { replace: true });
      });
    } else {
      console.log('🌐 Browser user detected - showing marketing landing page');
    }
  }, [navigate]);

  const handleGetStarted = () => {
    startTransition(() => {
      navigate('/login?trial=true');
    });
  };

  const handleSignIn = () => {
    startTransition(() => {
      navigate('/login');
    });
  };

  const features = [
    {
      icon: Package,
      title: 'Stockpiles',
      description: 'No need to PANIC! Always know how much is in your stockpile with aggressive vial tracking.',
      boldText: 'PANIC'
    },
    {
      icon: ShoppingCart,
      title: 'Orders',
      description: 'Let the app do the work for you by syncing your incoming peptides into your stockpile.'
    },
    {
      icon: MapPin,
      title: 'Vendors',
      description: 'Domestic, International or GB vendor info at your fingertips! Never lose your contact again.'
    }
  ];

  return (
    <div className="min-h-screen landing-page-root" style={{ backgroundColor: '#F5F5F0', fontFamily: 'Poppins, sans-serif' }}>
      <LandingHeader />

       {/* Hero Section */}
       <section className="py-12 md:py-20" style={{ backgroundColor: '#EFF2EE' }}>
         <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
           {/* Mobile Title Section - Single Column */}
           <div className="text-center mb-8 md:hidden">
             <h1 className="text-4xl font-bold leading-tight" style={{ color: '#7F9E95', fontFamily: 'Poppins, sans-serif' }}>
               <span className="block text-3xl">Welcome to your</span> <span className="block whitespace-nowrap text-5xl" style={{ color: '#1F2B2A' }}>Pep Planner!</span>
             </h1>
           </div>
           
          {/* Mobile Layout - Stacked */}
          <div className="md:hidden flex flex-col items-center gap-6">
            {/* Today's Research Card - Mobile (matches TasksWidget/TasksList UI) */}
            <div className="w-full max-w-xs landing-todays-research-animate">
              <div className="rounded-xl glass-panel-depth widget-card-hover overflow-hidden">
                {/* Header with separator line (same as TasksWidget) */}
                <div className="px-4 py-3 flex-shrink-0 relative z-10 widget-separator" style={{ borderColor: 'rgba(47, 59, 58, 0.15)', background: 'linear-gradient(135deg, rgba(127, 158, 149, 0.08), rgba(127, 158, 149, 0.03))' }}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold flex items-center gap-2 truncate" style={{ color: '#2F3B3A' }}>Today's Research</h3>
                    <CheckSquare className="w-4 h-4 flex-shrink-0" style={{ color: '#7F9E95' }} />
                  </div>
                </div>
                {/* List - line break between header and first row via widget-separator above */}
                <div className="p-2 sm:p-4">
                  <ul className="space-y-1.5">
                    <li className="flex items-center justify-between gap-2 py-2.5 px-3 min-w-0 transition-all duration-200" style={{ backgroundColor: 'transparent', borderLeft: '3px solid rgba(127, 158, 149, 0.4)', boxShadow: '0 1px 0 rgba(127, 158, 149, 0.08)' }}>
                      <div className="flex items-center gap-2 flex-1 min-w-0"><div className={`font-semibold text-sm truncate ${landingChecked.b12 ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.b12 ? '#9ca3af' : '#2F3B3A' }}>B12</div></div>
                      <div className={`text-right flex items-center gap-1.5 flex-shrink-0 ${landingChecked.b12 ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.b12 ? '#9ca3af' : undefined }}>
                        <span className="font-medium text-xs whitespace-nowrap">1mL</span>
                        <Pipette className="w-3.5 h-3.5" style={{ color: '#6B7280', opacity: landingChecked.b12 ? 0.5 : 1 }} />
                        <button type="button" onClick={() => toggleLandingCheck('b12')} className="w-5 h-5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer touch-manipulation" style={{ borderColor: landingChecked.b12 ? '#7F9E95' : 'rgba(127, 158, 149, 0.4)', backgroundColor: landingChecked.b12 ? '#7F9E95' : 'transparent', borderRadius: '4px', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.12)', WebkitTapHighlightColor: 'transparent' }} title={landingChecked.b12 ? 'Mark incomplete' : 'Mark complete'}>
                          {landingChecked.b12 && <Check size={14} className="text-white" style={{ strokeWidth: 2.5 }} />}
                        </button>
                      </div>
                    </li>
                    <li className="flex items-center justify-between gap-2 py-2.5 px-3 min-w-0 transition-all duration-200" style={{ backgroundColor: 'transparent', borderLeft: '3px solid rgba(75, 95, 88, 0.5)', boxShadow: '0 1px 0 rgba(127, 158, 149, 0.08)' }}>
                      <div className="flex items-center gap-2 flex-1 min-w-0"><div className={`font-semibold text-sm truncate ${landingChecked.glow ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.glow ? '#9ca3af' : '#2F3B3A' }}>GLOW</div></div>
                      <div className={`text-right flex items-center gap-1.5 flex-shrink-0 ${landingChecked.glow ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.glow ? '#9ca3af' : undefined }}>
                        <span className="font-medium text-xs whitespace-nowrap">16 units</span>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#8B5CF6', border: '1px solid rgba(0,0,0,0.12)', opacity: landingChecked.glow ? 0.5 : 1 }} />
                        <Pen className="w-3.5 h-3.5" style={{ color: '#6B7280', opacity: landingChecked.glow ? 0.5 : 1 }} />
                        <button type="button" onClick={() => toggleLandingCheck('glow')} className="w-5 h-5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer touch-manipulation" style={{ borderColor: landingChecked.glow ? '#3d5a4c' : 'rgba(127, 158, 149, 0.4)', backgroundColor: landingChecked.glow ? '#3d5a4c' : 'transparent', borderRadius: '4px', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.12)', WebkitTapHighlightColor: 'transparent' }} title={landingChecked.glow ? 'Mark incomplete' : 'Mark complete'}>
                          {landingChecked.glow && <Check size={14} className="text-white" style={{ strokeWidth: 2.5 }} />}
                        </button>
                      </div>
                    </li>
                    <li className="flex items-center justify-between gap-2 py-2.5 px-3 min-w-0 transition-all duration-200" style={{ backgroundColor: 'transparent', borderLeft: '3px solid rgba(127, 158, 149, 0.4)', boxShadow: 'none' }}>
                      <div className="flex items-center gap-2 flex-1 min-w-0"><div className={`font-semibold text-sm truncate ${landingChecked.nad ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.nad ? '#9ca3af' : '#2F3B3A' }}>NAD+</div></div>
                      <div className={`text-right flex items-center gap-1.5 flex-shrink-0 ${landingChecked.nad ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.nad ? '#9ca3af' : undefined }}>
                        <span className="font-medium text-xs whitespace-nowrap">10 units</span>
                        <Pipette className="w-3.5 h-3.5" style={{ color: '#6B7280', opacity: landingChecked.nad ? 0.5 : 1 }} />
                        <button type="button" onClick={() => toggleLandingCheck('nad')} className="w-5 h-5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer touch-manipulation" style={{ borderColor: landingChecked.nad ? '#7F9E95' : 'rgba(127, 158, 149, 0.4)', backgroundColor: landingChecked.nad ? '#7F9E95' : 'transparent', borderRadius: '4px', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.12)', WebkitTapHighlightColor: 'transparent' }} title={landingChecked.nad ? 'Mark incomplete' : 'Mark complete'}>
                          {landingChecked.nad && <Check size={14} className="text-white" style={{ strokeWidth: 2.5 }} />}
                        </button>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Text + Button - Mobile */}
            <div className="flex flex-col items-center">
              <p className="text-xs font-medium tracking-wider uppercase text-center mb-3" style={{ color: '#6B7D7A' }}>
                Your Research, Organized and Simplified
              </p>
              <button
                onClick={handleSignIn}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center group btn-primary-inset"
                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6b8b78'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7F9E95'}
              >
                Get Started
                <Pen className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
              </button>
            </div>
            
            {/* Built by researcher chip - Mobile */}
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#F4E4D6', color: '#B8860B' }}>
              <HeartHandshake className="w-3 h-3 mr-1 flex-shrink-0" />
              Built by researcher
            </div>
          </div>

          {/* Desktop Layout - Side by Side */}
          <div className="hidden md:grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left Side - Text Content */}
            <div className="flex flex-col h-full justify-between">
               {/* Section 1: Welcome Heading - Desktop Only */}
               <div className="flex flex-1 items-center justify-center mb-8 lg:mb-12 w-full">
<h1 className="font-bold leading-tight text-center" style={{ color: '#7F9E95', fontFamily: 'Poppins, sans-serif' }}>
                  <span className="block text-xl md:text-2xl lg:text-3xl mb-1">Welcome to your</span>
                  <span className="block text-4xl md:text-5xl lg:text-7xl whitespace-nowrap" style={{ color: '#1F2B2A' }}>Pep Planner!</span>
                </h1>
               </div>
               
               {/* Section 2: Blueprint Text - Desktop Only */}
               <div className="flex flex-1 items-center justify-center mb-8 lg:mb-12">
                 <p className="text-base lg:text-lg font-medium tracking-wider uppercase text-center" style={{ color: '#6B7D7A' }}>
                   <span className="block lg:hidden">YOUR RESEARCH,<br />ORGANIZED AND SIMPLIFIED</span>
                   <span className="hidden lg:block">YOUR RESEARCH, ORGANIZED AND SIMPLIFIED</span>
                 </p>
               </div>

             {/* Section 4: Button - Desktop Only */}
             <div className="flex flex-col items-center justify-center flex-1">
              <button
                onClick={handleSignIn}
                className="px-3 md:px-7 lg:px-10 py-2 md:py-3.5 lg:py-5 rounded-lg text-xs md:text-lg lg:text-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center group btn-primary-inset"
                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
                 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6b8b78'}
                 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7F9E95'}
               >
                 Get Started
                 <Pen className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 ml-1 md:ml-2 group-hover:scale-110 transition-transform" />
               </button>
             </div>
            </div>

           {/* Right Side - Today's Research Visual (TasksWidget/TasksList UI) */}
           <div className="flex justify-end items-center landing-todays-research-animate">
              <div className="w-full max-w-sm md:max-w-md">
                <div className="rounded-xl glass-panel-depth widget-card-hover overflow-hidden">
                  {/* Header with separator line (same as TasksWidget) */}
                  <div className="px-4 py-3 flex-shrink-0 relative z-10 widget-separator" style={{ borderColor: 'rgba(47, 59, 58, 0.15)', background: 'linear-gradient(135deg, rgba(127, 158, 149, 0.08), rgba(127, 158, 149, 0.03))' }}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold flex items-center gap-2 truncate" style={{ color: '#2F3B3A' }}>Today's Research</h3>
                      <CheckSquare className="w-5 h-5 flex-shrink-0" style={{ color: '#7F9E95' }} />
                    </div>
                  </div>
                  {/* List - line break between header and first row via widget-separator above */}
                  <div className="p-2 sm:p-4">
                    <ul className="space-y-1.5 sm:space-y-2">
                      <li className="flex items-center justify-between gap-2 py-2.5 sm:py-3 px-3 min-w-0 transition-all duration-200" style={{ backgroundColor: 'transparent', borderLeft: '3px solid rgba(127, 158, 149, 0.4)', boxShadow: '0 1px 0 rgba(127, 158, 149, 0.08)' }}>
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0"><div className={`font-semibold text-xs sm:text-sm truncate ${landingChecked.b12 ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.b12 ? '#9ca3af' : '#2F3B3A' }}>B12</div></div>
                        <div className={`text-right flex items-center gap-1 sm:gap-2 flex-shrink-0 ${landingChecked.b12 ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.b12 ? '#9ca3af' : undefined }}>
                          <span className="font-medium text-xs sm:text-sm whitespace-nowrap">1mL</span>
                          <Pipette className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#6B7280', opacity: landingChecked.b12 ? 0.5 : 1 }} />
                          <button type="button" onClick={() => toggleLandingCheck('b12')} className="w-5 h-5 sm:w-6 sm:h-6 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer touch-manipulation" style={{ borderColor: landingChecked.b12 ? '#7F9E95' : 'rgba(127, 158, 149, 0.4)', backgroundColor: landingChecked.b12 ? '#7F9E95' : 'transparent', borderRadius: '4px', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.12)', WebkitTapHighlightColor: 'transparent' }} title={landingChecked.b12 ? 'Mark incomplete' : 'Mark complete'}>
                            {landingChecked.b12 && <Check size={14} className="sm:w-[18px] sm:h-[18px] text-white" style={{ strokeWidth: 2.5 }} />}
                          </button>
                        </div>
                      </li>
                      <li className="flex items-center justify-between gap-2 py-2.5 sm:py-3 px-3 min-w-0 transition-all duration-200" style={{ backgroundColor: 'transparent', borderLeft: '3px solid rgba(75, 95, 88, 0.5)', boxShadow: '0 1px 0 rgba(127, 158, 149, 0.08)' }}>
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0"><div className={`font-semibold text-xs sm:text-sm truncate ${landingChecked.glow ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.glow ? '#9ca3af' : '#2F3B3A' }}>GLOW</div></div>
                        <div className={`text-right flex items-center gap-1 sm:gap-2 flex-shrink-0 ${landingChecked.glow ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.glow ? '#9ca3af' : undefined }}>
                          <span className="font-medium text-xs sm:text-sm whitespace-nowrap">16 units</span>
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#8B5CF6', border: '1px solid rgba(0,0,0,0.12)', opacity: landingChecked.glow ? 0.5 : 1 }} />
                          <Pen className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#6B7280', opacity: landingChecked.glow ? 0.5 : 1 }} />
                          <button type="button" onClick={() => toggleLandingCheck('glow')} className="w-5 h-5 sm:w-6 sm:h-6 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer touch-manipulation" style={{ borderColor: landingChecked.glow ? '#3d5a4c' : 'rgba(127, 158, 149, 0.4)', backgroundColor: landingChecked.glow ? '#3d5a4c' : 'transparent', borderRadius: '4px', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.12)', WebkitTapHighlightColor: 'transparent' }} title={landingChecked.glow ? 'Mark incomplete' : 'Mark complete'}>
                            {landingChecked.glow && <Check size={14} className="sm:w-[18px] sm:h-[18px] text-white" style={{ strokeWidth: 2.5 }} />}
                          </button>
                        </div>
                      </li>
                      <li className="flex items-center justify-between gap-2 py-2.5 sm:py-3 px-3 min-w-0 transition-all duration-200" style={{ backgroundColor: 'transparent', borderLeft: '3px solid rgba(127, 158, 149, 0.4)', boxShadow: 'none' }}>
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0"><div className={`font-semibold text-xs sm:text-sm truncate ${landingChecked.nad ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.nad ? '#9ca3af' : '#2F3B3A' }}>NAD+</div></div>
                        <div className={`text-right flex items-center gap-1 sm:gap-2 flex-shrink-0 ${landingChecked.nad ? 'line-through decoration-2' : ''}`} style={{ color: landingChecked.nad ? '#9ca3af' : undefined }}>
                          <span className="font-medium text-xs sm:text-sm whitespace-nowrap">10 units</span>
                          <Pipette className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#6B7280', opacity: landingChecked.nad ? 0.5 : 1 }} />
                          <button type="button" onClick={() => toggleLandingCheck('nad')} className="w-5 h-5 sm:w-6 sm:h-6 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer touch-manipulation" style={{ borderColor: landingChecked.nad ? '#7F9E95' : 'rgba(127, 158, 149, 0.4)', backgroundColor: landingChecked.nad ? '#7F9E95' : 'transparent', borderRadius: '4px', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.12)', WebkitTapHighlightColor: 'transparent' }} title={landingChecked.nad ? 'Mark incomplete' : 'Mark complete'}>
                            {landingChecked.nad && <Check size={14} className="sm:w-[18px] sm:h-[18px] text-white" style={{ strokeWidth: 2.5 }} />}
                          </button>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {/* Built by researcher chip - Desktop Only */}
                <div className="flex justify-center mt-8">
                  <div className="inline-flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full text-sm font-medium"
                    style={{ backgroundColor: '#F4E4D6', color: '#B8860B' }}>
                    <HeartHandshake className="w-4 h-4 mr-2 flex-shrink-0" />
                    Built by a fellow researcher.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-6" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              Download the App
            </h2>
            <p className="text-lg" style={{ color: '#6B7D7A' }}>
              {isIOS() ? 'Available on iOS and Web.' : 'Available on iOS, Android, and Web.'}
            </p>
          </div>
          
          <div className="grid grid-cols-3 sm:flex sm:flex-row gap-3 sm:gap-6 justify-center items-center">
            {/* Apple App Store Button */}
            <button 
              className="inline-block transition-transform hover:scale-105"
              onClick={() => setShowIOSPopup(true)}
            >
              <div 
                className="flex items-center justify-center px-1 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-lg btn-primary-inset"
                style={{ backgroundColor: '#4c6b52' }}
              >
                <Apple className="w-6 h-6 sm:w-8 sm:h-8 text-white mr-2 sm:mr-4" />
                <div className="text-white text-center">
                  <div className="text-[10px] sm:text-xs font-medium">Download on the</div>
                  <div className="text-[12px] sm:text-lg font-semibold">App Store</div>
                </div>
              </div>
            </button>

            {!isIOS() && (
            <a 
              href="https://play.google.com/store/apps/details?id=com.thepepplanner.app" 
              className="inline-block transition-transform hover:scale-105"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div 
                className="flex items-center justify-center px-1 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-lg btn-primary-inset"
                style={{ backgroundColor: '#364b3d' }}
              >
                <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white mr-2 sm:mr-4" />
                <div className="text-white text-center">
                  <div className="text-[10px] sm:text-xs font-medium">GET IT ON</div>
                  <div className="text-[12px] sm:text-lg font-semibold">Google Play</div>
                </div>
              </div>
            </a>
            )}

            {/* Web Access Button */}
            <button 
              onClick={handleSignIn}
              className="inline-block transition-transform hover:scale-105"
            >
              <div 
                className="flex items-center justify-center px-1 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-lg cursor-pointer btn-primary-inset"
                style={{ backgroundColor: '#2d3d34' }}
              >
                <Monitor className="w-6 h-6 sm:w-8 sm:h-8 text-white mr-2 sm:mr-4" />
                <div className="text-white text-center">
                  <div className="text-[10px] sm:text-xs font-medium">Access via</div>
                  <div className="text-[12px] sm:text-lg font-semibold">Web</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-6" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              <span className="block">Time to ditch the spreadsheets.</span>
              <span className="block text-lg sm:text-xl font-normal mt-1" style={{ color: '#4A5A56' }}>And welcome your new research tool!</span>
            </h2>
          </div>
          
          {/* Protocols — star of the show */}
          <div 
            className="mb-10 rounded-2xl p-6 sm:p-8 md:p-10 md:max-w-4xl md:mx-auto"
            style={{ backgroundColor: '#FFFFFF', border: '2px solid #DDE6DE', boxShadow: '0 4px 20px rgba(127, 158, 149, 0.12)' }}
          >
            {/* Icon + title aligned on same row */}
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95', boxShadow: '0 3px 10px rgba(127, 158, 149, 0.3)' }}>
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: '#FFFFFF' }} />
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold m-0" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
                Protocols<br />
                The heart of your research
              </h3>
            </div>
            <p className="text-sm sm:text-base leading-relaxed mb-5" style={{ color: '#4A5A56' }}>
              Keep your dedicated info in one spot. Schedule your next research protocol—doses, timing, notes—and let the app do the rest. One place to plan, track, and stay on top of every run.
            </p>
            {/* What you can do — clear visual hierarchy */}
            <div className="pt-4 border-t" style={{ borderColor: 'rgba(127, 158, 149, 0.2)' }}>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
                What you can do that others can&apos;t
              </h4>
              <ul className="space-y-2.5 text-sm pl-1" style={{ color: '#4A5A56', listStyle: 'none' }}>
                <li className="flex gap-2 items-baseline">
                  <span className="text-[#7F9E95] font-bold flex-shrink-0" style={{ lineHeight: 1.4 }}>•</span>
                  <span><strong style={{ color: '#2F3B3A' }}>Titration scheduling</strong> — plan multi-phase dose changes and stay on track.</span>
                </li>
                <li className="flex gap-2 items-baseline">
                  <span className="text-[#7F9E95] font-bold flex-shrink-0" style={{ lineHeight: 1.4 }}>•</span>
                  <span>Need to take a break on increasing? <strong style={{ color: '#2F3B3A' }}>Hold your current dosage</strong> and resume when you need to increase dose again.</span>
                </li>
                <li className="flex gap-2 items-baseline">
                  <span className="text-[#7F9E95] font-bold flex-shrink-0" style={{ lineHeight: 1.4 }}>•</span>
                  <span><strong style={{ color: '#2F3B3A' }}>Half-life tracking</strong> — so you and your calendar stay in the know.</span>
                </li>
                <li className="flex gap-2 items-baseline">
                  <span className="text-[#7F9E95] font-bold flex-shrink-0" style={{ lineHeight: 1.4 }}>•</span>
                  <span><strong style={{ color: '#2F3B3A' }}>Delivery methods</strong> — Love your Savvio? Pens, syringes, nasal, and more.</span>
                </li>
                <li className="flex gap-2 items-baseline">
                  <span className="text-[#7F9E95] font-bold flex-shrink-0" style={{ lineHeight: 1.4 }}>•</span>
                  <span><strong style={{ color: '#2F3B3A' }}>Washout periods</strong> — visualized so you know when you&apos;re clear.</span>
                </li>
                <li className="flex gap-2 items-baseline">
                  <span className="text-[#7F9E95] font-bold flex-shrink-0" style={{ lineHeight: 1.4 }}>•</span>
                  <span><strong style={{ color: '#2F3B3A' }}>Custom reminders for each protocol!</strong></span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h3 className="text-base sm:text-xl font-semibold" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              Plus the rest of your toolkit:
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="text-center p-6 rounded-xl"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDE6DE' }}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" 
                  style={{ backgroundColor: '#7F9E95' }}>
                  <feature.icon className="w-8 h-8" style={{ color: '#FFFFFF' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
                  {feature.title}
                </h3>
                <p 
                  className="text-sm" 
                  style={{ color: '#6B7D7A' }}
                  dangerouslySetInnerHTML={{
                    __html: feature.boldText ? 
                      feature.description.replace(feature.boldText, `<strong>${feature.boldText}</strong>`) :
                      feature.description
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12" style={{ backgroundColor: '#6b8b78' }}>
        <div className="w-full text-center px-3 md:max-w-4xl md:mx-auto md:px-8">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
            Ready to Organize Your Research?
          </h2>
          <button
            onClick={handleSignIn}
            className="px-7 sm:px-10 py-3.5 sm:py-5 rounded-lg text-lg sm:text-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center mx-auto group btn-primary-inset"
            style={{ backgroundColor: '#FFFFFF', color: '#7F9E95' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            Get Started
            <Pen className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="py-8" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              Plus So Much More
            </h2>
            <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: '#6B7D7A' }}>
              We’ve packed the app with the tools researchers actually use—and we keep adding more.
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6 md:max-w-4xl md:mx-auto">
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                <Calculator className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>Peptide Calculator</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  Dosage information, delivery methods, vial visuals, and pen dosing—all in one place.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                <FileText className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>Imports</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  Bring your existing data in—no need to start from scratch. Get up and running with a full picture from day one.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>Calendar & Day View</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  Month, week, or day—visualize your research schedule, washouts, and upcoming orders at a glance.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>Research Analytics</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  Spending, trends, delivery times, and insights—so you can see patterns and optimize.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                <Star className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>Goals & Wishlists</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  Set research goals and track progress, plus save peptides and items to wishlists for later.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                <Layers className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>One Place for Everything</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  Protocols, orders, stockpile, calendar, and analytics—your whole research workflow in one app.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
      
      {/* Contact Modal */}
      <LandingContactModal open={showContact} onClose={() => setShowContact(false)} />
      
      {/* iOS App Available Popup */}
      {showIOSPopup && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
          onClick={() => setShowIOSPopup(false)}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl transform animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: '#B8A99A' }}>
                  <Apple className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: '#2F3B3A' }}>
                Now Available on iOS!
              </h3>
              <p className="text-base mb-6" style={{ color: '#6B7D7A' }}>
                <strong>The Pep Planner</strong> is available on the App Store. 
                Download now and start organizing your peptide research!
              </p>
              <button
                onClick={() => setShowIOSPopup(false)}
                className="w-full px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg btn-primary-inset"
                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}