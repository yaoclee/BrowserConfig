// Simple script to create basic PNG icons using Canvas (run in browser console)
// First run this function to create all icons
function createAllIcons() {
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    
    sizes.forEach(size => createBasicIcon(size));
    console.log('Icons created! Check your downloads folder.');
}

function createBasicIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#007bff';
    ctx.fillRect(0, 0, size, size);
    
    // White circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size*0.3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Clock hands
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = size * 0.02;
    ctx.lineCap = 'round';
    
    // Hour hand
    ctx.beginPath();
    ctx.moveTo(size/2, size/2);
    ctx.lineTo(size/2, size/2 - size*0.15);
    ctx.stroke();
    
    // Minute hand
    ctx.beginPath();
    ctx.moveTo(size/2, size/2);
    ctx.lineTo(size/2 + size*0.12, size/2);
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = '#007bff';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size*0.02, 0, 2 * Math.PI);
    ctx.fill();
    
    // Convert to blob and create download
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `icon-${size}x${size}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// To use this script:
// 1. Copy and paste this entire file into browser console
// 2. Then run: createAllIcons()
console.log('Icon creator script loaded! Run createAllIcons() to generate all icons.');
