# Thread & Research - Coming Soon Landing Page

A modern, responsive "coming soon" landing page for Thread & Research - a merchandise store specializing in peptide research apparel and accessories. Launching March 2026.

## Features

- **Modern Design**: Clean, professional design with custom teal-green and light beige color scheme
- **Responsive Layout**: Fully responsive design that works on all devices
- **Coming Soon Section**: Prominent launch date display (March 2026)
- **Email Signup**: Email collection form with localStorage persistence
- **Contact Form**: Contact form for customer inquiries
- **Smooth Scrolling**: Smooth navigation between sections

## Color Scheme

- **Teal Green**: `#103844` (primary brand color)
- **Teal Green Dark**: `#1d434e` (hover states, gradients)
- **Light Beige**: `#eaebe8` (background)
- **White**: `#ffffff` (cards, forms)

## File Structure

```
thread-and-research/
├── index.html      # Main HTML file
├── styles.css      # All CSS styles
├── script.js       # JavaScript functionality
└── README.md       # This file
```

## Setup

1. Open `index.html` in a web browser
2. No build process required - pure HTML/CSS/JS

## Customization

### Changing Launch Date

Edit the launch date in `index.html` within the `.launch-date` section:

```html
<div class="launch-date">
    <span class="launch-month">March</span>
    <span class="launch-year">2026</span>
</div>
```

### Changing Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --teal-green: #2d5a5a;
    --teal-green-dark: #1e3d3d;
    --light-gray: #f5f5f5;
    /* ... */
}
```

### Domain Setup

This landing page is designed for `threadandresearch.com`. Update any hardcoded references if needed.

## Future Enhancements

- Integration with email service (Mailchimp, SendGrid, etc.) for signup form
- Countdown timer to launch date
- Social media integration
- Product preview section (when ready to reveal)
- Integration with e-commerce platform (Shopify, WooCommerce, etc.) for launch

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

© 2024 Thread & Research. All rights reserved.

