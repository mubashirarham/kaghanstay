/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './admin/**/*.html',
    './user/**/*.html',
    './assets/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        gold: '#D4AF37'
      }
    },
  },
  plugins: [],
}
