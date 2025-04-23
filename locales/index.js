const fs = require('fs');
const path = require('path');
require('dotenv').config();

const currentConfigName = process.env.CURRENT_CLUB_CONFIG || 'default';
const clubName = process.env.CLUB_NAME || 'Наш Клуб';
const instagramLink = process.env.INSTAGRAM_LINK || '';
let texts = {};



try {
    const filePath = path.join(__dirname, currentConfigName, 'texts.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    texts = JSON.parse(fileContent);
    console.log(`Loaded text configuration: ${currentConfigName}`);
} catch (error) {
    console.error(`FATAL: Could not load text configuration for "${currentConfigName}". Error: ${error.message}`);
    process.exit(1);
}


function getText(key, placeholders = {}) {
    let text = texts[key] || `MISSING_TEXT[${key}]`;


    const allPlaceholders = {
        clubName: clubName,
        instagramLink: instagramLink,
        ...placeholders
    };

    for (const placeholderKey in allPlaceholders) {
        const regex = new RegExp(`\\{\\{\\s*${placeholderKey}\\s*\\}\\}`, 'g');
        text = text.replace(regex, allPlaceholders[placeholderKey]);
    }
    return text;
};

module.exports = {
    getText,

};