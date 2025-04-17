import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from "react-router";
import './index.css'
import Layout from './home/Layout.jsx'
import App from './home/App.jsx'
import Search from './home/Search'
import CaptureImg from './home/captureImg.jsx'
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route path='' element={<App/>}/>
      <Route path='search' element={<Search/>}/>
      <Route path='capture' element={<CaptureImg/>}/>
    </Route>
  )
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)
