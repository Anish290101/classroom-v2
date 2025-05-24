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
let currentSeating = []; // Store the currently displayed seating for drag & drop

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
    const rotatedSeating = rotateSeatingRowWiseJS(initialSeating, rotationWeek);
    currentSeating = JSON.parse(JSON.stringify(rotatedSeating)); // Deep copy for drag & drop

    let html = '';
    rotatedSeating.forEach((row, rowIndex) => {
        html += `<div class="seating-row">`;
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
        html += `</div>`;
    });

    seatingOutput.innerHTML = html;
}

// --- Drag and Drop Logic ---
let draggedStudent = null;
let draggedFromRow = null;
let draggedFromSeat = null;

function dragStart(event) {
    draggedStudent = event.target.textContent;
    const parentSeatItem = event.target.closest('.seat-item');
    draggedFromRow = parseInt(parentSeatItem.dataset.row);
    draggedFromSeat = parseInt(parentSeatItem.dataset.seat);

    event.dataTransfer.setData("text/plain", draggedStudent);
    event.target.classList.add('dragging');
}

function dragOver(event) {
    event.preventDefault(); // Allows drop
    event.target.classList.add('drag-over');
}

function dragLeave(event) {
    event.target.classList.remove('drag-over');
}

function drop(event) {
    event.preventDefault();
    event.target.classList.remove('drag-over');

    const droppedOnSeatItem = event.target.closest('.seat-item');
    const droppedOnRow = parseInt(droppedOnSeatItem.dataset.row);
    const droppedOnSeat = parseInt(droppedOnSeatItem.dataset.seat);

    if (draggedFromRow === null || draggedFromSeat === null) return; // Should not happen

    let targetStudentDiv = null;
    if (event.target.classList.contains('student-draggable')) {
        targetStudentDiv = event.target;
    } else {
        // If dropped directly on the seat-item div, find the student inside
        targetStudentDiv = droppedOnSeatItem.querySelector('.student-draggable');
    }

    const targetStudentName = targetStudentDiv ? targetStudentDiv.textContent : null;

    // Remove the dragged student from its original position
    const originalSeatContent = initialSeating[draggedFromRow][draggedFromSeat];
    const originalStudentIndex = originalSeatContent.indexOf(draggedStudent === "Empty" ? null : draggedStudent);

    if (originalStudentIndex > -1) {
        originalSeatContent[originalStudentIndex] = null; // Mark original spot as empty
    }


    if (targetStudentName && targetStudentName !== "Empty") {
        // Drop on another student: swap places
        const targetStudentActual = currentSeating[droppedOnRow][droppedOnSeat].find(name => name !== null); // Find the actual student name

        // Find the index of the student being dropped ONTO
        const targetStudentIndex = initialSeating[droppedOnRow][droppedOnSeat].indexOf(targetStudentActual);

        if (targetStudentIndex > -1) {
            initialSeating[draggedFromRow][draggedFromSeat][originalStudentIndex] = targetStudentActual; // Move target student to original spot
            initialSeating[droppedOnRow][droppedOnSeat][targetStudentIndex] = (draggedStudent === "Empty" ? null : draggedStudent); // Move dragged student to target spot
        } else {
             // If target student was null, then replace null with dragged student
             if (initialSeating[droppedOnRow][droppedOnSeat][0] === null) {
                initialSeating[droppedOnRow][droppedOnSeat][0] = (draggedStudent === "Empty" ? null : draggedStudent);
             } else if (initialSeating[droppedOnRow][droppedOnSeat][1] === null) {
                initialSeating[droppedOnRow][droppedOnSeat][1] = (draggedStudent === "Empty" ? null : draggedStudent);
             }
        }
    } else {
        // Drop on an "Empty" spot or directly on a seat-item
        const targetSeat = initialSeating[droppedOnRow][droppedOnSeat];
        let placed = false;
        for(let i=0; i < targetSeat.length; i++) {
            if (targetSeat[i] === null) {
                targetSeat[i] = (draggedStudent === "Empty" ? null : draggedStudent);
                placed = true;
                break;
            }
        }
        if (!placed) {
            // If both spots are taken, it means the 'Empty' visual was part of a full seat.
            // Restore the dragged student to its original position if it was a real student.
            if (draggedStudent !== "Empty" && originalStudentIndex > -1) {
                 initialSeating[draggedFromRow][draggedFromSeat][originalStudentIndex] = (draggedStudent === "Empty" ? null : draggedStudent);
            }
        }
    }

    // Clean up nulls in the original seat if a student moved from a 2-person seat
    const originalSeat = initialSeating[draggedFromRow][draggedFromSeat];
    if (originalSeat.length === 2 && originalSeat[0] === null && originalSeat[1] !== null) {
        // Shift student to the first position if first is empty and second is not
        initialSeating[draggedFromRow][draggedFromSeat] = [originalSeat[1], null];
    }


    // Re-display the seating chart to reflect changes
    displaySeating();

    // Reset drag variables
    draggedStudent = null;
    draggedFromRow = null;
    draggedFromSeat = null;

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
