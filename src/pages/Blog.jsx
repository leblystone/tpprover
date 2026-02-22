import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, ArrowRight, Search, Filter, BookOpen, FileText, Video, Download } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp_logo.png';
import { usePageSEO } from '../utils/pageSEO';
import LandingFooter from '../components/layout/LandingFooter';

export default function Blog() {
  usePageSEO();
  const navigate = useNavigate();
  const theme = themes[defaultThemeName];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { value: 'all', label: 'All Resources' },
    { value: 'protocols', label: 'Research Protocols' },
    { value: 'safety', label: 'Safety Guidelines' },
    { value: 'best-practices', label: 'Best Practices' },
    { value: 'case-studies', label: 'Case Studies' },
    { value: 'updates', label: 'Platform Updates' }
  ];

  const resources = [
    {
      id: 1,
      title: "Peptide Research Safety Guidelines",
      excerpt: "Comprehensive safety protocols for conducting peptide research, including proper handling, storage, and disposal procedures.",
      category: "safety",
      type: "guide",
      author: "Dr. Sarah Chen",
      date: "2024-12-15",
      readTime: "8 min read",
      featured: true,
      tags: ["safety", "protocols", "research"]
    },
    {
      id: 2,
      title: "Optimizing Research Protocol Scheduling",
      excerpt: "Learn how to effectively schedule and manage your peptide research protocols for maximum efficiency and safety.",
      category: "best-practices",
      type: "article",
      author: "Dr. Michael Rodriguez",
      date: "2024-12-10",
      readTime: "6 min read",
      featured: false,
      tags: ["scheduling", "optimization", "efficiency"]
    },
    {
      id: 3,
      title: "Case Study: Long-term Research Project Management",
      excerpt: "A detailed case study of how one research team successfully managed a 12-month peptide study using The Pep Planner.",
      category: "case-studies",
      type: "case-study",
      author: "Research Team Alpha",
      date: "2024-12-05",
      readTime: "12 min read",
      featured: true,
      tags: ["case-study", "project-management", "long-term"]
    },
    {
      id: 4,
      title: "New Features: Advanced Analytics Dashboard",
      excerpt: "Discover the latest analytics features that help you gain deeper insights into your research patterns and outcomes.",
      category: "updates",
      type: "update",
      author: "The Pep Planner Team",
      date: "2024-12-01",
      readTime: "4 min read",
      featured: false,
      tags: ["features", "analytics", "dashboard"]
    },
    {
      id: 5,
      title: "Research Data Management Best Practices",
      excerpt: "Essential guidelines for organizing, storing, and backing up your research data to ensure data integrity and compliance.",
      category: "best-practices",
      type: "guide",
      author: "Dr. Emily Watson",
      date: "2024-11-28",
      readTime: "10 min read",
      featured: false,
      tags: ["data-management", "compliance", "backup"]
    },
    {
      id: 6,
      title: "Protocol Template Library Update",
      excerpt: "New protocol templates added to our library, including specialized templates for different types of peptide research.",
      category: "protocols",
      type: "update",
      author: "The Pep Planner Team",
      date: "2024-11-25",
      readTime: "3 min read",
      featured: false,
      tags: ["templates", "protocols", "library"]
    }
  ];

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'guide': return <BookOpen className="w-4 h-4" />;
      case 'article': return <FileText className="w-4 h-4" />;
      case 'case-study': return <FileText className="w-4 h-4" />;
      case 'update': return <Download className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'guide': return theme.primary;
      case 'article': return '#10B981';
      case 'case-study': return '#F59E0B';
      case 'update': return '#8B5CF6';
      default: return theme.textLight;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      {/* Navigation */}
      <nav className="border-b" style={{ backgroundColor: theme.white, borderColor: theme.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src={logo} alt="The Pep Planner" className="h-8 w-8 rounded-full mr-3" />
              <span className="text-xl font-bold" style={{ color: theme.primaryDark }}>The Pep Planner</span>
            </div>
            <div className="flex space-x-8">
              <button type="button" onClick={() => navigate('/')} className="text-sm font-medium hover:opacity-75 transition-opacity bg-transparent border-0 cursor-pointer p-0" style={{ color: theme.text }}>Home</button>
              <button type="button" onClick={() => navigate('/about')} className="text-sm font-medium hover:opacity-75 transition-opacity bg-transparent border-0 cursor-pointer p-0" style={{ color: theme.text }}>About</button>
              <button type="button" onClick={() => navigate('/features')} className="text-sm font-medium hover:opacity-75 transition-opacity bg-transparent border-0 cursor-pointer p-0" style={{ color: theme.text }}>Features</button>
              <button type="button" onClick={() => navigate('/pricing')} className="text-sm font-medium hover:opacity-75 transition-opacity bg-transparent border-0 cursor-pointer p-0" style={{ color: theme.text }}>Pricing</button>
              <button type="button" onClick={() => navigate('/contact')} className="text-sm font-medium hover:opacity-75 transition-opacity bg-transparent border-0 cursor-pointer p-0" style={{ color: theme.text }}>Contact</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Research Resources
          </h1>
          <p className="text-xl md:text-2xl mb-8" style={{ color: theme.textLight }}>
            Expert insights, best practices, and guides for peptide research.
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: theme.textLight }} />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-offset-2 transition-colors"
                style={{ 
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  color: theme.text
                }}
              />
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" style={{ color: theme.textLight }} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 rounded-lg border focus:ring-2 focus:ring-offset-2 transition-colors"
                style={{ 
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  color: theme.text
                }}
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Resources */}
      {selectedCategory === 'all' && searchTerm === '' && (
        <div className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-8" style={{ color: theme.primaryDark }}>
              Featured Resources
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {resources.filter(r => r.featured).map(resource => (
                <div key={resource.id} className="p-8 rounded-2xl" style={{ backgroundColor: theme.white }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div style={{ color: getTypeColor(resource.type) }}>
                      {getTypeIcon(resource.type)}
                    </div>
                    <span className="text-sm font-medium uppercase tracking-wider" style={{ color: getTypeColor(resource.type) }}>
                      {resource.type.replace('-', ' ')}
                    </span>
                    <span className="text-sm px-2 py-1 rounded-full" style={{ backgroundColor: theme.primary, color: 'white' }}>
                      Featured
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3" style={{ color: theme.primaryDark }}>
                    {resource.title}
                  </h3>
                  
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: theme.textLight }}>
                    {resource.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs" style={{ color: theme.textLight }}>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {resource.author}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(resource.date).toLocaleDateString()}
                      </div>
                      <span>{resource.readTime}</span>
                    </div>
                    
                    <button className="flex items-center gap-1 text-sm font-medium transition-colors" style={{ color: theme.primary }}>
                      Read More
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Resources */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8" style={{ color: theme.primaryDark }}>
            {selectedCategory === 'all' ? 'All Resources' : categories.find(c => c.value === selectedCategory)?.label}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map(resource => (
              <div key={resource.id} className="p-6 rounded-xl" style={{ backgroundColor: theme.white }}>
                <div className="flex items-center gap-2 mb-3">
                  <div style={{ color: getTypeColor(resource.type) }}>
                    {getTypeIcon(resource.type)}
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: getTypeColor(resource.type) }}>
                    {resource.type.replace('-', ' ')}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>
                  {resource.title}
                </h3>
                
                <p className="text-sm mb-4 leading-relaxed" style={{ color: theme.textLight }}>
                  {resource.excerpt}
                </p>
                
                <div className="flex items-center justify-between text-xs" style={{ color: theme.textLight }}>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {resource.author}
                  </div>
                  <span>{resource.readTime}</span>
                </div>
                
                <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs" style={{ color: theme.textLight }}>
                      <Calendar className="w-3 h-3" />
                      {new Date(resource.date).toLocaleDateString()}
                    </div>
                    
                    <button className="flex items-center gap-1 text-sm font-medium transition-colors" style={{ color: theme.primary }}>
                      Read
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredResources.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg" style={{ color: theme.textLight }}>
                No resources found matching your criteria.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Newsletter Signup */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Stay Updated
          </h2>
          <p className="text-lg mb-8" style={{ color: theme.textLight }}>
            Get the latest research insights and platform updates delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg border focus:ring-2 focus:ring-offset-2 transition-colors"
              style={{ 
                borderColor: theme.border,
                backgroundColor: theme.background,
                color: theme.text
              }}
            />
            <button
              className="px-6 py-3 rounded-lg font-medium text-white transition-colors"
              style={{ backgroundColor: theme.primary }}
              onMouseEnter={(e) => e.target.style.backgroundColor = theme.primaryDark}
              onMouseLeave={(e) => e.target.style.backgroundColor = theme.primary}
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
