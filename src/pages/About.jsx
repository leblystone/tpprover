import React from 'react';
import { FlaskConical, Users, Shield, Zap, Target, BookOpen } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import PublicNavigation from '../components/layout/PublicNavigation';
import PublicFooter from '../components/layout/PublicFooter';

export default function About() {
  const theme = themes[defaultThemeName];

  const features = [
    {
      icon: <FlaskConical className="w-8 h-8" />,
      title: "Research-Focused Design",
      description: "Built specifically for peptide research protocols with scientific accuracy in mind."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Community Driven",
      description: "Connect with fellow researchers and share knowledge in a collaborative environment."
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Privacy First",
      description: "Your research data is protected with enterprise-grade security and privacy controls."
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Streamlined Workflow",
      description: "Organize protocols, track progress, and manage research data efficiently."
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Goal Tracking",
      description: "Set research objectives and monitor progress with built-in goal management tools."
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Knowledge Base",
      description: "Access comprehensive resources and documentation for peptide research protocols."
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <PublicNavigation />

      {/* Hero Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            About The Pep Planner
          </h1>
          <p className="text-xl md:text-2xl mb-8" style={{ color: theme.textLight }}>
            Empowering researchers with the tools they need to conduct peptide research safely and effectively.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Our Mission
            </h2>
            <p className="text-lg md:text-xl leading-relaxed" style={{ color: theme.textLight }}>
              The Pep Planner was created to provide researchers with a comprehensive platform for organizing, 
              tracking, and managing peptide research protocols. We believe that proper organization and 
              documentation are essential for safe and effective research practices.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              What Makes Us Different
            </h2>
            <p className="text-lg" style={{ color: theme.textLight }}>
              Built by researchers, for researchers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="p-6 rounded-xl" style={{ backgroundColor: theme.white }}>
                <div className="mb-4" style={{ color: theme.primary }}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Our Values
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4" style={{ color: theme.primaryDark }}>
                Scientific Integrity
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                We maintain the highest standards of scientific accuracy and ethical research practices 
                in everything we do.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4" style={{ color: theme.primaryDark }}>
                User Privacy
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Your research data is yours. We implement robust security measures to protect your 
                sensitive information.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4" style={{ color: theme.primaryDark }}>
                Continuous Improvement
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                We continuously evolve our platform based on user feedback and the latest research 
                methodologies.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4" style={{ color: theme.primaryDark }}>
                Community Support
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                We foster a supportive community where researchers can share knowledge and best practices.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Ready to Get Started?
          </h2>
          <p className="text-lg mb-8" style={{ color: theme.textLight }}>
            Join thousands of researchers who trust The Pep Planner for their research organization needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/app"
              className="px-8 py-3 rounded-lg font-medium text-white transition-colors"
              style={{ backgroundColor: theme.primary }}
              onMouseEnter={(e) => e.target.style.backgroundColor = theme.primaryDark}
              onMouseLeave={(e) => e.target.style.backgroundColor = theme.primary}
            >
              Start Your Research
            </a>
            <a
              href="/contact"
              className="px-8 py-3 rounded-lg font-medium border transition-colors"
              style={{ 
                borderColor: theme.primary, 
                color: theme.primary,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme.primary;
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = theme.primary;
              }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
