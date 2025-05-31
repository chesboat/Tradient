const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.isConnected = false;
    }

    init() {
        try {
            const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/trades.db' : path.join(__dirname, '..', 'trades.db');
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    console.warn('⚠️  Database not available - running in limited mode');
                    this.isConnected = false;
                } else {
                    console.log('📊 Connected to SQLite database');
                    this.isConnected = true;
                    this.createTables();
                }
            });
        } catch (error) {
            console.error('Database initialization failed:', error);
            console.warn('⚠️  Running without database support');
            this.isConnected = false;
        }
    }

    createTables() {
        if (!this.isConnected) return;
        
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS trades (
                id TEXT PRIMARY KEY,
                symbol TEXT,
                direction TEXT,
                entry_price REAL,
                stop_loss REAL,
                take_profit REAL,
                exit_price REAL,
                outcome TEXT,
                actual_pnl REAL,
                risk_reward REAL,
                planned_qty REAL,
                actual_qty REAL,
                planned_risk REAL,
                actual_risk REAL,
                planned_rr REAL,
                actual_rr REAL,
                risk_adjustment TEXT,
                date TEXT,
                timeframe TEXT,
                reasoning TEXT,
                raw_data TEXT,
                original_filename TEXT,
                raw_text TEXT,
                color_analysis TEXT,
                screenshot_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    async saveTrade(tradeData) {
        if (!this.isConnected) {
            console.warn('⚠️  Database not available - trade not saved');
            return { ...tradeData, warning: 'Database not available' };
        }
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO trades (
                    id, symbol, direction, entry_price, stop_loss, take_profit,
                    exit_price, outcome, actual_pnl, risk_reward, planned_qty,
                    actual_qty, planned_risk, actual_risk, planned_rr, actual_rr,
                    risk_adjustment, date, timeframe, reasoning, raw_data,
                    original_filename, raw_text, color_analysis, screenshot_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                tradeData.id,
                tradeData.symbol,
                tradeData.direction,
                tradeData.entry_price,
                tradeData.stop_loss,
                tradeData.take_profit,
                tradeData.exit_price,
                tradeData.outcome,
                tradeData.actual_pnl,
                tradeData.risk_reward,
                tradeData.planned_qty,
                tradeData.actual_qty,
                tradeData.planned_risk,
                tradeData.actual_risk,
                tradeData.planned_rr,
                tradeData.actual_rr,
                tradeData.risk_adjustment,
                tradeData.date,
                tradeData.timeframe,
                tradeData.reasoning,
                tradeData.raw_data,
                tradeData.original_filename,
                tradeData.raw_text,
                JSON.stringify(tradeData.color_analysis),
                tradeData.screenshot_path
            ];

            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Error saving trade:', err);
                    reject(err);
                } else {
                    console.log('✅ Trade saved with ID:', tradeData.id);
                    resolve(tradeData);
                }
            });
        });
    }

    async getAllTrades() {
        if (!this.isConnected) {
            console.warn('⚠️  Database not available - returning empty trades list');
            return [];
        }
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM trades 
                ORDER BY created_at DESC
            `;

            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const trades = rows.map(row => this.formatTradeRow(row));
                    resolve(trades);
                }
            });
        });
    }

    async getTrade(id) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM trades WHERE id = ?`;

            this.db.get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    resolve(this.formatTradeRow(row));
                } else {
                    resolve(null);
                }
            });
        });
    }

    async updateTrade(id, updates) {
        return new Promise((resolve, reject) => {
            // Build dynamic update query
            const updateFields = [];
            const params = [];

            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    updateFields.push(`${this.camelToSnake(key)} = ?`);
                    params.push(updates[key]);
                }
            });

            if (updateFields.length === 0) {
                return resolve(null);
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            const sql = `
                UPDATE trades 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `;

            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    // Return updated trade
                    resolve({ id, ...updates });
                }
            });
        });
    }

    async deleteTrade(id) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM trades WHERE id = ?`;

            this.db.run(sql, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ deletedRows: this.changes });
                }
            });
        });
    }

    async updateTradeScreenshot(id, screenshotPath) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE trades SET screenshot_path = ? WHERE id = ?`;

            this.db.run(sql, [screenshotPath, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Screenshot added to trade ID:', id);
                    resolve({ id, screenshotPath });
                }
            });
        });
    }

    async deleteAllTrades() {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM trades`;

            this.db.run(sql, [], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log('🗑️ All trades deleted');
                    resolve({ deletedRows: this.changes });
                }
            });
        });
    }

    async getLatestTrade() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM trades ORDER BY created_at DESC LIMIT 1`;

            this.db.get(sql, [], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    resolve(this.formatTradeRow(row));
                } else {
                    resolve(null);
                }
            });
        });
    }

    async getStats() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_trades,
                    COUNT(CASE WHEN direction = 'long' THEN 1 END) as long_trades,
                    COUNT(CASE WHEN direction = 'short' THEN 1 END) as short_trades,
                    AVG(risk_reward) as avg_risk_reward,
                    COUNT(CASE WHEN outcome = 'profit' THEN 1 END) as profit_trades,
                    COUNT(CASE WHEN outcome = 'loss' THEN 1 END) as loss_trades
                FROM trades
            `;

            this.db.get(sql, [], (err, stats) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        totalTrades: stats.total_trades,
                        longTrades: stats.long_trades,
                        shortTrades: stats.short_trades,
                        avgRiskReward: stats.avg_risk_reward,
                        profitTrades: stats.profit_trades,
                        lossTrades: stats.loss_trades
                    });
                }
            });
        });
    }

    formatTradeRow(row) {
        return {
            id: row.id,
            symbol: row.symbol,
            direction: row.direction,
            entryPrice: row.entry_price,
            stopLoss: row.stop_loss,
            takeProfit: row.take_profit,
            exitPrice: row.exit_price,
            outcome: row.outcome,
            actualPnL: row.actual_pnl,
            riskReward: row.risk_reward,
            plannedQty: row.planned_qty,
            actualQty: row.actual_qty,
            plannedRisk: row.planned_risk,
            actualRisk: row.actual_risk,
            plannedRR: row.planned_rr,
            actualRR: row.actual_rr,
            riskAdjustment: row.risk_adjustment,
            date: row.date,
            timeframe: row.timeframe,
            reasoning: row.reasoning,
            rawData: row.raw_data,
            originalFilename: row.original_filename,
            rawText: row.raw_text,
            colorAnalysis: row.color_analysis ? JSON.parse(row.color_analysis) : null,
            screenshotPath: row.screenshot_path,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

// Export singleton instance
const database = new Database();

module.exports = database; 