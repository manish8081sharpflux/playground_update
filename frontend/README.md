# ISF Playground - Frontend

React 19 frontend for the ISF Playground platform (Initiative Sewa Foundation).

## Tech Stack

- **React** 19.0.0 with React Router 7
- **Styling**: Tailwind CSS + component-scoped CSS
- **UI Components**: Radix UI primitives
- **State Management**: React Context API + Zustand (shop cart)
- **API**: Axios with centralized API layer (`src/api.js`)
- **Icons**: Lucide React + Font Awesome
- **Charts**: Recharts
- **Testing**: Jest + React Testing Library + Playwright

## Setup

```bash
npm install
npm start
```

## Environment

Copy `.env.example` and configure:

```
REACT_APP_API_BASE_URL=http://localhost:5001
```

## Structure

```
src/
  components/   # Reusable UI components organized by feature
  contexts/     # React Context providers (Auth, RBAC, Coins, WTF)
  hooks/        # Custom React hooks
  pages/        # Page-level components organized by role
  store/        # Zustand stores
  styles/       # CSS stylesheets
  ui/           # Base UI component library
  utils/        # Utility functions
  api.js        # Centralized API endpoint definitions
  App.js        # Main app with routing
  config.js     # Configuration
```
