/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f4f8',
          100: '#bee6f0',
          200: '#91d7e7',
          300: '#64c8de',
          400: '#42bcd7',
          500: '#3498db', // Main blue from wireframes
          600: '#2e8bc7',
          700: '#267db2',
          800: '#1e6f9e',
          900: '#12547e',
        },
        secondary: {
          50: '#f8f9fa',
          100: '#ecf0f1',
          200: '#bdc3c7',
          300: '#95a5a6',
          400: '#7f8c8d',
          500: '#6c757d',
          600: '#5a6268',
          700: '#495057',
          800: '#343a40',
          900: '#2c3e50', // Dark blue-grey from wireframes
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'phone': '25px',
      }
    },
  },
  plugins: [],
}
