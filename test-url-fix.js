// Test the fixed URL construction
const testUrlConstruction = () => {
  console.log('🔍 Testing Fixed URL Construction');
  console.log('='.repeat(50));
  
  // Simulate GitHub Codespaces environment
  const mockWindow = {
    location: {
      hostname: 'upgraded-cod-r4xxvx74gvjq25gxx-3000.app.github.dev',
      protocol: 'https:'
    }
  };
  
  // Test the fixed logic
  const apiUrl = mockWindow.location.hostname === 'localhost'
    ? 'http://localhost:12001'
    : mockWindow.location.hostname.includes('app.github.dev')
      ? `${mockWindow.location.protocol}//${mockWindow.location.hostname.replace('-3000', '-12001')}`
      : `${mockWindow.location.protocol}//${mockWindow.location.hostname}:12001`;
  
  console.log('Input hostname:', mockWindow.location.hostname);
  console.log('Fixed API URL:', apiUrl);
  console.log('Expected:', 'https://upgraded-cod-r4xxvx74gvjq25gxx-12001.app.github.dev');
  console.log('Match:', apiUrl === 'https://upgraded-cod-r4xxvx74gvjq25gxx-12001.app.github.dev');
  
  // Test localhost
  const localhostUrl = 'localhost';
  const localhostApiUrl = localhostUrl === 'localhost'
    ? 'http://localhost:12001'
    : localhostUrl.includes('app.github.dev')
      ? `https://${localhostUrl.replace('-3000', '-12001')}`
      : `https://${localhostUrl}:12001`;
  
  console.log('\nLocalhost test:');
  console.log('Input:', localhostUrl);
  console.log('Result:', localhostApiUrl);
  console.log('Expected:', 'http://localhost:12001');
  console.log('Match:', localhostApiUrl === 'http://localhost:12001');
};

testUrlConstruction();
