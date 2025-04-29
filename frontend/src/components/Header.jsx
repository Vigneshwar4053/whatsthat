import React from 'react'
import { NavLink } from 'react-router-dom'

function Header() {
  return (
    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4 shadow-lg">
      <div className="container mx-auto">
        <div className="flex items-center gap-48">
          <div className="text-2xl font-bold text-white">WhatsThat</div>
          
          <nav className="flex gap-6">
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                isActive 
                  ? "relative px-4 py-2 text-white font-semibold transition-all duration-300 after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-white after:rounded-t-md"
                  : "px-4 py-2 text-white font-medium hover:text-indigo-100 transition-all duration-300"
              }
            >
              Home
            </NavLink>
          </nav>

         
        </div>
      </div>
    </div>
  )
}

export default Header