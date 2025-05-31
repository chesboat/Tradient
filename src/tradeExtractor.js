const OpenAI = require('openai');
const sharp = require('sharp');
const fs = require('fs');
const config = require('../config');

class TradeExtractor {
    constructor() {
        this.initOpenAI();
    }

    async initOpenAI() {
        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: config.OPENAI_API_KEY
        });
    }

    async extractTradeData(imagePath) {
        try {
            console.log('🎯 Starting GPT Vision Trade Analysis for:', imagePath);

            // Convert image to base64 for GPT Vision
            const imageBase64 = await this.convertImageToBase64(imagePath);
            
            // Analyze with GPT Vision
            const visionResult = await this.analyzeWithGPTVision(imageBase64);
            console.log('🤖 GPT Vision Analysis:', visionResult);

            // Parse the GPT response and structure the data
            const tradeData = this.parseGPTResponse(visionResult);
            
            console.log('✅ Final Trade Data:', {
                symbol: tradeData.symbol,
                direction: tradeData.direction,
                entryPrice: tradeData.entryPrice,
                stopLoss: tradeData.stopLoss,
                takeProfit: tradeData.takeProfit,
                outcome: tradeData.outcome,
                exitPrice: tradeData.exitPrice,
                actualPnL: tradeData.actualPnL,
                riskReward: tradeData.riskReward
            });

            return tradeData;

        } catch (error) {
            console.error('❌ Error in GPT Vision analysis:', error);
            
            // Fallback to basic extraction if GPT fails
            return this.createFallbackData(imagePath);
        }
    }

    async convertImageToBase64(imagePath) {
        try {
            // Optimize image for GPT Vision (reduce size while maintaining quality)
            const optimizedBuffer = await sharp(imagePath)
                .resize(2048, 2048, { 
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: 85 })
                .toBuffer();

            return optimizedBuffer.toString('base64');
        } catch (error) {
            console.error('Error converting image to base64:', error);
            // Fallback to reading file directly
            const imageBuffer = fs.readFileSync(imagePath);
            return imageBuffer.toString('base64');
        }
    }

    async analyzeWithGPTVision(imageBase64) {
        const prompt = `
You are an expert TradingView chart analyst. Analyze this screenshot and extract the EXACT position tool trade data.

**CRITICAL: Look for the colored position tool areas and their corresponding price labels on the RIGHT SIDE**

The position tool shows:
- RED area = Stop Loss level 
- GREEN area = Take Profit level
- BLUE/CYAN area = Entry level (or between red/green)

**FOCUS ON THE RIGHT-SIDE PRICE LABELS**: These show exact prices like 21,298.75, 21,354.50, 21,131.75

**DIRECTION RULES**:
- SHORT: Red (stop) above Green (target)  
- LONG: Green (target) above Red (stop)

**TRADE OUTCOME**: Look at the rightmost candlesticks - did price hit stop, target, or still running?

Respond with this EXACT JSON format:
{
  "symbol": "NQ1!",
  "direction": "short",
  "timeframe": "3m",
  "entryPrice": 21298.75,
  "stopLoss": 21354.50,
  "takeProfit": 21131.75,
  "outcome": "profit",
  "exitPrice": 21200.00,
  "confidence": 0.95,
  "reasoning": "Describe what you see - position tool colors and exact price labels"
}

**IMPORTANT**: Use the EXACT decimal values from the right-side price labels. Do not round or approximate.
`;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { 
                                type: "text", 
                                text: prompt 
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageBase64}`,
                                    detail: "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                temperature: 0.1 // Low temperature for consistent analysis
            });

            const content = response.choices[0].message.content;
            console.log('Raw GPT Vision response:', content);
            
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in GPT response');
            }

        } catch (error) {
            console.error('GPT Vision API error:', error);
            throw error;
        }
    }

    parseGPTResponse(gptResult) {
        // Calculate additional metrics from GPT's analysis
        const entryPrice = gptResult.entryPrice || null;
        const stopLoss = gptResult.stopLoss || null;
        const takeProfit = gptResult.takeProfit || null;
        const exitPrice = gptResult.exitPrice || entryPrice;
        const direction = gptResult.direction || 'unknown';

        // Calculate P&L
        let actualPnL = null;
        if (entryPrice && exitPrice) {
            if (direction === 'short') {
                actualPnL = entryPrice - exitPrice; // Profit when price goes down
            } else {
                actualPnL = exitPrice - entryPrice; // Profit when price goes up  
            }
        }

        // Calculate planned Risk/Reward
        let plannedRR = null;
        if (entryPrice && stopLoss && takeProfit) {
            const risk = Math.abs(entryPrice - stopLoss);
            const reward = Math.abs(takeProfit - entryPrice);
            plannedRR = risk > 0 ? (reward / risk) : null;
        }

        // Calculate actual Risk/Reward
        let actualRR = null;
        if (entryPrice && stopLoss && exitPrice) {
            const risk = Math.abs(entryPrice - stopLoss);
            const actualGain = Math.abs(actualPnL || 0);
            actualRR = risk > 0 ? (actualGain / risk) : null;
        }

        // Enhanced trade data structure
        return {
            symbol: gptResult.symbol || 'NQ1!',
            direction: direction,
            timeframe: gptResult.timeframe || '3m',
            date: new Date().toISOString().split('T')[0],
            entryPrice: entryPrice,
            stopLoss: stopLoss,
            takeProfit: takeProfit,
            outcome: gptResult.outcome || 'unknown',
            exitPrice: exitPrice,
            actualPnL: actualPnL,
            pointsGained: Math.abs((exitPrice || 0) - (entryPrice || 0)),
            duration: 'unknown',
            plannedRR: plannedRR,
            actualRR: actualRR,
            riskReward: actualRR,
            reasoning: gptResult.reasoning || 'GPT Vision analysis',
            rawGPTResponse: gptResult
        };
    }

    createFallbackData(imagePath) {
        console.log('🔄 Creating fallback data due to GPT Vision failure');
        
        return {
            symbol: 'NQ1!',
            direction: 'unknown',
            timeframe: '3m',
            date: new Date().toISOString().split('T')[0],
            entryPrice: null,
            stopLoss: null,
            takeProfit: null,
            outcome: 'unknown',
            exitPrice: null,
            actualPnL: null,
            pointsGained: null,
            duration: 'unknown',
            plannedRR: null,
            actualRR: null,
            riskReward: null,
            reasoning: 'Fallback data - GPT Vision analysis failed',
            rawGPTResponse: null
        };
    }
}

// Export singleton instance
const tradeExtractor = new TradeExtractor();

module.exports = {
    extractTradeData: (imagePath) => tradeExtractor.extractTradeData(imagePath)
}; 