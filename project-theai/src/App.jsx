import { BrowserRouter as Router } from 'react-router-dom';
import GeneralRouter from './components/GeneralRouter';
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext';

function App() {
  console.log('🚨 Current route:', window.location.pathname);
  return (
    <ErrorBoundary>
    <AuthProvider>
        <GeneralRouter />
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;