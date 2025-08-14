// Função para o menu mobile
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Fechar menu ao clicar em um link
    const navLinks = document.querySelectorAll('#mobile-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });

    // Animações de scroll
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.animate-on-scroll');
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight - 100) {
                element.classList.add('opacity-100', 'translate-y-0');
                element.classList.remove('opacity-0', 'translate-y-8');
            }
        });
    };

    // Adiciona evento de scroll
    window.addEventListener('scroll', animateOnScroll);
    
    // Executa uma vez ao carregar a página
    animateOnScroll();

    // Contador de pessoas já inscritas
    const counterElement = document.getElementById('counter');
    if (counterElement) {
        let count = 1247; // Número inicial
        const target = 1500; // Número alvo
        const duration = 3000; // Duração em ms
        const step = (target - count) / (duration / 16); // 60fps
        
        const updateCounter = () => {
            count += step;
            if (count < target) {
                counterElement.textContent = Math.floor(count).toLocaleString('pt-BR');
                requestAnimationFrame(updateCounter);
            } else {
                counterElement.textContent = target.toLocaleString('pt-BR');
            }
        };
        
        // Inicia a animação quando o elemento estiver visível
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(counterElement);
    }

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const button = item.querySelector('button');
        const content = item.querySelector('.faq-content');
        
        button.addEventListener('click', () => {
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', !isExpanded);
            content.classList.toggle('max-h-0', isExpanded);
            content.classList.toggle('max-h-96', !isExpanded);
            
            // Rotaciona o ícone
            const icon = button.querySelector('svg');
            icon.classList.toggle('rotate-180');
        });
    });

    // Validação do formulário
    const form = document.getElementById('newsletter-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = form.querySelector('input[type="email"]').value;
            
            if (email && email.includes('@')) {
                // Simula envio do formulário
                const button = form.querySelector('button');
                const originalText = button.innerHTML;
                
                button.disabled = true;
                button.innerHTML = 'Enviando...';
                
                setTimeout(() => {
                    button.innerHTML = '✅ Inscrito com sucesso!';
                    form.reset();
                    
                    setTimeout(() => {
                        button.disabled = false;
                        button.innerHTML = originalText;
                    }, 3000);
                }, 1500);
            }
        });
    }
});

// Função para o contador de tempo restante
function startCountdown() {
    const countdownElement = document.getElementById('countdown-timer');
    if (!countdownElement) return;
    
    // Define a data de término (24 horas a partir de agora)
    const countDownDate = new Date();
    countDownDate.setHours(countDownDate.getHours() + 24);
    
    // Atualiza o contador a cada segundo
    const x = setInterval(function() {
        // Data e hora atuais
        const now = new Date().getTime();
            
        // Diferença entre as datas
        const distance = countDownDate - now;
            
        // Cálculos para horas, minutos e segundos
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
        // Exibe o resultado
        countdownElement.innerHTML = 
            `<span class="countdown-number">${hours.toString().padStart(2, '0')}</span>h ` +
            `<span class="countdown-number">${minutes.toString().padStart(2, '0')}</span>m ` +
            `<span class="countdown-number">${seconds.toString().padStart(2, '0')}</span>s`;
            
        // Se o contador terminar
        if (distance < 0) {
            clearInterval(x);
            countdownElement.innerHTML = "Oferta expirada!";
        }
    }, 1000);
}

// Inicia o contador quando a página carregar
window.addEventListener('load', startCountdown);
