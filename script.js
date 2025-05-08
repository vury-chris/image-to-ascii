const themeToggle = document.getElementById('themeToggle');
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const preview = document.getElementById('preview');
const scaleInput = document.getElementById('scale');
const scaleValue = document.getElementById('scaleValue');
const thresholdInput = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const invertInput = document.getElementById('invert');
const textInput = document.getElementById('textInput');
const convertTextBtn = document.getElementById('convertTextBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const brailleOutput = document.getElementById('brailleOutput');
const charCount = document.getElementById('charCount');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

let currentImage = null;
let currentInputMode = 'image';

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabContents.forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(tabId + '-tab').style.display = 'block';
        currentInputMode = tabId;
        if (tabId === 'image' && currentImage) {
            processImage();
        } else if (tabId === 'text' && textInput.value.trim()) {
            processText();
        }
    });
});

themeToggle.addEventListener('change', () => {
    document.documentElement.setAttribute('data-theme', 
        themeToggle.checked ? 'dark' : 'light');
});

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    themeToggle.checked = true;
    document.documentElement.setAttribute('data-theme', 'dark');
}

scaleInput.addEventListener('input', () => {
    scaleValue.textContent = scaleInput.value;
    updateOutput();
});

thresholdInput.addEventListener('input', () => {
    thresholdValue.textContent = thresholdInput.value;
    updateOutput();
});

invertInput.addEventListener('change', () => {
    updateOutput();
});

uploadArea.addEventListener('click', () => {
    fileInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('active');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('active');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('active');
    
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        handleFile(fileInput.files[0]);
    }
});

textInput.addEventListener('input', () => {
    processText();
});

convertTextBtn.addEventListener('click', () => {
    processText();
});

function handleFile(file) {
    if (file && file.type.match('image.*')) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            currentImage = new Image();
            currentImage.src = e.target.result;
            currentImage.onload = function() {
                processImage();
            };
        };
        
        reader.readAsDataURL(file);
    }
}

function updateOutput() {
    if (currentInputMode === 'image' && currentImage) {
        processImage();
    } else if (currentInputMode === 'text' && textInput.value.trim()) {
        processText();
    }
}

function processImage() {
    if (!currentImage) return;
    
    const scale = parseInt(scaleInput.value) / 100;
    const threshold = parseInt(thresholdInput.value);
    const invert = invertInput.checked;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const aspectRatio = currentImage.width / currentImage.height;
    const baseWidth = 50;
    
    // Scale dimensions
    const width = Math.max(10, Math.floor(baseWidth * scale));
    
    canvas.width = Math.ceil(width * 2);  // Braille cells are 2 dots wide, ensure even number
    canvas.height = Math.ceil((width * 2) / aspectRatio / 2) * 4;  // Braille cells are 4 dots tall, ensure multiple of 4
    
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    
    enhanceContrast(ctx, canvas.width, canvas.height);
    
    const brailleText = generateBrailleArt(ctx, canvas.width, canvas.height, threshold, invert);
    
    brailleOutput.textContent = brailleText;
    charCount.textContent = brailleText.length;
    
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
}

function processText() {
    const text = textInput.value;
    if (!text.trim()) {
        brailleOutput.textContent = '';
        charCount.textContent = '0';
        return;
    }

    const scale = parseInt(scaleInput.value) / 100;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const fontSize = 24;
    ctx.font = `${fontSize}px Arial`;

    const lines = text.split('\n');
    const longestLine = lines.reduce((longest, line) => 
        Math.max(longest, ctx.measureText(line).width), 0);
    
    const canvasWidth = Math.ceil(longestLine);
    const canvasHeight = Math.ceil(fontSize * lines.length * 1.2); // 1.2 for line spacing
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
 
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'black';
    ctx.font = `${fontSize}px Arial`;
    lines.forEach((line, index) => {
        ctx.fillText(line, 0, (index + 1) * fontSize * 1.2);
    });
    
    const threshold = parseInt(thresholdInput.value);
    const invert = invertInput.checked;
    
    const scaledWidth = Math.max(10, Math.floor(canvasWidth * scale)); // Ensuring minimum size
    const scaledCanvas = document.createElement('canvas');
    const scaledCtx = scaledCanvas.getContext('2d');
    scaledCanvas.width = Math.ceil(scaledWidth / 2) * 2;
    scaledCanvas.height = Math.ceil((canvasHeight * scale) / 4) * 4;
    scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
    const brailleText = generateBrailleArt(scaledCtx, scaledCanvas.width, scaledCanvas.height, threshold, invert);
    
    brailleOutput.textContent = brailleText;
    charCount.textContent = brailleText.length;
    
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
}

function enhanceContrast(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    let min = 255;
    let max = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const gray = 0.3 * r + 0.59 * g + 0.11 * b;
        
        min = Math.min(min, gray);
        max = Math.max(max, gray);
    }
    
    const range = max - min;
    if (range > 0) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const gray = 0.3 * r + 0.59 * g + 0.11 * b;
            
            const normalized = (gray - min) / range * 255;
            
            data[i] = normalized;
            data[i + 1] = normalized;
            data[i + 2] = normalized;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function generateBrailleArt(ctx, width, height, threshold, invert) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    let result = [];
    
    for (let y = 0; y < height; y += 4) {
        let line = '';
        
        for (let x = 0; x < width; x += 2) {
            let dots = 0;
            let hasContent = false;
            
            const positions = [
                [0, 0], [0, 1], [0, 2], [1, 0],
                [1, 1], [1, 2], [0, 3], [1, 3]
            ];
            
            for (let i = 0; i < positions.length; i++) {
                const px = x + positions[i][0];
                const py = y + positions[i][1];
                
                if (px < width && py < height) {
                    const index = (py * width + px) * 4;
                    const gray = data[index]; 
                    
                    let isDot = gray < threshold;
                    
                    if (invert) {
                        isDot = !isDot;
                    }
                    
                    if (isDot) {
                        dots |= (1 << i);
                        hasContent = true;
                    }
                }
            }
            
            const brailleChar = String.fromCharCode(0x2800 + dots);
            line += brailleChar;
        }
        
        if (line.replace(/\u2800/g, '').length > 0) {
            result.push(line);
        }
    }
    
    const finalResult = optimizeBrailleOutput(result);
    return finalResult;
}

function optimizeBrailleOutput(lines) {
    const filteredLines = lines.filter(line => {
        const nonEmptyCount = line.replace(/\u2800/g, '').length;
        return nonEmptyCount > line.length * 0.05; // Only keep lines with at least 5% content
    });
    
    let startIndex = 0;
    let endIndex = filteredLines.length - 1;
    
    while (startIndex < filteredLines.length && filteredLines[startIndex].replace(/\u2800/g, '').length === 0) {
        startIndex++;
    }
    
    while (endIndex >= 0 && filteredLines[endIndex].replace(/\u2800/g, '').length === 0) {
        endIndex--;
    }
    
    const trimmedLines = filteredLines.slice(startIndex, endIndex + 1).map(line => {
        let lastIndex = line.length - 1;
        while (lastIndex >= 0 && line[lastIndex] === '\u2800') {
            lastIndex--;
        }
        return line.substring(0, lastIndex + 1);
    });
    
    return trimmedLines.join('\n');
}

// Copy and download functionality
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(brailleOutput.textContent).then(() => {
        const message = document.createElement('div');
        message.className = 'copy-message';
        message.textContent = 'Copied to clipboard!';
        document.body.appendChild(message);
        
        setTimeout(() => {
            document.body.removeChild(message);
        }, 2000);
    });
});

downloadBtn.addEventListener('click', () => {
    const blob = new Blob([brailleOutput.textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'braille-art.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});