const reviewQueueByCourse = {
  1: [
    {
      id: 1201,
      studentName: 'Ava Thompson',
      assignmentName: 'Sorting Lab',
      language: 'Python',
      similarityScore: 87,
      status: 'Flagged',
      submittedAt: 'March 8, 2026 8:14 PM',
      excerpt: 'Large structural overlap with another submission in the same course.',
      sourceLabel: 'Internal submission 1189',
      summary: 'High overlap in helper methods and identical loop structure across core functions.',
      notes: 'Review the matching helper utilities and variable renaming patterns.',
      leftText: 'def sort_items(values):\n    for i in range(len(values)):\n        for j in range(i + 1, len(values)):\n            if values[j] < values[i]:\n                values[i], values[j] = values[j], values[i]\n    return values',
      rightText: 'def arrange(values):\n    for i in range(len(values)):\n        for j in range(i + 1, len(values)):\n            if values[j] < values[i]:\n                values[i], values[j] = values[j], values[i]\n    return values',
      matches: [
        { sourceLabel: 'Internal submission 1189', reason: 'Control flow and swap logic are nearly identical.', score: 87 },
        { sourceLabel: 'Archived submission 942', reason: 'Same helper pattern appears in legacy work.', score: 62 },
      ],
      engineVersion: 'engine-demo-1.0.0',
    },
    {
      id: 1202,
      studentName: 'Noah Patel',
      assignmentName: 'Sorting Lab',
      language: 'Java',
      similarityScore: 54,
      status: 'Needs Review',
      submittedAt: 'March 8, 2026 9:02 PM',
      excerpt: 'Shared method layout and matching comments around comparator logic.',
      sourceLabel: 'Public code sample',
      summary: 'Moderate overlap with publicly available code example. Logic differs in edge handling.',
      notes: 'Likely influenced by a tutorial. Check citation requirements.',
      leftText: 'public static void merge(int[] arr) { /* student submission excerpt */ }',
      rightText: 'public static void merge(int[] arr) { /* matched source excerpt */ }',
      matches: [
        { sourceLabel: 'Public code sample', reason: 'Method layout is similar to a tutorial example.', score: 54 },
      ],
      engineVersion: 'engine-demo-1.0.0',
    },
    {
      id: 1203,
      studentName: 'Liam Chen',
      assignmentName: 'Tree Traversal',
      language: 'C++',
      similarityScore: 18,
      status: 'Clear',
      submittedAt: 'March 9, 2026 11:20 AM',
      excerpt: 'Low similarity. Mostly standard traversal patterns.',
      sourceLabel: 'N/A',
      summary: 'No meaningful integrity risk detected.',
      notes: 'No follow-up required.',
      leftText: 'void inorder(Node* root) { if (!root) return; inorder(root->left); visit(root); inorder(root->right); }',
      rightText: '',
      matches: [],
      engineVersion: 'engine-demo-1.0.0',
    },
  ],
  2: [
    {
      id: 2201,
      studentName: 'Mia Garcia',
      assignmentName: 'AVL Tree Implementation',
      language: 'Java',
      similarityScore: 76,
      status: 'Flagged',
      submittedAt: 'March 7, 2026 6:35 PM',
      excerpt: 'Matching rebalance sequence and identical rotation helper names.',
      sourceLabel: 'Internal submission 2188',
      summary: 'Several balancing operations are structurally identical to another current submission.',
      notes: 'Focus on rotation helpers and delete-case handling.',
      leftText: 'private Node rotateLeft(Node node) { /* student submission excerpt */ }',
      rightText: 'private Node rotateLeft(Node node) { /* matched source excerpt */ }',
      matches: [
        { sourceLabel: 'Internal submission 2188', reason: 'Rotation and rebalance logic match closely.', score: 76 },
      ],
      engineVersion: 'engine-demo-1.0.0',
    },
    {
      id: 2202,
      studentName: 'Ethan Brown',
      assignmentName: 'Graph Search',
      language: 'Python',
      similarityScore: 41,
      status: 'Needs Review',
      submittedAt: 'March 8, 2026 3:48 PM',
      excerpt: 'BFS helper resembles a forum example, but surrounding code differs.',
      sourceLabel: 'Forum snippet',
      summary: 'Single helper appears borrowed; rest of submission seems original.',
      notes: 'Review whether external reference was allowed.',
      leftText: 'def bfs(graph, start):\n    queue = [start]\n    seen = {start}',
      rightText: 'def bfs(graph, start):\n    queue = [start]\n    seen = {start}',
      matches: [
        { sourceLabel: 'Forum snippet', reason: 'Helper initialization is identical.', score: 41 },
      ],
      engineVersion: 'engine-demo-1.0.0',
    },
  ],
};

function normalizeSubmission(item) {
  return {
    id: item.id,
    studentName: item.studentName,
    assignmentName: item.assignmentName,
    language: item.language,
    similarityScore: item.similarityScore,
    status: item.status,
    submittedAt: item.submittedAt,
    excerpt: item.excerpt,
  };
}

export function getMockReviewQueue(courseId) {
  const items = reviewQueueByCourse[courseId] ?? [];
  return {
    submissions: items.map(normalizeSubmission),
  };
}

export function getMockAnalytics(courseId) {
  const items = reviewQueueByCourse[courseId] ?? [];
  const totalSubmissions = items.length;
  const flaggedCases = items.filter((item) => item.status === 'Flagged').length;
  const reviewCases = items.filter((item) => item.status === 'Needs Review').length;

  const languageMap = items.reduce((acc, item) => {
    const key = item.language || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const languageCounts = Object.entries(languageMap)
    .map(([language, count]) => ({
      language,
      count,
      percent: totalSubmissions === 0 ? 0 : Math.round((count / totalSubmissions) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const priorityCases = [...items]
    .sort((a, b) => (b.similarityScore ?? 0) - (a.similarityScore ?? 0))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      language: item.language,
      status: item.status,
      similarityScore: item.similarityScore,
    }));

  return {
    metrics: {
      totalSubmissions,
      flaggedCases,
      reviewCases,
      publishedAssignments: 0,
    },
    priorityCases,
    languageCounts,
  };
}

export function getMockSubmissionReport(submissionId) {
  const item = Object.values(reviewQueueByCourse)
    .flat()
    .find((entry) => String(entry.id) === String(submissionId));

  if (!item) {
    throw new Error('Submission report not found.');
  }

  return {
    id: item.id,
    studentName: item.studentName,
    assignmentName: item.assignmentName,
    similarityScore: item.similarityScore,
    status: item.status,
    summary: item.summary,
    matches: item.matches,
    language: item.language,
    submittedAt: item.submittedAt,
    engineVersion: item.engineVersion,
  };
}

export function getMockSubmissionComparison(submissionId) {
  const item = Object.values(reviewQueueByCourse)
    .flat()
    .find((entry) => String(entry.id) === String(submissionId));

  if (!item) {
    throw new Error('Submission comparison not found.');
  }

  return {
    id: item.id,
    sourceLabel: item.sourceLabel,
    similarityScore: item.similarityScore,
    notes: item.notes,
    leftText: item.leftText,
    rightText: item.rightText,
  };
}
