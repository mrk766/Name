document.addEventListener('DOMContentLoaded', () => {

    // --- Element Selections ---
    const modeSwitch = document.getElementById('mode-switch');
    const postModeForm = document.getElementById('post-mode');
    const commentInput = document.getElementById('comment-input');
    const commentSendBtn = commentInput.nextElementSibling; // The button next to the input
    const postListItems = document.querySelectorAll('.post-list li');
    const copyToast = document.getElementById('copy-toast');

    // =======================================================
    // FEATURE 1: POST / COMMENT MODE TOGGLE
    // =======================================================
    modeSwitch.addEventListener('change', (e) => {
        const isCommentMode = e.target.checked;

        if (isCommentMode) {
            // Switch to Comment Mode
            postModeForm.classList.remove('is-active');
            commentInput.removeAttribute('disabled');
            commentSendBtn.removeAttribute('disabled');
            commentInput.focus(); // Auto-focus the chat input for quick messaging
        } else {
            // Switch back to Post Mode
            postModeForm.classList.add('is-active');
            commentInput.setAttribute('disabled', 'true');
            commentSendBtn.setAttribute('disabled', 'true');
        }
    });


    // =======================================================
    // FEATURE 2: DOUBLE-CLICK POST TO COPY CODE
    // =======================================================
    postListItems.forEach(item => {
        item.addEventListener('dblclick', (e) => {
            const codeToCopy = e.currentTarget.dataset.code;

            if (codeToCopy) {
                // Use the modern Clipboard API
                navigator.clipboard.writeText(codeToCopy)
                    .then(() => {
                        // Show a success notification
                        showCopyToast();
                    })
                    .catch(err => {
                        console.error('Failed to copy code: ', err);
                        // Optionally, show an error toast
                    });
            }
        });

        // Add keydown listener for accessibility (Enter key on a focused item)
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.currentTarget.dispatchEvent(new Event('dblclick'));
            }
        });
    });


    // =======================================================
    // FEATURE 3: "COPIED!" TOAST NOTIFICATION
    // =======================================================
    let toastTimeout;
    function showCopyToast() {
        // If a toast is already showing, clear its timeout
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        copyToast.classList.add('show');

        // Hide the toast after 2.5 seconds
        toastTimeout = setTimeout(() => {
            copyToast.classList.remove('show');
        }, 2500);
    }

    
    // =======================================================
    // FEATURE 4: CHAT FUNCTIONALITY (ENTER-TO-SEND)
    // =======================================================
    commentInput.addEventListener('keydown', (e) => {
        // Send message on 'Enter' key press, but not if 'Shift' is held
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line in the input
            sendMessage();
        }
    });
    
    commentSendBtn.addEventListener('click', sendMessage);

    function sendMessage() {
        const message = commentInput.value.trim();
        if (message) {
            // In a real app, you would send this message to a server
            // and then update the chat feed.
            console.log('New message sent:', message);
            
            // For demonstration, we'll just clear the input field.
            commentInput.value = '';
        }
    }

});
