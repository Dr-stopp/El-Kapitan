// utils.js
// Shared helper functions used across the app

// Formats an ISO date string into a readable date and time
// Input:  '2026-03-10T23:59:00Z'
// Output: 'March 10, 2026 11:59 PM'
export const formatDueDate = (isoString) => {

    // Convert the ISO string into a JavaScript Date object
    const date = new Date(isoString);

    // Format the date part — e.g. 'March 10, 2026'
    const datePart = date.toLocaleDateString('en-US', {
        year:  'numeric',
        month: 'long',
        day:   'numeric',
    });

    // Format the time part — e.g. '11:59 PM'
    const timePart = date.toLocaleTimeString('en-US', {
        hour:   '2-digit',
        minute: '2-digit',
    });

    return `${datePart} ${timePart}`;
};