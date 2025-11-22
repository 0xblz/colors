// Paste button functionality for hex input
document.addEventListener('DOMContentLoaded', () => {
  const pasteBtn = document.getElementById('pasteBtn');
  const hexInput = document.getElementById('hexInput');

  if (pasteBtn && hexInput) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        
        // Clean and validate the pasted text
        let cleanedText = text.trim();
        
        // Remove # if present, we'll add it back
        if (cleanedText.startsWith('#')) {
          cleanedText = cleanedText.substring(1);
        }
        
        // Validate hex format (3 or 6 characters)
        if (/^[0-9A-Fa-f]{3}$/.test(cleanedText)) {
          // Convert 3-char hex to 6-char hex
          cleanedText = cleanedText.split('').map(c => c + c).join('');
        }
        
        if (/^[0-9A-Fa-f]{6}$/.test(cleanedText)) {
          // Valid hex color, update the input
          const hexValue = '#' + cleanedText.toUpperCase();
          hexInput.value = hexValue;
          
          // Trigger input event to update the color
          const event = new Event('input', { bubbles: true });
          hexInput.dispatchEvent(event);
          
          // Visual feedback
          pasteBtn.style.color = '#4ade80';
          setTimeout(() => {
            pasteBtn.style.color = '';
          }, 500);
        } else {
          // Invalid format - show error feedback
          pasteBtn.style.color = '#ef4444';
          setTimeout(() => {
            pasteBtn.style.color = '';
          }, 500);
        }
      } catch (err) {
        console.error('Failed to read clipboard:', err);
        // Show error feedback
        pasteBtn.style.color = '#ef4444';
        setTimeout(() => {
          pasteBtn.style.color = '';
        }, 500);
      }
    });
  }
});

