import re

with open('frontend/script.js', 'r') as f:
    content = f.read()

content = re.sub(r'alert\((.*?)\);', r'showToast(\1);', content)

old_toast_logic = """        // Show Success Toast
        const toast = document.getElementById('successToast');
        toast.classList.add('show');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.remove('show'), 4000);"""

new_toast_logic = """        // Show Success Toast
        showToast("Login Successful!", "success");"""

content = content.replace(old_toast_logic, new_toast_logic)

toast_fn = """
// --- Global Toast Notification ---
function showToast(message, type = "error") {
    const toast = document.getElementById('customToast');
    const msgEl = document.getElementById('toastMessage');
    const iconEl = document.getElementById('toastIcon');
    
    // Strip quotes if passed as string literal
    msgEl.textContent = message.replace(/^["']|["']$/g, '');
    
    if (type === "success") {
        toast.style.background = "var(--primary)";
        toast.style.borderColor = "rgba(16, 185, 129, 0.5)";
        iconEl.textContent = "✅";
    } else if (type === "info") {
        toast.style.background = "#3B82F6";
        toast.style.borderColor = "rgba(59, 130, 246, 0.5)";
        iconEl.textContent = "ℹ️";
    } else {
        toast.style.background = "#EF4444";
        toast.style.borderColor = "rgba(239, 68, 68, 0.5)";
        iconEl.textContent = "⚠️";
    }
    
    toast.classList.add('show');
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 4000);
}
"""

if "function showToast" not in content:
    content += toast_fn

with open('frontend/script.js', 'w') as f:
    f.write(content)
