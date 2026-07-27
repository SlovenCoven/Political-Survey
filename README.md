# Political Philosophy Quiz

An interactive quiz that classifies your political philosophy across four axes: Liberty, Economy, Social values, and Change orientation. Get your results and compare them to community averages.

## Local Development

### Prerequisites
- Node.js 18+ and npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/SlovenCoven/Political-Survey.git
cd Political-Survey
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The app will be available at `http://localhost:3000`

For development with hot reload:
```bash
npm run dev
```

## Deployment

This app is designed to be deployed to backend hosting services. Popular options:

- **Heroku** - `npm start` needs to listen on `process.env.PORT`
- **Railway** - Set PORT environment variable
- **Render** - Select Node.js environment
- **AWS Elastic Beanstalk** - Supports Node.js apps with package.json

### Environment Variables

- `PORT` - Server port (default: 3000)

The app creates a SQLite database (`survey_results.db`) on first run.

## Features

- **20-question survey** - Thoughtful questions covering political philosophy
- **Four-axis scoring** - Liberty, Economy, Social, and Change dimensions
- **Philosophy classification** - Assigns one of 8 political philosophies
- **Results comparison** - See how you compare to community averages
- **Data persistence** - All results stored in SQLite database
- **Responsive design** - Works on desktop, tablet, and mobile

## API Endpoints

When backend is running:

- `POST /api/results` - Submit survey results
- `GET /api/stats` - Get aggregate statistics
- `GET /api/labels` - Get results grouped by philosophy label
- `GET /api/percentile/:axis/:value` - Get percentile ranking for an axis value

## Static Hosting

The quiz can also run on GitHub Pages or any static host at `index.html` without the backend. Results won't be collected but the quiz will function normally.
