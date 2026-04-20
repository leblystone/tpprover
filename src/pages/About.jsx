import React from 'react';
import { FlaskConical, Users, Shield, Smartphone, HeartHandshake, BookOpen } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import { usePageSEO } from '../utils/pageSEO';

export default function About() {
  usePageSEO();
  const theme = themes[defaultThemeName];

  const features = [
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Paper planners first',
      description:
        'We started by making physical planners people could actually write in—layouts for protocols, stockpile notes, and day-to-day tracking.',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Rooted in group buys',
      description:
        'Our early customers were small, tight-knit communities pooling orders and sharing vendor reality. That honesty shaped everything we ship.',
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: 'Then we went digital',
      description:
        'Love for organized research pushed us beyond paper: one place for schedules, washouts, stockpile math, and mobile access—without losing the planner mindset.',
    },
    {
      icon: <FlaskConical className="w-8 h-8" />,
      title: 'Built for real workflows',
      description:
        'Protocols, vials, calendars, and reminders—the boring stuff done right so you can focus on your research log, not spreadsheets.',
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Your notebook stays yours',
      description:
        'We treat research logs as sensitive: sensible security, clear data practices, and no noisy upsells in your workspace.',
    },
    {
      icon: <HeartHandshake className="w-8 h-8" />,
      title: 'Community support',
      description:
        'We stay close to the independent research communities—including the grey-area circles where people organize, vent, and help each other stay safe and informed.',
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <LandingHeader />

      {/* Hero Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            About The Pep Planner
          </h1>
          <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto leading-relaxed" style={{ color: theme.textLight }}>
            We began as a paper planner company serving tight-knit group-buy communities. We liked the people and the pace of learning so much that we expanded—bringing the same care into the digital world for anyone who keeps a serious research log.
          </p>
          <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: theme.textLight }}>
            Plain language, practical tools, and respect for the communities that taught us what “organized research” actually means.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Why we exist
            </h2>
            <div className="space-y-5 text-left max-w-2xl mx-auto">
              <p className="text-lg leading-relaxed" style={{ color: theme.textLight }}>
                Paper taught us clarity: one spread for what you’re running, what’s on order, and what’s in the fridge. Group buys taught us speed—how fast good info moves when people trust each other.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: theme.textLight }}>
                Software let us scale that idea: reminders that match real half-lives, stockpile counts that don’t rely on memory, and a calendar that behaves when protocols change.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: theme.textLight }}>
                We still show up where our users show up—including support and listening posts inside the grey communities that welcomed us early. If you’re organizing, asking questions, or helping someone catch a mistake before it hurts, you’re the reason we build.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              What we focus on
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: theme.textLight }}>
              A straight line from paper planners and group-buy culture to the app on your phone—same audience, fewer scraps of lost paper.
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
              What we won’t twist
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center md:text-left px-2">
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Clear beats clever
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                If a label confuses someone on day three of a protocol, we failed. We write for tired eyes and busy calendars.
              </p>
            </div>
            <div className="text-center md:text-left px-2">
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Privacy is default
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Your log isn’t marketing fodder. We build walls around research data and tell you plainly what syncs where.
              </p>
            </div>
            <div className="text-center md:text-left px-2">
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                We ship, then listen
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Feature requests from real runs beat roadmap fantasies. If a workflow is broken, we want the screenshot and the story.
              </p>
            </div>
            <div className="text-center md:text-left px-2">
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Community isn’t a buzzword
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                We owe a debt to the grey communities and group-buy circles that shaped how we think about trust, timing, and harm reduction. Showing up there matters as much as shipping code.
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
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: theme.textLight }}>
            Start free, poke the calculators, or grab a planner from the shop—however you work, we’re glad you’re here.
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

      <LandingFooter />
    </div>
  );
}
