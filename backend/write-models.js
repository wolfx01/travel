const fs = require('fs');
const key = "AIzaSyDFYkIvvlgD28bjvHVVnrDm6tE7P9EyP1M";

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
        const text = await response.text();
        fs.writeFileSync('backend/clean_models.txt', `API Error ${response.status}: ${text}`);
        return;
    }
    
    const data = await response.json();
    let output = "Available Models:\n";
    if (data.models) {
        data.models.forEach(m => {
            if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                output += `- ${m.name}\n`;
            }
        });
    } else {
        output += "No models found in response.\n";
    }
    fs.writeFileSync('backend/clean_models.txt', output);
    console.log("Models written to backend/clean_models.txt");
    
  } catch (error) {
    fs.writeFileSync('backend/clean_models.txt', `Failed to list models: ${error.message}`);
  }
}

listModels();
