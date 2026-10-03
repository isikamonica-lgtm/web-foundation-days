let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];

const CATEGORIES = ["personal", "work", "study"];

// 1. Search notes
function searchNotes(word) {
    const searchWord = word.toLowerCase();

    return notes.filter((note) =>
        note.text.toLowerCase().includes(searchWord)
    );
}

console.log(searchNotes("milk")); // normal: finds "Buy milk and bread"
console.log(searchNotes("holiday")); // edge case: []


// 2. Find the longest note
function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    return notes.reduce((longest, note) =>
        note.text.length > longest.text.length ? note : longest
    );
}

console.log(longestNote()); // normal: returns the longest note

let savedNotes = notes;
notes = [];
console.log(longestNote()); // edge case: null
notes = savedNotes;


// 3. Count notes by category
function countByCategory() {
    const counts = { personal: 0, work: 0, study: 0 };

    notes.forEach((note) => {
        counts[note.category]++;
    });

    return counts;
}

console.log(countByCategory()); // normal: { personal: 2, work: 1, study: 2 }


// 4. Get summary
function getSummary() {
    const counts = countByCategory();
    const word = notes.length === 1 ? "note" : "notes";

    return `${notes.length} ${word}: ${counts.personal} personal, ${counts.work} work, ${counts.study} study.`;
}

console.log(getSummary()); // normal: "5 notes: 2 personal, 1 work, 2 study."

let savedNotesForSummary = notes;
notes = [];
console.log(getSummary()); // edge case: "0 notes: 0 personal, 0 work, 0 study."
notes = savedNotesForSummary;


// 5. Check for duplicate notes
function isDuplicate(text) {
    const cleanedText = text.trim().toLowerCase();

    return notes.some((note) => {
        return note.text.trim().toLowerCase() === cleanedText;
    });
}

console.log(isDuplicate("  BUY MILK AND BREAD  ")); // normal: true
console.log(isDuplicate("Go to the market")); // edge case: false


// 6. Add a new note
function addNote(text, category) {
    const cleanedText = text.trim();

    if (cleanedText.length === 0 || cleanedText.length > 200) {
        console.log("Rejected: a note must be 1-200 characters.");
        return false;
    }

    if (isDuplicate(cleanedText)) {
        console.log(`Rejected: "${cleanedText}" already exists.`);
        return false;
    }

    if (!CATEGORIES.includes(category)) {
        console.log(`Rejected: "${category}" is not a valid category.`);
        return false;
    }

    notes.push({
        id: Date.now(),
        text: cleanedText,
        category: category
    });

    console.log(`Added: "${cleanedText}" (${category})`);
    return true;
}

console.log(addNote("Buy a new notebook", "personal")); // normal: true
console.log(addNote("Buy milk and bread", "personal")); // duplicate: false
console.log(addNote("   ", "work")); // edge case: false
console.log(addNote("Plan trip", "holiday")); // invalid category: false

console.log(getSummary()); // final: "6 notes: 2 personal, 1 work, 3 study."