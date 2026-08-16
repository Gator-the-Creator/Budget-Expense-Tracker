# Budget & Expense Tracker

A modern React application for tracking income, expenses, budgets, and planning on a calendar.

## Features

- 📊 **Finances Tab** - Add, edit, and delete expenses with categories
- 📈 **Planner Tab** - Visualize monthly spending trends with line charts
- 📅 **Calendar Tab** - Track expenses organized by date
- 💰 **Budget Management** - Set category budgets and monitor spending with visual progress bars
- 💾 **Local Storage** - Data persists between sessions automatically
- 📋 **Statistics** - View total spent and average expense calculations
- 🎨 **Category Breakdown** - Pie chart showing expense distribution
- ⚠️ **Budget Alerts** - Get visual warnings when spending exceeds budgets

## Quick Start

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Gator-the-Creator/Budget-Expense-Tracker.git
cd Budget-Expense-Tracker
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will automatically open at `http://localhost:3000` in your browser.

### Building for Production

Create an optimized production build:
```bash
npm run build
```

## How to Use

### Adding Expenses
1. Go to the **Finances** tab
2. Select a category from the dropdown
3. Enter the amount and date
4. Add a description (optional)
5. Click "Add Expense"

### Editing Expenses
1. Click "Edit" on any expense in the Recent Expenses list
2. Modify the details
3. Click "Update Expense"
4. Or click "Cancel" to discard changes

### Setting Budgets
1. Go to the **Budgets** tab
2. Click "Set Budget"
3. Select a category and enter a budget amount
4. Click "Set Budget" to save
5. View progress bars showing spending vs. budget

### Viewing Data
- **Finances**: See all your expenses and statistics at a glance
- **Planner**: View monthly spending trends on a line chart
- **Calendar**: See expenses listed chronologically
- **Budgets**: Monitor spending against your set budgets with visual indicators

## Categories

- 🍔 Food
- 🚗 Transport
- 🎬 Entertainment
- 💡 Utilities
- 🛍️ Shopping
- 📌 Other

## Technologies

- **React 18** - UI framework
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **Local Storage** - Data persistence

## Project Structure

```
Budget-Expense-Tracker/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx          - Main application component
│   ├── App.css          - Tailwind CSS imports
│   ├── index.js         - React entry point
│   └── index.css        - Base styles
├── package.json         - Dependencies and scripts
├── tailwind.config.js   - Tailwind configuration
└── README.md            - This file
```

## Data Storage

All data is stored in your browser's **localStorage**. Your expenses and budgets will persist even after closing the app.

## Features Included

✅ Add, edit, and delete expenses
✅ Categorize expenses
✅ Set and manage budgets per category
✅ View statistics (total spent, average expense)
✅ Interactive charts (pie chart, line chart, bar chart)
✅ Budget progress tracking with visual alerts
✅ Automatic data persistence
✅ Responsive design (works on desktop and tablet)
✅ Clean, modern UI

## Future Enhancements

- [ ] Recurring expenses
- [ ] Export reports as PDF/CSV
- [ ] Dark mode support
- [ ] Mobile app version
- [ ] Multi-user support with authentication
- [ ] Income tracking
- [ ] Savings goals
- [ ] Monthly reports and analysis

## License

MIT - Feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.
