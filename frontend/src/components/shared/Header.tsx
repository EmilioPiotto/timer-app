import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <header style={{
      borderBottom: '1px solid #ddd',
      padding: '10px 16px',
      display: 'flex',
      gap: 24,
      alignItems: 'center',
    }}>
      <NavLink
        to="/"
        end
        style={({ isActive }) => ({
          fontWeight: isActive ? '700' : '400',
          color: 'inherit',
          textDecoration: 'none',
        })}
      >
        Timers
      </NavLink>
      <NavLink
        to="/macros"
        style={({ isActive }) => ({
          fontWeight: isActive ? '700' : '400',
          color: 'inherit',
          textDecoration: 'none',
        })}
      >
        Macros
      </NavLink>
    </header>
  )
}
