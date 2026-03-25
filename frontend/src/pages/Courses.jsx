export default function Courses() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
      <span className="inline-block bg-accent text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
        Coming Soon
      </span>
      <h1 className="text-3xl font-bold text-primary mb-4">Courses & Assignments</h1>
      <p className="text-text-muted max-w-lg mx-auto mb-8">
        This page will let you create and manage courses, define assignments,
        and generate unique assignment keys to share with your students.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {['Manage Courses', 'Create Assignments', 'Generate Keys'].map((item) => (
          <div key={item} className="bg-white border border-warm rounded-lg p-6">
            <div className="w-10 h-10 bg-accent rounded-full mx-auto mb-3" />
            <p className="text-sm font-medium text-text-muted">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
