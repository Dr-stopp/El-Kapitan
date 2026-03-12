import {
    getMockReviewQueue,
    getMockAnalytics,
    getMockSubmissionReport,
    getMockSubmissionComparison,
} from './instructorMockData.js';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function buildUrl(path) {
    return API_BASE ? `${API_BASE}${path}` : path;
}

async function handleJsonResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    if (!response.ok) {
        throw new Error(rawText || `Request failed with status ${response.status}`);
    }

    if (!contentType.includes('application/json')) {
        throw new Error(`Expected JSON but received: ${rawText.slice(0, 120)}`);
    }

    return JSON.parse(rawText);
}

export async function fetchReviewQueue(courseId) {
    try {
        const response = await fetch(buildUrl(`/api/instructor/review-queue?courseId=${courseId}`), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        return await handleJsonResponse(response);
    } catch (error) {
        console.warn('Falling back to local review queue data.', error);
        return getMockReviewQueue(courseId);
    }
}

export async function fetchAnalytics(courseId) {
    try {
        const response = await fetch(buildUrl(`/api/instructor/analytics?courseId=${courseId}`), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        return await handleJsonResponse(response);
    } catch (error) {
        console.warn('Falling back to local analytics data.', error);
        return getMockAnalytics(courseId);
    }
}

export async function fetchSubmissionReport(submissionId) {
    try {
        const response = await fetch(buildUrl(`/api/instructor/report/${submissionId}`), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        return await handleJsonResponse(response);
    } catch (error) {
        console.warn('Falling back to local submission report data.', error);
        return getMockSubmissionReport(submissionId);
    }
}

export async function fetchSubmissionComparison(submissionId) {
    try {
        const response = await fetch(buildUrl(`/api/instructor/compare/${submissionId}`), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        return await handleJsonResponse(response);
    } catch (error) {
        console.warn('Falling back to local submission comparison data.', error);
        return getMockSubmissionComparison(submissionId);
    }
}
