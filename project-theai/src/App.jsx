import { BrowserRouter as Router } from 'react-router-dom';
import GeneralRouter from './components/GeneralRouter';
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
        <GeneralRouter />
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;