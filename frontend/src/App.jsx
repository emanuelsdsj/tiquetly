import { Route, Routes } from 'react-router-dom'
import { BrowsePage } from './pages/BrowsePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<BrowsePage />} />
    </Routes>
  )
}

export default App
