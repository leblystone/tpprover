import React, { useState, useEffect, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Check, 
  CheckCircle,
  Star, 
  Heart, 
  Smartphone, 
  Tablet, 
  Monitor, 
  FlaskConical, 
  Calendar, 
  BarChart3, 
  Clock, 
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
  Layers
} from 'lucide-react';
import logo from '../assets/tpp_logo.png';
import LandingTermsModal from '../components/legal/LandingTermsModal';
import LandingPrivacyModal from '../components/legal/LandingPrivacyModal';
import LandingContactModal from '../components/legal/LandingContactModal';

export default function Landing() {
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);
  
  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Calculate time left until October 23, 2025 at midnight
  useEffect(() => {
    const calculateTimeLeft = () => {
      // Set target to October 23, 2025 at midnight local time
      const targetDate = new Date(2025, 9, 23, 0, 0, 0, 0); // Month is 0-indexed, so 9 = October
      const now = new Date();
      const difference = targetDate - now;
      
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };
    
    // Initial calculation
    setTimeLeft(calculateTimeLeft());
    
    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

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
      icon: Calendar,
      title: 'Protocols',
      description: 'Keep your dedicated info in one spot! Schedule your next research protocol and let the app do the rest.'
    },
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

  const platforms = [
    { icon: Apple, name: 'iOS', status: 'Available' },
    { icon: Play, name: 'Android', status: 'Available' },
    { icon: Monitor, name: 'Web', status: 'Available' }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F0' }}>
      {/* Header */}
      <header className="pt-3 pb-3 md:pt-4 md:pb-3" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #DDE6DE' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Layout */}
          <div className="flex lg:hidden items-center justify-between">
            <h1 className="text-[8px] font-bold tracking-widest uppercase" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.15em' }}>Organize Your Research</h1>
            <img src={logo} alt="Logo" className="rounded-full shadow object-cover" style={{ width: '48px', height: '48px' }} />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSignIn}
                className="px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: '#7F9E95', backgroundColor: 'transparent' }}
              >
                Log In
              </button>
              <button
                onClick={handleGetStarted}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex items-center justify-between">
            <h1 className="text-sm font-medium tracking-widest uppercase" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.15em' }}>Organize Your Research</h1>
            <div className="flex-1 flex justify-center">
              <img src={logo} alt="Logo" className="rounded-full shadow object-cover" style={{ width: '80px', height: '80px' }} />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSignIn}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ color: '#7F9E95', backgroundColor: 'transparent' }}
              >
                Log In
              </button>
              <button
                onClick={handleGetStarted}
                className="px-6 py-2 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Countdown Banner */}
      <div className="py-3 md:py-4" style={{ backgroundColor: '#7F9E95' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
            <p className="text-xs md:text-sm font-semibold uppercase tracking-wider" style={{ color: '#FFFFFF' }}>
              Launch Countdown
            </p>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex flex-col items-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: '#FFFFFF' }}>
                  {String(timeLeft.days).padStart(2, '0')}
                </div>
                <div className="text-[10px] md:text-xs uppercase tracking-wide" style={{ color: '#E0E7E4' }}>
                  Days
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold" style={{ color: '#FFFFFF' }}>:</div>
              <div className="flex flex-col items-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: '#FFFFFF' }}>
                  {String(timeLeft.hours).padStart(2, '0')}
                </div>
                <div className="text-[10px] md:text-xs uppercase tracking-wide" style={{ color: '#E0E7E4' }}>
                  Hours
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold" style={{ color: '#FFFFFF' }}>:</div>
              <div className="flex flex-col items-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: '#FFFFFF' }}>
                  {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                <div className="text-[10px] md:text-xs uppercase tracking-wide" style={{ color: '#E0E7E4' }}>
                  Minutes
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold" style={{ color: '#FFFFFF' }}>:</div>
              <div className="flex flex-col items-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: '#FFFFFF' }}>
                  {String(timeLeft.seconds).padStart(2, '0')}
                </div>
                <div className="text-[10px] md:text-xs uppercase tracking-wide" style={{ color: '#E0E7E4' }}>
                  Seconds
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

       {/* Hero Section */}
       <section className="py-12 md:py-20" style={{ backgroundColor: '#EFF2EE' }}>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           {/* Mobile Title Section - Single Column */}
           <div className="text-center mb-8 md:hidden">
             <h1 className="text-4xl font-bold leading-tight" style={{ color: '#7F9E95', fontFamily: 'Inter, sans-serif' }}>
               <span className="block text-3xl">Welcome to your</span> <span className="block whitespace-nowrap text-5xl" style={{ color: '#1F2B2A' }}>Pep Planner!</span>
             </h1>
           </div>
           
           <div className="grid grid-cols-2 gap-4 md:gap-8 lg:gap-12 items-start">
             {/* Left Side - Text Content */}
             <div className="flex flex-col h-full justify-between">
               {/* Section 1: Welcome Heading - Desktop Only */}
               <div className="hidden md:flex flex-1 items-center mb-8 lg:mb-12">
                 <h1 className="text-3xl md:text-4xl lg:text-6xl xl:text-7xl font-bold leading-none sm:leading-tight text-center" style={{ color: '#7F9E95', fontFamily: 'Inter, sans-serif' }}>
                   <span className="text-xl md:text-2xl lg:text-4xl xl:text-5xl">Welcome to your</span> <span className="text-3xl md:text-4xl lg:text-6xl xl:text-7xl whitespace-nowrap" style={{ color: '#1F2B2A' }}>Pep Planner</span>!
                 </h1>
               </div>
               
               {/* Section 2: Blueprint Text - Desktop Only */}
               <div className="hidden md:flex flex-1 items-center justify-center mb-8 lg:mb-12">
                 <p className="text-base lg:text-lg font-medium tracking-wider uppercase text-center" style={{ color: '#6B7D7A' }}>
                   <span className="block lg:hidden">THE NEW BLUEPRINT<br />FOR YOUR RESEARCH</span>
                   <span className="hidden lg:block">THE NEW BLUEPRINT FOR YOUR RESEARCH</span>
                 </p>
               </div>

               {/* Section 3: Blueprint Text - Mobile Only (even spacing) */}
               <div className="md:hidden flex-1 flex items-center justify-center">
                 <p className="text-sm font-medium tracking-wider uppercase text-center" style={{ color: '#6B7D7A', lineHeight: '1.8' }}>
                   <span className="block">THE NEW BLUEPRINT</span>
                   <span className="block">FOR YOUR RESEARCH</span>
                 </p>
               </div>

               {/* Section 4: Button and Access Text */}
               <div className="flex-1 flex flex-col items-center justify-center space-y-2 md:space-y-6 lg:space-y-8 -mt-4 md:mt-0">
                <button
                  onClick={handleGetStarted}
                  className="px-3 md:px-6 lg:px-8 py-2 md:py-3 lg:py-4 rounded-lg text-sm md:text-base lg:text-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center group"
                  style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
                >
                  Try it out!
                  <ArrowRight className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 ml-1 md:ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-center" style={{ color: '#6B7D7A' }}>
                  <span className="block sm:hidden">
                    Full 7-day research access
                  </span>
                  <span className="hidden sm:inline">Full 7-day research access</span>
                </div>
              </div>
            </div>

            {/* Right Side - Today's Research Visual */}
            <div className="flex justify-end items-center">
              <div className="w-full max-w-sm md:max-w-md">
                {/* Today's Research Card */}
                <div className="p-4 md:p-6 rounded-lg md:rounded-xl shadow-lg md:shadow-2xl" style={{ backgroundColor: '#FFFFFF' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 md:mb-6">
                    <h3 className="text-sm md:text-xl font-semibold" style={{ color: '#2F3B3A' }}>Today's Research</h3>
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#7F9E95' }}>
                      <CheckCircle className="w-3 h-3 md:w-5 md:h-5" style={{ color: '#FFFFFF' }} />
                    </div>
                  </div>
                  
                  {/* Research Items */}
                  <div className="space-y-2 md:space-y-4">
                    <div className="flex items-center justify-between p-2 md:p-3 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02]" style={{ backgroundColor: '#F8F9FA' }}>
                      <div className="flex items-center space-x-2 md:space-x-4">
                        <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 cursor-pointer transition-all duration-200 hover:scale-110 hover:border-green-600 flex items-center justify-center group" style={{ backgroundColor: '#FFFFFF', borderColor: '#DDE6DE' }}>
                          <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100" style={{ backgroundColor: '#7F9E95' }}></div>
                        </div>
                        <div className="text-sm md:text-base font-semibold" style={{ color: '#2F3B3A' }}>B12</div>
                      </div>
                      <div className="flex items-center space-x-1 md:space-x-2">
                        <div className="text-xs md:text-sm" style={{ color: '#4A5A56' }}>1mL</div>
                        <Pipette className="w-3 h-3 md:w-4 md:h-4 transition-colors duration-200 hover:text-green-600" style={{ color: '#6B7280' }} />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 md:p-3 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02]" style={{ backgroundColor: '#F8F9FA' }}>
                      <div className="flex items-center space-x-2 md:space-x-4">
                        <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 cursor-pointer transition-all duration-200 hover:scale-110 hover:border-green-600 flex items-center justify-center group" style={{ backgroundColor: '#FFFFFF', borderColor: '#DDE6DE' }}>
                          <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100" style={{ backgroundColor: '#5F7F76' }}></div>
                        </div>
                        <div className="text-sm md:text-base font-semibold" style={{ color: '#2F3B3A' }}>GLOW</div>
                      </div>
                      <div className="flex items-center space-x-1 md:space-x-2">
                        <div className="text-xs md:text-sm" style={{ color: '#4A5A56' }}>16 units</div>
                          <div className="flex items-center space-x-1">
                            <div className="relative cursor-pointer group">
                              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg" style={{ backgroundColor: '#8B5CF6' }}></div>
                              <div className="absolute inset-0 w-2 h-2 md:w-3 md:h-3 rounded-full bg-gradient-to-br from-white/30 to-transparent transition-opacity duration-200 group-hover:from-white/50"></div>
                            </div>
                            <Pen className="w-3 h-3 md:w-4 md:h-4 transition-colors duration-200 hover:text-purple-600" style={{ color: '#6B7280' }} />
                          </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 md:p-3 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02]" style={{ backgroundColor: '#F8F9FA' }}>
                      <div className="flex items-center space-x-2 md:space-x-4">
                        <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 cursor-pointer transition-all duration-200 hover:scale-110 hover:border-green-600 flex items-center justify-center group" style={{ backgroundColor: '#FFFFFF', borderColor: '#DDE6DE' }}>
                          <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100" style={{ backgroundColor: '#7F9E95' }}></div>
                        </div>
                        <div className="text-sm md:text-base font-semibold" style={{ color: '#2F3B3A' }}>NAD+</div>
                      </div>
                      <div className="flex items-center space-x-1 md:space-x-2">
                        <div className="text-xs md:text-sm" style={{ color: '#4A5A56' }}>10 units</div>
                        <Pipette className="w-3 h-3 md:w-4 md:h-4 transition-colors duration-200 hover:text-green-600" style={{ color: '#6B7280' }} />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Built by researcher chip */}
                <div className="flex justify-center mt-8">
                  <div className="inline-flex items-center gap-1 md:gap-2 px-2 md:px-3 lg:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-medium"
                    style={{ backgroundColor: '#F4E4D6', color: '#B8860B' }}>
                    <Heart className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Built by a fellow researcher. ✌️</span>
                    <span className="sm:hidden">Built by researcher ✌️</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-6" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              Download the App
            </h2>
            <p className="text-lg" style={{ color: '#6B7D7A' }}>
              Available on iOS, Android, and Web
            </p>
          </div>
          
          <div className="grid grid-cols-3 sm:flex sm:flex-row gap-3 sm:gap-6 justify-center items-center">
            {/* Apple App Store Button */}
            <a 
              href="#" 
              className="inline-block transition-transform hover:scale-105"
              onClick={(e) => e.preventDefault()}
            >
              <div 
                className="flex items-center justify-center px-1 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-lg"
                style={{ backgroundColor: '#4c6b52' }}
              >
                <Apple className="w-6 h-6 sm:w-8 sm:h-8 text-white mr-2 sm:mr-4" />
                <div className="text-white text-center">
                  <div className="text-[10px] sm:text-xs font-medium">Download on the</div>
                  <div className="text-[12px] sm:text-lg font-semibold">App Store</div>
                </div>
              </div>
            </a>

            {/* Google Play Store Button */}
            <a 
              href="#" 
              className="inline-block transition-transform hover:scale-105"
              onClick={(e) => e.preventDefault()}
            >
              <div 
                className="flex items-center justify-center px-1 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-lg"
                style={{ backgroundColor: '#364b3d' }}
              >
                <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white mr-2 sm:mr-4" />
                <div className="text-white text-center">
                  <div className="text-[10px] sm:text-xs font-medium">GET IT ON</div>
                  <div className="text-[12px] sm:text-lg font-semibold">Google Play</div>
                </div>
              </div>
            </a>

            {/* Web Access Button */}
            <a 
              href="#" 
              className="inline-block transition-transform hover:scale-105"
              onClick={(e) => e.preventDefault()}
            >
              <div 
                className="flex items-center justify-center px-1 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-lg"
                style={{ backgroundColor: '#2d3d34' }}
              >
                <Monitor className="w-6 h-6 sm:w-8 sm:h-8 text-white mr-2 sm:mr-4" />
                <div className="text-white text-center">
                  <div className="text-[10px] sm:text-xs font-medium">Access via</div>
                  <div className="text-[12px] sm:text-lg font-semibold">Web Browser</div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-6" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              <span className="block sm:inline">It's just like your Research Planner,</span> <span className="block sm:inline">just <em>smarter</em>.</span>
            </h2>
          </div>
          
          <div className="text-center mb-8">
            <h3 className="text-base sm:text-xl font-semibold" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              Track your research in areas such as:
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
            Ready to Organize Your Research?
          </h2>
          <button
            onClick={handleGetStarted}
            className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center mx-auto group"
            style={{ backgroundColor: '#FFFFFF', color: '#7F9E95' }}
          >
            Try it out!
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm mt-4" style={{ color: '#FFFFFF', opacity: 0.8 }}>
            Full 7-day research access
          </p>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="py-8" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              Plus So Much More
            </h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6 max-w-4xl mx-auto">
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                <Calculator className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>Peptide Calculator</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  Calculate the next dose with a handy vial visual. Research pens? Pen info shows on the schedule as well.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                <BookOpen className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>Peptide Glossary</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  Built in search for the next research peptide!
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>Monthly & Weekly Calendar</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  Visual your full month or full week of research! View upcoming buys, washout periods, and more.
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
                  Visualize your peptide spending habits, Bio-Metrics, average delivery times, and more.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                <Star className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>Goals & Tracking</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  Set and track your research goals with progress monitoring
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                <Layers className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>All-in-One</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  More than just another shot tracking app. Keep your entire research in one place!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" style={{ backgroundColor: '#2F3B3A', borderTop: `1px solid #DDE6DE` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 md:grid-cols-4 gap-4 md:gap-8">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="Logo" className="h-8 w-8 md:h-10 md:w-10 rounded-full shadow object-cover" />
                <div>
                  <h3 className="text-sm md:text-lg font-semibold" style={{ color: '#FFFFFF' }}>Organize Your Research</h3>
                  <p className="text-xs md:text-sm" style={{ color: '#A0B9B3' }}>
                    All-in-One Research Tool
                  </p>
                </div>
              </div>
            </div>
            <div className="col-span-1">
              <h4 className="text-xs md:text-sm font-semibold mb-2 md:mb-4" style={{ color: '#FFFFFF' }}>Support</h4>
              <ul className="space-y-1 md:space-y-2 text-xs md:text-sm" style={{ color: '#A0B9B3' }}>
                <li><button onClick={() => setShowContact(true)} className="hover:underline">Contact</button></li>
              </ul>
            </div>
            <div className="col-span-1">
              <h4 className="text-xs md:text-sm font-semibold mb-2 md:mb-4" style={{ color: '#FFFFFF' }}>Legal</h4>
              <ul className="space-y-1 md:space-y-2 text-xs md:text-sm" style={{ color: '#A0B9B3' }}>
                <li><button onClick={() => setShowPrivacy(true)} className="hover:underline">Privacy Policy</button></li>
                <li><button onClick={() => setShowTerms(true)} className="hover:underline">Terms of Service</button></li>
              </ul>
            </div>
          </div>
           <div className="border-t mt-8 pt-8" style={{ borderColor: '#DDE6DE' }}>
             <p className="text-center text-sm" style={{ color: '#A0B9B3' }}>
               © {new Date().getFullYear()} The Pep Planner. All rights reserved.
             </p>
             <p className="text-center text-base mt-2" style={{ color: '#D1D9D6', fontFamily: 'Cedarville Cursive, cursive' }}>
               - for the love of research
             </p>
           </div>
        </div>
      </footer>
      
      {/* Terms of Service Modal */}
      <LandingTermsModal open={showTerms} onClose={() => setShowTerms(false)} />
      
      {/* Privacy Policy Modal */}
      <LandingPrivacyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
      
      {/* Contact Modal */}
      <LandingContactModal open={showContact} onClose={() => setShowContact(false)} />
    </div>
  );
}