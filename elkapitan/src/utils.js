// utils.js
// Shared helper functions used across the app

/**
 * Formats a JavaScript Date object into a localized, readable string.
 * Input:  JavaScript Date object
 * Output: e.g., 'Mar. 10, 11:59 p.m.' (Format depends on 'en-CA' locale)
 */
export const formatDueDate = (dateStr) => {

    const dateObj = new Date(dateStr);
    
    // Safety check to ensure the input is a valid Date object
    if (isNaN(dateObj)) return "Invalid Date";
    return dateObj.toLocaleString('en-CA', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });

};