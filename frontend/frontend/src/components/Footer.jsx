import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-primary text-white/80 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-3">El Kapitan</h3>
            <p className="text-sm">
              Academic integrity through intelligent plagiarism detection.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-1.5 text-sm">
              <li><Link to="/submit" className="hover:text-white transition-colors">Submit Work</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Instructor Login</Link></li>
              <li><Link to="/signup" className="hover:text-white transition-colors">Create Account</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">Resources</h3>
            <ul className="space-y-1.5 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20 mt-8 pt-6 text-center text-sm">
          &copy; {new Date().getFullYear()} El Kapitan. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
