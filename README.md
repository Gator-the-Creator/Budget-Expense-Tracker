# Budget & Expense Tracker

A modern React application for tracking income, expenses, budgets, and planning on a calendar.

## Features

- 💰 **Finances Tab** - Add, view, edit, and delete expenses with categories
- 📈 **Planner Tab** - Visualize monthly spending trends with line charts
- 📅 **Calendar Tab** - Track expenses organized by date
- 💳 **Budgets Tab** - Set and manage budget limits per category with progress tracking
- 📊 **Statistics** - View total spent, average expense, and category breakdown
- 📋 **Pie Chart** - Visual expense distribution by category
- 📊 **Bar Chart** - Compare spending vs. budget by category
- 💾 **Local Storage** - Data persists between sessions automatically
- ⚠️ **Budget Alerts** - Visual indicators when you exceed budget limits

## Categories

- Food
- Transport
- Entertainment
- Utilities
- Shopping
- Other

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Gator-the-Creator/Budget-Expense-Tracker.git
cd Budget-Expense-Tracker
```

2. Install dependencies:
```bash
npm install
```

## Running the App

Start the development server:
```bash
npm start
```

The app will open automatically at `http://localhost:3000` in your browser.

## Building for Production

Create an optimized production build:
```bash
npm run build
```

## Technologies Used

- **React 18** - UI framework
- **Recharts** - Data visualization (charts and graphs)
- **Tailwind CSS** - Styling
- **React Scripts** - Build tool
- **Local Storage API** - Data persistence

## Project Structure

```
src/
├── App.jsx           - Main application component
├── App.css           - Tailwind imports
├── index.js          - React entry point
└── index.css         - Base styles
public/
└── index.html        - HTML template
package.json          - Dependencies and scripts
tailwind.config.js    - Tailwind CSS configuration
.gitignore            - Git ignore rules
```

## How to Use

### Adding Expenses
1. Go to the **Finances** tab
2. Fill in the category, amount, date, and description
3. Click "Add Expense"

### Editing Expenses
1. Find the expense in the "Recent Expenses" list
2. Click the "Edit" button
3. Update the information
4. Click "Update Expense"

### Deleting Expenses
1. Find the expense in the "Recent Expenses" list
2. Click the "Delete" button

### Setting Budgets
1. Go to the **Budgets** tab
2. Click "Set Budget"
3. Select a category and enter the budget amount
4. Click "Set Budget"

### Viewing Reports
- **Finances Tab** - See total spent, average expense, and category pie chart
- **Planner Tab** - View monthly spending trends
- **Calendar Tab** - Track expenses by date
- **Budgets Tab** - Monitor budget progress for each category

## Data Storage

All data is stored in your browser's local storage and persists between sessions. No external servers or databases are used.

## Future Enhancements

- [ ] Export reports as PDF/CSV
- [ ] Dark mode support
- [ ] Income tracking
- [ ] Recurring expenses
- [ ] Multiple accounts/profiles
- [ ] Mobile app version
- [ ] Cloud sync with Firebase

## License

MIT

## Contributing

Feel free to submit issues and pull requests!
