import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Shield, 
  Target, 
  BarChart3, 
  Calendar,
  FlaskConical,
  Package,
  Star,
  Monitor,
  Smartphone,
  TabletSmartphone,
  Globe,
  Apple,
  Chrome
} from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp-logo.png';

const Landing = () => {
  const navigate = useNavigate();
  const [themeName] = useState(defaultThemeName);
  const theme = themes[themeName];

  const handleGetStarted = () => {
    navigate('/login?trial=true');
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const features = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "Smart Goal Tracking",
      description: "Set and monitor your research objectives with precision"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Advanced Analytics",
      description: "Comprehensive insights to optimize your research"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Research Scheduling",
      description: "Plan and organize activities with ease"
    },
    {
      icon: <FlaskConical className="w-6 h-6" />,
      title: "Protocol Management",
      description: "Store and manage your research protocols"
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Inventory Tracking",
      description: "Keep track of your research materials"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Private",
      description: "Your data protected with enterprise security"
    }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "Research Scientist",
      content: "The Pep Planner transformed how I organize my research. The analytics are incredible!",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "PhD Student",
      content: "Finally, a tool that understands the complexity of research management.",
      rating: 5
    },
    {
      name: "Dr. Emily Watson",
      role: "Lab Director",
      content: "Our team's productivity increased by 40% since using The Pep Planner.",
      rating: 5
    }
  ];

  const platforms = [
    {
      icon: <Monitor className="w-8 h-8" />,
      title: "Web App",
      description: "Access from any browser on desktop or laptop"
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "iOS App",
      description: "Native app for iPhone and iPad"
    },
    {
      icon: <TabletSmartphone className="w-8 h-8" />,
      title: "Android App",
      description: "Native app for Android devices"
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      {/* Navigation */}
      <nav className="border-b" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Left spacer for centering */}
            <div className="flex-1"></div>
            
            {/* Centered Logo */}
            <div className="flex items-center justify-center gap-3">
              <img src={logo} alt="The Pep Planner Logo" className="h-16 w-16 rounded-full shadow-lg object-cover" />
              <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>Organize Your Research</h1>
            </div>
            
            {/* Right-aligned buttons */}
            <div className="flex-1 flex items-center justify-end space-x-4">
              <button
                onClick={handleSignIn}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: theme.primary }}
              >
                Sign In
              </button>
              <button
                onClick={handleGetStarted}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-8 shadow-sm" 
              style={{ backgroundColor: theme.successBg, color: theme.success }}>
              <Clock className="w-4 h-4 mr-2" />
              Experience Full Access for 7 Days
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Organize Your Research
              <span className="block mt-2" style={{ color: theme.primary }}>Like Never Before</span>
            </h1>
            
            <p className="text-xl mb-12 max-w-3xl mx-auto" style={{ color: theme.textLight }}>
              The comprehensive research management platform designed for scientists, 
              students, and researchers who demand organization and results.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center group"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                Start Your 7-Day Experience
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="text-sm" style={{ color: theme.textLight }}>
              <CheckCircle className="w-4 h-4 inline mr-1" style={{ color: theme.success }} />
              Full access to all features • No credit card required
            </div>
          </div>

          {/* App Mockup */}
          <div className="max-w-5xl mx-auto">
            <div className="rounded-xl shadow-2xl overflow-hidden border-2" 
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              {/* Mock Browser Bar */}
              <div className="px-4 py-3 border-b flex items-center gap-2" style={{ backgroundColor: theme.secondary, borderColor: theme.border }}>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF5F57' }}></div>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FEBC2E' }}></div>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#28C840' }}></div>
                </div>
                <div className="flex-1 mx-4 px-3 py-1 rounded text-xs" style={{ backgroundColor: theme.background, color: theme.textLight }}>
                  app.thepepplanner.com/protocols
                </div>
              </div>
              
              {/* Mock App Content - Protocol Example */}
              <div className="p-6" style={{ backgroundColor: theme.background }}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1" style={{ color: theme.primaryDark }}>BPC-157 Protocol</h2>
                    <p className="text-sm" style={{ color: theme.textLight }}>Tissue Repair & Recovery • 4 Weeks</p>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold" 
                    style={{ backgroundColor: theme.successBg, color: theme.success }}>
                    Active
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
                    <div className="text-xs mb-1" style={{ color: theme.textLight }}>Dosage</div>
                    <div className="text-lg font-semibold" style={{ color: theme.text }}>500mcg</div>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
                    <div className="text-xs mb-1" style={{ color: theme.textLight }}>Frequency</div>
                    <div className="text-lg font-semibold" style={{ color: theme.text }}>2x Daily</div>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
                    <div className="text-xs mb-1" style={{ color: theme.textLight }}>Progress</div>
                    <div className="text-lg font-semibold" style={{ color: theme.success }}>Day 18 of 28</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-2" style={{ color: theme.text }}>Schedule</div>
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg border flex items-center justify-between" 
                      style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5" style={{ color: theme.success }} />
                        <div>
                          <div className="text-sm font-medium" style={{ color: theme.text }}>Morning Dose</div>
                          <div className="text-xs" style={{ color: theme.textLight }}>8:00 AM • 500mcg</div>
                        </div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.successBg, color: theme.success }}>
                        Completed
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border flex items-center justify-between" 
                      style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5" style={{ color: theme.primary }} />
                        <div>
                          <div className="text-sm font-medium" style={{ color: theme.text }}>Evening Dose</div>
                          <div className="text-xs" style={{ color: theme.textLight }}>8:00 PM • 500mcg</div>
                        </div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.infoBg, color: theme.info }}>
                        Scheduled
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: theme.textLight }}>Track progress, manage inventory, and more...</span>
                    <button className="px-4 py-2 rounded-lg font-medium" 
                      style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                      View Full Protocol
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20" style={{ backgroundColor: theme.cardBackground }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: theme.primaryDark }}>
              Everything You Need for Research Success
            </h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: theme.textLight }}>
              Powerful tools designed specifically for researchers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="p-6 rounded-xl shadow-sm transition-shadow hover:shadow-md"
                style={{ backgroundColor: theme.cardBackground, borderColor: theme.border, border: '1px solid' }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4" 
                  style={{ backgroundColor: theme.secondary, color: theme.primary }}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                  {feature.title}
                </h3>
                <p style={{ color: theme.textLight }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Availability Section */}
      <section className="py-20" style={{ backgroundColor: theme.background }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: theme.primaryDark }}>
              Access Anywhere, Anytime
            </h2>
            <p className="text-xl" style={{ color: theme.textLight }}>
              Available on all your devices
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {platforms.map((platform, index) => (
              <div 
                key={index} 
                className="p-8 rounded-xl shadow-sm text-center transition-shadow hover:shadow-md"
                style={{ backgroundColor: theme.cardBackground, borderColor: theme.border, border: '1px solid' }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                  style={{ backgroundColor: theme.secondary, color: theme.primary }}>
                  {platform.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text }}>
                  {platform.title}
                </h3>
                <p style={{ color: theme.textLight }}>
                  {platform.description}
                </p>
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-sm mb-4" style={{ color: theme.textLight }}>
              Seamlessly sync your data across all platforms
            </p>
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-2" style={{ color: theme.textLight }}>
                <Chrome className="w-5 h-5" />
                <span className="text-sm">Chrome, Firefox, Safari</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: theme.textLight }}>
                <Apple className="w-5 h-5" />
                <span className="text-sm">iOS 14+</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: theme.textLight }}>
                <Smartphone className="w-5 h-5" />
                <span className="text-sm">Android 8+</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20" style={{ backgroundColor: theme.cardBackground }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: theme.primaryDark }}>
              Get Started in Minutes
            </h2>
            <p className="text-xl" style={{ color: theme.textLight }}>
              Join researchers already using The Pep Planner
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold mb-6 shadow-sm"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                1
              </div>
              <h3 className="text-xl font-semibold mb-4" style={{ color: theme.text }}>
                Create Account
              </h3>
              <p style={{ color: theme.textLight }}>
                Sign up in seconds with no credit card required
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold mb-6 shadow-sm"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                2
              </div>
              <h3 className="text-xl font-semibold mb-4" style={{ color: theme.text }}>
                Explore Platform
              </h3>
              <p style={{ color: theme.textLight }}>
                Full access to all premium features for 7 days
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold mb-6 shadow-sm"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                3
              </div>
              <h3 className="text-xl font-semibold mb-4" style={{ color: theme.text }}>
                Continue Research
              </h3>
              <p style={{ color: theme.textLight }}>
                Choose the plan that works best for you
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20" style={{ backgroundColor: theme.background }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: theme.primaryDark }}>
              Trusted by Researchers Worldwide
            </h2>
            <p className="text-xl" style={{ color: theme.textLight }}>
              See what our users are saying
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="p-6 rounded-xl shadow-sm"
                style={{ backgroundColor: theme.cardBackground, borderColor: theme.border, border: '1px solid' }}
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" style={{ color: theme.warning }} />
                  ))}
                </div>
                <p className="mb-4 italic" style={{ color: theme.textLight }}>
                  "{testimonial.content}"
                </p>
                <div>
                  <div className="font-semibold" style={{ color: theme.text }}>
                    {testimonial.name}
                  </div>
                  <div className="text-sm" style={{ color: theme.textLight }}>
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ backgroundColor: theme.primary }}>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-4" style={{ color: theme.textOnPrimary }}>
            Ready to Transform Your Research?
          </h2>
          <p className="text-xl mb-8" style={{ color: theme.textOnPrimary, opacity: 0.9 }}>
            Join thousands of researchers staying organized and achieving their goals.
          </p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center mx-auto group"
            style={{ backgroundColor: theme.cardBackground, color: theme.primary }}
          >
            Start Your 7-Day Experience
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm mt-4" style={{ color: theme.textOnPrimary, opacity: 0.8 }}>
            No credit card required • Full platform access • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" style={{ backgroundColor: theme.cardBackground, borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="Logo" className="h-10 w-10 rounded-full shadow object-cover" />
                <h3 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Organize Your Research</h3>
              </div>
              <p className="text-sm" style={{ color: theme.textLight }}>
                The comprehensive research management platform.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Product</h4>
              <ul className="space-y-2 text-sm" style={{ color: theme.textLight }}>
                <li><a href="#" className="hover:underline">Features</a></li>
                <li><a href="#" className="hover:underline">Pricing</a></li>
                <li><a href="#" className="hover:underline">Platform</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Support</h4>
              <ul className="space-y-2 text-sm" style={{ color: theme.textLight }}>
                <li><a href="#" className="hover:underline">Help Center</a></li>
                <li><a href="#" className="hover:underline">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Legal</h4>
              <ul className="space-y-2 text-sm" style={{ color: theme.textLight }}>
                <li><a href="#" className="hover:underline">Privacy</a></li>
                <li><a href="#" className="hover:underline">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm" style={{ borderColor: theme.border, color: theme.textLight }}>
            <p>&copy; 2024 The Pep Planner. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;