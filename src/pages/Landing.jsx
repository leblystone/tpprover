import React from 'react';
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
  Syringe,
  Pen
} from 'lucide-react';
import logo from '../assets/tpp-logo.png';

export default function Landing() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login?trial=true');
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const features = [
    {
      icon: Calendar,
      title: 'Protocol Tracking',
      description: 'Track your research protocols with precision timing and detailed logging'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Visualize your progress with comprehensive charts and trend analysis'
    },
    {
      icon: Clock,
      title: 'Smart Reminders',
      description: 'Never miss a dose with intelligent scheduling and notifications'
    },
    {
      icon: FlaskConical,
      title: 'Research Notes',
      description: 'Document observations, side effects, and research findings'
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
            <h1 className="text-xs font-medium tracking-wider" style={{ color: '#5C7659', fontFamily: 'Poppins, sans-serif' }}>Organize Your Research</h1>
            <img src={logo} alt="Logo" className="rounded-full shadow object-cover" style={{ width: '48px', height: '48px' }} />
            <button
              onClick={handleGetStarted}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
            >
              Get Started
            </button>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex items-center justify-between">
            <h1 className="text-sm font-bold tracking-widest uppercase" style={{ color: '#5C7659', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.15em' }}>Organize Your Research</h1>
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

      {/* Hero Section */}
      <section className="py-12 md:py-20" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:gap-8 lg:gap-12 items-center">
            {/* Left Side - Text Content */}
            <div className="space-y-4 md:space-y-6 lg:space-y-8 text-left">
              <div className="space-y-2 md:space-y-4 lg:space-y-6">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-bold leading-tight" style={{ color: '#7F9E95', fontFamily: 'Poppins, sans-serif' }}>
                  Welcome to your <span style={{ color: '#1F2B2A' }}>Pep Planner</span>!
                </h1>
                
                <p className="text-xs md:text-base lg:text-lg font-medium tracking-wider uppercase text-center" style={{ color: '#6B7D7A' }}>
                  THE NEW LOOK
                </p>
              </div>

              <div className="flex flex-col items-center space-y-2 md:space-y-4">
                <button
                  onClick={handleGetStarted}
                  className="px-3 md:px-6 lg:px-8 py-2 md:py-3 lg:py-4 rounded-lg text-sm md:text-base lg:text-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center group"
                  style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
                >
                  Try it out!
                  <ArrowRight className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 ml-1 md:ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-center" style={{ color: '#6B7D7A' }}>
                  <span className="hidden sm:inline">Full research access • No payment needed</span>
                </div>
                
                <div className="inline-flex items-center gap-1 md:gap-2 px-2 md:px-3 lg:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-medium"
                  style={{ backgroundColor: '#E57A44', color: '#FFFFFF' }}>
                  <Heart className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Built by a fellow researcher.</span>
                  <span className="sm:hidden">Built by researcher</span>
                </div>
              </div>
            </div>

            {/* Right Side - Today's Research Visual */}
            <div className="flex justify-end">
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
                        <Syringe className="w-3 h-3 md:w-4 md:h-4 transition-colors duration-200 hover:text-green-600" style={{ color: '#6B7280' }} />
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
                        <Syringe className="w-3 h-3 md:w-4 md:h-4 transition-colors duration-200 hover:text-green-600" style={{ color: '#6B7280' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-12" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              Download the App
            </h2>
            <p className="text-lg" style={{ color: '#6B7D7A' }}>
              Available on iOS, Android, and Web
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            {/* Apple App Store Button */}
            <a 
              href="#" 
              className="inline-block transition-transform hover:scale-105"
              onClick={(e) => e.preventDefault()}
            >
              <div 
                className="flex items-center px-6 py-3 rounded-lg shadow-lg"
                style={{ backgroundColor: '#000000' }}
              >
                <Apple className="w-8 h-8 text-white mr-4" />
                <div className="text-white">
                  <div className="text-xs font-medium">Download on the</div>
                  <div className="text-lg font-semibold">App Store</div>
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
                className="flex items-center px-6 py-3 rounded-lg shadow-lg"
                style={{ backgroundColor: '#000000' }}
              >
                <Play className="w-8 h-8 text-white mr-4" />
                <div className="text-white">
                  <div className="text-xs font-medium">GET IT ON</div>
                  <div className="text-lg font-semibold">Google Play</div>
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
                className="flex items-center px-6 py-3 rounded-lg shadow-lg"
                style={{ backgroundColor: '#000000' }}
              >
                <Monitor className="w-8 h-8 text-white mr-4" />
                <div className="text-white">
                  <div className="text-xs font-medium">Access via</div>
                  <div className="text-lg font-semibold">Web Browser</div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              It's just like your Research Planner, just smarter.
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#6B7D7A' }}>
              Built with the same attention to detail as the physical planner
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                <p className="text-sm" style={{ color: '#6B7D7A' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ backgroundColor: '#7F9E95' }}>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-4" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8" style={{ color: '#FFFFFF', opacity: 0.9 }}>
            Experience the digital evolution of the research planner you trust
          </p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center mx-auto group"
            style={{ backgroundColor: '#FFFFFF', color: '#7F9E95' }}
          >
            Try it out!
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm mt-4" style={{ color: '#FFFFFF', opacity: 0.8 }}>
            Full access • No credit card required • Built by researchers
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" style={{ backgroundColor: '#2F3B3A', borderTop: `1px solid #DDE6DE` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="Logo" className="h-10 w-10 rounded-full shadow object-cover" />
                <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Organize Your Research</h3>
              </div>
              <p className="text-sm" style={{ color: '#A0B9B3' }}>
                Built by researchers, for researchers.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: '#FFFFFF' }}>Product</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#A0B9B3' }}>
                <li><a href="#" className="hover:underline">Features</a></li>
                <li><a href="#" className="hover:underline">Mobile Apps</a></li>
                <li><a href="#" className="hover:underline">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: '#FFFFFF' }}>Support</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#A0B9B3' }}>
                <li><a href="#" className="hover:underline">Help Center</a></li>
                <li><a href="#" className="hover:underline">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: '#FFFFFF' }}>Legal</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#A0B9B3' }}>
                <li><a href="#" className="hover:underline">Privacy Policy</a></li>
                <li><a href="#" className="hover:underline">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8" style={{ borderColor: '#DDE6DE' }}>
            <p className="text-center text-sm" style={{ color: '#A0B9B3' }}>
              © 2024 The Pep Planner. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}