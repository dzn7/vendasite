const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Install Tailwind CSS if not already installed
try {
    console.log('Installing Tailwind CSS...');
    execSync('npm install -D tailwindcss@latest postcss@latest autoprefixer@latest', { stdio: 'inherit' });
    
    // Initialize Tailwind CSS if config doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'tailwind.config.js'))) {
        execSync('npx tailwindcss init -p', { stdio: 'inherit' });
    }
    
    console.log('Building CSS...');
    execSync('npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify', { stdio: 'inherit' });
    
    console.log('Build completed successfully!');
} catch (error) {
    console.error('Error during build:', error);
    process.exit(1);
}
