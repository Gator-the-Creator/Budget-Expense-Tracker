# Budget-Expense-Tracker

Tracks income, expenses, budget, plans on calendar, etc.

## Features

- 📋 Daily Planner with customizable backgrounds and notes
- 📅 Calendar view with event planning
- 💰 Financial Dashboard with expense and income tracking
- 📊 Visual charts and expense categorization
- 🎨 Dark mode and customizable color schemes
- 💾 Real-time Firestore synchronization

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up Firebase credentials in your environment
4. Run the development server:
   ```bash
   npm start
   ```

## Usage

The application features four main tabs:

- **Planner**: View and manage your daily plans with customizable backgrounds
- **Calendar**: Monthly calendar view with event summaries
- **Finances**: Financial dashboard with expense tracking and budget monitoring
- **Shared**: Collaboration and sharing features

## Architecture

The main React application code is located in [App.jsx](./App.jsx). The app uses:

- **React** for UI components
- **Firebase** for authentication and data persistence
- **Recharts** for data visualization
- **Tailwind CSS** for styling

## Components

Key components include:

- `DailyPlannerCard` - Daily planning interface with customizable sections
- `CalendarView` - Monthly calendar with event indicators
- `FinancialDashboard` - Comprehensive financial tracking and visualization
- `SideLegend` - Data breakdown sidebar for charts

See [App.jsx](./App.jsx) for the complete implementation.
