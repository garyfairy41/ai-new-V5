// Debug frontend URL construction
// This simulates what happens in DatabaseService.startCampaign

function getApiUrl() {
  if (typeof window !== 'undefined') {
    console.log('🌐 Running in browser');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('window.location.origin:', window.location.origin);
    console.log('window.location.hostname:', window.location.hostname);
    console.log('window.location.protocol:', window.location.protocol);
    
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : (window.location.hostname !== 'localhost')
        ? `${window.location.protocol}//${window.location.hostname}:12001`
        : 'http://localhost:12001';
    
    console.log('🔗 Constructed API URL:', apiUrl);
    return apiUrl;
  } else {
    console.log('🖥️  Running in Node.js');
    return 'http://localhost:12001';
  }
}

console.log('🔍 Frontend URL Construction Debug');
console.log('='.repeat(50));

// Simulate browser environment
global.window = {
  location: {
    origin: 'https://upgraded-cod-r4xxvx74gvjq25gxx-3000.app.github.dev',
    hostname: 'upgraded-cod-r4xxvx74gvjq25gxx-3000.app.github.dev',
    protocol: 'https:'
  }
};

// Test development environment
process.env.NODE_ENV = 'development';
console.log('\n1. Development environment:');
const devUrl = getApiUrl();
console.log('Expected result for GitHub Codespaces:', devUrl);

// Test production environment
process.env.NODE_ENV = 'production';
console.log('\n2. Production environment:');
const prodUrl = getApiUrl();
console.log('Expected result for production:', prodUrl);

// Test localhost
global.window.location.hostname = 'localhost';
process.env.NODE_ENV = 'development';
console.log('\n3. Localhost environment:');
const localUrl = getApiUrl();
console.log('Expected result for localhost:', localUrl);

console.log('\n🎯 Summary:');
console.log('The frontend should construct the correct API URL based on the environment.');
console.log('If this is wrong, the frontend will call the wrong endpoint and get 404.');
