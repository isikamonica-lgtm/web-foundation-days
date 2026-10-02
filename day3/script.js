let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];
function searchNotes(word) {
    const searchWord = word.toLowerCase();

    return notes.filter((note) =>
        note.text.toLowerCase().includes(searchWord)
    );
}
console.log(searchNotes("milk"));
function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    return notes.reduce((longest, note) =>
        note.text.length > longest.text.length ? note : longest
    );
}
console.log(longestNote());
function countByCategory() {
    const counts = {};

    notes.forEach((note) => {
        if (counts[note.category]) {
            counts[note.category]++;
        } else {
            counts[note.category] = 1;
        }
    });

    return counts;
}

console.log(countByCategory());
function getSummary() {
    const counts = countByCategory();

    return `${notes.length} notes: ${counts.personal} personal, ${counts.work} work, ${counts.study} study.`;
}

console.log(getSummary());
function isDuplicate(text) {
    const cleanedText = text.trim().toLowerCase();

    return notes.some((note) => {
        return note.text.trim().toLowerCase() === cleanedText;
    });
}

console.log(isDuplicate("  BUY MILK AND BREAD  "));
console.log(isDuplicate("Go to the market"));
function addNote(text,category){
    const cleanedText=text.trim();
    if (cleanedText.length< 1 ||cleanedText.length>200){
        console.log("X Note rejected: must be 1-200 characters.");
        return false;
    }
    if (isDuplicated(cleanedText)){
        console.log("xNote rejected:duplicate note.");
    }
    const validCategories=["personal","work","study"];
    if (!validCategories.includes(category)){
        console.log("X Note rejected: duplicate note.");
        return false;
    }
    const newNote={
id:notes.length+ 1,
text:cleanedText,
category:category
    };
    notes.push(newNote);
    console.log(`✅ Added: "${newNote.text}"`);
     true;
}
console.log(addNote("Buy a new notebook", "personal"));
console.log(addNote("Buy milk and bread", "personal"));
console.log(addNote("Learn JavaScript", "coding"));