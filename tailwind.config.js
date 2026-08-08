/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './admin/*.html',
    './admin/**/*.html',
    './user/*.html',
    './user/**/*.html',
    './assets/js/*.js',
    './assets/js/**/*.js'
  ],
  safelist: [
    {
      pattern: /^(bg|text|border|ring|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|w|h|flex|grid|gap|rounded|shadow|hidden|block|inline|opacity|transition|duration|space)-/,
    },
    'sidebar-active',
    'hover-lift',
    'glass',
    'outfit',
    'playfair'
  ],
  theme: {
    extend: {
      colors: {
        gold: '#D4AF37',
        'brand-gold': '#C5A059',
        'brand-dark': '#0F172A'
      }
    },
  },
  plugins: [],
}
