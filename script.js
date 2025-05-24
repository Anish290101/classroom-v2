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
// !!! IMPORTANT: REPLACE THIS ENTIRE firebaseConfig OBJECT WITH THE ONE YOU GOT FROM YOUR FIREBASE CONSOLE !!!
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
// All browsers will read/write to this specific document.
const SEATING_COLLECTION = "classSeating";       // Name of your Firestore collection
const SEATING_DOCUMENT = "defaultArrangement"; // Name of the document within that collection

// --- Login Credentials (Hardcoded - REMEMBER THIS IS NOT SECURE FOR SENSITIVE DATA) ---
const CORRECT_ID = "class10b";
const CORRECT_PASSWORD = "class10b@123";
const LOGIN_STATUS_KEY = "isLoggedIn";       // Key for localStorage to store login status
const LOGIN_TIMESTAMP_KEY = "loginTimestamp"; // Key for localStorage to store login timestamp
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
        initializeSeatingApp(); // Call the initialization function after successful login
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
        location.reload(); // Reload the page to show login overlay
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

    // Calculate the difference in milliseconds
    const diffTime = Math.abs(targetDate.getTime() - startDate.getTime());
    // Convert to days, then to weeks
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Get the day of the week for startDate (0 for Sunday, 1 for Monday, etc.)
    const startDayOfWeek = startDate.getDay(); // 1 for Monday, Jan 1, 2024

    // Adjust diffDays based on start day to ensure week 0 starts on Monday, Jan 1, 2024
    let effectiveDiffDays = diffDays;
    if (targetDate < startDate) {
        // If target date is before start date, rotation should go backwards
        effectiveDiffDays = -diffDays;
        if (startDayOfWeek !== 1) {
            effectiveDiffDays -= (startDayOfWeek - 1);
        }
    } else {
        // If target date is after start date
        if (startDayOfWeek !== 1) {
            effectiveDiffDays += (7 - startDayOfWeek + 1);
        }
    }

    // A week is 7 days. Integer division gives the number of full weeks.
    const rotationWeek = Math.floor(effectiveDiffDays / 7);

    return rotationWeek;
}

function rotateSingleRowJS(row, rotations) {
    const numSeats = row.length;
    if (numSeats === 0) return row;

    const actualRotations = rotations % numSeats;
    if (actualRotations === 0) return row;

    if (actualRotations > 0) {
        // Rotate right (positive rotations)
        return [...row.slice(numSeats - actualRotations), ...row.slice(0, numSeats - actualRotations)];
    } else {
        // Rotate left (negative rotations)
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

    // Basic date validation
    if (isNaN(year) || isNaN(month) || isNaN(day) ||
        year < 2024 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31) {
        errorMessage.textContent = "Please enter a valid date between 2024 and 2099.";
        errorMessage.className = 'error-message';
        seatingOutput.innerHTML = '';
        return;
    }

    // Check for valid day for the given month
    const testDate = new Date(year, month - 1, day);
    if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
        errorMessage.textContent = "Invalid date for the selected month.";
        errorMessage.className = 'error-message';
        seatingOutput.innerHTML = '';
        return;
    }

    errorMessage.textContent = ''; // Clear any previous error messages

    const rotationWeek = getRotationWeekFromDateJS(year, month, day);
    // Use the potentially loaded 'initialSeating' for rotation
    // Deep copy initialSeating BEFORE rotating for display.
    // This ensures drag and drop always works on the current (potentially modified) initialSeating
    // and that the rotation is applied to that base.
    const displayArrangement = JSON.parse(JSON.stringify(initialSeating));
    const rotatedSeating = rotateSeatingRowWiseJS(displayArrangement, rotationWeek);

    let html = '';
    rotatedSeating.forEach((row, rowIndex) => {
        // Add a div for the row number
        html += `<div class="seating-row-wrapper">`; // New wrapper for row number and seats
        html += `<div class="row-number">Row ${rowIndex + 1}</div>`; // Row number display

        html += `<div class="seating-row">`; // Existing seating-row div
        row.forEach((seat, seatIndex) => {
            html += `<div class="seat-item" data-row="${rowIndex}" data-seat="${seatIndex}" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)">`;
            seat.forEach(student => {
                if (student) {
                    html += `<div class="student-draggable" draggable="true" ondragstart="dragStart(event)">${student}</div>`;
                } else {
                    html += `<div class="student-draggable empty-spot" draggable="true" ondragstart="dragStart(event)">Empty</div>`;
                }
            });
            html += `</div>`;
        });
        html += `</div>`; // Close existing seating-row div
        html += `</div>`; // Close new seating-row-wrapper div
    });

    seatingOutput.innerHTML = html;
}

// --- Drag and Drop Logic ---
let draggedStudentName = null; // Stores the actual name dragged
let draggedFromRow = null;
let draggedFromSeat = null;
let draggedFromStudentIndexInSeat = null; // Index within the seat (0 or 1)

function dragStart(event) {
    const studentElement = event.target;
    // Get the student's name, treat "Empty" visual as null for internal logic
    draggedStudentName = studentElement.classList.contains('empty-spot') ? null : studentElement.textContent;

    const parentSeatItem = studentElement.closest('.seat-item');
    draggedFromRow = parseInt(parentSeatItem.dataset.row);
    draggedFromSeat = parseInt(parentSeatItem.dataset.seat);

    // Find the exact index of the dragged student within its seat's array
    const seatArray = initialSeating[draggedFromRow][draggedFromSeat];
    draggedFromStudentIndexInSeat = seatArray.indexOf(draggedStudentName);

    event.dataTransfer.setData("text/plain", draggedStudentName || "Empty"); // Set data for transfer
    studentElement.classList.add('dragging');
}

function dragOver(event) {
    event.preventDefault(); // Allows drop
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
    document.querySelectorAll('.seat-item.drag-over').forEach(el => el.classList.remove('drag-over')); // Clean up drag-over class

    const droppedOnSeatItem = event.target.closest('.seat-item');
    if (!droppedOnSeatItem) return; // Dropped outside a valid seat

    const droppedOnRow = parseInt(droppedOnSeatItem.dataset.row);
    const droppedOnSeat = parseInt(droppedOnSeatItem.dataset.seat);

    // If source or target is invalid, or dragging onto itself, do nothing
    if (draggedFromRow === null || draggedFromSeat === null ||
        (draggedFromRow === droppedOnRow && draggedFromSeat === droppedOnSeat)) {
        document.querySelectorAll('.student-draggable.dragging').forEach(el => el.classList.remove('dragging'));
        return;
    }

    const targetSeatArray = initialSeating[droppedOnRow][droppedOnSeat];

    // --- Core Logic for Swapping/Moving ---

    // 1. Remove dragged student from original position
    if (draggedFromStudentIndexInSeat !== null && initialSeating[draggedFromRow] && initialSeating[draggedFromRow][draggedFromSeat]) {
        initialSeating[draggedFromRow][draggedFromSeat][draggedFromStudentIndexInSeat] = null;
    }

    // 2. Determine target position within the seat
    let targetIndexInSeat = -1;
    const targetStudentElement = event.target.closest('.student-draggable');

    if (targetStudentElement) {
        // Dropped directly ON a student element
        const targetStudentName = targetStudentElement.classList.contains('empty-spot') ? null : targetStudentElement.textContent;
        targetIndexInSeat = targetSeatArray.indexOf(targetStudentName);
        if (targetIndexInSeat === -1) {
            // This case handles if the target student name was null but visually "Empty"
            if (targetStudentName === null) {
                targetIndexInSeat = targetSeatArray.indexOf(null);
            }
        }
    }

    if (targetIndexInSeat === -1) { // If dropped on a seat-item but not directly on a specific student, or target student not found
        // Find the first available (null) spot, or the first spot if no nulls
        targetIndexInSeat = targetSeatArray.indexOf(null);
        if (targetIndexInSeat === -1) {
            targetIndexInSeat = 0; // Default to first spot if full
        }
    }


    // 3. Place dragged student
    const originalContentAtTarget = targetSeatArray[targetIndexInSeat];
    targetSeatArray[targetIndexInSeat] = draggedStudentName; // Place the dragged student

    // 4. Place original content from target back into source, if needed (swapping)
    if (originalContentAtTarget !== null && originalContentAtTarget !== undefined) {
        // Find an empty spot in the original seat, or replace the dragged student's original spot
        let placedOriginal = false;
        const sourceSeatArray = initialSeating[draggedFromRow][draggedFromSeat];

        if (draggedFromStudentIndexInSeat !== -1 && sourceSeatArray[draggedFromStudentIndexInSeat] === null) {
             sourceSeatArray[draggedFromStudentIndexInSeat] = originalContentAtTarget;
             placedOriginal = true;
        } else {
            // Find another null spot in the original seat
            const emptySpotInOriginal = sourceSeatArray.indexOf(null);
            if (emptySpotInOriginal !== -1) {
                sourceSeatArray[emptySpotInOriginal] = originalContentAtTarget;
                placedOriginal = true;
            }
        }
        // If no easy spot, and it was a swap onto a filled spot, and it was a 2-person seat, prioritize filling the other spot
        if (!placedOriginal && sourceSeatArray.length === 2) {
             if (sourceSeatArray[0] === null && sourceSeatArray[1] !== null) { // If first spot is empty, move second to first
                 sourceSeatArray[0] = sourceSeatArray[1];
                 sourceSeatArray[1] = null;
                 placedOriginal = true;
             }
        }
    }


    // --- Post-drop cleanup and re-arrangement within seats ---
    // This part ensures that if a student moves from a 2-person seat, the remaining student shifts to the first spot.
    // Also, ensures no more than 2 students per seat.
    // This is vital for maintaining the structure [[student1, student2], [student3, null]]
    initialSeating[draggedFromRow][draggedFromSeat] = initialSeating[draggedFromRow][draggedFromSeat].filter(s => s !== null);
    while (initialSeating[draggedFromRow][draggedFromSeat].length < 2) {
        initialSeating[draggedFromRow][draggedFromSeat].push(null);
    }
    // Also for the dropped-on seat
    initialSeating[droppedOnRow][droppedOnSeat] = initialSeating[droppedOnRow][droppedOnSeat].filter(s => s !== null);
    while (initialSeating[droppedOnRow][droppedOnSeat].length < 2) {
        initialSeating[droppedOnRow][droppedOnSeat].push(null);
    }

    // Re-display the seating chart to reflect changes
    displaySeating();

    // Reset drag variables
    draggedStudentName = null;
    draggedFromRow = null;
    draggedFromSeat = null;
    draggedFromStudentIndexInSeat = null;

    // Remove dragging class from all elements
    document.querySelectorAll('.student-draggable.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
}


// --- Firestore Integration Functions ---

/**
 * Saves the current initialSeating array to Firestore.
 * This is the function that makes data persistent across browsers.
 * @param {boolean} showSuccessMessage - Whether to display a success message to the user.
 */
async function saveSeating(showSuccessMessage = true) {
    const message = document.getElementById('errorMessage');
    try {
        // Convert the nested array to a JSON string before saving
        const seatingJson = JSON.stringify(initialSeating);
        await db.collection(SEATING_COLLECTION).doc(SEATING_DOCUMENT).set({
            arrangement: seatingJson // Store the JSON string
        });

        if (showSuccessMessage) {
            message.textContent = "Seating arrangement saved successfully to cloud!";
            message.className = 'success-message';
            setTimeout(() => {
                message.textContent = '';
                message.className = 'error-message'; // Reset class
            }, 3000);
        }
    } catch (e) {
        console.error("Error saving seating arrangement to Firestore: ", e);
        message.textContent = "Error saving seating arrangement. Please check console for details.";
        message.className = 'error-message';
    }
}

/**
 * Loads the saved seating arrangement from Firestore.
 * If no saved data is found, it uses the hardcoded default and saves it to Firestore.
 * @returns {boolean} True if data was loaded from Firestore, false otherwise (e.g., used default or error).
 */
async function loadSeating() {
    const message = document.getElementById('errorMessage');
    // Define the default seating arrangement here, as it's the fallback.
    const hardcodedDefaultSeating = [
        [["Riddhima", "Samishtha"], ["Yashika", "Harshi"], ["Aditri", "Nitika"], ["Tanushka", "Nivedita"], ["Anaisha", "Ishani"], ["Avika", "Ayesha"]],
        [["Aadya", "Anushree"], ["Yashasvi", "Tanishee"], ["Sanskriti", "Samriddhi"], ["Vedant", "Saad"], ["Abhiraj", "Vipul"], ["Shaurya", "Siddhart"]],
        [["Dev", null], ["Avyukta", "Raunak"], ["Raghav", "Anish"], ["Satvik", "Hemansh"], ["Atharva", "Kunal"], ["Himank", "Naitik"]],
        [["Aryaman", null], ["Hammad", null], ["Affan", null], ["Aadhyan", "Aarav"], ["Svakksh", "Tanay"], ["Prakhyat", "Kartik"]]
    ];

    try {
        const docRef = db.collection(SEATING_COLLECTION).doc(SEATING_DOCUMENT);
        const doc = await docRef.get(); // Attempt to get the document from Firestore

        if (doc.exists && doc.data().arrangement) {
            // Data found in Firestore, parse the JSON string back into an array
            initialSeating = JSON.parse(doc.data().arrangement);
            message.textContent = "Saved seating arrangement loaded from cloud.";
            message.className = 'info-message';
            setTimeout(() => {
                message.textContent = '';
                message.className = 'error-message'; // Reset class
            }, 3000);
            return true; // Indicate success
        } else {
            // No data found in Firestore document, use the hardcoded default
            console.log("No saved seating found in Firestore, using default and saving it to Firestore.");
            message.textContent = "No saved seating found, using default arrangement.";
            message.className = 'info-message';
            setTimeout(() => {
                message.textContent = '';
                message.className = 'error-message'; // Reset class
            }, 3000);

            // Set initialSeating to the hardcoded default
            initialSeating = JSON.parse(JSON.stringify(hardcodedDefaultSeating)); // Deep copy

            // Save this default to Firestore so it's initialized for next time
            await saveSeating(false); // Save without showing a redundant success message
            return false; // Indicate that no data was found
        }
    } catch (e) {
        // Error occurred during Firestore operation (e.g., network issue, permission error)
        console.error("Error loading seating arrangement from Firestore: ", e);
        message.textContent = "Error loading saved seating arrangement. Using default.";
        message.className = 'error-message';
        // Fallback to default if there's a Firebase error
        initialSeating = JSON.parse(JSON.stringify(hardcodedDefaultSeating)); // Deep copy
        return false; // Indicate error
    }
}

/**
 * Resets the seating arrangement to its original, hardcoded default and updates Firestore.
 */
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
        initialSeating = JSON.parse(JSON.stringify(defaultSeating)); // Ensure a deep copy to truly reset

        try {
            // Convert the nested array to a JSON string before saving
            const seatingJson = JSON.stringify(initialSeating);
            // Overwrite the Firestore document with the default seating
            await db.collection(SEATING_COLLECTION).doc(SEATING_DOCUMENT).set({
                arrangement: seatingJson // Store the JSON string
            });
            // Also remove the old localStorage item if it exists (for clean up)
            localStorage.removeItem('savedSeating');

            message.textContent = "Seating arrangement reset to default and saved to cloud.";
            message.className = 'warning-message';
            setTimeout(() => {
                message.textContent = '';
                message.className = 'error-message'; // Reset class
            }, 3000);
            displaySeating(); // Re-display the seating with the newly reset data
        } catch (e) {
            console.error("Error resetting seating to default in Firestore: ", e);
            message.textContent = "Error resetting seating arrangement to default. Please try again.";
            message.className = 'error-message';
        }

    } else {
        // User cancelled the reset
        message.textContent = "Reset cancelled.";
        message.className = 'info-message';
        setTimeout(() => {
            message.textContent = '';
            message.className = 'error-message'; // Reset class
        }, 2000);
    }
}

// --- Window Load Logic ---
window.onload = function() {
    const loginOverlay = document.getElementById('loginOverlay');
    const mainContainer = document.querySelector('.container');

    const isLoggedIn = localStorage.getItem(LOGIN_STATUS_KEY) === 'true';
    const loginTimestamp = parseInt(localStorage.getItem(LOGIN_TIMESTAMP_KEY), 10); // Get timestamp and convert to integer

    const currentTime = Date.now();
    const elapsedTime = currentTime - loginTimestamp; // Calculate elapsed time in milliseconds

    if (isLoggedIn && !isNaN(loginTimestamp) && elapsedTime < LOGIN_TIMEOUT_MS) {
        // Session is active and not expired
        loginOverlay.style.display = 'none'; // Hide login overlay
        mainContainer.style.display = 'block'; // Show main content
        initializeSeatingApp(); // Initialize the app by loading data from Firestore
    } else {
        // Not logged in, or session expired.
        // Clean up localStorage if it was an expired session.
        if (isLoggedIn && (isNaN(loginTimestamp) || elapsedTime >= LOGIN_TIMEOUT_MS)) {
            localStorage.removeItem(LOGIN_STATUS_KEY);
            localStorage.removeItem(LOGIN_TIMESTAMP_KEY);
        }
        loginOverlay.style.display = 'flex'; // Show login overlay (using flex for centering)
        mainContainer.style.display = 'none'; // Keep main content hidden
    }
};
