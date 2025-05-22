// --- Initial Seating Data ---
let initialSeating = [
    [["Riddhima", "Samishtha"], ["Yashika", "Harshi"], ["Aditri", "Nitika"], ["Tanushka", "Nivedita"], ["Anaisha", "Ishani"], ["Avika", "Ayesha"]],
    [["Aadya", "Anushree"], ["Yashasvi", "Tanishee"], ["Sanskriti", "Samriddhi"], ["Vedant", "Saad"], ["Abhiraj", "Vipul"], ["Shaurya", "Siddhart"]],
    [["Dev", null], ["Avyukta", "Raunak"], ["Raghav", "Anish"], ["Satvik", "Hemansh"], ["Atharva", "Kunal"], ["Himank", "Naitik"]],
    [["Aryaman", null], ["Hammad", null], ["Affan", null], ["Aadhyan", "Aarav"], ["Svakksh", "Tanay"], ["Prakhyat", "Kartik"]]
];

// --- Login Credentials (Hardcoded - REMEMBER THIS IS NOT SECURE FOR SENSITIVE DATA) ---
const CORRECT_ID = "class10b";
const CORRECT_PASSWORD = "class10b@123";
const LOGIN_STATUS_KEY = "isLoggedIn";       // Key for localStorage to store login status
const LOGIN_TIMESTAMP_KEY = "loginTimestamp"; // Key for localStorage to store login timestamp
const LOGIN_TIMEOUT_MS = 30 * 60 * 1000;      // 30 minutes in milliseconds

// --- Login Function ---
function checkLogin() {
    const userIdInput = document.getElementById('loginId').value;
    const passwordInput = document.getElementById('loginPassword').value;
    const loginErrorMessage = document.getElementById('loginErrorMessage');
    const loginOverlay = document.getElementById('loginOverlay');
    const mainContainer = document.querySelector('.container');

    loginErrorMessage.textContent = ''; // Clear previous messages

    if (userIdInput === CORRECT_ID && passwordInput === CORRECT_PASSWORD) {
        localStorage.setItem(LOGIN_STATUS_KEY, 'true');      // Mark as logged in
        localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString()); // Store current timestamp
        loginOverlay.style.display = 'none'; // Hide the login overlay
        mainContainer.style.display = 'block'; // Show the main content
        initializeSeatingApp(); // Initialize the app after successful login
    } else {
        loginErrorMessage.textContent = "Invalid User ID or Password. Please try again.";
        loginErrorMessage.className = 'error-message'; // Ensure error styling
    }
}

// --- Logout Function ---
function logout() {
    localStorage.removeItem(LOGIN_STATUS_KEY);      // Clear login status
    localStorage.removeItem(LOGIN_TIMESTAMP_KEY);   // Clear login timestamp
    window.location.reload(); // Reload the page to show the login screen
}

// --- Initialize App Function (called after successful login or on page load if already logged in) ---
function initializeSeatingApp() {
    const today = new Date();
    document.getElementById('yearInput').value = today.getFullYear();
    document.getElementById('monthInput').value = today.getMonth() + 1;
    document.getElementById('dayInput').value = today.getDate();

    loadSeating(); // Attempt to load saved seating
    displaySeating(); // Display seating for today's date
}


// --- Core Logic Functions ---

function rotateSingleRowJS(rowData, rotationCount) {
    if (rowData.length === 0) return [];
    const effectiveRotation = (rotationCount % rowData.length + rowData.length) % rowData.length;
    // Create a new array to store the rotated row to avoid modifying the original during rotation
    const rotated = rowData.slice(-effectiveRotation).concat(rowData.slice(0, -effectiveRotation));
    // Ensure the structure (e.g., [null, null] vs [null]) is preserved if original had it
    // This part assumes the initial structure of rowData is maintained (e.g., [S1, S2] vs [S1, null] vs [S1])
    // The rotation itself should not alter the length of the inner seat arrays (e.g., ["Riddhima", "Samishtha"]).
    // It rotates the "seats" within a row, not the "students within a seat".
    return rotated;
}

function rotateSeatingRowWiseJS(seating, rotationCount) {
    return seating.map(row => rotateSingleRowJS(row, rotationCount));
}

function getRotationWeekFromDateJS(year, month, day) {
    const startDate = new Date(2024, 0, 1);
    const targetDate = new Date(year, month - 1, day);
    if (isNaN(targetDate.getTime()) || targetDate.getFullYear() !== year || targetDate.getMonth() !== (month - 1) || targetDate.getDate() !== day) return -1;
    const diffTime = targetDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
}

function validMonthJS(m) {
    return m >= 1 && m <= 12;
}

function validDayJS(d, m, y) {
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === (m - 1) && date.getDate() === d;
}

// --- Drag and Drop Variables ---
let draggedStudent = null;
let draggedStudentOriginalSeat = { row: -1, seat: -1, index: -1 };

// --- Drag and Drop Functions ---
function dragStart(event, rowIdx, seatIdx, studentIndexInSeat) {
    draggedStudent = { name: event.target.textContent, row: rowIdx, seat: seatIdx, index: studentIndexInSeat };
    draggedStudentOriginalSeat = { row: rowIdx, seat: seatIdx, index: studentIndexInSeat };
    event.dataTransfer.setData("text/plain", event.target.textContent);
    event.target.classList.add("dragging");
}

function dragOver(event) {
    event.preventDefault();
    event.target.classList.add("drag-over-student");
}

function dragLeave(event) {
    event.target.classList.remove("drag-over-student");
}

function drop(event, targetRowIdx, targetSeatIdx, targetStudentIndexInSeat) {
    event.preventDefault();
    event.target.classList.remove("drag-over-student");

    if (!draggedStudent) {
        return;
    }

    // Create a deep copy of the global rotated seating for manipulation
    const currentDisplayedSeating = JSON.parse(JSON.stringify(rotatedSeatingGlobal));

    const originalRow = draggedStudentOriginalSeat.row;
    const originalSeat = draggedStudentOriginalSeat.seat;
    const originalStudentIndex = draggedStudentOriginalSeat.index; // 0 or 1

    const targetRow = targetRowIdx;
    const targetSeat = targetSeatIdx;
    const targetStudentIndex = targetStudentIndexInSeat; // 0 or 1

    // Get the name of the student being moved
    const studentToMoveName = currentDisplayedSeating[originalRow][originalSeat][originalStudentIndex];
    // Get the name of the student currently at the target spot (could be null if empty)
    const targetStudentName = currentDisplayedSeating[targetRow][targetSeat][targetStudentIndex];

    // Perform the move/swap operation directly on the deep copy:

    // 1. Place the dragged student into the target spot
    currentDisplayedSeating[targetRow][targetSeat][targetStudentIndex] = studentToMoveName;

    // 2. Place the target student (if any) into the original spot
    // If target was empty, original spot becomes null. If it was a swap, original spot gets target student.
    currentDisplayedSeating[originalRow][originalSeat][originalStudentIndex] = targetStudentName;

    // --- Reverse rotation to update initialSeating based on the modified currentDisplayedSeating ---
    const currentRotationCount = getRotationWeekFromDateJS(
        parseInt(document.getElementById('yearInput').value),
        parseInt(document.getElementById('monthInput').value),
        parseInt(document.getElementById('dayInput').value)
    );

    let newInitialSeating = [];
    currentDisplayedSeating.forEach((row, rIdx) => {
        const effectiveRotation = (currentRotationCount % row.length + row.length) % row.length;
        const reverseRotationAmount = (row.length - effectiveRotation) % row.length;
        // Use rotateSingleRowJS to convert the rotated-and-modified state back to the base initial seating
        newInitialSeating.push(rotateSingleRowJS(row, reverseRotationAmount));
    });

    // Update the global initialSeating with the new arrangement
    initialSeating = newInitialSeating;
    displaySeating(); // Re-render the seating chart with the updated initial seating
    draggedStudent = null; // Clear the dragged student state
}

let rotatedSeatingGlobal = [];

function displaySeating() {
    const yearInput = document.getElementById('yearInput');
    const monthInput = document.getElementById('monthInput');
    const dayInput = document.getElementById('dayInput');
    const errorMessageElement = document.getElementById('errorMessage');
    const seatingOutputElement = document.getElementById('seatingOutput');

    errorMessageElement.textContent = '';
    seatingOutputElement.innerHTML = '';

    const year = parseInt(yearInput.value);
    const month = parseInt(monthInput.value);
    const day = parseInt(dayInput.value);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        errorMessageElement.textContent = "Please enter valid numbers for year, month, and day.";
        return;
    }
    if (!validMonthJS(month)) {
        errorMessageElement.textContent = "Invalid month. Please input 1 to 12.";
        return;
    }
    if (!validDayJS(day, month, year)) {
        errorMessageElement.textContent = `Invalid day ${day} for month ${month} in year ${year}. Please re-enter.`;
        return;
    }

    const rotationWeekCount = getRotationWeekFromDateJS(year, month, day);

    if (rotationWeekCount === -1) {
        errorMessageElement.textContent = "Error: Could not calculate rotation week for the given date. Please check input.";
        return;
    }

    rotatedSeatingGlobal = rotateSeatingRowWiseJS(initialSeating, rotationWeekCount);

    let htmlContent = `<h2>Seating for ${month}/${day}/${year} (Rotation Week ${rotationWeekCount}):</h2>`;

    rotatedSeatingGlobal.forEach((row, r_idx) => {
        htmlContent += `<div class="row-display"><h3>Row ${r_idx + 1}</h3><div class="seats-container">`;
        row.forEach((seat, s_idx) => {
            htmlContent += `<div class="seat-item">Seat ${s_idx + 1}: `;

            // Render first student or empty slot
            if (seat?.[0] !== null) {
                htmlContent += `<span class="student-draggable" draggable="true" ondragstart="dragStart(event, ${r_idx}, ${s_idx}, 0)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event, ${r_idx}, ${s_idx}, 0)">${seat?.[0]}</span>`;
            } else {
                htmlContent += `<span class="student-draggable empty-spot" draggable="true" ondragstart="dragStart(event, ${r_idx}, ${s_idx}, 0)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event, ${r_idx}, ${s_idx}, 0)">Empty</span>`;
            }

            // Render second student or empty slot if seat is double
            if (seat?.length === 2) {
                if (seat?.[1] !== null) {
                    htmlContent += `, <span class="student-draggable" draggable="true" ondragstart="dragStart(event, ${r_idx}, ${s_idx}, 1)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event, ${r_idx}, ${s_idx}, 1)">${seat?.[1]}</span>`;
                } else {
                    htmlContent += `, <span class="student-draggable empty-spot second-empty" draggable="true" ondragstart="dragStart(event, ${r_idx}, ${s_idx}, 1)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event, ${r_idx}, ${s_idx}, 1)">Empty</span>`;
                }
            }

            htmlContent += `</div>`;
        });
        htmlContent += `</div></div>`;
    });

    seatingOutputElement.innerHTML = htmlContent;
}

// Added 'showSuccessMessage' parameter
function saveSeating(showSuccessMessage = true) {
    try {
        localStorage.setItem('savedSeating', JSON.stringify(initialSeating));
        if (showSuccessMessage) {
            const message = document.getElementById('errorMessage');
            message.textContent = "Seating arrangement saved successfully!";
            message.className = 'success-message';
            setTimeout(() => {
                message.textContent = '';
                message.className = 'error-message';
            }, 3000);
        }
    } catch (e) {
        const message = document.getElementById('errorMessage');
        message.textContent = "Error saving seating arrangement. Local storage might be full or unavailable.";
        message.className = 'error-message';
    }
}

function loadSeating() {
    try {
        const saved = localStorage.getItem('savedSeating');
        if (saved) {
            initialSeating = JSON.parse(saved);
            const message = document.getElementById('errorMessage');
            message.textContent = "Saved seating arrangement loaded.";
            message.className = 'info-message';
            setTimeout(() => {
                message.textContent = '';
                message.className = 'error-message';
            }, 3000);
            return true;
        }
    } catch (e) {
        const message = document.getElementById('errorMessage');
        message.textContent = "Error loading saved seating arrangement.";
        message.className = 'error-message';
    }
    return false;
}

// Modified resetSeatingToDefault to include confirmation
function resetSeatingToDefault() {
    const confirmation = confirm("Are you sure you want to reset the seating arrangement to its original, default state? This cannot be undone.");

    if (confirmation) {
        initialSeating = [
            [["Riddhima", "Samishtha"], ["Yashika", "Harshi"], ["Aditri", "Nitika"], ["Tanushka", "Nivedita"], ["Anaisha", "Ishani"], ["Avika", "Ayesha"]],
            [["Aadya", "Anushree"], ["Yashasvi", "Tanishee"], ["Sanskriti", "Samriddhi"], ["Vedant", "Saad"], ["Abhiraj", "Vipul"], ["Shaurya", "Siddhart"]],
            [["Dev", null], ["Avyukta", "Raunak"], ["Raghav", "Anish"], ["Satvik", "Hemansh"], ["Atharva", "Kunal"], ["Himank", "Naitik"]],
            [["Aryaman", null], ["Hammad", null], ["Affan", null], ["Aadhyan", "Aarav"], ["Svakksh", "Tanay"], ["Prakhyat", "Kartik"]]
        ];
        localStorage.removeItem('savedSeating');
        const message = document.getElementById('errorMessage');
        message.textContent = "Seating arrangement reset to default.";
        message.className = 'warning-message';
        setTimeout(() => {
            message.textContent = '';
            message.className = 'error-message';
        }, 3000);
        displaySeating();
    } else {
        // User cancelled the reset
        const message = document.getElementById('errorMessage');
        message.textContent = "Reset cancelled.";
        message.className = 'info-message';
        setTimeout(() => {
            message.textContent = '';
            message.className = 'error-message';
        }, 2000);
    }
}

// Corrected window.onload to properly handle login state and avoid infinite loop
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
        initializeSeatingApp(); // Initialize the app
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