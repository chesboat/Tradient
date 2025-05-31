require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { extractTradeData } = require('./src/tradeExtractor');

const tradeExtractor = require('./src/tradeExtractor');
const database = require('./src/database');

// Import Vercel Blob for production file storage
let vercelBlob = null;
if (process.env.NODE_ENV === 'production') {
    try {
        vercelBlob = require('@vercel/blob');
        console.log('✅ Vercel Blob imported successfully');
    } catch (error) {
        console.warn('⚠️ Vercel Blob not available, using fallback storage');
        console.warn('Error details:', error.message);
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist (only in development)
const uploadsDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : './uploads';
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📁 Created uploads directory:', uploadsDir);
    }
} catch (error) {
    console.warn('⚠️  Could not create uploads directory:', error.message);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Initialize database with error handling
try {
    database.init();
    console.log('📊 Database initialization attempted');
} catch (error) {
    console.error('Database initialization failed:', error);
    console.warn('⚠️  Continuing without database support');
}

// Function to handle file upload to appropriate storage
async function storeFile(filePath, filename) {
    console.log('🔧 storeFile called with:', { filePath, filename, env: process.env.NODE_ENV, hasVercelBlob: !!vercelBlob });
    
    try {
        if (process.env.NODE_ENV === 'production' && vercelBlob) {
            // Production: Use Vercel Blob
            console.log('📸 Using Vercel Blob storage');
            const fileBuffer = fs.readFileSync(filePath);
            const blob = await vercelBlob.put(filename, fileBuffer, {
                access: 'public',
            });
            
            // Clean up local temp file
            fs.unlinkSync(filePath);
            
            console.log('📸 File stored in Vercel Blob:', blob.url);
            return blob.url;
        } else if (process.env.NODE_ENV === 'production') {
            // Production fallback: Convert to base64 data URL
            console.log('⚠️ Vercel Blob not available, using base64 data URL');
            const fileBuffer = fs.readFileSync(filePath);
            const base64 = fileBuffer.toString('base64');
            const mimeType = 'image/png'; // Assume PNG for screenshots
            const dataUrl = `data:${mimeType};base64,${base64}`;
            
            // Clean up local temp file
            fs.unlinkSync(filePath);
            
            console.log('📸 File converted to base64, length:', base64.length);
            return dataUrl;
        } else {
            // Development: Use local storage with proper URL prefix
            const localPath = `/uploads/${path.basename(filePath)}`;
            console.log('💻 Using local storage:', localPath);
            return localPath;
        }
    } catch (error) {
        console.error('❌ Error storing file:', error);
        // Fallback to local path
        const fallbackPath = `/uploads/${path.basename(filePath)}`;
        console.log('🔄 Using fallback path:', fallbackPath);
        return fallbackPath;
    }
}

console.log('🚀 PropJournal server starting...');
console.log('📊 Ready to process TradingView position tool data!');

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload and process screenshot
app.post('/api/upload-trade', upload.single('screenshot'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No screenshot uploaded' });
        }

        console.log('Processing uploaded file:', req.file.filename);

        // Extract trade data from screenshot FIRST (before moving/deleting file)
        const tradeData = await tradeExtractor.extractTradeData(req.file.path);
        
        // Then store file in appropriate storage (Vercel Blob for production, local for dev)
        const storedPath = await storeFile(req.file.path, req.file.filename);
        console.log('🗃️ File stored with path:', storedPath);
        
        // Add metadata
        tradeData.id = uuidv4();
        tradeData.timestamp = new Date().toISOString();
        tradeData.screenshotPath = storedPath; // Use the stored path (URL for production)
        tradeData.screenshot_path = storedPath; // Add this for database consistency
        tradeData.originalFilename = req.file.originalname;

        // Save to database
        await database.saveTrade(tradeData);

        res.json({
            success: true,
            trade: tradeData,
            message: 'Trade extracted and saved successfully'
        });

    } catch (error) {
        console.error('Error processing trade:', error);
        res.status(500).json({ 
            error: 'Failed to process trade screenshot',
            details: error.message 
        });
    }
});

// Upload screenshot to associate with existing trade
app.post('/api/upload', upload.single('screenshot'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No screenshot uploaded' });
        }

        console.log('📸 Processing screenshot upload:', req.file.filename);

        // Store file in appropriate storage (Vercel Blob for production, local for dev)
        const storedPath = await storeFile(req.file.path, req.file.filename);
        console.log('🗃️ File stored with path:', storedPath);

        // If tradeId is provided, associate with specific trade
        const tradeId = req.body.tradeId;
        
        if (tradeId) {
            // Associate screenshot with specific trade
            await database.updateTradeScreenshot(tradeId, storedPath);
            console.log('✅ Screenshot associated with trade ID:', tradeId);
        } else {
            // Associate with latest trade (default behavior)
            const latestTrade = await database.getLatestTrade();
            if (latestTrade) {
                await database.updateTradeScreenshot(latestTrade.id, storedPath);
                console.log('✅ Screenshot associated with latest trade:', latestTrade.symbol);
            } else {
                console.log('⚠️ No trades found to associate screenshot with');
            }
        }

        res.json({
            success: true,
            screenshotPath: storedPath,
            message: 'Screenshot uploaded and associated successfully'
        });

    } catch (error) {
        console.error('Error uploading screenshot:', error);
        res.status(500).json({ 
            error: 'Failed to upload screenshot',
            details: error.message 
        });
    }
});

// Enhanced TradingView data parser
function parseTradingViewData(tradeData) {
    console.log('🔍 Parsing trade text:', tradeData);
    
    // Initialize trade object with defaults
    const trade = {
        id: uuidv4(),
        symbol: 'Unknown',
        direction: 'unknown',
        timeframe: 'unknown',
        date: new Date().toISOString().split('T')[0], // Default fallback date
        entry_price: null,
        stop_loss: null,
        take_profit: null,
        exit_price: null,
        outcome: 'unknown',
        actual_pnl: null,
        points_gained: null,
        duration: 'unknown',
        planned_rr: null,
        actual_rr: null,
        reasoning: 'Text-based analysis',
        raw_data: tradeData
    };

    // Check if this is rich TradingView HTML data
    if (tradeData.includes('data-tradingview-clip')) {
        console.log('📊 Found TradingView clip data in HTML format');
        
        try {
            // Extract the JSON from the data-tradingview-clip attribute
            const clipMatch = tradeData.match(/data-tradingview-clip="([^"]+)"/);
            if (clipMatch) {
                // Decode HTML entities
                const jsonStr = clipMatch[1]
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>');
                
                const clipData = JSON.parse(jsonStr);
                console.log('📊 Found TradingView clip data:', JSON.stringify(clipData, null, 2));
                
                if (clipData.sources && clipData.sources[0]) {
                    const source = clipData.sources[0].source;
                    
                    // 🕐 EXTRACT ACTUAL TRADE DATE from TradingView data
                    if (source.points && source.points.length > 0) {
                        // Look for timestamp information in the points
                        const firstPoint = source.points[0];
                        const lastPoint = source.points[source.points.length - 1];
                        
                        console.log('🕐 Analyzing timestamps:', {
                            firstPoint: firstPoint,
                            lastPoint: lastPoint,
                            hasTime: firstPoint.time !== undefined
                        });
                        
                        // TradingView timestamps are usually in milliseconds or seconds
                        let tradeTimestamp = null;
                        
                        if (lastPoint.time) {
                            tradeTimestamp = lastPoint.time;
                        } else if (firstPoint.time) {
                            tradeTimestamp = firstPoint.time;
                        }
                        
                        if (tradeTimestamp) {
                            // Convert timestamp to date
                            let tradeDate = new Date(tradeTimestamp);
                            
                            // Handle both seconds and milliseconds timestamps
                            if (tradeTimestamp < 1000000000000) {
                                // Timestamp is in seconds, convert to milliseconds
                                tradeDate = new Date(tradeTimestamp * 1000);
                            }
                            
                            // Format as YYYY-MM-DD for storage
                            const formattedDate = tradeDate.toISOString().split('T')[0];
                            trade.date = formattedDate;
                            
                            console.log('🎯 Extracted trade date:', {
                                originalTimestamp: tradeTimestamp,
                                parsedDate: tradeDate.toISOString(),
                                storedDate: formattedDate,
                                humanReadable: tradeDate.toLocaleDateString()
                            });
                        } else {
                            console.log('⚠️ No timestamp found in TradingView data, using current date');
                        }
                    }
                    
                    // If no timestamp found, try to extract from other fields
                    if (trade.date === new Date().toISOString().split('T')[0] && source.state) {
                        // Look for any date-related fields in the state
                        Object.keys(source.state).forEach(key => {
                            if (key.toLowerCase().includes('time') || key.toLowerCase().includes('date')) {
                                console.log(`🕐 Found potential date field: ${key} = ${source.state[key]}`);
                            }
                        });
                    }
                    
                    // Extract symbol
                    if (source.state && source.state.symbol) {
                        const symbolMatch = source.state.symbol.match(/([A-Z0-9!]+)$/);
                        if (symbolMatch) {
                            trade.symbol = symbolMatch[1];
                        }
                    }
                    
                    // Extract timeframe
                    if (source.state && source.state.interval) {
                        trade.timeframe = source.state.interval + 'm';
                    }
                    
                    // Determine direction from tool type
                    if (source.type) {
                        if (source.type.includes('Short')) {
                            trade.direction = 'short';
                        } else if (source.type.includes('Long')) {
                            trade.direction = 'long';
                        }
                    }
                    
                    // Extract prices from points array
                    if (source.points && source.points.length >= 2) {
                        const prices = source.points.map(p => p.price).filter(p => p != null);
                        console.log('📊 Raw points prices:', prices);
                        
                        if (prices.length >= 2) {
                            // Get unique prices and sort them
                            const uniquePrices = [...new Set(prices)].sort((a, b) => b - a); // Sort high to low
                            console.log('📊 Unique prices (high to low):', uniquePrices);
                            
                            if (uniquePrices.length >= 2) {
                                // Normal trade with multiple price levels
                                const entryFreq = {};
                                prices.forEach(p => entryFreq[p] = (entryFreq[p] || 0) + 1);
                                const entryPrice = Object.keys(entryFreq).reduce((a, b) => entryFreq[a] > entryFreq[b] ? a : b);
                                console.log('📍 Entry price (most frequent):', parseFloat(entryPrice));
                                
                                trade.entry_price = parseFloat(entryPrice);
                                
                                // Calculate stop and target levels using TradingView levels
                                if (source.state && source.state.stopLevel && source.state.profitLevel) {
                                    const state = source.state;
                                    const direction = trade.direction;
                                    console.log('📊 Levels from TradingView:', { stopLevel: state.stopLevel, profitLevel: state.profitLevel });
                                    
                                    if (direction === 'short') {
                                        trade.stop_loss = trade.entry_price + (state.stopLevel / 4); // Convert points to price
                                        trade.take_profit = trade.entry_price - (state.profitLevel / 4);
                                    } else {
                                        trade.stop_loss = trade.entry_price - (state.stopLevel / 4);
                                        trade.take_profit = trade.entry_price + (state.profitLevel / 4);
                                    }
                                    
                                    const stopDistance = Math.abs(trade.entry_price - trade.stop_loss);
                                    const profitDistance = Math.abs(trade.take_profit - trade.entry_price);
                                    
                                    console.log('💰 Calculated levels:', {
                                        entry: trade.entry_price,
                                        stop: trade.stop_loss,
                                        target: trade.take_profit,
                                        stopDistance,
                                        profitDistance
                                    });
                                }
                            } else if (uniquePrices.length === 1) {
                                // Break even trade - only one unique price
                                console.log('🟡 BREAK EVEN: Only one unique price detected');
                                const breakEvenPrice = uniquePrices[0];
                                trade.entry_price = breakEvenPrice;
                                trade.exit_price = breakEvenPrice;
                                trade.outcome = 'breakeven';
                                trade.actual_pnl = 0;
                                trade.points_gained = 0;
                                
                                // Still try to extract stop/target levels for reference
                                if (source.state && source.state.stopLevel && source.state.profitLevel) {
                                    const state = source.state;
                                    const direction = trade.direction;
                                    if (direction === 'short') {
                                        trade.stop_loss = breakEvenPrice + (state.stopLevel / 4);
                                        trade.take_profit = breakEvenPrice - (state.profitLevel / 4);
                                    } else {
                                        trade.stop_loss = breakEvenPrice - (state.stopLevel / 4);
                                        trade.take_profit = breakEvenPrice + (state.profitLevel / 4);
                                    }
                                }
                                
                                console.log('💰 Break even trade detected:', {
                                    entry: trade.entry_price,
                                    exit: trade.exit_price,
                                    outcome: trade.outcome
                                });
                            }
                        }
                        
                        // Calculate risk/reward
                        if (trade.entry_price && trade.stop_loss && trade.take_profit) {
                            const risk = Math.abs(trade.entry_price - trade.stop_loss);
                            const reward = Math.abs(trade.take_profit - trade.entry_price);
                            trade.planned_rr = Math.round((reward / risk) * 100) / 100; // Round to 2 decimal places
                        }
                        
                        // Enhanced outcome detection with break even support
                        let outcome = 'unknown';
                        let exitPrice = null;
                        let actualPnL = null;
                        
                        // Check if break even was already detected
                        if (trade.outcome === 'breakeven') {
                            console.log('🟡 Break even outcome already detected, skipping P&L analysis');
                            outcome = 'breakeven';
                            exitPrice = trade.exit_price;
                            actualPnL = 0;
                        } else if (source.state) {
                            const state = source.state;
                            console.log('💰 P&L Analysis:', {
                                targetAmount: state.amountTarget,
                                stopAmount: state.amountStop,
                                riskSize: state.riskSize,
                                qty: state.qty
                            });
                            
                            // NEW: Smart contract rounding system - only for futures contracts
                            let originalQty = state.qty || 1;
                            let roundedQty = originalQty; // Default: no rounding
                            let riskAdjustment = 'normal';
                            let shouldRound = false;
                            
                            // Detect instrument type based on symbol
                            const symbol = trade.symbol || '';
                            const isFutures = symbol.includes('!') || symbol.includes('CME') || symbol.includes('CBOT') || symbol.includes('NYMEX') || symbol.includes('COMEX');
                            const isCFD = symbol.includes('.') || symbol.toLowerCase().includes('cfd') || !isFutures; // CFDs often use . notation or explicit CFD
                            
                            console.log('📋 Instrument Analysis:', {
                                symbol: symbol,
                                isFutures: isFutures,
                                isCFD: isCFD,
                                originalQty: originalQty.toFixed(6)
                            });
                            
                            if (isFutures) {
                                // Only round for futures contracts
                                shouldRound = true;
                                
                                // Smart rounding logic for futures
                                if (originalQty < 0.5) {
                                    // Very small position - check if risk increase is acceptable
                                    if (originalQty > 0) {
                                        const riskIncrease = (1 / originalQty) - 1; // How much risk increases
                                        if (riskIncrease > 4) { // More than 5x risk
                                            console.log('🚨 CANNOT TRADE: Position too small, risk would increase more than 5x');
                                            console.log(`💰 Original qty: ${originalQty.toFixed(6)}, would need 1 contract (${((1/originalQty) * 100).toFixed(0)}% of intended risk)`);
                                            roundedQty = 0; // Don't trade
                                            riskAdjustment = 'cannot_trade';
                                        } else {
                                            roundedQty = 1; // Must round up to trade
                                            riskAdjustment = 'high_risk';
                                            console.log('⚠️ HIGH RISK WARNING: Position small, rounding up');
                                            console.log(`💰 Risk will increase to ${((1/originalQty) * 100).toFixed(0)}% of intended`);
                                        }
                                    } else {
                                        roundedQty = 0; // Can't trade
                                        riskAdjustment = 'cannot_trade';
                                    }
                                } else if (Math.abs(originalQty - Math.round(originalQty)) < 0.25) {
                                    // Close to whole number - round normally
                                    roundedQty = Math.round(originalQty);
                                    const riskMultiplier = roundedQty / originalQty;
                                    if (riskMultiplier > 1.25) {
                                        riskAdjustment = 'moderate_risk';
                                        console.log('⚠️ MODERATE RISK: Rounding increases risk by 25%+');
                                    } else if (riskMultiplier < 0.8) {
                                        riskAdjustment = 'lower_risk';
                                        console.log('📉 LOWER RISK: Rounding decreases risk');
                                    }
                                } else {
                                    // Fractional position - be more conservative
                                    const roundDown = Math.floor(originalQty);
                                    const roundUp = Math.ceil(originalQty);
                                    
                                    // Calculate risk multipliers for both options
                                    const downRiskMultiplier = roundDown > 0 ? roundDown / originalQty : 0;
                                    const upRiskMultiplier = roundUp / originalQty;
                                    
                                    // Prefer rounding down if it doesn't reduce risk too much
                                    if (roundDown > 0 && downRiskMultiplier >= 0.8) {
                                        roundedQty = roundDown;
                                        riskAdjustment = 'lower_risk';
                                        console.log('📉 CONSERVATIVE: Rounded down to reduce risk');
                                    } else if (upRiskMultiplier <= 1.5) {
                                        roundedQty = roundUp;
                                        riskAdjustment = upRiskMultiplier > 1.25 ? 'moderate_risk' : 'normal';
                                        console.log('📈 ROUNDED UP: Risk increase acceptable');
                                    } else {
                                        // Risk increase too high - don't trade
                                        console.log('🚨 SKIP TRADE: Risk increase too high for fractional position');
                                        roundedQty = 0;
                                        riskAdjustment = 'extreme_risk';
                                    }
                                }
                                
                                console.log('📊 Futures Contract Analysis:', {
                                    original: originalQty.toFixed(6),
                                    rounded: roundedQty,
                                    riskMultiplier: roundedQty > 0 ? (roundedQty / originalQty).toFixed(2) + 'x' : '0x',
                                    adjustment: riskAdjustment,
                                    shouldTrade: roundedQty > 0
                                });
                            } else {
                                // CFDs - no rounding needed
                                roundedQty = originalQty;
                                riskAdjustment = 'no_rounding_needed';
                                console.log('💱 CFD DETECTED: Using exact fractional quantity');
                                console.log('📊 CFD Quantity:', originalQty.toFixed(6));
                            }
                            
                            // Calculate actual risk based on final contracts vs planned risk
                            let actualRiskAmount = null;
                            let plannedRiskAmount = state.riskSize || 125;
                            
                            if (roundedQty > 0) {
                                // Calculate actual risk based on the change in contract quantity
                                const riskMultiplier = roundedQty / originalQty;
                                actualRiskAmount = plannedRiskAmount * riskMultiplier;
                                actualRiskAmount = Math.round(actualRiskAmount * 100) / 100; // Round to 2 decimal places
                                
                                console.log('💰 Risk Calculation:', {
                                    instrumentType: isFutures ? 'Futures' : 'CFD',
                                    plannedRisk: `$${plannedRiskAmount}`,
                                    actualRisk: `$${actualRiskAmount.toFixed(2)}`,
                                    originalQty: originalQty.toFixed(6),
                                    actualQty: roundedQty.toFixed(6),
                                    riskMultiplier: `${riskMultiplier.toFixed(3)}x`,
                                    riskChange: `${((riskMultiplier - 1) * 100).toFixed(1)}%`
                                });
                            }
                            
                            // Store contract and risk information for UI display
                            trade.planned_qty = Math.round(originalQty * 1000000) / 1000000; // Round to 6 decimal places for quantities
                            trade.actual_qty = Math.round(roundedQty * 1000000) / 1000000; // Round to 6 decimal places for quantities
                            trade.planned_risk = Math.round(plannedRiskAmount * 100) / 100; // Round to 2 decimal places
                            trade.actual_risk = Math.round(actualRiskAmount * 100) / 100; // Round to 2 decimal places
                            trade.risk_adjustment = riskAdjustment;
                            
                            // NEW: Determine outcome based on which level was hit
                            // Check if we have current price information from the points
                            const prices = source.points.map(p => p.price);
                            const currentPrice = prices[prices.length - 1]; // Last price in the array
                            
                            console.log('🎯 Outcome Analysis:', {
                                entry: trade.entry_price,
                                stop: trade.stop_loss, 
                                target: trade.take_profit,
                                currentPrice: currentPrice,
                                direction: trade.direction,
                                contractsTraded: roundedQty
                            });
                            
                            if (trade.direction === 'short') {
                                // For short trades:
                                // WIN: price moved down to target
                                // LOSS: price moved up to stop
                                const stopDistance = Math.abs(currentPrice - trade.stop_loss);
                                const targetDistance = Math.abs(currentPrice - trade.take_profit);
                                
                                if (stopDistance < targetDistance) {
                                    // Current price is closer to stop = LOSS
                                    outcome = 'loss';
                                    exitPrice = trade.stop_loss;
                                    // For losses, use the actual risk amount (negative)
                                    actualPnL = -(actualRiskAmount || plannedRiskAmount);
                                    actualPnL = Math.round(actualPnL * 100) / 100; // Round to 2 decimal places
                                    console.log('❌ LOSS: Stop hit at', trade.stop_loss, 'Risk lost: $', Math.abs(actualPnL));
                                } else {
                                    // Current price is closer to target = WIN
                                    outcome = 'win';
                                    exitPrice = trade.take_profit;
                                    // For wins, calculate P&L using actual risk × R/R ratio
                                    const riskPoints = Math.abs(trade.stop_loss - trade.entry_price);
                                    const profitPoints = Math.abs(trade.take_profit - trade.entry_price);
                                    const rrRatio = Math.round((profitPoints / riskPoints) * 100) / 100; // Round to 2 decimal places
                                    actualPnL = (actualRiskAmount || plannedRiskAmount) * rrRatio;
                                    actualPnL = Math.round(actualPnL * 100) / 100; // Round to 2 decimal places
                                    console.log('✅ WIN: Target hit at', trade.take_profit, 'Risk: $', (actualRiskAmount || plannedRiskAmount), 'R/R:', rrRatio.toFixed(2), 'P&L: $', actualPnL.toFixed(2));
                                }
                            } else if (trade.direction === 'long') {
                                // For long trades:
                                // WIN: price moved up to target
                                // LOSS: price moved down to stop
                                const stopDistance = Math.abs(currentPrice - trade.stop_loss);
                                const targetDistance = Math.abs(currentPrice - trade.take_profit);
                                
                                if (stopDistance < targetDistance) {
                                    // Current price is closer to stop = LOSS
                                    outcome = 'loss';
                                    exitPrice = trade.stop_loss;
                                    // For losses, use the actual risk amount (negative)
                                    actualPnL = -(actualRiskAmount || plannedRiskAmount);
                                    actualPnL = Math.round(actualPnL * 100) / 100; // Round to 2 decimal places
                                    console.log('❌ LOSS: Stop hit at', trade.stop_loss, 'Risk lost: $', Math.abs(actualPnL));
                                } else {
                                    // Current price is closer to target = WIN
                                    outcome = 'win';
                                    exitPrice = trade.take_profit;
                                    // For wins, calculate P&L using actual risk × R/R ratio
                                    const riskPoints = Math.abs(trade.stop_loss - trade.entry_price);
                                    const profitPoints = Math.abs(trade.take_profit - trade.entry_price);
                                    const rrRatio = Math.round((profitPoints / riskPoints) * 100) / 100; // Round to 2 decimal places
                                    actualPnL = (actualRiskAmount || plannedRiskAmount) * rrRatio;
                                    actualPnL = Math.round(actualPnL * 100) / 100; // Round to 2 decimal places
                                    console.log('✅ WIN: Target hit at', trade.take_profit, 'Risk: $', (actualRiskAmount || plannedRiskAmount), 'R/R:', rrRatio.toFixed(2), 'P&L: $', actualPnL.toFixed(2));
                                }
                            }
                            
                            // Store both planned and actual values for comparison
                            trade.planned_qty = Math.round(originalQty * 1000000) / 1000000; // Round to 6 decimal places for quantities
                            trade.actual_qty = Math.round(roundedQty * 1000000) / 1000000; // Round to 6 decimal places for quantities
                            trade.planned_risk = Math.round(plannedRiskAmount * 100) / 100; // Round to 2 decimal places
                            trade.actual_risk = Math.round(actualRiskAmount * 100) / 100; // Round to 2 decimal places
                            
                            // Alternative check using P&L amounts if distance method unclear
                            if (outcome === 'unknown' && state.amountTarget && state.amountStop) {
                                const profitRatio = state.amountTarget / state.riskSize;
                                console.log('📊 Risk Analysis:', {
                                    risk: state.riskSize,
                                    target: state.amountTarget, 
                                    ratio: Math.round(profitRatio * 100) / 100 // Round to 2 decimal places
                                });
                                
                                if (profitRatio > 8) {
                                    outcome = 'win';
                                    exitPrice = trade.take_profit;
                                    // Calculate P&L using actual risk × R/R ratio
                                    const riskPoints = Math.abs(trade.stop_loss - trade.entry_price);
                                    const profitPoints = Math.abs(trade.take_profit - trade.entry_price);
                                    const rrRatio = Math.round((profitPoints / riskPoints) * 100) / 100; // Round to 2 decimal places
                                    actualPnL = (actualRiskAmount || plannedRiskAmount) * rrRatio;
                                    actualPnL = Math.round(actualPnL * 100) / 100; // Round to 2 decimal places
                                    console.log('🚀 High profit ratio suggests successful trade. Risk: $', (actualRiskAmount || plannedRiskAmount), 'R/R:', rrRatio.toFixed(2), 'P&L: $', actualPnL.toFixed(2));
                                } else if (profitRatio < 2) {
                                    outcome = 'loss';
                                    exitPrice = trade.stop_loss;
                                    // For losses, use the actual risk amount (negative)
                                    actualPnL = -(actualRiskAmount || plannedRiskAmount);
                                    actualPnL = Math.round(actualPnL * 100) / 100; // Round to 2 decimal places
                                    console.log('📉 Low profit ratio suggests stopped out trade. Risk lost: $', Math.abs(actualPnL));
                                }
                            }
                        }
                        
                        // Update trade object with outcome
                        if (outcome !== 'unknown') {
                            trade.outcome = outcome;
                            trade.exit_price = Math.round(exitPrice * 100) / 100; // Round prices to 2 decimal places
                            trade.actual_pnl = Math.round(actualPnL * 100) / 100; // Round to 2 decimal places
                            if (exitPrice && trade.entry_price) {
                                trade.points_gained = Math.round(Math.abs(exitPrice - trade.entry_price) * 100) / 100; // Round to 2 decimal places
                                if (trade.stop_loss && trade.entry_price) {
                                    const riskPoints = Math.abs(trade.stop_loss - trade.entry_price);
                                    trade.actual_rr = Math.round((trade.points_gained / riskPoints) * 100) / 100; // Round to 2 decimal places
                                }
                            }
                        }
                        
                        // Final logging with rounded values
                        console.log('💰 Extracted prices:', {
                            entry: trade.entry_price ? Math.round(trade.entry_price * 100) / 100 : null,
                            stop: trade.stop_loss ? Math.round(trade.stop_loss * 100) / 100 : null,
                            target: trade.take_profit ? Math.round(trade.take_profit * 100) / 100 : null,
                            rr: trade.planned_rr ? Math.round(trade.planned_rr * 100) / 100 : null
                        });
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error parsing TradingView JSON:', error);
        }
    }
    
    // Fallback: try to extract numbers from text
    if (!trade.entry_price) {
        const numbers = [];
        const patterns = [
            /\b(2[01],[0-9]{3}\.[0-9]{1,2})\b/gi,  // Formatted prices like 21,324.50
            /\b(2[01][0-9]{3}\.[0-9]{1,2})\b/gi,   // Unformatted prices like 21324.50  
            /\b(2[01][0-9]{3})\b/g                  // Whole numbers like 21324
        ];
        
        patterns.forEach(pattern => {
            const matches = tradeData.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const num = parseFloat(match.replace(/,/g, ''));
                    if (num >= 18000 && num <= 25000) { // NQ1! range
                        numbers.push(num);
                    }
                });
            }
        });
        
        console.log('📊 Found potential prices:', numbers);
        
        if (numbers.length >= 2) {
            const uniqueNumbers = [...new Set(numbers)].sort((a, b) => b - a);
            
            if (uniqueNumbers.length >= 2) {
                trade.entry_price = uniqueNumbers[Math.floor(uniqueNumbers.length / 2)];
                trade.stop_loss = uniqueNumbers[0];
                trade.take_profit = uniqueNumbers[uniqueNumbers.length - 1];
            }
        }
    }

    return trade;
}

// Process text-based trade data
app.post('/api/process-trade-text', async (req, res) => {
    try {
        console.log('📝 Processing trade text data...');
        
        // Handle both JSON format (tradeData) and URL-encoded format (tradeText)
        const tradeData = req.body.tradeData || req.body.tradeText;
        
        if (!tradeData || typeof tradeData !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: 'No trade data provided' 
            });
        }
        
        // Parse the trade data
        const trade = parseTradingViewData(tradeData);
        
        // Generate ID and save to database
        trade.id = uuidv4();
        
        // Save using the Database class
        await database.saveTrade(trade);
        
        console.log('✅ Trade saved with ID:', trade.id);
        
        res.json({
            success: true,
            trade: trade,
            message: 'Trade data processed successfully'
        });
        
    } catch (error) {
        console.error('❌ Error processing trade text:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process trade data: ' + error.message
        });
    }
});

// Get all trades
app.get('/api/trades', async (req, res) => {
    try {
        const trades = await database.getAllTrades();
        res.json(trades);
    } catch (error) {
        console.error('Error fetching trades:', error);
        res.status(500).json({ error: 'Failed to fetch trades' });
    }
});

// Get analytics
app.get('/api/analytics', async (req, res) => {
    try {
        const trades = await database.getAllTrades();
        
        const analytics = {
            totalTrades: trades.length,
            winRate: 0,
            avgRiskReward: 0,
            totalPnL: 0
        };
        
        if (trades.length > 0) {
            const profitableTrades = trades.filter(t => t.outcome === 'profit');
            analytics.winRate = Math.round((profitableTrades.length / trades.length) * 100);
            
            const validRR = trades.filter(t => t.plannedRR !== null);
            if (validRR.length > 0) {
                analytics.avgRiskReward = (validRR.reduce((sum, t) => sum + t.plannedRR, 0) / validRR.length).toFixed(2);
            }
            
            const validPnL = trades.filter(t => t.actualPnL !== null);
            if (validPnL.length > 0) {
                analytics.totalPnL = Math.round(validPnL.reduce((sum, t) => sum + t.actualPnL, 0));
            }
        }
        
        res.json(analytics);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get single trade by ID
app.get('/api/trades/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const trade = await database.getTrade(id);
        
        if (!trade) {
            return res.status(404).json({ error: 'Trade not found' });
        }
        
        res.json(trade);
    } catch (error) {
        console.error('Error fetching trade:', error);
        res.status(500).json({ error: 'Failed to fetch trade' });
    }
});

// Update trade by ID
app.put('/api/trades/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Check if trade exists
        const existingTrade = await database.getTrade(id);
        if (!existingTrade) {
            return res.status(404).json({ error: 'Trade not found' });
        }
        
        // Update the trade using the database method
        const updatedTrade = await database.updateTrade(id, updates);
        
        if (!updatedTrade) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        console.log('✅ Trade updated successfully:', id);
        
        // Get the final updated trade with proper formatting
        const finalTrade = await database.getTrade(id);
        
        res.json({
            success: true,
            trade: finalTrade,
            message: 'Trade updated successfully'
        });
        
    } catch (error) {
        console.error('❌ Error updating trade:', error);
        res.status(500).json({ error: 'Failed to update trade: ' + error.message });
    }
});

// Delete all trades
app.delete('/api/trades', async (req, res) => {
    try {
        await database.deleteAllTrades();
        res.json({ success: true, message: 'All trades deleted' });
    } catch (error) {
        console.error('Error deleting trades:', error);
        res.status(500).json({ error: 'Failed to delete trades' });
    }
});

// Serve uploaded screenshots
app.use('/uploads', express.static('uploads'));

// Fallback route for handling old screenshot paths in production
app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    // In production, if the file doesn't exist locally, return a placeholder or 404
    if (process.env.NODE_ENV === 'production') {
        console.log('⚠️ Trying to serve old screenshot in production:', filename);
        
        // Check if file exists in local uploads (it won't in production)
        if (!fs.existsSync(filePath)) {
            console.log('❌ File not found in production, returning 404');
            return res.status(404).json({ 
                error: 'Screenshot not available',
                message: 'This screenshot was uploaded before proper cloud storage was configured. Please re-upload the screenshot.' 
            });
        }
    }
    
    // Development: serve the file normally
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving file:', err);
            res.status(404).json({ 
                error: 'Screenshot not found',
                message: 'The requested screenshot could not be found.' 
            });
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }
    res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
    console.log(`\n🎯 Server running at http://localhost:${PORT}`);
    console.log('📋 Ready to process TradingView position tool data!');
    console.log('💡 Copy position tool from TradingView and paste into the app');
});

module.exports = app; 