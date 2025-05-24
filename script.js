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
        document.getElementById('loginOverlay').style.display = 'none';
        document.querySelector('.container').style.display = 'block';
        initializeSeatingApp();
    } else {
        loginErrorMessage.textContent = "Invalid User ID or Password.";
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

// --- Initialize App Function (called after successful login or on page load if already logged in) ---
async function initializeSeatingApp() {
    // Set current date inputs
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
        if (startDayOfWeek !== 1) {
            effectiveDiffDays -= (startDayOfWeek - 1);
        }
    } else {
        if (startDayOfWeek !== 1) {
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
        errorMessage.textContent = "Please enter a valid date between 2024 and 2099.";
        errorMessage.className = 'error-message';
        seatingOutput.innerHTML = '';
        return;
    }

    const testDate = new Date(year, month - 1, day);
    if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
        errorMessage.textContent = "Invalid date for the selected month.";
        errorMessage.className = 'error-message';
        seatingOutput.innerHTML = '';
        return;
    }

    errorMessage.textContent = '';

    const rotationWeek = getRotationWeekFromDateJS(year, month, day);
    const displayArrangement = JSON.parse(JSON.stringify(initialSeating));
    const rotatedSeating = rotateSeatingRowWiseJS(displayArrangement, rotationWeek);

    let html = '';
    rotatedSeating.forEach((row, rowIndex) => {
        html += `<div class="seating-row-wrapper">`;
        html += `<div class="row-number">Row ${rowIndex + 1}</div>`;

        html += `<div class="seating-row">`;
        row.forEach((seat, seatIndex) => {
            html += `<div class="seat-item" data-row="${rowIndex}" data-seat="${seatIndex}" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)">`;
            seat.forEach((student, studentInSeatIndex) => { // Added studentInSeatIndex
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
    draggedStudentData.name = studentElement.classList.contains('empty-spot') ? null : studentElement.textContent;

    const parentSeatItem = studentElement.closest('.seat-item');
    draggedStudentData.fromRow = parseInt(parentSeatItem.dataset.row);
    draggedStudentData.fromSeat = parseInt(parentSeatItem.dataset.seat);
    draggedStudentData.fromStudentIndexInSeat = parseInt(studentElement.dataset.studentIndex);

    event.dataTransfer.setData("text/plain", draggedStudentData.name || "Empty");
    studentElement.classList.add('dragging');
}

function dragOver(event) {
    event.preventDefault();
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
    if (!droppedOnElement) return;

    let droppedOnRow, droppedOnSeat, droppedOnStudentIndexInSeat = null;

    if (droppedOnElement.classList.contains('student-draggable')) {
        // Dropped directly on a student
        const parentSeatItem = droppedOnElement.closest('.seat-item');
        droppedOnRow = parseInt(parentSeatItem.dataset.row);
        droppedOnSeat = parseInt(parentSeatItem.dataset.seat);
        droppedOnStudentIndexInSeat = parseInt(droppedOnElement.dataset.studentIndex);
    } else if (droppedOnElement.classList.contains('seat-item')) {
        // Dropped on an empty part of a seat-item
        droppedOnRow = parseInt(droppedOnElement.dataset.row);
        droppedOnSeat = parseInt(droppedOnElement.dataset.seat);
        // Find the first null or 0 index if seat is empty
        const targetSeatArray = initialSeating[droppedOnRow][droppedOnSeat];
        droppedOnStudentIndexInSeat = targetSeatArray.indexOf(null);
        if (droppedOnStudentIndexInSeat === -1 && targetSeatArray.length < 2) {
            droppedOnStudentIndexInSeat = targetSeatArray.length; // Add to end if space
        } else if (droppedOnStudentIndexInSeat === -1) {
             // If seat is full and no null, target the first spot for swap
             droppedOnStudentIndexInSeat = 0;
        }
    }


    if (draggedStudentData.fromRow === null || draggedStudentData.fromSeat === null ||
        (draggedStudentData.fromRow === droppedOnRow && draggedStudentData.fromSeat === droppedOnSeat &&
         draggedStudentData.fromStudentIndexInSeat === droppedOnStudentIndexInSeat)) {
        document.querySelectorAll('.student-draggable.dragging').forEach(el => el.classList.remove('dragging'));
        return;
    }

    const sourceSeatArray = initialSeating[draggedStudentData.fromRow][draggedStudentData.fromSeat];
    const targetSeatArray = initialSeating[droppedOnRow][droppedOnSeat];

    const tempDraggedStudent = draggedStudentData.name;
    const tempTargetStudent = targetSeatArray[droppedOnStudentIndexInSeat];

    // Handle swap
    initialSeating[droppedOnRow][droppedOnSeat][droppedOnStudentIndexInSeat] = tempDraggedStudent;
    sourceSeatArray[draggedStudentData.fromStudentIndexInSeat] = tempTargetStudent;

    // Clean up nulls and ensure structure (e.g., student, null instead of null, student)
    initialSeating[dragagedStudentData.fromRow][draggedStudentData.fromSeat] = initialSeating[draggedStudentData.fromRow][draggedStudentData.fromSeat].filter(s => s !== null);
    while(initialSeating[draggedStudentData.fromRow][draggedStudentData.fromSeat].length < 2) {
        initialSeating[draggedStudentData.fromRow][draggedStudentData.fromSeat].push(null);
    }

    initialSeating[droppedOnRow][droppedOnSeat] = initialSeating[droppedOnRow][droppedOnSeat].filter(s => s !== null);
    while(initialSeating[droppedOnRow][droppedOnSeat].length < 2) {
        initialSeating[droppedOnRow][droppedOnSeat].push(null);
    }

    displaySeating();

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
async function saveSeating(showSuccessMessage = true) {
    const message = document.getElementById('errorMessage');
    try {
        const seatingJson = JSON.stringify(initialSeating);
        await db.collection(SEATING_COLLECTION).doc(SEATING_DOCUMENT).set({
            arrangement: seatingJson
        });

        if (showSuccessMessage) {
            message.textContent = "Seating arrangement saved successfully to cloud!";
            message.className = 'success-message';
            setTimeout(() => {
                message.textContent = '';
                message.className = 'error-message';
            }, 3000);
        }
    } catch (e) {
        console.error("Error saving seating arrangement to Firestore: ", e);
        message.textContent = "Error saving seating arrangement. Please check console for details.";
        message.className = 'error-message';
    }
}

async function loadSeating() {
    const message = document.getElementById('errorMessage');
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
            message.textContent = "Saved seating arrangement loaded from cloud.";
            message.className = 'info-message';
            setTimeout(() => {
                message.textContent = '';
                message.className = 'error-message';
            }, 3000);
            return true;
        } else {
            console.log("No saved seating found in Firestore, using default and saving it to Firestore.");
            message.textContent = "No saved seating found, using default arrangement.";
            message.className = 'info-message';
            setTimeout(() => {
                message.textContent = '';
                message.className = 'error-message';
            }, 3000);

            initialSeating = JSON.parse(JSON.stringify(hardcodedDefaultSeating));
            await saveSeating(false);
            return false;
        }
    } catch (e) {
        console.error("Error loading seating arrangement from Firestore: ", e);
        message.textContent = "Error loading saved seating arrangement. Using default.";
        message.className = 'error-message';
        initialSeating = JSON.parse(JSON.stringify(hardcodedDefaultSeating));
        return false;
    }
}

async function resetSeatingToDefault() {
    const confirmation = confirm("Are you sure you want to reset the seating arrangement to its original, default state? This cannot be undone.");
    const message = document.getElementById('errorMessage');

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
            localStorage.removeItem('savedSeating');

            message.textContent = "Seating arrangement reset to default and saved to cloud.";
            message.className = 'warning-message';
            setTimeout(() => {
                message.textContent = '';
                message.className = 'error-message';
            }, 3000);
            displaySeating();
        } catch (e) {
            console.error("Error resetting seating to default in Firestore: ", e);
            message.textContent = "Error resetting seating arrangement to default. Please try again.";
            message.className = 'error-message';
        }

    } else {
        message.textContent = "Reset cancelled.";
        message.className = 'info-message';
        setTimeout(() => {
            message.textContent = '';
            message.className = 'error-message';
        }, 2000);
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
