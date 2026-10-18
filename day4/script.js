// Select the elements we need
const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

// Update character and word counts
function updateCounts() {
    const text = noteText.value;

    // Character count
    charCount.textContent = `${text.length} / 200 characters`;

    // Word count
    const trimmedText = text.trim();
    const words = trimmedText === "" ? [] : trimmedText.split(/\s+/);
    wordCount.textContent = `${words.length} ${words.length === 1 ? "word" : "words"}`;

    // Reset warning classes
    charCount.classList.remove("warning", "over");

    // Show orange warning above 180 characters
    if (text.length > 180 && text.length <= 200) {
        charCount.classList.add("warning");
    }

    // Show red warning above 200 characters
    if (text.length > 200) {
        charCount.classList.add("over");
    }
}

// Save the current draft
function saveDraft() {
    localStorage.setItem("quicknotes-draft", noteText.value);
}

// Clear the note
function clearNote() {
    noteText.value = "";
    updateCounts();
    localStorage.removeItem("quicknotes-draft");
}

// Restore saved draft
const savedDraft = localStorage.getItem("quicknotes-draft");

if (savedDraft) {
    noteText.value = savedDraft;
}

// Restore saved theme
const savedTheme = localStorage.getItem("quicknotes-theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
}

// Listen for typing
noteText.addEventListener("input", () => {
    updateCounts();
    saveDraft();
});

// Clear button
clearBtn.addEventListener("click", () => {
    clearNote();
});

// Escape key clears the note
noteText.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        clearNote();
    }
});

// Toggle dark/light mode
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        themeToggle.textContent = "Light mode";
        localStorage.setItem("quicknotes-theme", "dark");
    } else {
        themeToggle.textContent = "Dark mode";
        localStorage.setItem("quicknotes-theme", "light");
    }
});

// Set the correct counters when the page first loads
updateCounts();