const DEMO_ASSIGNMENTS_KEY = 'elkapitan-demo-instructor-assignments-v2'
const DEMO_COURSES_KEY = 'elkapitan-demo-instructor-courses-v1'

export const demoInstructorCourses = [
  { course_id: 1, course_name: 'Intro to CS', instructor: null },
  { course_id: 2, course_name: 'Data Structures', instructor: null },
]

const defaultDemoAssignments = {
  1: [
    {
      assignment_run_id: 101,
      assign_id: 201,
      course_id: 1,
      due_date: '2026-03-28T23:59:00Z',
      top_k: 3,
      threshold: 70,
      name: 'Sorting Lab',
      language: 'C++',
      description: 'Language: C++ | Top K: 3 | Threshold: 70%',
    },
    {
      assignment_run_id: 102,
      assign_id: 202,
      course_id: 1,
      due_date: '2026-04-04T23:59:00Z',
      top_k: 3,
      threshold: 70,
      name: 'Tree Traversal',
      language: 'Java',
      description: 'Language: Java | Top K: 3 | Threshold: 70%',
    },
  ],
  2: [
    {
      assignment_run_id: 201,
      assign_id: 301,
      course_id: 2,
      due_date: '2026-03-30T23:59:00Z',
      top_k: 3,
      threshold: 70,
      name: 'AVL Tree Implementation',
      language: 'Java',
      description: 'Language: Java | Top K: 3 | Threshold: 70%',
    },
    {
      assignment_run_id: 202,
      assign_id: 302,
      course_id: 2,
      due_date: '2026-04-07T23:59:00Z',
      top_k: 5,
      threshold: 75,
      name: 'Graph Search',
      language: 'C',
      description: 'Language: C | Top K: 5 | Threshold: 75%',
    },
  ],
}

const reviewQueueByCourse = {
  1: [
    {
      id: 1201,
      studentName: 'Ava Thompson',
      assignmentName: 'Sorting Lab',
      repositoryKey: 'current',
      repositoryLabel: 'Current Course',
      language: 'C++',
      similarityScore: 87,
      status: 'Flagged',
      analysisState: 'complete',
      submittedAt: 'Mar 8, 2026, 8:14 PM',
      excerpt: 'Large structural overlap with another submission in the same course.',
      sourceLabel: 'Submission #1189',
      summary:
        'High overlap in helper methods and loop structure across the core sorting implementation.',
      notes: 'Review the matching helper utilities and variable renaming patterns.',
      leftText:
        'void sortItems(vector<int>& values) {\n  for (int i = 0; i < values.size(); ++i) {\n    for (int j = i + 1; j < values.size(); ++j) {\n      if (values[j] < values[i]) {\n        swap(values[i], values[j]);\n      }\n    }\n  }\n}',
      rightText:
        'void arrange(vector<int>& values) {\n  for (int i = 0; i < values.size(); ++i) {\n    for (int j = i + 1; j < values.size(); ++j) {\n      if (values[j] < values[i]) {\n        swap(values[i], values[j]);\n      }\n    }\n  }\n}',
      sections: [
        { id: 1, leftStartLine: 2, leftEndLine: 7, rightStartLine: 2, rightEndLine: 7 },
      ],
      matches: [
        {
          sourceLabel: 'Submission #1189',
          reason: 'Control flow and swap logic are nearly identical.',
          score: 87,
        },
        {
          sourceLabel: 'Submission #942',
          reason: 'A similar helper pattern appears in archived work.',
          score: 62,
        },
      ],
      engineVersion: 'demo-engine-1.0.0',
    },
    {
      id: 1202,
      studentName: 'Noah Patel',
      assignmentName: 'Sorting Lab',
      repositoryKey: 'public',
      repositoryLabel: 'Public Samples',
      language: 'Java',
      similarityScore: 54,
      status: 'Needs Review',
      analysisState: 'complete',
      submittedAt: 'Mar 8, 2026, 9:02 PM',
      excerpt: 'Shared method layout and matching comments around comparator logic.',
      sourceLabel: 'Public sample',
      summary:
        'Moderate overlap with a public code example. Logic differs in edge-case handling.',
      notes: 'Likely influenced by a tutorial. Check citation requirements.',
      leftText:
        'public static void merge(int[] arr) {\n  // student submission excerpt\n  if (arr.length < 2) return;\n}',
      rightText:
        'public static void merge(int[] arr) {\n  // matched source excerpt\n  if (arr.length < 2) return;\n}',
      sections: [
        { id: 1, leftStartLine: 1, leftEndLine: 3, rightStartLine: 1, rightEndLine: 3 },
      ],
      matches: [
        {
          sourceLabel: 'Public sample',
          reason: 'Method layout is similar to a tutorial example.',
          score: 54,
        },
      ],
      engineVersion: 'demo-engine-1.0.0',
    },
    {
      id: 1203,
      studentName: 'Liam Chen',
      assignmentName: 'Tree Traversal',
      repositoryKey: 'current',
      repositoryLabel: 'Current Course',
      language: 'C',
      similarityScore: null,
      status: 'Pending Review',
      analysisState: 'queued',
      submittedAt: 'Mar 9, 2026, 11:20 AM',
      excerpt: 'No stored comparison results are available yet for this submission.',
      sourceLabel: 'N/A',
      summary: 'No meaningful integrity risk has been recorded yet.',
      notes: 'No follow-up required until comparison results are generated.',
      leftText: '',
      rightText: '',
      sections: [],
      matches: [],
      engineVersion: 'demo-engine-1.0.0',
    },
  ],
  2: [
    {
      id: 2201,
      studentName: 'Mia Garcia',
      assignmentName: 'AVL Tree Implementation',
      repositoryKey: 'archive',
      repositoryLabel: 'Previous Offerings',
      language: 'Java',
      similarityScore: 76,
      status: 'Flagged',
      analysisState: 'complete',
      submittedAt: 'Mar 7, 2026, 6:35 PM',
      excerpt: 'Matching rebalance sequence and identical rotation helper names.',
      sourceLabel: 'Submission #2188',
      summary:
        'Several balancing operations are structurally identical to another stored submission.',
      notes: 'Focus on rotation helpers and delete-case handling.',
      leftText:
        'private Node rotateLeft(Node node) {\n  Node child = node.right;\n  node.right = child.left;\n  child.left = node;\n  return child;\n}',
      rightText:
        'private Node rotateLeft(Node node) {\n  Node child = node.right;\n  node.right = child.left;\n  child.left = node;\n  return child;\n}',
      sections: [
        { id: 1, leftStartLine: 1, leftEndLine: 5, rightStartLine: 1, rightEndLine: 5 },
      ],
      matches: [
        {
          sourceLabel: 'Submission #2188',
          reason: 'Rotation and rebalance logic match closely.',
          score: 76,
        },
      ],
      engineVersion: 'demo-engine-1.0.0',
    },
    {
      id: 2202,
      studentName: 'Ethan Brown',
      assignmentName: 'Graph Search',
      repositoryKey: 'secondary',
      repositoryLabel: 'Secondary Repository',
      language: 'C',
      similarityScore: 41,
      status: 'Needs Review',
      analysisState: 'complete',
      submittedAt: 'Mar 8, 2026, 3:48 PM',
      excerpt: 'Queue setup and visited bookkeeping resemble a known forum answer.',
      sourceLabel: 'Forum snippet',
      summary:
        'One helper appears borrowed, but the surrounding implementation still differs.',
      notes: 'Review whether the external reference was allowed.',
      leftText:
        'void bfs(Graph* graph, int start) {\n  Queue queue = createQueue();\n  enqueue(&queue, start);\n}',
      rightText:
        'void bfs(Graph* graph, int start) {\n  Queue queue = createQueue();\n  enqueue(&queue, start);\n}',
      sections: [
        { id: 1, leftStartLine: 1, leftEndLine: 3, rightStartLine: 1, rightEndLine: 3 },
      ],
      matches: [
        {
          sourceLabel: 'Forum snippet',
          reason: 'Helper initialization is identical.',
          score: 41,
        },
      ],
      engineVersion: 'demo-engine-1.0.0',
    },
  ],
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function readDemoCourses() {
  if (typeof window === 'undefined') {
    return clone(demoInstructorCourses)
  }

  try {
    const stored = window.localStorage.getItem(DEMO_COURSES_KEY)
    return stored ? JSON.parse(stored) : clone(demoInstructorCourses)
  } catch {
    return clone(demoInstructorCourses)
  }
}

export function writeDemoCourses(nextCourses) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEMO_COURSES_KEY, JSON.stringify(nextCourses))
}

export function readDemoAssignments() {
  if (typeof window === 'undefined') {
    return clone(defaultDemoAssignments)
  }

  try {
    const stored = window.localStorage.getItem(DEMO_ASSIGNMENTS_KEY)
    return stored ? JSON.parse(stored) : clone(defaultDemoAssignments)
  } catch {
    return clone(defaultDemoAssignments)
  }
}

export function writeDemoAssignments(nextAssignments) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEMO_ASSIGNMENTS_KEY, JSON.stringify(nextAssignments))
}

function getAllMockItems() {
  return Object.values(reviewQueueByCourse).flat()
}

function normalizeSubmission(item) {
  return {
    id: item.id,
    studentName: item.studentName,
    assignmentName: item.assignmentName,
    repositoryKey: item.repositoryKey,
    repositoryLabel: item.repositoryLabel,
    language: item.language,
    similarityScore: item.similarityScore,
    status: item.status,
    analysisState: item.analysisState || 'queued',
    submittedAt: item.submittedAt,
    excerpt: item.excerpt,
  }
}

export function getMockReviewQueue(courseId) {
  return {
    submissions: (reviewQueueByCourse[courseId] || []).map(normalizeSubmission),
  }
}

export function getMockAnalytics(courseId) {
  const items = reviewQueueByCourse[courseId] || []
  const totalSubmissions = items.length
  const flaggedCases = items.filter((item) => item.status === 'Flagged').length
  const reviewCases = items.filter((item) => item.status === 'Needs Review').length

  const languageCounts = Object.entries(
    items.reduce((accumulator, item) => {
      const key = item.language || 'Unknown'
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {})
  )
    .map(([language, count]) => ({
      language,
      count,
      percent: totalSubmissions === 0 ? 0 : Math.round((count / totalSubmissions) * 100),
    }))
    .sort((left, right) => right.count - left.count)

  const priorityCases = [...items]
    .sort((left, right) => (right.similarityScore || 0) - (left.similarityScore || 0))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      language: item.language,
      status: item.status,
      similarityScore: item.similarityScore,
    }))

  return {
    metrics: {
      totalSubmissions,
      flaggedCases,
      reviewCases,
      configuredRuns: (readDemoAssignments()[courseId] || []).length,
    },
    priorityCases,
    languageCounts,
  }
}

export function getMockSubmissionReport(submissionId) {
  const item = getAllMockItems().find((entry) => String(entry.id) === String(submissionId))

  if (!item) {
    throw new Error('Submission report not found.')
  }

  return {
    id: item.id,
    studentName: item.studentName,
    assignmentName: item.assignmentName,
    similarityScore: item.similarityScore,
    status: item.status,
    analysisState: item.analysisState || 'queued',
    summary: item.summary,
    matches: item.matches,
    language: item.language,
    submittedAt: item.submittedAt,
    engineVersion: item.engineVersion,
  }
}

export function getMockSubmissionComparison(submissionId) {
  const item = getAllMockItems().find((entry) => String(entry.id) === String(submissionId))

  if (!item) {
    throw new Error('Submission comparison not found.')
  }

  return {
    id: item.id,
    sourceLabel: item.sourceLabel,
    similarityScore: item.similarityScore,
    analysisState: item.analysisState || 'queued',
    notes: item.notes,
    leftText: item.leftText,
    rightText: item.rightText,
    sections: item.sections || [],
  }
}
