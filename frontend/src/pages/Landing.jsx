import { Link } from 'react-router-dom'

const features = [
  {
    title: 'Smart Plagiarism Detection',
    description:
      'Advanced token-based analysis compares code submissions to identify similarities across multiple programming languages.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Easy Student Submissions',
    description:
      'Students submit their work through a simple public page — no account required. Just enter the assignment key and upload.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    title: 'Multi-Language Support',
    description:
      'Supports Java, C, and C++ submissions. Our tokenizer understands language-specific syntax for accurate comparisons.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    title: 'Instructor Dashboard',
    description:
      'Manage courses, create assignments, and review detailed similarity reports — all from one centralized dashboard.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
]

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-primary text-white py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Code Plagiarism Detection
            <br />
            <span className="text-accent">Made Simple</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Protect academic integrity with intelligent code comparison. Upload assignments, detect similarities, and review results — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/submit"
              className="bg-white text-primary font-semibold px-8 py-3 rounded-lg hover:bg-accent transition-colors text-lg"
            >
              Submit Work
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 transition-colors text-lg"
            >
              Instructor Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center text-primary mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-warm hover:shadow-md transition-shadow"
              >
                <div className="text-primary mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-warm py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-text-muted mb-8">
            Create an instructor account to manage your courses and assignments, or use an assignment key to submit your work.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-primary text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Create Instructor Account
          </Link>
        </div>
      </section>
    </div>
  )
}
