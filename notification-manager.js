class NotificationManager {
    constructor() {
        this.container = document.getElementById('notification-container');
        this.icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle',
            default: 'bell'
        };
    }

    show(title, message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Get icon based on type
        const icon = this.icons[type] || this.icons.default;
        
        notification.innerHTML = `
            <div class="notification-icon">
                    <i class="fas fa-${icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">
                    ${message}
                </div>
            </div>
        `;
        
        // Add to container with animation
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(10px)';
        notification.style.transition = 'all 0.3s ease';
        
        this.container.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove after timeout
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}