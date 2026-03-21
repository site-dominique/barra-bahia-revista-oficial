/**
 * Voice Assistant - Perplexity Style Orb
 * Barra Bahia Revista - Assistente de Voz com Partículas
 * Integrado com Dominique AI
 */

class VoiceAssistant {
    constructor() {
        this.container = document.getElementById('voiceAssistantContainer');
        this.orb = document.getElementById('voiceOrb');
        this.particlesContainer = document.getElementById('particlesContainer');
        this.status = document.getElementById('voiceStatus');
        this.particles = [];
        this.numParticles = 300;
        this.isListening = false;
        this.isSpeaking = false;

        // Web Audio API
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.animationFrame = null;

        // Speech Recognition
        this.recognition = null;
        this.isRecognizing = false;

        // Dominique API
        this.apiEndpoint = 'http://127.0.0.1:8081/api/pergunta';

        this.init();
    }

    init() {
        this.createParticles();
        this.setupEventListeners();
        this.initSpeechRecognition();
        this.animateParticlesIdle();
    }

    createParticles() {
        for (let i = 0; i < this.numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            const angle = Math.random() * Math.PI * 2;
            const radius = 25 + Math.random() * 55;

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const size = 2 + Math.random() * 4;

            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.transform = `translate(${x}px, ${y}px)`;
            particle.dataset.baseX = x;
            particle.dataset.baseY = y;
            particle.dataset.angle = angle;
            particle.dataset.radius = radius;

            this.particlesContainer.appendChild(particle);
            this.particles.push({
                element: particle,
                x: x,
                y: y,
                baseX: x,
                baseY: y,
                vx: 0,
                vy: 0,
                size: size,
                angle: angle,
                radius: radius
            });
        }
    }

    setupEventListeners() {
        this.orb.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleListening();
        });

        this.orb.addEventListener('mouseenter', () => {
            this.repelParticles();
        });

        this.orb.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleListening();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'v' || e.key === 'V') {
                this.toggleListening();
            }
        });
    }

    repelParticles() {
        this.particles.forEach((particle, index) => {
            const angle = Math.atan2(particle.y, particle.x);
            const repelDistance = 40 + Math.random() * 40;

            const repelX = Math.cos(angle) * repelDistance;
            const repelY = Math.sin(angle) * repelDistance;

            particle.element.style.setProperty('--repel-x', `${repelX}px`);
            particle.element.style.setProperty('--repel-y', `${repelY}px`);
            particle.element.classList.add('repel');

            setTimeout(() => {
                particle.element.classList.remove('repel');
            }, 600);
        });
    }

    toggleListening() {
        this.repelParticles();

        setTimeout(async () => {
            this.isListening = !this.isListening;
            if (this.isListening) {
                await this.startListening();
            } else {
                this.stopListening();
            }
        }, 150);
    }

    async startListening() {
        this.orb.classList.add('listening');
        this.status.textContent = 'Ouvindo...';
        this.status.classList.add('listening');

        if (!this.audioContext) {
            await this.initAudio();
        }

        if (this.analyser) {
            this.isListening = true;
            this.analyzeAudio();
            console.log('🎤 Assistente de voz: Ouvindo...');
        }

        // Iniciar Speech Recognition
        if (this.recognition && !this.isRecognizing) {
            this.recognition.start();
            console.log('🎤 Speech Recognition iniciado');
        }
    }

    async initAudio() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                this.analyser.smoothingTimeConstant = 0.8;

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.microphone = this.audioContext.createMediaStreamSource(stream);
                this.microphone.connect(this.analyser);
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            }

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            console.log('🎤 Áudio inicializado');
        } catch (err) {
            console.error('❌ Erro ao acessar microfone:', err);
            this.status.textContent = 'Microfone não permitido';
        }
    }

    initSpeechRecognition() {
        // Suporte para Speech Recognition (Chrome, Edge)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'pt-BR';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onstart = () => {
                this.isRecognizing = true;
                console.log('🎤 Speech Recognition: Ouvindo...');
            };

            this.recognition.onresult = async (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('🎤 Reconhecido:', transcript);
                
                // Parar reconhecimento
                this.isRecognizing = false;
                
                // Enviar para Dominique
                await this.askDominique(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('❌ Erro no Speech Recognition:', event.error);
                this.isRecognizing = false;
                this.status.textContent = 'Erro ao ouvir. Tente novamente.';
            };

            this.recognition.onend = () => {
                console.log('🎤 Speech Recognition: Finalizado');
                this.isRecognizing = false;
            };

            console.log('✅ Speech Recognition inicializado');
        } else {
            console.warn('⚠️ Speech Recognition não suportado neste navegador');
        }
    }

    async askDominique(pergunta) {
        this.status.textContent = 'Processando...';
        this.orb.classList.add('thinking');

        try {
            console.log('📤 Enviando para Dominique:', pergunta);
            
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    texto: pergunta
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log('📥 Resposta recebida:', data.resposta);

            // Falar resposta
            if (data.resposta) {
                await this.speak(data.resposta);
            } else {
                await this.speak('Desculpe, não entendi a pergunta.');
            }

        } catch (error) {
            console.error('❌ Erro ao comunicar com Dominique:', error);
            this.status.textContent = 'Erro de conexão. Tente novamente.';
            await this.speak('Desculpe, estou com problemas de conexão no momento.');
        } finally {
            this.orb.classList.remove('thinking');
            this.stopListening();
        }
    }

    stopAudio() {
        if (this.microphone) {
            const stream = this.microphone.mediaStream;
            stream.getTracks().forEach(track => track.stop());
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        if (this.recognition) {
            this.recognition.stop();
        }

        console.log('🎤 Áudio parado');
    }

    analyzeAudio() {
        if (!this.analyser || !this.isListening) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const averageVolume = sum / this.dataArray.length;
        const normalizedVolume = averageVolume / 255;

        this.particles.forEach((particle, index) => {
            const frequencyIndex = index % this.dataArray.length;
            const frequencyValue = this.dataArray[frequencyIndex] / 255;

            const baseSize = particle.size;
            const scale = 1 + normalizedVolume * 2 + frequencyValue;

            const angle = particle.angle;
            const pulseRadius = particle.radius + (normalizedVolume * 20 * Math.sin(angle * 3));
            const newX = Math.cos(angle) * pulseRadius;
            const newY = Math.sin(angle) * pulseRadius;

            particle.element.style.transform = `translate(${newX}px, ${newY}px) scale(${scale})`;

            if (normalizedVolume > 0.3) {
                particle.element.classList.add('active');
            } else {
                particle.element.classList.remove('active');
            }
        });

        this.animationFrame = requestAnimationFrame(() => this.analyzeAudio());
    }

    stopListening() {
        this.orb.classList.remove('listening');
        this.status.textContent = 'Clique para falar';
        this.status.classList.remove('listening');
        this.isListening = false;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        this.particles.forEach((particle) => {
            particle.element.style.transform = `translate(${particle.baseX}px, ${particle.baseY}px) scale(1)`;
            particle.element.classList.remove('active');
        });

        console.log('🎤 Assistente de voz: Parado');
    }

    setSpeaking(speaking) {
        this.isSpeaking = speaking;
        if (speaking) {
            this.orb.classList.add('speaking');
            this.status.textContent = 'Falando...';
            this.status.classList.add('speaking');
            console.log('🔊 Assistente de voz: Falando...');
        } else {
            this.orb.classList.remove('speaking');
            this.status.textContent = 'Clique para falar';
            this.status.classList.remove('speaking');
            console.log('🔊 Assistente de voz: Parado');
        }
    }

    animateParticlesIdle() {
        const animate = () => {
            const time = Date.now() * 0.001;

            this.particles.forEach((particle) => {
                if (!this.isListening && !this.isSpeaking) {
                    const floatSpeed = 0.5 + (particle.size / 4) * 0.3;
                    const floatRadius = 3 + particle.size;

                    const newX = particle.baseX + Math.cos(time * floatSpeed + particle.angle) * floatRadius;
                    const newY = particle.baseY + Math.sin(time * floatSpeed + particle.angle * 1.5) * floatRadius;

                    particle.element.style.transform = `translate(${newX}px, ${newY}px)`;
                }
            });

            requestAnimationFrame(animate);
        };

        animate();
    }

    async speak(text) {
        if ('speechSynthesis' in window) {
            this.setSpeaking(true);
            
            // Cancelar fala anterior
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            utterance.onend = () => {
                this.setSpeaking(false);
            };

            utterance.onerror = (event) => {
                console.error('❌ Erro no TTS:', event.error);
                this.setSpeaking(false);
            };

            speechSynthesis.speak(utterance);
        } else {
            console.warn('❌ Speech Synthesis não suportado neste navegador');
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.voiceAssistant = new VoiceAssistant();
});
