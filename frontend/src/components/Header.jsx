import React from 'react'
import { NavLink } from 'react-router'
function Header() {
  return (
    <div className='text-4xl font-bold flex gap-2 justify-center'>
      <NavLink to="/" viewTransition>Home</NavLink>
      <NavLink to="/search" viewTransition>Search</NavLink>
    </div>
  )
}

export default Header