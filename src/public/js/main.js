// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Form validation
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // Real-time feedback submission
    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(feedbackForm);
            const submitButton = feedbackForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

            try {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';

                const response = await fetch('/feedback', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    showNotification('Feedback submitted successfully!', 'success');
                    feedbackForm.reset();
                } else {
                    const data = await response.json();
                    showNotification(data.message || 'Error submitting feedback', 'error');
                }
            } catch (error) {
                showNotification('Error submitting feedback', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        });
    }

    // Comment submission
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(commentForm);
            const submitButton = commentForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

            try {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Posting...';

                const response = await fetch(`/feedback/${feedbackId}/comment`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    appendComment(data.comment);
                    commentForm.reset();
                    showNotification('Comment posted successfully!', 'success');
                } else {
                    const data = await response.json();
                    showNotification(data.message || 'Error posting comment', 'error');
                }
            } catch (error) {
                showNotification('Error posting comment', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        });
    }
});

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    const container = document.querySelector('.container');
    container.insertBefore(notification, container.firstChild);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Append new comment to the comments section
function appendComment(comment) {
    const commentsContainer = document.querySelector('.comments-container');
    if (commentsContainer) {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment fade-in';
        commentElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong>${comment.user.username}</strong>
                <small class="text-muted">${new Date(comment.createdAt).toLocaleString()}</small>
            </div>
            <p class="mb-0">${comment.content}</p>
        `;
        commentsContainer.appendChild(commentElement);
    }
}

// Filter feedback items
function filterFeedback(category) {
    const feedbackItems = document.querySelectorAll('.feedback-item');
    feedbackItems.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Search functionality
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const feedbackItems = document.querySelectorAll('.feedback-item');

        feedbackItems.forEach(item => {
            const title = item.querySelector('.feedback-title').textContent.toLowerCase();
            const content = item.querySelector('.feedback-content').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || content.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// Export feedback data
function exportFeedback(format) {
    const feedbackItems = document.querySelectorAll('.feedback-item');
    const data = Array.from(feedbackItems).map(item => ({
        title: item.querySelector('.feedback-title').textContent,
        content: item.querySelector('.feedback-content').textContent,
        category: item.dataset.category,
        status: item.dataset.status,
        priority: item.dataset.priority,
        createdAt: item.dataset.createdAt
    }));

    if (format === 'csv') {
        exportToCSV(data);
    } else if (format === 'json') {
        exportToJSON(data);
    }
}

function exportToCSV(data) {
    const headers = ['Title', 'Content', 'Category', 'Status', 'Priority', 'Created At'];
    const csvContent = [
        headers.join(','),
        ...data.map(item => [
            `"${item.title}"`,
            `"${item.content}"`,
            item.category,
            item.status,
            item.priority,
            item.createdAt
        ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'feedback.csv', 'text/csv');
}

function exportToJSON(data) {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, 'feedback.json', 'application/json');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
} 