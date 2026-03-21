/**
 * Voice Assistant - Perplexity Style Orb
 * Barra Bahia Revista - Assistente de Voz com Partículas
 */

class VoiceAssistant {
    constructor() {
        this.container = document.getElementById('voiceAssistantContainer');
        this.orb = document.getElementById('voiceOrb');
        this.particlesContainer = document.getElementById('particlesContainer');
        this.status = document.getElementById('voiceStatus');
        this.particles = [];
        this.numParticles = 300; // Enxame massivo de partículas
        this.isListening = false;
        this.isSpeaking = false;
        
        // Web Audio API
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.animationFrame = null;
        
        this.init();
    }

    init() {
        this.createParticles();
        this.setupEventListeners();
        this.animateParticlesIdle();
    }

    createParticles() {
        // Criar partículas em formato de enxame (distribuição esférica aleatória)
        for (let i = 0; i < this.numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Distribuição esférica aleatória ao redor da orb
            const angle = Math.random() * Math.PI * 2;
            const radius = 25 + Math.random() * 55; // Variação de distância maior
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            // Tamanho variado das partículas
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
        // Clique na orb - ativar assistente de voz
        this.orb.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleListening();
        });

        // Mouse sobre a orb - efeito de repulsão
        this.orb.addEventListener('mouseenter', () => {
            this.repelParticles();
        });

        // Touch em dispositivos móveis
        this.orb.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleListening();
        });

        // Tecla de atalho (V)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'v' || e.key === 'V') {
                this.toggleListening();
            }
        });
    }

    repelParticles() {
        // Efeito de repulsão EXPLOSIVA quando clica ou passa mouse
        this.particles.forEach((particle, index) => {
            // Calcular direção da repulsão baseada na posição da partícula
            const angle = Math.atan2(particle.y, particle.x);
            const repelDistance = 40 + Math.random() * 40; // Repulsão mais forte
            const repelX = Math.cos(angle) * repelDistance;
            const repelY = Math.sin(angle) * repelDistance;
            
            particle.element.style.setProperty('--repel-x', `${repelX}px`);
            particle.element.style.setProperty('--repel-y', `${repelY}px`);
            particle.element.classList.add('repel');
            
            // Remover classe após animação
            setTimeout(() => {
                particle.element.classList.remove('repel');
            }, 600);
        });
    }

    toggleListening() {
        // REPELIR PARTÍCULAS PRIMEIRO
        this.repelParticles();

        // Depois alterna estado
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
        
        // Inicializar áudio na primeira vez
        if (!this.audioContext) {
            await this.initAudio();
        }
        
        if (this.analyser) {
            this.isListening = true;
            this.analyzeAudio();
            console.log('🎤 Assistente de voz: Ouvindo e analisando áudio...');
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
        console.log('🎤 Áudio parado');
    }

    analyzeAudio() {
        if (!this.analyser || !this.isListening) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calcular volume médio
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const averageVolume = sum / this.dataArray.length;
        const normalizedVolume = averageVolume / 255; // 0 a 1
        
        // Fazer partículas reagirem ao volume
        this.particles.forEach((particle, index) => {
            const frequencyIndex = index % this.dataArray.length;
            const frequencyValue = this.dataArray[frequencyIndex] / 255;
            
            // Escalar partícula baseado no volume
            const baseSize = particle.size;
            const scale = 1 + normalizedVolume * 2 + frequencyValue;
            
            // Calcular nova posição com "pulso"
            const angle = particle.angle;
            const pulseRadius = particle.radius + (normalizedVolume * 20 * Math.sin(angle * 3));
            
            const newX = Math.cos(angle) * pulseRadius;
            const newY = Math.sin(angle) * pulseRadius;
            
            particle.element.style.transform = `translate(${newX}px, ${newY}px) scale(${scale})`;
            
            // Mudar cor baseado na intensidade
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
        
        // Parar análise de áudio mas manter contexto
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Resetar partículas
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
        // Animação mais dinâmica das partículas - estilo enxame flutuante
        const animate = () => {
            const time = Date.now() * 0.001;
            
            this.particles.forEach((particle) => {
                if (!this.isListening && !this.isSpeaking) {
                    // Movimento de flutuação em padrão circular + oscilação
                    const floatSpeed = 0.5 + (particle.size / 4) * 0.3; // Partículas maiores se movem diferente
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

    // Método para responder por voz (TTS)
    async speak(text) {
        if ('speechSynthesis' in window) {
            this.setSpeaking(true);

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            utterance.onend = () => {
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
