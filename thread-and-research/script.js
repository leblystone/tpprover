// Email Signup Functionality
let emailList = [];

// Initialize email list from localStorage
function initEmailList() {
    const savedEmails = localStorage.getItem('threadAndResearchEmails');
    if (savedEmails) {
        emailList = JSON.parse(savedEmails);
    }
}

// Save email to localStorage
function saveEmail(email) {
    if (!emailList.includes(email)) {
        emailList.push(email);
        localStorage.setItem('threadAndResearchEmails', JSON.stringify(emailList));
    }
}

// Show notification
function showNotification(message, isError = false) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    if (isError) {
        notification.classList.add('error');
    }
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Handle email signup form
document.addEventListener('DOMContentLoaded', function() {
    initEmailList();
    
    // Handle email signup form submission
    const emailSignupForm = document.getElementById('emailSignup');
    const signupMessage = document.getElementById('signupMessage');
    
    if (emailSignupForm) {
        emailSignupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emailInput = document.getElementById('signup-email');
            const email = emailInput.value.trim().toLowerCase();
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (!email) {
                showNotification('Please enter an email address', true);
                return;
            }
            
            if (!emailRegex.test(email)) {
                showNotification('Please enter a valid email address', true);
                return;
            }
            
            // Check if email already exists
            if (emailList.includes(email)) {
                if (signupMessage) {
                    signupMessage.textContent = 'You\'re already on the list! We\'ll notify you when we launch.';
                    signupMessage.style.color = 'rgba(255, 255, 255, 0.9)';
                }
                showNotification('You\'re already signed up!');
            } else {
                // Save email
                saveEmail(email);
                
                // Show success message
                if (signupMessage) {
                    signupMessage.textContent = 'Thank you! We\'ll notify you when we launch in March 2026.';
                    signupMessage.style.color = 'rgba(255, 255, 255, 0.9)';
                }
                
                showNotification('Successfully signed up! We\'ll be in touch.');
                
                // Reset form
                emailInput.value = '';
            }
        });
    }
    
    // Handle smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Handle contact form submission
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // In a real implementation, this would send the form data to a server
            const formData = new FormData(this);
            const name = formData.get('name');
            
            showNotification(`Thank you, ${name}! We'll be in touch soon.`);
            this.reset();
        });
    }
});

// Add notification styles dynamically
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: var(--teal-green);
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        font-weight: 500;
        max-width: 300px;
    }
    
    .notification.show {
        opacity: 1;
        transform: translateY(0);
    }
    
    .notification.error {
        background-color: #d32f2f;
    }
    
    @media (max-width: 768px) {
        .notification {
            right: 10px;
            left: 10px;
            max-width: none;
        }
    }
`;
document.head.appendChild(style);
