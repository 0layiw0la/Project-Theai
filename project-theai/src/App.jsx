import './App.css'
import ErrorBoundary from './components/ErrorBoundary'
import GeneralRouter from './components/GeneralRouter'

export default function App() {

  return (
    <>
    <ErrorBoundary>
      <GeneralRouter/>
    </ErrorBoundary> 
    </>
  )
}


