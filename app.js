// QR Training App
class QRTrainer {
    constructor() {
        this.currentText = '';
        this.currentDifficulty = 'easy';
        this.stats = this.loadStats();
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStatsDisplay();
        this.checkInstallPrompt();
        this.registerServiceWorker();
    }

    bindEvents() {
        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setDifficulty(e.target.dataset.level));
        });

        // Generate buttons
        document.getElementById('generateCustom').addEventListener('click', () => this.generateCustomQR());
        document.getElementById('generateRandom').addEventListener('click', () => this.generateRandomQR());

        // Answer handling
        document.getElementById('checkAnswer').addEventListener('click', () => this.checkAnswer());
        document.getElementById('answerInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkAnswer();
        });

        // Hint
        document.getElementById('showHint').addEventListener('click', () => this.showHint());

        // Stats reset
        document.getElementById('resetStats').addEventListener('click', () => this.resetStats());

        // Scanner
        document.getElementById('startScanner').addEventListener('click', () => this.startScanner());

        // Modal
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('hintModal').addEventListener('click', (e) => {
            if (e.target.id === 'hintModal') this.closeModal();
        });

        // Install prompt
        document.getElementById('installBtn').addEventListener('click', () => this.installApp());
    }

    setDifficulty(level) {
        this.currentDifficulty = level;
        document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-level="${level}"]`).classList.add('active');
    }

    generateCustomQR() {
        const text = document.getElementById('customText').value.trim();
        if (!text) {
            alert('Bitte gib einen Text ein!');
            return;
        }
        this.currentText = text;
        this.createQRCode();
    }

    generateRandomQR() {
        this.currentText = this.generateRandomText();
        this.createQRCode();
    }

    generateRandomText() {
        const patterns = {
            easy: {
                chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                length: [3, 6]
            },
            medium: {
                chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ',
                length: [8, 15]
            },
            hard: {
                chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-_@#$%&',
                length: [12, 25]
            }
        };

        const pattern = patterns[this.currentDifficulty];
        const length = Math.floor(Math.random() * (pattern.length[1] - pattern.length[0] + 1)) + pattern.length[0];
        
        let result = '';
        for (let i = 0; i < length; i++) {
            result += pattern.chars[Math.floor(Math.random() * pattern.chars.length)];
        }
        return result;
    }

    createQRCode() {
        const container = document.getElementById('qrContainer');
        container.innerHTML = '<canvas id="qrCanvas"></canvas>';

        const canvas = document.getElementById('qrCanvas');
        const errorLevels = {
            easy: 'L',
            medium: 'M', 
            hard: 'H'
        };

        QRCode.toCanvas(canvas, this.currentText, {
            errorCorrectionLevel: errorLevels[this.currentDifficulty],
            width: 280,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, (error) => {
            if (error) {
                console.error('QR Code generation failed:', error);
                container.innerHTML = '<div class="qr-placeholder">❌ Fehler beim Erstellen</div>';
                return;
            }

            // Update info
            const mode = this.detectEncodingMode(this.currentText);
            document.getElementById('qrInfo').textContent = 
                `Schwierigkeit: ${this.currentDifficulty.toUpperCase()} | Zeichen: ${this.currentText.length} | Modus: ${mode}`;

            // Reset answer
            document.getElementById('answerInput').value = '';
            document.getElementById('result').className = 'result';
            document.getElementById('result').textContent = '';
        });
    }

    detectEncodingMode(text) {
        if (/^\d+$/.test(text)) return 'Numeric';
        if (/^[A-Z0-9 $%*+\-.\/:]+$/.test(text)) return 'Alphanumeric';
        return 'Byte';
    }

    checkAnswer() {
        if (!this.currentText) {
            alert('Erst QR-Code generieren!');
            return;
        }

        const userAnswer = document.getElementById('answerInput').value.trim();
        if (!userAnswer) {
            alert('Bitte gib eine Antwort ein!');
            return;
        }

        this.stats.total++;
        const resultDiv = document.getElementById('result');

        if (userAnswer === this.currentText) {
            this.stats.correct++;
            resultDiv.className = 'result correct';
            resultDiv.textContent = '✅ RICHTIG! Gut gemacht!';
        } else {
            resultDiv.className = 'result incorrect';
            resultDiv.textContent = `❌ FALSCH! Richtige Antwort: "${this.currentText}"`;
        }

        this.saveStats();
        this.updateStatsDisplay();
    }

    showHint() {
        if (!this.currentText) {
            alert('Erst QR-Code generieren!');
            return;
        }

        const mode = this.detectEncodingMode(this.currentText);
        const length = this.currentText.length;
        
        let hint = `<strong>Encoding-Modus:</strong> ${mode}<br>`;
        hint += `<strong>Länge:</strong> ${length} Zeichen<br>`;
        
        if (length > 2) {
            hint += `<strong>Beginnt mit:</strong> "${this.currentText[0]}"<br>`;
            hint += `<strong>Endet mit:</strong> "${this.currentText[length-1]}"`;
        }

        if (length > 4) {
            const mid = Math.floor(length / 2);
            hint += `<br><strong>Zeichen in der Mitte:</strong> "${this.currentText[mid]}"`;
        }

        document.getElementById('hintContent').innerHTML = hint;
        document.getElementById('hintModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('hintModal').style.display = 'none';
    }

    loadStats() {
        const saved = localStorage.getItem('qr-training-stats');
        return saved ? JSON.parse(saved) : { correct: 0, total: 0 };
    }

    saveStats() {
        localStorage.setItem('qr-training-stats', JSON.stringify(this.stats));
    }

    updateStatsDisplay() {
        const display = document.getElementById('statsDisplay');
        const { correct, total } = this.stats;

        if (total > 0) {
            const percentage = ((correct / total) * 100).toFixed(1);
            display.textContent = `Richtig: ${correct}/${total} (${percentage}%)`;
        } else {
            display.textContent = 'Noch keine Versuche';
        }
    }

    resetStats() {
        if (confirm('Statistiken wirklich zurücksetzen?')) {
            this.stats = { correct: 0, total: 0 };
            this.saveStats();
            this.updateStatsDisplay();
            document.getElementById('result').className = 'result';
            document.getElementById('result').textContent = '';
        }
    }

    // PWA Installation
    checkInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('installPrompt').style.display = 'block';
        });

        this.deferredPrompt = deferredPrompt;
    }

    installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('App installiert');
                }
                this.deferredPrompt = null;
                document.getElementById('installPrompt').style.display = 'none';
            });
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(() => console.log('Service Worker registriert'))
                .catch(err => console.log('Service Worker Fehler:', err));
        }
    }

    // Camera Scanner (bonus feature)
    startScanner() {
        if (!navigator.mediaDevices) {
            alert('Kamera nicht verfügbar');
            return;
        }

        const video = document.getElementById('scanner');
        const canvas = document.getElementById('scannerCanvas');
        const context = canvas.getContext('2d');

        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 300 },
                height: { ideal: 300 }
            } 
        })
        .then(stream => {
            video.srcObject = stream;
            video.style.display = 'block';
            video.play();

            const scanFrame = () => {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);

                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    if (typeof jsQR !== 'undefined') {
                        const code = jsQR(imageData.data, imageData.width, imageData.height);
                        
                        if (code) {
                            alert(`QR-Code erkannt: ${code.data}`);
                            stream.getTracks().forEach(track => track.stop());
                            video.style.display = 'none';
                            return;
                        }
                    }
                }
                requestAnimationFrame(scanFrame);
            };
            scanFrame();
        })
        .catch(err => {
            console.error('Kamera-Fehler:', err);
            alert('Kamera-Zugriff fehlgeschlagen');
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QRTrainer();
});
