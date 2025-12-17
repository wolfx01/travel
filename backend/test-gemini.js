require('dotenv').config({ path: './.env' });

console.log("Current directory:", process.cwd());
const key = process.env.GEMINI_API_KEY;
console.log("API Key loaded:", key ? "YES" : "NO");
if (key) console.log("Key start:", key.substring(0, 5) + "...");

async function testModel(modelName) {
  console.log(`\nTesting ${modelName}...`);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello" }] }]
      })
    });

    if (response.ok) {
        const data = await response.json();
        console.log(`[SUCCESS] ${modelName} responded.`);
    } else {
        const text = await response.text();
        console.error(`[FAILURE] ${modelName} failed: ${response.status}`);
        console.error(text);
    }
  } catch (error) {
    console.error(`[ERROR] ${modelName} exception:`, error.message);
  }
}

(async () => {
    await testModel('gemini-1.5-flash');
    await testModel('gemini-2.0-flash-exp');
    await testModel('gemini-2.0-flash');
})();
