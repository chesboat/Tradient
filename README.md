# PropJournal - AI-Powered Trading Journal

PropJournal is a revolutionary trading journal application that automatically extracts trade data from TradingView screenshots using advanced computer vision and OCR technology. Simply upload your TradingView screenshots with position tools, and the AI will automatically log your trades!

## 🌟 Features

PropJournal offers comprehensive trading analysis with the following key features:

### Core Functionality
1. **Screenshot Upload**: Upload TradingView screenshots for analysis
2. **AI-Powered Extraction**: Extract trade details using GPT-4 Vision API  
3. **Smart Price Detection**: Advanced OCR with color analysis for position tool detection
4. **Risk Management**: Calculate risk/reward ratios and P&L analysis
5. **Trade Journaling**: Complete trade history with filtering and search

### Analysis Capabilities
- Entry, stop loss, and take profit price extraction
- Direction detection (long/short) via color analysis
- R:R ratio calculations and profitability analysis
- Statistical analysis with win rates and performance metrics
- Raw extracted text and analysis data for debugging

### 📋 Trade Input
- **Smart Paste Zone**: Copy TradingView position tool data and paste directly into the app
- **Screenshot Support**: Drag & drop or paste TradingView screenshots for visual trade records
- **AI-Powered Extraction**: Automatically extracts trade data using OCR and AI analysis

### 📖 Trade Journal
- **Trade Management**: View, edit, and manage all your trades
- **Risk Analysis**: Detailed risk/reward calculations and position sizing
- **Journal Entries**: Add notes and analysis to each trade
- **Filtering**: Filter trades by symbol, outcome, and other criteria

### 📅 Trading Calendar (NEW!)
- **Visual Trade Overview**: Monthly calendar view showing daily P/L and trade counts
- **Color-Coded Days**: Green for profitable days, red for losses, yellow for today
- **Weekly Summaries**: Right column shows weekly P/L totals and trade counts
- **Monthly P/L**: Header displays total monthly performance
- **Journal Indicators**: 📒 icon shows days with journal notes
- **Daily Drill-Down**: Click any day to see detailed trade breakdowns
- **Navigation**: Easy month-to-month navigation with "Today" quick access

### 📈 Analytics
- **Performance Metrics**: Win rate, average R/R, total P/L
- **Trade Statistics**: Comprehensive analysis of trading performance

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone/Navigate to the project directory**:
   ```bash
   cd PropJournal
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm start
   ```

4. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

That's it! 🎉 Your AI trading journal is now running.

## 📱 How to Use

### 1. Upload TradingView Screenshots

1. Take a screenshot of your TradingView chart with the position tool visible
2. Make sure the position tool shows:
   - **Entry level** (the main position area)
   - **Stop loss** (red/loss area)
   - **Take profit** (green/profit area)

3. Drag and drop the screenshot into the upload area, or click to browse files

### 2. Review Extracted Data

- The AI will automatically extract:
  - Symbol/instrument
  - Trade direction (long/short)
  - Entry price
  - Stop loss level
  - Take profit level
  - Risk/reward ratio
  - Timeframe and date

### 3. View Your Trade Journal

- Switch to the "Trade Journal" tab to see all your trades
- Filter by direction (long/short) or symbol
- Click on any trade to see full details and the original screenshot

### 4. Track Performance

- Visit the "Analytics" tab for performance insights
- View statistics like win rate, average risk/reward, and trade distribution

## 🎨 Supported TradingView Position Tools

The AI works best with TradingView's built-in position tools that show:

- **Colored profit/loss areas** (green for profit, red for loss)
- **Clear entry, stop loss, and take profit levels**
- **Visible price labels**

### Tips for Best Results:

- Use contrasting colors (red for stop loss, green for take profit)
- Ensure price labels are visible in the screenshot
- Include the symbol/timeframe information in the chart
- Take high-quality screenshots (avoid blurry images)

## 🔧 Technical Details

### Architecture

- **Frontend**: Vanilla JavaScript with modern CSS
- **Backend**: Node.js with Express
- **Database**: SQLite (lightweight and portable)
- **Image Processing**: Sharp for preprocessing
- **OCR**: Tesseract.js for text extraction
- **Computer Vision**: Jimp for color analysis

### Image Processing Pipeline

1. **Preprocessing**: Image enhancement for better OCR
2. **Text Extraction**: OCR to extract prices and labels
3. **Color Analysis**: Detect red/green areas for position tools
4. **Data Parsing**: Intelligent parsing of extracted information
5. **Confidence Scoring**: AI confidence in the extracted data

### Database Schema

The app stores:
- Trade details (symbol, direction, prices, etc.)
- Screenshot paths and metadata
- Confidence scores and raw extracted text
- Color analysis data for debugging

## 🛠️ Development

### Project Structure

```
PropJournal/
├── src/
│   ├── tradeExtractor.js    # Core AI extraction logic
│   └── database.js          # Database operations
├── public/
│   ├── index.html          # Main UI
│   ├── styles.css          # Styling
│   └── script.js           # Frontend JavaScript
├── uploads/                # Uploaded screenshots
├── server.js              # Express server
├── package.json           # Dependencies
└── README.md             # This file
```

### Development Commands

```bash
# Start in development mode (with auto-reload)
npm run dev

# Start in production mode
npm start

# Build (if applicable)
npm run build
```

### Environment Variables

Create a `.env` file for custom configuration:

```env
PORT=3000
NODE_ENV=development
```

## 🚀 Deployment

### Local Deployment

The app runs locally by default. For production deployment, consider:

1. **Environment Setup**: Set `NODE_ENV=production`
2. **Database**: SQLite works great for personal use
3. **File Storage**: Uploaded screenshots are stored locally
4. **Security**: Add authentication if sharing with others

### Cloud Deployment

For cloud deployment (Heroku, DigitalOcean, etc.):

1. Ensure all dependencies are in `package.json`
2. Set proper environment variables
3. Configure file upload storage (consider cloud storage for scale)

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: Found an issue? Create a GitHub issue
2. **Suggest Features**: Have an idea? Let us know!
3. **Improve OCR**: Help improve trade data extraction accuracy
4. **UI/UX**: Make the interface even more beautiful and intuitive

### Areas for Improvement

- [ ] Support for more TradingView position tool styles
- [ ] Integration with broker APIs for automatic trade execution
- [ ] Advanced analytics and performance metrics
- [ ] Mobile app version
- [ ] Cloud synchronization
- [ ] Trade sharing and social features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- TradingView for the excellent charting platform
- Tesseract.js for OCR capabilities
- The trading community for inspiration and feedback

## 📞 Support

Having issues? Here's how to get help:

1. **Check the Issues**: See if your problem has been reported
2. **Create an Issue**: Describe your problem with screenshots
3. **Community**: Join our trading community discussions

---

**Happy Trading! 📈📊**

*Made with ❤️ for traders who want to focus on trading, not data entry.* 

## Calendar Features

The new calendar view provides a TopstepX-style visual representation of your trading activity:

### Daily View
- **P/L Display**: Each day shows total profit/loss in USD
- **Trade Count**: Number of trades executed that day
- **Color Coding**: 
  - 🟢 Green: Profitable days
  - 🔴 Red: Loss days
  - 🟡 Yellow: Current day
  - ⬜ Gray: No trades
- **Journal Indicator**: 📒 icon for days with trade notes

### Weekly Summary
- **Weekly P/L**: Total profit/loss for each week
- **Weekly Trade Count**: Total trades for the week
- **Color-coded** based on weekly performance

### Daily Detail Modal
- **Trade Breakdown**: Click any day to see all trades for that date
- **Daily Statistics**: Total P/L, win rate, trade count
- **Individual Trade Cards**: Each trade shows symbol, direction, P/L, and key metrics
- **Quick Access**: Click any trade card to open full trade details

### Navigation
- **Month Navigation**: Previous/Next buttons to browse months
- **Today Button**: Quick jump to current month
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: SQLite for trade storage
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **AI/OCR**: OpenAI API and Tesseract.js for data extraction
- **Styling**: Modern CSS with gradients and responsive design

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (OpenAI API key)
4. Run the server: `npm start`
5. Open `http://localhost:3000` in your browser

## Usage

1. **Add Trades**: Copy TradingView position tool data and paste in the upload tab
2. **Attach Screenshots**: Paste screenshots to associate with trades
3. **View Calendar**: Switch to the Calendar tab to see your trading activity visually
4. **Analyze Performance**: Use the Analytics tab for comprehensive performance metrics
5. **Journal Entries**: Add notes and analysis to trades for future reference

## API Endpoints

- `GET /api/trades` - Get all trades
- `POST /api/upload-trade` - Upload screenshot and extract trade data
- `POST /api/process-trade-text` - Process TradingView text data
- `PUT /api/trades/:id` - Update trade information
- `GET /api/analytics` - Get performance analytics

The calendar seamlessly integrates with existing trade data and provides an intuitive way to review trading performance over time. 