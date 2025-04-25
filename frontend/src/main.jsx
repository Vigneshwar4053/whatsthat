import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from "react-router";
import './index.css'
import Layout from './Layout.jsx'
// import App from './App.jsx'
import Demo from './components/Demo.jsx';
// import CaptureImg from './components/captureImg.jsx'
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route path='' element={<Demo/>}/>
      {/* <Route path='capture' element={<CaptureImg/>}/> */}
      {/* <Route path='demo' element={<Demo/>}/> */}
    </Route>
  )
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)
