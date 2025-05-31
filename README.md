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