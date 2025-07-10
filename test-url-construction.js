// Test to check URL construction difference between test and frontend
console.log('Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('typeof window:', typeof window);

// Simulate frontend URL construction
const frontendApiUrl = typeof window !== 'undefined' 
  ? (process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : (window.location.hostname !== 'localhost')
        ? `${window.location.protocol}//${window.location.hostname}:12001`
        : 'http://localhost:12001')
  : 'http://localhost:12001';

console.log('Frontend would use URL:', frontendApiUrl);

// Test the URL construction logic in browser-like environment
const mockWindow = {
  location: {
    hostname: 'upgraded-cod-r4xxvx74gvjq25gxx-12001.app.github.dev',
    protocol: 'https:',
    origin: 'https://upgraded-cod-r4xxvx74gvjq25gxx-12001.app.github.dev'
  }
};

// Simulate what happens in browser
const browserApiUrl = process.env.NODE_ENV === 'production' 
  ? mockWindow.location.origin 
  : (mockWindow.location.hostname !== 'localhost')
    ? `${mockWindow.location.protocol}//${mockWindow.location.hostname}:12001`
    : 'http://localhost:12001';

console.log('Browser would use URL:', browserApiUrl);

// This might be the issue - the browser URL construction is different!
console.log('Are they the same?', frontendApiUrl === browserApiUrl);
