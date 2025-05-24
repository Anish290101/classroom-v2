// --- Initial Seating Data (This will be our fallback if Firestore is empty initially) ---
// This array represents the DEFAULT seating arrangement.
// It will be used if no saved arrangement is found in Firestore.
let initialSeating = [
    [["Riddhima", "Samishtha"], ["Yashika", "Harshi"], ["Aditri", "Nitika"], ["Tanushka", "Nivedita"], ["Anaisha", "Ishani"], ["Avika", "Ayesha"]],
    [["Aadya", "Anushree"], ["Yashasvi", "Tanishee"], ["Sanskriti", "Samriddhi"], ["Vedant", "Saad"], ["Abhiraj", "Vipul"], ["Shaurya", "Siddhart"]],
    [["Dev", null], ["Avyukta", "Raunak"], ["Raghav", "Anish"], ["Satvik", "Hemansh"], ["Atharva", "Kunal"], ["Himank", "Naitik"]],
    [["Aryaman", null], ["Hammad", null], ["Affan", null], ["Aadhyan", "Aarav"], ["Svakksh", "Tanay"], ["Prakhyat", "Kartik"]]
];

// --- Firebase Project Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAQByuEgiIbjRWrvOHEzPWlJxd0nfV_WkY",
  authDomain: "classseatingapp-473e0.firebaseapp.com",
  projectId: "classseatingapp-473e0",
  storageBucket: "classseatingapp-473e0.firebasestorage.app",
  messagingSenderId: "117363612138",
  appId: "1:117363612138:web:784e9e6f3e5f966c613a93",
  measurementId: "G-JTMX518FQ4"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

// Get a reference to the Firestore database service
const db = firebase.firestore();

// Define the collection and document name for your seating data in Firestore.
const SEATING_COLLECTION = "classSeating";
const SEATING_DOCUMENT = "defaultArrangement";

// --- Login Credentials (Hardcoded - REMEMBER THIS IS NOT SECURE FOR SENSITIVE DATA) ---
const CORRECT_ID = "class10b";
const CORRECT_PASSWORD = "class10b@123";
const LOGIN_STATUS_KEY = "isLoggedIn";
const LOGIN_TIMESTAMP_KEY = "loginTimestamp";
const LOGIN_TIMEOUT_MS = 30 * 60 * 1000;      // 30 minutes in milliseconds

// --- Login Function ---
function checkLogin() {
    const loginId = document.getElementById('loginId').value;
    const loginPassword = document.getElementById('loginPassword').value;
    const loginErrorMessage = document.getElementById('loginErrorMessage');

    if (loginId === CORRECT_ID && loginPassword === CORRECT_PASSWORD) {
        localStorage.setItem(LOGIN_STATUS_KEY, 'true');
        localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
        loginErrorMessage.classList.remove('show'); // Hide any error
        document.getElementById('loginOverlay').style.display = 'none';
        document.querySelector('.container').style.display = 'block';
        initializeSeatingApp();
    } else {
        loginErrorMessage.textContent = "Invalid User ID or Password.";
        loginErrorMessage.classList.add('show'); // Show the message
    }
}

// --- Logout Function ---
function logout() {
    const confirmation = confirm("Are you sure you want to log out?");
    if (confirmation) {
        localStorage.removeItem(LOGIN_STATUS_KEY);
        localStorage.removeItem(LOGIN_TIMESTAMP_KEY);
        location.reload();
    }
}

// --- Message Display Helper ---
function showMessage(message, type = 'info', timeout = 3000) {
    const messageElement = document.getElementById('errorMessage');
    messageElement.textContent = message;
    messageElement.className = `message ${type}-message show`; // Apply base and type classes

    setTimeout(() => {
        messageElement.classList.remove('show'); // Hide message
        messageElement.textContent = ''; // Clear text
    }, timeout);
}

// --- Initialize App Function (called after successful login or on page load if already logged in) ---
async function initializeSeatingApp() {
    // Set current date input
    const today = new Date();
    document.getElementById('yearInput').value = today.getFullYear();
    document.getElementById('monthInput').value = today.getMonth() + 1;
    document.getElementById('dayInput').value = today.getDate();

    // Load the seating arrangement from Firestore FIRST
    await loadSeating();
    // Then display the seating for the current date based on the loaded arrangement
    displaySeating();
}

// --- Date Calculation Functions ---
function getRotationWeekFromDateJS(year, month, day) {
    const startDate = new Date(2024, 0, 1); // January 1, 2024 (month is 0-indexed)
    const targetDate = new Date(year, month - 1, day);

    const diffTime = Math.abs(targetDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const startDayOfWeek = startDate.getDay();

    let effectiveDiffDays = diffDays;
    if (targetDate < startDate) {
        effectiveDiffDays = -diffDays;
        if (startDayOfWeek !== 1) { // If start date wasn't a Monday
            effectiveDiffDays -= (startDayOfWeek - 1);
        }
    } else {
        if (startDayOfWeek !== 1) { // If start date wasn't a Monday
            effectiveDiffDays += (7 - startDayOfWeek + 1);
        }
    }

    const rotationWeek = Math.floor(effectiveDiffDays / 7);

    return rotationWeek;
}

function rotateSingleRowJS(row, rotations) {
    const numSeats = row.length;
    if (numSeats === 0) return row;

    const actualRotations = rotations % numSeats;
    if (actualRotations === 0) return row;

    if (actualRotations > 0) {
        return [...row.slice(numSeats - actualRotations), ...row.slice(0, numSeats - actualRotations)];
    } else {
        return [...row.slice(-actualRotations), ...row.slice(0, -actualRotations)];
    }
}

function rotateSeatingRowWiseJS(seatingArrangement, rotations) {
    return seatingArrangement.map(row => rotateSingleRowJS(row, rotations));
}

// --- Display Seating Function ---
function displaySeating() {
    const year = parseInt(document.getElementById('yearInput').value);
    const month = parseInt(document.getElementById('monthInput').value);
    const day = parseInt(document.getElementById('dayInput').value);
    const errorMessage = document.getElementById('errorMessage');
    const seatingOutput = document.getElementById('seatingOutput');

    if (isNaN(year) || isNaN(month) || isNaN(day) ||
        year < 2024 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31) {
        showMessage("Please enter a valid date (Year: 2024-2099, Month: 1-12, Day: 1-31).", "error");
        seatingOutput.innerHTML = '';
        return;
    }

    const testDate = new Date(year, month - 1, day);
    if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
        showMessage("Invalid day for the selected month.", "error");
        seatingOutput.innerHTML = '';
        return;
    }

    const rotationWeek = getRotationWeekFromDateJS(year, month, day);
    const displayArrangement = JSON.parse(JSON.stringify(initialSeating)); // Deep copy
    const rotatedSeating = rotateSeatingRowWiseJS(displayArrangement, rotationWeek);

    let html = '';
    rotatedSeating.forEach((row, rowIndex) => {
        // Adding the row-wrapper and row-number elements back, as per the new UI design
        html += `<div class="seating-row-wrapper">`;
        html += `<div class="row-number">Row ${rowIndex + 1}</div>`;

        html += `<div class="seating-row">`;
        row.forEach((seat, seatIndex) => {
            html += `<div class="seat-item" data-row="${rowIndex}" data-seat="${seatIndex}" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)">`;
            seat.forEach((student, studentInSeatIndex) => { // Added studentInSeatIndex for correct data-attribute
                if (student) {
                    html += `<div class="student-draggable" draggable="true" ondragstart="dragStart(event)" data-student-index="${studentInSeatIndex}">${student}</div>`;
                } else {
                    html += `<div class="student-draggable empty-spot" draggable="true" ondragstart="dragStart(event)" data-student-index="${studentInSeatIndex}">Empty</div>`;
                }
            });
            html += `</div>`;
        });
        html += `</div>`;
        html += `</div>`;
    });

    seatingOutput.innerHTML = html;
}

// --- Drag and Drop Logic ---
let draggedStudentData = {
    name: null,
    fromRow: null,
    fromSeat: null,
    fromStudentIndexInSeat: null
};

function dragStart(event) {
    const studentElement = event.target;
    // Store the actual student name or 'null' if it's an empty spot
    draggedStudentData.name = studentElement.classList.contains('empty-spot') ? null : studentElement.textContent;

    const parentSeatItem = studentElement.closest('.seat-item');
    draggedStudentData.fromRow = parseInt(parentSeatItem.dataset.row);
    draggedStudentData.fromSeat = parseInt(parentSeatItem.dataset.seat);
    draggedStudentData.fromStudentIndexInSeat = parseInt(studentElement.dataset.studentIndex); // Get index from data-attribute

    event.dataTransfer.setData("text/plain", draggedStudentData.name || "Empty"); // Set data for Firefox compatibility
    studentElement.classList.add('dragging');
}

function dragOver(event) {
    event.preventDefault(); // Crucial to allow dropping
    const targetElement = event.target.closest('.seat-item');
    if (targetElement) {
        targetElement.classList.add('drag-over');
    }
}

function dragLeave(event) {
    const targetElement = event.target.closest('.seat-item');
    if (targetElement) {
        targetElement.classList.remove('drag-over');
    }
}

function drop(event) {
    event.preventDefault();
    document.querySelectorAll('.seat-item.drag-over').forEach(el => el.classList.remove('drag-over'));

    const droppedOnElement = event.target.closest('.student-draggable, .seat-item');
    if (!droppedOnElement) {
        document.querySelectorAll('.student-draggable.dragging').forEach(el => el.classList.remove('dragging'));
        return;
    }

    let droppedOnRow, droppedOnSeat;
    let targetIndexInSeat = -1; // Index within the target seat where the student will go

    const parentSeatItem = droppedOnElement.closest('.seat-item');
    droppedOnRow = parseInt(parentSeatItem.dataset.row);
    droppedOnSeat = parseInt(parentSeatItem.dataset.seat);

    const targetSeatArray = initialSeating[droppedOnRow][droppedOnSeat];

    if (droppedOnElement.classList.contains('student-draggable')) {
        // Dropped directly onto an existing student element (or an empty-spot div)
        targetIndexInSeat = parseInt(droppedOnElement.dataset.studentIndex);
    } else {
        // Dropped onto an empty part of a seat-item.
        // Find the first available (null) slot in the target seat.
        targetIndexInSeat = targetSeatArray.indexOf(null);
        if (targetIndexInSeat === -1 && targetSeatArray.length < 2) {
            // If no nulls but less than 2 students (e.g., ["Student"]), add to end
            targetIndexInSeat = targetSeatArray.length;
        } else if (targetIndexInSeat === -1 && targetSeatArray.length === 2) {
            // If seat is full with two students (no nulls), default to swapping with the first student.
            targetIndexInSeat = 0;
        }
    }

    // Guard against dropping on the same exact spot
    if (draggedStudentData.fromRow === droppedOnRow &&
        draggedStudentData.fromSeat === droppedOnSeat &&
        draggedStudentData.fromStudentIndexInSeat === targetIndexInSeat) {
        document.querySelectorAll('.student-draggable.dragging').forEach(el => el.classList.remove('dragging'));
        return;
    }

    // Get the actual student name (or null for empty spot) from the source
    const studentToMove = initialSeating[draggedStudentData.fromRow][draggedStudentData.fromSeat][draggedStudentData.fromStudentIndexInSeat];

    // Get the actual content of the target slot before modifying
    const studentAtTarget = initialSeating[droppedOnRow][droppedOnSeat][targetIndexInSeat];

    // Perform the swap/move in the initialSeating array
    initialSeating[droppedOnRow][droppedOnSeat][targetIndexInSeat] = studentToMove;
    initialSeating[draggedStudentData.fromRow][draggedStudentData.fromSeat][draggedStudentData.fromStudentIndexInSeat] = studentAtTarget;

    // After the swap, ensure array integrity (exactly 2 elements, with nulls at the end)
    function normalizeSeatArray(seatArr) {
        let filtered = seatArr.filter(s => s !== null);
        while (filtered.length < 2) {
            filtered.push(null);
        }
        return filtered.slice(0, 2); // Ensure it doesn't exceed 2 elements
    }

    initialSeating[draggedStudentData.fromRow][draggedStudentData.fromSeat] = normalizeSeatArray(initialSeating[draggedStudentData.fromRow][draggedStudentData.fromSeat]);
    initialSeating[droppedOnRow][droppedOnSeat] = normalizeSeatArray(initialSeating[droppedOnRow][droppedOnSeat]);

    // Re-render the seating chart with the updated initialSeating
    displaySeating();

    // Reset dragged data and remove dragging class
    draggedStudentData = {
        name: null,
        fromRow: null,
        fromSeat: null,
        fromStudentIndexInSeat: null
    };
    document.querySelectorAll('.student-draggable.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
}


// --- Firestore Integration Functions ---
async function saveSeating() {
    try {
        const seatingJson = JSON.stringify(initialSeating);
        await db.collection(SEATING_COLLECTION).doc(SEATING_DOCUMENT).set({
            arrangement: seatingJson
        });
        showMessage("Seating arrangement saved successfully to cloud!", "success");
    } catch (e) {
        console.error("Error saving seating arrangement to Firestore: ", e);
        showMessage("Error saving seating arrangement. Please check console for details.", "error");
    }
}

async function loadSeating() {
    const hardcodedDefaultSeating = [
        [["Riddhima", "Samishtha"], ["Yashika", "Harshi"], ["Aditri", "Nitika"], ["Tanushka", "Nivedita"], ["Anaisha", "Ishani"], ["Avika", "Ayesha"]],
        [["Aadya", "Anushree"], ["Yashasvi", "Tanishee"], ["Sanskriti", "Samriddhi"], ["Vedant", "Saad"], ["Abhiraj", "Vipul"], ["Shaurya", "Siddhart"]],
        [["Dev", null], ["Avyukta", "Raunak"], ["Raghav", "Anish"], ["Satvik", "Hemansh"], ["Atharva", "Kunal"], ["Himank", "Naitik"]],
        [["Aryaman", null], ["Hammad", null], ["Affan", null], ["Aadhyan", "Aarav"], ["Svakksh", "Tanay"], ["Prakhyat", "Kartik"]]
    ];

    try {
        const docRef = db.collection(SEATING_COLLECTION).doc(SEATING_DOCUMENT);
        const doc = await docRef.get();

        if (doc.exists && doc.data().arrangement) {
            initialSeating = JSON.parse(doc.data().arrangement);
            showMessage("Saved seating arrangement loaded from cloud.", "info");
            return true;
        } else {
            console.log("No saved seating found in Firestore, using default and saving it to Firestore.");
            showMessage("No saved seating found, using default arrangement.", "info");

            initialSeating = JSON.parse(JSON.stringify(hardcodedDefaultSeating));
            await saveSeating(false); // Save without showing success message
            return false;
        }
    } catch (e) {
        console.error("Error loading seating arrangement from Firestore: ", e);
        showMessage("Error loading saved seating arrangement. Using default.", "error");
        initialSeating = JSON.parse(JSON.stringify(hardcodedDefaultSeating));
        return false;
    }
}

async function resetSeatingToDefault() {
    const confirmation = confirm("Are you sure you want to reset the seating arrangement to its original, default state? This cannot be undone.");

    if (confirmation) {
        const defaultSeating = [
            [["Riddhima", "Samishtha"], ["Yashika", "Harshi"], ["Aditri", "Nitika"], ["Tanushka", "Nivedita"], ["Anaisha", "Ishani"], ["Avika", "Ayesha"]],
            [["Aadya", "Anushree"], ["Yashasvi", "Tanishee"], ["Sanskriti", "Samriddhi"], ["Vedant", "Saad"], ["Abhiraj", "Vipul"], ["Shaurya", "Siddhart"]],
            [["Dev", null], ["Avyukta", "Raunak"], ["Raghav", "Anish"], ["Satvik", "Hemansh"], ["Atharva", "Kunal"], ["Himank", "Naitik"]],
            [["Aryaman", null], ["Hammad", null], ["Affan", null], ["Aadhyan", "Aarav"], ["Svakksh", "Tanay"], ["Prakhyat", "Kartik"]]
        ];
        initialSeating = JSON.parse(JSON.stringify(defaultSeating));

        try {
            const seatingJson = JSON.stringify(initialSeating);
            await db.collection(SEATING_COLLECTION).doc(SEATING_DOCUMENT).set({
                arrangement: seatingJson
            });
            showMessage("Seating arrangement reset to default and saved to cloud.", "warning");
            displaySeating();
        }
        catch (e) {
            console.error("Error resetting seating to default in Firestore: ", e);
            showMessage("Error resetting seating arrangement to default. Please try again.", "error");
        }

    } else {
        showMessage("Reset cancelled.", "info", 2000);
    }
}

// --- Window Load Logic ---
window.onload = function() {
    const loginOverlay = document.getElementById('loginOverlay');
    const mainContainer = document.querySelector('.container');

    const isLoggedIn = localStorage.getItem(LOGIN_STATUS_KEY) === 'true';
    const loginTimestamp = parseInt(localStorage.getItem(LOGIN_TIMESTAMP_KEY), 10);

    const currentTime = Date.now();
    const elapsedTime = currentTime - loginTimestamp;

    if (isLoggedIn && !isNaN(loginTimestamp) && elapsedTime < LOGIN_TIMEOUT_MS) {
        loginOverlay.style.display = 'none';
        mainContainer.style.display = 'block';
        initializeSeatingApp();
    } else {
        if (isLoggedIn && (isNaN(loginTimestamp) || elapsedTime >= LOGIN_TIMEOUT_MS)) {
            localStorage.removeItem(LOGIN_STATUS_KEY);
            localStorage.removeItem(LOGIN_TIMESTAMP_KEY);
        }
        loginOverlay.style.display = 'flex';
        mainContainer.style.display = 'none';
    }
};
