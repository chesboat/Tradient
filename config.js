// Configuration for PropJournal

module.exports = {
    // OpenAI API Key for GPT Vision
    // Get your API key from: https://platform.openai.com/api-keys
    // Set this as an environment variable: OPENAI_API_KEY=your_key_here
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    
    // Server configuration
    PORT: process.env.PORT || 3000,
    
    // Upload configuration
    UPLOAD_PATH: 'uploads/',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
}; 