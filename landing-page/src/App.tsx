import Hero from './components/Hero'
import Features from './components/Features'
import ProductDemo from './components/ProductDemo'
import EmailSignup from './components/EmailSignup'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <Features />
      <ProductDemo />
      <EmailSignup />
      <Footer />
    </div>
  )
}

export default App