import React from 'react';
import { Home, Map, Wind } from 'lucide-react';
import './navbar.css';

const Navbar = ({ currentPage, setCurrentPage }) => {
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      description: 'Current Location AQI'
    },
    {
      id: 'map',
      label: 'Interactive Map',
      icon: Map,
      description: 'Explore AQI Worldwide'
    }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo/Brand */}
        <div className="navbar-brand">
          <Wind className="brand-icon" size={28} />
          <span className="brand-text">AQI Monitor</span>
        </div>

        {/* Navigation Items */}
        <div className="navbar-items">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                title={item.description}
              >
                <IconComponent size={20} />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Menu Toggle (for future mobile optimization) */}
        <div className="mobile-menu">
          <button className="mobile-toggle">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;