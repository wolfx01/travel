const key = "AIzaSyDFYkIvvlgD28bjvHVVnrDm6tE7P9EyP1M";

async function listModels() {
  console.log("Fetching available models...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
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
