// Test OpenAI API connection
require('dotenv').config();
const OpenAI = require('openai');

console.log('Testing OpenAI API connection...\n');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log('API Key (first 20 chars):', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');
console.log();

// Test with a simple completion
openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Say "Hello"' }],
  max_tokens: 10
})
  .then(response => {
    console.log('✅ OpenAI API is working!');
    console.log('Response:', response.choices[0].message.content);
    console.log('\n🎉 Your OpenAI API key is valid!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ OpenAI API Error:', error.message);
    if (error.status === 401) {
      console.log('\n⚠️  Your API key is invalid or expired.');
      console.log('Please get a new key from: https://platform.openai.com/api-keys\n');
    } else if (error.status === 429) {
      console.log('\n⚠️  Rate limit exceeded or quota exhausted.');
      console.log('Check your usage at: https://platform.openai.com/usage\n');
    }
    process.exit(1);
  });
