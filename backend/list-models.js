require('dotenv').config({ path: 'backend/.env' });

const key = process.env.GEMINI_API_KEY;
if (!key) {
    console.error("Error: GEMINI_API_KEY not found in .env");
    process.exit(1);
}

// Sanitize key
const sanitizedKey = key.trim().replace(/^["']|["']$/g, '');
console.log(`Loaded Key Length: ${key.length}`);
console.log(`Sanitized Key Length: ${sanitizedKey.length}`);
console.log(`Key Start: ${sanitizedKey.substring(0, 5)}...`);


async function listModels() {
  console.log("Fetching available models...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${sanitizedKey}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text}`);
    }
    
    const data = await response.json();
    console.log("\nAvailable Models:");
    if (data.models) {
        data.models.forEach(m => {
            if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`- ${m.name} (Version: ${m.version})`);
            }
        });
    } else {
        console.log("No models found in response.");
    }
    
  } catch (error) {
    console.error("Failed to list models:", error.message);
  }
}

listModels();
